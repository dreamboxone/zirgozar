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
let compatibility = {ok:true};
const presets = new Function('baseclass', 'form', 'i18n', 'E', 'window', 'rpc', source('presets.js'))(
 { extend: x => x }, { TextValue: { prototype: { renderWidget: () => box } } },
 { tr: x => x }, E, { confirm: () => confirm }, {declare:()=>()=>Promise.resolve(compatibility)}
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
assert.throws(()=>presets.editMask('[]',()=>{}), /JSON object/);
text=JSON.stringify({tcp:[{type:'merge',settings:{times:1,provider:'keep'}}],udp:[{type:'custom-provider',settings:{token:'keep'}}],quicParams:{customExtension:4},foreign:'keep'});
const editable=presets.withFinalMask({getUIElement:()=>widget});
const formEditor=editable.renderWidget('node',0,text);
function elements(node) { return node && typeof node === 'object' ? [node].concat(Array.isArray(node.children) ? node.children.flatMap(elements) : []) : []; }
assert.ok(elements(formEditor).filter(el=>['input','select','button'].includes(el.tag)).every(el=>el.disabled == null), 'editable controls must omit the disabled attribute, not render disabled="false"');
const mergeDelay=elements(formEditor).find(el=>el.tag==='label' && el.children[0]?.children==='Merge delay (ms)').children[1];
mergeDelay.value='50';mergeDelay.dispatchEvent(new Event('change'));
assert.equal(JSON.parse(text).tcp[0].settings.delayMs,50);
assert.equal(JSON.parse(text).tcp[0].settings.provider,'keep');
assert.equal(JSON.parse(text).udp[0].settings.token,'keep');
const bbrProfile=elements(formEditor).find(el=>el.tag==='label' && el.children[0]?.children==='BBR profile').children[1];
bbrProfile.value='aggressive';bbrProfile.dispatchEvent(new Event('change'));
assert.equal(JSON.parse(text).quicParams.bbrProfile,'aggressive');
assert.equal(JSON.parse(text).quicParams.customExtension,4);
assert.equal(JSON.parse(text).foreign,'keep');
const idleTimeout=elements(formEditor).find(el=>el.tag==='input' && el['aria-label']==='Idle timeout (seconds)');
idleTimeout.value='30';idleTimeout.dispatchEvent(new Event('input'));
assert.equal(JSON.parse(text).quicParams.maxIdleTimeout,30,'numeric fields update the underlying mask while typing');
const rawMerge=elements(formEditor).find(el=>el.tag==='textarea' && el['aria-label']==='Additional mask settings');
assert.equal(JSON.parse(rawMerge.value).delayMs,50,'structured edits keep the advanced settings editor synchronized');
let savedMasks=0;
const guarded=presets.withFinalMask({getUIElement:()=>widget,isActive:()=>true,formvalue:()=>text,parse:()=>{savedMasks++;return Promise.resolve();}});
(async()=>{
 compatibility={ok:false,error:'unsupported mask'};
 await assert.rejects(guarded.parse('node'),/unsupported mask/);
 assert.equal(savedMasks,0,'incompatible settings cannot be saved');
 compatibility={ok:true};await guarded.parse('node');assert.equal(savedMasks,1);
 console.log('FinalMask structured editing, unknown-field preservation, QUIC updates and save compatibility gate passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
assert.equal(mode.validate('', ''), true);
assert.equal(mode.validate('', 'custom-core-mode'), true);
for (const value of ['oob.0,_,12', 'oob._', 'oob.255,0']) assert.equal(mode.validate('', value), true);
for (const value of ['oob.', 'oob.256', 'oob.1,,2', 'oob.-1', 'oob.1,', 'custom,mode']) assert.notEqual(mode.validate('', value), true);
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
