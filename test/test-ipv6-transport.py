#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
"""Exercise real TCP/UDP IPv6 transport without an external VPN server."""
import os
import pathlib
import select
import signal
import socket
import subprocess
import sys
import tempfile
import threading

core = pathlib.Path(sys.argv[1]).resolve()
source = pathlib.Path(__file__).resolve().parents[1] / 'package/zirgozar/files'
assert core.is_file(), 'a real Xray binary is required'
for network in ('tcp', 'udp'):
    kind = socket.SOCK_STREAM if network == 'tcp' else socket.SOCK_DGRAM
    with tempfile.TemporaryDirectory(prefix='zgz-ipv6-') as folder:
        work = pathlib.Path(folder)
        upstream = socket.socket(socket.AF_INET6, kind)
        upstream.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
        upstream.bind(('::1', 0))
        upstream.settimeout(10)
        remote = upstream.getsockname()[1]
        if network == 'tcp':
            upstream.listen()
        peers, failures = [], []

        def echo():
            try:
                if network == 'tcp':
                    conn, peer = upstream.accept()
                    peers.append(peer)
                    with conn:
                        conn.settimeout(10)
                        for _ in range(3):
                            payload = conn.recv(4096)
                            conn.sendall(payload)
                else:
                    for _ in range(3):
                        payload, peer = upstream.recvfrom(4096)
                        peers.append(peer)
                        upstream.sendto(payload, peer)
            except Exception as error:
                failures.append(error)

        thread = threading.Thread(target=echo, daemon=True)
        thread.start()
        with socket.socket(socket.AF_INET, kind) as reservation:
            reservation.bind(('127.0.0.1', 0))
            local = reservation.getsockname()[1]
        env = dict(os.environ, ZGZ_LIB=str(source), ZGZ_ETC=str(work / 'etc'),
                   ZGZ_RUN=str(work / 'run'), TRANSPORT_CORE=str(core),
                   TRANSPORT_DIR=str(work), TRANSPORT_NETWORK=network,
                   TRANSPORT_REMOTE=str(remote), TRANSPORT_LOCAL=str(local))
        script = '''
set -e
. "$ZGZ_LIB/zgz-common.sh"
find_xray() { "$TRANSPORT_CORE" run -test -config "$1" >/dev/null 2>&1; printf '%s\\n' "$TRANSPORT_CORE"; }
trap tunnel_relay_stop EXIT
trap 'exit 1' INT TERM
tunnel_relay_start "$TRANSPORT_DIR" "$TRANSPORT_NETWORK" ::1 "$TRANSPORT_REMOTE" "$TRANSPORT_LOCAL" ::1
echo READY
read -r finished
'''
        process = subprocess.Popen(['sh', '-c', script], env=env, stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                   text=True, start_new_session=True)
        try:
            assert select.select([process.stdout], [], [], 12)[0], 'relay startup timed out'
            assert process.stdout.readline().strip() == 'READY', 'relay failed'
            with socket.socket(socket.AF_INET, kind) as client:
                client.settimeout(8)
                client.connect(('127.0.0.1', local))
                for number in range(3):
                    payload = b'\x00\xc8\x02-l2tp-sstp-' + bytes([number]) + b'\xff'
                    client.sendall(payload)
                    assert client.recv(4096) == payload, 'transport altered protocol bytes'
            thread.join(3)
            assert not failures, failures
            assert peers and all(peer[0] == '::1' for peer in peers), peers
            if network == 'udp':
                assert len(set(peers)) == 1, 'L2TP packets must keep one UDP session'
            process.stdin.write('done\n')
            process.stdin.flush()
            assert process.wait(timeout=5) == 0
            print(f'PASS: real {network.upper()} IPv6 transport, unchanged bytes and cleanup')
        finally:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
            upstream.close()
