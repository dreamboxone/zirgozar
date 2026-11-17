// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
const assert = require('assert/strict');
const fs = require('fs');
const source = fs.readFileSync('package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/nodes.js', 'utf8');
const start = source.indexOf('function addViaLinks()');
const end = source.indexOf('\nfunction ', start + 1);
const calls = [], notices = [], elements = [];
let modal, reply;
function E(tag, attrs, children) {
 const node = {tag, attrs:attrs || {}, value:'', children:[], appendChild(n) { this.children.push(n); }, removeChild(n) { this.children.splice(this.children.indexOf(n), 1); }, get firstChild() { return this.children[0]; }};
 if (Array.isArray(children)) node.children = children;
 elements.push(node); return node;
}
const open = new Function('E', '_', 'ui', 'pui', 'callAction', 'location', 'window', source.slice(start, end) + '\nreturn addViaLinks;')(
 E, x => x, {showModal:(title, body) => {modal=body;}, hideModal(){}, createHandlerFn:(_, fn) => fn},
 {note:(_,text,kind) => notices.push({text,kind}), listOf:()=>[]},
 async (name,arg) => {calls.push({name,arg});return reply;}, {reload() {}}, {setTimeout() {}}
);
(async () => {
 open();const input=elements.find(n=>n.tag==='textarea');input.value='amnezia://free?country=ir';
 const submit=elements.find(n=>n.tag==='button' && n.attrs.class.includes('positive'));
 reply={added:0,import_error:'Enter the Amnezia verification code shown below.',amnezia_captcha:JSON.stringify({image:'aW1hZ2U='})};
 await submit.attrs.click({currentTarget:submit});
 assert.equal(calls[0].name,'add_links');
 const captcha=elements.find(n=>n.tag==='input');assert.ok(captcha);
 const image=elements.find(n=>n.tag==='img');assert.equal(image.attrs.src,'data:image/png;base64,aW1hZ2U=');
 captcha.value=' ab12 ';reply={added:1,skipped:0,needs:'',packages:''};
 await submit.attrs.click({currentTarget:submit});
 assert.equal(calls[1].name,'amnezia_captcha');assert.deepEqual(JSON.parse(calls[1].arg),{link:input.value,solution:'ab12'});
 open();const box=elements.filter(n=>n.tag==='textarea').at(-1);box.value='amnezia://free?country=ir';
 const button=elements.filter(n=>n.tag==='button' && n.attrs.class.includes('positive')).at(-1);
 reply={added:0,import_error:'rejected',amnezia_captcha:JSON.stringify({image:'https://invalid.example/track'})};
 const before=elements.filter(n=>n.tag==='img').length;await button.attrs.click({currentTarget:button});
 assert.equal(elements.filter(n=>n.tag==='img').length,before,'remote CAPTCHA URLs must not load');
 console.log('Amnezia UI: CAPTCHA display, retry and remote-image rejection passed');
})().catch(e=>{console.error(e);process.exit(1);});
