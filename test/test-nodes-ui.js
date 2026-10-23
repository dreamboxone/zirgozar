/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/nodes.js'), 'utf8');
const render = source.slice(source.indexOf('function renderNodes(d)'), source.indexOf('\nreturn view.extend('));
for (const language of ['en', 'fa']) {
	const count = { textContent: '28' };
	const box = { firstChild: null, appendChild(child) { this.child = child; } };
	const draw = new Function('document', 'E', '_', render + '\nreturn renderNodes;')(
		{ getElementById: id => id === 'pwp-nodecount' ? count : box },
		(tag, attrs, text) => ({ text }),
		text => ({ format: n => language === 'fa' ? n + ' کانفیگ' : n + ' nodes' })
	);
	draw({ nodes: [] });
	assert.equal(count.textContent, language === 'fa' ? '0 کانفیگ' : '0 nodes', 'empty list resets the count in ' + language);
	assert.ok(box.child, 'empty list renders its explanation');
}
console.log('Nodes: empty list resets count in both languages');
