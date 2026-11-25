/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const resources = path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources');
const catalog = new Function('baseclass', fs.readFileSync(path.join(resources, 'zirgozar/checksites.js'), 'utf8'))({extend: value => value});
assert.equal(catalog.sites.length, 10);
assert.deepEqual(catalog.selected().map(s => s.id), ['ig', 'reddit', 'x']);
assert.equal(catalog.selected('none').length, 0);
assert.equal(catalog.selected('steam steam invalid').length, 1);
assert.equal(catalog.selected(catalog.sites.map(s => s.id)).length, 4);
assert.equal(catalog.selected('steam')[0].url, 'https://store.steampowered.com');
assert.deepEqual(catalog.selected('radiojavan').map(s=>s.id), ['youtube']);
assert.equal(catalog.selected('youtube')[0].url, 'https://www.youtube.com');
assert.equal(catalog.selected('telegram')[0].url, 'https://telegram.org');
assert.deepEqual(catalog.selected('soft98').map(s => s.id), ['telegram']);
assert.ok(!catalog.sites.some(s => s.id === 'soft98'));
for (const site of catalog.sites.filter(s => !s.mark)) {
	const extension = site.id === 'arvancloud' ? '.svg' : '.ico';
	const icon = fs.readFileSync(path.join(resources, 'zirgozar/site-icons', site.id + extension));
	if (extension === '.ico') assert.ok(['00000100','89504e47'].includes(icon.subarray(0,4).toString('hex')), site.id + ' must contain an ICO or PNG favicon, not an error page');
	else assert.match(icon.toString(), /<svg\b/);
}
const other = fs.readFileSync(path.join(resources, 'view/zirgozar/other.js'), 'utf8');
assert.doesNotMatch(other, /connection_check_sites|led_enabled/);
const appearance = fs.readFileSync(path.join(resources, 'view/zirgozar/appearance.js'), 'utf8');
const start = appearance.indexOf("s = m.section(form.NamedSection, 'config', 'zirgozar', _('Connection check settings'));");
const end = appearance.indexOf('var led =', start);
let saved, change;
const listeners = [], autosaved = [];
const inputs = catalog.sites.map((site, i) => ({value:site.id, checked: i < 4, disabled: false}));
const widget = {classList: {add() {}}, querySelectorAll: () => inputs, addEventListener: (event, fn) => {listeners.push(fn);change=()=>listeners.forEach(listener=>listener());}};
const option = {option:'connection_check_sites', map:{readonly:false}, value() {}, transformChoices() {return {};}, cbid() {return 'sites';}, getValidator() {return this.validate;}};
let control;
const ui = {Select: class {constructor(value, choices, settings) {control=this;assert.equal(settings.widget, 'checkbox'); assert.equal(settings.multiple, true);} render() {this.node=widget;return widget;} setUpdateEvents() {} setChangeEvents() {}}};
let capture;
const document = {
	addEventListener(type, fn) { assert.equal(type, 'click'); capture = fn; },
	removeEventListener(type, fn) { assert.equal(type, 'click'); assert.equal(fn, capture); capture = null; }
};
const visited = [];
new Function('m','form','_','checksites','uci','ui','callAction','document','pui',
	'var s,o,pendingSiteSave=Promise.resolve();\n' + appearance.slice(start,end))(
	{section: () => ({option: () => option})}, {}, s => s, catalog,
	{get: () => saved, set: (config, section, key, value) => {saved=value;}}, ui,
	(name,arg)=>{assert.equal(name,'check_sites');autosaved.push(arg);return Promise.resolve({ok:true});}, document,
	{navigate(href) { visited.push(href); return Promise.resolve(); }});
assert.equal(option.validate('config', ['ig','x','intel','steam']), true);
assert.equal(typeof option.validate('config', ['ig','x','intel','steam','soft98']), 'string');
option.renderWidget('config', 0, ['ig','x','intel','steam']);
assert.deepEqual(control.getValue(), ['ig','reddit','x','youtube']);
option.write('config', control.getValue());
assert.equal(saved, 'ig reddit x youtube', 'saving must read the checkbox widget, not the radio-only Select implementation');
assert.equal(inputs.filter(i => i.disabled).length, 6);
inputs[0].checked=false; change();
assert.equal(inputs.filter(i => i.disabled).length, 0);
const home = '/cgi-bin/luci/admin/services/zirgozar/settings';
let prevented = false;
capture({target:{closest(selector) {
	assert.equal(selector, '.mk-sidebar-link[href]');
	return {href: home};
}}, button:0, preventDefault() { prevented = true; }});
assert.equal(prevented, true);
assert.deepEqual(visited, [], 'navigation waits for the automatic save');
option.write('config', ['youtube','cloudflare']);
assert.equal(saved, 'youtube cloudflare');
assert.deepEqual(option.cfgvalue('config'), ['youtube','cloudflare']);
option.remove('config'); assert.equal(saved, 'none');
assert.deepEqual(option.cfgvalue('config'), []);
setImmediate(()=>{
	assert.deepEqual(autosaved, ['reddit x youtube'], 'checkbox changes save immediately without applying the form');
	assert.deepEqual(visited, [home]);
	assert.equal(capture, null, 'the temporary navigation listener is removed after saving');
});
console.log('Connection check sites: defaults, URLs, four-site limit, checkbox state and saved choices passed');
