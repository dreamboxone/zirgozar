#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
command -v ucode >/dev/null 2>&1 || { echo 'skip: ucode is required'; exit 0; }
check "$(sb_lx_config | tr -d ' ')" '{}' 'LX defaults leave the native core unchanged'
rig_set singbox_lx_options '{"quic_sniff_decoy":{"mode":"direct","send":"always"},"mtu_align":{"mode":"fill","except":["direct"]}}'
rig_set lx_decoy_mode detour
rig_set lx_decoy_outbound 'masque wireguard'
rig_set lx_decoy_detour vless
rig_set lx_decoy_send retry
rig_set lx_mtu_mode clamp
rig_set lx_masque_idle 2m
rig_set lx_trusttunnel_idle 5m
sb_lx_config > "$RIG/options.json"
python3 - "$RIG/options.json" <<'PY'
import json,sys
o=json.load(open(sys.argv[1]))
assert o['quic_sniff_decoy']=={'mode':'detour','send':'retry','outbound_type':['masque','wireguard'],'detour_type':['vless']}
assert o['mtu_align']=={'mode':'clamp','except':['direct']}
assert o['masque']['idle_timeout']=='2m' and o['trusttunnel']['idle_timeout']=='5m'
PY
[ "$?" = 0 ] && ok 'saved controls override matching JSON fields and preserve other settings' || bad 'LX settings lost'
rig_set singbox_lx_options '[]'
sb_lx_config >/dev/null 2>&1 && bad 'invalid LX JSON accepted' || ok 'invalid LX JSON rejected'
rig_set core_engine singbox-lx
printf '%s\n' '{"protocol":"masque","sbNative":{"type":"masque-client"}}' > "$ZGZ_BEST"
check "$(wanted_engine)" singbox 'native MASQUE retains the selected native engine'
printf '%s\n' '{"protocol":"masque"}' > "$ZGZ_BEST"
check "$(wanted_engine)" xray 'generated Xray WARP still selects Xray'
printf '%s\n' '{"type":"trusttunnel","server":"example.com","port":443}' > "$ZGZ_ETC/bridge.json"
engine_singbox_path() { echo /usr/bin/true; }
core_version_cached() { echo 1.14.4-lx.33; }
bridge_wanted singbox && bad 'native TrustTunnel launches a second helper' || ok 'native TrustTunnel runs without a second helper'
bridge_wanted xray && ok 'Xray TrustTunnel retains its helper' || bad 'Xray helper lost'
rig_report
