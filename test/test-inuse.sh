#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>

set -e
. "$(dirname "$0")/rig.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
ZGZ_ETC="$work"
ZGZ_BEST_META="$work/best.meta"
PARSE="$RIG_SRC/package/zirgozar/files/zgz-parse"
awk '/^cmd_inuse\(\)/ { copy=1 } copy { print } /^# ---.*names of their own/ { exit }' \
 "$RIG_SRC/package/zirgozar/files/zgz-nodes" > "$work/functions.sh"
. "$work/functions.sh"
config_load() { :; }
config_get() {
 value="${4:-}"
 case "$2:$3" in
  first:TYPE|second:TYPE) value=node ;;
 esac
 eval "$1=\$value"
}
bridge_type() { printf '%s\n' aether; }
cfg_bool() { printf '%s\n' "$enabled"; }
json_escape() { printf '%s' "$1"; }
enabled=1
printf 'protocol=aether\nhost=162.159.198.4\nport=443\n' > "$ZGZ_BEST_META"
printf '%s\n' '{"type":"aether","id":"second"}' > "$work/bridge.json"
result="$(cmd_inuse)"
check "$result" '{"section":"second","host":"162.159.198.4","port":"443","active":true}' \
 'runtime bridge identity distinguishes nodes sharing an endpoint'
printf '%s\n' '{"type":"aether","id":"first"}' > "$work/bridge.json"
check "$(cmd_inuse)" '{"section":"first","host":"162.159.198.4","port":"443","active":true}' \
 'legacy bridge identity selects its own section'
printf '%s\n' '{"type":"aether","id":"missing"}' > "$work/bridge.json"
check "$(cmd_inuse)" '{"section":"","host":"162.159.198.4","port":"443","active":true}' \
 'missing identity never protects a different node at the same endpoint'
printf '%s\n' '{"type":"aether","id":"second"}' > "$work/bridge.json"
printf 'protocol=vless\nhost=162.159.198.4\nport=443\n' > "$ZGZ_BEST_META"
check "$(cmd_inuse)" '{"section":"","host":"162.159.198.4","port":"443","active":true}' \
 'a stale bridge does not identify a different active protocol'
for proto in vless vmess trojan shadowsocks socks http wireguard hysteria hysteria2 tuic anytls snell naive openconnect tailscale ssh ssplugin ssr ssrust mieru shadowquic trusttunnel openvpn amneziawg warp aether l2tp pptp sstp ikev2 balancing shunt interface; do
 printf 'section=second\nprotocol=%s\nhost=162.159.198.4\nport=443\n' "$proto" > "$ZGZ_BEST_META"
 check "$(cmd_inuse)" '{"section":"second","host":"162.159.198.4","port":"443","active":true}' \
  "$proto uses the stable section name"
done
printf 'section=\nprotocol=aether\nhost=162.159.198.4\nport=443\n' > "$ZGZ_BEST_META"
check "$(cmd_inuse)" '{"section":"","host":"162.159.198.4","port":"443","active":true}' \
 'a subscription selection does not fall back to another manual node'
enabled=0
case "$(cmd_inuse)" in *'"active":false'*) ok 'disconnected nodes are not protected' ;; *) bad 'disconnected node marked active' ;; esac

# Exercise the production selection writer, including manual and automatic paths.
awk '/^select_tag\(\)/ { copy=1 } /^# Take the next/ { exit } copy { print }' \
 "$RIG_SRC/package/zirgozar/files/zgz-probe" > "$work/select.sh"
. "$work/select.sh"
ZGZ_RUN="$work"
ZGZ_BEST="$work/best.json"
ZGZ_CANDIDATES="$work/candidates.tsv"
ALIVE="$work/alive.tsv"
ZGZ_LIB="$work/lib"
ZGZ_OUT_MARK=255
ZGZ_OVPN_DEV=zgzovpn
mkdir -p "$ZGZ_LIB"
printf '#!/bin/sh\necho second\n' > "$ZGZ_LIB/zgz-nodes"
chmod +x "$ZGZ_LIB/zgz-nodes"
cfg() { printf '%s\n' "$2"; }
uci() { return 1; }
write_if_changed() { cp "$1" "$2"; }
count() { echo 1; }
log() { :; }
tcp_ms() { echo 1; }
masque_native() { return 1; }
ppp_dev() { return 1; }
node_records() { printf '%s\n' "$record"; }
for proto in vless vmess trojan shadowsocks wireguard aether hysteria2 openvpn warp balancing shunt interface; do
 record="$(printf 'n0\tShared name\t%s\t162.159.198.4\t443\t{"type":"%s","id":"second"}' "$proto" "$proto")"
 printf '%s\n' "$record" > "$ZGZ_CANDIDATES"
 cmd_use second
 check "$(sed -n 's/^section=//p' "$ZGZ_BEST_META")" second "$proto manual selection records its section"
 select_tag n0 10
 check "$(sed -n 's/^section=//p' "$ZGZ_BEST_META")" second "$proto automatic selection records its origin"
done
select_row "$record" 0 'sub:list:node'
check "$(sed -n 's/^section=//p' "$ZGZ_BEST_META")" '' 'subscription references are not manual section names'
rig_report
