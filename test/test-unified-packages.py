#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
"""Check real package-manager ownership transfer in isolated install roots."""
import argparse
import io
from pathlib import Path
import subprocess
import tarfile
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--apk', required=True)
parser.add_argument('--opkg')
parser.add_argument('--arch', required=True)
parser.add_argument('--dist', required=True)
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[1]
DIST = Path(args.dist).resolve()
version = (ROOT / 'build/packages.inc.sh').read_text().split('VERSION=', 1)[1].splitlines()[0]
revision = (ROOT / 'build/packages.inc.sh').read_text().split('RELEASE=', 1)[1].splitlines()[0]
version += '-r' + revision
ui = 'www/luci-static/resources/zirgozar/i18n.js'

def command(*values):
    result = subprocess.run([str(v) for v in values], capture_output=True, text=True, timeout=120)
    assert result.returncode == 0, (values, result.stdout, result.stderr)
    return result.stdout

def tar_bytes(files):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w:gz') as archive:
        directories = set()
        for name in files:
            directories.update(str(p) for p in Path(name).parents if str(p) != '.')
        for name in sorted(directories):
            info = tarfile.TarInfo('./' + name + '/')
            info.type = tarfile.DIRTYPE
            info.mode = 0o755
            archive.addfile(info)
        for name, content in files.items():
            info = tarfile.TarInfo('./' + name)
            info.size = len(content)
            info.mode = 0o644
            archive.addfile(info, io.BytesIO(content))
    return output.getvalue()

with tempfile.TemporaryDirectory(prefix='zgz-unified-managers-') as directory:
    work = Path(directory)
    def old_package(name, manager, package_version='1-r1'):
        files = {'etc/config/zirgozar': b'original settings\n'} if name == 'zirgozar' else {ui: b'old interface\n'}
        if package_version != '1-r1':
            files[ui] = (ROOT / 'package/luci-app-zirgozar/root' / ui).read_bytes()
        path = work / f'{name}-{package_version}.{manager}'
        if manager == 'apk':
            stage = work / (name + '-stage')
            for filename, content in files.items():
                target = stage / filename
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content)
            command(args.apk, 'mkpkg', '--info', 'name:' + name, '--info', 'version:' + package_version,
                    '--info', 'arch:' + args.arch, '--files', stage, '--output', path)
        else:
            control = f'Package: {name}\nVersion: {package_version}\nArchitecture: {args.arch}\nDescription: migration fixture\n'
            controls = {'control': control.encode()}
            if name == 'zirgozar':
                controls['conffiles'] = b'/etc/config/zirgozar\n'
            path.write_bytes(tar_bytes({'debian-binary': b'2.0\n', 'data.tar.gz': tar_bytes(files),
                                       'control.tar.gz': tar_bytes(controls)}))
        return path

    # All dependencies are supplied by a local test-only package; no feeds or
    # host services are used. Actual archive scripts are deliberately disabled.
    deps = (ROOT / 'build/packages.inc.sh').read_text().split('ZGZ_DEPS="', 1)[1].split('"', 1)[0]
    empty = work / 'empty'
    empty.mkdir()
    dependency = work / 'dependencies.apk'
    command(args.apk, 'mkpkg', '--info', 'name:zgz-test-dependencies', '--info', 'version:1-r1',
            '--info', 'arch:' + args.arch, '--info', 'provides:' + deps, '--files', empty, '--output', dependency)
    main_apk = DIST / f'zirgozar-{version}.apk'
    compat_apk = DIST / f'luci-app-zirgozar-{version}.apk'
    assert 1024 <= compat_apk.stat().st_size < 32768, 'Old downloaders require at least 1024 bytes'
    prefix = [args.apk, '--root', work / 'apk-root', '--arch', args.arch, '--allow-untrusted',
              '--no-scripts', '--no-network']
    command(*prefix, '--initdb', 'add', dependency, old_package('zirgozar', 'apk'),
            old_package('luci-app-zirgozar', 'apk'))
    config = work / 'apk-root/etc/config/zirgozar'
    config.write_text('user settings preserved\n')
    command(*prefix, 'add', '--upgrade', main_apk)
    assert (work / 'apk-root' / ui).read_bytes() == (ROOT / 'package/luci-app-zirgozar/root' / ui).read_bytes()
    command(*prefix, 'add', '--upgrade', compat_apk)
    assert config.read_text() == 'user settings preserved\n'
    assert (work / 'apk-root' / ui).read_bytes() == (ROOT / 'package/luci-app-zirgozar/root' / ui).read_bytes()
    command(*prefix, 'add', '--upgrade', old_package('zirgozar', 'apk', '9999-r1'))
    command(*prefix, 'del', 'luci-app-zirgozar')
    assert (work / 'apk-root' / ui).exists(), 'Removing compatibility package must not remove UI'
    print('PASS: real apk split-to-unified upgrade, settings and ownership after shim removal')
    print('PASS: compatibility package does not pin or block a later main-only upgrade')
    fresh = [args.apk, '--root', work / 'apk-fresh', '--arch', args.arch, '--allow-untrusted',
             '--no-scripts', '--no-network']
    command(*fresh, '--initdb', 'add', dependency, main_apk)
    assert (work / 'apk-fresh' / ui).exists()
    print('PASS: real apk fresh installation needs only the main application package')

    with tarfile.open(DIST / f'zirgozar_{version}_{args.arch}.ipk', 'r:gz') as outer:
        with tarfile.open(fileobj=io.BytesIO(outer.extractfile('./control.tar.gz').read()), mode='r:gz') as controls:
            assert b'Replaces: luci-app-zirgozar' in controls.extractfile('./control').read()
        with tarfile.open(fileobj=io.BytesIO(outer.extractfile('./data.tar.gz').read()), mode='r:gz') as payload:
            assert payload.extractfile('./' + ui).read() == (ROOT / 'package/luci-app-zirgozar/root' / ui).read_bytes()
    print('PASS: IPK contains complete UI and replacement metadata')
    if args.opkg:
        opkg_root = work / 'opkg-root'
        opkg_root.mkdir()
        (opkg_root / 'var/lock').mkdir(parents=True)
        config_file = work / 'opkg.conf'
        config_file.write_text(f'dest root /\narch all 1\narch {args.arch} 100\n')
        dependency_ipk = work / 'dependencies.ipk'
        control = ('Package: zgz-test-dependencies\nVersion: 1-r1\nArchitecture: all\n'
                   'Description: isolated dependency fixture\nProvides: ' + ', '.join(deps.split()) + '\n')
        dependency_ipk.write_bytes(tar_bytes({'debian-binary': b'2.0\n', 'data.tar.gz': tar_bytes({}),
                                            'control.tar.gz': tar_bytes({'control': control.encode()})}))
        opkg = [args.opkg, '--offline-root', opkg_root, '--conf', config_file]
        command(*opkg, 'install', dependency_ipk)
        output = command(*opkg, 'install', old_package('zirgozar', 'ipk'), old_package('luci-app-zirgozar', 'ipk'))
        config = opkg_root / 'etc/config/zirgozar'
        assert config.exists(), (output, [str(p.relative_to(opkg_root)) for p in opkg_root.rglob('*')])
        config.write_text('user settings preserved\n')
        output = command(*opkg, 'install', DIST / f'zirgozar_{version}_{args.arch}.ipk')
        assert (opkg_root / ui).read_bytes() == (ROOT / 'package/luci-app-zirgozar/root' / ui).read_bytes(), output
        command(*opkg, 'install', DIST / f'luci-app-zirgozar_{version}_all.ipk')
        assert config.read_text() == 'user settings preserved\n'
        command(*opkg, 'install', old_package('zirgozar', 'ipk', '9999-r1'))
        command(*opkg, 'remove', 'luci-app-zirgozar')
        assert (opkg_root / ui).read_bytes() == (ROOT / 'package/luci-app-zirgozar/root' / ui).read_bytes()
        print('PASS: real opkg split-to-unified upgrade, settings and ownership after shim removal')
