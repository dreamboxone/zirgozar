#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
eval "$(sed -n '/^switched_off() {/p; /^abandon_start() {/,/^}/p; /^wait_for_port() {/,/^}/p; /^start_failed() {/,/^}/p; /^service_started() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zirgozar.init")"
RULES="$RIG/bin/rules"
DNS="$RIG/bin/dns"
STATS="$RIG/bin/stats"
for helper in rules dns stats; do
 printf '#!/bin/sh\nprintf "%%s %%s\\n" "%s" "$*" >> "$ZGZ_RUN/actions"\n' "$helper" > "$RIG/bin/$helper"
 chmod +x "$RIG/bin/$helper"
done
STARTED_FLAG="$RIG/started"; touch "$STARTED_FLAG"
log() { :; }
say_status() { printf '%s\n' "$1" > "$ZGZ_STATUS"; }
bridge_wanted() { [ "$scenario" != core ] && [ "$scenario" != ready ]; }
bridge_is_ovpn() { [ "$scenario" = openvpn ]; }
bridge_is_l2tp() { [ "$scenario" = l2tp ]; }
bridge_is_ppp() { [ "$scenario" = pptp ] || [ "$scenario" = sstp ]; }
bridge_is_ikev2() { [ "$scenario" = ikev2 ]; }
bridge_is_warp() { [ "$scenario" = warp ]; }
bridge_is_aether() { [ "$scenario" = aether ]; }
ip() { return 1; }
listening() {
 if [ "$scenario" = ready ]; then rig_set enabled 0; return 0; fi
 return 1
}
sleep() { echo tick >> "$ZGZ_RUN/ticks"; rig_set enabled 0; }
for scenario in openvpn l2tp pptp sstp ikev2 warp aether core ready; do
 rig_set enabled 1
 : > "$ZGZ_RUN/actions"; : > "$ZGZ_RUN/ticks"
 if service_started; then bad "$scenario accepted a cancelled startup"; else ok "$scenario exits when switched off during startup"; fi
 check "$(cat "$ZGZ_STATUS")" idle "$scenario leaves status idle"
 if grep -q '^dns down$' "$ZGZ_RUN/actions" && grep -q '^rules down$' "$ZGZ_RUN/actions" && ! grep -q '^rules up$' "$ZGZ_RUN/actions"; then
  ok "$scenario restores DNS and removes interception without installing new rules"
 else bad "$scenario retained startup networking"; fi
 count="$(wc -l < "$ZGZ_RUN/ticks" | tr -d ' ')"
 if [ "$count" -le 1 ]; then ok "$scenario cancellation takes at most one wait interval"; else bad "$scenario waited $count intervals after switch-off"; fi
done
scenario=core
rig_set enabled 0
: > "$ZGZ_RUN/ticks"
wait_for_port 1 120 && bad 'disabled port wait succeeded' || ok 'disabled port wait returns immediately'
check "$(wc -l < "$ZGZ_RUN/ticks" | tr -d ' ')" 0 'disabled port wait never sleeps'
sleep() { echo tick >> "$ZGZ_RUN/ticks"; }
rig_set enabled 1
: > "$ZGZ_RUN/ticks"
wait_for_port 1 2 && bad 'unavailable port accepted' || ok 'enabled port wait still times out normally'
check "$(wc -l < "$ZGZ_RUN/ticks" | tr -d ' ')" 2 'enabled wait retains its full timeout'
rig_report
