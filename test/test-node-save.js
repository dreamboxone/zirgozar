/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/node.js'), 'utf8');
const start = source.indexOf('var save = m.save;');
const end = source.indexOf('\n\t\t}\n', start);
async function check(result) {
	let saved = 0, notice, argument;
	const m = {parse: () => Promise.resolve(), save: () => {saved++; return Promise.resolve();}};
	new Function('m','uci','callAction','sid','showFormNotice','E','_','window','back','pui',source.slice(start,end))(
		m, {get: () => 'openvpn://profile', sections: () => [{'.name':'current'},{'.name':'new'}]},
		(action, arg) => {assert.equal(action,'node_dup'); argument=arg; return Promise.resolve(result);},
		'new', (content, kind) => {notice={content,kind};}, (tag, attrs, text) => text,
		text => ({format: value => text.replace('%s', value)}), {history:{replaceState(){}}}, '/configs', {listOf:()=>[]}
	);
	let error;
	try {await m.save();} catch(e) {error=e;}
	assert.equal(argument, 'new|current,new;openvpn://profile');
	return {saved,notice,error};
}
(async () => {
	assert.equal((await check({})).saved, 1);
	const duplicate = await check({dup_id:'current',dup_name:'Office'});
	assert.equal(duplicate.saved,0); assert.equal(duplicate.notice.kind,'error'); assert.ok(duplicate.error);
	const failed = await check({error:'unknown node'});
	assert.equal(failed.saved,0); assert.equal(failed.notice.kind,'error'); assert.ok(failed.error);
	console.log('Node save: staged scope, inline duplicate message and failed validation passed');
})().catch(error => {console.error(error);process.exitCode=1;});
