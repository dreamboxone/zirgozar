/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/node.js'), 'utf8');
const api = new Function('rpc', 'i18n', source.slice(0, source.indexOf('\nreturn view.extend(')) + '\nreturn { parseLink, buildLink };')(
	{ declare: () => () => Promise.resolve({}) }, { tr: value => value });
for (const link of [
	'l2tp://name:password@example.com:1701?ipsec=0#test',
	'l2tp+ipsec://user%40domain:p%3Aa%40ss@example.com?psk=key%26%22%5C&mtu=1380#test',
	'l2tp://user:pass@192.0.2.1:1701?ipsec=1&psk=secret&future=value#test'
]) {
	const node = api.parseLink(link);
	assert.equal(node.proto, 'l2tp');
	assert.deepEqual(api.parseLink(api.buildLink(node, node.name)), node);
}
const imported = api.parseLink('l2tp+ipsec://a:b@example.com?psk=x');
assert.equal(imported.port, '1701');
assert.equal(imported.l2tp_ipsec, '1');
assert.equal(imported.l2tp_mtu, '1400');
assert.equal(api.parseLink('l2tp://missing@example.com:1701'), null);
console.log('L2TP form import/export passed for both account types and escaped credentials');
