# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
import json
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
files = root / 'package/zirgozar/files'
node = {
    'type': 'vless', 'tag': 'native LX', 'server': 'example.com', 'server_port': 443,
    'uuid': '11111111-2222-3333-4444-555555555555',
    'encryption': 'mlkem768x25519plus.native.0rtt.test',
    'tls': {'enabled': True, 'server_name': 'example.com',
            'utls': {'enabled': True, 'fingerprint': 'chrome'},
            'reality': {'enabled': True, 'public_key': 'OO2OqOYyZ2fdqXTWku23mRI0Hz7-1eYEoFsKANj6hn8', 'short_id': 'abcd', 'key_share': 'classical'}},
    'transport': {'type': 'xhttp', 'path': '/xh', 'mode': 'packet-up',
                  'headers': {'X-Custom': 'Keep Case'}, 'x_padding_bytes': '100-1000',
                  'xmux': {'max_concurrency': '16-32'}}
}

def convert(node):
    parsed = subprocess.run(['awk', '-f', str(files / 'zgz-parse')], input=json.dumps({'outbounds':[node]}, indent=2), text=True, capture_output=True, check=True).stdout
    rows = parsed.splitlines()
    assert len(rows) == 1, parsed
    payload = json.loads(rows[0].split('\t')[5])
    payload['tag'] = 'proxy'
    result = subprocess.run(['ucode', str(files / 'zgz-sbconfig'), 'mode=test'], input=json.dumps({'outbounds':[payload]}), text=True, capture_output=True, check=True)
    out = json.loads(result.stdout)
    return payload, next(n for n in out['outbounds'] if n['tag'] == 'proxy'), out

payload, actual, config = convert(node)
assert payload['settings']['vnext'][0]['users'][0]['encryption'] == node['encryption']
assert actual['encryption'] == node['encryption']
assert actual['tls']['reality']['key_share'] == 'classical'
assert actual['transport']['headers'] == node['transport']['headers']
assert actual['transport']['x_padding_bytes'] == '100-1000'
assert actual['transport']['xmux'] == node['transport']['xmux']
# An independently parsed next node must not inherit the previous one's metadata.
plain = dict(node, tag='plain', transport={'type':'ws','path':'/ws'}, encryption='none')
_, plain_out, _ = convert(plain)
assert plain_out['transport']['type'] == 'ws' and 'xmux' not in plain_out['transport']

masque = {'type':'masque', 'tag':'warp', 'server':'162.159.198.2', 'server_port':443,
          'profile':'cloudflare', 'tls':{'server_name':'www.microsoft.com'},
          'private_key':'test-private', 'public_key':'test-public', 'ip':'172.16.0.2/32',
          'ipv6':'2606:4700:110::2/128','vhttp':'h2','mtu':1280}
_, actual, _ = convert(masque)
for key, value in masque.items():
    if key != 'tag': assert actual[key] == value, (key, actual)

# Test a real LX binary when supplied; a plain TLS XHTTP node needs no live server.
if os.environ.get('RIG_LX'):
    node['encryption'] = 'none'
    del node['tls']['reality']
    _, _, config = convert(node)
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / 'config.json'
        path.write_text(json.dumps(config))
        subprocess.run([os.environ['RIG_LX'], 'check', '-c', str(path)], check=True)
print('LX imports: encryption, REALITY key_share, XHTTP headers/padding/XMUX, multiline TSV and native MASQUE passed')
