#!/usr/bin/env python3
"""Load the generated guard in a private network namespace and send packets."""
import json
import os
import pathlib
import signal
import socket
import struct
import subprocess
import sys
import time


def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT, text=True, timeout=5)


if len(sys.argv) < 3:
    result = subprocess.run(['unshare', '--net', sys.executable, __file__, sys.argv[1], '--inside'], capture_output=True, text=True, timeout=30)
    if result.returncode and 'unshare failed: Operation not permitted' in result.stderr and os.environ.get('CI') != 'true':
        print('  skip - firewall packet tests require a network namespace; CI must run them')
        sys.exit(77)
    print(result.stdout, end='')
    print(result.stderr, end='', file=sys.stderr)
    sys.exit(result.returncode)

signal.signal(signal.SIGALRM, lambda *_: (_ for _ in ()).throw(TimeoutError('firewall tests exceeded 25 seconds')))
signal.alarm(25)
run('ip', 'link', 'set', 'lo', 'up')
run('ip', 'link', 'add', 'wan-test', 'type', 'dummy')
run('ip', 'link', 'set', 'wan-test', 'up')
run('ip', 'addr', 'add', '192.0.2.1/24', 'dev', 'wan-test')
run('ip', '-6', 'addr', 'add', '2001:db8:1::1/64', 'dev', 'wan-test', 'nodad')
run('ip', 'route', 'add', '198.51.100.0/24', 'dev', 'wan-test')
run('ip', '-6', 'route', 'add', '2001:db8:2::/64', 'dev', 'wan-test')
run('ip', 'link', 'add', 'br-lan', 'type', 'veth', 'peer', 'name', 'client-test')
for interface in ('br-lan', 'client-test'):
    run('ip', 'link', 'set', interface, 'up')
run('ip', 'addr', 'add', '192.168.55.1/24', 'dev', 'br-lan')
run('ip', '-6', 'addr', 'add', '2001:db8:55::1/64', 'dev', 'br-lan', 'nodad')
pathlib.Path('/proc/sys/net/ipv4/ip_forward').write_text('1')
pathlib.Path('/proc/sys/net/ipv6/conf/all/forwarding').write_text('1')
for interface in ('all', 'br-lan'):
    pathlib.Path(f'/proc/sys/net/ipv4/conf/{interface}/rp_filter').write_text('0')
run('nft', '-f', sys.argv[1])


def packets(chain):
    entries = json.loads(run('nft', '-j', 'list', 'chain', 'inet', 'zirgozar_dns', chain))['nftables']
    return sum(e['counter']['packets'] for r in entries if 'rule' in r for e in r['rule']['expr'] if 'counter' in e)


before = packets('encrypted_out')
for family, target in ((socket.AF_INET, '198.51.100.2'), (socket.AF_INET6, '2001:db8:2::2')):
    for port in (853, 5353):
        for kind in (socket.SOCK_DGRAM, socket.SOCK_STREAM):
            previous = packets('encrypted_out')
            with socket.socket(family, kind) as client:
                client.settimeout(0.5)
                try:
                    if kind == socket.SOCK_DGRAM:
                        client.sendto(b'guard-test', (target, port))
                    else:
                        client.connect((target, port))
                except OSError:
                    # TCP can retry a silently dropped SYN until the socket
                    # times out. The kernel rule counter proves the drop;
                    # a timeout alone would also occur without a firewall.
                    pass
            assert packets('encrypted_out') > previous, f'{family}/{kind}/{port} did not hit the drop rule'
assert packets('encrypted_out') - before >= 8
print('  live - output blocks IPv4/IPv6 TCP/UDP 853 and 5353 for unmarked processes')
marked_before = packets('encrypted_out')
for family, target in ((socket.AF_INET, '198.51.100.2'), (socket.AF_INET6, '2001:db8:2::2')):
    with socket.socket(family, socket.SOCK_DGRAM) as client:
        client.setsockopt(socket.SOL_SOCKET, socket.SO_MARK, 255)
        client.sendto(b'marked-core', (target, 853))
assert packets('encrypted_out') == marked_before
print('  live - marked tunnel sockets remain usable in both address families')


def checksum(data):
    if len(data) % 2:
        data += b'\0'
    value = sum(struct.unpack('!' + 'H' * (len(data) // 2), data))
    while value >> 16:
        value = (value & 65535) + (value >> 16)
    return (~value) & 65535


mac = lambda name: bytes.fromhex(json.loads(run('ip', '-j', 'link', 'show', 'dev', name))[0]['address'].replace(':', ''))
frame = mac('br-lan') + mac('client-test')
with socket.socket(socket.AF_PACKET, socket.SOCK_RAW) as raw:
    raw.bind(('client-test', 0))
    before_forward = packets('encrypted_fwd')
    for port in (853, 5353):
        udp = struct.pack('!HHHH', 53000, port, 9, 0) + b'x'
        src, dst = socket.inet_aton('192.168.55.2'), socket.inet_aton('198.51.100.2')
        header = struct.pack('!BBHHHBBH4s4s', 0x45, 0, 29, port, 0, 64, 17, 0, src, dst)
        header = header[:10] + struct.pack('!H', checksum(header)) + header[12:]
        raw.send(frame + b'\x08\x00' + header + udp)
        src6, dst6 = socket.inet_pton(socket.AF_INET6, '2001:db8:55::2'), socket.inet_pton(socket.AF_INET6, '2001:db8:2::2')
        pseudo = src6 + dst6 + struct.pack('!I3xB', len(udp), 17)
        udp6 = udp[:6] + struct.pack('!H', checksum(pseudo + udp)) + udp[8:]
        header6 = struct.pack('!IHBB16s16s', 6 << 28, len(udp6), 17, 64, src6, dst6)
        raw.send(frame + b'\x86\xdd' + header6 + udp6)
    time.sleep(0.2)
    assert packets('encrypted_fwd') - before_forward == 4, 'forwarded IPv4/IPv6 DNS escaped the guard'
print('  live - forwarding blocks uncaptured IPv4/IPv6 853 and 5353 packets')
