#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
"""Verify the offline issuer collection without contacting CA websites."""
import hashlib
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / 'package/zirgozar/files/ikev2-intermediates'
certificates = sorted(DIRECTORY.glob('*.pem'))
manifest = dict(re.findall(r'\| `([^`]+\.pem)` \| .*? \| `([0-9a-f]{64})` \|',
                           (DIRECTORY / 'README.md').read_text()))
assert {p.name for p in certificates} == set(manifest)
assert len(certificates) == 19


def command(*args):
    result = subprocess.run(args, text=True, capture_output=True)
    assert result.returncode == 0, (args, result.stdout, result.stderr)
    return result.stdout


with tempfile.TemporaryDirectory() as directory:
    bundle = Path(directory) / 'issuers.pem'
    bundle.write_bytes(b'\n'.join(p.read_bytes() for p in certificates))
    for path in certificates:
        assert hashlib.sha256(path.read_bytes()).hexdigest() == manifest[path.name], path
        info = command('openssl', 'x509', '-in', str(path), '-noout',
                       '-subject', '-issuer', '-ext', 'basicConstraints')
        lines = info.splitlines()
        assert lines[0].removeprefix('subject=') != lines[1].removeprefix('issuer='), info
        assert 'CA:TRUE' in info, info
        # Intermediates are chain material, never substitutes for system roots.
        command('openssl', 'verify', '-CAfile', '/etc/ssl/certs/ca-certificates.crt',
                '-untrusted', str(bundle), str(path))

    # Exercise the staging function shared by APK and IPK releases.
    work = Path(directory) / 'stage'
    command('sh', '-c', '. "$1/build/packages.inc.sh"; stage_zgz "$2" "$1" /bin/true',
            'stage', str(ROOT), str(work))
    installed = work / 'zirgozar/usr/share/zirgozar/ikev2-intermediates'
    assert {p.name for p in installed.glob('*.pem')} == set(manifest)
    for path in certificates:
        assert (installed / path.name).read_bytes() == path.read_bytes()
    makefile = (ROOT / 'package/zirgozar/Makefile').read_text()
    assert './files/ikev2-intermediates/*.pem' in makefile

print('Offline issuer hashes, CA constraints, chains and package staging passed')
