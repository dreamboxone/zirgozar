/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const resources = path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources');

// A small DOM stand-in lets the shipped renderer run without a browser.
function element(tag, attrs, children) {
	return { tag, attrs, children: children || [],
		appendChild(child) { this.children.push(child); } };
}

const source = fs.readFileSync(path.join(resources, 'zirgozar/ui.js'), 'utf8');
const ui = new Function('baseclass', 'rpc', 'i18n', 'L', 'E', source)(
	{ extend: value => value }, { declare: () => () => Promise.resolve({}) },
	{ tr: value => value },
	{ toArray: value => value == null ? [] : Array.isArray(value) ? value : [value] },
	element
);

function render(option, value) {
	option.cbid = () => 'new-config';
	ui.checkboxes(option);
	return option.renderWidget('new-config', 0, value);
}

// LuCI does not create keylist until option.value() is called. An empty
// balancing candidate list must still allow the new config page to render.
assert.equal(render({}, undefined).children.length, 0);
assert.equal(render({ keylist: [], vallist: [] }, []).children.length, 0);

const choices = { keylist: ['node-a', 'node-b'], vallist: ['First node', 'Second node'] };
const box = render(choices, ['node-b']);
assert.equal(box.children.length, 2);
assert.equal(box.children[0].children[0].attrs.checked, null);
assert.equal(box.children[1].children[0].attrs.checked, '');
assert.equal(box.children[1].children[1].children, 'Second node');
assert.equal(render({ keylist: ['node-a'] }, 'node-a').children[0].children[1].children, 'node-a');
assert.equal(render({ keylist: ['node-a'], default: ['node-a'] }, undefined)
	.children[0].children[0].attrs.checked, '');

console.log('Config checkbox rendering passed: missing, empty, populated and default choices');
