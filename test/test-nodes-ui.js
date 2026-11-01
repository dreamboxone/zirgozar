/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/nodes.js'), 'utf8');
const render = source.slice(source.indexOf('var nodeSnapshot'), source.indexOf('\nreturn view.extend('));
for (const language of ['en', 'fa']) {
	const count = { textContent: '28' };
	const box = { firstChild: null, appendChild(child) { this.child = child; } };
	const draw = new Function('document', 'E', '_', render + '\nreturn renderNodes;')(
		{ getElementById: id => id === 'pwp-nodecount' ? count : id === 'pwp-nodelist' ? box : null },
		(tag, attrs, text) => ({ text }),
		text => ({ format: n => language === 'fa' ? n + ' کانفیگ' : n + ' nodes' })
	);
	draw({ nodes: [] });
	assert.equal(count.textContent, language === 'fa' ? '0 کانفیگ' : '0 nodes', 'empty list resets the count in ' + language);
	assert.ok(box.child, 'empty list renders its explanation');
}
console.log('Nodes: empty list resets count in both languages');

const helpers = render.slice(0, render.indexOf('function renderNodes(d)'));
const tabs = { children: [], get firstChild() { return this.children[0]; },
	appendChild(n) { this.children.push(n); }, removeChild() { this.children.shift(); } };
const clear = { style: {} }, panel = { setAttribute() {} };
const data = { groups: [{ id: 'manual', name: '' }, { id: 'sub:a', name: 'Alpha' }, { id: 'sub:b', name: 'Beta' }],
	nodes: [{ id: 'manual', sources: ['manual'] }, { id: 'shared', sources: ['sub:a', 'sub:b'] }, { id: 'beta', sources: ['sub:b'] }] };
let visible;
const controller = new Function('document', 'E', '_', 'display', helpers + `
function renderNodes(d) { nodeSnapshot = d; display(renderSourceTabs(d)); }
return { draw: renderNodes, groups: nodeSourceGroups };`)(
	{ getElementById: id => ({ 'pwp-source-tabs': tabs, 'pwp-source-clear': clear, 'pwp-nodelist': panel })[id] },
	(tag, attrs, text) => ({ attrs, text }), text => text, nodes => { visible = nodes; }
);
controller.draw(data);
assert.deepEqual(visible.map(n => n.id), ['manual', 'shared', 'beta'], 'all tab combines manual and subscription nodes');
assert.equal(clear.style.display, 'none');
tabs.children[2].attrs.click();
assert.deepEqual(visible.map(n => n.id), ['shared']);
assert.equal(clear.style.display, '');
controller.draw(data);
assert.deepEqual(visible.map(n => n.id), ['shared'], 'polling preserves selected subscription');
tabs.children[3].attrs.click();
assert.deepEqual(visible.map(n => n.id), ['shared', 'beta']);
controller.draw({ groups: data.groups, nodes: data.nodes.filter(n => n.id === 'manual') });
assert.equal(visible.length, 0, 'empty subscription does not show another source');
assert.equal(clear.disabled, true);
assert.equal(controller.groups({ nodes: data.nodes })[0].id, 'all', 'older routers retain the full list');
console.log('Nodes: separate source tabs, shared membership, persistent selection and empty subscriptions passed');

const buttons = [], buttonElements = [], copyCalls = [];
let copiedLink = '';
const listBox = { firstChild: null, appendChild(child) { this.child = child; }, setAttribute() {} };
const drawPopulated = new Function('document', 'E', '_', 'listTestCell', 'address', 'pill', 'callAction', 'pui', 'nodelink', render + '\nselectedSource = "all"; return renderNodes;')(
	{ getElementById: id => id === 'pwp-nodelist' ? listBox : null },
	(tag, attrs, children) => { const e = { tag, attrs, children }; if (tag === 'button') { buttons.push(children); buttonElements.push(e); } return e; },
	text => text, () => 'Test', text => text, text => text,
	(name, arg) => { copyCalls.push(name); return Promise.resolve({ link:'trojan://example@server:443#Example' }); },
	{ copyText: text => { copiedLink=text; return Promise.resolve(); }, note: () => assert.fail('copy failed') },
	{ recordLink: () => assert.fail('original share link should be preferred') }
);
drawPopulated(data);
assert.equal(buttons.filter(t => t === 'Edit').length, 3);
assert.equal(buttons.filter(t => t === 'Copy').length, 3);
assert.equal(buttons.filter(t => t === 'Delete').length, 3);
console.log('Nodes: every row offers edit and copy; subscription rows retain individual deletion');
buttonElements.find(e => e.children === 'Copy').attrs.click({currentTarget:{disabled:false}}).then(() => {
	assert.deepEqual(copyCalls, ['share_list_node'], 'copy only requests a share link and never creates a node');
	assert.equal(copiedLink, 'trojan://example@server:443#Example');
	console.log('Nodes: copy writes the original share link to the clipboard without changing configs');
}).catch(error => { console.error(error); process.exitCode=1; });

const fields = [];
const makeForm = new Function('E', '_', helpers + '\nreturn nodeRecordForm;')(
	(tag, attrs, children) => {
		const element = { tag, attrs, children };
		if (attrs && attrs.class === 'cbi-value') fields.push({ name: children[0].children, input: children[1].children });
		return element;
	}, text => text
);
const config = { protocol:'trojan', settings:{ servers:[{address:'example.com',port:443,password:'old'}] }, streamSettings:{network:'tcp',security:'tls',tlsSettings:{serverName:'example.com'}}, custom:{keep:true, values:[1,2,3]} };
const editor = makeForm(['n0','Example','trojan','example.com','443',JSON.stringify(config)].join('\t'));
fields.find(f => f.name === 'Password').input.value = 'new-password';
fields.find(f => f.name === 'Port').input.value = '8443';
fields.find(f => f.name === 'SNI').input.value = 'new.example.com';
const edited = editor.read();
assert.equal(edited.port, 8443);
assert.equal(edited.config.settings.servers[0].port, 8443);
assert.equal(edited.config.settings.servers[0].password, 'new-password');
assert.equal(edited.config.streamSettings.tlsSettings.serverName, 'new.example.com');
assert.deepEqual(edited.config.custom, config.custom, 'full form preserves unknown settings and numeric arrays');
assert.ok(fields.every(f => !String(f.input.value || '').includes('"settings"')), 'config is rendered as fields, not a JSON text area');
console.log('Nodes: full form edits credentials, endpoint and TLS while preserving other settings');
