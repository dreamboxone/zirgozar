#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
WORK="$RIG/work"
mkdir -p "$WORK"
LINK='vless://11111111-2222-3333-4444-555555555555@example.com:443?security=tls&fp=chrome'
rig_set sample.link "$LINK"
rig_set sample.dial_mode 'oob.0,_,12'
rig_set sample.tls_session_resumption 1
node_records sample | cut -f6- > "$WORK/node.json"
python3 - "$WORK/node.json" <<'PY'
import json,sys
n=json.load(open(sys.argv[1]))
assert n['streamSettings']['sockopt']['dialMode']=='oob.0,_,12'
assert n['streamSettings']['tlsSettings']['enableSessionResumption'] is True
PY
[ "$?" = 0 ] && ok 'OOB sequence and TLS resumption reach the node' || bad 'node settings lost'
rig_set sample.tls_session_resumption 0
node_records sample | cut -f6- > "$WORK/node-off.json"
grep -q '"enableSessionResumption":false' "$WORK/node-off.json" && ok 'TLS resumption can be disabled' || bad 'TLS false lost'
for mode in 'oob.0,_,12' 'oob._' 'oob.255,0' 'custom-mode'; do
 valid_dial_mode "$mode" && ok "valid dialMode: $mode" || bad "valid mode rejected: $mode"
done
for mode in 'oob.' 'oob.256' 'oob.1,,2' 'oob.-1' 'oob.1,' 'custom,mode' 'mode;command'; do
 valid_dial_mode "$mode" && bad "invalid mode accepted: $mode" || ok "invalid dialMode rejected: $mode"
 rig_set sample.dial_mode "$mode"
 node_records sample | cut -f6- > "$WORK/invalid.json"
 grep -q '"dialMode"' "$WORK/invalid.json" && bad 'invalid mode reached node' || ok 'invalid mode omitted from node'
done
cp "$WORK/node.json" "$ZGZ_BEST"
rig_set route_ir 0
sh "$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/default.json"
python3 - "$WORK/default.json" <<'PY'
import json,sys
c=json.load(open(sys.argv[1]))
assert 'skipHostsWhenFakeEnable' not in c['dns']
assert 'close' not in next(o for o in c['outbounds'] if o['tag']=='direct')['settings']
PY
[ "$?" = 0 ] && ok 'optional features remain absent by default' || bad 'default settings changed'
if command -v ucode >/dev/null 2>&1; then
 rig_set freedom_close '{"rewriteHost":"example.net","originalHostHeader":"X-Original-Host","setHeaders":{"X-Test":"set"},"overrideHeaders":{"User-Agent":"test"},"addHeaders":{"X-Extra":"add"},"appendHeaders":{"X-Append":"append"},"removeHeaders":["X-Remove"],"timeoutMs":1000,"onTimeout":"pass","nonHTTP":"pass","noHost":"pass"}'
 rig_set dns_skip_hosts_when_fake 1
 sh "$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/enabled.json"
 python3 - "$WORK/enabled.json" <<'PY'
import json,sys
c=json.load(open(sys.argv[1]))
assert c['dns']['skipHostsWhenFakeEnable'] is True
s=next(o for o in c['outbounds'] if o['tag']=='direct')['settings']['close']
assert s['rewriteHost']=='example.net' and s['setHeaders']=={'X-Test':'set'}
assert s['removeHeaders']==['X-Remove'] and s['onTimeout']=='pass'
PY
 [ "$?" = 0 ] && ok 'Freedom close and FakeDNS settings reach the generated config' || bad 'global settings lost'
 if find_xray "$WORK/enabled.json" >/dev/null 2>&1; then bad 'official core silently accepted fork settings'; else ok 'fork settings require patterniha'; fi
 printf '#!/bin/sh\necho "Xray 26.11.1"\nexit 0\n' > "$RIG/core/xray-patterniha"
 chmod +x "$RIG/core/xray-patterniha"
 if find_xray "$WORK/enabled.json" >/dev/null 2>&1; then bad 'old fork silently accepted new settings'; else ok 'old patterniha cannot silently ignore new settings'; fi
 rm -f "$RIG/core/xray-patterniha"
 if ucode "$ZGZ_LIB/zgz-sbconfig" mode=test < "$WORK/enabled.json" >/dev/null 2>&1; then bad 'sing-box silently dropped fork settings'; else ok 'sing-box rejects unsupported fork settings'; fi
 if [ -n "$RIG_PATTERNIHA_XRAY" ]; then
  cp "$RIG_PATTERNIHA_XRAY" "$RIG/core/xray-patterniha"
  if "$RIG_PATTERNIHA_XRAY" run -test -config "$WORK/enabled.json" > "$WORK/core.log" 2>&1; then ok 'patterniha accepts the generated config'; else bad 'patterniha refused config'; cat "$WORK/core.log"; fi
  check "$(find_xray "$WORK/enabled.json")" "$RIG/core/xray-patterniha" 'fork settings select the compatible core'
 fi
 for invalid in '[]' 'null' '{broken'; do
  rig_set freedom_close "$invalid"
  sh "$ZGZ_LIB/zgz-mkconfig" nogeo >/dev/null 2>&1 && bad 'invalid Freedom JSON accepted' || ok 'invalid Freedom JSON rejected'
 done
fi
rig_report
