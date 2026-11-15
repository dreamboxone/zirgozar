#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
WORK="$RIG/acl-test"
mkdir -p "$WORK"
cp "$RIG_SRC/test/functions-stub.sh" "$RIG/functions.sh"
sed -i "s|/lib/functions.sh|$RIG/functions.sh|g" "$ZGZ_LIB/zgz-mkconfig"
export ZGZ_TEST_SECTIONS="$WORK/sections"
rig_set acl_enable 1
rig_set main.link 'l2tp://main:mainpass@192.0.2.1?ipsec=0'
rig_set private.link 'l2tp://device:privatepass@192.0.2.2?ipsec=0'
rig_set secure.link 'l2tp+ipsec://secure:securepass@192.0.2.3?psk=secret'
rig_set node main
node_records main 1 | cut -f6- > "$ZGZ_ETC/bridge.json"
printf '%s\n' '{"protocol":"freedom","settings":{},"streamSettings":{"sockopt":{"interface":"zgzl2tp","mark":255}}}' > "$ZGZ_BEST"
printf 'protocol=l2tp\n' > "$ZGZ_BEST_META"
cat > "$ZGZ_TEST_SECTIONS" <<'EOF'
phone	acl_rule
phone	.mode	1
phone	.sources	192.168.1.10
phone	.node	private
laptop	acl_rule
laptop	.mode	1
laptop	.sources	192.168.1.20
laptop	.node	secure
tablet	acl_rule
tablet	.mode	1
tablet	.sources	192.168.1.30
tablet	.node	private
global	acl_rule
global	.mode	1
global	.sources	192.168.1.40
global	.node	main
EOF
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/config.json"
check "$(wc -l < "$ZGZ_RUN/acl-tunnels.instances" | tr -d ' ')" 2 'distinct L2TP accounts get independent workers; shared accounts reuse one'
"$ZGZ_LIB/zgz-rules" dump-local > "$WORK/local.nft"
if sed -n '/set exclude {/,/}/p' "$WORK/local.nft" | grep -q '192.0.2.2, 192.0.2.3'; then
 ok 'private L2TP and IPsec servers bypass router-local interception'
else bad 'private tunnel handshakes could be captured by the main tunnel'; fi
python3 - "$WORK/config.json" "$ZGZ_RUN/acl.tsv" <<'PY'
import json, sys
x = json.load(open(sys.argv[1]))
out = {o['tag']: o for o in x['outbounds']}
assert out['proxy']['streamSettings']['sockopt']['interface'] == 'zgzl2tp'
for tag, dev in [('acl1-out', 'zgza1'), ('acl2-out', 'zgza2'), ('acl3-out', 'zgza1')]:
    assert out[tag]['protocol'] == 'freedom'
    assert out[tag]['streamSettings']['sockopt']['interface'] == dev
    assert out[tag]['streamSettings']['sockopt']['mark'] == 255
    assert any(r.get('outboundTag') == tag and r.get('inboundTag', [''])[0].startswith('acl') for r in x['routing']['rules'])
rows = [line.rstrip().split('\t') for line in open(sys.argv[2])]
assert [r[5] for r in rows] == ['1', '1', '1', '2']
assert [r[6] for r in rows[:3]] == ['1183', '1184', '1185']
PY
if [ "$?" = 0 ]; then ok 'per-device routes use their private links while the primary L2TP account is reused only when selected'; else bad 'L2TP ACL routing mismatch'; fi
cp "$ZGZ_RUN/acl-tunnels.instances" "$WORK/old-instances"
eval "$(sed -n '/^start_acl_tunnels() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zirgozar.init")"
procd_open_instance() { printf 'instance %s\n' "$1" >> "$WORK/procd"; }
procd_set_param() { printf '%s\n' "$*" >> "$WORK/procd"; }
procd_close_instance() { :; }
start_acl_tunnels
check "$(grep -c '^instance acl-l2tp-' "$WORK/procd")" 2 'procd supervises each distinct private L2TP account'
check "$(grep -c '^term_timeout 30$' "$WORK/procd")" 2 'each private connection gets time to clean up on stop'
rig_set private.link 'l2tp://device:newpass@192.0.2.2?ipsec=0'
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/changed.json"
if cmp -s "$WORK/config.json" "$WORK/changed.json" && ! cmp -s "$WORK/old-instances" "$ZGZ_RUN/acl-tunnels.instances"; then
 ok 'credential changes refresh worker snapshots even when parent routing stays identical'
else bad 'credential-only change lost'; fi

if command -v ucode >/dev/null 2>&1; then
 ucode "$ZGZ_LIB/zgz-sbconfig" < "$WORK/config.json" > "$WORK/singbox.json"
 python3 - "$WORK/singbox.json" <<'PY'
import json, sys
x = json.load(open(sys.argv[1]))
out = {o['tag']: o for o in x['outbounds']}
for tag, dev in [('proxy', 'zgzl2tp'), ('acl1-out', 'zgza1'), ('acl2-out', 'zgza2'), ('acl3-out', 'zgza1')]:
    assert out[tag]['type'] == 'direct'
    assert out[tag]['bind_interface'] == dev
    assert out[tag]['routing_mark'] == 255
PY
 if [ "$?" = 0 ]; then ok 'Sing-Box retains independent L2TP devices and bypass marks'; else bad 'Sing-Box lost L2TP isolation'; fi
 for dev in zgzl2tp zgza1 zgza2 zgzb1; do
  mkdir -p "$WORK/$dev"
  ucode "$ZGZ_LIB/zgz-l2tpconfig" config "$ZGZ_ETC/bridge.json" "$WORK/$dev" "$dev" || bad "L2TP rejected $dev"
 done
 if grep -q 'port = 11701' "$WORK/zgzl2tp/xl2tpd.conf" && grep -q 'port = 32001' "$WORK/zgza1/xl2tpd.conf" && grep -q 'port = 32002' "$WORK/zgza2/xl2tpd.conf" && grep -q 'port = 30001' "$WORK/zgzb1/xl2tpd.conf"; then
  ok 'main, two ACL accounts and balancing use distinct UDP ports'
 else bad 'L2TP local ports overlap'; fi
 if [ -n "${RIG_SINGBOX:-}" ]; then "$RIG_SINGBOX" check -c "$WORK/singbox.json" >/dev/null 2>&1 && ok 'Sing-Box accepts the complete L2TP ACL config' || bad 'Sing-Box rejected L2TP ACL config'; fi
fi
if [ -n "${RIG_XRAY:-}" ]; then "$RIG_XRAY" run -test -config "$WORK/config.json" >/dev/null 2>&1 && ok 'Xray accepts the complete L2TP ACL config' || bad 'Xray rejected L2TP ACL config'; fi

# The production run command must export an isolated environment and forward
# termination to the helper, without changing the main tunnel's runtime.
cat > "$ZGZ_LIB/zgz-l2tp" <<'EOF'
#!/bin/sh
printf '%s\t%s\t%s\t%s\n' "$ZGZ_TUNNEL_DEV" "$ZGZ_TUNNEL_TABLE" "$ZGZ_RUN" "$ZGZ_L2TP_NODE" > "$ZGZ_RUN/launched"
trap 'touch "$ZGZ_RUN/stopped"; exit 0' TERM INT
while :; do sleep 1; done
EOF
chmod +x "$ZGZ_LIB/zgz-l2tp"
first="$(head -1 "$ZGZ_RUN/acl-tunnels.instances")"
second="$(tail -1 "$ZGZ_RUN/acl-tunnels.instances")"
"$ZGZ_LIB/zgz-acl-tunnel" run "$first" &
pid1=$!
"$ZGZ_LIB/zgz-acl-tunnel" run "$second" &
pid2=$!
n=0
while [ "$n" -lt 5 ]; do
 [ -f "$first/run/launched" ] && [ -f "$second/run/launched" ] && break
 sleep 1; n=$((n + 1))
done
check "$(cut -f1,2 "$first/run/launched")" "$(printf 'zgza1\t22001')" 'first worker exports its private interface and table'
check "$(cut -f1,2 "$second/run/launched")" "$(printf 'zgza2\t22002')" 'second worker exports another interface and table'
kill "$pid1"; wait "$pid1" 2>/dev/null || true
if [ -f "$first/run/stopped" ] && kill -0 "$pid2" 2>/dev/null && [ ! -f "$second/run/stopped" ]; then ok 'stopping one account leaves the other running'; else bad 'worker cleanup interfered with another account'; fi
kill "$pid2"; wait "$pid2" 2>/dev/null || true
if grep -q 'mainpass' "$ZGZ_ETC/bridge.json"; then ok 'private workers preserve the primary account'; else bad 'primary account was overwritten'; fi

rig_set acl_enable 0
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/disabled.json"
check "$(wc -l < "$ZGZ_RUN/acl-tunnels.instances" | tr -d ' ')" 0 'disabling access control clears the worker manifest'
rig_set acl_enable 1
printf '#!/bin/sh\nexit 1\n' > "$ZGZ_LIB/zgz-acl-tunnel"
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/failed.json" 2>/dev/null
python3 - "$WORK/failed.json" <<'PY'
import json, sys
out = {o['tag']: o for o in json.load(open(sys.argv[1]))['outbounds']}
assert all(out[tag]['protocol'] == 'blackhole' for tag in ['acl1-out', 'acl2-out', 'acl3-out'])
assert out['proxy']['streamSettings']['sockopt']['interface'] == 'zgzl2tp'
PY
if [ "$?" = 0 ]; then ok 'prepare failure blocks only affected devices instead of selecting the primary account'; else bad 'failed ACL leaked to the primary account'; fi

# A private account changes without changing the core's bound interface.
# Reload must replace its supervised instance even with identical core JSON.
for helper in zgz-nodes zgz-router; do printf '#!/bin/sh\nexit 0\n' > "$ZGZ_LIB/$helper"; done
RULES="$WORK/noop"
printf '#!/bin/sh\nexit 0\n' > "$RULES"; chmod +x "$RULES"
STARTED_FLAG="$WORK/started"; touch "$STARTED_FLAG"
rig_set enabled 1
cp "$WORK/changed.json" "$ZGZ_CONFIG_JSON"
cp "$WORK/old-instances" "$ZGZ_RUN/acl-tunnels.applied"
printf 'changed-private-worker\n' > "$ZGZ_RUN/acl-tunnels.instances"
: > "$ZGZ_RUN/balancing.instances"; : > "$ZGZ_RUN/balancing.applied"
: > "$ZGZ_RUN/rules.applied"; printf 'dns\n' > "$ZGZ_RUN/dns.applied"
core_config() { cat "$ZGZ_CONFIG_JSON"; }
active_engine() { echo xray; }
wanted_engine() { echo xray; }
tunnel_running() { return 0; }
bridge_wanted() { return 1; }
say_status() { :; }
dns_signature() { echo dns; }
start() { echo start > "$WORK/reloaded"; }
restart() { echo restart > "$WORK/reloaded"; }
eval "$(sed -n '/^reload_service() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zirgozar.init")"
reload_service
check "$(cat "$WORK/reloaded" 2>/dev/null)" start 'credential-only updates replace private workers when the main core config is identical'
rm -f "$WORK/reloaded"
: > "$ZGZ_RUN/acl-tunnels.instances"
reload_service
check "$(cat "$WORK/reloaded" 2>/dev/null)" start 'removing the last private account refreshes procd to stop stale workers'
rig_report
