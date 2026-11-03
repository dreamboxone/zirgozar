#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
. "$(dirname "$0")/rig.sh"
rig_setup
printf '%s\n' '{"protocol":"socks","settings":{"servers":[{"address":"192.0.2.1","port":1080}]}}' > "$RIG/etc/best.json"
rig_set game_domain 'games.example geosite:category-games'
rig_set route_games 0
sh "$RIG/lib/zgz-mkconfig" > "$RIG/off.json"
if grep -q 'domain:games.example' "$RIG/off.json"; then bad 'disabled games stay tunneled'; else ok 'disabled games stay tunneled'; fi
rig_set route_games 1
rig_set geo_dir "$RIG/etc/geo"
mkdir -p "$RIG/etc/geo"
if [ -n "${RIG_GEO_DIR:-}" ]; then
 ln -s "$RIG_GEO_DIR/geoip.dat" "$RIG/etc/geo/geoip.dat"
 ln -s "$RIG_GEO_DIR/geosite.dat" "$RIG/etc/geo/geosite.dat"
else
 echo fixture > "$RIG/etc/geo/geoip.dat"
 echo fixture > "$RIG/etc/geo/geosite.dat"
fi
sh "$RIG/lib/zgz-mkconfig" > "$RIG/on.json"
if grep -q 'domain:games.example' "$RIG/on.json" && grep -q 'geosite:category-games' "$RIG/on.json"; then ok 'enabled games include domain and category rules'; else bad 'missing game rules'; fi
sh "$RIG/lib/zgz-mkconfig" nogeo > "$RIG/nogeo.json"
if grep -q 'domain:games.example' "$RIG/nogeo.json" && ! grep -q 'geosite:category-games' "$RIG/nogeo.json"; then ok 'nogeo keeps custom game domains without geo categories'; else bad 'nogeo game rules'; fi
rig_set game_domain none
sh "$RIG/lib/zgz-mkconfig" > "$RIG/empty.json"
if grep -q 'category-games\|domain:none\|games.example' "$RIG/empty.json"; then bad 'empty game list must stay empty'; else ok 'deleting the last game entry stays empty'; fi
if [ -n "${RIG_XRAY:-}" ] && [ -n "${RIG_GEO_DIR:-}" ]; then
 for mode in off on nogeo empty; do
  if XRAY_LOCATION_ASSET="$RIG_GEO_DIR" "$RIG/core/xray" run -test -config "$RIG/$mode.json" > "$RIG/validate.log" 2>&1; then
   ok "Xray accepts game routing mode $mode"
  else
   bad "Xray rejects game routing mode $mode"
   tail -2 "$RIG/validate.log"
  fi
 done
fi
rig_report
