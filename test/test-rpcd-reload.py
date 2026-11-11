#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
"""Exercise RPC execution checks and recovery without touching host services."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / 'package/zirgozar/files/zgz-rpc'
for source in ['build/packages.inc.sh', 'package/zirgozar/Makefile']:
    text = (ROOT / source).read_text()
    assert 'zgz-rpc ensure' in text
    assert '/etc/init.d/rpcd reload' not in text
    assert 'zgz-rpc' in next(line for line in text.splitlines() if line.startswith('ZGZ_SCRIPTS'))
if not shutil.which('ucode'):
    print('RPC packaging checks passed; runtime tests need ucode')
    raise SystemExit(0)

with tempfile.TemporaryDirectory(prefix='zgz-rpc-health-') as directory:
    work = Path(directory)
    for name in ['bin', 'lib', 'etc', 'run']:
        (work / name).mkdir()
    (work / 'lib/zgz-common.sh').write_text('bounded() { shift; "$@"; }\nwarn() { echo "$*" >&2; }\nsleep() { :; }\n')
    version = work / 'etc/version'
    version.write_text('5.8.20-r3\n')
    response = work / 'reply'
    response.write_text(json.dumps({'ok': True, 'version': '5.8.20-r3'}))
    acl = work / 'acl.json'
    acl.write_text('{}')
    backend = work / 'backend'
    backend.write_text('#!/bin/sh\necho \'{"health":{},"state":{}}\'\n')
    ubus = work / 'bin/ubus'
    ubus.write_text('''#!/bin/sh
case "$*" in
 *list*) echo luci.zirgozar; exit 0 ;;
esac
if [ -f "$WORK/transient" ]; then rm -f "$WORK/transient"; exit 1; fi
[ ! -f "$WORK/broken" ] || exit 1
cat "$WORK/reply"
''')
    service = work / 'service'
    service.write_text('''#!/bin/sh
echo "$*" >> "$WORK/service-calls"
[ ! -f "$WORK/no-repair" ] || exit 1
rm -f "$WORK/broken"
echo '{"ok":true,"version":"5.8.20-r3"}' > "$WORK/reply"
''')
    for executable in [backend, ubus, service]:
        executable.chmod(0o755)
    env = dict(os.environ, WORK=str(work), PATH=str(work / 'bin') + ':' + os.environ['PATH'],
               ZGZ_LIB=str(work / 'lib'), ZGZ_ETC=str(work / 'etc'), ZGZ_RUN=str(work / 'run'),
               ZGZ_RPC_SERVICE=str(service), ZGZ_RPC_BACKEND=str(backend), ZGZ_RPC_ACL=str(acl))

    def run(action, expected=0):
        result = subprocess.run(['sh', str(HELPER), action], env=env, capture_output=True, text=True, timeout=10)
        assert result.returncode == expected, (action, result.returncode, result.stdout, result.stderr)
        assert result.stdout == '', result.stdout
        return result

    def calls():
        path = work / 'service-calls'
        return path.read_text().splitlines() if path.exists() else []

    run('check')
    run('ensure')
    assert calls() == ['restart']
    run('ensure')
    assert calls() == ['restart'], 'healthy unchanged schema must preserve sessions without a reload'
    acl.write_text('{"changed":true}')
    run('ensure')
    assert calls() == ['restart'] * 2, 'changed ACL must be registered'
    # The registered object remains visible in this failure: list-only checks miss it.
    (work / 'broken').touch()
    run('check', 1)
    run('ensure')
    assert calls() == ['restart'] * 3
    for bad in ['{}', '{broken', '{"ok":true,"version":"old"}', '{"ok":false,"version":"5.8.20-r3"}']:
        response.write_text(bad)
        run('check', 1)
    response.write_text('{"ok":true,"version":"5.8.20-r3"}')
    (work / 'transient').touch()
    run('watch')
    assert len(calls()) == 3, 'one transient failure must not discard login sessions'
    (work / 'broken').touch()
    (work / 'run/rpc-restart').write_text(str(int(time.time()) - 601))
    run('watch')
    assert len(calls()) == 4
    (work / 'broken').touch()
    run('watch', 1)
    assert len(calls()) == 4, 'persistent failure must not cause a restart loop'
    (work / 'run/self-update-phase').write_text('installing')
    run('watch')
    assert len(calls()) == 4, 'watch must not interrupt an update'
    os.utime(work / 'run/self-update-phase', (time.time()-601, time.time()-601))
    (work / 'run/rpc-restart').write_text(str(int(time.time()) - 601))
    run('watch')
    assert len(calls()) == 5, 'an abandoned update marker must not disable recovery forever'
    (work / 'run/self-update-phase').unlink()
    (work / 'broken').touch()
    (work / 'no-repair').touch()
    old_stamp = (work / 'run/rpc-schema').read_text()
    run('ensure', 1)
    assert (work / 'run/rpc-schema').read_text() == old_stamp
    assert not (work / 'run/rpc-recovery.lock').exists()
    assert set(calls()) == {'restart'}, 'recovery must not reload rpcd or touch tunnel services'
print('RPC health: visible-but-broken objects, schema/ACL changes, malformed replies, session preservation, retry, cooldown and update protection passed')
