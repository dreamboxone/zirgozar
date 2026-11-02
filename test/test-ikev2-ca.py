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

    def load(custom=None):
        account = dict(node)
        if custom is not None:
            account['ca'] = base64.b64encode(custom).decode()
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
    bundle.unlink()
    assert len(json.loads(load(chain.encode()).stdout)) == 2
    assert load().returncode != 0

print('IKEv2 PEM chain, DER, system roots and missing bundle checks passed')
