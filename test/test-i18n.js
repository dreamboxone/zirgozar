/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar');
const read = name => fs.readFileSync(path.join(root, name + '.js'), 'utf8');
assert.match(read('i18n'), /'Sweden': 'سوئد'/u, 'Preserve the requested spelling of Sweden');
assert.doesNotMatch(read('i18n').replaceAll('سوئد', ''), /[\u064b-\u065f\u0670\u0621\u0623\u0624\u0625\u0626\u06c0]/u, 'Persian interface text must not contain hamza or vowel marks, except Sweden');
const baseclass = { extend: value => value };
for (const language of ['zh', 'ru']) {
	const keys = [...read('lang_' + language).matchAll(/^\t("(?:[^"\\]|\\.)*")\s*:/gm)].map(match => JSON.parse(match[1]));
	assert.equal(new Set(keys).size, keys.length, language + ' duplicate translation key');
}
const zh = new Function('baseclass', read('lang_zh'))(baseclass);
const ru = new Function('baseclass', read('lang_ru'))(baseclass);
const source = read('i18n');
const original = { _: text => 'host:' + text };
const i18n = new Function('baseclass', 'zh', 'ru', 'window', 'E', source)(
	{ extend: value => value }, zh, ru, original, (tag, attrs, children) => ({ tag, attrs, children })
);
const dictionaries = new Function('zh', 'ru', source.slice(0, source.indexOf('return baseclass.extend(')) + 'return Object.assign({}, FA, LUCI_FA);')(zh, ru);
for (const [language, catalog] of Object.entries({ zh: zh.strings, ru: ru.strings })) {
	for (const [key, value] of Object.entries(dictionaries)) {
		assert.ok(Object.hasOwn(catalog, key), language + ' missing ' + key);
		assert.ok(catalog[key].trim(), language + ' empty ' + key);
	}
	for (const [key, value] of Object.entries(catalog)) {
		assert.deepEqual(value.match(/%[sdifux]/g) || [], key.match(/%[sdifux]/g) || [], language + ' formatting: ' + key);
		assert.ok(!/QZX|XZQ|▁/.test(value), language + ' invalid token: ' + key);
	}
	i18n.setLang(language);
	assert.equal(i18n.get(), language);
	assert.equal(i18n.dir(), 'ltr');
	assert.equal(i18n.tr('Save & Apply'), catalog['Save & Apply']);
	assert.equal(original._('Save & Apply'), catalog['Save & Apply']);
	assert.equal(original._('Outside the application'), 'host:Outside the application');
	assert.equal(i18n.tr('192.0.2.1:443'), '192.0.2.1:443');
}
i18n.setLang('fa');
assert.equal(i18n.dir(), 'rtl');
assert.equal(i18n.tr('Import share links'), 'وارد کردن لینک');
assert.equal(original._('Save'), 'ذخیره');
i18n.setLang('en');
assert.equal(i18n.tr('All configs'), 'All nodes');
assert.equal(original._('Save'), 'host:Save');
i18n.setLang('unknown');
assert.equal(i18n.get(), 'en');
assert.deepEqual(Object.keys(i18n.languages()), ['en', 'fa', 'zh', 'ru']);

const installReasons = [
	'the downloaded archive does not match the release SHA-256 checksum',
	'the version check was killed (SIGKILL). Check the kernel log for an out-of-memory event',
	'could not write the executable to the installation path'
];
for (const [language, catalog] of Object.entries({ fa: dictionaries, zh: zh.strings, ru: ru.strings })) {
	i18n.setLang(language);
	for (const reason of installReasons) {
		const summary = catalog['Core installation failed for %s: %s.'].replace('%s', 'xray').replace('%s', catalog[reason]);
		const message = 'Core installation failed for xray: ' + reason;
		assert.equal(i18n.tr(message + '.'), summary);
		assert.equal(i18n.tr(message + ' (exit status 137). Details: write error at $&/%s'),
			summary + ' ' + catalog['Exit status: %s.'].replace('%s', '137') + ' ' +
			catalog['Details: %s'].replace('%s', () => 'write error at $&/%s'));
	}
}
i18n.setLang('fa');
assert.match(i18n.tr('Core installation failed for vwarp: the version check ended with an illegal instruction (SIGILL). Check CPU compatibility (exit status 132). Details: Illegal instruction'),
	/دستور نامعتبر پردازنده$/);
i18n.setLang('en');
const rawFailure = 'Core installation failed for xray: the executable failed its version check (exit status 1). Details: invalid config';
assert.equal(i18n.tr(rawFailure), rawFailure);
console.log('Languages: complete Chinese/Russian catalogs, formatting, language switching, LuCI controls and Persian direction passed');
