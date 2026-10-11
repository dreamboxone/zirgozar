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
assert.equal(ui.uptimeText(0), '00:00:00');
assert.equal(ui.uptimeText(90061.9), '1 day 01:01:01');
assert.equal(ui.uptimeText(null), '-');
assert.equal(ui.uptimeText(-1), '-');

// Entering the app in a new session must not reload an already current UI.
const freshenSource = source.match(/function freshen\(installed, stamp\) \{[\s\S]*?\n\}/)[0];
async function cacheCase(installed, stamp, seen, repeats = 1) {
	const local = new Map(seen ? [['zirgozar-ui', seen]] : []), session = new Map();
	const storage = map => ({ getItem: key => map.get(key) || null,
		setItem: (key, value) => map.set(key, value) });
	let fetched = 0, reloaded = 0;
	const freshen = new Function('BUILD', 'OWN_FILES', 'window', 'L', 'fetch', 'location',
		freshenSource + '; return freshen;')('5.7.19-r3', ['zirgozar/ui'],
		{ localStorage: storage(local), sessionStorage: storage(session) },
		{ env: { base_url: '/resources', resource_version: 'test' }, resource: file => file },
		() => { fetched++; return Promise.resolve({ ok: true }); },
		{ reload: () => { reloaded++; } });
	for (let i = 0; i < repeats; i++) freshen(installed, stamp);
	await new Promise(resolve => setImmediate(resolve));
	return { fetched, reloaded };
}
(async () => {
	assert.deepEqual(await cacheCase('5.7.19-r3', 'same', 'same'), { fetched: 0, reloaded: 0 });
	assert.deepEqual(await cacheCase('5.7.19-3', 'same', 'same'), { fetched: 0, reloaded: 0 });
	assert.deepEqual(await cacheCase('5.7.19-r4', 'same', 'same'), { fetched: 2, reloaded: 1 });
	assert.deepEqual(await cacheCase('5.7.19-r3', 'new', 'old', 2), { fetched: 2, reloaded: 1 });
	assert.deepEqual(await cacheCase('5.7.19-r3', 'first', null), { fetched: 2, reloaded: 1 });
	assert.deepEqual(await cacheCase('', '', null), { fetched: 0, reloaded: 0 });
	console.log('UI cache refresh passed: current revision, package suffix, update, hotpatch, first visit and unknown version');
	let now = 0, tick, reads = 0, removed = false;
	const uptimeNode = { isConnected: true, textContent: '' };
	const sync = ui.uptimeTicker(uptimeNode,
		() => { reads++; return reads === 1 ? Promise.resolve({ uptime: 8 }) : Promise.reject(new Error('offline')); },
		() => now, { add: (callback, interval) => { tick = callback; assert.equal(interval, 1); },
			remove: callback => { assert.equal(callback, tick); removed = true; } });
	sync(100);
	now = 1000; await tick();
	assert.equal(uptimeNode.textContent, '00:01:41');
	assert.equal(reads, 0);
	now = 61000; await tick();
	assert.equal(uptimeNode.textContent, '00:00:08');
	now = 121000; await tick();
	assert.equal(uptimeNode.textContent, '00:01:08');
	now = 124000; await tick();
	assert.equal(uptimeNode.textContent, '00:01:11');
	uptimeNode.isConnected = false; await tick();
	assert.equal(removed, true);
	console.log('Live uptime passed: advances without page refresh, resyncs after reboot, survives RPC failure and stops on navigation');
})().catch(error => { console.error(error); process.exitCode = 1; });
