/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/node.js'), 'utf8');
const shared = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/ui.js'), 'utf8');
const roots = new Map();
function element(tag, attrs = {}, children = []) {
	const node = { tag, attrs, children: Array.isArray(children) ? children : [children],
		value: attrs.value || '', checked: attrs.checked != null, hidden: false, open: false, style: {},
		setAttribute(name, value) { this.attrs[name] = value; },
		focus() { this.focused = true; },
		getBoundingClientRect() { return this.bounds || { top: 20, bottom: 60 }; },
		contains(target) { return target === this || descendants(this).includes(target); },
		classList: { toggle() {} }, listeners: {},
		appendChild(child) { this.children.push(child); },
		addEventListener(type, listener) { this.listeners[type] = listener; },
		dispatchEvent(event) { (this.listeners[event.type] || this.attrs[event.type] || (() => {}))(event); },
		querySelectorAll() { return descendants(this).filter(n => n.tag === 'input' && n.attrs.type === 'checkbox' && n.checked); }
	};
	if (attrs.id) roots.set(attrs.id, node);
	return node;
}
function descendants(node) {
	return node.children.flatMap(child => typeof child === 'object' && child ? [child, ...descendants(child)] : []);
}
const translate = text => text.includes('%s') ? { format: (...args) => text.replace(/%s/g, () => args.shift()) } : text;
const L = { toArray: value => value == null ? [] : Array.isArray(value) ? value : [value] };
const document = { getElementById: id => roots.get(id), listeners: {},
	addEventListener(type, listener) { this.listeners[type] = listener; },
	removeEventListener(type) { delete this.listeners[type]; } };
const checkboxes = new Function('L', 'E', 'document',
	shared.slice(shared.indexOf('function checkboxes('), shared.indexOf('/* Older cached node views')) + '\nreturn checkboxes;')(L, element, document);
// Reproduce the reported cache mismatch: the shared UI has no nodePicker.
const oldUI = { checkboxes };
const picker = new Function('L', 'E', '_', 'i18n', 'pui', 'document', 'window',
	source.slice(source.indexOf('function nodePicker('), source.indexOf('/* --------------------------------------------------------------- the page */')) + '\nreturn nodePicker;')(
	L, element, translate, { get: () => 'en' }, oldUI, document, { innerHeight: 900 });
assert.equal(oldUI.nodePicker, undefined);
const nodes = Array.from({ length: 30 }, (_, i) => ({ tag: 'node-' + (i + 1),
	label: 'Server ' + String(i + 1).padStart(2, '0'), protocol: i % 3 === 0 ? 'wireguard' : 'l2tp' }));
const option = { cbid: () => 'picker', keylist: nodes.map(n => n.tag), vallist: nodes.map(n => n.label) };
picker(option, nodes);
const box = option.renderWidget('group', 0, ['node-30']);
assert.equal(box.tag, 'details');
assert.equal(box.open, false, 'the choices are collapsed initially');
const summary = descendants(box).find(n => n.tag === 'summary');
box.open = true;
box.dispatchEvent(new Event('toggle'));
assert.equal(summary.attrs['aria-expanded'], 'true');
summary.bounds = { top: 800, bottom: 850 };
box.dispatchEvent(new Event('toggle'));
assert.equal(descendants(box).find(n => n.attrs.class === 'zgz-node-menu').style.bottom, 'calc(100% + 6px)', 'menu opens upwards near the viewport bottom');
document.listeners.pointerdown({ target: box });
assert.equal(box.open, true, 'clicking an item does not close the dropdown');
document.listeners.pointerdown({ target: {} });
assert.equal(box.open, false, 'clicking outside closes the dropdown');
box.open = true;
box.listeners.keydown({ key: 'Escape' });
assert.equal(box.open, false);
assert.equal(summary.focused, true);
const find = cls => descendants(box).filter(n => n.attrs.class === cls);
const search = find('zgz-node-search')[0], rows = find('zgz-node-row');
const buttons = descendants(box).filter(n => n.tag === 'button');
const filter = value => { search.value = value; search.dispatchEvent(new Event('input')); };
assert.equal(rows.length, 30);
filter('server 01');
assert.equal(rows.filter(row => !row.hidden).length, 1);
buttons[0].attrs.click();
assert.deepEqual(option.formvalue('group'), ['node-1', 'node-30'], 'search retains a hidden selected node');
filter('WIREGUARD');
assert.equal(rows.filter(row => !row.hidden).length, 10, 'protocol search ignores case');
buttons[0].attrs.click();
assert.equal(option.formvalue('group').length, 11);
buttons[1].attrs.click();
assert.deepEqual(option.formvalue('group'), ['node-30'], 'deselect affects matching nodes only');
filter('missing');
assert.ok(buttons.every(button => button.disabled));
assert.equal(find('zgz-node-empty')[0].hidden, false);
assert.deepEqual(option.formvalue('group'), ['node-30']);
filter('');
buttons[0].attrs.click();
assert.equal(option.formvalue('group').length, 30);
assert.equal(find('zgz-node-count')[0].textContent, '30 of 30 configs selected');
buttons[1].attrs.click();
assert.deepEqual(option.formvalue('group'), []);
let prevented = false;
search.listeners.keydown({ key: 'Enter', preventDefault: () => { prevented = true; } });
assert.equal(prevented, true, 'search cannot submit the config form');
const empty = { cbid: () => 'empty' };
picker(empty, []);
const emptyBox = empty.renderWidget('empty', 0, []);
assert.ok(descendants(emptyBox).filter(n => n.tag === 'button').every(n => n.disabled));
console.log('Node dropdown: collapsed state, outside click, Escape, 30 configs, search, preserved selection and bulk actions passed');
