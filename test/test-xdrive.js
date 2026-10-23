/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const net = require('node:net');
const http = require('node:http');
const dgram = require('node:dgram');
const root = path.join(__dirname, '..');
const resources = path.join(root, 'package/luci-app-zirgozar/root/www/luci-static/resources');
const read = file => fs.readFileSync(path.join(resources, file), 'utf8');
const nodeSource = read('view/zirgozar/node.js');
const api = new Function('rpc', 'i18n', nodeSource.slice(0, nodeSource.indexOf('\nreturn view.extend(')) + '\nreturn {parseLink, buildLink};')(
	{ declare: () => () => Promise.resolve({}) }, { tr: v => v });
const links = new Function('baseclass', 'i18n', read('zirgozar/nodelink.js'))({ extend: v => v }, { tr: v => v });
const id = '11111111-2222-3333-4444-555555555555';
const encryption = 'mlkem768x25519plus.native.0rtt.apQiS2-cDV2HqW1e13TSG6p4v9NCRVDln8RCeA3kDmM';
const decryption = 'mlkem768x25519plus.native.600s.iGNJoyV9gKt7Xbn8ypzLqxEiXtt2v61Wh_fLzj6UUWk';
const drive = {
	service: 'google-drive', remoteFolder: 'folder-id', secrets: ['client', 'secret', 'token'],
	xmux: { maxConnections: 2, hMaxReusableSecs: '1800-3000' }, segmentBytes: 65536
};
const template = {
	service: 'template', remoteFolder: 'folder', xmux: { maxConcurrency: '1-2' },
	template: {
		put: { url: 'https://example.com/upload?path={name}', hrefPath: 'href', hrefMethod: 'PUT' },
		get: { url: 'https://example.com/download?path={name}', hrefPath: 'href' },
		delete: { method: 'DELETE', url: 'https://example.com/files/{name}' },
		list: { url: 'https://example.com/list', namesPath: 'files', namePath: 'name' }
	}
};
for (const settings of [drive, template, {service:'local', remoteFolder:'/tmp/xdrive-test'}])
	assert.equal(links.validateXdrive(JSON.stringify(settings)), true);
for (const settings of [null, [], {}, {service:'unknown', remoteFolder:'x'},
	{service:'google-drive', remoteFolder:'x', secrets:['one']},
	{service:'template', remoteFolder:'x', template:[]},
	{service:'local', remoteFolder:'x', xmux:[]},
	{service:'local', remoteFolder:'x', xmux:{maxConnections:1,maxConcurrency:1}}])
	assert.notEqual(links.validateXdrive(JSON.stringify(settings)), true);
const inputs = [];
for (const protocol of ['vless']) {
	const f = {proto:protocol, address:'example.com', port:'443', uuid:id, password:'pass', user:'user',
		type:'xdrive', security:protocol === 'socks' || protocol === 'http' ? 'none' : 'tls', alpn:'h3',
		encryption, xdrive_settings:JSON.stringify(drive, null, 2), rest:{future:'kept'}};
	const link = api.buildLink(f, protocol);
	const parsed = api.parseLink(link);
	assert.equal(parsed.type, 'xdrive');
	assert.deepEqual(JSON.parse(parsed.xdrive_settings), drive);
	assert.equal(parsed.rest.future, 'kept');
	assert.deepEqual(JSON.parse(api.parseLink(api.buildLink(parsed, protocol)).xdrive_settings), drive);
	inputs.push(link);
}
const serverSource = read('view/zirgozar/server.js');
let serverValues = {protocol:'vless',port:'443',uuid:[id],transport:'xdrive',security:'tls',alpn:['h3'],vless_decryption:decryption,
	link_address:'example.com',vless_encryption:encryption,xdrive_settings:JSON.stringify(template,null,2)};
const share = new Function('rpc','uci','i18n',serverSource.slice(0,serverSource.indexOf('\nreturn view.extend(')) + '\nreturn shareLink;')(
	{declare:()=>()=>{}},{get:(_c,_sid,key)=>serverValues[key]},{tr:v=>v});
for (const protocol of ['vless']) {
	serverValues.protocol = protocol;
	const link = share('test');
	assert.deepEqual(JSON.parse(api.parseLink(link).xdrive_settings), template);
	assert.equal(api.parseLink(link).encryption,encryption);
	assert.ok(!decodeURIComponent(link).includes(decryption),'the server decryption key must stay out of share links');
	inputs.push(link);
}
console.log('XDRIVE forms: nested settings, XMUX, two-step templates and client/server share links passed');

if (process.platform === 'win32') {
	console.log('XDRIVE shell checks: run this suite on Linux or WSL');
	return;
}
const work = fs.mkdtempSync(path.join(os.tmpdir(),'zgz-xdrive-'));
const parser = path.join(root,'package/zirgozar/files/zgz-parse');
const core = process.env.RIG_XDRIVE_XRAY;
let liveJob;
function command(binary,args,input) {
	const result = spawnSync(binary,args,{input,encoding:'utf8',env:{...process.env,LC_ALL:'C'}});
	assert.equal(result.status,0,result.stderr || result.stdout);
	return result.stdout;
}
function checkCore(config,name) {
	if (!core) return;
	const file = path.join(work,name+'.json');
	fs.writeFileSync(file,JSON.stringify(config));
	command(core,['run','-test','-config',file]);
}
function parse(input,decorate=false) {
	return command('awk',decorate?['-v','DECORATE=1','-f',parser]:['-f',parser],input+'\n')
		.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line.split('\t').at(-1)));
}
function quote(v) { return "'"+String(v).replace(/'/g,"'\\''")+"'"; }
const serverScript = fs.readFileSync(path.join(root,'package/zirgozar/files/zgz-server'),'utf8')
	.replace(/^\. .*zgz-common\.sh.*$/m,'');
const functions = serverScript.slice(0,serverScript.lastIndexOf('\ncase "$1" in'));
function serverConfig(values) {
	const cases = Object.entries(values).map(([key,val])=>key+") printf '%s\\n' "+quote(val)+' ;;').join('\n');
	const harness = functions + '\ns_get() { case "$2" in\n'+cases+'\nesac; }\n'+
		's_list() { s_get "$@" | tr " " "\\n"; }\nusers() { echo test; }\n'+
		'uci() { return 0; }\nj() { printf "%s" "$1"; }\nchain_outbounds() { :; }\n'+
		'jsonfilter() { python3 -c '+quote('import json,sys; print(json.dumps(json.load(sys.stdin),separators=(",",":")))')+'; }\nconfig_xray\n';
	return spawnSync('sh',['-c',harness],{encoding:'utf8'});
}
async function liveChecks() {
	const children=[];
	const logs={};
	const site=http.createServer((_req,res)=>res.end('xdrive-ok'));
	const echo=dgram.createSocket('udp4');
	echo.on('message',(data,peer)=>echo.send(data,peer.port,peer.address));
	const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
	async function unusedPort() { const socket=net.createServer(); const port=await listen(socket); await new Promise(resolve=>socket.close(resolve)); return port; }
	async function start(config,name) {
		config.log={loglevel:'info'};
		const file=path.join(work,name+'.json'); fs.writeFileSync(file,JSON.stringify(config));
		const child=spawn(core,['run','-config',file],{stdio:['ignore','pipe','pipe']}); children.push(child);
		await new Promise((resolve,reject)=>{
			let output=''; const timeout=setTimeout(()=>reject(new Error('Core startup timed out: '+output)),7000);
			function ready(data) { output+=data; logs[name]=output.slice(-12000); if (/Xray .* started/.test(output)) {clearTimeout(timeout);resolve();} }
			child.stdout.on('data',ready); child.stderr.on('data',ready);
			child.once('error',error=>{clearTimeout(timeout);reject(error);});
			child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Core exited '+code+': '+output));});
		});
	}
	function handshake(port) {
		return new Promise((resolve,reject)=>{
			let received=Buffer.alloc(0);
			const socket=net.connect(port,'127.0.0.1',()=>socket.write(Buffer.from([5,1,0])));
			socket.setTimeout(3000,()=>{socket.destroy();reject(new Error('SOCKS handshake timed out'));});
			socket.on('data',data=>{received=Buffer.concat([received,data]);socket.end();});
			socket.on('error',error=>{if(error.code==='ECONNRESET')resolve(received);else reject(error);});
			socket.on('close',()=>resolve(received));
		});
	}
	try {
		const targetPort=await listen(site), socksPort=await unusedPort();
		const local={service:'local',remoteFolder:path.join(work,'storage'),pollIntervalMs:10,maxPollIntervalMs:20};
		const server=JSON.parse(serverConfig({protocol:'vless',port:'23456',uuid:id,transport:'xdrive',security:'none',
			vless_decryption:decryption,xdrive_settings:JSON.stringify(local),accept_lan:'1'}).stdout);
		// Permit only this loopback fixture through the core's private-target guard.
		server.outbounds[0].settings={finalRules:[{action:'allow',ip:['127.0.0.1'],port:String(targetPort)}]};
		await start(server,'live-server');
		const link=api.buildLink({proto:'vless',uuid:id,encryption,address:'unused.invalid',port:'443',type:'xdrive',security:'none',xdrive_settings:JSON.stringify(local)},'local');
		await start({inbounds:[{listen:'127.0.0.1',port:socksPort,protocol:'socks',settings:{auth:'noauth'}}],outbounds:parse(link)},'live-client');
		const response=await promisify(execFile)('curl',['--silent','--show-error','--max-time','15','--noproxy','','--proxy',`socks5h://127.0.0.1:${socksPort}`,`http://127.0.0.1:${targetPort}/`],{timeout:17000})
			.catch(error=>{error.message+='\n'+JSON.stringify(logs,null,2);throw error;});
		assert.equal(response.stdout,'xdrive-ok');
		for (const blocked of [false,true]) {
			const port=await unusedPort();
			const config=JSON.parse(serverConfig({protocol:'socks',port,bind_local:'1',filter_allowed:'127.0.0.1',filter_blocked:blocked?'127.0.0.1':''}).stdout);
			await start(config,'live-filter-'+blocked);
			assert.equal((await handshake(port)).toString('hex'),blocked?'':'0500');
		}
		await new Promise(resolve=>echo.bind(0,'127.0.0.1',resolve));
		for (const blocked of [false,true]) {
			const port=await unusedPort(),target=echo.address().port;
			const config=JSON.parse(serverConfig({protocol:'tunnel',port,bind_local:'1',tunnel_address:'127.0.0.1',tunnel_port:target,
				accept_lan:'1',filter_allowed:'127.0.0.1',filter_blocked:blocked?'127.0.0.1':''}).stdout);
			config.outbounds[0].settings={finalRules:[{action:'allow',ip:['127.0.0.1'],port:String(target)}]};
			await start(config,'live-udp-filter-'+blocked);
			const received=await new Promise((resolve,reject)=>{
				const client=dgram.createSocket('udp4');
				const timeout=setTimeout(()=>{client.close();resolve('');},700);
				client.once('message',data=>{clearTimeout(timeout);client.close();resolve(data.toString());});
				client.once('error',error=>{clearTimeout(timeout);client.close();reject(error);});
				client.send(Buffer.from('udp-ok'),port,'127.0.0.1');
			});
			assert.equal(received,blocked?'':'udp-ok');
		}
		console.log('Live XDRIVE transfer and TCP/UDP Finalmask allow/block precedence passed');
	} finally {
		for (const child of children) child.kill();
		await Promise.all(children.map(child=>child.exitCode!==null?Promise.resolve():new Promise(resolve=>child.once('exit',resolve))));
		await new Promise(resolve=>site.close(resolve));
		try { echo.close(); } catch (e) {}
	}
}
try {
	const outbounds = parse(inputs.join('\n'));
	assert.equal(outbounds.length,inputs.length);
	for (let i=0;i<outbounds.length;i++) {
		assert.equal(outbounds[i].streamSettings.network,'xdrive');
		assert.deepEqual(outbounds[i].streamSettings.xdriveSettings,i<1?drive:template);
		assert.deepEqual(outbounds[i].mux,{enabled:true,concurrency:8,xudpConcurrency:8});
		checkCore({outbounds:[outbounds[i]]},'link-'+i);
	}
	const followed = parse(inputs[0]+'\nvless://'+id+'@example.com:443?type=xdrive&security=none#missing');
	assert.deepEqual(followed[1].streamSettings.xdriveSettings,{},'settings must not leak between links');
	const native = {protocol:'vless',settings:{vnext:[{address:'example.com',port:443,users:[{id,encryption}]}]},
		streamSettings:{network:'xdrive',security:'tls',tlsSettings:{alpn:['h3']},xdriveSettings:template}};
	assert.deepEqual(parse(JSON.stringify({outbounds:[native]}))[0].streamSettings.xdriveSettings,template);
	const previousMux=process.env.MUX; process.env.MUX='{"enabled":true,"concurrency":8}';
	const decorated=parse(JSON.stringify(native),true)[0];
	assert.deepEqual(decorated.mux,{enabled:true,concurrency:8,xudpConcurrency:8},'XDRIVE must get the required client Mux');
	if (previousMux==null) delete process.env.MUX; else process.env.MUX=previousMux;
	const probe=fs.readFileSync(path.join(root,'package/zirgozar/files/zgz-probe'),'utf8');
	const shellFunction=name=>probe.match(new RegExp('^'+name+'\\(\\) \\{[\\s\\S]*?^\\}', 'm'))[0];
	const candidates=path.join(work,'candidates.tsv'),alive=path.join(work,'alive.tsv');
	fs.writeFileSync(candidates,'drive\tdrive\tvless\tunused.invalid\t443\t'+JSON.stringify(native)+'\nraw\traw\tvless\tunused.invalid\t443\t{}\n');
	const sift=shellFunction('sift_one')+'\n'+shellFunction('cmd_sift')+'\n'+
		'count() { wc -l < "$1"; }\nprogress() { :; }\nlog() { :; }\nwarn() { :; }\ndirect_dns() { :; }\n'+
		'global_preproxy() { return 1; }\nfirst_hop_is_chained() { return 1; }\ntcp_ms() { echo 0; }\n'+
		'ZGZ_CANDIDATES='+quote(candidates)+'\nALIVE='+quote(alive)+'\nATTEMPTS='+quote(path.join(work,'attempts'))+'\nSIFT_PARALLEL=1\nPREFILTER=tcp\ncmd_sift\n';
	command('sh',['-c',sift]);
	assert.match(fs.readFileSync(alive,'utf8'),/9000\tdrive/);
	assert.ok(!fs.readFileSync(alive,'utf8').includes('raw'),'the TCP prefilter must still reject unreachable raw nodes');
	for (const protocol of ['vless','vmess','trojan','socks','http','shadowsocks','tunnel']) {
		const result=serverConfig({protocol,port:'23456',uuid:id,method:'aes-128-gcm',password:'password',
			tunnel_address:'127.0.0.1',tunnel_port:'12345',transport:'raw',security:'none',filter_allowed:'127.0.0.1 ::1',filter_blocked:'192.0.2.0/24'});
		assert.equal(result.status,0,result.stderr);
		const config=JSON.parse(result.stdout), stream=config.inbounds[0].streamSettings;
		for (const network of ['tcp','udp'])
			assert.deepEqual(stream.finalmask[network],[{type:'filter',settings:{allowedSourceIPs:['127.0.0.1','::1'],blockedSourceIPs:['192.0.2.0/24']}}]);
		checkCore(config,'filter-'+protocol);
	}
	const base={protocol:'vless',port:'23456',uuid:id,transport:'xdrive',security:'none',vless_decryption:decryption,xdrive_settings:JSON.stringify(template,null,2)};
	const result=serverConfig(base);
	assert.equal(result.status,0,result.stderr);
	const config=JSON.parse(result.stdout);
	assert.deepEqual(config.inbounds[0].streamSettings.xdriveSettings,template);
	assert.equal(config.inbounds[0].streamSettings.finalmask,undefined);
	checkCore(config,'server-xdrive');
	const h3=JSON.parse(serverConfig({...base,security:'tls',alpn:'h3',xdrive_settings:JSON.stringify(drive)}).stdout);
	assert.deepEqual(h3.inbounds[0].streamSettings.tlsSettings,{alpn:['h3']},'XDRIVE storage TLS does not need a local server certificate');
	checkCore(h3,'server-xdrive-h3');
	for (const changes of [{xdrive_settings:'not-json'},{xdrive_settings:'[]'},{security:'reality'},{protocol:'vmess'},{vless_decryption:'none'}])
		assert.notEqual(serverConfig({...base,...changes}).status,0,'invalid server settings must fail the whole config');
	console.log('XDRIVE backend: link/JSON imports, global Mux exclusion, inbound filters and invalid server settings passed');
	if (core) console.log('Generated XDRIVE and Finalmask configurations accepted by '+command(core,['version']).split('\n')[0]);
	if (core) liveJob=liveChecks();
} finally {
	if (liveJob) liveJob.catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>fs.rmSync(work,{recursive:true,force:true}));
	else fs.rmSync(work,{recursive:true,force:true});
}
