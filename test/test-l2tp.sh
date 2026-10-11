#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar
. "$(dirname "$0")/rig.sh"
rig_setup
node "$RIG_SRC/test/test-l2tp-ui.js" || bad 'L2TP share link form failed'
. "$ZGZ_LIB/zgz-common.sh"
WORK="$RIG/l2tp-test"
mkdir -p "$WORK"
rig_set a1.link 'l2tp://user%40domain:p%3Aa%40ss@example.com:1701?ipsec=0#test'
rig_set b1.link 'l2tp+ipsec://user:pass@192.0.2.1?psk=key%26x&mtu=1380#secure'
rig_set node a1
node_records a1 1 > "$WORK/plain.tsv"
node_records b1 1 > "$WORK/secure.tsv"
check "$(cut -f3 "$WORK/plain.tsv")" l2tp 'L2TP record is recognized'
check "$(cut -f4,5 "$WORK/secure.tsv")" "$(printf '192.0.2.1\t1701')" 'IPsec account has default UDP port'
if grep -q '"username":"user@domain","password":"p:a@ss"' "$WORK/plain.tsv"; then ok 'credentials decode without corruption'; else bad 'credentials corrupted'; fi
if grep -q '"ipsec":true,"psk":"key&x","mtu":1380' "$WORK/secure.tsv"; then ok 'IPsec key and MTU are parsed'; else bad 'IPsec fields missing'; fi
for link in 'l2tp://a:b@host?ipsec=1' 'l2tp://a:b@host?mtu=10' 'l2tp://a:b@host?mtu=x' 'l2tp://a:%0Ap@host' 'l2tp://a:b@host?ipsec=invalid'; do
	if [ -z "$(printf '%s\n' "$link" | LC_ALL=C awk -f "$ZGZ_LIB/zgz-parse")" ]; then ok 'invalid account rejected'; else bad "invalid account accepted: $link"; fi
done
"$ZGZ_LIB/zgz-probe" use a1 >/dev/null 2>&1
check "$(bridge_type)" l2tp 'L2TP helper is selected'
if grep -q '"interface":"zgzl2tp"' "$ZGZ_BEST" && grep -q '"mark":255' "$ZGZ_BEST"; then ok 'outbound binds the tunnel and bypass mark'; else bad 'outbound may escape tunnel'; fi
check "$(wanted_engine)" xray 'L2TP keeps routing in the selected core'
if bridge_wanted singbox; then ok 'L2TP helper stays enabled under sing-box'; else bad 'sing-box lost L2TP helper'; fi
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/config.json"
if grep -q '"interface":"zgzl2tp"' "$WORK/config.json"; then ok 'routing config retains L2TP egress'; else bad 'routing config lost L2TP egress'; fi
# Measure an existing account without making another PPP connection.
rig_set test_url http://192.0.2.2/
cat > "$RIG/bin/ip" <<'IP'
#!/bin/sh
echo 'inet 192.0.2.1/32'
IP
cat > "$RIG/bin/curl" <<'CURL'
#!/bin/sh
echo 0.123
CURL
chmod +x "$RIG/bin/ip" "$RIG/bin/curl"
check "$("$ZGZ_LIB/zgz-l2tp" test url < "$ZGZ_ETC/bridge.json")" 123 'L2TP measured seconds become milliseconds on stdout'
check "$("$ZGZ_LIB/zgz-l2tp" test tcp < "$ZGZ_ETC/bridge.json")" 123 'L2TP TCP handshake returns milliseconds'
# Test dispatch calls the L2TP helper rather than knocking on UDP with TCP.
cat > "$ZGZ_LIB/zgz-l2tp" <<'HELPER'
#!/bin/sh
cat > "$ZGZ_RUN/l2tp-test-payload"
echo "$*" > "$ZGZ_RUN/l2tp-test-args"
echo 321
HELPER
chmod +x "$ZGZ_LIB/zgz-l2tp"
"$ZGZ_LIB/zgz-test" tcp a1
check "$(cat "$ZGZ_RUN/l2tp-test-args")" 'test tcp' 'TCPing uses negotiated tunnel'
check "$(cat "$ZGZ_RUN/tests/a1.tcp")" 321 'TCPing result is stored'
"$ZGZ_LIB/zgz-test" url a1
check "$(cat "$ZGZ_RUN/l2tp-test-args")" 'test url' 'URL test uses negotiated tunnel'
check "$(cat "$ZGZ_RUN/tests/a1.url")" 321 'URL test result is stored'
rig_report
