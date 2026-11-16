/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/status.js'), 'utf8');
const pending = [], rendered = [], saved = new Map();
const api = new Function('rpc', 'i18n', 'window', 'capture',
 source.slice(0, source.indexOf('\nreturn baseclass.extend(')) + `
 renderState = function(st) { lastState = st; capture(st); };
 return { refreshState, cachedState };
 `)(
 {declare: () => () => new Promise((resolve,reject) => pending.push({resolve,reject}))},
 {tr: s => s}, {sessionStorage:{getItem:k=>saved.get(k), setItem:(k,v)=>saved.set(k,v)}}, st=>rendered.push(st));
(async () => {
 let request = api.refreshState();
 pending.shift().resolve({enabled:true,connected:true,core_running:true,status:'ready'});
 await request;
 assert.equal(rendered.at(-1).connected,true);
 assert.equal(api.cachedState().stale,true);
 request = api.refreshState();
 pending.shift().reject(new Error('RPC unavailable'));
 await request;
 assert.equal(rendered.at(-1).stale,true);
 assert.equal(rendered.at(-1).connected,false);
 request = api.refreshState();
 pending.shift().resolve({});
 await request;
 assert.equal(rendered.at(-1).stale,true);
 const old = api.refreshState(), newer = api.refreshState();
 const oldReply=pending.shift(), newReply=pending.shift();
 newReply.resolve({enabled:true,connected:true,core_running:true,status:'ready'});
 await newer;
 oldReply.reject(new Error('late failure'));
 await old;
 assert.equal(rendered.at(-1).connected,true);
 assert.equal(rendered.at(-1).stale,undefined);
 console.log('Status freshness: RPC failures, malformed replies, cached data, recovery and response races passed');
})().catch(error => { console.error(error); process.exitCode=1; });
