"""Exercise installer outcomes without touching the host package manager."""
import os
import re
from pathlib import Path
import subprocess
import tempfile

source = Path(__file__).resolve().parents[1] / 'package/zirgozar/files/zgz-deps'
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / 'zgz-common.sh').write_text('''
ZGZ_RUN="$TEST_ROOT"
ZGZ_MESSAGE="$ZGZ_RUN/message"
clear_message() { rm -f "$ZGZ_MESSAGE"; }
say_message() { echo "$*" > "$ZGZ_MESSAGE"; }
log() { :; }
warn() { :; }
forget_caps() { :; }
firewall_backend() { echo none; }
bounded() { shift; "$@"; }
# Package-manager outcomes are tested here; the provider replacement and
# offline rollback are exercised by test-dnsmasq-install.sh.
install_dnsmasq_full() { bounded 180 opkg install dnsmasq-full; }
''')
    common = source.with_name('zgz-common.sh').read_text()
    helpers = '\n'.join(re.search(r'^' + name + r'\(\) \{[\s\S]*?^\}', common, re.M).group(0)
                        for name in ['pkg_lock', 'pkg_unlock', 'pkg_failure', 'pkg_refresh'])
    with (root / 'zgz-common.sh').open('a') as stream:
        stream.write('\n' + helpers + '\n')
    (root / 'uci').write_text('#!/bin/sh\nexit 0\n')
    (root / 'opkg').write_text('''#!/bin/sh
case "$1" in
list-installed) [ ! -f "$TEST_ROOT/installed-$2" ] || echo "$2 - 1"; exit 0 ;;
update) echo 'index diagnostic'; [ "$SCENARIO" != index ] ;;
install) echo "package diagnostic: $2"; [ "$SCENARIO" != package ] || exit 1; touch "$TEST_ROOT/installed-$2" ;;
esac
''')
    for name in ['uci', 'opkg']:
        (root / name).chmod(0o755)
    env = dict(os.environ, ZGZ_LIB=tmp, TEST_ROOT=tmp, PATH=tmp + ':' + os.environ['PATH'])
    for scenario in ['ok', 'index', 'package']:
        for installed_file in root.glob('installed-*'):
            installed_file.unlink()
        (root / 'deps.json').write_text('{}')
        proc = subprocess.run(['sh', str(source), 'install'], env=dict(env, SCENARIO=scenario))
        result = (root / 'deps-result').read_text()
        assert (proc.returncode == 0) == (scenario == 'ok'), (scenario, proc.returncode)
        assert result.startswith('ok' if scenario == 'ok' else 'error '), result
        assert not (root / 'deps.json').exists()
        log = (root / 'deps-install.log').read_text()
        assert 'index diagnostic' in log
        if scenario != 'index':
            assert 'package diagnostic: curl' in log
    print('Dependency installer: success, index failure, package failure and log retention passed')

    (root / 'apk').write_text('''#!/bin/sh
case "$SCENARIO" in
partial) echo 'WARNING: one repository returned HTTP 404'; echo '1 unavailable, 0 stale; 11418 distinct packages available' ;;
stale) echo '1 unavailable, 1 stale; 11418 distinct packages available' ;;
untrusted) echo 'UNTRUSTED signature'; echo '1 unavailable, 0 stale; 11418 distinct packages available' ;;
empty) echo '1 unavailable, 0 stale; 0 distinct packages available' ;;
dns) echo 'DNS lookup failed' ;;
esac
exit 1
''')
    (root / 'apk').chmod(0o755)
    for scenario in ['partial', 'stale', 'untrusted', 'empty', 'dns']:
        for policy in ['', 'partial']:
            logfile = root / 'refresh.log'
            logfile.write_text('')
            proc = subprocess.run(['sh', '-c', '. "$ZGZ_LIB/zgz-common.sh"; pkg_refresh apk "$TEST_ROOT/refresh.log" "$POLICY"'],
                                  env=dict(env, SCENARIO=scenario, POLICY=policy))
            assert (proc.returncode == 0) == (scenario == 'partial' and policy == 'partial'), (scenario, policy)
    print('Dependency refresh: partial signed indexes accepted only by opt-in; stale, untrusted and empty indexes rejected')

    functions = root / 'deps-functions'
    functions.write_text(source.read_text().split('case "${1:-check}" in', 1)[0])
    protocol_packages = {
        'l2tp://user:pass@example.com': {'xl2tpd', 'ppp-mod-pppol2tp', 'ucode-mod-socket'},
        'l2tp+ipsec://user:pass@example.com?psk=test': {'xl2tpd', 'ppp-mod-pppol2tp', 'ucode-mod-socket', 'strongswan-default', 'strongswan-swanctl'},
        'pptp://user:pass@example.com': {'ppp-mod-pptp', 'kmod-mppe'},
        'sstp://user:pass@example.com': {'sstp-client', 'kmod-mppe', 'libopenssl-legacy'},
        'ikev2://user:pass@example.com': {'strongswan-default', 'strongswan-swanctl', 'strongswan-mod-openssl',
            'strongswan-mod-eap-identity', 'strongswan-mod-eap-mschapv2', 'strongswan-mod-md4', 'strongswan-mod-eap-md5',
            'kmod-xfrm-interface', 'kmod-crypto-gcm', 'kmod-crypto-seqiv', 'ucode-mod-socket'},
        'vless://example.com': set(), 'wireguard://example.com': set(), 'warp://auto': set(),
    }
    for link, expected in protocol_packages.items():
        result = subprocess.run(['sh', '-c', '. "$TEST_ROOT/deps-functions"; link_wanted'],
                                input=link, env=env, capture_output=True, text=True, check=True)
        assert set(result.stdout.split()) == expected, (link, result.stdout)
    print('Protocol prerequisites: L2TP, IPsec, PPTP, SSTP, IKEv2 and userspace-only nodes verified')
    probe = subprocess.run(['sh', '-c', '''. "$TEST_ROOT/deps-functions"
wanted() { echo dnsmasq-full; }
installed() { return 1; }
have_tproxy() { return 1; }
have_ip_full() { return 1; }
have_https() { return 1; }
install_dnsmasq_full() { touch "$TEST_ROOT/unexpected-install"; }
cmd_check
'''], env=env, capture_output=True, text=True)
    assert probe.returncode == 0, probe.stderr
    import json
    assert 'dnsmasq-full' in json.loads(probe.stdout)['missing']
    assert not (root / 'unexpected-install').exists(), 'Requirements check must never install packages'
    print('Dependency check: reports missing dnsmasq-full without modifying the router')

    (root / 'apk').write_text('''#!/bin/sh
case "$1" in
update) echo 'WARNING: kmods repository HTTP 404'; echo '1 unavailable, 0 stale; 11418 distinct packages available'; exit 1 ;;
add) touch "$TEST_ROOT/installed-xl2tpd" ;;
esac
''')
    proc = subprocess.run(['sh', '-c', '''. "$TEST_ROOT/deps-functions"
pkg_manager() { echo apk; }
missing() { [ -f "$TEST_ROOT/installed-xl2tpd" ] || echo xl2tpd; }
ensure_kmods_feed() { say_message "kernel repository HTTP error"; return 1; }
cmd_install
'''], env=env)
    assert proc.returncode == 0
    assert (root / 'installed-xl2tpd').exists(), 'Missing kernel feed must not block available dependencies'
    assert (root / 'deps-result').read_text().strip() == 'ok'
    assert not (root / 'message').exists(), 'Successful installation must clear the earlier feed error'
    print('Dependency install: failed kernel feed does not block available signed packages or leave a stale error')
