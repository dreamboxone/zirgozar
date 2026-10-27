#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
"""Run the production updater against unified and legacy release fixtures."""
import hashlib
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'package/zirgozar/files/zgz-cores').read_text()
functions = 'self_fail() {' + source.split('self_fail() {', 1)[1].split('\ncmd_remove() {', 1)[0]

with tempfile.TemporaryDirectory(prefix='zgz-unified-update-') as directory:
    base = Path(directory)
    for manager in ('apk', 'opkg'):
        for layout in ('unified', 'legacy', 'missing-ui', 'bad-layout', 'bad-package'):
            work = base / f'{manager}-{layout}'
            release = work / 'release'
            release.mkdir(parents=True)
            run = work / 'run'
            run.mkdir()
            etc = work / 'etc'
            etc.mkdir()
            (etc / 'version').write_text('5.8.5-r1\n')
            (etc / 'settings').write_text('keep my configuration\n')
            main = ('zirgozar-5.8.5-r2.test.apk' if manager == 'apk'
                    else 'zirgozar_5.8.5-r2_test.ipk')
            ui = ('luci-app-zirgozar-5.8.5-r2.apk' if manager == 'apk'
                  else 'luci-app-zirgozar_5.8.5-r2_all.ipk')
            (release / main).write_bytes(b'unified application including UI')
            if layout != 'missing-ui':
                (release / ui).write_bytes(b'compatibility' if layout != 'legacy' else b'legacy UI')
            if layout in ('unified', 'bad-layout', 'bad-package'):
                (release / 'PACKAGE_LAYOUT').write_text('unified-v1\n')
            sums = ''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name + '\n'
                           for p in release.iterdir())
            (release / 'SHA256SUMS').write_text(sums)
            if layout == 'bad-layout':
                (release / 'PACKAGE_LAYOUT').write_text('unverified layout\n')
            if layout == 'bad-package':
                (release / main).write_bytes(b'corrupt package')
            script = work / 'run.sh'
            prelude = '''set -eu
log() { :; }
warn() { :; }
openwrt_arch() { echo test; }
latest_tag() { echo v5.8.5-r2; }
zgz_version() { cat "$ZGZ_ETC/version"; }
free_bytes() { echo 999999999; }
space_for() { return 0; }
download_checked() { cp "$RELEASE/${1##*/}" "$2"; }
curl() {
  destination=''
  while [ "$#" -gt 0 ]; do
    if [ "$1" = -o ]; then shift; destination="$1"; else url="$1"; fi
    shift
  done
  if [ -n "$destination" ]; then cp "$RELEASE/${url##*/}" "$destination";
  else cat "$RELEASE/${url##*/}"; fi
}
transaction() {
  printf '%s\\n' "$@" > "$WORK/transaction"
  echo 5.8.5-r2 > "$ZGZ_ETC/version"
}
'''
            if manager == 'apk':
                prelude += 'apk() { if [ "$1" = info ]; then echo dnsmasq-full; else transaction "$@"; fi; }\n'
            else:
                prelude += 'opkg() { if [ "$1" = list-installed ]; then echo dnsmasq-full; else transaction "$@"; fi; }\n'
            # No real services or persistent cache paths are touched by tests.
            safe = functions.replace('/etc/init.d/zirgozar', '/bin/true').replace(
                '/usr/libexec/zirgozar/.update-cache/', str(work / 'cache') + '/')
            script.write_text(prelude + safe + '\ninstall_self\n')
            env = dict(os.environ, WORK=str(work), RELEASE=str(release), SELF_DIR=str(work / 'download'),
                       SELF_REPO='test/repo', SELF_RESULT=str(run / 'result'), ZGZ_RUN=str(run),
                       ZGZ_ETC=str(etc), ZGZ_VERSION_FILE=str(etc / 'version'), ZGZ_LIB=str(work / 'no-delta'))
            result = subprocess.run(['sh', str(script)], env=env, capture_output=True, text=True, timeout=30)
            success = layout in ('unified', 'legacy')
            assert (result.returncode == 0) == success, (manager, layout, result.stdout, result.stderr)
            transaction = work / 'transaction'
            assert transaction.exists() == success, (manager, layout)
            if success:
                args = transaction.read_text()
                assert main in args
                assert (ui in args) == (layout == 'legacy')
                assert (run / 'result').read_text() == 'ok 5.8.5-r2\n'
            assert (etc / 'settings').read_text() == 'keep my configuration\n'
            print(f'PASS: {manager} {layout}, verified transaction and preserved settings')

print('All unified/legacy updater tests passed')
