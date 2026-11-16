# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
import base64
import json
from pathlib import Path
import subprocess
import tempfile

source = (Path(__file__).resolve().parents[1] / 'package/zirgozar/files/zgz-ikev2config').read_text()
# Run the production CA loading path without opening VICI or starting IPsec.
source = source[:source.index("if (mode == 'check') exit(0);")]
source = source.replace("import * as socket from 'socket';", '')

def pem(value):
    return '-----BEGIN CERTIFICATE-----\n' + value + '\n-----END CERTIFICATE-----\n'

with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    bundle, nodefile, script = root / 'roots.pem', root / 'node.json', root / 'test.uc'
    bundle.write_text(pem('U1lTVEVN'))
    script.write_text(source.replace('/etc/ssl/certs/ca-certificates.crt', str(bundle)) + '\nprintf("%J", cacerts);\n')
    node = dict(type='ikev2', server='vpn.example.com', port=500, mtu=1400,
                username='test', password='test-password')

    def load(custom=None, unpadded=False):
        account = dict(node)
        if custom is not None:
            account['ca'] = (base64.urlsafe_b64encode(custom).decode().rstrip('=')
                             if unpadded else base64.b64encode(custom).decode())
        nodefile.write_text(json.dumps(account))
        return subprocess.run(['ucode', str(script), 'check', str(nodefile), 'zgzikev2t'],
                              text=True, capture_output=True)

    chain = pem('SU5URVJNRURJQVRF') + pem('Q1JPU1NTSUdORUQ=')
    result = load(chain.encode())
    assert result.returncode == 0, result.stderr
    certs = json.loads(result.stdout)
    assert len(certs) == 3, certs
    assert all(c.count('-----BEGIN CERTIFICATE-----') == 1 for c in certs)
    assert 'SU5URVJNRURJQVRF' in certs[0] and 'Q1JPU1NTSUdORUQ=' in certs[1]
    assert 'U1lTVEVN' in certs[2]
    assert len(json.loads(load().stdout)) == 1
    assert json.loads(load(b'0test-DER').stdout)[0] == '0test-DER'
    for custom in (pem('TQ==').encode(), pem('TQ==').replace('\n', '\r\n').encode()):
        result = load(custom, unpadded=True)
        assert result.returncode == 0, result.stderr
        assert len(json.loads(result.stdout)) == 2
    for custom in (b'0test-DER?', b'0test-DER?!'):
        result = load(custom, unpadded=True)
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout)[0].encode() == custom
    bundle.unlink()
    assert len(json.loads(load(chain.encode()).stdout)) == 2
    assert load().returncode != 0

print('IKEv2 PEM chain, DER, system roots and missing bundle checks passed')

identity_source = (Path(__file__).resolve().parents[1] / 'package/zirgozar/files/zgz-ikev2config').read_text()
identity_source = identity_source[identity_source.index('let numeric_server ='):identity_source.index('let local =')]
for server, explicit, psk, expected in [
    ('192.0.2.1', '', '', '%any'),
    ('192.0.2.1', 'vpn.example.com', '', 'vpn.example.com'),
    ('vpn.example.com', '', '', 'vpn.example.com'),
    ('vpn.example.com', '', 'shared-key', '%any'),
    ('192.0.2.1', 'provider-id', 'shared-key', 'provider-id'),
]:
    program = 'let node = ' + json.dumps(dict(server=server, remote_id=explicit)) + ';\n'
    program += 'let psk = ' + json.dumps(psk) + ';\n' + identity_source + 'print(remote_id);'
    actual = subprocess.run(['ucode', '-e', program], text=True, capture_output=True, check=True)
    assert actual.stdout == expected, (server, explicit, actual.stdout)

print('IKEv2 IP, domain, explicit identity and PSK identity checks passed')

# Missing issuers are available offline, but are not trust anchors in the
# connection. Exercise the complete load path and inspect its VICI requests.
production = (Path(__file__).resolve().parents[1] / 'package/zirgozar/files/zgz-ikev2config').read_text()
production = production.replace("import * as socket from 'socket';", '')
start = production.index('function request(')
end = production.index("if (mode == 'stop')", start)
production = production[:start] + '''function request(command, data, optional) {
    printf('%J\\n', { command, data });
    return true;
}
''' + production[end:]
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    roots = root / 'roots.pem'
    roots.write_text(pem('U1lTVEVN'))
    issuers = root / 'issuers'
    issuers.mkdir()
    (issuers / 'issuer.pem').write_text(pem('SVNTVUVS'))
    script = root / 'load.uc'
    script.write_text(production.replace('/etc/ssl/certs/ca-certificates.crt', str(roots))
                      .replace('/usr/share/zirgozar/ikev2-intermediates/*.pem', str(issuers / '*.pem')))
    nodefile = root / 'node.json'

    def requests(account, mode='load'):
        nodefile.write_text(json.dumps(account))
        result = subprocess.run(['ucode', str(script), mode, str(nodefile),
                                 'zgzikev2t', '192.0.2.1', '192.0.2.2'],
                                text=True, capture_output=True, check=True)
        return [json.loads(line) for line in result.stdout.splitlines()]

    account = dict(type='ikev2', server='192.0.2.1', port=500, mtu=1400,
                   username='test', password='test-password')
    calls = requests(account)
    loaded = [r['data'] for r in calls if r['command'] == 'load-cert']
    assert loaded == [dict(type='X509', flag='CA', data=pem('SVNTVUVS'))], loaded
    conn = next(r['data'] for r in calls if r['command'] == 'load-conn')
    remote = conn['zirgozar-zgzikev2t']['remote']
    assert remote['cacerts'] == [pem('U1lTVEVN')], remote
    assert remote['id'] == '%any'
    assert not any(r['command'] == 'load-cert' for r in requests(account | {'psk': 'test-key'}))
    assert not any(r['command'] == 'load-cert' for r in requests(account, 'stop'))
    (issuers / 'issuer.pem').unlink()
    assert not any(r['command'] == 'load-cert' for r in requests(account))

print('IKEv2 offline issuer loading, root constraints, PSK and cleanup checks passed')
