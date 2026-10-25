/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// The import functions of the Subscriptions page, run against a stand-in uci.
const source = fs.readFileSync(path.join(__dirname,
	'../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/subscribe.js'), 'utf8');
const piece = (from, to) => source.slice(source.indexOf(from), source.indexOf(to));
const code = piece('function sectionName(', '/* The five filter modes') +
	piece('var NAME_KEYS', 'function done(') + 'return { subsInFile, importSubs, subscriptionName };';

const sections = [ { '.name': 'default', name: 'Top 100', url: 'https://example.com/top100.txt' } ];
const uci = {
	get: (conf, sid, opt) => { const s = sections.find(x => x['.name'] == sid); return opt ? s && s[opt] : s; },
	sections: () => sections,
	add: (conf, type, sid) => { sections.push({ '.name': sid }); return sid; },
	set: (conf, sid, opt, val) => { sections.find(x => x['.name'] == sid)[opt] = val; }
};
const { subsInFile, importSubs, subscriptionName } = new Function('uci', code)(uci);
assert.equal(subscriptionName('https://a.example/sub#XXZZ0', '', 's1'), 'XXZZ0');
assert.equal(subscriptionName('https://a.example/sub', '', 's1'), 'a.example');
assert.equal(subscriptionName('', 'Manual', 's1'), 'Manual');
assert.equal(subscriptionName('', '', 's1'), 's1');

assert.deepEqual(subsInFile('https://sub.example/token#XXZZ0'),
	[ { url: 'https://sub.example/token', name: 'XXZZ0' } ]);
assert.deepEqual(subsInFile('https://sub.example/token#%D8%AA%D8%B3%D8%AA%20%F0%9F%87%AE%F0%9F%87%B7'),
	[ { url: 'https://sub.example/token', name: 'تست 🇮🇷' } ]);
assert.deepEqual(subsInFile('https://sub.example/token#A https://sub.example/token#B'),
	[ { url: 'https://sub.example/token', name: 'A' } ]);
assert.deepEqual(subsInFile('https://sub.example/token#bad%escape'),
	[ { url: 'https://sub.example/token', name: 'bad%escape' } ]);

// Another program's export: named objects, nested.
assert.deepEqual(subsInFile(JSON.stringify({ subscriptions: [
	{ remarks: 'Home', url: 'https://a.example/sub?token=1', enabled: true },
	{ name: 'Work', link: 'http://b.example/s' },
	{ url: 'https://c.example/list' }
] })), [
	{ url: 'https://a.example/sub?token=1', name: 'Home' },
	{ url: 'http://b.example/s', name: 'Work' },
	{ url: 'https://c.example/list', name: '' }
]);

// A plain array, a name-to-address map, and the same address twice.
assert.deepEqual(subsInFile('["https://x.example/1", "https://x.example/1", "vless://not-a-sub"]'),
	[ { url: 'https://x.example/1', name: '' } ]);
assert.deepEqual(subsInFile('{ "My list": "https://m.example/a" }'),
	[ { url: 'https://m.example/a', name: 'My list' } ]);

// Not JSON: one address a line, anything else ignored.
assert.deepEqual(subsInFile('https://t.example/a\nvless://x\n\nhttps://t.example/b\n').map(x => x.url),
	[ 'https://t.example/a', 'https://t.example/b' ]);
assert.deepEqual(subsInFile('{"outbounds":[{"protocol":"freedom"}]}'), []);

// Added once each, the one already here left alone, names kept unique.
const added = importSubs([
	{ url: 'https://example.com/top100.txt', name: 'Again' },
	{ url: 'https://new.example/a', name: 'Top 100' },
	{ url: 'https://host.example/path?x=1', name: '' }
]);
assert.equal(added, 2);
assert.equal(sections.length, 3);
assert.deepEqual(sections.slice(1).map(s => [ s.name, s.url, s.enabled ]), [
	[ 'Top 100 2', 'https://new.example/a', '1' ],
	[ 'host.example', 'https://host.example/path?x=1', '1' ]
]);
assert.ok(sections.slice(1).every(s => /^s[0-9a-f]{6}$/.test(s['.name'])));
assert.equal(importSubs([ { url: 'https://new.example/a', name: 'x' } ]), 0);
assert.equal(importSubs([ { url: 'https://new.example/a#Another', name: '' } ]), 0);
assert.equal(importSubs([ { url: 'https://hash.example/sub#XXZZ0', name: 'ignored' } ]), 1);
assert.equal(sections[3].name, 'XXZZ0');
assert.equal(sections[3].url, 'https://hash.example/sub');
assert.equal(importSubs([ { url: 'https://hash.example/sub#renamed', name: '' } ]), 0);

// Run the shipped save/change handlers, including a blank optional name.
const fields = {}, input = { name: '', url: 'https://form.example/sub#From%20Link' };
const section = { taboption(tab, type, key) {
	return fields[key] = {
		formvalue: () => input[key],
		getUIElement: () => ({ setValue: value => { input[key] = value; } })
	};
} };
const handlers = new Function('s', 'form', '_', 'uci', 'column',
	'var o;\n' + piece('var NAME_KEYS', 'function done(') +
	piece('\t\tvar nameOption =', '\t\t/* A source that is a file') +
	'return { name: nameOption, url: urlOption };')(
	section, { Value: {} }, text => text, uci, () => ({}));
uci.add('zirgozar', 'subscription', 'formtest');
assert.equal(handlers.name.rmempty, true);
assert.equal(handlers.name.validate('formtest', ''), true);
handlers.name.write('formtest', '');
handlers.url.write('formtest', input.url);
assert.equal(uci.get('zirgozar', 'formtest', 'name'), 'From Link');
assert.equal(uci.get('zirgozar', 'formtest', 'url'), 'https://form.example/sub');
handlers.url.onchange(null, 'formtest', 'https://form.example/sub#%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%DA%A9');
assert.equal(input.name, 'اشتراک');
input.name = ''; input.url = 'https://fallback.example/list';
handlers.url.write('formtest', input.url);
assert.equal(uci.get('zirgozar', 'formtest', 'name'), 'fallback.example');

console.log('Subscription import passed: exports, plain lists, name maps, text files, duplicates and unique names');
