/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/ui.js'), 'utf8');
const helpers = source.slice(source.indexOf('var infoRequests ='), source.indexOf('function tabs()'));
const saved = new Map();
let now = 1000, count = 0;
const cache = new Function('window','Date','uci', helpers + '; return {loadInfo,infoRevision};')(
 {sessionStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)}},
 {now:()=>now}, {sections:()=>[{name:'test'}]});
(async()=>{
 const request=async()=>({value:++count});
 const [a,b]=await Promise.all([cache.loadInfo('lan',request),cache.loadInfo('lan',request)]);
 assert.deepEqual(a,b);assert.equal(count,1,'concurrent reads share one request');
 await cache.loadInfo('lan',request);assert.equal(count,1,'navigation uses the recent snapshot');
 now+=15001;await cache.loadInfo('lan',request);assert.equal(count,2,'expired metadata is refreshed');
 await cache.loadInfo('lan',request,'changed');assert.equal(count,3,'configuration changes invalidate metadata');
 await assert.rejects(cache.loadInfo('error',()=>Promise.reject(new Error('offline'))));
 await cache.loadInfo('error',request);assert.equal(count,4,'failed requests can be retried');
 await cache.loadInfo('bad',async()=>({error:'failed'}));
 await cache.loadInfo('bad',request);assert.equal(count,5,'error responses are not cached');
 console.log('Choice metadata: deduplication, expiry, revision invalidation and failure recovery passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
