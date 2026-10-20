/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/settings.js'), 'utf8');

const fill = new Function('rpc', 'i18n', 'E', source.slice(0, source.indexOf('\nreturn view.extend(')) + '\nreturn fillNodeChoices;')(
	{ declare: () => () => {} }, { tr: value => value }, (tag, attrs, text) => ({ value: attrs.value, text })
);
const select = { tagName: 'SELECT', value: 'edited-choice', options: [{ value: 'edited-choice' }], appendChild(option) { this.options.push(option); } };
fill({ node: select }, ['new-node', 'edited-choice'], ['Subscription node', 'Existing choice']);
fill({ node: select }, ['new-node'], ['Subscription node']);
assert.equal(select.value, 'edited-choice', 'late subscription data must preserve user edits');
assert.equal(select.options.length, 2, 'subscription choices must not be duplicated');
let added;
fill({ addChoices: (keys, labels) => { added = { keys, labels }; } }, ['node'], ['Node name']);
assert.equal(added.labels.node, 'Node name');

async function run(fail) {
	let requests = 0, complete;
	const timers = [];
	const formReady = new Promise((resolve, reject) => { complete = fail ? reject : resolve; });
	const element = (tag, attrs, children) => ({ tag, attrs, children, appendChild(child) { this.child = child; } });
	const page = new Function('view', 'rpc', 'uci', 'status', 'i18n', 'pui', 'E', 'window', source)(
		{ extend: value => value },
		{ declare: spec => () => { assert.equal(spec.method, 'subnodes'); requests++; throw new Error('subscription request must not block the form'); } },
		{ load: () => Promise.resolve(), get: () => 'fa' },
		{ load: () => Promise.resolve([null, null]), render: () => ({ top: ['dashboard'] }) },
		{ tr: value => value, setLang() {} }, { page: children => children }, element,
		{ setTimeout: fn => timers.push(fn) }
	);
	const data = await page.load();
	assert.equal(requests, 0, 'initial load must not request subscriptions');
	let rendered = false;
	page.renderForm = result => { assert.equal(result[2].nodes.length, 0); rendered = true; return formReady; };
	const mounted = page.render(data);
	assert.equal(mounted[0], 'dashboard');
	assert.equal(requests, 0, 'dashboard is returned before the deferred request');
	timers[0]();
	assert.equal(requests, 0);
	assert.equal(rendered, true, 'settings start rendering without a subscription response');
	complete(fail ? new Error('offline') : 'settings');
	await new Promise(resolve => setImmediate(resolve));
	if (fail) assert.match(mounted[1].textContent, /Could not load settings/);
	else { assert.equal(rendered, true); assert.equal(mounted[1].child, 'settings'); }
}
run(false).then(() => run(true)).then(() => console.log('Home: dashboard and settings render without waiting for subscriptions; failure recovery passed'))
	.catch(error => { console.error(error); process.exitCode = 1; });
