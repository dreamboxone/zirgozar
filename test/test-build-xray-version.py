#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
"""Verify release discovery and stale-prebuilt replacement without the network."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='zgz-xray-version-') as directory:
    work = Path(directory)
    (work / 'bin').mkdir()
    (work / 'build').mkdir()
    resolver = work / 'build/xray-version.sh'
    shutil.copyfile(ROOT / 'build/xray-version.sh', resolver)
    curl = work / 'bin/curl'
    curl.write_text('''#!/bin/sh
echo "$*" >> "$CALLS"
case "$*" in
  *url_effective*) [ "$REDIRECT_OK" = 1 ] || exit 22
    printf '%s' "https://github.com/XTLS/Xray-core/releases/tag/$TEST_TAG" ;;
  *) [ "$API_OK" = 1 ] || exit 22
    printf '{"tag_name":"%s"}\\n' "$TEST_TAG" ;;
esac
''')
    curl.chmod(0o755)
    calls = work / 'calls'
    env = dict(os.environ, PATH=str(work / 'bin') + ':' + os.environ['PATH'],
               CALLS=str(calls), REDIRECT_OK='1', API_OK='1', TEST_TAG='v99.12.31')
    env.pop('XRAY_VERSION', None)

    def resolve(**overrides):
        return subprocess.run(['sh', str(resolver)], env=dict(env, **overrides),
                              capture_output=True, text=True, timeout=10)

    result = resolve()
    assert result.returncode == 0 and result.stdout.strip() == 'v99.12.31'
    assert len(calls.read_text().splitlines()) == 1
    result = resolve(TEST_TAG='v99.12.32')
    assert result.returncode == 0 and result.stdout.strip() == 'v99.12.32'
    print('PASS: default follows the published release without a source edit')
    result = resolve(REDIRECT_OK='0')
    assert result.returncode == 0 and result.stdout.strip() == 'v99.12.31'
    print('PASS: API fallback resolves the same release')
    calls.unlink()
    result = resolve(XRAY_VERSION='v26.9.9', REDIRECT_OK='0', API_OK='0')
    assert result.returncode == 0 and result.stdout.strip() == 'v26.9.9'
    assert not calls.exists()
    print('PASS: explicit version override is reproducible and needs no discovery')
    for overrides in ({'REDIRECT_OK': '0', 'API_OK': '0'}, {'TEST_TAG': 'not-a-release'},
                      {'XRAY_VERSION': '../../invalid'}, {'XRAY_VERSION': 'v1.2.3\nextra'}):
        assert resolve(**overrides).returncode != 0
    print('PASS: discovery failures and invalid tags cannot silently use an old default')

    core_build = work / 'build/build-core.sh'
    core_build.write_text('''#!/bin/sh
set -eu
root="$(cd "$(dirname "$0")/.." && pwd)"
echo "$XRAY_VERSION $1" >> "$root/rebuilt"
mkdir -p "$root/prebuilt/$1"
echo binary > "$root/prebuilt/$1/xray"
echo "$XRAY_VERSION" > "$root/prebuilt/$1/xray-version.txt"
''')
    staged = work / 'prebuilt/test'
    staged.mkdir(parents=True)
    (staged / 'xray').write_text('old binary')
    (staged / 'xray-version.txt').write_text('v26.9.9\n')
    command = '. "$1"; ensure_xray "$2" test'
    for _ in range(2):
        result = subprocess.run(['sh', '-c', command, 'test', str(ROOT / 'build/packages.inc.sh'), str(work)],
                                env=env, capture_output=True, text=True, timeout=10)
        assert result.returncode == 0, result.stderr
    assert (staged / 'xray-version.txt').read_text().strip() == env['TEST_TAG']
    assert (work / 'rebuilt').read_text().splitlines() == ['v99.12.31 test']
    print('PASS: stale local core is rebuilt once; the matching resolved core is reused')
    failed_env = dict(env, REDIRECT_OK='0', API_OK='0')
    before = (staged / 'xray').read_bytes()
    result = subprocess.run(['sh', '-c', command, 'test', str(ROOT / 'build/packages.inc.sh'), str(work)],
                            env=failed_env, capture_output=True, text=True, timeout=10)
    assert result.returncode != 0 and (staged / 'xray').read_bytes() == before
    print('PASS: failed discovery aborts packaging without replacing the cached binary')
