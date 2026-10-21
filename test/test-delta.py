#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
"""Exercise binary reconstruction, verification and fallback without the network."""
import hashlib
import gzip
import io
import importlib.util
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import sys
import tempfile
import tarfile
import zlib

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('package_chunks', ROOT / 'build/package-chunks.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
if not shutil.which('ucode'):
    raise SystemExit('ucode is required for differential-update tests')

with tempfile.TemporaryDirectory(prefix='zgz-delta-test-') as directory:
    base = Path(directory)
    release = base / 'release'
    release.mkdir()
    cache = base / 'cache'
    cache.mkdir()
    binaries = base / 'bin'
    binaries.mkdir()
    lib = base / 'lib'
    lib.mkdir()
    for name in ('zgz-delta', 'zgz-delta-plan'):
        shutil.copyfile(ROOT / 'package/zirgozar/files' / name, lib / name)
        (lib / name).chmod(0o755)
    old = random.Random(123).randbytes(4 * 1024 * 1024)
    target = old[:1500000] + b'Updated CSS and scripts\0\xff' * 100 + old[1500100:]
    # Normal compression can change the whole byte stream after a tiny edit.
    # Release compression must preserve content and make real packages reusable.
    normalized = []
    for name, content in [('before.apk', old), ('after.apk', target)]:
        path = base / name
        compressor = zlib.compressobj(6, zlib.DEFLATED, -15)
        path.write_bytes(b'ADBd' + compressor.compress(content) + compressor.flush())
        builder.normalize(path)
        assert zlib.decompress(path.read_bytes()[4:], -15) == content
        normalized.append(builder.index(path))
    old_hashes = {c[2] for c in normalized[0]['chunks']}
    reusable = sum(c[1] for c in normalized[1]['chunks'] if c[2] in old_hashes)
    assert reusable > len(old) * 0.75
    print('PASS: standard APK deflate content is unchanged and ranges remain reusable')

    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode='w') as tar:
        for name, content in [('debian-binary', b'2.0\n'), ('data.tar.gz', gzip.compress(old)),
                              ('control.tar.gz', gzip.compress(b'package metadata'))]:
            info = tarfile.TarInfo(name); info.size = len(content)
            tar.addfile(info, io.BytesIO(content))
    ipk = base / 'sample.ipk'
    ipk.write_bytes(gzip.compress(raw.getvalue()))
    builder.normalize(ipk)
    with tarfile.open(ipk, mode='r:gz') as tar:
        assert gzip.decompress(tar.extractfile('data.tar.gz').read()) == old
        assert gzip.decompress(tar.extractfile('control.tar.gz').read()) == b'package metadata'
    print('PASS: standard IPK members and installation data are preserved')
    archive = release / 'zirgozar-5.7.30-r1.test.apk'
    archive.write_bytes(target)
    manifest = builder.index(archive)
    assert b''.join(target[start:start + length] for start, length, _ in manifest['chunks']) == target
    assert all(hashlib.sha256(target[start:start + length]).hexdigest() == sha
               for start, length, sha in manifest['chunks'])
    index = archive.with_name(archive.name + '.chunks.json')
    index.write_text(json.dumps(manifest))
    previous = base / 'old.apk'
    previous.write_bytes(old)
    old_index = builder.index(previous)
    shutil.copyfile(previous, cache / 'main.package')
    (cache / 'main.json').write_text(json.dumps(old_index))
    requests = base / 'requests.jsonl'
    fake_curl = binaries / 'curl'
    fake_curl.write_text('''#!/usr/bin/env python3
import json, os, pathlib, sys
args=sys.argv[1:]
name=args[-1].split('/')[-1]
data=(pathlib.Path(os.environ['DELTA_RELEASE'])/name).read_bytes()
span=args[args.index('--range')+1] if '--range' in args else None
with open(os.environ['DELTA_REQUESTS'],'a') as out: out.write(json.dumps([name,span])+'\\n')
status=200
if span and os.environ.get('DELTA_IGNORE_RANGE')!='1':
    start,end=map(int,span.split('-')); data=data[start:end+1]; status=206
if span and os.environ.get('DELTA_CORRUPT_RANGE')=='1': data=b'broken'
pathlib.Path(args[args.index('-o')+1]).write_bytes(data)
if '-w' in args: print(status,end='')
''')
    fake_curl.chmod(0o755)
    destination = base / 'download.apk'
    sums = base / 'SHA256SUMS'

    def checksums():
        sums.write_text(f"{hashlib.sha256(index.read_bytes()).hexdigest()}  {index.name}\n"
                        f"{manifest['sha256']}  {archive.name}\n")

    checksums()
    env = dict(os.environ, PATH=str(binaries) + ':' + os.environ['PATH'],
               ZGZ_LIB=str(lib), ZGZ_DELTA_CACHE=str(cache),
               DELTA_RELEASE=str(release), DELTA_REQUESTS=str(requests))
    url = 'https://github.com/dreamboxone/zirgozar/releases/download/v5.7.30-r1/' + archive.name

    def run(mode='fetch', **extra):
        result = subprocess.run(['sh', str(lib / 'zgz-delta'), mode, url, str(destination),
                                 manifest['sha256'], str(sums), 'main'],
                                env=dict(env, **extra), capture_output=True, text=True, timeout=30)
        return result

    result = run()
    assert result.returncode == 0, result.stderr
    assert destination.read_bytes() == target
    ranges = [request[1] for request in map(json.loads, requests.read_text().splitlines()) if request[1]]
    transferred = sum(int(span.split('-')[1]) - int(span.split('-')[0]) + 1 for span in ranges)
    assert 0 < transferred < len(target) // 2
    print(f'PASS: exact binary reconstruction; downloaded {transferred}/{len(target)} package bytes')

    destination.unlink()
    assert run(DELTA_IGNORE_RANGE='1').returncode == 0
    assert destination.read_bytes() == target
    print('PASS: CDN ignoring Range is accepted only as a verified full package')
    destination.unlink()
    assert run(DELTA_CORRUPT_RANGE='1').returncode != 0
    assert not destination.exists()
    print('PASS: truncated/corrupt downloads leave the destination untouched')

    cached = cache / 'main.package'
    cached.write_bytes(b'\0' * len(old))
    assert run().returncode != 0
    assert not destination.exists()
    cached.write_bytes(old)
    print('PASS: corrupt local cache cannot produce an installable result')

    good = index.read_bytes()
    bad = dict(manifest, chunks=[[-1, 10, '0' * 64]])
    index.write_text(json.dumps(bad)); checksums()
    assert run().returncode != 0
    index.write_bytes(good)
    sums.write_text('0' * 64 + '  ' + index.name + '\n')
    assert run().returncode != 0
    checksums()
    print('PASS: invalid ranges and unverified manifests are rejected')

    (cache / 'main.json').unlink()
    assert run().returncode == 2
    print('PASS: missing baseline signals full-download fallback')
    destination.write_bytes(target)
    assert run('seed').returncode == 0
    assert (cache / 'main.package').read_bytes() == target
    destination.unlink()
    assert run().returncode == 0
    assert destination.read_bytes() == target
    print('PASS: a verified full download seeds the next update and survives a new process')

    df = binaries / 'df'
    df.write_text('#!/bin/sh\nprintf "Filesystem 1024-blocks Used Available Capacity Mounted\\nfull 1 1 0 100%% /\\n"\n')
    df.chmod(0o755)
    assert run('seed').returncode == 2
    assert (cache / 'main.package').read_bytes() == target
    df.unlink()
    print('PASS: low storage skips caching without replacing its previous contents')

    # Exercise the production updater's fallback too, not just the helper.
    updater = (ROOT / 'package/zirgozar/files/zgz-cores').read_text()
    functions = updater.split('self_download_package() {', 1)[1].split('\ninstall_self() {', 1)[0]
    functions = 'self_download_package() {' + functions
    download_dir = base / 'updater'
    download_dir.mkdir()
    shutil.copyfile(sums, download_dir / 'SHA256SUMS')
    runner = base / 'updater-test.sh'
    runner.write_text('''#!/bin/sh
set -eu
log() { :; }
download_checked() { echo FULL_DOWNLOAD; cp "$DELTA_RELEASE/${1##*/}" "$2"; }
''' + functions + '\nself_download_package "$1" main\n')
    updater_env = dict(env, SELF_DIR=str(download_dir))
    result = subprocess.run(['sh', str(runner), url], env=updater_env,
                            capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    assert 'FULL_DOWNLOAD' not in result.stdout
    assert (download_dir / archive.name).read_bytes() == target
    (cache / 'main.json').unlink()
    result = subprocess.run(['sh', str(runner), url], env=updater_env,
                            capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    assert result.stdout.count('FULL_DOWNLOAD') == 1
    assert (download_dir / archive.name).read_bytes() == target
    archive.write_bytes(b'invalid full package')
    result = subprocess.run(['sh', str(runner), url], env=updater_env,
                            capture_output=True, text=True, timeout=30)
    assert result.returncode != 0
    print('PASS: production updater reuses ranges, falls back once and rejects a bad full download')

print('All differential-update tests passed')
