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
 return new Function('window','uci','callNodes','callLan','callNodeOrigins','callSubNodes','callBalancingNodes','return ({'+source.slice(start,end)+'}).load();')({location:{search}},uci,...calls);
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
  assert.equal(requests.length,5,'structured config editing keeps its choices');
  assert.equal(data[3].a,'manual');
 }
 console.log('Add file load: no dependency on slow server RPCs; UCI failure and structured editing passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
