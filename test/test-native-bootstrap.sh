#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
command -v ucode >/dev/null 2>&1 || { echo 'skip: ucode is required'; exit 0; }
rig_set sources own
rig_set route_ir 0
rig_set direct_dns_protocol udp
rig_set direct_dns 192.0.2.53
rig_set remote_dns_protocol tcp
rig_set remote_dns 8.8.8.8
rig_set hy.link 'hysteria2://secret@hy2.example:443?sni=hy2.example#test'
: > "$RIG/run/candidates.tsv"
: > "$RIG/run/alive.tsv"
"$ZGZ_LIB/zgz-probe" use hy >/dev/null
for resolver in direct nodes; do
 [ "$resolver" != nodes ] || rig_set node_dns 192.0.2.54
 "$ZGZ_LIB/zgz-mkconfig" nogeo > "$RIG/xray.json"
 ucode "$ZGZ_LIB/zgz-sbconfig" bridge="$ZGZ_ETC/bridge.json" level=none < "$RIG/xray.json" > "$RIG/native.json"
 python3 - "$RIG/native.json" "$resolver" <<'PY'
import json,sys
config=json.load(open(sys.argv[1]))
expected='dns-direct' if sys.argv[2]=='direct' else 'dns-nodes'
assert config['route']['default_domain_resolver']['server']==expected
server=next(s for s in config['dns']['servers'] if s['tag']==expected)
assert server.get('detour') not in ('proxy', 'out'), 'node DNS cannot depend on the node'
assert any(r.get('server')==expected and 'hy2.example' in r.get('domain',[]) for r in config['dns']['rules'])
assert any(o.get('type')=='hysteria2' and o.get('server')=='hy2.example' for o in config['outbounds'])
print('PASS: Hysteria2 bootstrap DNS is independent with Iran routing off:',expected)
PY
 check "$?" 0 "$resolver resolver avoids the native Hysteria2 DNS dependency loop"
done
rig_report
