#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar
"""Optional online ECH test: python3 test/test-ech-live.py CORE GENERATED_CONFIG."""
import json
import pathlib
import socket
import subprocess
import sys
import tempfile
import time

core, generated = sys.argv[1:]
config = json.loads(pathlib.Path(generated).read_text())
tls = dict(config['outbounds'][0]['streamSettings']['tlsSettings'])
tls.update(serverName='cloudflare-ech.com', fingerprint='chrome', alpn=['http/1.1'])
helpers = [o for o in config['outbounds'] if o.get('tag') == 'tls-repack-dns']
assert len(helpers) == 1, 'generated configuration must include one ECH helper'
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
config = {
    'log': {'loglevel': 'info'},
    'inbounds': [{'listen': '127.0.0.1', 'port': port, 'protocol': 'socks'}],
    'outbounds': [{
        'tag': 'probe', 'protocol': 'direct',
        'settings': {'redirect': 'cloudflare-ech.com:443'},
        'streamSettings': {'network': 'tcp', 'security': 'tls', 'tlsSettings': tls},
    }] + helpers,
}
with tempfile.TemporaryDirectory(prefix='zgz-ech-live-') as temp:
    path = pathlib.Path(temp) / 'config.json'
    path.write_text(json.dumps(config))
    with (path.parent / 'core.log').open('w+') as log:
        proc = subprocess.Popen([core, 'run', '-config', str(path)], stdout=log, stderr=log)
        try:
            for _ in range(50):
                if proc.poll() is not None:
                    raise RuntimeError('core exited before listening')
                try:
                    with socket.create_connection(('127.0.0.1', port), timeout=.1):
                        break
                except OSError:
                    time.sleep(.1)
            result = subprocess.run([
                'curl', '--noproxy', '', '--silent', '--show-error', '--fail',
                '--max-time', '45', '--proxy', f'socks5h://127.0.0.1:{port}',
                'http://cloudflare-ech.com/cdn-cgi/trace',
            ], capture_output=True, text=True, timeout=50)
            if result.returncode:
                raise RuntimeError(result.stderr.strip())
            trace = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
            assert trace.get('sni') == 'encrypted', f'ECH was not confirmed: {trace.get("sni")}'
            print('PASS: live Cloudflare connection reports sni=encrypted using generated h2c/TLS helper')
        except Exception:
            log.flush()
            log.seek(0)
            print(log.read(), file=sys.stderr)
            raise
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
