/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const parser = path.join(__dirname, '../package/zirgozar/files/zgz-aether-scan-result');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zgz-scan-result-'));
try {
 const cases = [
  ['masque', 'selected MASQUE gateway 162.159.198.201:443', {endpoint: '162.159.198.201:443'}],
  ['wg', 'selected WireGuard endpoint [2606:4700::1]:2408', {endpoint: '[2606:4700::1]:2408'}],
  ['gool', 'using cloudflare edge 162.159.192.1:2408 (outer) and 188.114.96.1:2408 (inner)', {outer: '162.159.192.1:2408', inner: '188.114.96.1:2408'}],
  ['mim', 'masque-in-masque ready: 162.159.198.1:443 (outer) and 162.159.199.2:443 (inner)', {outer: '162.159.198.1:443', inner: '162.159.199.2:443'}],
  ['wg-over-masque', 'gool ready: masque 162.159.198.2:443 carries wireguard 162.159.192.1:2408', {outer: '162.159.198.2:443'}]
 ];
 for (const [protocol, line, expected] of cases) {
  fs.writeFileSync(path.join(dir,'protocol'),protocol); fs.writeFileSync(path.join(dir,'aether.log'),line+'\n');
  const result=spawnSync('ucode',[parser,dir,'endpoints'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr); assert.deepEqual(JSON.parse(result.stdout),expected);
 }
 fs.writeFileSync(path.join(dir,'protocol'),'masque');
 fs.writeFileSync(path.join(dir,'aether.log'),'selected MASQUE gateway invalid:port\n');
 assert.notEqual(spawnSync('ucode',[parser,dir,'endpoints']).status,0);
 fs.writeFileSync(path.join(dir,'state'),'cancelled');
 const cancelled=JSON.parse(spawnSync('ucode',[parser,dir],{encoding:'utf8'}).stdout);
 assert.equal(cancelled.running,false); assert.equal(cancelled.state,'cancelled');
 console.log('All Aether scan protocol results, IPv6, invalid endpoints and cancellation state passed');
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
