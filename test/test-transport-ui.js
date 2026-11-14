/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/transport.js'), 'utf8');
const nodes = [
 {'.name':'a', link:'vless://uuid@example.com:443'},
 {'.name':'b', name:'Backup', link:'socks5://127.0.0.1:1080'},
 {'.name':'c', link:'trojan://password@example.org:443'},
 {'.name':'helper', link:'aether://masque'},
 {'.name':'json', link:JSON.stringify({outbounds:[{protocol:'socks'}]})}
];
const read = (id, key) => nodes.find(n => n['.name'] === id)?.[key];
const transport = new Function('baseclass','form','uci','i18n',source)(
 {extend:x=>x}, {Value:'value',ListValue:'list'}, {sections:()=>nodes,get:(pkg,id,key)=>read(id,key)}, {tr:x=>x}
);
assert.equal(transport.validateFallback(nodes,'a','b',read),true);
assert.equal(transport.validateFallback(nodes,'a','a',read), 'Fallback and proxy chains must not contain loops or missing configs.');
assert.notEqual(transport.validateFallback(nodes,'a','helper',read),true);
assert.notEqual(transport.validateFallback(nodes,'a','gone',read),true);
nodes[1].fallback_failed='c'; nodes[2].fallback_no_ip='a';
assert.notEqual(transport.validateFallback(nodes,'a','b',read),true,'indirect cycle rejected');
delete nodes[2].fallback_no_ip; nodes[2].chain_proxy='1'; nodes[2].preproxy_node='a';
assert.notEqual(transport.validateFallback(nodes,'a','b',read),true,'fallback through pre-proxy cycle rejected');
delete nodes[1].fallback_failed; delete nodes[2].chain_proxy;
const fields={};
transport.addFields({option(type,key,label,description){return fields[key]={type,label,description,choices:[],value(v,l){this.choices.push(v);}}},formvalue:()=>undefined},x=>x,x=>x,'a');
assert.equal(fields.tcp_handshake_timeout.datatype,'and(uinteger,range(0,2147483647))');
assert.equal(fields.tcp_keepalive_count.datatype,'and(uinteger,range(0,127))');
assert.deepEqual(fields.happy_eyeballs_success.choices,['','tcpConnected','tlsHandshakeComplete']);
assert.deepEqual(fields.fallback_failed.choices,['','_none','b','c','json']);
assert.equal(fields.fallback_failed.validate('a','b'),true);
console.log('Transport form: timeout ranges, native config choices, deleted targets and fallback/proxy cycles passed');
