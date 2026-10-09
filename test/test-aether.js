/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const mode = process.argv[2], data = fs.readFileSync(process.argv[3], 'utf8');
if (mode === 'config' || mode === 'direct') {
	const c = JSON.parse(data);
	const inlet = c.inbounds.find(i => i.tag === 'aether-via');
	assert.equal(inlet.listen, '127.0.0.1');
	assert.equal(inlet.port, 10809);
	const idx = c.routing.rules.findIndex(r => r.inboundTag?.includes('aether-via'));
	const fallback = c.routing.rules.findIndex(r => r.network === 'tcp,udp');
	assert.ok(idx >= 0 && idx < fallback);
	const exit = mode === 'direct' ? 'direct' : 'chain-n1';
	assert.equal(c.routing.rules[idx].outboundTag, exit);
	assert.ok(c.outbounds.some(o => o.tag === exit));
	const dns = c.dns.servers.find(s => s.tag === 'dns-aether-bootstrap');
	assert.ok(dns.domains.includes('domain:cloudflareclient.com'));
	assert.ok(dns.domains.includes('domain:torproject.org'));
	assert.ok(dns.domains.includes('full:s3.amazonaws.com'));
	assert.ok(dns.domains.includes('full:www.cloudflare.com'));
	assert.ok(dns.finalQuery);
	assert.equal(c.routing.rules.find(r => r.inboundTag?.includes('dns-aether-bootstrap')).outboundTag, exit);
	assert.equal(c.outbounds.find(o => o.tag === 'proxy').settings.servers[0].port, 10808);
} else {
	const args = data.trim().split('\n');
	const option = key => args[args.lastIndexOf(key) + 1];
	assert.equal(option('--mark'), '255');
	assert.ok(option('--config').endsWith('/aether/a1/identity.toml'));
	assert.equal(option('--protocol'), 'gool');
	assert.equal(option('--peer'), '162.159.198.204:443');
	assert.ok(args.includes('--h2'));
	assert.ok(!args.includes('--gool-classic'));
	if (mode === 'upstream') assert.equal(option('--upstream'), 'socks5://127.0.0.1:10809');
}
