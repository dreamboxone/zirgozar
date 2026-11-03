/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/node.js'),'utf8');
const start=source.indexOf('\n\tload: function() {',source.indexOf('return view.extend({'));
const end=source.indexOf('\n\trender: function(data)',start);
function load(search,uci,requests) {
 const calls=['nodes','lan','origins','subnodes','balancing'].map(name=>(arg)=>{
  requests.push({name,arg});
  if(search==='?new=file')return new Promise(()=>{});
  return Promise.resolve(name==='nodes'?{nodes:[{tag:'a'}]}:name==='origins'?{origins:{a:'manual'}}:{});
 });
 return new Function('window','uci','callNodes','callLan','callNodeOrigins','callSubNodes','callBalancingNodes','pui','return ({'+source.slice(start,end)+'}).load();')({location:{search}},uci,...calls,{loadInfo:(key,fn)=>fn(),infoRevision:()=>''});
}
(async()=>{
 let ready;const requests=[];
 const pending=load('?new=file',{load:()=>new Promise(resolve=>{ready=resolve;})},requests);
 assert.equal(requests.length,0,'file form does not ask for server, subscription or balancing data');
 ready('config');const data=await pending;
 assert.equal(data[0],'config');assert.deepEqual(data[1],{nodes:[]});
 const failed=await load('?new=file',{load:()=>Promise.reject(new Error('offline'))},[]);
 assert.equal(failed[0],null,'failed UCI fetch does not hang');
 for(const search of ['?new=1','?sid=existing','?new=file&sid=existing']) {
  const requests=[];const data=await load(search,{load:()=>Promise.resolve()},requests);
  assert.equal(requests.length,search==='?new=1'?5:3,'existing ordinary configs skip candidate and origin scans');
  if(search==='?new=1')assert.equal(data[3].a,'manual');
 }
 const profileRequests=[];
 const profile=await load('?sid=profile',{load:()=>Promise.resolve('config'),get:()=>'{\"outbounds\":[]}'},profileRequests);
 assert.equal(profileRequests.length,0,'existing JSON profile edit skips unrelated origin and balancing RPCs');
 assert.equal(profile[0],'config');
 console.log('Add file load: no dependency on slow server RPCs; UCI failure and structured editing passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
