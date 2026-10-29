#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
cat >> "$RIG/lib/zgz-common.sh" <<'COMMON'
find_xray() { echo "$RIG/bin/xray"; }
resolve_direct() { echo 192.0.2.2; }
COMMON
export RIG
rig_set test_url https://example.com/check
printf 'client\nremote 192.0.2.1 1194\n' | LC_ALL=C awk -f "$RIG/lib/zgz-parse" | cut -f6- > "$RIG/node.json"
printf 'live bridge state\n' > "$RIG/etc/bridge.json"
cat > "$RIG/bin/ip" <<'IP'
#!/bin/sh
echo "$*" >> "$RIG/ip.log"
case "$*" in
 '-4 route show table 19015'|'-4 rule show') exit 0 ;;
 'link show dev zgzovpnt') [ "$OVPN_CASE" = conflict ] ;;
 '-4 addr show dev zgzovpnt') [ -f "$RIG/vpn.started" ] && echo 'inet 10.8.0.2/24' ;;
 '-4 addr show dev zgzovpn') [ "$OVPN_CASE" = active ] && echo 'inet 10.8.0.2/24' ;;
 *) exit 0 ;;
esac
IP
cat > "$RIG/bin/openvpn" <<'VPN'
#!/bin/sh
touch "$RIG/vpn.started"
if [ "$OVPN_CASE" = auth ]; then echo AUTH_FAILED; else echo 'Initialization Sequence Completed'; fi
trap 'exit 0' TERM INT
while :; do sleep 1; done
VPN
cat > "$RIG/bin/xray" <<'XRAY'
#!/bin/sh
cp "$3" "$RIG/proxy.json"
trap 'exit 0' TERM INT
while :; do sleep 1; done
XRAY
cat > "$RIG/bin/curl" <<'CURL'
#!/bin/sh
printf '%s\n' "$*" > "$RIG/curl.args"
[ "$OVPN_CASE" != failed ] || exit 22
echo 0.123
CURL
chmod +x "$RIG/bin/"*
run() {
 OVPN_CASE="$1"; export OVPN_CASE
 rm -f "$RIG/vpn.started" "$RIG/ip.log"
 answer=$(sh "$RIG/lib/zgz-openvpn" test < "$RIG/node.json") || true
 check "$answer" "$2" "$1 probe result"
 [ ! -d "$RIG/run/.openvpn-test-lock" ] && ok "$1 releases lock" || bad "$1 lock leaked"
 [ -z "$(find "$RIG/run" -maxdepth 1 -name 'openvpn-test.*' -print)" ] && ok "$1 removes credentials and scratch files" || bad "$1 credentials leaked"
}
run success 123
grep -q 'oif zgzovpnt lookup 19015' "$RIG/ip.log" && ok 'probe uses an interface-specific routing rule' || bad 'missing independent rule'
grep -q 'route flush table 19015' "$RIG/ip.log" && ok 'probe routes cleaned up' || bad 'routes leaked'
grep -q '"interface":"zgzovpnt","mark":255' "$RIG/proxy.json" && ok 'probe sockets bind the tunnel and bypass interception' || bad 'probe may escape tunnel'
grep -q -- '--socks5 127.0.0.1:24902 --resolve example.com:443:192.0.2.2' "$RIG/curl.args" && ok 'URL request uses tunnel proxy with explicit DNS and TLS hostname' || bad 'URL did not use tunnel'
check "$(cat "$RIG/etc/bridge.json")" 'live bridge state' 'production state remains unchanged'
run failed 0
run auth 0
run conflict -2
if grep -q 'route flush' "$RIG/ip.log"; then bad 'conflict removed another interface routes'; else ok 'conflicts leave other routes alone'; fi
cp "$RIG/node.json" "$RIG/etc/bridge.json"
run active 123
[ ! -e "$RIG/vpn.started" ] && ok 'active account is reused without a second login' || bad 'active account logged in again'
grep -q '"interface":"zgzovpn","mark":255' "$RIG/proxy.json" && ok 'active account measurement uses live tunnel' || bad 'wrong active interface'
rig_report
