#!/usr/bin/env python3
"""Exercise the shipped resolver with local UDP/TCP upstreams, never the internet."""
import os
import pathlib
import secrets
import signal
import socket
import struct
import subprocess
import sys
import threading
import time

root = pathlib.Path(os.environ['RIG'])
run = pathlib.Path(os.environ['ZGZ_RUN'])
binary = sys.argv[1]


def question(name):
    labels = b''.join(bytes([len(x)]) + x.encode('ascii') for x in name.split('.'))
    return struct.pack('!HHHHHH', secrets.randbelow(65536), 0x100, 1, 0, 0, 0) + labels + b'\0\0\1\0\1'


def receive_exact(sock, size):
    data = b''
    while len(data) < size:
        part = sock.recv(size - len(data))
        if not part:
            raise OSError('short DNS response')
        data += part
    return data


class Upstream:
    def __init__(self):
        self.requests = []
        self.closed = threading.Event()
        self.udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.udp.bind(('127.0.0.1', 0))
        self.port = self.udp.getsockname()[1]
        self.tcp = socket.socket()
        self.tcp.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.tcp.bind(('127.0.0.1', self.port))
        self.tcp.listen()
        for sock in (self.udp, self.tcp):
            sock.settimeout(0.2)
        self.threads = [threading.Thread(target=self.serve, args=(proto,), daemon=True) for proto in ('udp', 'tcp')]
        for thread in self.threads:
            thread.start()

    def answer(self, query):
        self.requests.append(query)
        end = 12
        while query[end]:
            end += query[end] + 1
        end += 5
        return query[:2] + struct.pack('!HHHHH', 0x8180, 1, 1, 0, 0) + query[12:end] + b'\xc0\x0c' + struct.pack('!HHIH', 1, 1, 0, 4) + socket.inet_aton('203.0.113.77')

    def serve(self, proto):
        sock = self.udp if proto == 'udp' else self.tcp
        while not self.closed.is_set():
            try:
                if proto == 'udp':
                    query, address = sock.recvfrom(4096)
                    sock.sendto(self.answer(query), address)
                else:
                    conn, _ = sock.accept()
                    with conn:
                        conn.settimeout(1)
                        size = struct.unpack('!H', receive_exact(conn, 2))[0]
                        reply = self.answer(receive_exact(conn, size))
                        conn.sendall(struct.pack('!H', len(reply)) + reply)
            except (OSError, IndexError):
                continue

    def close(self):
        self.closed.set()
        self.udp.close()
        self.tcp.close()
        for thread in self.threads:
            thread.join(timeout=1)


def query(port, name, proto='udp', address='127.0.0.1'):
    message = question(name)
    family = socket.AF_INET6 if ':' in address else socket.AF_INET
    with socket.socket(family, socket.SOCK_DGRAM if proto == 'udp' else socket.SOCK_STREAM) as client:
        client.settimeout(1.5)
        if proto == 'udp':
            client.sendto(message, (address, port))
            reply = client.recv(4096)
        else:
            client.connect((address, port))
            client.sendall(struct.pack('!H', len(message)) + message)
            size = struct.unpack('!H', receive_exact(client, 2))[0]
            reply = receive_exact(client, size)
    assert reply[:2] == message[:2], 'mismatched DNS transaction'
    rcode = reply[3] & 15
    answers = struct.unpack('!H', reply[6:8])[0]
    return rcode, socket.inet_ntoa(reply[-4:]) if answers else None


def helper(command):
    return subprocess.run(['sh', str(root / 'lib/zgz-dns-local'), command], env=os.environ, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


core = Upstream()
old = Upstream()
probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
probe.bind(('127.0.0.1', 0))
port = probe.getsockname()[1]
probe.close()
uci = pathlib.Path(os.environ['ZGZ_TEST_UCI'])
original_uci = uci.read_text()
config = run / 'resolver.conf'
process = None
log = open(run / 'dnsmasq-live.log', 'w+')
try:
    source = root / 'system-dns/dnsmasq.conf.test'
    source.write_text(source.read_text() + f'\nserver=127.0.0.1#{old.port}\nserver=/external.example/127.0.0.1#{old.port}\n')
    lines = [x for x in original_uci.splitlines() if not x.startswith(('dns_port=', 'dnsmasq_port='))]
    uci.write_text('\n'.join(lines) + f'\ndns_port={core.port}\ndnsmasq_port={port}\n')
    config.write_bytes(helper('config').stdout)
    helper('hosts')
    process = subprocess.Popen([binary, '--no-daemon', f'--conf-file={config}'], stdout=log, stderr=log)
    # --no-daemon intentionally retains test-runner privileges and does not
    # write its PID file; production uses --keep-in-foreground under procd.
    (run / 'resolver.pid').write_text(str(process.pid))
    ready = False
    for _ in range(30):
        if process.poll() is not None:
            break
        try:
            ready = query(port, 'router.lan') == (0, '192.168.2.1')
            if ready:
                break
        except OSError:
            time.sleep(0.1)
    if not ready:
        log.flush()
        details = (run / 'dnsmasq-live.log').read_text()
        if 'cannot create netlink socket: Operation not permitted' in details and os.environ.get('CI') != 'true':
            print('  skip - live DNS sockets: this runtime prohibits netlink; CI must run this test')
            sys.exit(77)
        raise AssertionError('real resolver did not start: ' + details)
    for proto in ('udp', 'tcp'):
        assert query(port, 'external.example', proto) == (0, '203.0.113.77')
        assert query(port, 'printer.lan', proto) == (0, '192.168.2.9')
        assert query(port, 'laptop.lan', proto) == (0, '192.168.2.30')
    print('  live - UDP/TCP public names use only the tunnel; static and DHCP names resolve')
    # Exercise socket ownership validation used before declaring startup ready.
    check = subprocess.run(['sh', '-c', '. "$RIG/dns-functions"; private_ready "$1"', 'dns-check', str(port)], env=os.environ, capture_output=True, text=True)
    if check.returncode:
        # Some container runtimes expose a host /proc with namespace-local PIDs.
        # Do not turn that environment into a false claim of socket validation.
        if not pathlib.Path(f'/proc/{process.pid}/comm').exists():
            print('  skip - socket ownership check: /proc and child PID namespaces differ')
        else:
            raise AssertionError('socket ownership validation failed: ' + check.stderr)
    else:
        print('  live - ready check verifies both DNS sockets belong to the dedicated process')
    before = len(core.requests)
    assert query(port, 'expired.lan')[1] is None
    assert len(core.requests) == before, 'unknown local name escaped upstream'
    (root / 'leases').write_text('0 aa:bb:cc:dd:ee:ff 192.168.2.44 newclient *\n')
    helper('hosts')
    process.send_signal(signal.SIGHUP)
    time.sleep(0.15)
    assert query(port, 'newclient.lan') == (0, '192.168.2.44')
    assert query(port, 'laptop.lan')[1] is None
    print('  live - DHCP updates add new names and remove old names without restarting DHCP')
    try:
        socket.inet_pton(socket.AF_INET6, '::1')
        assert query(port, 'printer.lan', address='::1') == (0, '192.168.2.9')
        print('  live - IPv6 clients can resolve local names')
    except OSError as exc:
        if exc.errno in (97, 99, 101):
            print('  skip - IPv6 loopback unavailable')
        else:
            raise
    core.close()
    try:
        result = query(port, 'uncached-after-outage.example')
        assert result[0] != 0 or result[1] is None, 'resolver returned an unexpected answer during outage'
    except OSError:
        pass
    assert not old.requests, 'original public or per-domain upstream was queried'
    print('  live - tunnel DNS outage never falls back to original upstreams')
finally:
    if process is not None and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
    core.close()
    old.close()
    uci.write_text(original_uci)
    log.close()
