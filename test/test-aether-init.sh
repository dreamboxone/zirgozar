#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
# Execute the shipped startup hook with a helper that needs 21 seconds.
# The stand-ins record routing activation without touching host networking.
awk '/^service_started\(\)/ { copy=1 } copy { print } copy && /^}/ { exit }' \
 "$RIG_SRC/package/zirgozar/files/zirgozar.init" > "$RIG/startup-hook.sh"
. "$RIG/startup-hook.sh"
STARTED_FLAG="$ZGZ_RUN/instance-opened"
touch "$STARTED_FLAG"
cat > "$RIG/helper" <<'SH'
#!/bin/sh
printf '%s\n' "$0 $1" >> "$ZGZ_RUN/activation"
[ "$1" != status ] || echo 'backend: nftables'
SH
chmod +x "$RIG/helper"
RULES="$RIG/helper" DNS="$RIG/helper" STATS="$RIG/helper"
bridge_wanted() { return 0; }
bridge_is_ovpn() { return 1; }
bridge_is_warp() { return 1; }
bridge_is_aether() { [ "$KIND" = aether ]; }
active_engine() { echo xray; }
dns_signature() { echo dns; }
wait_for_port() {
 printf '%s %s\n' "$1" "$2" >> "$ZGZ_RUN/waits"
 [ "$1" != 10808 ] || { [ "$2" -ge 21 ] && [ "$HELPER_READY" = 1 ]; }
}
KIND=aether HELPER_READY=1
if service_started; then ok 'slow Aether startup reaches routing activation'; else bad 'Aether is cut off before it is ready'; fi
check "$(head -1 "$ZGZ_RUN/waits")" '10808 240' 'Aether allows provisioning plus a full two-minute scan'
if grep -q ' up$' "$ZGZ_RUN/activation" && [ "$(cat "$ZGZ_STATUS")" = ready ]; then ok 'ready helper installs routing and DNS'; else bad 'ready Aether left the network unconfigured'; fi
: > "$ZGZ_RUN/activation"
HELPER_READY=0
if service_started; then bad 'unready helper reported success'; else ok 'unready Aether reports startup failure'; fi
[ ! -s "$ZGZ_RUN/activation" ] && ok 'failed helper leaves routing untouched' || bad 'failed helper activated routing'
say_message 'Aether could not create its WARP account. Check the account API settings and Runtime Logs.'
service_started >/dev/null 2>&1 || true
check "$(cat "$ZGZ_MESSAGE")" 'Aether could not create its WARP account. Check the account API settings and Runtime Logs.' 'startup preserves the specific account failure'
: > "$ZGZ_RUN/waits"
KIND=other HELPER_READY=1
service_started >/dev/null 2>&1 || true
check "$(head -1 "$ZGZ_RUN/waits")" '10808 15' 'other helper startup limits are preserved'
rig_report
