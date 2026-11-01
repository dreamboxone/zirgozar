#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$RIG/lib/zgz-common.sh"
rig_set direct_dns_protocol udp
rig_set direct_dns 192.0.2.53
cat > "$RIG/bin/nslookup" <<'DNS'
#!/bin/sh
printf 'Server: 192.0.2.53\nAddress: 192.0.2.53:53\n\nName: %s\nAddress: 2001:db8::8\n' "$1"
[ "${ZGZ_DUAL:-0}" != 1 ] || printf 'Address: 192.0.2.8\n'
DNS
chmod +x "$RIG/bin/nslookup"
check "$(resolve_direct_all vpn.example)" '2001:db8::8' 'AAAA-only domain is resolved outside the tunnel'
check "$(resolve_direct vpn.example)" '' 'IPv4-only callers do not receive IPv6'
export ZGZ_DUAL=1
check "$(resolve_direct vpn.example)" '192.0.2.8' 'dual-stack domains preserve IPv4 compatibility'
check "$(resolve_direct_all 2001:db8::9)" '2001:db8::9' 'literal IPv6 endpoint accepted'
cat > "$RIG/bin/nslookup" <<'DNS'
#!/bin/sh
[ "$2" = 127.0.0.1 ] || exit 1
printf 'Server: 127.0.0.1\nAddress: 127.0.0.1:53\n\nName: %s\nAddress: 192.0.2.44\nAddress: 2001:db8::44\n' "$1"
DNS
check "$(resolve_direct_all vpn.example)" "$(printf '192.0.2.44\n2001:db8::44')" 'blocked direct DNS falls back to router DNS for both address families'
check "$(resolve_direct vpn.example)" '192.0.2.44' 'IPv4 callers retain their address with DNS protection active'
cat > "$RIG/bin/nslookup" <<'DNS'
#!/bin/sh
exit 1
DNS
check "$(resolve_direct_all vpn.example)" '' 'failed resolvers do not invent a tunnel endpoint'
check "$(resolve_direct_all 192.0.2.8)" '192.0.2.8' 'literal endpoint needs no working DNS'
for link in 'l2tp://u:p@[2001:db8::1]' 'l2tp+ipsec://u:p@[2001:db8::1]:1701?psk=secret' 'sstp://u:p@[2001:db8::1]:443'; do
 record="$(printf '%s\n' "$link" | LC_ALL=C awk -f "$RIG/lib/zgz-parse")"
 check "$(printf '%s' "$record" | cut -f4)" '2001:db8::1' 'IPv6 share link retains server address'
done
node "$RIG_SRC/test/test-l2tp-ui.js" || bad 'IPv6 form round trip'
if command -v ucode >/dev/null 2>&1; then
 mkdir -p "$RIG/config"
 printf '{"type":"l2tp","server":"vpn.example","port":1701,"username":"u","password":"p","mtu":1400,"ipsec":true,"psk":"secret"}' > "$RIG/node.json"
 ucode "$RIG/lib/zgz-l2tpconfig" config "$RIG/node.json" "$RIG/config" zgzl2tp 2001:db8::1 2001:db8::2
 check "$?" 0 'L2TP IPv6 endpoint configuration is accepted'
 grep -q 'lns = 127.0.0.1:21701' "$RIG/config/xl2tpd.conf" && ok 'IPv4 client uses the private transport listener' || bad 'client lost IPv6 relay'
 check "$(sed -n 's/.*"relay_port"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$RIG/config/runtime.json")" 21701 'runtime retains relay port'
 grep -q '2001:db8::1' "$RIG/config/runtime.json" && ok 'IPsec retains the actual IPv6 peer' || bad 'IPsec points at loopback'
fi
rig_report
