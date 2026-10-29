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

const appTextSource = source.slice(source.indexOf('function appProgressText('), source.indexOf('\nfunction noteFor('));
const appText = new Function('_','downloadText','jobName',appTextSource+'\nreturn appProgressText;')(
	v=>v,()=> 'Downloading',()=> 'Installing');
assert.equal(appText('finalizing'),'Finishing update…','a new login must not label cache preparation as downloading');
assert.equal(appText('restarting'),'Restarting services…');
assert.equal(appText('installing'),'Installing');
assert.equal(appText('downloading'),'Downloading');
assert.equal(appText(''),'Updating Zirgozar','an older backend with no phase must use a neutral update label');
const resultSource = source.slice(source.indexOf('function render(d, early)'), source.indexOf('\n\tvar cres =',source.indexOf('function render(d, early)')));
function completedNote(self) {
	const render = new Function('keep','_',
		'var answered=false, firstVersion="", lastSelf="", progressKey="app", notes={app:{kind:"info",text:"Downloading"}}; '+
		'function say(k,text,kind) { notes[k]={text,kind}; }\n'+resultSource+
		'\nreturn notes.app; }\nreturn render;')(()=>{},v=>({format:x=>v.replace('%s',x)}));
	return render({cores:{app:{version:'5.8.7-r4'}},job:'',self});
}
assert.equal(completedNote(''),undefined);
assert.deepEqual(completedNote('ok 5.8.7-r4'),{text:'Updated to 5.8.7-r4.',kind:'ok'});
console.log('App update: reconnect phase labels and stale download note cleanup passed');

const selectorSource = source.slice(source.indexOf("var versions = c.name == 'sing-box-lx'"), source.indexOf("\n\t\t\tif (c.installed && c.ours"));
function selector(name, versions, picked, installedVersion) {
 const actions = [], calls = [];
 const E = (tag, attrs, children) => ({tag, ...attrs, children, value: children?.[0]?.value});
 const run = new Function('c','cores','E','_','actBtn','act','downloadText','actions','d','lxPicked','xrayPicked',
  selectorSource + '; return { actions, lxPicked, xrayPicked };');
 const result = run({name, arch_ok:true, installed:!!installedVersion, version:installedVersion}, {singbox_lx_versions:versions}, E,
  key => ({format:v => key.replace('%s',v)}),
  (label, style, key, click) => ({label,key,click}),
  (...args) => calls.push(args), name => name, actions, {}, picked, '');
 return {...result, calls};
}
const lxVersions = [{tag:'v1.14.3-lx.24-rc.1',pre:true},{tag:'v1.14.3-lx.23',pre:false}];
assert.equal(selector('sing-box-lx',lxVersions,'').actions[0].value,lxVersions[1].tag);
assert.equal(selector('sing-box-lx',lxVersions,'','1.14.3-lx.24-rc.1').actions[0].value,lxVersions[0].tag);
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

const installSource = source.slice(source.indexOf('var target = c.name;'), source.indexOf("\n\t\t\t	}, 'download', d));",source.indexOf('var target = c.name;')));
const installTarget = new Function('c','act','downloadText', installSource);
for (const name of ['sing-box-lx','xray']) {
 const version = name == 'sing-box-lx' ? '1.14.3-lx.24-rc.1' : '26.10.21';
 const reinstall = installTarget({name,version,installed:true,update:false,latest:'v1.14.3-lx.23'}, (...args)=>args[2],()=> '');
 assert.equal(reinstall,name+'@v'+version);
 const update = installTarget({name,version,installed:true,update:true,latest:'newer'}, (...args)=>args[2],()=> '');
 assert.equal(update,name);
}
console.log('Reinstall preserves the installed LX prerelease; explicit version selection remains available');
