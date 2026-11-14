#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Exercise dial-level fallback through a local SOCKS path with the real core."""
import contextlib
import json
from pathlib import Path
import socket
import socketserver
import struct
import subprocess
import sys
import tempfile
import threading
import time


def exact(conn, length):
    result = b''
    while len(result) < length:
        part = conn.recv(length - len(result))
        if not part:
            raise EOFError('connection closed')
        result += part
    return result


def socks(conn):
    version, count = exact(conn, 2)
    assert version == 5
    exact(conn, count)
    conn.sendall(b'\x05\x00')
    version, command, _, family = exact(conn, 4)
    assert version == 5 and command == 1
    if family == 1:
        host = socket.inet_ntop(socket.AF_INET, exact(conn, 4))
    elif family == 4:
        host = socket.inet_ntop(socket.AF_INET6, exact(conn, 16))
    else:
        host = exact(conn, exact(conn, 1)[0]).decode()
    port = struct.unpack('!H', exact(conn, 2))[0]
    conn.sendall(b'\x05\x00\x00\x01\x7f\x00\x00\x01\x00\x00')
    return host, port


class Backup(socketserver.BaseRequestHandler):
    def handle(self):
        self.request.settimeout(5)
        try:
            self.server.targets.append(socks(self.request))
            # The fallback carries the original server connection, including
            # that server's SOCKS handshake, rather than changing the exit.
            self.server.destinations.append(socks(self.request))
            request = b''
            while b'\r\n\r\n' not in request:
                request += exact(self.request, 1)
            self.request.sendall(b'HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK')
        except (EOFError, OSError):
            pass


class Silent(socketserver.BaseRequestHandler):
    def handle(self):
        # Keep the socket open long enough that the fallback's timer, rather
        # than EOF, has to cause the retry.
        self.server.stop.wait(5)


class NXDomain(socketserver.BaseRequestHandler):
    def handle(self):
        query, conn = self.request
        conn.sendto(query[:2] + b'\x81\x83' + query[4:6] + b'\x00\x00' * 3 + query[12:], self.client_address)


@contextlib.contextmanager
def server(handler, udp=False):
    cls = socketserver.ThreadingUDPServer if udp else socketserver.ThreadingTCPServer
    srv = cls(('127.0.0.1', 0), handler)
    srv.daemon_threads = True
    srv.targets, srv.destinations, srv.stop = [], [], threading.Event()
    thread = threading.Thread(target=srv.serve_forever, daemon=True)
    thread.start()
    try:
        yield srv
    finally:
        srv.stop.set()
        srv.shutdown()
        srv.server_close()


def unused_port():
    with socket.socket() as conn:
        conn.bind(('127.0.0.1', 0))
        return conn.getsockname()[1]


def run(core, trigger, backup, primary_host, primary_port, dns):
    inbound = unused_port()
    sockopt = {'fallback': {trigger: 'backup', 'waitMs': 200}}
    if trigger == 'noIPFallbackDialerProxy':
        sockopt['domainStrategy'] = 'ForceIPv4'
    config = {
        'log': {'loglevel': 'warning'},
        'dns': {'tag': 'dns-module', 'servers': [{'address': '127.0.0.1', 'port': dns.server_address[1]}], 'queryStrategy': 'UseIPv4'},
        'routing': {'rules': [{'type': 'field', 'inboundTag': ['dns-module'], 'outboundTag': 'direct'}]},
        'inbounds': [{'listen': '127.0.0.1', 'port': inbound, 'protocol': 'socks'}],
        'outbounds': [
            {'tag': 'primary', 'protocol': 'socks', 'settings': {'servers': [{'address': primary_host, 'port': primary_port}]}, 'streamSettings': {'sockopt': sockopt}},
            {'tag': 'backup', 'protocol': 'socks', 'settings': {'servers': [{'address': '127.0.0.1', 'port': backup.server_address[1]}]}},
            {'tag': 'direct', 'protocol': 'freedom'}
        ]
    }
    with tempfile.TemporaryDirectory(prefix='zgz-transport-live-') as work:
        path = Path(work) / 'config.json'
        path.write_text(json.dumps(config))
        with (Path(work) / 'core.log').open('w+') as log:
            process = subprocess.Popen([core, 'run', '-config', str(path)], stdout=log, stderr=log)
            try:
                for _ in range(100):
                    try:
                        with socket.create_connection(('127.0.0.1', inbound), timeout=.1):
                            break
                    except OSError:
                        if process.poll() is not None:
                            log.seek(0)
                            raise AssertionError(log.read())
                        time.sleep(.02)
                result = subprocess.run(['curl', '-fsS', '--max-time', '4', '--socks5-hostname', f'127.0.0.1:{inbound}', 'http://example.invalid/'], capture_output=True)
                if result.returncode or result.stdout != b'OK':
                    log.seek(0)
                    raise AssertionError((trigger, result.stderr.decode(), log.read()))
                assert backup.targets[-1] == (primary_host, primary_port), backup.targets
                assert backup.destinations[-1] == ('example.invalid', 80), backup.destinations
            finally:
                process.terminate()
                process.wait(timeout=5)
    print(f'PASS: {trigger} carries the original server connection and request')


if __name__ == '__main__':
    with server(Backup) as backup, server(Silent) as silent, server(NXDomain, udp=True) as dns:
        run(sys.argv[1], 'failedDialFallbackDialerProxy', backup, '127.0.0.1', unused_port(), dns)
        run(sys.argv[1], 'noResponseFallbackDialerProxy', backup, '127.0.0.1', silent.server_address[1], dns)
        run(sys.argv[1], 'noIPFallbackDialerProxy', backup, 'unreachable.invalid', 443, dns)
