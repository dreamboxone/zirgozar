#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
mkdir -p "$RIG/work"
printf '%s\n' 'vless://11111111-2222-3333-4444-555555555555@203.0.113.7:443?security=none&type=tcp#DNS' |
 LC_ALL=C awk -f "$RIG/lib/zgz-parse" | head -1 | cut -f6 > "$RIG/etc/best.json"
printf 'tag=dns-test\nprotocol=vless\nhost=203.0.113.7\nport=443\n' > "$RIG/etc/best.meta"
cat >> "$RIG/lib/zgz-common.sh" <<'STUB'
resolve_direct() { echo unexpected >> "$ZGZ_RUN/direct.calls"; echo 9.9.9.9; }
STUB
make_config() { sh "$RIG/lib/zgz-mkconfig" > "$RIG/work/config.json" 2> "$RIG/work/error"; }
rig_set remote_dns_protocol doh
for endpoint in 'https://dns.example.net/dns-query' 'https://dns.example.net/dns-query,999.1.1.1' 'https://dns.example.net/dns-query,1.1.1.1/24' 'https://dns.example.net/dns-query,1.1.1.1,8.8.8.8' 'http://1.1.1.1/dns-query'; do
 rig_set remote_dns_doh "$endpoint"
 if make_config; then bad "invalid DoH accepted: $endpoint"; else ok "DoH refuses unsafe bootstrap: $endpoint"; fi
done
[ ! -e "$ZGZ_RUN/direct.calls" ] && ok 'DoH never invokes direct bootstrap' || bad 'DoH invoked direct DNS'
for endpoint in 'https://dns.example.net/dns-query,1.1.1.1' 'https://dns.example.net/dns-query,2606:4700:4700::1111' 'https://[2606:4700:4700::1111]/dns-query' 'https://8.8.8.8/dns-query'; do
 rig_set remote_dns_doh "$endpoint"
 if make_config; then ok "literal DoH bootstrap works: $endpoint"; else bad "DoH rejected: $(cat "$RIG/work/error")"; fi
done
rig_set remote_dns_protocol tls
if make_config; then
 ok 'DoT config is generated'
 python3 - "$RIG/work/config.json" <<'PY'
import json, sys
c=json.load(open(sys.argv[1]))
o=next(o for o in c['outbounds'] if o['tag']=='dns-tls')
assert o['streamSettings']['security']=='tls'
assert o['streamSettings']['tlsSettings']['allowInsecure'] is False
assert o['streamSettings']['sockopt']['dialerProxy']=='proxy'
r=next(r for r in c['routing']['rules'] if r.get('inboundTag')==['dns-remote'])
assert r['outboundTag']=='dns-tls'
assert any(s.get('address')=='tcp://1.1.1.1:853' for s in c['dns']['servers'] if isinstance(s,dict))
PY
 [ "$?" = 0 ] && ok 'DoT uses authenticated TLS over the selected tunnel' || bad 'DoT wiring is incorrect'
 if [ -n "$RIG_XRAY" ]; then
  if "$RIG_XRAY" run -test -config "$RIG/work/config.json" > "$RIG/work/core-test" 2>&1; then ok 'real core accepts DoT'; else bad "core rejected DoT: $(tail -2 "$RIG/work/core-test")"; fi
  RIG="$RIG" python3 "$RIG_SRC/test/test-encrypted-dns-live.py" "$RIG_XRAY" "$RIG/work/config.json" && ok 'live TLS DNS checks' || bad 'live TLS DNS checks failed'
 else echo '  skip - live TLS DNS checks require RIG_XRAY'; fi
else bad "DoT generation failed: $(cat "$RIG/work/error")"; fi
rig_set remote_dns_detour direct
make_config
 grep -q '"dialerProxy":"direct"' "$RIG/work/config.json" && ok 'explicit direct DoT is respected' || bad 'DoT detour ignored'
for address in 'dns.example.net' '1.1.1.999' '1.1.1.1/24' ':::'; do
 rig_set remote_dns_tls "$address"
 if make_config; then bad "invalid DoT IP accepted: $address"; else ok "DoT refuses invalid IP: $address"; fi
done
rig_set remote_dns_tls 2606:4700:4700::1111
make_config && grep -q 'tcp://\[2606:4700:4700::1111\]:853' "$RIG/work/config.json" && ok 'DoT brackets IPv6 endpoint' || bad 'IPv6 DoT endpoint broken'
rig_set remote_dns_tls 1.1.1.1
rig_set encrypted_dns_policy strict
make_config
python3 - "$RIG/work/config.json" <<'PY'
import json,sys
r=json.load(open(sys.argv[1]))['routing']['rules']
i=next(i for i,x in enumerate(r) if x.get('port')=='853,5353' and x.get('outboundTag')=='proxy')
assert 'domain' not in r[i] and 'ip' not in r[i]
assert r[i]['network']=='tcp,udp'
assert not any(x.get('port')=='443' and 'domain' not in x and 'ip' not in x for x in r)
assert i<next((i for i,x in enumerate(r) if 'geosite:ir' in x.get('domain',[])),len(r))
PY
[ "$?" = 0 ] && ok 'strict DNS precedes splits without overriding website HTTPS' || bad 'strict routing is incomplete'
mkdir -p "$RIG/etc/geo"
echo fixture > "$RIG/etc/geo/geoip.dat"
echo fixture > "$RIG/etc/geo/geosite.dat"
for split in 0 1; do
 rig_set route_ir "$split"
 make_config
 python3 - "$RIG/work/config.json" "$split" <<'PY'
import json,sys
rules=json.load(open(sys.argv[1]))['routing']['rules']
iran=[r for r in rules if 'geosite:ir' in r.get('domain',[]) and r.get('outboundTag')=='direct']
assert bool(iran)==(sys.argv[2]=='1')
assert any(r.get('port')=='853,5353' and r.get('outboundTag')=='proxy' for r in rules)
assert not any(r.get('port')=='443' and 'domain' not in r and 'ip' not in r for r in rules)
PY
 [ "$?" = 0 ] && ok "Iran HTTPS follows route_ir=$split while DNS stays protected" || bad 'Iran switch was overridden'
done
rig_set route_ir 0
rm -f "$RIG/etc/geo/geoip.dat" "$RIG/etc/geo/geosite.dat"
for ports in '1853 8853' '443' '65536' 'bad'; do
 rig_set dns_guard_ports "$ports"
 if make_config; then
  [ "$ports" = '1853 8853' ] && grep -q '853,1853,5353,8853' "$RIG/work/config.json" && ok 'custom DNS ports are routed' || bad 'invalid custom ports accepted'
 else
  [ "$ports" != '1853 8853' ] && ok "invalid custom ports rejected: $ports" || bad 'valid custom ports rejected'
 fi
done
rig_set dns_guard_ports ''
if command -v ucode >/dev/null 2>&1; then
 rig_set remote_dns_detour remote
 for protocol in tls doh quic http3; do
  rig_set remote_dns_protocol "$protocol"
  rig_set remote_dns_doh 'https://dns.example.net/dns-query,9.9.9.9'
  if ZGZ_FOR_SINGBOX=1 make_config && ucode "$RIG/lib/zgz-sbconfig" level=none < "$RIG/work/config.json" > "$RIG/work/native-$protocol.json"; then
   python3 - "$RIG/work/native-$protocol.json" "$protocol" <<'PYCODE'
import json,sys
c=json.load(open(sys.argv[1])); p=sys.argv[2]
s=next(s for s in c['dns']['servers'] if s.get('tag')=='dns-remote')
assert s['type']==dict(tls='tls',doh='https',quic='quic',http3='h3')[p]
assert s['detour']=='proxy'
assert s['tls']['insecure'] is False
assert s['server'] in ('1.1.1.1','9.9.9.9')
assert not any(o.get('tag','').startswith('dns-tls') for o in c['outbounds'])
PYCODE
   [ "$?" = 0 ] && ok "native $protocol preserves encryption, bootstrap IP and tunnel" || bad "native $protocol has incorrect DNS wiring"
   if [ -n "$RIG_SINGBOX" ]; then
    if "$RIG_SINGBOX" check -c "$RIG/work/native-$protocol.json" > "$RIG/work/native-$protocol.err" 2>&1; then ok "sing-box accepts $protocol"; else bad "sing-box rejected $protocol: $(tail -2 "$RIG/work/native-$protocol.err")"; fi
   fi
  else bad "native $protocol generation failed"; fi
 done
 if [ -n "$RIG_SINGBOX" ]; then
  RIG="$RIG" python3 "$RIG_SRC/test/test-encrypted-dns-live.py" "$RIG_SINGBOX" "$RIG/work/native-tls.json" singbox
  case "$?" in 0) ok 'native TLS DNS checks' ;; 77) echo '  skip - native TLS sockets unavailable in this runtime' ;; *) bad 'native TLS DNS checks failed' ;; esac
 fi
else echo '  skip - native DNS translation needs ucode'; fi
rig_report
