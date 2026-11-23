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

eval "$(sed -n '/^asset_for() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zgz-cores")"
CPUINFO="$RIG/cpuinfo"
arch_assets() { printf '%s\n' "$TEST_ARCH_ASSETS"; }
eval "$(sed -n '/^arm_vfp_level() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zgz-cores" | sed '1s/arm_vfp_level/fixture_vfp_level/')"
arm_vfp_level() { fixture_vfp_level "$CPUINFO"; }
TEST_ARCH_ASSETS='arm32-v7a armv7 arm'
printf 'Features : half thumb fastmult edsp tls\n' > "$CPUINFO"
check "$(asset_for warp-plus)" arm-softfloat 'ARMv7 without VFP gets soft-float warp-plus'
check "$(asset_for vwarp)" arm-softfloat 'ARMv7 without VFP gets soft-float Vwarp'
check "$(asset_for aether)" - 'ARMv7 without VFP cannot use the Aether hard-float release'
check "$(asset_for sing-box)" armv5 'ARMv7 without VFP keeps the existing sing-box fallback'
printf 'Features : vfp\n' > "$CPUINFO"
check "$(asset_for warp-plus)" arm-softfloat 'VFP alone is insufficient for warp-plus arm7'
check "$(asset_for xray)" arm32-v6 'ARMv7 with only VFP uses the lower Xray baseline'
printf 'Features : vfp vfpv3d16\nFeatures : vfp vfpv4\n' > "$CPUINFO"
check "$(asset_for warp-plus)" arm7 'VFPv3-D16 and VFPv4 allow the upstream warp-plus arm7 build'
check "$(asset_for vwarp)" arm7 'ARMv7 with VFPv3 uses the upstream Vwarp build'
check "$(asset_for aether)" armv7-musl 'ARMv7 with VFPv3 uses the Aether musl release'
printf 'Features : thumb tls\n' >> "$CPUINFO"
check "$(asset_for warp-plus)" arm-softfloat 'the core must be compatible with every reported CPU'
TEST_ARCH_ASSETS='arm64-v8a arm64 arm64'
check "$(asset_for warp-plus)" arm64 'ARM64 still uses the upstream artifact'
check "$(asset_for vwarp)" arm64 'ARM64 still uses the upstream Vwarp artifact'
check "$(asset_for aether)" aarch64-musl 'ARM64 still uses the upstream Aether artifact'

eval "$(sed -n '/^install_warpplus() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zgz-cores")"
SELF_REPO=dreamboxone/zirgozar
VWARP_REPO=voidr3aper-anon/Vwarp
zgz_version() { echo 1.2.3-r4; }
remote_size() { echo 100; }
need_room() { :; }
download_checked() { printf '%s\n' "$1"; return 1; }
TEST_ARCH_ASSETS='arm32-v7a armv7 arm'
printf 'Features : thumb tls\n' > "$CPUINFO"
check "$(install_warpplus vwarp || :)" \
	'https://github.com/dreamboxone/zirgozar/releases/download/v1.2.3-r4/vwarp_linux-arm-softfloat.zip' \
	'Vwarp downloads its own soft-float archive from the installed Zirgozar release'
rig_report
