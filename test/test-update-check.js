/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/update.js'), 'utf8');
const body = source.slice(source.indexOf('function checking('), source.indexOf('\nfunction checkUpdate('));
const checking = new Function('checkAsked', 'checkKey', 'CHECK_JOB', body + '\nreturn checking;')(Date.now(), 'core:xray', 'Checking for new versions');
for (const job of ['', 'Checking for new versions', 'Checking for new versions: xray']) {
	assert.ok(checking({job}, 'core:xray'));
	for (const key of ['core:sing-box', 'core:haproxy', 'core:xray-patterniha', 'app'])
		assert.ok(!checking({job}, key), `${job}: ${key} must stay still`);
}
const idle = new Function('checkAsked', 'checkKey', 'CHECK_JOB', body + '\nreturn checking;')(0, '', 'Checking for new versions');
assert.ok(!idle({job:'Checking for new versions'}, 'core:sing-box'));
assert.ok(idle({job:'Checking for new versions: haproxy'}, 'core:haproxy'));
assert.ok(!idle({job:'Checking for new versions: haproxy'}, 'core:xray'));
for (const key of ['core:xray', 'core:sing-box', 'core:haproxy', 'all-cores'])
	assert.ok(idle({job:'Checking for new versions: all-cores'}, key));
assert.ok(!idle({job:'Checking for new versions: all-cores'}, 'app'));
console.log('Update checks: only the selected component animates, including generic transitional jobs');
const downloadSource = source.slice(source.indexOf('function downloadText('), source.indexOf('\nfunction noteFor('));
let language = 'fa';
const downloadText = new Function('_', 'i18n', 'ltr', downloadSource + '\nreturn downloadText;')(
	key => ({ format: value => (language === 'fa' ? 'در حال دانلود %s:' : key).replace('%s', value) }),
	{ get: () => language }, value => '\u2066' + value + '\u2069');
for (const job of ['Zirgozar', 'Updating Zirgozar', 'Installing Zirgozar', ' updating  Zirgozar '])
	assert.equal(downloadText(job), 'در حال دانلود زیرگذر:');
assert.equal(downloadText('Installing xray'), 'در حال دانلود \u2066Xray\u2069:');
language = 'en';
assert.equal(downloadText('Updating Zirgozar'), 'Downloading \u2066Zirgozar\u2069:');
console.log('Download labels passed: localized app name, normalized job prefixes and isolated core names');

const selectorSource = source.slice(source.indexOf("var versions = c.name == 'sing-box-lx'"), source.indexOf("\n\t\t\tif (c.installed && c.ours"));
function selector(name, versions, picked) {
 const actions = [], calls = [];
 const E = (tag, attrs, children) => ({tag, ...attrs, children, value: children?.[0]?.value});
 const run = new Function('c','cores','E','_','actBtn','act','downloadText','actions','d','lxPicked','xrayPicked',
  selectorSource + '; return { actions, lxPicked, xrayPicked };');
 const result = run({name, arch_ok:true}, {singbox_lx_versions:versions}, E,
  key => ({format:v => key.replace('%s',v)}),
  (label, style, key, click) => ({label,key,click}),
  (...args) => calls.push(args), name => name, actions, {}, picked, '');
 return {...result, calls};
}
const lxVersions = [{tag:'v1.14.3-lx.24-rc.1',pre:true},{tag:'v1.14.3-lx.23',pre:false}];
assert.equal(selector('sing-box-lx',lxVersions,'').actions[0].value,lxVersions[1].tag);
const lx = selector('sing-box-lx', lxVersions, lxVersions[1].tag);
assert.equal(lx.actions[0].children[0].children, '1.14.3-lx.24-rc.1 (pre-release)');
assert.equal(lx.actions[0].value, lxVersions[1].tag);
lx.actions[1].click();
assert.deepEqual(lx.calls[0].slice(0,3), ['core:sing-box-lx','core_install','sing-box-lx@v1.14.3-lx.23']);
lx.actions[0].value = lxVersions[0].tag;
lx.actions[1].click();
assert.equal(lx.calls[1][2], 'sing-box-lx@v1.14.3-lx.24-rc.1');
assert.equal(selector('sing-box',lxVersions,'').actions.length,0);
assert.equal(selector('sing-box-lx',[],'').actions.length,0);
console.log('LX versions: stable and prerelease selections target the matching core and survive redraws');
