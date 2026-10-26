/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar', name), 'utf8');
class Element {
 constructor(tag, attrs = {}, children = []) {
  this.tag = tag; this.children = children; this.listeners = {}; Object.assign(this, attrs);
 }
 addEventListener(name, fn) { this.listeners[name] = fn; }
 dispatchEvent(event) { this.listeners[event.type]?.(event); this.events = [...(this.events || []), event.type]; }
 appendChild(child) { this.children.push(child); }
 querySelector(name) { return this.children.find(x => x.tag === name) || null; }
}
const E = (tag, attrs, children) => new Element(tag, attrs, children || []);
const textarea = new Element('textarea');
const box = new Element('div', {}, [textarea]);
let confirm = false, text = '';
const widget = { getValue: () => text, setValue: value => { text = value; } };
const presets = new Function('baseclass', 'form', 'i18n', 'E', 'window', source('presets.js'))(
 { extend: x => x }, { TextValue: { prototype: { renderWidget: () => box } } },
 { tr: x => x }, E, { confirm: () => confirm }
);
assert.equal(presets.finalMasks.length, 3);
assert.deepEqual(presets.finalMasks[0].value.tcp[0].settings.lengths, ['0', '104', '1']);
assert.equal(presets.finalMasks[2].value.udp[0].settings.noise.length, 24);
assert.equal(presets.identify(''), '');
assert.equal(presets.identify('{"unexpected":true}'), 'custom');
assert.equal(presets.identify(JSON.stringify({tcp: presets.finalMasks[0].value.tcp}, null, 4)), 'tlshello-zero');
for (const invalid of ['[]', 'null', 'true', '"text"', '{broken']) assert.equal(presets.validate(invalid), false);
assert.equal(presets.validate('{}'), true);
const option = presets.withFinalMask({ getUIElement: () => widget });
const rendered = option.renderWidget('node', 0, '');
const picker = rendered.children[0];
picker.value = 'tlshello'; picker.dispatchEvent(new Event('change'));
assert.equal(presets.identify(text), 'tlshello');
assert.ok(textarea.events.includes('input') && textarea.events.includes('change'));
text = '{"custom":123}'; picker.value = 'udp-noise'; picker.dispatchEvent(new Event('change'));
assert.equal(text, '{"custom":123}', 'choosing a preset cannot silently overwrite custom JSON');
confirm = true; picker.value = 'udp-noise'; picker.dispatchEvent(new Event('change'));
assert.equal(presets.identify(text), 'udp-noise');
picker.value = ''; picker.dispatchEvent(new Event('change'));
assert.equal(text, '', 'default removes the mask');
const mode = presets.withDialMode({ value: () => {} });
assert.equal(mode.validate('', ''), true);
assert.equal(mode.validate('', 'custom-core-mode'), true);
assert.notEqual(mode.validate('', 'mode; command'), true);
const scan = new Function('baseclass', 'rpc', 'ui', 'i18n', source('aetherscan.js'))(
 { extend: x => x }, { declare: () => () => Promise.resolve({}) }, {}, { tr: x => x }
);
const fields = { proto: 'aether', aether_protocol: 'wg-over-masque', aether_inner: '162.159.192.1:2408' };
let applied = {};
const map = { lookupOption: key => [{ getUIElement: () => ({ setValue: value => { applied[key] = value; } }) }] };
scan.applyEndpoints(map, 'node', fields, {outer: '162.159.198.201:443'}, 'wg-over-masque');
assert.equal(fields.aether_inner, '162.159.192.1:2408', 'a new outer scan preserves the assigned WireGuard inner endpoint');
assert.equal(applied._aether_outer, '162.159.198.201:443');
assert.throws(() => scan.applyEndpoints(map, 'node', fields, {}, 'mim'), /protocol changed/);
console.log('FinalMask presets, custom-value protection, default clearing and scan result application passed');
let automatic = null, modal = null;
const autoScan = new Function('baseclass', 'rpc', 'ui', 'i18n', 'E', 'window', source('aetherscan.js'))(
 {extend: x => x}, {declare: () => () => Promise.resolve({ok:true,state:'found',running:false,protocol:'masque',result:{endpoint:'162.159.198.201:443'}})},
 {showModal: (title, nodes) => {modal=nodes[0];}, hideModal:()=>{}}, {tr:x=>x}, E, {clearTimeout:()=>{},setTimeout:()=>{throw Error('completed scan must not poll');}}
);
autoScan.open({sid:'node'}, (result, protocol) => {automatic={result,protocol};}).then(()=>{
 assert.equal(automatic.result.endpoint,'162.159.198.201:443');
 assert.equal(automatic.protocol,'masque');
 assert.match(modal.children[1].textContent,/applied to form/);
 console.log('Successful endpoint scans automatically fill the form without saving it');
}).catch(error=>{console.error(error);process.exitCode=1;});