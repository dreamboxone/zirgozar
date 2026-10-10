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
const example = 'aether://?protocol=wg-over-masque&scan=balanced&ip=v4&transport=h2&outer=162.159.198.204%3A443#aether';
const f = api.parseLink(example);
assert.equal(f.proto, 'aether');
assert.equal(f.aether_protocol, 'wg-over-masque');
assert.equal(f.aether_outer, '162.159.198.204:443');
assert.equal(f.aether_transport, 'h2');
assert.equal(api.buildLink(f, f.name), example);
const accountLink = example.replace('#aether', '&api_ech=1&api_ech_dns=udp%3A%2F%2F8.8.8.8&api_address=162.159.137.105#account');
const account = api.parseLink(accountLink);
assert.equal(account.aether_api_ech, '1');
assert.equal(account.aether_api_ech_dns, 'udp://8.8.8.8');
assert.equal(account.aether_api_address, '162.159.137.105');
assert.equal(account.aether_ech, '');
assert.deepEqual(api.parseLink(api.buildLink(account, account.name)), account);
for (const protocol of ['wg', 'masque', 'gool', 'mim', 'wg-over-masque']) {
	const original = 'aether://?protocol=' + protocol + '&ip=both&outer=%5B2001%3Adb8%3A%3A1%5D%3A443&tor=only&custom=value#test';
	const parsed = api.parseLink(original);
	const roundtrip = api.parseLink(api.buildLink(parsed, parsed.name));
	assert.deepEqual(roundtrip, parsed);
	assert.equal(roundtrip.rest.custom, 'value');
}
console.log('Aether form import and export passed, including unknown parameters and IPv6');
