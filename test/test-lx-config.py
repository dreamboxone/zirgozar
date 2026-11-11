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

def convert(node, extra=()):
    parsed = subprocess.run(['awk', '-f', str(files / 'zgz-parse')], input=json.dumps({'outbounds':[node]}, indent=2), text=True, capture_output=True, check=True).stdout
    rows = parsed.splitlines()
    assert len(rows) == 1, parsed
    payload = json.loads(rows[0].split('\t')[5])
    payload['tag'] = 'proxy'
    result = subprocess.run(['ucode', str(files / 'zgz-sbconfig'), 'mode=test', *extra], input=json.dumps({'outbounds':[payload]}), text=True, capture_output=True, check=True)
    out = json.loads(result.stdout)
    return payload, next(n for n in out['outbounds'] + out.get('endpoints', []) if n['tag'] == 'proxy'), out

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

options = {'quic_sniff_decoy': {'mode':'detour','outbound_type':['masque','wireguard'],
                               'detour_type':['vless'],'send':'retry'},
           'mtu_align': {'mode':'clamp','except':['proxy']},
           'masque': {'idle_timeout':'2m'}, 'trusttunnel': {'idle_timeout':'5m'}}
plain['encryption']='none'
plain['tls']={'enabled':True,'server_name':'example.com'}
_, _, lx_config = convert(plain, ['lxcore=1', 'lx='+json.dumps(options)])
assert lx_config['lx'] == options
assert 'lx' not in convert(plain)[2]
for old, expected in [('detour','detour'), (True,'all'), (False,'off')]:
    assert convert(plain, ['lxcore=1','lx='+json.dumps({'quic_sniff_decoy':old})])[2]['lx']['quic_sniff_decoy']=={'mode':expected}
for invalid, extra in [({'awg_masquerade':'all'}, ['lxcore=1']),
                       ({'wg':{'idle_suspend':'1m'}}, ['lxcore=1']),
                       (options, ['lxcore=1','lxlegacy=1']),
                       ({'masque':{'idle_timeout':'2m'}}, ['lxcore=1','newmasque=1']),
                       (options, []), ([], ['lxcore=1'])]:
    try: convert(plain, extra+['lx='+json.dumps(invalid)])
    except subprocess.CalledProcessError: pass
    else: raise AssertionError('unsupported LX settings accepted')

endpoint={'type':'masque-client','tag':'new masque','server':'example.com','server_port':443,
          'profile':'standard','path':'/connect-ip','version':3,
          'tls':{'enabled':True,'server_name':'example.com'},'on_demand':True}
_, actual, new_config=convert(endpoint,['newmasque=1','certpin=1'])
assert actual['type']=='masque-client' and actual['on_demand'] is True
assert actual['path']=='/connect-ip' and actual in new_config['endpoints']
for candidate, extra in [(endpoint, []), (masque, ['newmasque=1'])]:
    try: convert(candidate,extra)
    except subprocess.CalledProcessError: pass
    else: raise AssertionError('incompatible MASQUE schema accepted')

for binary, config in [(os.environ.get('RIG_LX_STABLE'), lx_config), (os.environ.get('RIG_LX_NEW'), new_config)]:
    if binary:
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'config.json'
            path.write_text(json.dumps(config))
            subprocess.run([binary,'check','-c',str(path)],check=True)
print('LX root options, legacy decoy migration, router capability guards and MASQUE 1.15 endpoints passed')

trust={'type':'trusttunnel','tag':'native trust','server':'example.com','server_port':443,
       'username':'user','password':'secret','quic':True,'idle_timeout':'3m',
       'tls':{'enabled':True,'server_name':'example.com'}}
parsed=subprocess.run(['awk','-f',str(files/'zgz-parse')],input=json.dumps({'outbounds':[trust]},indent=2),text=True,capture_output=True,check=True).stdout
assert len(parsed.splitlines())==1
bridge=json.loads(parsed.strip().split('\t')[5])
assert bridge['native']==trust
with tempfile.TemporaryDirectory() as tmp:
    path=Path(tmp)/'bridge.json'; path.write_text(json.dumps(bridge))
    result=subprocess.run(['ucode',str(files/'zgz-sbconfig'),'mode=bridge','lxcore=1',
                           'bridge='+str(path),'lx='+json.dumps(options)],text=True,capture_output=True,check=True)
    config=json.loads(result.stdout)
    actual=config['outbounds'][0]
    assert actual['type']=='trusttunnel' and actual['idle_timeout']=='3m' and actual['tls']==trust['tls']
    assert config['lx']==options
    if os.environ.get('RIG_LX_STABLE'):
        # The standalone helper has tag out, so its exception must name that tag.
        config['lx']['mtu_align']['except']=['out']
        checked=Path(tmp)/'check.json'; checked.write_text(json.dumps(config))
        subprocess.run([os.environ['RIG_LX_STABLE'],'check','-c',str(checked)],check=True)
    inlet={'outbounds':[{'tag':'proxy','protocol':'socks','settings':{'servers':[{'address':'127.0.0.1','port':10808}]}}]}
    result=subprocess.run(['ucode',str(files/'zgz-sbconfig'),'mode=test','lxcore=1','bridge='+str(Path(tmp)/'bridge.json')],
                          input=json.dumps(inlet),text=True,capture_output=True,check=True)
    actual=next(o for o in json.loads(result.stdout)['outbounds'] if o['tag']=='proxy')
    assert actual['type']=='trusttunnel' and actual['idle_timeout']=='3m'
print('Native TrustTunnel import and helper configuration preserve TLS, QUIC and idle settings')

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
