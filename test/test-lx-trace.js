/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/nodes.js'), 'utf8');
let modal;
function E(tag, attrs, children) {
	return { tag, attrs: attrs || {}, children, style: {},
		getAttribute(k) { return this.attrs[k]; },
		setAttribute(k, v) { this.attrs[k] = v; },
		querySelector() { return this.children[0]; } };
}
const cells = [], buttons = [];
const tests = new Function('E', 'document', 'ui', '_', 'pui', 'callAction',
	'var results = {}, pending = {}, testDetails = {}; function isPending(k) { return false; }\n' +
	source.slice(source.indexOf('function testTitle('), source.indexOf('/* ---------------------------------------------- The buttons')) +
	source.slice(source.indexOf('function listTestCell('), source.indexOf('\nfunction renderNodes(')) +
	'\nreturn {testCell, listTestCell, renderTests};')(
	E, { querySelectorAll: selector => selector === '.pwp-test-value' ? cells : buttons },
	{ showModal: (title, content) => { modal = content; }, hideModal() {} }, s => s,
	{ ms: n => n + ' ms' }, () => Promise.resolve());
const cell = tests.testCell('node1', 'url');
cells.push(cell.children[0]); buttons.push(cell.children[1]);
assert.equal(buttons[0].attrs.style, 'display:none');
const trace = 'root cause: stage 2 tcp_connect: refused\n<script>alert(1)</script>';
tests.renderTests({ tests: { 'node1.url': 0 }, details: { 'node1.url': trace } });
assert.equal(cells[0].textContent, '✕');
assert.equal(buttons[0].style.display, '');
buttons[0].attrs.click({ preventDefault() {}, stopPropagation() {} });
assert.equal(modal[1].tag, 'pre');
assert.equal(modal[1].children, trace, 'trace is passed as text, not HTML');
tests.renderTests({ tests: { 'node1.url': -1 } });
assert.equal(buttons[0].style.display, 'none', 'old report is hidden during a new test');
const measured = tests.listTestCell('node2', 'url', 42);
assert.equal(measured.children.length, 2, 'measurement preserves the details button');
assert.equal(measured.children[0].attrs['data-measured'], 42);
assert.equal(measured.children[0].textContent, '42 ms');
console.log('LX trace: failure details, text rendering, stale report hiding and measured cells passed');
