/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/node.js'), 'utf8');
const offset = source.indexOf('\nreturn view.extend(');
assert.ok(offset > 0);
const api = new Function('rpc', 'i18n', source.slice(0, offset) + '\nreturn { parseLink, buildLink };')(
	{ declare: () => () => Promise.resolve({}) }, { tr: value => value });
const exitNodes = new Function(source.slice(source.indexOf('function aetherExitNodes('), source.indexOf('\nfunction parseLink(')) + '\nreturn aetherExitNodes;')();
assert.deepEqual(exitNodes([
	{ '.name': 'v1', name: 'Saved VLESS', link: 'vless://id@example.com:443' },
	{ '.name': 'wg1', link: '[Interface]\nPrivateKey = key\n[Peer]\nPublicKey = peer' },
	{ '.name': 'awg', link: '[Interface]\nJc = 4' },
	{ '.name': 'off', enabled: '0', link: 'trojan://pass@example.com:443' },
	{ '.name': 'hy', link: 'hysteria2://pass@example.com:443' },
	{ '.name': 'self', link: 'aether://?protocol=masque' }
], 'self'), [ { tag: 'v1', label: 'Saved VLESS' }, { tag: 'wg1', label: 'wg1' } ]);
assert.deepEqual(exitNodes([{ '.name': 'v1', link: 'vless://id@example.com:443' }], 'v1'), []);
assert.match(source, /aetherExitNodes\(uci\.sections\('zirgozar', 'node'\), sid\)/);
const example = 'aether://?protocol=wg-over-masque&scan=balanced&ip=v4&transport=h2&outer=162.159.198.204%3A443#aether';
const f = api.parseLink(example);
assert.equal(f.proto, 'aether');
assert.equal(f.aether_protocol, 'wg-over-masque');
assert.equal(f.aether_outer, '162.159.198.204:443');
assert.equal(f.aether_transport, 'h2');
assert.equal(api.buildLink(f, f.name), example);
for (const protocol of ['wg', 'masque', 'gool', 'mim', 'wg-over-masque']) {
	const original = 'aether://?protocol=' + protocol + '&ip=both&outer=%5B2001%3Adb8%3A%3A1%5D%3A443&tor=only&custom=value#test';
	const parsed = api.parseLink(original);
	const roundtrip = api.parseLink(api.buildLink(parsed, parsed.name));
	assert.deepEqual(roundtrip, parsed);
	assert.equal(roundtrip.rest.custom, 'value');
}
console.log('Aether form import and export passed, including unknown parameters and IPv6');

const pasted = 'aether://?protocol=masque&transport=h2&scan=verified&ip=v4&sni=www.cloudflare.com &fingerprint=semi-python&api_ech=0&perf=low#Aether-H2';
const imported = api.parseLink(pasted);
assert.ok(imported, 'Pasted Aether link opens the structured editor');
for (const [key, value] of Object.entries({ protocol: 'masque', transport: 'h2', scan: 'verified', ip: 'v4', sni: 'www.cloudflare.com', fingerprint: 'semi-python', api_ech: '0', perf: 'low' }))
	assert.equal(imported['aether_' + key], value, key);
assert.equal(imported.name, 'Aether-H2');
assert.deepEqual(api.parseLink(api.buildLink(imported, imported.name)), imported);
assert.equal(api.parseLink(pasted + '\n' + example), null, 'Several links remain in the text editor');
assert.equal(api.parseLink(pasted.replace('www.cloudflare.com ', 'www.cloud flare.com')), null);
console.log('Pasted Aether query spacing opens the form and preserves settings');
const shared = api.buildLink(imported, imported.name);
assert.match(shared, /[?&]api_ech=0(?:&|#|$)/);
assert.match(shared, /[?&]perf=low(?:&|#|$)/);
assert.equal(imported.aether_api_ech, '0');
assert.equal(imported.aether_perf, 'low');
// Fixtures from PattN AetherFmt tests, including chained hops and exit settings.
for (const link of [
	'aether://162.159.198.1:443?protocol=masque&scan=verified&ip=both&transport=h2&fingerprint=semi-python#Pinned',
	'aether://?protocol=wg&scan=balanced&ip=v4#Scan',
	'aether://?protocol=gool&scan=balanced&ip=v4&outer=162.159.192.1%3A2408&inner=162.159.192.5%3A894#Hops',
	'aether://?protocol=masque&scan=verified&ip=v4&transport=h2&tor=chain&tor_bridges=auto&tor_relays=auto#Tor',
	'aether://?protocol=masque&scan=verified&ip=v4&transport=h2&fm=%7B%22tcp%22%3A%5B%5D%7D&dialMode=code-1#Mask'
]) {
	const node = api.parseLink(link);
	assert.ok(node, link);
	assert.deepEqual(api.parseLink(api.buildLink(node, node.name)), node);
}
console.log('PattN links round-trip, including preservation of perf and api_ech');

const fields = source.match(/var AETHER_EXTRA = '([^']+)'/)[1].split(' ');
const advanced = 'aether://?protocol=masque&scan=verified&' + fields.map((k, i) => k + '=' + encodeURIComponent('test:' + i)).join('&');
const parsedAdvanced = api.parseLink(advanced);
assert.deepEqual(api.parseLink(api.buildLink(parsedAdvanced, parsedAdvanced.name)), parsedAdvanced);
for (const [i, key] of fields.entries()) assert.equal(parsedAdvanced['aether_' + key], 'test:' + i, key);
console.log('All Aether 2.4 advanced fields survive form import and export');
