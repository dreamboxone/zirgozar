#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
mkdir -p "$RIG/geo"
export EXPECTED_GEO="$RIG/geo"
cat > "$RIG/core/rejected" <<'EOF'
#!/bin/sh
echo 'Failed to build config: unsupported cipher in outbound' >&2
exit 1
EOF
cat > "$RIG/core/accepted" <<'EOF'
#!/bin/sh
[ "$XRAY_LOCATION_ASSET" = "$EXPECTED_GEO" ]
EOF
chmod +x "$RIG/core/rejected" "$RIG/core/accepted"
xray_preferred() { :; }
xray_by_version() { printf '%s\n' "$CHECK_CORES"; }
geo_dir() { echo "$EXPECTED_GEO"; }
echo '{}' > "$ZGZ_RUN/config.json"
CHECK_CORES="$RIG/core/rejected"
result=$(ZGZ_XRAY_CHECK_LOG="$ZGZ_RUN/config-check.err" find_xray "$ZGZ_RUN/config.json") && bad 'rejected configuration accepted' || ok 'rejected configuration fails'
check "$result" '' 'diagnostic does not corrupt the selected binary output'
grep -q 'unsupported cipher' "$ZGZ_RUN/config-check.err" && ok 'underlying core rejection is preserved' || bad 'core rejection lost'
check "$(stat -c %a "$ZGZ_RUN/config-check.err")" 600 'configuration diagnostics are private'
CHECK_CORES="$RIG/core/rejected $RIG/core/accepted"
result=$(ZGZ_XRAY_CHECK_LOG="$ZGZ_RUN/config-check.err" find_xray "$ZGZ_RUN/config.json")
check "$result" "$RIG/core/accepted" 'another compatible core is still tried'
if [ -e "$ZGZ_RUN/config-check.err" ]; then bad 'successful validation leaves a stale error'; else ok 'successful validation clears stale rejection'; fi
eval "$(sed -n '/^try_compatible_singbox() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zirgozar.init")"
log() { :; }; log_step() { :; }; warn() { :; }; geoview_for_singbox() { :; }
core_config() { echo '{"native":true}'; }
find_engine_singbox() { [ "$NATIVE_ACCEPT" = 1 ] && echo "$RIG/core/sing-box-lx"; }
ENGINE=xray; PROG=''; NATIVE_ACCEPT=1
ZGZ_CONFIG_JSON="$ZGZ_RUN/tunnel.json"
echo original > "$ZGZ_CONFIG_JSON"
try_compatible_singbox
check "$ENGINE" singbox 'rejected Xray configuration can use an accepted native alternative'
check "$PROG" "$RIG/core/sing-box-lx" 'fallback records the executable actually accepted'
grep -q native "$ZGZ_CONFIG_JSON" && ok 'accepted native configuration replaces the rejected one' || bad 'native configuration not installed'
ENGINE=xray; PROG=''; NATIVE_ACCEPT=0
echo original > "$ZGZ_CONFIG_JSON"
if try_compatible_singbox; then bad 'unaccepted fallback used'; else ok 'unaccepted fallback is refused'; fi
check "$(cat "$ZGZ_CONFIG_JSON")" original 'failed fallback preserves original configuration'
engine_singbox_path() { echo "$RIG/core/sing-box"; }
check "$(core_label singbox "$RIG/core/sing-box-lx")" sing-box-lx 'core label follows actual executable, not configured preference'
check "$(core_label singbox "$RIG/core/sing-box")" sing-box 'official native core is labeled accurately'
rig_report
