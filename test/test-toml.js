/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'../package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar');
const tomlSource=fs.readFileSync(path.join(base,'toml.js'),'utf8');
const toml=new Function('baseclass',tomlSource)({extend:value=>value});
const source=fs.readFileSync(path.join(base,'nodelink.js'),'utf8');
const helpers=source.slice(source.indexOf('function normalizeSingboxProfile('),source.indexOf('function withBrowse('));
let requested=0;
const readProfileFile=new Function('L','_',helpers+';return readProfileFile;')({require:async name=>{assert.equal(name,'zirgozar.toml');requested++;return toml;}},text=>text);
const fixture=`# A profile represented as TOML
[dns]
final = "local-dns"
[[dns.servers]]
type = "local"
tag = "local-dns"
[[outbounds]]
type = "vless"
tag = "تست"
server = "example.com"
server_port = 443
uuid = "11111111-2222-3333-4444-555555555555"
[outbounds.tls]
enabled = true
server_name = "example.com"
[[outbounds]]
type = "direct"
tag = "direct"
[route]
final = "تست"
`;
(async()=>{
 await readProfileFile(Buffer.from('{}'),'file.json');assert.equal(requested,0,'JSON does not load the TOML parser');
 const result=await readProfileFile(Buffer.from(fixture),'profile.TOML');
 const config=JSON.parse(result.text);
 assert.equal(result.toml,true);assert.equal(result.repaired,true);
 assert.equal(config.outbounds[0].tag,'تست');assert.equal(config.outbounds[0].tls.enabled,true);
 assert.equal(config.outbounds[0].server_port,443);assert.equal(config.route.default_domain_resolver.server,'local-dns');
 const clash=await readProfileFile(Buffer.from('[[proxies]]\nname="server"\ntype="ss"\nserver="example.com"\nport=443\ncipher="aes-128-gcm"\npassword="fixture"'),'clash.toml');
 assert.equal(JSON.parse(clash.text).proxies[0].type,'ss');
 const special=toml.parse('"escaped.key" = "value"\nstr = \"\"\"line1\nline2\"\"\"\nlist = [1, 2, 3]\ninline = { flag = true }');
 assert.equal(special['escaped.key'],'value');assert.equal(special.str,'line1\nline2');assert.equal(special.inline.flag,true);
 assert.throws(()=>toml.parse('a=1\na=2'));
 assert.throws(()=>toml.parse('a.b=1\n[a]\nb=2'));
 await assert.rejects(readProfileFile(Buffer.from('[[outbounds]'),'invalid.toml'),/Invalid TOML/);
 await assert.rejects(readProfileFile(Buffer.from('title="unrelated settings"'),'unrelated.toml'),/does not contain supported/);
 await assert.rejects(readProfileFile(Buffer.alloc(8*1024*1024+1),'huge.toml'),/too large/);
 const before=Object.prototype.polluted;toml.parse('[__proto__]\npolluted=true');assert.equal(Object.prototype.polluted,before);
 var output=result.text;
 if(process.env.RIG_TOML_FILE) {
  const actual=await readProfileFile(fs.readFileSync(process.env.RIG_TOML_FILE),'profile.toml');
  const parsed=JSON.parse(actual.text);
  const count=(parsed.outbounds||parsed.proxies||[]).filter(o=>!['direct','block','dns','selector','urltest'].includes(o.type)).length;
  console.log('Provided TOML profile: '+count+' servers; resolver repaired='+actual.repaired);
  output=actual.text;
 }
 if(process.env.RIG_TOML_OUTPUT)fs.writeFileSync(process.env.RIG_TOML_OUTPUT,output);
 console.log('TOML: lazy loading, nested tables, arrays of tables, Unicode, Clash, multiline strings, duplicate keys, invalid input and pollution protection passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
