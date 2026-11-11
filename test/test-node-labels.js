/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/nodelink.js'), 'utf8');
const nameFromLink = new Function(source.slice(source.indexOf('function decodeName'), source.indexOf('async function ')) + '\nreturn nameFromLink;')();
const labels = [
 '🇩🇪 𝑭𝒓𝒂𝒏𝒌𝒇𝒖𝒓𝒕 1',
 '🇹🇷 𝑰𝒔𝒕𝒂𝒏𝒃𝒖𝒍 『ایرانسل』',
 '🇺🇸 𝑵𝒆𝒘 𝒀𝒐𝒓𝒌 『فیبرنوری』',
 '🇬🇧 Slough 2 test | ' + 'نام بلند اشتراک '.repeat(12) + 'پایان 🇮🇷'
];
for (const label of labels) {
 const link = 'vless://11111111-2222-3333-4444-555555555555@example.com:443?encryption=none#' + encodeURIComponent(label);
 assert.equal(nameFromLink(link), label, 'form preserves full Unicode remarks');
 const result = spawnSync('awk', ['-f', path.join(root, 'package/zirgozar/files/zgz-parse')], { input: link + '\n', encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
 assert.equal(result.status, 0, result.stderr || String(result.error));
 const fields = result.stdout.trimEnd().split('\t');
 assert.equal(fields.length, 6);
 assert.equal(fields[1], label, 'parser preserves flags, suffixes and long names');
}
console.log('Node labels: complete Unicode remarks survive form and parser');
