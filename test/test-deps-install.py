"""Exercise installer outcomes without touching the host package manager."""
import os
import re
from pathlib import Path
import subprocess
import tempfile

source = Path(__file__).resolve().parents[1] / 'package/zirgozar/files/zgz-deps'
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / 'zgz-common.sh').write_text('''
ZGZ_RUN="$TEST_ROOT"
ZGZ_MESSAGE="$ZGZ_RUN/message"
clear_message() { rm -f "$ZGZ_MESSAGE"; }
say_message() { echo "$*" > "$ZGZ_MESSAGE"; }
log() { :; }
warn() { :; }
forget_caps() { :; }
firewall_backend() { echo none; }
bounded() { shift; "$@"; }
''')
    common = source.with_name('zgz-common.sh').read_text()
    helpers = '\n'.join(re.search(r'^' + name + r'\(\) \{[\s\S]*?^\}', common, re.M).group(0)
                        for name in ['pkg_lock', 'pkg_unlock', 'pkg_failure', 'pkg_refresh'])
    with (root / 'zgz-common.sh').open('a') as stream:
        stream.write('\n' + helpers + '\n')
    (root / 'uci').write_text('#!/bin/sh\nexit 0\n')
    (root / 'opkg').write_text('''#!/bin/sh
case "$1" in
list-installed) [ ! -f "$TEST_ROOT/installed-$2" ] || echo "$2 - 1"; exit 0 ;;
update) echo 'index diagnostic'; [ "$SCENARIO" != index ] ;;
install) echo "package diagnostic: $2"; [ "$SCENARIO" != package ] || exit 1; touch "$TEST_ROOT/installed-$2" ;;
esac
''')
    for name in ['uci', 'opkg']:
        (root / name).chmod(0o755)
    env = dict(os.environ, ZGZ_LIB=tmp, TEST_ROOT=tmp, PATH=tmp + ':' + os.environ['PATH'])
    for scenario in ['ok', 'index', 'package']:
        for installed_file in root.glob('installed-*'):
            installed_file.unlink()
        (root / 'deps.json').write_text('{}')
        proc = subprocess.run(['sh', str(source), 'install'], env=dict(env, SCENARIO=scenario))
        result = (root / 'deps-result').read_text()
        assert (proc.returncode == 0) == (scenario == 'ok'), (scenario, proc.returncode)
        assert result.startswith('ok' if scenario == 'ok' else 'error '), result
        assert not (root / 'deps.json').exists()
        log = (root / 'deps-install.log').read_text()
        assert 'index diagnostic' in log
        if scenario != 'index':
            assert 'package diagnostic: curl' in log
    print('Dependency installer: success, index failure, package failure and log retention passed')
