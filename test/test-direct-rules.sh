#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
. "$(dirname "$0")/rig.sh"
rig_setup
printf '%s\n' '{"protocol":"socks","settings":{"servers":[{"address":"192.0.2.1","port":1080}]}}' > "$RIG/etc/best.json"
rig_set route_ir 0
rig_set direct_domain 'example.com regexp:.*\.ir$ regexp:.*\.xn--mgba3a4f16a$ ext:geosite_IR.dat:ir geosite:google-play ext:geoip_IR.dat:ir'
rig_set direct_ip '192.0.2.0/24 geoip:ir ext:custom.dat:ir'
sh "$RIG/lib/zgz-mkconfig" > "$RIG/direct.json"
python3 - "$RIG/direct.json" <<'PY'
import json, sys
config = json.load(open(sys.argv[1]))
rules = [r for r in config['routing']['rules'] if r.get('outboundTag') == 'direct']
domains = [v for r in rules for v in r.get('domain', [])]
ips = [v for r in rules for v in r.get('ip', [])]
for value in ['domain:example.com', r'regexp:.*\.ir$', r'regexp:.*\.xn--mgba3a4f16a$', 'ext:geosite_IR.dat:ir', 'geosite:google-play']:
    assert value in domains, (value, domains)
for value in ['geoip:ir', 'ext:geoip_IR.dat:ir', 'ext:custom.dat:ir']:
    assert value in ips and value not in domains, (value, ips, domains)
assert config['routing']['domainStrategy'] in ('IPIfNonMatch', 'IPOnDemand')
for server in config['dns']['servers']:
    if isinstance(server, dict):
        assert not any(v.startswith(('geoip:', 'ext:geoip', 'ext:custom')) for v in server.get('domains', []))
PY
if [ "$?" = 0 ]; then ok 'direct domain and IP rules preserve Xray syntax and stay separate'; else bad 'direct rules'; fi
rig_report
