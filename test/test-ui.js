/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 */
'use strict';
require('./test-status-ui.js');
require('./test-home-ui.js');
require('./test-update-check.js');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const resources = path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources');

const logfa = new Function('baseclass', fs.readFileSync(path.join(resources, 'zirgozar/logfa.js'), 'utf8'))({ extend: value => value });
for (const [file, pattern, prefix] of [
	['zgz-dns', /dns_failed "([^"]+)"/g, 'DNS protection failed: '],
	['zgz-cores', /self_fail "([^"]+)"/g, 'update: ']
]) {
	const script = fs.readFileSync(path.join(__dirname, '../package/zirgozar/files', file), 'utf8');
	for (const match of script.matchAll(pattern)) {
		const message = prefix + match[1];
		assert.match(logfa.sentence(message), /[\u0600-\u06ff]/);
		assert.ok(!logfa.sentence(message).includes(match[1]), message);
	}
}
assert.equal(logfa.line('2026-10-17 16:00:33: DNS is isolated from the system upstream settings (port 1054)'),
	'1405/07/25 16:00:33: DNS از تنظیمات سرورهای بالادستی سیستم جدا شده است (پورت 1054)');
assert.equal(logfa.sentence('update: unknown diagnostic 192.0.2.1:443'), 'به‌روزرسانی: unknown diagnostic 192.0.2.1:443');
console.log('Persian runtime logs passed: DNS protection and update failures');

const logSource = fs.readFileSync(path.join(resources, 'view/zirgozar/log.js'), 'utf8');
const logBox = new Function('rpc', 'i18n', 'E', logSource.slice(0, logSource.indexOf('\nreturn view.extend(')) + '\nreturn box;');
for (const lang of ['fa', 'en']) {
	const box = logBox({ declare: () => () => {} }, { tr: value => value, get: () => lang }, (tag, attrs) => ({ tag, attrs }))();
	assert.equal(box.attrs.dir, lang === 'fa' ? 'rtl' : 'ltr');
	if (lang === 'fa') assert.ok(box.attrs.style.includes('text-align:right'));
}
console.log('Runtime and node log directions passed: Persian RTL, English LTR');

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

// A missing or stale preference follows LuCI; explicit choices remain intact.
const modeSource = source.match(/function themeMode\(\) \{[\s\S]*?\n\}/)[0];
for (const [saved, expected] of [[null, 'auto'], ['auto', 'auto'], ['old', 'auto'], ['dark', 'dark'], ['light', 'light']]) {
	const mode = new Function('localStorage', modeSource + '; return themeMode();');
	assert.equal(mode({ getItem: () => saved }), expected);
}
assert.equal(new Function('localStorage', modeSource + '; return themeMode();')({
	getItem: () => { throw new Error('Storage unavailable'); }
}), 'auto');
console.log('Theme preferences passed: follow by default, explicit modes and unavailable storage');
const followSource = source.match(/function followTheme\(root\) \{[\s\S]*?\n\}/)[0];
function themedElement() {
	const classes = new Set(), properties = new Map();
	return { isConnected: true, parentElement: null,
		classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name), contains: name => classes.has(name), remove: name => classes.delete(name) },
		style: { getPropertyValue: name => properties.get(name), setProperty: (name, value) => properties.set(name, value) },
		appendChild() {}, remove() {} };
}
let hostDark = false, preference = 'auto', removedThemeTimer = false;
let modernColor = null, modernPixels = [255, 255, 255, 255];
const themeBody = themedElement(), themeRoot = themedElement();
themeRoot.parentElement = themeBody;
const synchronize = new Function('E', 'document', 'getComputedStyle', 'themeMode', 'secondTimer',
	followSource + '; return followTheme;')(
	() => themedElement(), { body: themeBody, querySelector: () => null,
		createElement: () => ({ getContext: () => ({ fillRect() {}, getImageData: () => ({ data: modernPixels }) }) }) },
	() => ({ backgroundColor: modernColor || (hostDark ? 'rgb(24, 24, 24)' : 'rgb(255, 255, 255)'),
		color: hostDark ? 'rgb(240, 240, 240)' : 'rgb(30, 30, 30)', borderTopColor: 'rgb(90, 90, 90)',
		borderRadius: '16px', padding: '0px', boxShadow: 'none', fontSize: '14px', fontWeight: '400', fontFamily: 'sans-serif' }),
	() => preference, { add() {}, remove() { removedThemeTimer = true; } })(themeRoot);
synchronize();
assert.ok(themeRoot.classList.contains('mk-follow'));
assert.ok(!themeRoot.classList.contains('mk-dark'));
assert.equal(themeRoot.style.getPropertyValue('--zgz-card-radius'), '16px');
assert.equal(themeRoot.style.getPropertyValue('--zgz-card-padding'), '20px');
assert.equal(themeRoot.style.getPropertyValue('--zgz-button-radius'), '16px');
assert.equal(themeRoot.style.getPropertyValue('--zgz-control-radius'), '16px');
assert.equal(themeBody.style.getPropertyValue('--zgz-font'), 'sans-serif');
hostDark = true; synchronize();
assert.ok(themeRoot.classList.contains('mk-dark'));
assert.ok(themeBody.classList.contains('pwp-dark'));
assert.equal(themeBody.style.getPropertyValue('--zgz-panel'), 'rgb(24, 24, 24)');
modernColor = 'lab(100% 0 0)'; synchronize();
assert.ok(!themeRoot.classList.contains('mk-dark'));
modernColor = 'lab(8% 0 -7)'; modernPixels = [24, 24, 24, 255]; synchronize();
assert.ok(themeRoot.classList.contains('mk-dark'));
preference = 'light'; synchronize();
assert.ok(!themeRoot.classList.contains('mk-follow'));
assert.ok(!themeBody.classList.contains('pwp-follow'));
themeRoot.isConnected = false; synchronize();
assert.ok(removedThemeTimer);
assert.ok(!themeBody.classList.contains('pwp-dark'));
console.log('Theme synchronization passed: host changes, modal colours, manual opt-out and navigation cleanup');
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
	assert.deepEqual(await cacheCase('5.7.19-r3', 'new', 'old', 2), { fetched: 2, reloaded: 0 });
	assert.deepEqual(await cacheCase('5.7.19-r3', 'first', null), { fetched: 2, reloaded: 0 });
	assert.deepEqual(await cacheCase('5.7.19-r4', 'first', null, 2), { fetched: 2, reloaded: 1 });
	assert.deepEqual(await cacheCase('', '', null), { fetched: 0, reloaded: 0 });
	console.log('UI cache refresh passed: current revision, package suffix, update reloads once, hotpatch and first visit refresh without reloading, unknown version');
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
