/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/status.js'), 'utf8');
function element(tag, attrs, children) {
	const el = { tag, attrs: attrs || {}, children: [], textContent: typeof children === 'string' ? children : '',
		appendChild(child) { this.children.push(child); return child; },
		setAttribute(key, value) { this.attrs[key] = value; },
		querySelector(selector) { for (const child of this.children) { if (child.id === selector.slice(1)) return child; const found = child.querySelector?.(selector); if (found) return found; } return null; }
	};
	el.id = el.attrs.id;
	if (Array.isArray(children)) el.children = children;
	let text = typeof children === 'string' ? children : '';
	Object.defineProperty(el, 'textContent', { get: () => text + el.children.map(child => child.textContent || '').join(''), set: value => { text=String(value); el.children=[]; } });
	Object.defineProperty(el, 'firstChild', { get: () => text ? {textContent:text} : el.children[0] });
	el.removeChild = child => { if(text) text=''; else el.children.splice(el.children.indexOf(child),1); };
	return el;
}
let language = 'fa', requests = 0, finish;
const api = new Function('rpc', 'i18n', 'pui', 'E', 'document', 'Node', source.slice(0, source.indexOf('\nreturn baseclass.extend(')) + '\nreturn {usageTotals, usageCard, socialCheck, check, setEnabled: function(value) {usageEnabled=value;renderUsage();}, setScope: function(nodes) {scope=nodes;}, setTraffic: function(data) {usageData=data;renderUsage();}};')(
	{ declare: spec => spec.method === 'check' ? () => { requests++; return new Promise(resolve => { finish = resolve; }); } : () => Promise.resolve({}) },
	{ tr: value => value, get: () => language }, { ms: value => value + ' ms' }, element, { getElementById: () => null, createTextNode: text => ({textContent:text}) }, class Node {}
);
const traffic = { today: { up: 1e9, down: 2e9 }, week: { up: 4e9, down: 8e9 }, month: { up: 99e9, down: 99e9 }, days: [
	{ d: '2026-09-17', up: 900e9, down: 900e9 }, { d: '2026-09-18', up: 2e9, down: 3e9 }, { d: '2026-10-17', up: 1e9, down: 2e9 }
] };
assert.deepEqual(api.usageTotals(traffic, 'month'), { up: 3e9, down: 5e9 });
const usage = api.usageCard(); api.setScope([usage]); api.setTraffic(traffic);
assert.equal(usage.querySelector('#pwp-usage-total').textContent, '3.00');
assert.equal(usage.querySelector('#pwp-period-today').attrs['aria-selected'], 'true');
usage.querySelector('#pwp-period-week').attrs.click();
assert.equal(usage.querySelector('#pwp-usage-up').textContent, '4.00');
assert.equal(usage.querySelector('#pwp-usage-down').textContent, '8.00');
assert.equal(usage.querySelector('#pwp-usage-total').textContent, '12.00');
usage.querySelector('#pwp-period-month').attrs.click();
assert.equal(usage.querySelector('#pwp-usage-total').textContent, '8.00');
api.setTraffic(null); assert.equal(usage.querySelector('#pwp-usage-total').textContent, '—');
assert.equal(usage.querySelector('#pwp-period-month').textContent, '۳۰ر');
api.setEnabled(false);
for (const key of ['up','down','total']) assert.equal(usage.querySelector('#pwp-usage-' + key).textContent, 'Disabled');
assert.equal(usage.querySelector('#pwp-period-month').disabled, true);
api.setEnabled(true);
assert.equal(usage.querySelector('#pwp-period-month').disabled, false);
language = 'en'; assert.equal(api.usageCard().querySelector('#pwp-period-month').textContent, '1m');
const social = api.socialCheck('site', 'Instagram', 'instagram', '#df458e', 'https://www.instagram.com'); api.setScope([social]);
const pending = social.attrs.click(); social.attrs.click(); assert.equal(requests, 1); assert.equal(social.disabled, true);
finish({ms:321,http_code:200});
pending.then(async () => {
	assert.equal(social.querySelector('#site-v').textContent, '321 ms'); assert.equal(social.disabled, false);
	const failed = social.attrs.click(); finish({ms:0,http_code:403}); await failed;
	assert.equal(social.querySelector('#site-v').textContent, 'N/A');
	console.log('Status cards passed: real URL results, duplicate prevention, GB totals, 7/30-day ranges and languages');
}).catch(error => { console.error(error); process.exitCode=1; });
