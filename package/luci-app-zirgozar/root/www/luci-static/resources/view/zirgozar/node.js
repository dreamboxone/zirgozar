/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * One node added by hand, field by field - PassWall2's Node Config page.
 *
 * A node is kept as its share link, because that is what every other part of
 * the program reads. This page takes the link apart into its fields, and on
 * save puts it back together from them, so nothing else has to change. What a
 * link has no place for - ECH, the certificate checks, TCP Fast Open and the
 * rest of PassWall2's lower half - is kept as settings of the node beside it,
 * and zgz-parse puts them into the outbound.
 *
 * A node that is a whole file - a WireGuard or AmneziaWG .conf, an OpenVPN
 * profile - or several links pasted into one, is edited as the text it is.
 */
'use strict';
'require view';
'require form';
'require uci';
'require ui';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';

var _ = i18n.tr;

/* --------------------------------------------------------- the link, apart */

var SCHEMES = {
	vless: 'vless', vmess: 'vmess', trojan: 'trojan', ss: 'shadowsocks',
	socks: 'socks', socks5: 'socks', http: 'http', https: 'http',
	hysteria2: 'hysteria2', hy2: 'hysteria2', tuic: 'tuic'
};

function b64dec(s) {
	s = String(s || '').replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
	while (s.length % 4) s += '=';
	try {
		return decodeURIComponent(Array.prototype.map.call(atob(s), function(c) {
			return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
		}).join(''));
	} catch (e) {
		try { return atob(s); } catch (e2) { return null; }
	}
}

function b64enc(s) {
	return btoa(unescape(encodeURIComponent(s)));
}

function dec(s) {
	try { return decodeURIComponent(String(s || '').replace(/\+/g, '%20')); }
	catch (e) { return String(s || ''); }
}

function enc(s) {
	return encodeURIComponent(String(s == null ? '' : s));
}

/* host:port, with an IPv6 address in brackets. */
function splitHostPort(s) {
	var m = String(s || '').match(/^\[([^\]]+)\]:(\d+)$/) || String(s || '').match(/^([^:]+):(\d+)$/);
	return m ? { host: m[1], port: m[2] } : null;
}

function joinHostPort(h, p) {
	return (String(h).indexOf(':') >= 0 ? '[' + h + ']' : h) + ':' + p;
}

function parseQuery(q) {
	var out = {};
	String(q || '').split('&').forEach(function(kv) {
		if (!kv) return;
		var i = kv.indexOf('=');
		out[dec(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? '' : dec(kv.slice(i + 1));
	});
	return out;
}

function buildQuery(q) {
	return Object.keys(q).filter(function(k) { return q[k] != null && q[k] !== ''; })
		.map(function(k) { return enc(k) + '=' + enc(q[k]); }).join('&');
}

/* What one link is, as the fields of this page; null when it is not one this
   page knows. Query parameters it has no field for are kept and written back. */
function parseLink(link) {
	var s = String(link || '').trim();
	if (/\s/.test(s)) return null;
	var m = s.match(/^([a-z0-9]+):\/\/(.*)$/i);
	if (!m || !SCHEMES[m[1].toLowerCase()]) return null;
	var proto = SCHEMES[m[1].toLowerCase()], body = m[2], f = { proto: proto, rest: {} };
	var h = body.indexOf('#');
	if (h >= 0) { f.name = dec(body.slice(h + 1)); body = body.slice(0, h); }

	if (proto == 'vmess') {
		var j = null;
		try { j = JSON.parse(b64dec(body) || ''); } catch (e) {}
		if (!j) return null;
		f.address = j.add; f.port = String(j.port || '');
		f.uuid = j.id; f.alter_id = String(j.aid || '0'); f.vmess_security = j.scy || 'auto';
		f.type = j.net || 'tcp'; f.header_type = j.type || '';
		f.host = j.host || ''; f.path = j.path || '';
		f.security = (j.tls == 'tls' || j.tls == 'reality') ? j.tls : 'none';
		f.sni = j.sni || ''; f.alpn = j.alpn || ''; f.fp = j.fp || '';
		f.name = f.name || j.ps || '';
		if (f.type == 'grpc') { f.service_name = f.path; f.grpc_mode = j.mode || ''; f.path = ''; delete j.mode; }
		if (f.type == 'kcp') { f.kcp_seed = f.path; f.path = ''; }
		['v', 'ps', 'add', 'port', 'id', 'aid', 'scy', 'net', 'type', 'host', 'path', 'tls', 'sni', 'alpn', 'fp']
			.forEach(function(k) { delete j[k]; });
		f.rest = j;
		return f;
	}

	var q = {}, qi = body.indexOf('?');
	if (qi >= 0) { q = parseQuery(body.slice(qi + 1)); body = body.slice(0, qi); }
	var at = body.lastIndexOf('@'), cred = '', hp;
	if (at >= 0) { cred = body.slice(0, at); hp = splitHostPort(body.slice(at + 1)); }
	else if (proto == 'shadowsocks') {
		var d = b64dec(body) || '', a2 = d.lastIndexOf('@');
		if (a2 < 0) return null;
		cred = d.slice(0, a2); hp = splitHostPort(d.slice(a2 + 1));
		cred = '@plain@' + cred;
	}
	else hp = splitHostPort(body);
	if (!hp) return null;
	f.address = hp.host; f.port = hp.port;

	function take(k) { var v = q[k]; delete q[k]; return v == null ? '' : v; }

	if (proto == 'vless' || proto == 'trojan') {
		if (proto == 'vless') {
			f.uuid = dec(cred); f.encryption = take('encryption') || 'none'; f.flow = take('flow');
		} else {
			f.password = dec(cred);
		}
		f.security = take('security') || (proto == 'trojan' ? 'tls' : 'none');
		f.sni = take('sni'); f.fp = take('fp'); f.alpn = take('alpn');
		f.pbk = take('pbk'); f.sid = take('sid'); f.spx = take('spx');
		f.type = take('type') || 'tcp'; f.host = take('host'); f.path = take('path');
		f.service_name = take('serviceName'); f.header_type = take('headerType');
		var mode = take('mode');
		if (f.type == 'grpc') f.grpc_mode = mode; else f.xhttp_mode = mode;
		f.extra = take('extra');
		if (f.type == 'kcp') { f.kcp_seed = take('seed') || f.path; f.path = ''; }
	} else if (proto == 'shadowsocks') {
		var c = cred.indexOf('@plain@') == 0 ? cred.slice(7) : (b64dec(cred) || dec(cred));
		if (c.indexOf(':') < 0) c = dec(cred);
		var ci = c.indexOf(':');
		f.ss_method = c.slice(0, ci); f.password = c.slice(ci + 1);
	} else if (proto == 'socks' || proto == 'http') {
		if (cred) {
			var u = b64dec(cred);
			if (!u || u.indexOf(':') < 0) u = dec(cred);
			var ui2 = u.indexOf(':');
			f.user = ui2 >= 0 ? u.slice(0, ui2) : u; f.password = ui2 >= 0 ? u.slice(ui2 + 1) : '';
		}
	} else if (proto == 'hysteria2') {
		f.password = dec(cred); f.sni = take('sni');
		f.hy2_obfs = take('obfs'); f.hy2_obfs_password = take('obfs-password');
		f.insecure = take('insecure') == '1' ? '1' : '0';
	} else if (proto == 'tuic') {
		var t = dec(cred), ti = t.indexOf(':');
		f.uuid = ti >= 0 ? t.slice(0, ti) : t; f.password = ti >= 0 ? t.slice(ti + 1) : '';
		f.sni = take('sni'); f.alpn = take('alpn'); f.cc = take('congestion_control');
		f.insecure = take('allow_insecure') == '1' ? '1' : '0';
	}
	f.rest = q;
	return f;
}

/* And back together. */
function buildLink(f, name) {
	var p = f.proto, frag = name ? '#' + enc(name) : '', q = {};
	Object.keys(f.rest || {}).forEach(function(k) { q[k] = f.rest[k]; });

	if (p == 'vmess') {
		var j = {
			v: '2', ps: name || '', add: f.address, port: f.port, id: f.uuid, aid: f.alter_id || '0',
			scy: f.vmess_security || 'auto', net: f.type || 'tcp', type: f.header_type || 'none',
			host: f.host || '', path: f.type == 'grpc' ? (f.service_name || '') : (f.type == 'kcp' ? (f.kcp_seed || '') : (f.path || '')),
			tls: f.security == 'none' ? '' : f.security, sni: f.sni || '', alpn: f.alpn || '', fp: f.fp || ''
		};
		if (f.type == 'grpc' && f.grpc_mode) j.mode = f.grpc_mode;
		Object.keys(q).forEach(function(k) { j[k] = q[k]; });
		return 'vmess://' + b64enc(JSON.stringify(j));
	}

	var hp = joinHostPort(f.address, f.port);
	if (p == 'vless' || p == 'trojan') {
		if (p == 'vless') { q.encryption = f.encryption || 'none'; q.flow = f.flow; }
		q.security = f.security;
		if (f.security != 'none') { q.sni = f.sni; q.fp = f.fp; q.alpn = f.alpn; }
		if (f.security == 'reality') { q.pbk = f.pbk; q.sid = f.sid; q.spx = f.spx; }
		q.type = f.type;
		if (f.type == 'ws' || f.type == 'httpupgrade' || f.type == 'http' || f.type == 'xhttp' ||
		    (f.type == 'tcp' && f.header_type == 'http')) { q.host = f.host; q.path = f.path; }
		if (f.type == 'grpc') { q.serviceName = f.service_name; q.mode = f.grpc_mode; }
		if (f.type == 'xhttp') { q.mode = f.xhttp_mode; q.extra = f.extra; }
		if (f.type == 'tcp' || f.type == 'kcp') q.headerType = f.header_type;
		if (f.type == 'kcp') q.seed = f.kcp_seed;
		var cred = p == 'vless' ? f.uuid : f.password;
		var qs = buildQuery(q);
		return p + '://' + enc(cred) + '@' + hp + (qs ? '?' + qs : '') + frag;
	}
	if (p == 'shadowsocks') {
		var qs2 = buildQuery(q);
		return 'ss://' + b64enc((f.ss_method || '') + ':' + (f.password || '')).replace(/=+$/, '') + '@' + hp +
			(qs2 ? '?' + qs2 : '') + frag;
	}
	if (p == 'socks' || p == 'http') {
		var auth = f.user ? enc(f.user) + ':' + enc(f.password) + '@' : '';
		return p + '://' + auth + hp + frag;
	}
	if (p == 'hysteria2') {
		q.sni = f.sni; q.obfs = f.hy2_obfs; q['obfs-password'] = f.hy2_obfs ? f.hy2_obfs_password : '';
		q.insecure = f.insecure == '1' ? '1' : '';
		var qs3 = buildQuery(q);
		return 'hysteria2://' + enc(f.password) + '@' + hp + (qs3 ? '?' + qs3 : '') + frag;
	}
	if (p == 'tuic') {
		q.sni = f.sni; q.alpn = f.alpn; q.congestion_control = f.cc;
		q.allow_insecure = f.insecure == '1' ? '1' : '';
		var qs4 = buildQuery(q);
		return 'tuic://' + enc(f.uuid) + ':' + enc(f.password) + '@' + hp + (qs4 ? '?' + qs4 : '') + frag;
	}
	return '';
}

/* --------------------------------------------------------------- the page */

return view.extend({
	load: function() {
		return uci.load('zirgozar').catch(function() { return null; });
	},

	render: function() {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));

		var sid = new URLSearchParams(window.location.search).get('sid') || '';
		var back = L.url('admin', 'services', 'zirgozar', 'nodes');
		if (!sid || uci.get('zirgozar', sid) == null || uci.get('zirgozar', sid, '.type') != 'node') {
			return pui.page([ E('div', { 'class': 'mk-alert' }, [
				E('p', {}, _('This config is not there any more.')),
				E('a', { 'class': 'btn cbi-button', 'href': back }, _('Back to configs'))
			]) ]);
		}

		var link = uci.get('zirgozar', sid, 'link') || '';
		var f = parseLink(link);
		var structured = !!f;

		var m = new form.Map('zirgozar');
		var s = m.section(form.NamedSection, sid, 'node', _('Node Config'));
		s.anonymous = true;
		s.addremove = false;

		var o;

		o = s.option(form.Value, 'name', _('Node Remarks'));
		o.placeholder = (f && f.name) || 'my server';

		o = s.option(form.Value, 'group', _('Group Name'));
		o.placeholder = _('default');
		var groups = {};
		uci.sections('zirgozar', 'node').forEach(function(n) { if (n.group) groups[n.group] = true; });
		Object.keys(groups).sort().forEach(function(g) { o.value(g); });

		/* A field of the link, not a setting: read from the parsed link and
		   written back to it. */
		function field(type, key, title, desc) {
			var x = s.option(type, '_' + key, title, desc);
			x.cfgvalue = function() { return f[key] == null ? '' : String(f[key]); };
			x.write = function(section_id, value) { f[key] = value; };
			x.remove = function() { f[key] = (type === form.Flag) ? '0' : ''; };
			return x;
		}

		if (!structured) {
			/* A whole file, or several links: edited as text. */
			o = s.option(form.TextValue, 'link', _('Share link'),
				_('A share link, several of them one per line, a whole WireGuard .conf file or an OpenVPN .ovpn profile.'));
			o.rows = 14;
			o.rmempty = false;
			o.monospace = true;
			if (/^\s*(client\s*$|remote\s+\S+|<ca>)/im.test(link)) {
				o = s.option(form.Value, 'ovpn_user', _('OpenVPN user name'));
				o = s.option(form.Value, 'ovpn_pass', _('OpenVPN password'));
				o.password = true;
				o = s.option(form.Value, 'ovpn_keypass', _('OpenVPN key pass phrase'));
				o.password = true;
			}
		} else {
			var XR = [ 'vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http' ];
			var TLSP = [ 'vless', 'vmess', 'trojan' ];

			o = field(form.ListValue, 'proto', _('Protocol'));
			[ [ 'vless', 'VLESS' ], [ 'vmess', 'VMess' ], [ 'trojan', 'Trojan' ], [ 'shadowsocks', 'Shadowsocks' ],
			  [ 'socks', 'Socks' ], [ 'http', 'HTTP' ], [ 'hysteria2', 'Hysteria2' ], [ 'tuic', 'TUIC' ] ]
				.forEach(function(v) { o.value(v[0], v[1]); });

			o = field(form.Value, 'address', _('Address (Support Domain Name)'));
			o.rmempty = false;
			o = field(form.Value, 'port', _('Port'));
			o.datatype = 'port';
			o.rmempty = false;

			o = field(form.Value, 'uuid', _('ID'));
			o.password = true;
			[ 'vless', 'vmess', 'tuic' ].forEach(function(p) { o.depends('_proto', p); });

			o = field(form.Value, 'user', _('Username'));
			[ 'socks', 'http' ].forEach(function(p) { o.depends('_proto', p); });

			o = field(form.Value, 'password', _('Password'));
			o.password = true;
			[ 'trojan', 'shadowsocks', 'socks', 'http', 'hysteria2', 'tuic' ].forEach(function(p) { o.depends('_proto', p); });

			o = field(form.Value, 'encryption', _('Encrypt Method (encryption)'));
			o.placeholder = 'none';
			o.depends('_proto', 'vless');

			o = field(form.Value, 'flow', _('flow'));
			o.value('', _('Disable'));
			o.value('xtls-rprx-vision', 'xtls-rprx-vision');
			o.value('xtls-rprx-vision-udp443', 'xtls-rprx-vision-udp443');
			o.depends('_proto', 'vless');

			o = field(form.Value, 'alter_id', 'alterId');
			o.datatype = 'uinteger';
			o.depends('_proto', 'vmess');

			o = field(form.ListValue, 'vmess_security', _('Encrypt Method'));
			[ 'auto', 'aes-128-gcm', 'chacha20-poly1305', 'none', 'zero' ].forEach(function(v) { o.value(v); });
			o.depends('_proto', 'vmess');

			o = field(form.Value, 'ss_method', _('Encrypt Method'));
			[ 'aes-128-gcm', 'aes-256-gcm', 'chacha20-poly1305', 'chacha20-ietf-poly1305', 'xchacha20-poly1305',
			  'xchacha20-ietf-poly1305', '2022-blake3-aes-128-gcm', '2022-blake3-aes-256-gcm',
			  '2022-blake3-chacha20-poly1305', 'none' ].forEach(function(v) { o.value(v); });
			o.depends('_proto', 'shadowsocks');

			/* ------------------------------------------------ security */
			o = field(form.ListValue, 'security', _('Security'));
			o.value('none', _('None'));
			o.value('tls', 'TLS');
			o.value('reality', 'REALITY');
			TLSP.forEach(function(p) { o.depends('_proto', p); });

			function onTls(x, withHyTuic) {
				TLSP.forEach(function(p) {
					x.depends({ '_proto': p, '_security': 'tls' });
					x.depends({ '_proto': p, '_security': 'reality' });
				});
				if (withHyTuic) { x.depends('_proto', 'hysteria2'); x.depends('_proto', 'tuic'); }
			}

			o = field(form.Value, 'sni', _('SNI Domain'));
			onTls(o, true);

			o = field(form.Value, 'alpn', 'alpn');
			[ 'h3', 'h2', 'http/1.1', 'h2,http/1.1', 'h3,h2,http/1.1' ].forEach(function(v) { o.value(v); });
			TLSP.forEach(function(p) { o.depends({ '_proto': p, '_security': 'tls' }); });
			o.depends('_proto', 'tuic');

			o = field(form.Value, 'fp', _('Finger Print'));
			o.value('', _('Default'));
			[ 'chrome', 'firefox', 'safari', 'ios', 'android', 'edge', '360', 'qq', 'random', 'randomized' ]
				.forEach(function(v) { o.value(v); });
			onTls(o, false);

			o = field(form.Value, 'pbk', _('Public Key'));
			TLSP.forEach(function(p) { o.depends({ '_proto': p, '_security': 'reality' }); });
			o = field(form.Value, 'sid', _('Short Id'));
			TLSP.forEach(function(p) { o.depends({ '_proto': p, '_security': 'reality' }); });
			o = field(form.Value, 'spx', _('Spider X'));
			TLSP.forEach(function(p) { o.depends({ '_proto': p, '_security': 'reality' }); });

			o = field(form.Flag, 'insecure', _('allowInsecure'));
			o.depends('_proto', 'hysteria2');
			o.depends('_proto', 'tuic');

			o = field(form.ListValue, 'hy2_obfs', _('Obfuscation'));
			o.value('', _('None'));
			o.value('salamander', 'salamander');
			o.depends('_proto', 'hysteria2');
			o = field(form.Value, 'hy2_obfs_password', _('Obfuscation password'));
			o.depends('_hy2_obfs', 'salamander');

			o = field(form.ListValue, 'cc', _('Congestion control'));
			o.value('', _('Default'));
			[ 'bbr', 'cubic', 'new_reno' ].forEach(function(v) { o.value(v); });
			o.depends('_proto', 'tuic');

			/* ----------------------------------------------- transport */
			o = field(form.ListValue, 'type', _('Transport'));
			[ [ 'tcp', 'RAW (TCP)' ], [ 'ws', 'WebSocket' ], [ 'grpc', 'gRPC' ], [ 'http', 'HTTP/2' ],
			  [ 'httpupgrade', 'HTTPUpgrade' ], [ 'xhttp', 'XHTTP' ], [ 'kcp', 'mKCP' ] ]
				.forEach(function(v) { o.value(v[0], v[1]); });
			TLSP.forEach(function(p) { o.depends('_proto', p); });

			function onType(x, types) {
				TLSP.forEach(function(p) { types.forEach(function(t) { x.depends({ '_proto': p, '_type': t }); }); });
			}

			o = field(form.ListValue, 'header_type', _('Camouflage Type'));
			[ 'none', 'http' ].forEach(function(v) { o.value(v); });
			onType(o, [ 'tcp' ]);

			o = field(form.Value, 'host', 'Host');
			onType(o, [ 'ws', 'httpupgrade', 'http', 'xhttp' ]);
			TLSP.forEach(function(p) { o.depends({ '_proto': p, '_type': 'tcp', '_header_type': 'http' }); });

			o = field(form.Value, 'path', 'Path');
			onType(o, [ 'ws', 'httpupgrade', 'http', 'xhttp' ]);
			TLSP.forEach(function(p) { o.depends({ '_proto': p, '_type': 'tcp', '_header_type': 'http' }); });

			o = field(form.Value, 'service_name', _('Service Name'));
			onType(o, [ 'grpc' ]);
			o = field(form.ListValue, 'grpc_mode', _('Transfer mode'));
			o.value('', 'gun');
			o.value('multi', 'multi');
			onType(o, [ 'grpc' ]);

			o = field(form.ListValue, 'xhttp_mode', _('XHTTP Mode'));
			[ 'auto', 'packet-up', 'stream-up', 'stream-one' ].forEach(function(v) { o.value(v); });
			onType(o, [ 'xhttp' ]);
			o = field(form.TextValue, 'extra', _('XHTTP Extra'),
				_('An XHttpObject in JSON format, used for sharing.'));
			o.rows = 4;
			o.monospace = true;
			onType(o, [ 'xhttp' ]);
			o.validate = function(section_id, value) {
				if (!value) return true;
				try { JSON.parse(value); return true; } catch (e) { return _('Must be JSON text!'); }
			};

			o = field(form.ListValue, 'kcp_header', _('Camouflage Type'));
			o.cfgvalue = function() { return f.header_type || 'none'; };
			o.write = function(section_id, value) { if (f.type == 'kcp') f.header_type = value; };
			o.remove = function() {};
			[ 'none', 'srtp', 'utp', 'wechat-video', 'dtls', 'wireguard' ].forEach(function(v) { o.value(v); });
			onType(o, [ 'kcp' ]);
			o = field(form.Value, 'kcp_seed', _('mKCP Seed'));
			onType(o, [ 'kcp' ]);

			/* ------------------- PassWall2's lower half: settings of the node */
			function xr(x) { XR.forEach(function(p) { x.depends('_proto', p); }); return x; }
			function tlsOnly(x) { TLSP.forEach(function(p) { x.depends({ '_proto': p, '_security': 'tls' }); }); return x; }

			o = tlsOnly(s.option(form.Value, 'tls_pin', _('TLS Chain Fingerprint (SHA256)'),
				_('Once set, connects only when the server’s chain fingerprint matches.')));
			o = tlsOnly(s.option(form.Value, 'cert_name', _('TLS Certificate Name (CertName)'),
				_('TLS is used to verify the leaf certificate name.')));
			o = tlsOnly(s.option(form.TextValue, 'tls_pem', _('TLS Certificate (PEM)'),
				_('A certificate the server’s chain is checked against, in place of the usual ones.')));
			o.rows = 4;
			o.monospace = true;
			o = tlsOnly(s.option(form.Value, 'ech', 'ECH',
				_('An ECH configuration, or a domain and the DNS that publishes it, such as cloudflare-ech.com+https://1.1.1.1/dns-query.')));
			o = tlsOnly(s.option(form.Value, 'cipher_suites', _('Cipher Suites'),
				_('Configures the list of supported cipher suites, separated by colons.')));
			[ 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
			  'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256' ]
				.forEach(function(v) { o.value(v); });

			o = s.option(form.Value, 'user_agent', 'User-Agent');
			o.value('', _('default'));
			o.value('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 'Chrome');
			o.value('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', 'Firefox');
			o.value('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15', 'Safari');
			onType(o, [ 'ws', 'httpupgrade', 'xhttp', 'grpc' ]);

			o = xr(s.option(form.TextValue, 'finalmask', 'FinalMask',
				_('Xray’s finalmask for this node, as a JSON object. The fragment and noise of the Xray tab are still added, unless this has its own.')));
			o.rows = 4;
			o.monospace = true;
			o.validate = function(section_id, value) {
				if (!value) return true;
				try { return (typeof JSON.parse(value) == 'object') ? true : _('Must be JSON text!'); }
				catch (e) { return _('Must be JSON text!'); }
			};

			o = xr(s.option(form.Flag, 'tcp_fast_open', _('TCP Fast Open'), _('Need node support required')));
			o = xr(s.option(form.Flag, 'tcp_mptcp', 'tcpMptcp',
				_('Enable Multipath TCP, need to be enabled in both server and client configuration.')));

			o = xr(s.option(form.Value, 'dns_resolver', _('Domain DNS Resolve'),
				_('If the node address is a domain name, this DNS will be used for resolution.')));
			o.value('', _('Auto'));
			[ 'udp://1.1.1.1', 'udp://8.8.8.8', 'tcp://1.1.1.1', 'tcp://8.8.8.8',
			  'https://1.1.1.1/dns-query', 'https://8.8.8.8/dns-query', 'udp://178.22.122.100', 'udp://10.202.10.202' ]
				.forEach(function(v) { o.value(v); });

			o = xr(s.option(form.ListValue, 'domain_strategy', _('Domain Strategy'),
				_('If is domain name, The requested domain name will be resolved to IP before connect.')));
			o.value('', _('Auto'));
			[ 'AsIs', 'UseIP', 'UseIPv4', 'UseIPv6', 'UseIPv4v6', 'UseIPv6v4', 'ForceIP', 'ForceIPv4', 'ForceIPv6' ]
				.forEach(function(v) { o.value(v); });

			o = xr(s.option(form.Flag, 'happy_eyeballs', _('Enable Happy Eyeballs'),
				_('Attempts IPv4 and IPv6 simultaneously; automatically uses the faster connection.')));
		}

		/* PassWall2's Chain Proxy, with its option names. */
		var others = uci.sections('zirgozar', 'node').filter(function(n) { return n['.name'] != sid; });
		o = s.option(form.ListValue, 'chain_proxy', _('Chain Proxy'));
		o.value('', _('Close'));
		o.value('1', _('Preproxy Node'));
		o.value('2', _('Landing Node'));
		o = s.option(form.ListValue, 'preproxy_node', _('Preproxy Node'),
			_('This node is reached through the one chosen here.'));
		o.depends('chain_proxy', '1');
		others.forEach(function(n) { o.value(n['.name'], n.name || n['.name']); });
		o = s.option(form.ListValue, 'to_node', _('Landing Node'),
			_('Traffic goes through this node first and leaves from the one chosen here.'));
		o.depends('chain_proxy', '2');
		others.forEach(function(n) { o.value(n['.name'], n.name || n['.name']); });

		/* The link is put back together after every field has been read, from
		   the fields and the name as they now stand. */
		if (structured) {
			var parse = m.parse;
			m.parse = function() {
				return parse.apply(this, arguments).then(function() {
					var built = buildLink(f, uci.get('zirgozar', sid, 'name') || f.name || '');
					if (built) uci.set('zirgozar', sid, 'link', built);
				});
			};
		}

		return m.render().then(function(mapEl) {
			return pui.page([
				E('div', { 'style': 'margin-bottom:12px' }, [
					E('a', { 'class': 'btn cbi-button', 'href': back }, _('Back to configs'))
				]),
				mapEl
			]);
		});
	}
});
