/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * A node given as a link or as a whole file: the name it carries, and the
 * Browse button that puts a file's text in the box. Node List's edit window
 * and the Node Config page's "new config" both take nodes this way.
 */

'use strict';
'require baseclass';
'require form';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';

var _ = i18n.tr;

/* --------------------------------------------------- the name in the link

   Practically every share link ends in #something, and that something is the
   name whoever published it gave the node. A reader who pastes a link and
   leaves the name box empty meant that name, so there is no reason to make
   them type it a second time.

   It is percent-encoded UTF-8, so a Persian name arrives as %D8%B9%D9%84%DB%8C
   and has to be decoded rather than shown as it stands. Some links are not
   encoded at all and carry the characters directly; decodeURIComponent throws
   on those, which is what the catch is for. */
function decodeName(s) {
	s = String(s || '');
	if (!s) return '';
	try { s = decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { /* raw already */ }
	s = s.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
	if (s.length > 60) s = s.slice(0, 60).trim();
	return s;
}

/* vmess is the one that hides its name in the middle rather than at the end:
   the whole link is one base64 object and the name is its "ps" field. atob
   hands back bytes, so a non-English name has to be read back as UTF-8 or it
   comes out as one wrong character per byte. */
function vmessName(link) {
	try {
		var b = link.replace(/^vmess:\/\//i, '').replace(/[#?].*$/, '')
		            .replace(/-/g, '+').replace(/_/g, '/');
		while (b.length % 4) b += '=';
		var raw = atob(b), bytes = new Uint8Array(raw.length);
		for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
		var o = JSON.parse(new TextDecoder('utf-8').decode(bytes));
		return decodeName(o.ps || o.remarks || '');
	} catch (e) {
		return '';
	}
}

function nameFromLink(text) {
	/* By line, not by whitespace: names have spaces in them, and splitting on
	   every space would take “سرور خانه” down to “سرور”. Only a second link
	   on the same line ends the first one's name. */
	var lines = String(text || '').split(/[\r\n]+/);
	/* A WireGuard .conf: the comment a provider puts first, or else the
	   host of its endpoint. */
	if (/^\s*\[(interface|peer)\]/im.test(String(text || ''))) {
		for (var c = 0; c < lines.length; c++) {
			var cm = lines[c].match(/^\s*[#;]\s*(.+?)\s*$/);
			if (cm) return cm[1];
		}
		var ep = String(text).match(/^\s*endpoint\s*=\s*\[?([^\]\s:]+)/im);
		return ep ? ep[1] : '';
	}
	/* An OpenVPN profile: the comment it opens with, or else its first remote. */
	if (/^\s*(client\s*$|remote\s+\S+|<ca>)/im.test(String(text || ''))) {
		for (var o = 0; o < lines.length; o++) {
			var om = lines[o].match(/^\s*[#;]\s*(.+?)\s*$/);
			if (om) return om[1];
		}
		var rm = String(text).match(/^\s*remote\s+(\S+)/im);
		return rm ? rm[1] : '';
	}
	for (var i = 0; i < lines.length; i++) {
		var l = lines[i].trim(), name = '';
		if (l.indexOf('://') < 0) continue;
		var h = l.indexOf('#');
		if (h >= 0) {
			name = l.slice(h + 1);
			var m = name.match(/\s+[a-z][a-z0-9+.-]*:\/\//i);
			if (m) name = name.slice(0, m.index);
			name = decodeName(name);
		} else if (/^vmess:\/\//i.test(l)) {
			name = vmessName(l.split(/\s+/)[0]);
		}
		if (name) return name;
	}
	return '';
}

/* ------------------------------------------------------------ give a file

   A WireGuard .conf and an Xray or sing-box configuration both arrive as
   files, not as a line of text, and asking somebody to open one in an editor
   and copy it out is asking them to do by hand what the browser will do for
   nothing.

   Files are read in the browser before their text goes into the box. Binary
   BPF profiles are decompressed locally into sing-box JSON; the router sees
   the same text format its existing server parser already understands. */
function certificatePEM(buffer) {
	var bytes = new Uint8Array(buffer);
	var text = new TextDecoder().decode(bytes).trim();
	if (/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----$/.test(text)) return text;
	if (bytes[0] != 0x30) throw new Error('Invalid certificate');
	var binary = '';
	for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return '-----BEGIN CERTIFICATE-----\n' + btoa(binary).match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----';
}

function normalizeSingboxProfile(config) {
 if (!config || Array.isArray(config) || !Array.isArray(config.outbounds)) return false;
 var servers = config.dns && config.dns.servers;
 if (!Array.isArray(servers) || (config.route && (typeof config.route !== 'object' || Array.isArray(config.route) || config.route.default_domain_resolver))) return false;
 var local = servers.find(function(server) { return server && server.tag && !server.detour && (server.type === 'local' || server.address === 'local'); });
 var final = servers.find(function(server) { return server && server.tag && server.tag === config.dns.final && !server.detour && server.type !== 'fakeip'; });
 var resolver = local || final;
 if (!resolver) return false;
 if (!config.route) config.route = {};
 config.route.default_domain_resolver = {server:resolver.tag};
 return true;
}

async function readProfileFile(buffer, name) {
 var bytes = new Uint8Array(buffer), limit = 8 * 1024 * 1024;
 var binary = bytes[0] === 3 && bytes.length > 1;
 if (!binary && !/\.bpf$/i.test(name || '')) {
  var plain = new TextDecoder('utf-8').decode(bytes).trim();
  if (!/\.toml$/i.test(name || '')) return {text:plain, bpf:false};
  if (bytes.length > limit) throw new Error(_('TOML file is too large.'));
  var parser = await L.require('zirgozar.toml'), parsed;
  try { parsed = parser.parse(plain,{maxDepth:64}); }
  catch (error) { throw new Error(_('Invalid TOML file.')); }
  if (!['outbounds','endpoints','proxies','nodes','links'].some(function(key) { return Array.isArray(parsed[key]); }) &&
      typeof parsed.type !== 'string' && typeof parsed.protocol !== 'string')
   throw new Error(_('This TOML file does not contain supported server definitions.'));
  var repaired = normalizeSingboxProfile(parsed);
  return {text:JSON.stringify(parsed,null,2), bpf:false, toml:true, repaired:repaired};
 }
 if (!binary || bytes.length < 12 || bytes[1] > 1 || bytes[2] !== 31 || bytes[3] !== 139)
  throw new Error(_('Invalid BPF profile.'));
 if (bytes.length > limit) throw new Error(_('BPF profile is too large.'));
 if (typeof DecompressionStream === 'undefined') throw new Error(_('This browser cannot decompress BPF profiles.'));
 var reader = new Blob([bytes.subarray(2)]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
 var chunks = [], length = 0;
 try {
  while (true) {
   var part = await reader.read();
   if (part.done) break;
   length += part.value.length;
   if (length > limit) { await reader.cancel(); throw new Error(_('BPF profile is too large.')); }
   chunks.push(part.value);
  }
 } catch (error) {
  if (error.message === _('BPF profile is too large.')) throw error;
  throw new Error(_('Invalid BPF profile.'));
 }
 var data = new Uint8Array(length), offset = 0;
 chunks.forEach(function(chunk) { data.set(chunk,offset); offset += chunk.length; });
 var pos = 0, decoder = new TextDecoder('utf-8',{fatal:true});
 function requireBytes(count) { if (count < 0 || count > length - pos) throw new Error(_('Invalid BPF profile.')); }
 function string() {
  var size = 0, shift = 0, value;
  do {
   requireBytes(1); value = data[pos++];
   if (shift >= 28) throw new Error(_('Invalid BPF profile.'));
   size += (value & 127) * Math.pow(2,shift); shift += 7;
  } while (value & 128);
  requireBytes(size);
  var text;
  try { text = decoder.decode(data.subarray(pos,pos + size)); } catch (error) { throw new Error(_('Invalid BPF profile.')); }
  pos += size; return text;
 }
 string();
 requireBytes(4);
 var type = new DataView(data.buffer).getInt32(pos,false); pos += 4;
 if (type < 0 || type > 2) throw new Error(_('Invalid BPF profile.'));
 var text = string();
 if (type !== 0) string();
 if (type === 2 || (bytes[1] === 0 && type !== 0)) {
  requireBytes(1); if (data[pos++] > 1) throw new Error(_('Invalid BPF profile.'));
  requireBytes((bytes[1] >= 1 ? 4 : 0) + 8); pos += (bytes[1] >= 1 ? 4 : 0) + 8;
 }
 if (pos !== length) throw new Error(_('Invalid BPF profile.'));
 var config;
 try { config = JSON.parse(text); } catch (error) { throw new Error(_('Invalid BPF profile.')); }
 if (!config || Array.isArray(config) || (!Array.isArray(config.outbounds) && !Array.isArray(config.endpoints)))
  throw new Error(_('Invalid BPF profile.'));
 var repaired = normalizeSingboxProfile(config);
 return {text:repaired ? JSON.stringify(config,null,2) : text, bpf:true, repaired:repaired};
}

function validateProfileInput(value) {
 if (!value) return true;
 if (/^\s*[\[{]/.test(value) && !/^\s*\[(interface|peer)\]/im.test(value)) {
  try { var config = JSON.parse(value); return config && typeof config === 'object' ? true : _('Must be JSON text!'); }
  catch (error) { return _('Must be JSON text!'); }
 }
 if (/^\s*[A-Za-z_][A-Za-z0-9_.-]*:[ \t]/m.test(value)) return true;
 if (/:\/\//.test(value) || /^\s*\[(interface|peer)\]/im.test(value) || /^\s*(client\s*$|remote\s+\S+|<ca>)/im.test(value)) return true;
 return _('That does not look like a share link');
}

function withBrowse(o, hint, options) {
	options = options || {};
	o.renderWidget = function(section_id, option_index, cfgvalue) {
		var self = this;
		var box = form.TextValue.prototype.renderWidget.apply(this,
			[ section_id, option_index, cfgvalue ]);

		var picker = E('input', {
			'type': 'file',
			'accept': options.accept || '.bpf,.toml,.conf,.ovpn,.txt,.json,.yaml,.yml,text/plain',
			'style': 'display:none',
			'change': function(ev) {
				var f = ev.target.files && ev.target.files[0];
				if (!f) return;
				var reader = new FileReader();
				reader.onload = async function() {
					var value, profile;
					try {
						if (options.certificate) value = certificatePEM(reader.result);
						else { profile = await readProfileFile(reader.result,f.name); value = profile.text; }
					} catch (e) { pui.note(browse, options.certificate ? _('That file could not be read.') : e.message || _('That file could not be read.'), 'error'); return; }
					if (profile && profile.bpf) pui.note(browse, _('BPF profile decoded. Only servers are imported; DNS and routing use Zirgozar settings.'), 'info');
					if (profile && profile.toml) pui.note(browse, _('TOML file converted. Only servers are imported; DNS and routing use Zirgozar settings.'), 'info');
					if (!options.certificate && self.map && self.map.data) self.map.data.set(self.map.config, section_id, 'profile_format', profile && profile.bpf ? 'bpf' : profile && profile.toml ? 'toml' : '');
					var el = self.getUIElement(section_id);
					if (el) el.setValue(value);
					/* setValue puts the text in without telling anyone, so the
					   box went on counting as empty: LuCI had checked it once,
					   when it was empty, and never again - which is why the
					   Save button did nothing and said nothing. The events it
					   listens for are sent by hand. */
					var ta = box.querySelector('textarea');
					if (ta) {
						['input', 'keyup', 'change', 'blur'].forEach(function(t) {
							ta.dispatchEvent(new Event(t, { bubbles: true }));
						});
					}
				};
				reader.onerror = function() {
					pui.note(browse, _('That file could not be read.'), 'error');
				};
				reader.readAsArrayBuffer(f);
				/* So that choosing the same file twice in a row still fires
				   a change. */
				ev.target.value = '';
			}
		});

		var browse = E('button', {
			'class': 'btn cbi-button',
			'click': function(ev) { ev.preventDefault(); picker.click(); }
		}, _('Browse…'));

		return E([ box, E('div', { 'style': 'margin-top:6px' }, [
			browse,
			E('span', { 'style': 'margin-inline-start:8px;font-size:12px;opacity:.65' }, hint),
			picker
		]) ]);
	};
	return o;
}

function validateXdrive(value) {
	var config;
	try { config = JSON.parse(value); } catch (e) { return _('Must be JSON text!'); }
	function object(v) { return v != null && typeof v === 'object' && !Array.isArray(v); }
	if (!object(config)) return _('Must be a JSON object.');
	if (typeof config.remoteFolder !== 'string' || !config.remoteFolder.trim())
		return _('XDRIVE needs a remoteFolder.');
	if ([ 'local', 'google-drive', 'template', 's3' ].indexOf(config.service) < 0)
		return _('XDRIVE service must be local, google-drive, template or s3.');
	if (config.secrets != null && (!Array.isArray(config.secrets) || config.secrets.some(function(v) { return typeof v !== 'string'; })))
		return _('XDRIVE secrets must be an array of strings.');
	if (config.service === 'google-drive' && (!config.secrets || config.secrets.length !== 3 || config.secrets.some(function(v) { return !v.trim(); })))
		return _('Google Drive needs ClientID, ClientSecret and RefreshToken in secrets.');
	if (config.service === 'template' && !object(config.template))
		return _('XDRIVE template must be a JSON object.');
	if (config.service === 's3') {
		var s3 = config.s3, endpoint;
		if (!object(s3)) return _('XDRIVE S3 needs an s3 object.');
		try { endpoint = new URL(s3.endpoint); } catch (e) { return _('S3 endpoint must be an HTTP or HTTPS URL without credentials, query or fragment.'); }
		if (typeof s3.endpoint !== 'string' || !/^https?:\/\//.test(s3.endpoint) || !/^https?:$/.test(endpoint.protocol) ||
			!endpoint.hostname || endpoint.username || endpoint.password || /[?#]/.test(s3.endpoint))
			return _('S3 endpoint must be an HTTP or HTTPS URL without credentials, query or fragment.');
		if (typeof s3.bucket !== 'string' || !s3.bucket || /[\/\\\x00-\x1f\x7f]/.test(s3.bucket) || s3.bucket === '.' || s3.bucket === '..')
			return _('S3 needs a bucket name without path separators.');
		if (s3.region != null && (typeof s3.region !== 'string' || /[\/, \x00-\x20\x7f]/.test(s3.region)))
			return _('Invalid S3 signing region.');
		if (s3.pathStyle != null && typeof s3.pathStyle !== 'boolean')
			return _('S3 pathStyle must be true or false.');
		if (s3.pathStyle === false && (!/^[a-z0-9.-]+$/.test(s3.bucket) || /\.\.|^\.|\.$/.test(s3.bucket) ||
			/^\[|^[0-9.]+$/.test(endpoint.hostname)))
			return _('S3 virtual-hosted addressing needs a DNS endpoint and a DNS-compatible bucket name.');
		var prefix = config.remoteFolder.replace(/\/$/, '');
		if (!prefix || prefix.split('/').some(function(part) { return !part || part === '.' || part === '..'; }) || /[\\\x00-\x1f\x7f]/.test(prefix))
			return _('S3 remoteFolder must be a relative prefix without empty, dot or parent components.');
		if (!config.secrets || config.secrets.length < 2 || config.secrets.length > 3 || !config.secrets[0] || !config.secrets[1] ||
			config.secrets.some(function(v) { return /[\x00-\x08\x0a-\x1f\x7f]/.test(v); }) || /[\/ ,\t]/.test(config.secrets[0]))
			return _('S3 needs AccessKeyID, SecretAccessKey and optionally SessionToken in secrets.');
	}
	if (config.xmux != null && !object(config.xmux)) return _('XMUX must be a JSON object.');
	if (config.xmux && config.xmux.maxConnections && config.xmux.maxConcurrency)
		return _('Set either XMUX maxConnections or maxConcurrency.');
	return true;
}

function recordLink(record) {
	if (!record) return '';
	var r = record.split('\t'), p = r[2], c = JSON.parse(r.slice(5).join('\t'));
	var s = c.settings || {}, stream = c.streamSettings || {}, q = {}, credential = '', scheme = p;
	var endpoint = (s.vnext || s.servers || [])[0] || {}, user = (endpoint.users || [])[0] || {};
	var encode = encodeURIComponent;
	function b64(value) { return btoa(unescape(encodeURIComponent(value))); }
	var security = stream.security || 'none', tls = stream[security + 'Settings'] || {};
	q.security = security; q.type = stream.network || 'tcp';
	q.sni = tls.serverName; q.fp = tls.fingerprint; q.alpn = (tls.alpn || []).join(',');
	q.allowInsecure = tls.allowInsecure ? '1' : undefined;
	if (security == 'reality') { q.pbk = tls.publicKey; q.sid = tls.shortId; q.spx = tls.spiderX; }
	var transport = stream[q.type + 'Settings'] || {};
	q.path = transport.path; q.host = transport.host || (transport.headers || {}).Host;
	q.serviceName = transport.serviceName; q.mode = transport.mode;
	if (q.type == 'xhttp' && transport.extra) q.extra = JSON.stringify(transport.extra);
	if (transport.header) q.headerType = transport.header.type;
	if (p == 'vless') { credential = encode(user.id || ''); q.encryption = user.encryption || 'none'; q.flow = user.flow; }
	else if (p == 'trojan') credential = encode(endpoint.password || '');
	else if (p == 'shadowsocks') { scheme = 'ss'; credential = b64((endpoint.method || '') + ':' + (endpoint.password || '')); }
	else if (p == 'vmess') return 'vmess://' + b64(JSON.stringify({ v:'2', ps:r[1], add:r[3], port:r[4], id:user.id, aid:user.alterId || 0,
		scy:user.security || 'auto', net:q.type, type:q.headerType || 'none', host:q.host || '', path:q.type == 'grpc' ? q.serviceName : q.path,
		tls:security == 'none' ? '' : security, sni:q.sni, fp:q.fp, alpn:q.alpn }));
	else if (p == 'socks' || p == 'http') credential = user.user ? encode(user.user) + ':' + encode(user.pass || '') : '';
	else if (p == 'wireguard') {
		var peer = (s.peers || [])[0] || {};
		credential = encode(s.secretKey || '');
		q = {address:(s.address || []).join(','), publickey:peer.publicKey, presharedkey:peer.preSharedKey,
			reserved:(s.reserved || []).join(','), mtu:s.mtu, keepalive:peer.keepAlive};
	}
	else {
		q = {};
		if (['hysteria2','hysteria','tuic','anytls','ssh','l2tp','pptp','sstp','ikev2','snell','naive'].indexOf(p) < 0) return '';
		credential = encode(c.password || c.auth || c.psk || '');
		if (p == 'tuic') credential = encode(c.uuid || '') + ':' + encode(c.password || '');
		if (c.username || c.user) credential = encode(c.username || c.user) + ':' + encode(c.password || '');
		q.sni = c.sni || (c.tls || {}).server_name;
		q.insecure = c.insecure || (c.tls || {}).insecure ? '1' : undefined;
		q.alpn = Array.isArray(c.alpn) ? c.alpn.join(',') : c.alpn;
		q.obfs = typeof c.obfs == 'object' ? c.obfs.type : c.obfs; q['obfs-password'] = c.obfs_password || (c.obfs || {}).password;
		q.ipsec = c.ipsec == null ? undefined : (c.ipsec ? '1' : '0'); q.psk = c.psk;
		if (p == 'naive') scheme = 'naive+https';
	}
	var query = Object.keys(q).filter(function(k) { return q[k] != null && q[k] !== ''; }).map(function(k) { return encode(k) + '=' + encode(q[k]); }).join('&');
	var host = r[3].indexOf(':') >= 0 ? '[' + r[3] + ']' : r[3];
	return scheme + '://' + (credential ? credential + '@' : '') + host + ':' + r[4] + (query ? '?' + query : '') + '#' + encode(r[1]);
}

return baseclass.extend({
	recordLink: recordLink,
	nameFromLink: nameFromLink,
	withBrowse: withBrowse,
	readProfileFile: readProfileFile,
	validateProfileInput: validateProfileInput,
	validateXdrive: validateXdrive
});
