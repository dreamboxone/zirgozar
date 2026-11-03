/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let source=fs.readFileSync(path.join(__dirname,'../package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/navigation.js'),'utf8');
source=source.replace('mount:mount, navigate:navigate','mount:mount, navigate:navigate, route:route');
const events={},location={value:new URL('http://router/cgi-bin/luci/admin/services/zirgozar/nodes'),
 get href(){return this.value.href},set href(value){this.value=new URL(value,this.value)},
 get origin(){return this.value.origin},get pathname(){return this.value.pathname},get search(){return this.value.search}};
let confirms=true,unloads=0,imports=0,contentWrites=0,oldPoll=()=>{},newPoll=()=>{};
const poll={queue:[{fn:oldPoll}],remove(fn){this.queue=this.queue.filter(e=>e.fn!==fn)}};
function element(){return {parentNode:null,appendChild(child){child.parentNode=this},querySelector(){return null},remove(){}}}
const vp=element();vp.appendChild=function(child){child.parentNode=this};
const document={getElementById:()=>vp,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn)=>events[name]=fn};
const window={location,confirm:()=>confirms,addEventListener:(name,fn)=>events[name]=fn,
 history:{pushState(state,title,value){location.href=value;this.state=state},replaceState(state,title,value){location.href=value;this.state=state},go(delta){this.delta=delta}}};
let api;
const views={};
function instance(name){return {load(){poll.queue.push({fn:newPoll});return Promise.resolve(name)},render(){return element()},addFooter(){return element()},handleSave(){return Promise.resolve()}}}
const L={loaded:true,env:{},url:()=>'/cgi-bin/luci/admin/services/zirgozar',require(name){imports++;const v=views[name]||instance(name);api.mount(v);return Promise.resolve(v)}};
api=new Function('baseclass','dom','poll','rpc','uci','ui','i18n','window','document','L','E','URL',source)(
 {extend:v=>v},{content(parent,child){contentWrites++;child.parentNode=parent},append(parent,child){parent.appendChild(child)}},poll,{call(){}},
 {unload(){unloads++}},{hideModal(){},addNotification(){throw new Error('unexpected navigation error')}},{tr:x=>x},window,document,L,element,URL);
(async()=>{
 assert.equal(api.route('http://other/cgi-bin/luci/admin/services/zirgozar/nodes'),null);
 assert.equal(api.route('/cgi-bin/luci/admin/services/zirgozar/unknown'),null);
 assert.equal(api.route('/cgi-bin/luci/admin/services/zirgozar/node?sid=abc').page,'node');
 await api.mount(instance('nodes'));
 assert.equal(contentWrites,1);
 await api.navigate('/cgi-bin/luci/admin/services/zirgozar/settings');
 assert.equal(imports,1);assert.equal(unloads,1);assert.equal(L.env.dispatchpath[3],'settings');
 assert.ok(poll.queue.some(e=>e.fn===oldPoll),'global polls survive');
 assert.equal(poll.queue.filter(e=>e.fn===newPoll).length,1,'old page polls are removed');
 events.input({isTrusted:true,target:{closest:()=>true}});confirms=false;
 const before=location.href;await api.navigate('/cgi-bin/luci/admin/services/zirgozar/nodes');
 assert.equal(location.href,before,'declining navigation preserves the current form');
 confirms=true;await api.navigate('/cgi-bin/luci/admin/services/zirgozar/nodes');
 assert.equal(imports,1,'previously loaded view modules are reused');
 await api.navigate('/cgi-bin/luci/admin/services/zirgozar/settings');
 assert.equal(imports,1);assert.equal(unloads,3,'settings are refreshed on each accepted navigation');
 console.log('Navigation: internal routes, view reuse, fresh settings, poll cleanup and unsaved-form protection passed');
})().catch(e=>{console.error(e);process.exitCode=1});
