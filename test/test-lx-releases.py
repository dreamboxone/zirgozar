# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
source = (root / 'package/zirgozar/files/zgz-cores').read_text()
def function(name):
    start = source.index(name + '() {')
    return source[start:source.index('\n}', start) + 2]

releases = [
    {'tag_name': 'v1.14.3-lx.24-rc.1', 'prerelease': True},
    {'tag_name': 'v1.14.3-lx.23', 'prerelease': False},
    {'tag_name': 'v1.14.3;touch /tmp/bad', 'prerelease': True},
]
script = '''
XRAY_REPO=XTLS/Xray-core
curl() { case "$*" in *repos/Leadaxe/sing-box-lx/releases?per_page=10*) : ;; *) return 1 ;; esac; cat <<'JSON'
''' + json.dumps(releases) + '\nJSON\n}\n' + function('xray_releases') + '\nxray_releases Leadaxe/sing-box-lx\n'
r = subprocess.run(['sh', '-c', script], text=True, capture_output=True, check=True)
assert r.stdout.splitlines() == ['v1.14.3-lx.24-rc.1 pre', 'v1.14.3-lx.23 stable'], r.stdout

script = '''
LX_REPO=Leadaxe/sing-box-lx
singbox_lx_path() { echo /tmp/unused-core; }
asset_for() { echo amd64; }
latest_tag() { echo v1.14.3-lx.23; }
remote_size() { printf '%s\\n' "$1"; }
need_room() { return 1; }
''' + function('install_singbox')
for tag, expected in [('', 'v1.14.3-lx.23'), ('v1.14.3-lx.24-rc.1', 'v1.14.3-lx.24-rc.1')]:
    # remote_size runs in command substitution, so record its URL on stderr.
    r = subprocess.run(['sh', '-c', script.replace('printf \'%s\\n\' "$1";', 'printf \'%s\\n\' "$1" >&2; echo 0;') + '\ninstall_singbox sing-box-lx "$1"', 'sh', tag], text=True, capture_output=True)
    assert f'/download/{expected}/sing-box-{expected[1:]}-linux-amd64.tar.gz' in r.stderr, r.stderr
for tag in ['v1;echo bad', 'v1/../../bad', 'v1$(id)', 'latest', 'v1\nwhoami']:
    r = subprocess.run(['sh', '-c', script + '\ninstall_singbox sing-box-lx "$1"', 'sh', tag], text=True, capture_output=True)
    assert r.returncode != 0 and not r.stdout and not r.stderr, (tag, r)
print('LX releases: upstream list, prerelease flag, safe tags, stable default and exact archive selection passed')
