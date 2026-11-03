/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const source = fs.readFileSync(path.join(__dirname,'../package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/nodelink.js'),'utf8');
const helpers=source.slice(source.indexOf('function normalizeSingboxProfile('),source.indexOf('function withBrowse('));
const {readProfileFile,validateProfileInput}=new Function('_',helpers+';return {readProfileFile,validateProfileInput};')(text=>text);
function string(value) {
 const bytes=Buffer.from(value);let length=bytes.length;const prefix=[];
 do {let byte=length&127;length=Math.floor(length/128);prefix.push(byte|(length?128:0));} while(length);
 return Buffer.concat([Buffer.from(prefix),bytes]);
}
const config={dns:{final:'proxy-dns',servers:[{type:'tcp',tag:'proxy-dns',server:'1.1.1.1',detour:'proxy'},{type:'local',tag:'local-dns'}]},outbounds:[{type:'vless',tag:'proxy',server:'example.com',server_port:443,uuid:'11111111-2222-3333-4444-555555555555'}],route:{final:'proxy'}};
function profile(text,type=0,version=1) {
 const kind=Buffer.alloc(4);kind.writeInt32BE(type);
 const parts=[string('پروفایل آزمایشی'),kind,string(text)];
 if(type!==0)parts.push(string('https://example.com/profile'));
 if(type===2||(version===0&&type!==0))parts.push(Buffer.alloc(version>=1?13:9));
 return Buffer.concat([Buffer.from([3,version]),zlib.gzipSync(Buffer.concat(parts))]);
}
(async()=>{
 for(const version of [0,1])for(const type of [0,1,2]) {
  const result=await readProfileFile(profile(JSON.stringify(config),type,version),'test.bpf');
  const parsed=JSON.parse(result.text);
  assert.equal(result.bpf,true);assert.equal(result.repaired,true);
  assert.deepEqual(parsed.outbounds,config.outbounds);
  assert.equal(parsed.route.default_domain_resolver.server,'local-dns','local DNS avoids the proxy resolver dependency');
 }
 const explicit=structuredClone(config);explicit.route.default_domain_resolver={server:'chosen'};
 assert.equal((await readProfileFile(profile(JSON.stringify(explicit)),'file.bpf')).repaired,false);
 const plain=JSON.stringify(config);
 assert.equal((await readProfileFile(Buffer.from(plain),'file.json')).text,plain);
 assert.equal(validateProfileInput(plain),true);
 assert.equal(validateProfileInput('[Interface]\nPrivateKey = x'),true);
 assert.equal(validateProfileInput('proxies: []'),true);
 assert.equal(validateProfileInput('client\nremote example.com 1194'),true);
 assert.equal(validateProfileInput('{bad}'),'Must be JSON text!');
 assert.equal(validateProfileInput('not a profile'),'That does not look like a share link');
 await assert.rejects(readProfileFile(Buffer.from('text'),'bad.bpf'),/Invalid BPF/);
 const unknown=profile(plain);unknown[1]=2;
 await assert.rejects(readProfileFile(unknown,'file.bpf'),/Invalid BPF/);
 await assert.rejects(readProfileFile(profile('{bad}'),'file.bpf'),/Invalid BPF/);
 await assert.rejects(readProfileFile(profile('{}'),'file.bpf'),/Invalid BPF/);
 const corrupt=profile(plain);corrupt[corrupt.length-8]^=255;
 await assert.rejects(readProfileFile(corrupt,'file.bpf'),/Invalid BPF/);
 const truncated=profile(plain).subarray(0,30);
 await assert.rejects(readProfileFile(truncated,'file.bpf'),/Invalid BPF/);
 await assert.rejects(readProfileFile(profile(' '.repeat(8*1024*1024+1)),'file.bpf'),/too large/);
 const unsupported=new Function('DecompressionStream','_',helpers+';return readProfileFile;')(undefined,text=>text);
 await assert.rejects(unsupported(profile(plain),'file.bpf'),/cannot decompress/);
 if(process.env.RIG_BPF_FILE) {
  const result=await readProfileFile(fs.readFileSync(process.env.RIG_BPF_FILE),'Singbox.bpf');
  const parsed=JSON.parse(result.text);
  const serverCount=parsed.outbounds.filter(o=>!['selector','urltest','direct','block','dns'].includes(o.type)).length;
  console.log('Provided profile: '+serverCount+' servers; resolver repaired='+result.repaired);
  if(process.env.RIG_BPF_OUTPUT)fs.writeFileSync(process.env.RIG_BPF_OUTPUT,result.text);
 }
 console.log('BPF: local/cloud/remote v0/v1, UTF-8, DNS preservation, corruption, size limit, JSON validation and browser fallback passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
