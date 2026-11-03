/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/traffic.js'),'utf8');
function E(tag,attrs={},children=[]) {
 const node={tag,attrs,children:[],value:attrs.value || '',checked:false,hidden:false,
  appendChild(child){this.children.push(child);return child;},
  removeChild(child){this.children.splice(this.children.indexOf(child),1);},
  setAttribute(key,value){this.attrs[key]=value;},getAttribute(key){return this.attrs[key];},
  addEventListener(key,fn){this.attrs[key]=fn;},
  querySelectorAll(selector){const tags=selector.split(',').map(v=>v.trim());return this.children.flatMap(child=>typeof child==='object'?[...(tags.includes(child.tag)?[child]:[]),...child.querySelectorAll(selector)]:[]);}
 };
 Object.defineProperty(node,'firstChild',{get(){return this.children[0];}});
 Object.defineProperty(node,'textContent',{get(){return this.children.map(child=>typeof child==='string'?child:child.textContent).join('');},set(value){this.children=[String(value)];}});
 node.classList={toggle(){}};
 if (Array.isArray(children)) node.children=children.filter(Boolean);else node.textContent=children;
 return node;
}
const calls=[],config={route_ir:'0',route_games:'0',block_ads:'0',block_quic:'auto'};
let rejectNext=false;
const helpers=source.slice(source.indexOf('var routingSaved ='),source.indexOf('return view.extend({'));
const {routingManager}=new Function('uci','E','pui','_','callAction',helpers+';return {routingManager};')(
 {get:(pkg,section,key)=>config[key]}, E,
 {btn:(label,tone,fn)=>E('button',{click:fn},label)},text=>text,
 async (action,arg)=>{assert.equal(action,'routing_set');const change=JSON.parse(arg);calls.push(change);if(rejectNext){rejectNext=false;return {error:'Could not save settings.'};}return {ok:true};}
);
(async()=>{
 const panel=routingManager();
 const toggles=panel.querySelectorAll('input').filter(node=>node.attrs.type==='checkbox');
 assert.equal(toggles.length,4);
 toggles[3].checked=true;await toggles[3].attrs.change();
 assert.deepEqual(calls.at(-1),{key:'route_games',value:'1'});
 rejectNext=true;toggles[0].checked=true;await toggles[0].attrs.change();
 assert.equal(toggles[0].checked,false,'failed immediate save restores switch');
 const input=panel.querySelectorAll('input').find(node=>node.attrs.type==='text');
 const add=panel.querySelectorAll('button').find(node=>node.textContent==='Add');
 input.value='Games.Example.';await add.attrs.click();
 assert.deepEqual(calls.at(-1),{key:'game_domain',value:['geosite:category-games','games.example']});
 const before=calls.length;input.value='https://invalid.example/path';await add.attrs.click();assert.equal(calls.length,before,'invalid domain is not sent');
 const remove=panel.querySelectorAll('button').find(node=>node.textContent==='Remove');
 await remove.attrs.click();
 assert.deepEqual(calls.at(-1).value,['games.example'],'default category can be removed');
 await panel.querySelectorAll('button').find(node=>node.textContent==='Remove').attrs.click();
 assert.deepEqual(calls.at(-1).value,[],'last domain deletion is saved');
 const returned=routingManager();
 assert.equal(returned.querySelectorAll('input').filter(node=>node.attrs.type==='checkbox')[3].checked,true,'returning to page uses saved value despite stale UCI cache');
 assert.equal(returned.querySelectorAll('button').filter(node=>node.textContent==='Remove').length,0,'empty saved list survives navigation');
 assert.equal(panel.children[0].tag,'h3');
 assert.equal(panel.children[0].textContent,'Traffic management');
 assert.ok(!source.includes('routingTabs('),'no extra routing tabs');
 console.log('Routing management: section heading, immediate toggles, failure rollback, domain add/remove and validation passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
