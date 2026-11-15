#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Country combinations must agree across core routing, DNS and firewall bypass.
. "$(dirname "$0")/rig.sh"
rig_setup
set -e
printf '%s\n' '{"protocol":"socks","settings":{"servers":[{"address":"192.0.2.1","port":1080}]}}' > "$RIG/etc/best.json"
mkdir -p "$RIG/etc/geo"
for file in geoip.dat geosite.dat; do
 if [ -n "${RIG_GEO_DIR:-}" ]; then
  ln -s "$RIG_GEO_DIR/$file" "$RIG/etc/geo/$file"
 else
  printf 'fixture\n' > "$RIG/etc/geo/$file"
 fi
done
rig_set geo_dir "$RIG/etc/geo"
printf '192.0.2.0/24\n' > "$RIG/etc/ks-ir.list"
printf '198.51.100.0/24\n' > "$RIG/etc/ks-ru.list"
printf '203.0.113.0/24\n' > "$RIG/etc/ks-cn.list"

for mask in 0 1 2 3 4 5 6 7; do
 rig_set route_ir "$((mask & 1))"
 rig_set route_ru "$(((mask >> 1) & 1))"
 rig_set route_cn "$(((mask >> 2) & 1))"
 sh "$RIG/lib/zgz-mkconfig" > "$RIG/country-$mask.json"
 sh "$RIG/lib/zgz-rules" dump > "$RIG/country-$mask.nft"
 sh "$RIG/lib/zgz-rules" ks dump > "$RIG/ks-$mask.nft"
 if python3 - "$RIG" "$mask" <<'PY'
import json, sys
from pathlib import Path
root, mask = Path(sys.argv[1]), int(sys.argv[2])
config = json.loads((root / f'country-{mask}.json').read_text())
rules = config['routing']['rules']
dns = [s for s in config['dns']['servers'] if isinstance(s, dict)]
firewall = (root / f'country-{mask}.nft').read_text()
killswitch = (root / f'ks-{mask}.nft').read_text()
for bit, country, cidr in [(0, 'ir', '192.0.2.0/24'), (1, 'ru', '198.51.100.0/24'), (2, 'cn', '203.0.113.0/24')]:
    enabled = bool(mask & (1 << bit))
    site = 'category-ru' if country == 'ru' else country
    assert any(f'geosite:{site}' in r.get('domain', []) and r.get('outboundTag') == 'direct' for r in rules) == enabled
    assert any(f'geoip:{country}' in r.get('ip', []) and r.get('outboundTag') == 'direct' for r in rules) == enabled
    assert any(f'geosite:{site}' in s.get('domains', []) for s in dns) == enabled
    assert (cidr in firewall) == enabled, (mask, country, 'firewall')
    assert (cidr in killswitch) == enabled, (mask, country, 'kill switch')
PY
 then ok "country combination $mask: routing, direct DNS, firewall and Kill switch agree"
 else bad "country combination $mask is inconsistent"
 fi
 if [ -n "${RIG_XRAY:-}" ] && [ -n "${RIG_GEO_DIR:-}" ]; then
  if XRAY_LOCATION_ASSET="$RIG_GEO_DIR" "$RIG_XRAY" run -test -config "$RIG/country-$mask.json" > "$RIG/core-check.log" 2>&1; then
   ok "Xray accepts country combination $mask with real routing data"
  else
   bad "Xray rejects country combination $mask"
   tail -3 "$RIG/core-check.log"
  fi
 fi
 if [ -n "${RIG_GEOVIEW:-}" ] && [ -n "${RIG_GEO_DIR:-}" ] && command -v ucode >/dev/null 2>&1; then
  mkdir -p "$RIG/rulesets"
  ucode "$RIG/lib/zgz-sbconfig" "geoview=$RIG_GEOVIEW" "geodir=$RIG_GEO_DIR" "rsdir=$RIG/rulesets" < "$RIG/country-$mask.json" > "$RIG/singbox-$mask.json"
  if python3 - "$RIG/singbox-$mask.json" "$mask" <<'PY'
import json, sys
config, mask = json.load(open(sys.argv[1])), int(sys.argv[2])
tags = {r['tag'] for r in config['route'].get('rule_set', [])}
dns = json.dumps(config['dns']['rules'])
routes = json.dumps([r for r in config['route']['rules'] if r.get('outbound') == 'direct'])
for bit, country, site in [(0, 'ir', 'ir'), (1, 'ru', 'category-ru'), (2, 'cn', 'cn')]:
    enabled = bool(mask & (1 << bit))
    assert (f'geoip-{country}' in tags) == enabled
    assert (f'geosite-{site}' in tags) == enabled
    assert (f'geosite-{site}' in dns) == enabled
    assert (f'geoip-{country}' in routes) == enabled
    assert (f'geosite-{site}' in routes) == enabled
PY
  then ok "Sing-Box keeps country combination $mask in routing and DNS"
  else bad "Sing-Box dropped country combination $mask"
  fi
  if [ -n "${RIG_SINGBOX:-}" ]; then
   if "$RIG_SINGBOX" check -c "$RIG/singbox-$mask.json" > "$RIG/singbox-check.log" 2>&1; then
    ok "Sing-Box accepts country combination $mask with converted routing data"
   else
    bad "Sing-Box rejects country combination $mask"
    tail -3 "$RIG/singbox-check.log"
   fi
  fi
 fi
done
sh "$RIG/lib/zgz-mkconfig" nogeo > "$RIG/nogeo.json"
if grep -Eq 'geo(ip|site):(ir|ru|cn|category-ru)' "$RIG/nogeo.json"; then bad 'nogeo retains country categories'; else ok 'nogeo removes all country categories'; fi
rig_set geo_dir "$RIG/etc/missing"
ZGZ_GEO_SEARCH='' sh "$RIG/lib/zgz-mkconfig" > "$RIG/missing.json"
if grep -Eq 'geo(ip|site):(ir|ru|cn|category-ru)' "$RIG/missing.json"; then bad 'missing routing data retains country categories'; else ok 'missing routing data keeps the tunnel usable'; fi
rig_report
