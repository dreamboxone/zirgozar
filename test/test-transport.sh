#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
WORK="$RIG/work"
mkdir -p "$WORK"
rig_set a.link '{"protocol":"socks","settings":{"servers":[{"address":"192.0.2.1","port":1080}]},"streamSettings":{"security":"tls","tlsSettings":{"serverName":"example.com","provider":"keep"},"sockopt":{"happyEyeballs":{"tryDelayMs":91,"interleave":2,"maxConcurrentTry":3,"provider":"keep"}}}}'
rig_set b.link 'socks5://192.0.2.2:1080'
rig_set c.link 'socks5://192.0.2.3:1080'
rig_set a.tcp_handshake_timeout 2000
rig_set a.tls_handshake_timeout 3000
rig_set a.tcp_keepalive_count 4
rig_set a.happy_eyeballs 1
rig_set a.happy_eyeballs_success tlsHandshakeComplete
rig_set a.dial_mode 'oob4.0,0;oob6.5,_,8'
rig_set a.fallback_failed b
rig_set a.fallback_no_response c
rig_set a.fallback_no_ip b
rig_set a.fallback_wait_ms 2500
rig_set a.fallback_buffer_size 32768
rig_set a.finalmask '{"tcp4":[{"type":"merge","settings":{"times":1,"delayMs":30,"maxBytes":16384}}]}'
node_records a | cut -f6- > "$WORK/node.json"
chain_outbounds "$(cat "$WORK/node.json")" > "$WORK/dependencies.jsonl"
python3 - "$WORK" <<'PY'
import json,sys,pathlib
p=pathlib.Path(sys.argv[1]); n=json.loads((p/'node.json').read_text()); s=n['streamSettings']; sock=s['sockopt']
assert s['tlsSettings']['tlsHandshakeTimeout']==3000 and s['tlsSettings']['provider']=='keep'
assert sock['tcpHandshakeTimeout']==2000 and sock['tcpKeepAliveCount']==4
assert sock['dialMode']=='oob4.0,0;oob6.5,_,8'
assert s['finalmask']['tcp4'][0]['type']=='merge'
assert sock['happyEyeballs']==dict(tryDelayMs=91,interleave=2,maxConcurrentTry=3,provider='keep',successDefinition='tlsHandshakeComplete')
assert sock['fallback']==dict(failedDialFallbackDialerProxy='chain-b',noResponseFallbackDialerProxy='chain-c',noIPFallbackDialerProxy='chain-b',waitMs=2500,maxBufferSize=32768)
deps=[json.loads(line) for line in (p/'dependencies.jsonl').read_text().splitlines()]
assert {d['tag'] for d in deps}=={'chain-b','chain-c'}
n['tag']='proxy'; (p/'config.json').write_text(json.dumps({'outbounds':[n]+deps}))
PY
[ "$?" = 0 ] && ok 'transport settings preserve imported tuning and include fallback outbounds once' || bad 'transport output'
FRAG='{"type":"fragment","settings":{"packets":"tlshello","lengths":["100-200"],"delays":["0"]}}' decorate < "$WORK/node.json" > "$WORK/decorated.json"
python3 - "$WORK/decorated.json" <<'PY'
import json,sys
mask=json.load(open(sys.argv[1]))['streamSettings']['finalmask']
assert 'tcp4' in mask and 'tcp' not in mask
PY
[ "$?" = 0 ] && ok 'global fragmentation does not conflict with family-specific masks' || bad 'generic mask added to family list'
rig_set b.fallback_failed c
rig_set c.fallback_no_ip a
chain_outbounds "$(cat "$WORK/node.json")" >/dev/null 2>"$WORK/error" && bad 'indirect fallback cycle accepted' || ok 'indirect fallback cycle rejected'
rig_set c.fallback_no_ip ''
rig_set b.fallback_failed missing
chain_outbounds "$(cat "$WORK/node.json")" >/dev/null 2>"$WORK/error" && bad 'missing fallback accepted' || ok 'missing fallback rejected'
for mode in '' 'oob4.0,0;oob6.5,_,8' 'oob6._' 'oob4.255'; do
 valid_dial_mode "$mode" && ok "valid family dialMode: $mode" || bad "valid mode refused: $mode"
done
for mode in 'oob4.0;oob6.256' 'oob.0;oob4.0' 'oob4.0;oob4.1' 'oob4.0;' 'custom;oob4.0'; do
 valid_dial_mode "$mode" && bad "invalid mode accepted: $mode" || ok "invalid family dialMode rejected: $mode"
done
rig_set imported.link '{"protocol":"socks","settings":{"servers":[{"address":"192.0.2.1","port":1080}]},"streamSettings":{"sockopt":{"happyEyeballs":{"tryDelayMs":17},"fallback":{"failedDialFallbackDialerProxy":"chain-b","maxBufferSize":99,"waitMs":10}}}}'
rig_set imported.fallback_no_ip c
rig_set imported.happy_eyeballs 1
rig_set imported.happy_eyeballs_success tcpConnected
node_records imported | cut -f6- > "$WORK/imported.json"
python3 - "$WORK/imported.json" <<'PY'
import json,sys
s=json.load(open(sys.argv[1]))['streamSettings']['sockopt']
assert s['fallback']==dict(failedDialFallbackDialerProxy='chain-b',noIPFallbackDialerProxy='chain-c',maxBufferSize=99,waitMs=10)
assert s['happyEyeballs']==dict(tryDelayMs=17,successDefinition='tcpConnected')
PY
[ "$?" = 0 ] && ok 'new choices merge with imported fallback and race settings' || bad 'imported settings overwritten'
rig_set imported.fallback_failed _none
rig_set imported.fallback_no_ip _none
node_records imported | cut -f6- > "$WORK/disabled.json"
python3 - "$WORK/disabled.json" <<'PY'
import json,sys
assert 'fallback' not in json.load(open(sys.argv[1]))['streamSettings']['sockopt']
PY
[ "$?" = 0 ] && ok 'explicit disable removes imported fallback without a dangling tag' || bad 'fallback disable ignored'
if [ -n "${RIG_PATTERNIHA_XRAY:-}" ]; then
 cp "$RIG_PATTERNIHA_XRAY" "$RIG/core/xray-patterniha"
 "$RIG_PATTERNIHA_XRAY" run -test -config "$WORK/config.json" >"$WORK/core.log" 2>&1 && ok 'latest core accepts timeouts, TLS race, OOB and fallback config' || { bad 'core rejected config'; cat "$WORK/core.log"; }
 find_xray "$WORK/config.json" >/dev/null 2>&1 && ok 'compatible core is selected' || bad 'compatible core not selected'
fi
rm -f "$RIG/core/xray-patterniha"
printf '#!/bin/sh\necho "Xray 26.11.15"\n' > "$RIG/core/xray-patterniha"
chmod +x "$RIG/core/xray-patterniha"
find_xray "$WORK/config.json" >/dev/null 2>&1 && bad 'old core ignored new settings' || ok 'old core rejected before settings can be ignored'
rig_report
