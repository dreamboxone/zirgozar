#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
"""Check delayed RPC registration without restarting host services."""
from pathlib import Path
import os
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
sources = [
    ('release', (root / 'build/packages.inc.sh').read_text()),
    ('sdk', (root / 'package/zirgozar/Makefile').read_text()),
]
with tempfile.TemporaryDirectory(prefix='zgz-rpc-reload-') as directory:
    for name, source in sources:
        start = source.index('bounded 15 /etc/init.d/rpcd reload' if name == 'release' else '/etc/init.d/rpcd reload')
        end = source.index('# Always in the boot sequence', start)
        block = source[start:end]
        block = block.replace('\\$', '$') if name == 'release' else block.replace('$$', '$')
        # Both service commands are handled by a mock; no real init scripts run.
        block = block.replace('/etc/init.d/rpcd', 'rpc_service')
        for ready_after in (1, 3, 99):
            work = Path(directory) / f'{name}-{ready_after}'
            work.mkdir()
            script = '''set -eu
bounded() { shift; "$@"; }
rpc_service() { echo "$1" >> "$WORK/service"; }
sleep() { echo wait >> "$WORK/wait"; }
ubus() {
  n=$(cat "$WORK/count" 2>/dev/null || echo 0)
  n=$((n + 1)); echo "$n" > "$WORK/count"
  [ "$n" -lt "$READY_AFTER" ] || echo luci.zirgozar
}
''' + block
            subprocess.run(['sh', '-c', script], env=dict(os.environ, WORK=str(work), READY_AFTER=str(ready_after)), check=True)
            actions = (work / 'service').read_text().split()
            assert actions == (['reload', 'restart'] if ready_after == 99 else ['reload']), (name, ready_after, actions)
            if ready_after == 99:
                assert len((work / 'wait').read_text().splitlines()) == 5
print('RPC reload: immediate/delayed registration preserves sessions; bounded restart fallback works in both builders')
