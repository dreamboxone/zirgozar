#!/usr/bin/env python3
"""Verify DNS-over-TLS, proxy chaining, certificate errors and no plain fallback."""
import copy
import json
import os
import pathlib
import select
import signal
import socket
import ssl
import struct
import subprocess
import sys
import threading
import time


def deadline(signum, frame):
    raise TimeoutError('encrypted DNS checks exceeded 60 seconds')


signal.signal(signal.SIGALRM, deadline)
signal.alarm(60)
root = pathlib.Path(os.environ['RIG']) / 'work'
source = json.loads(pathlib.Path(sys.argv[2]).read_text())
native = len(sys.argv) > 3 and sys.argv[3] == 'singbox'
cert, key = root / 'dot.crt', root / 'dot.key'
subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
                '-subj', '/CN=resolver.test', '-addext', 'subjectAltName=DNS:resolver.test',
                '-keyout', str(key), '-out', str(cert)], check=True, capture_output=True, timeout=10)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(cert, key)


def listener(kind=socket.SOCK_STREAM):
    s = socket.socket(socket.AF_INET, kind)
    s.bind(('127.0.0.1', 0))
    if kind == socket.SOCK_STREAM:
        s.listen()
    s.settimeout(0.2)
    return s


def exact(s, size):
    result = b''
    while len(result) < size:
        data = s.recv(size - len(result))
        if not data:
            raise OSError('short response')
        result += data
    return result


def answer(q):
    end = 12
    while q[end]:
        end += q[end] + 1
    end += 5
    return q[:2] + struct.pack('!HHHHH', 0x8180, 1, 1, 0, 0) + q[12:end] + b'\xc0\x0c' + struct.pack('!HHIH', 1, 1, 0, 4) + socket.inet_aton('203.0.113.88')


closed = threading.Event()
tls_listener, proxy_listener = listener(), listener()
plain = listener(socket.SOCK_DGRAM)
tls_port, proxy_port = tls_listener.getsockname()[1], proxy_listener.getsockname()[1]
plain_queries, proxy_targets, tls_queries = [], [], []
workers = []


def tls_connection(conn):
    try:
        conn.settimeout(2)
        with context.wrap_socket(conn, server_side=True) as secure:
            q = exact(secure, struct.unpack('!H', exact(secure, 2))[0])
            tls_queries.append(q)
            reply = answer(q)
            secure.sendall(struct.pack('!H', len(reply)) + reply)
    except (OSError, ssl.SSLError):
        conn.close()


def proxy_connection(conn):
    try:
        with conn:
            conn.settimeout(3)
            version, count = exact(conn, 2)
            assert version == 5 and 0 in exact(conn, count)
            conn.sendall(b'\x05\x00')
            version, command, _, family = exact(conn, 4)
            assert version == 5 and command == 1
            if family == 1:
                target = socket.inet_ntoa(exact(conn, 4))
            elif family == 3:
                target = exact(conn, exact(conn, 1)[0]).decode()
            else:
                target = socket.inet_ntop(socket.AF_INET6, exact(conn, 16))
            port = struct.unpack('!H', exact(conn, 2))[0]
            proxy_targets.append((target, port))
            try:
                upstream = socket.create_connection((target, port), timeout=2)
            except OSError:
                conn.sendall(b'\x05\x05\x00\x01' + b'\0' * 6)
                return
            with upstream:
                conn.sendall(b'\x05\x00\x00\x01' + b'\0' * 6)
                while not closed.is_set():
                    ready, _, _ = select.select([conn, upstream], [], [], 0.2)
                    for current in ready:
                        data = current.recv(65536)
                        if not data:
                            return
                        (upstream if current is conn else conn).sendall(data)
    except (OSError, AssertionError):
        pass


def serve(sock, handler):
    while not closed.is_set():
        try:
            if sock is plain:
                q, address = sock.recvfrom(4096)
                plain_queries.append(q)
                sock.sendto(answer(q), address)
            else:
                conn, _ = sock.accept()
                t = threading.Thread(target=handler, args=(conn,), daemon=True)
                workers.append(t)
                t.start()
        except OSError:
            pass


for sock, handler in [(tls_listener, tls_connection), (proxy_listener, proxy_connection), (plain, None)]:
    threading.Thread(target=serve, args=(sock, handler), daemon=True).start()


def query(port, label):
    name = f'{label}.encrypted.example.net'
    packet = struct.pack('!HHHHHH', 1234, 0x100, 1, 0, 0, 0)
    packet += b''.join(bytes([len(x)]) + x.encode() for x in name.split('.')) + b'\0\0\1\0\1'
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as client:
        client.settimeout(2)
        client.sendto(packet, ('127.0.0.1', port))
        reply = client.recv(4096)
    return (reply[3] & 15) == 0 and reply[-4:] == socket.inet_aton('203.0.113.88')


def exercise(name, server_name, server_port, expected):
    c = copy.deepcopy(source)
    with listener() as probe:
        port = probe.getsockname()[1]
    if native:
        c['inbounds'] = [dict(next(i for i in c['inbounds'] if i['tag'] == 'dns-in'), listen='127.0.0.1', listen_port=port)]
        c['log'] = {'level': 'warn'}
        c.pop('experimental', None)
        c['route'] = {'rules': [{'inbound': ['dns-in'], 'action': 'hijack-dns'}], 'final': 'proxy'}
        c['outbounds'] = [{'type': 'socks', 'tag': 'proxy', 'server': '127.0.0.1', 'server_port': proxy_port}, {'type': 'direct', 'tag': 'direct'}]
        remote = next(s for s in c['dns']['servers'] if s.get('tag') == 'dns-remote')
        remote['server'], remote['server_port'] = '127.0.0.1', server_port
        remote['tls']['server_name'] = server_name
        c['dns'] = {'servers': [remote, {'type': 'udp', 'tag': 'plain', 'server': '127.0.0.1', 'server_port': plain.getsockname()[1]}], 'final': 'dns-remote', 'strategy': 'ipv4_only', 'timeout': '600ms'}
        c['route']['default_domain_resolver'] = {'server': 'dns-remote'}
    else:
        c['inbounds'] = [dict(next(i for i in c['inbounds'] if i['tag'] == 'dns-in'), listen='127.0.0.1', port=port)]
        c['log'] = {'loglevel': 'warning'}
        c.pop('api', None)
        c['routing'] = {'domainStrategy': 'AsIs', 'rules': [r for r in c['routing']['rules'] if r.get('inboundTag') in (['dns-in'], ['dns-remote'])]}
        c['outbounds'] = [o for o in c['outbounds'] if o['tag'] in ('dns-tls', 'dns-out', 'direct', 'block')]
        c['outbounds'].insert(0, {'tag': 'proxy', 'protocol': 'socks', 'settings': {'servers': [{'address': '127.0.0.1', 'port': proxy_port}]}})
        for o in c['outbounds']:
            # The unprivileged local test has no firewall. Keep the production
            # TLS and dialerProxy settings, omitting only the kernel socket mark.
            o.get('streamSettings', {}).get('sockopt', {}).pop('mark', None)
            if o['tag'] == 'dns-tls':
                o['streamSettings']['tlsSettings']['serverName'] = server_name
        remote = next(s for s in c['dns']['servers'] if isinstance(s, dict) and s.get('tag') == 'dns-remote')
        remote['address'] = f'tcp://127.0.0.1:{server_port}'
        remote['queryStrategy'] = 'UseIPv4'
        remote['timeoutMs'] = 600
        c['dns']['hosts'] = {}
        c['dns']['servers'] = [remote, {'address': '127.0.0.1', 'port': plain.getsockname()[1], 'domains': ['full:unrelated.example.net'], 'skipFallback': True}]
    conf = root / f'{name}.json'
    conf.write_text(json.dumps(c))
    env = dict(os.environ, SSL_CERT_FILE=str(cert))
    with open(root / f'{name}.log', 'w') as log:
        process = subprocess.Popen([sys.argv[1], 'run', '-c' if native else '-config', str(conf)], env=env, stdout=log, stderr=log)
        try:
            time.sleep(0.25)
            if process.poll() is not None:
                log.flush()
                reason = (root / f'{name}.log').read_text()
                if native and 'create netlink socket: operation not permitted' in reason and os.environ.get('CI') != 'true':
                    print('  skip - native TLS sockets require netlink; CI must exercise them')
                    sys.exit(77)
                raise AssertionError(f'core exited: {reason}')
            try:
                success = query(port, name)
            except OSError:
                success = False
            assert success == expected, f'{name}: expected success={expected}, got {success}'
        finally:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=3)


try:
    exercise('valid', 'resolver.test', tls_port, True)
    assert tls_queries and ('127.0.0.1', tls_port) in proxy_targets, 'TLS DNS bypassed the proxy'
    print('  live - authenticated TLS DNS traverses the proxy and returns a DNS answer')
    exercise('wrong-certificate', 'wrong.test', tls_port, False)
    print('  live - a certificate for the wrong name is rejected')
    with listener() as unavailable:
        unavailable_port = unavailable.getsockname()[1]
    exercise('unavailable', 'resolver.test', unavailable_port, False)
    assert not plain_queries, 'encrypted DNS fell back to a plain DNS server'
    print('  live - TLS failure and upstream failure never fall back to plain DNS')
finally:
    closed.set()
    for sock in (tls_listener, proxy_listener, plain):
        sock.close()
    for worker in workers:
        worker.join(timeout=0.3)
