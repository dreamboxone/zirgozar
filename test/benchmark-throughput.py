#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
"""Measure real Zirgozar REDIRECT/TPROXY throughput on an isolated shaped link."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import statistics
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]


def run(args, **kwargs):
    p = subprocess.run([str(a) for a in args], capture_output=True, text=True, **kwargs)
    if p.returncode:
        raise RuntimeError(f'{args}: {p.stdout} {p.stderr}')
    return p


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--xray', required=True, type=Path)
    parser.add_argument('--include-bypass', action='store_true', help='also measure the pre-core Iran IPv4 bypass using a synthetic classified address')
    parser.add_argument('--debug-core', action='store_true')
    parser.add_argument('--rate', type=int, default=600, help='WAN rate in Mbit/s')
    parser.add_argument('--delay-ms', type=int, default=5, help='one-way WAN delay')
    parser.add_argument('--seconds', type=int, default=10)
    parser.add_argument('--repeats', type=int, default=3)
    parser.add_argument('--streams', default='1,4')
    parser.add_argument('--cpu-modes', default='all,one')
    parser.add_argument('--profiles', default='production', help='production,minimal; minimal is a bare Xray control, not PassWall2')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if os.geteuid() != 0:
        parser.error('root is required for isolated network namespaces')
    for tool in ('ip', 'tc', 'nft', 'iperf3', 'openssl', 'taskset'):
        if not shutil.which(tool):
            parser.error(f'{tool} is required')
    core = args.xray.resolve()
    if not core.is_file() or not os.access(core, os.X_OK):
        parser.error('a real executable Xray binary is required')
    streams = [int(x) for x in args.streams.split(',')]
    cpu_modes = args.cpu_modes.split(',')
    profiles = args.profiles.split(',')
    if any(p not in ('production', 'minimal') for p in profiles):
        parser.error('unknown profile')
    if args.rate <= 0 or args.seconds < 2 or args.repeats < 1 or any(x < 1 for x in streams) or any(x not in ('all', 'one') for x in cpu_modes):
        parser.error('invalid benchmark parameters')
    args.output = args.output.resolve()
    args.output.mkdir(parents=True, exist_ok=True)
    report = {'kernel':os.uname().release, 'iperf_version':run(['iperf3','--version']).stdout.splitlines()[0],
              'source_hashes':{name:hashlib.sha256((ROOT/'package/zirgozar/files'/name).read_bytes()).hexdigest() for name in ('zgz-mkconfig','zgz-rules','zgz-common.sh')},
              'rate_mbps': args.rate, 'one_way_delay_ms': args.delay_ms,
              'seconds': args.seconds, 'repeats': args.repeats,
              'host_cpus': sorted(os.sched_getaffinity(0)),
              'xray_version': run([core, 'version']).stdout.splitlines()[0],
              'measurements': [], 'summary': []}
    namespaces = {name: f'zgzbench-{os.getpid()}-{name}' for name in ('client', 'router', 'server')}
    procs = []

    def ns(name, command, **kwargs):
        return run(['ip', 'netns', 'exec', namespaces[name], *command], **kwargs)

    def start(name, command, log, env=None):
        handle = open(log, 'w')
        p = subprocess.Popen(['ip', 'netns', 'exec', namespaces[name], *map(str, command)], stdout=handle, stderr=subprocess.STDOUT, env=env)
        handle.close()
        procs.append(p)
        return p

    def stop(p):
        if p.poll() is None:
            p.terminate()
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
                p.wait()

    def cpu_ticks(pid):
        try:
            fields = Path(f'/proc/{pid}/stat').read_text().split()
            return int(fields[13]) + int(fields[14])
        except FileNotFoundError:
            return 0

    with tempfile.TemporaryDirectory(prefix='zgz-throughput-') as tmp:
        work = Path(tmp)
        try:
            for name in namespaces:
                run(['ip', 'netns', 'add', namespaces[name]])
                ns(name, ['ip', 'link', 'set', 'lo', 'up'])
            for left, right, left_dev, right_dev, left_ip, right_ip in (
                ('client', 'router', 'eth0', 'lan', '192.168.250.2/24', '192.168.250.1/24'),
                ('router', 'server', 'wan', 'eth0', '203.0.113.1/24', '203.0.113.2/24')):
                a, b = f'zb{os.getpid()}a', f'zb{os.getpid()}b'
                run(['ip', 'link', 'add', a, 'type', 'veth', 'peer', 'name', b])
                for name, old, dev, address in ((left, a, left_dev, left_ip), (right, b, right_dev, right_ip)):
                    run(['ip', 'link', 'set', old, 'netns', namespaces[name]])
                    ns(name, ['ip', 'link', 'set', old, 'name', dev])
                    ns(name, ['ip', 'addr', 'add', address, 'dev', dev])
                    ns(name, ['ip', 'link', 'set', dev, 'up'])
            ns('client', ['ip', 'route', 'add', 'default', 'via', '192.168.250.1'])
            ns('server', ['ip', 'addr', 'add', '203.0.114.2/32', 'dev', 'lo'])
            ns('server', ['ip', 'route', 'add', '192.168.250.0/24', 'via', '203.0.113.1'])
            ns('router', ['ip', 'route', 'add', '203.0.114.2/32', 'via', '203.0.113.2'])
            for key, value in (('net.ipv4.ip_forward', '1'), ('net.ipv4.conf.all.rp_filter', '0'), ('net.ipv4.conf.default.rp_filter', '0')):
                ns('router', ['sysctl', '-qw', key + '=' + value])
            for name, dev in (('router', 'wan'), ('server', 'eth0')):
                ns(name, ['tc', 'qdisc', 'replace', 'dev', dev, 'root', 'netem', 'delay', f'{args.delay_ms}ms', 'rate', f'{args.rate}mbit', 'limit', '10000'])
            run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', work / 'key.pem', '-out', work / 'cert.pem', '-days', '1', '-subj', '/CN=benchmark.local', '-addext', 'subjectAltName=DNS:benchmark.local'])
            identity = str(uuid.uuid4())
            remote = {'log': {'loglevel': 'warning'}, 'inbounds': [{'listen': '203.0.113.2', 'port': 8443, 'protocol': 'vless', 'settings': {'clients': [{'id': identity}], 'decryption': 'none'}, 'streamSettings': {'network': 'tcp', 'security': 'tls', 'tlsSettings': {'certificates': [{'certificateFile': str(work / 'cert.pem'), 'keyFile': str(work / 'key.pem')}]}}}], 'outbounds': [{'protocol': 'freedom'}]}
            (work / 'server.json').write_text(json.dumps(remote))
            server = start('server', [core, 'run', '-config', work / 'server.json'], args.output / 'server.log')
            iperf = start('server', ['iperf3', '-s', '-B', '203.0.114.2'], args.output / 'iperf-server.log')
            time.sleep(1)
            assert server.poll() is None and iperf.poll() is None, 'local TLS or iperf server failed'
            scenarios = [('direct', 'all')] + ([('iran-bypass', 'all')] if args.include_bypass else []) + [(('minimal-' if profile=='minimal' else '')+mode, cpu) for profile in profiles for cpu in cpu_modes for mode in ('redirect', 'tproxy')]
            for mode, cpu in scenarios:
                proxy = None
                ns('router', ['nft', 'flush', 'ruleset'])
                if mode != 'direct':
                    env = dict(os.environ, RIG_ROOT=str(work / 'rig'), RIG_XRAY=str(core), BENCH_UUID=identity, BENCH_MODE='redirect' if mode == 'iran-bypass' else mode.removeprefix('minimal-'), BENCH_LOG_NODE='1' if args.debug_core else '0')
                    script = r"""
set -e
. "$PWD/test/rig.sh"
rig_setup
export ZGZ_LOG="$RIG/run/benchmark.log"
rig_set route_ir 0
rig_set block_ads 0
rig_set log_node "$BENCH_LOG_NODE"
rig_set loglevel debug
rig_set block_quic 0
rig_set dns_hijack 0
rig_set localhost_proxy 0
rig_set client_proxy 1
rig_set lan_zone lan
rig_set tcp_proxy_way "$BENCH_MODE"
rig_set bench.link "vless://$BENCH_UUID@203.0.113.2:8443?security=tls&sni=benchmark.local#Benchmark"
: > "$RIG/run/candidates.tsv"
: > "$RIG/run/alive.tsv"
"$ZGZ_LIB/zgz-probe" use bench >/dev/null
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$RIG/client.json"
"$ZGZ_LIB/zgz-rules" dump > "$RIG/rules.nft"
"""
                    ns('router', ['sh', '-c', script, str(ROOT / 'test/benchmark-throughput.py')], cwd=ROOT, env=env)
                    # Trust only the ephemeral lab CA; routing and transport still come from the shipped generator.
                    client_path = work / 'rig/client.json'
                    client_config = json.loads(client_path.read_text())
                    outbound = next(x for x in client_config['outbounds'] if x.get('tag') == 'proxy')
                    outbound['streamSettings']['tlsSettings']['certificates'] = [{'certificateFile':str(work / 'cert.pem'), 'usage':'verify'}]
                    if mode.startswith('minimal-'):
                        client_config = {'log':{'loglevel':'none'},
                            'inbounds':[{k:v for k,v in inlet.items() if k!='sniffing'} for inlet in client_config['inbounds'] if inlet.get('tag') in ('redir-in','tproxy-in')],
                            'outbounds':[outbound], 'routing':{'domainStrategy':'AsIs','rules':[{'type':'field','network':'tcp,udp','outboundTag':'proxy'}]}}
                    client_path.write_text(json.dumps(client_config))
                    for source, suffix in (('client.json', 'json'), ('rules.nft', 'nft')):
                        shutil.copy(work / 'rig' / source, args.output / f'{mode}-{cpu}.{suffix}')
                    command = [str(core), 'run', '-config', str(work / 'rig/client.json')]
                    if cpu == 'one':
                        command = ['taskset', '-c', str(min(os.sched_getaffinity(0))), *command]
                    proxy = start('router', command, args.output / f'{mode}-{cpu}.log', env=dict(os.environ, SSL_CERT_FILE=str(work / 'cert.pem')))
                    time.sleep(1)
                    assert proxy.poll() is None, f'{mode} core failed; see its log'
                    ns('router', ['nft', '-f', str(work / 'rig/rules.nft')])
                    if mode == 'iran-bypass':
                        ns('router', ['nft', 'add', 'element', 'inet', 'zirgozar', 'iran4', '{', '203.0.114.2', '}'])
                    ns('router', ['ip', 'rule', 'add', 'fwmark', '0x162', 'table', '100', 'priority', '100'])
                    ns('router', ['ip', 'route', 'replace', 'local', '0.0.0.0/0', 'dev', 'lo', 'table', '100'])
                wire_rules = '''table inet zgz_benchmark {
 counter encrypted { }
 counter direct { }
 chain receive { type filter hook prerouting priority -310; policy accept;
  iifname "wan" ip saddr 203.0.113.2 tcp sport 8443 counter name encrypted
  iifname "wan" ip saddr 203.0.114.2 tcp sport 5201 counter name direct
 }
 chain send { type filter hook postrouting priority 310; policy accept;
  oifname "wan" ip daddr 203.0.113.2 tcp dport 8443 counter name encrypted
  oifname "wan" ip daddr 203.0.114.2 tcp dport 5201 counter name direct
 }
}'''
                ns('router', ['nft', '-f', '-'], input=wire_rules)
                print(f'Scenario {mode}, CPU={cpu}', flush=True)
                try:
                    for parallel in streams:
                        for direction in ('download', 'upload'):
                            for repeat in range(args.repeats):
                                command = ['iperf3', '-c', '203.0.114.2', '-t', str(args.seconds), '-O', '1', '-P', str(parallel), '-J']
                                if direction == 'download':
                                    command.append('-R')
                                ticks = cpu_ticks(proxy.pid) if proxy else 0
                                before = time.monotonic()
                                result = ns('client', command, timeout=args.seconds + 25)
                                elapsed = time.monotonic() - before
                                data = json.loads(result.stdout)
                                if 'error' in data:
                                    raise RuntimeError(data['error'])
                                mbps = data['end']['sum_received']['bits_per_second'] / 1e6
                                cpu_pct = ((cpu_ticks(proxy.pid) - ticks) / os.sysconf('SC_CLK_TCK') / elapsed * 100) if proxy else 0
                                row = {'mode': mode, 'cpu_mode': cpu, 'streams': parallel, 'direction': direction, 'repeat': repeat + 1, 'mbps': round(mbps, 2), 'proxy_cpu_percent': round(cpu_pct, 1), 'retransmits': data['end']['sum_sent'].get('retransmits')}
                                report['measurements'].append(row)
                                (args.output / f'{mode}-{cpu}-{parallel}-{direction}-{repeat+1}.json').write_text(json.dumps(data, indent=2))
                                (args.output / 'report.json').write_text(json.dumps(report, indent=2))
                                print(f"  {direction} P={parallel} #{repeat+1}: {mbps:.1f} Mbit/s, Xray CPU={cpu_pct:.1f}%", flush=True)
                    wire = json.loads(ns('router', ['nft', '-j', 'list', 'table', 'inet', 'zgz_benchmark']).stdout)
                    wire_bytes = {x['counter']['name']:x['counter']['bytes'] for x in wire['nftables'] if 'counter' in x}
                    (args.output / f'{mode}-{cpu}-wire.json').write_text(json.dumps(wire_bytes, indent=2))
                    if mode not in ('direct', 'iran-bypass'):
                        assert wire_bytes['encrypted'] > 1000000 and wire_bytes['direct'] == 0, 'traffic did not use the encrypted tunnel'
                    else:
                        assert wire_bytes['direct'] > 1000000 and wire_bytes['encrypted'] == 0, 'direct/bypass traffic entered the tunnel'
                    if proxy:
                        counters = ns('router', ['nft', 'list', 'table', 'inet', 'zirgozar']).stdout
                        (args.output / f'{mode}-{cpu}-counters.nft').write_text(counters)
                        # No result is accepted if the generated interception rules saw no bytes.
                        import re
                        assert any(int(n) > 0 for n in re.findall(r'counter packets \d+ bytes (\d+)', counters)), 'proxy rules did not intercept any traffic'
                finally:
                    if proxy:
                        stop(proxy)
                    ns('router', ['ip', 'rule', 'del', 'fwmark', '0x162', 'table', '100', 'priority', '100']) if proxy else None
            for mode, cpu in scenarios:
                for parallel in streams:
                    for direction in ('download', 'upload'):
                        values = [r['mbps'] for r in report['measurements'] if (r['mode'], r['cpu_mode'], r['streams'], r['direction']) == (mode, cpu, parallel, direction)]
                        baseline = statistics.median(r['mbps'] for r in report['measurements'] if r['mode'] == 'direct' and r['streams'] == parallel and r['direction'] == direction)
                        median = statistics.median(values)
                        report['summary'].append({'mode':mode, 'cpu_mode':cpu, 'streams':parallel, 'direction':direction, 'median_mbps':round(median,2), 'percent_of_direct':round(median/baseline*100,1), 'severe_drop':median < baseline*0.5})
            (args.output / 'report.json').write_text(json.dumps(report, indent=2))
            print('Results saved to', args.output, flush=True)
        finally:
            for p in reversed(procs):
                stop(p)
            for name in reversed(list(namespaces.values())):
                subprocess.run(['ip', 'netns', 'del', name], capture_output=True)


if __name__ == '__main__':
    main()
