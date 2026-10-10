/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/i18n.js'), 'utf8');
const i18n = new Function('baseclass', 'window', source)({ extend: value => value }, { _: value => value });
const helper = fs.readFileSync(path.join(root, 'package/zirgozar/files/zgz-aether'), 'utf8');
const messages = [...helper.matchAll(/\bfail '([^']+)'/g)].map(match => match[1]);
for (const filename of ['zgz-cores', 'zgz-mkconfig', 'zirgozar.init', 'zgz-nodes']) {
 const backend = fs.readFileSync(path.join(root, 'package/zirgozar/files/' + filename), 'utf8');
 for (const match of backend.matchAll(/say_message ["']([^"'\n]+)["']/g)) {
  if ((/Aether/.test(match[1]) || filename === 'zgz-nodes') && !/\$/.test(match[1])) messages.push(match[1]);
 }
}
messages.push('The installed Aether does not support --masque-sni.', 'Aether has no supported build for mipsel_24kc.');
i18n.setLang('fa');
for (const message of messages) {
 const translated = i18n.tr(message);
 assert.notEqual(translated, message, message);
 assert.match(translated, /[\u0600-\u06ff]/, message);
 assert.ok(!translated.includes('%s'), message);
}
assert.equal(i18n.tr('Aether did not connect within two minutes. Check its exit-node and the Runtime Logs page.'),
 'اتر در دو دقیقه وصل نشد. نود خروجی آن و صفحهٔ گزارش‌های اجرا را بررسی کنید.');
i18n.setLang('en');
for (const message of messages) assert.equal(i18n.tr(message), message);
console.log('Aether runtime messages translated in Persian; English text and option identifiers preserved');
