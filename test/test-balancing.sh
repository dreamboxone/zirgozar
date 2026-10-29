#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
WORK="$RIG/balancing-test"
mkdir -p "$WORK"
rig_set tunnel.link 'l2tp://user:pass@192.0.2.1?ipsec=0'
rig_set aether.link 'aether://?protocol=wg'
rig_set native.link 'vless://11111111-1111-1111-1111-111111111111@192.0.2.2:443?security=none'
rig_set group.link 'balancing://'
rig_set group.balancing_node 'tunnel aether native'
rig_set node group
check "$(node_records group 1 | cut -f3)" balancing 'a group can start with a tunnel-only member'
"$ZGZ_LIB/zgz-balancing" list > "$WORK/choices.tsv"
if grep -q 'tunnel.*l2tp' "$WORK/choices.tsv" && grep -q 'aether.*aether' "$WORK/choices.tsv"; then
	ok 'saved non-native members are listed before a runtime list exists'
else bad 'saved helper members are missing'; fi
node_records group 1 | cut -f6- > "$ZGZ_BEST"
printf 'tag=group\nprotocol=balancing\n' > "$ZGZ_BEST_META"
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/main.json"
check "$(wc -l < "$ZGZ_RUN/balancing.instances" | tr -d ' ')" 2 'two non-native members receive independent workers'
node - "$WORK/main.json" <<'JS'
const fs = require('fs'), assert = require('assert/strict');
const x = JSON.parse(fs.readFileSync(process.argv[2]));
const tags = x.routing.balancers[0].selector;
assert.equal(tags.length, 3);
const out = tags.map(tag => x.outbounds.find(o => o.tag === tag));
assert.deepEqual(out.slice(0, 2).map(o => o.settings.servers[0].port), [26004, 26008]);
assert.equal(out[2].protocol, 'vless');
JS
if [ "$?" = 0 ]; then ok 'native and helper members route through distinct outbounds'; else bad 'mixed group routing'; fi
rig_set group.fallback_node tunnel
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/fallback.json"
check "$(wc -l < "$ZGZ_RUN/balancing.instances" | tr -d ' ')" 3 'a tunnel fallback gets its own supervised worker'
if grep -q 'bal-group-fallback' "$WORK/fallback.json"; then ok 'fallback points to the helper outbound'; else bad 'fallback missing'; fi
# Selecting an ordinary node must retire all previous worker instances.
node_records native 1 | cut -f6- > "$ZGZ_BEST"
printf 'tag=native\nprotocol=vless\n' > "$ZGZ_BEST_META"
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/native.json"
check "$(wc -l < "$ZGZ_RUN/balancing.instances" | tr -d ' ')" 0 'ordinary nodes leave no stale balancing worker manifest'
rig_set group.balancing_node group
if node_records group 1 >/dev/null; then bad 'recursive group accepted'; else ok 'recursive group rejected'; fi
ZGZ_TUNNEL_DEV=zgzb7
check "$(ppp_dev l2tp)" zgzb7 'the core and PPP helper agree on the member device'
unset ZGZ_TUNNEL_DEV

# Updating credentials changes a worker snapshot, not its parent's SOCKS
# outbound. Reload must still ask procd to replace the changed instance.
for helper in zgz-nodes zgz-probe zgz-router; do
	printf '#!/bin/sh\nexit 0\n' > "$ZGZ_LIB/$helper"
done
RULES="$WORK/rules"
printf '#!/bin/sh\nexit 0\n' > "$RULES"
chmod +x "$RULES"
STARTED_FLAG="$WORK/started"
touch "$STARTED_FLAG"
cp "$WORK/native.json" "$ZGZ_CONFIG_JSON"
rig_set enabled 1
printf 'old-worker\n' > "$ZGZ_RUN/balancing.applied"
: > "$ZGZ_RUN/rules.applied"
printf 'dns\n' > "$ZGZ_RUN/dns.applied"
core_config() { printf 'new-worker\n' > "$ZGZ_RUN/balancing.instances"; cat "$ZGZ_CONFIG_JSON"; }
active_engine() { echo xray; }
wanted_engine() { echo xray; }
tunnel_running() { return 0; }
bridge_wanted() { return 1; }
say_status() { :; }
dns_signature() { echo dns; }
start() { echo start > "$WORK/start-called"; }
restart() { echo restart > "$WORK/start-called"; }
eval "$(sed -n '/^reload_service() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zirgozar.init")"
reload_service
check "$(cat "$WORK/start-called" 2>/dev/null)" start 'worker-only changes refresh procd while the parent config stays identical'
rig_report
