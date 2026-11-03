#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
set -e
if ! command -v uci >/dev/null 2>&1 || [ ! -f /usr/share/libubox/jshn.sh ]; then
 echo 'skip - routing persistence test needs OpenWrt uci and jshn'; exit 0
fi
SOURCE="${ZGZ_RPC_SOURCE:-$(dirname "$0")/../package/zirgozar/files/luci.zirgozar}"
WORK="$(mktemp -d /tmp/zgz-routing-test.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
mkdir "$WORK/config" "$WORK/staged" "$WORK/empty" "$WORK/run"
printf "config zirgozar 'config'\n option enabled '0'\n option route_ir '0'\n option block_ads '0'\n" > "$WORK/config/zirgozar"
ZGZ_RUN="$WORK/run"
ZGZ_ROUTING_CONFIG_DIR="$WORK/config"
. /usr/share/libubox/jshn.sh
sed -n '/^save_routing_setting() {/,/^method_action() {/p' "$SOURCE" | sed '$d' > "$WORK/function.sh"
. "$WORK/function.sh"
uci() { command uci -c "$WORK/config" -t "$WORK/staged" "$@"; }
cfg_bool() { echo 0; }
detach() { echo 'unexpected reload' >&2; return 1; }
fail() { echo "error: $1"; }
committed() { command uci -c "$WORK/config" -t "$WORK/empty" get "zirgozar.config.$1"; }
uci set zirgozar.config.block_ads=1
save_routing_setting '{"key":"route_ir","value":"1"}'
[ "$(committed route_ir)" = 1 ]
[ "$(committed block_ads)" = 0 ]
[ "$(uci get zirgozar.config.block_ads)" = 1 ]
save_routing_setting '{"key":"route_games","value":"1"}'
save_routing_setting '{"key":"game_domain","value":["geosite:category-games","games.example"]}'
[ "$(committed game_domain)" = 'geosite:category-games games.example' ]
save_routing_setting '{"key":"game_domain","value":[]}'
[ "$(committed game_domain)" = none ]
for input in '{"key":"enabled","value":"0"}' '{"key":"route_ir","value":"2"}' '{"key":"game_domain","value":["bad.example;reboot"]}' '{"key":"game_domain","value":"games.example"}'; do
 if save_routing_setting "$input" >/dev/null; then echo 'invalid input accepted' >&2; exit 1; fi
done
[ "$(committed route_ir)" = 1 ]
[ "$(committed game_domain)" = none ]
echo 'Routing persistence: isolated commit, validation, game list and empty list passed'
