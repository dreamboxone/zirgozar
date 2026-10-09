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
 *
 * Above the fields, PassWall2's four buttons: a link to replace this one, the
 * link the fields now make, that link as a QR code, and the node as a whole
 * Xray configuration to download.
 */
'use strict';
'require view';
'require form';
'require uci';
'require ui';
'require rpc';
'require zirgozar.i18n as i18n';
'require zirgozar.qr as qr';
'require zirgozar.ui as pui';
'require zirgozar.nodelink as nodelink';

var _ = i18n.tr;

var callNodeConfig = rpc.declare({ object: 'luci.zirgozar', method: 'nodeconfig',
                                   params: [ 'sid' ], expect: { '': {} } });
var callNodes = rpc.declare({ object: 'luci.zirgozar', method: 'nodes', expect: { '': {} } });
var callLan = rpc.declare({ object: 'luci.zirgozar', method: 'lan', expect: { '': {} } });
var callNodeOrigins = rpc.declare({ object: 'luci.zirgozar', method: 'nodeorigins',
	params: [ 'tags' ], expect: { '': {} } });

/* --------------------------------------------------------- the link, apart */

var SCHEMES = {
	vless: 'vless', vmess: 'vmess', trojan: 'trojan', ss: 'shadowsocks',
	socks: 'socks', socks5: 'socks', http: 'http', https: 'http',
	hysteria2: 'hysteria2', hy2: 'hysteria2', tuic: 'tuic', warp: 'warp',
	wireguard: 'wireguard', wg: 'wireguard'
};

SCHEMES.balancing = '_balancing';
SCHEMES.shunt = '_shunt';
SCHEMES.interface = '_iface';

/* Vwarp's disguises for the first packets, lightest first. */
var NOIZE = [ 'minimal', 'light', 'medium', 'heavy', 'stealth', 'gfw', 'firewall' ];

var WARP_COUNTRIES = [ 'AT', 'AU', 'BE', 'BG', 'CA', 'CH', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'HR',
	'HU', 'IE', 'IN', 'IT', 'JP', 'LV', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SG', 'SK', 'US' ];

var callWarp = rpc.declare({ object: 'luci.zirgozar', method: 'warp',
                             params: [ 'sid' ], expect: { '': {} } });
var callAction = rpc.declare({ object: 'luci.zirgozar', method: 'action',
                               params: [ 'name', 'arg' ], expect: { '': {} } });

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
	if (proto == '_balancing' || proto == '_shunt' || proto == '_iface')
		return f;

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
	/* host:port/?… - hysteria2's own form, and Shadowsocks' SIP002 - is the
	   same link as host:port?…, and zgz-parse reads it so. */
	body = body.replace(/\/+$/, '');

	/* warp://[licence@]endpoint-or-auto?mode=…#name - see zgz-parse. */
	if (proto == 'warp') {
		var wat = body.indexOf('@'), wq = function(k) { var v = q[k]; delete q[k]; return v == null ? '' : v; };
		f.warp_key = wat >= 0 ? dec(body.slice(0, wat)) : wq('key');
		var ep = (wat >= 0 ? body.slice(wat + 1) : body).replace(/\/+$/, '');
		f.warp_endpoint = (ep.toLowerCase() == 'auto') ? '' : ep;
		var md = wq('mode').toLowerCase();
		f.warp_mode = { '': 'warp', normal: 'warp', wiw: 'gool', 'warp-in-warp': 'gool', cfon: 'psiphon' }[md] || md;
		f.warp_country = wq('country').toUpperCase() || 'AT';
		var sc = wq('scan');
		f.warp_scan = (sc === '' || sc == '1' || sc == 'true') ? '1' : '0';
		f.warp_rtt = wq('rtt');
		f.warp_ipv = wq('ipv');
		f.warp_dns = wq('dns');
		f.warp_reserved = wq('reserved');
		/* MASQUE is disguised unless the link says off; WireGuard is not unless
		   it says how. */
		var nz = wq('noize').toLowerCase();
		f.warp_noize = NOIZE.indexOf(nz) >= 0 ? nz : (f.warp_mode == 'masque' && nz != 'off' ? 'medium' : 'off');
		f.warp_mt = wq('mt') == 'h3' ? 'h3' : 'h2';
		f.rest = q;
		return f;
	}

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
		f.pbk = take('pbk'); f.sid = take('sid'); f.spx = take('spx'); f.pqv = take('pqv');
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
		/* This program's own query - see do_proxy in zgz-parse. */
		f.uot = take('uot') == '1' ? '1' : '0';
		f.type = take('type') || 'tcp'; f.host = take('host'); f.path = take('path');
		f.service_name = take('serviceName'); f.header_type = take('headerType');
		var pmode = take('mode');
		if (f.type == 'grpc') f.grpc_mode = pmode; else f.xhttp_mode = pmode;
		f.extra = take('extra');
		if (f.type == 'kcp') { f.kcp_seed = take('seed') || f.path; f.path = ''; }
	} else if (proto == 'hysteria2') {
		f.password = dec(cred); f.sni = take('sni');
		f.hy2_obfs = take('obfs'); f.hy2_obfs_password = take('obfs-password');
		f.insecure = take('insecure') == '1' ? '1' : '0';
	} else if (proto == 'tuic') {
		var t = dec(cred), ti = t.indexOf(':');
		f.uuid = ti >= 0 ? t.slice(0, ti) : t; f.password = ti >= 0 ? t.slice(ti + 1) : '';
		f.sni = take('sni'); f.alpn = take('alpn'); f.cc = take('congestion_control');
		f.insecure = take('allow_insecure') == '1' ? '1' : '0';
	} else if (proto == 'wireguard') {
		/* wireguard://PRIVATE-KEY@endpoint?address=…&publickey=… - see
		   do_wireguard in zgz-parse. */
		f.wg_secret = dec(cred);
		f.wg_address = take('address');
		f.wg_pubkey = take('publickey') || take('public-key');
		f.wg_psk = take('presharedkey'); f.wg_reserved = take('reserved');
		f.wg_mtu = take('mtu'); f.wg_keepalive = take('keepalive');
	}
	f.rest = q;
	return f;
}

/* The transport, as a vless link writes it. */
function transportQuery(f, q) {
	q.type = f.type;
	if (f.type == 'ws' || f.type == 'httpupgrade' || f.type == 'http' || f.type == 'xhttp' ||
	    (f.type == 'tcp' && f.header_type == 'http')) { q.host = f.host; q.path = f.path; }
	if (f.type == 'grpc') { q.serviceName = f.service_name; q.mode = f.grpc_mode; }
	if (f.type == 'xhttp') { q.mode = f.xhttp_mode; q.extra = f.extra; }
	if (f.type == 'tcp' || f.type == 'kcp') q.headerType = f.header_type;
	if (f.type == 'kcp') q.seed = f.kcp_seed;
}

/* An empty node, for Add: every field a value the page can show, whichever
   protocol is chosen first. */
function blankNode() {
	return {
		proto: 'vless', rest: {}, address: '', port: '',
		encryption: 'none', security: 'none', type: 'tcp', header_type: 'none',
		alter_id: '0', vmess_security: 'auto', ss_method: 'aes-128-gcm', uot: '0', insecure: '0',
		warp_mode: 'warp', warp_country: 'AT', warp_scan: '1', warp_noize: 'off', warp_mt: 'h2'
	};
}

/* And back together. */
function buildLink(f, name) {
	var p = f.proto, frag = name ? '#' + enc(name) : '', q = {};
	Object.keys(f.rest || {}).forEach(function(k) { q[k] = f.rest[k]; });
	if (p == '_balancing') return 'balancing://config' + frag;
	if (p == '_shunt') return 'shunt://config' + frag;
	if (p == '_iface') return 'interface://config' + frag;

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

	/* An OpenVPN node is its profile, kept as the file it came from. */
	if (p == 'openvpn')
		return String(f.ovpn_profile || '').trim();

	if (p == 'warp') {
		q.mode = f.warp_mode || 'warp';
		q.country = f.warp_mode == 'psiphon' ? (f.warp_country || 'AT') : '';
		/* Scanning is only for warp-plus to choose an address; a given one is
		   the one meant. */
		q.scan = f.warp_endpoint ? '' : (f.warp_scan == '0' ? '0' : '1');
		q.rtt = (!f.warp_endpoint && f.warp_scan != '0') ? f.warp_rtt : '';
		q.ipv = f.warp_ipv; q.dns = f.warp_dns; q.reserved = f.warp_reserved;
		if (f.warp_mode == 'masque') { q.scan = ''; q.rtt = ''; }
		q.noize = (f.warp_noize && f.warp_noize != 'off') ? f.warp_noize : (f.warp_mode == 'masque' ? 'off' : '');
		q.mt = (f.warp_mode == 'masque' && f.warp_mt == 'h3') ? 'h3' : '';
		var wqs = buildQuery(q);
		return 'warp://' + (f.warp_key ? enc(f.warp_key) + '@' : '') + (f.warp_endpoint || 'auto') +
			(wqs ? '?' + wqs : '') + frag;
	}

	var hp = joinHostPort(f.address, f.port);
	if (p == 'vless' || p == 'trojan') {
		if (p == 'vless') { q.encryption = f.encryption || 'none'; q.flow = f.flow; }
		q.security = f.security;
		if (f.security != 'none') { q.sni = f.sni; q.fp = f.fp; q.alpn = f.alpn; }
		if (f.security == 'reality') { q.pbk = f.pbk; q.sid = f.sid; q.spx = f.spx; q.pqv = f.pqv; }
		transportQuery(f, q);
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
		/* Plain TCP says nothing, so a link like any other client's comes out
		   unless something else was chosen. */
		if ((f.type || 'tcp') != 'tcp' || (f.header_type && f.header_type != 'none'))
			transportQuery(f, q);
		if (p == 'socks' && f.uot == '1') q.uot = '1';
		var qs5 = buildQuery(q);
		return p + '://' + auth + hp + (qs5 ? '?' + qs5 : '') + frag;
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
	if (p == 'wireguard') {
		q.address = f.wg_address; q.publickey = f.wg_pubkey; q.presharedkey = f.wg_psk;
		q.reserved = f.wg_reserved; q.mtu = f.wg_mtu; q.keepalive = f.wg_keepalive;
		var qs6 = buildQuery(q);
		return 'wireguard://' + enc(f.wg_secret) + '@' + hp + (qs6 ? '?' + qs6 : '') + frag;
	}
	return '';
}

/* ------------------------------------------------------------ the buttons */

function closeBtn() {
	return E('button', { 'class': 'btn cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('Close window'));
}

function linkBox(value, readonly) {
	return E('textarea', {
		'rows': 6, 'readonly': readonly ? '' : null,
		'style': 'width:100%;direction:ltr;text-align:left;font-family:monospace;word-break:break-all',
		'placeholder': readonly ? null : 'vless://…\nvmess://…'
	}, value || '');
}

function copyText(box, b) {
	box.select();
	var done = function() { pui.note(b, _('Copied'), 'ok'); };
	var byHand = function() {
		try { if (document.execCommand('copy')) return done(); } catch (e) {}
		pui.note(b, _('Select the text and copy it by hand.'), 'warn');
	};
	/* The clipboard API is only there on https; a router is mostly http. */
	if (navigator.clipboard && window.isSecureContext)
		navigator.clipboard.writeText(box.value).then(done, byHand);
	else
		byHand();
}

function download(name, text) {
	var url = URL.createObjectURL(new Blob([ text ], { type: 'application/json' }));
	var a = E('a', { 'href': url, 'download': name, 'style': 'display:none' });
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	window.setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

/* ------------------------------------------------------- the WARP account

   What account the node has, read from the router, with the two things that
   can be done to it. warp-plus makes one by itself the first time it starts,
   but only if Cloudflare's registration address answers from here - which is
   often exactly what does not. Register makes it now, through whatever way
   the router's own traffic goes: with another node connected and Localhost
   Proxy on, through that node. */
function warpAccount(sid) {
	var box = E('div', { 'class': 'cbi-value-field', 'style': 'display:flex;flex-direction:column;gap:8px' },
		[ E('em', {}, _('Waiting for the router…')) ]);
	var timer = null;

	function show(r) {
		var i = (r && r.info) || {}, busy = !!(r && r.job == 'Registering a WARP account'), lines = [];
		if (!i.core)
			lines.push(E('div', { 'style': 'color:#dc2626;font-weight:600' },
				_('warp-plus is not installed. Install it on the App Update page.')));
		if (i.registered) {
			lines.push(E('div', {}, [
				E('strong', {}, i.mode == 'masque' ? _('MASQUE account') : (i.plus ? 'WARP+' : _('Free account'))),
				i.type ? ' · ' + i.type : '',
				i.address ? ' · ' + i.address : '',
				i.license ? ' · ' + _('licence') + ' ' + i.license : '',
				(i.mode == 'gool' && !i.second) ? ' · ' + _('the second account is made on the first connection') : ''
			]));
			if (i.plus && i.premium)
				lines.push(E('div', { 'style': 'color:var(--muted);font-size:12px' },
					_('WARP+ data left: %s').format((i.premium / 1073741824).toFixed(1) + ' GB')));
		} else {
			lines.push(E('div', {}, _('No account yet. warp-plus makes one the first time it connects, if Cloudflare answers from here; Register makes it now.')));
		}
		if (busy)
			lines.push(E('div', { 'style': 'color:var(--muted)' }, _('Registering… this can take a minute.')));
		else if (r && r.message && /WARP|Cloudflare|warp-plus/.test(r.message))
			lines.push(E('div', { 'style': 'color:#dc2626' }, _(r.message)));

		var reg = E('button', {
			'class': 'btn cbi-button cbi-button-action', 'disabled': (busy || !i.core) ? '' : null,
			'click': ui.createHandlerFn(null, function(ev) {
				var b = ev.currentTarget;
				var go = function() {
					return callAction('warp_register', sid).then(function(a) {
						if (a && a.error) { pui.note(b, _(a.error), 'error'); return; }
						refresh();
					});
				};
				if (!i.registered) return go();
				if (!window.confirm(_('A new account replaces this one, and a WARP+ licence on it has to be applied again. Go ahead?')))
					return;
				return callAction('warp_forget', sid).then(go);
			})
		}, i.registered ? _('New account') : _('Register'));

		while (box.firstChild) box.removeChild(box.firstChild);
		lines.forEach(function(l) { box.appendChild(l); });
		box.appendChild(E('div', {}, [ reg ]));
		if (busy) {
			window.clearTimeout(timer);
			timer = window.setTimeout(refresh, 3000);
		}
	}

	function refresh() {
		return callWarp(sid).then(show).catch(function() {});
	}
	refresh();

	return E('div', { 'class': 'cbi-value' }, [
		E('label', { 'class': 'cbi-value-title' }, _('WARP account')),
		box
	]);
}

/* --------------------------------------------------------------- the page */

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('zirgozar').catch(function() { return null; }),
			callNodes().catch(function() { return {}; }),
			callLan().catch(function() { return {}; })
		]).then(function(data) {
			var nodes = (data[1] && data[1].nodes) || [];
			return callNodeOrigins(nodes.map(function(n) { return n.tag; }).join(' '))
			.catch(function() { return {}; }).then(function(origins) {
				data.push((origins && origins.origins) || {});
				return data;
			});
		});
	},

	render: function(data) {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));

		var params = new URLSearchParams(window.location.search);
		var sid = params.get('sid') || '';
		var back = L.url('admin', 'services', 'zirgozar', 'nodes');
		/* Add, and Add file: a node of this page's own, in its copy of the
		   configuration only. Save is what puts it in the file; Back leaves
		   nothing. Add fills in the fields; Add file takes a link or a whole
		   file - a WireGuard .conf, an OpenVPN .ovpn, an Xray .json, a Clash
		   .yaml - exactly as Node List's window took it. */
		var isNew = !sid && (params.get('new') == '1' || params.get('new') == 'file');
		var isFile = isNew && params.get('new') == 'file';
		if (isNew) {
			do {
				sid = 'n' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
			} while (uci.get('zirgozar', sid));
			uci.add('zirgozar', 'node', sid);
			uci.set('zirgozar', sid, 'enabled', '1');
		}
		if (!sid || uci.get('zirgozar', sid) == null || uci.get('zirgozar', sid, '.type') != 'node') {
			return pui.page([ E('div', { 'class': 'mk-alert' }, [
				E('p', {}, _('This config is not there any more.')),
				E('a', { 'class': 'btn cbi-button', 'href': back }, _('Back to configs'))
			]) ]);
		}

		var link = uci.get('zirgozar', sid, 'link') || '';
		var f = isFile ? null : (isNew ? blankNode() : parseLink(link));
		var structured = !!f;

		var m = new form.Map('zirgozar');
		var s = m.section(form.NamedSection, sid, 'node', isFile ? _('Add file') : (isNew ? _('New Config') : _('Node Config')));
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

		if (isFile) {
			o = s.option(form.TextValue, 'link', _('Share link'),
				_('A share link, several of them one per line, a whole WireGuard .conf file or an OpenVPN .ovpn profile. Choose a file and its contents are put in the box for you.'));
			o.rows = 8;
			o.monospace = true;
			o.rmempty = false;
			o.placeholder = 'vless://…';
			nodelink.withBrowse(o, _('a .conf file, or a list of links'));
			o.validate = function(section_id, value) {
				if (!value) return true;
				/* A WireGuard .conf is a file, not a link: it has no :// in it. */
				if (!/:\/\//.test(value) && !/^\s*\[(interface|peer)\]/im.test(value) && !/^\s*(client\s*$|remote\s+\S+|<ca>)/im.test(value))
					return _('That does not look like a share link');
				return true;
			};
		}

		/* A field of the link, not a setting: read from the parsed link and
		   written back to it. */
		function field(type, key, title, desc) {
			var x = s.option(type, '_' + key, title, desc);
			x.cfgvalue = function() { return f[key] == null ? '' : String(f[key]); };
			x.write = function(section_id, value) { f[key] = value; };
			x.remove = function() { f[key] = (type === form.Flag) ? '0' : ''; };
			return x;
		}

		if (!structured && !isFile) {
			/* A whole file, or several links: edited as text. */
			o = s.option(form.TextValue, 'link', _('Share link'),
				_('A share link, several of them one per line, a whole WireGuard .conf file or an OpenVPN .ovpn profile.'));
			o.rows = 14;
			o.rmempty = false;
			o.monospace = true;
			/* A plain WireGuard node - not AmneziaWG, which has its own
			   disguise - can be handed to warp-plus instead of Xray. */
			if ((/^\s*\[(interface|peer)\]/im.test(link) && !/^\s*(jc|jmin|jmax|s[1-4]|h[1-4]|i[1-5])\s*=/im.test(link)) ||
			    /^\s*(wireguard|wg):\/\//i.test(link)) {
				o = s.option(form.Flag, 'warpplus', _('Carry with warp-plus'),
					_('warp-plus sends junk ahead of every WireGuard handshake, which gets it past a filter that drops WireGuard on sight. It needs warp-plus, from App Update. As a pre-proxy or a landing node, the config is still carried by Xray.'));
			}
			if (/^\s*(client\s*$|remote\s+\S+|<ca>)/im.test(link)) {
				o = s.option(form.Value, 'ovpn_user', _('OpenVPN user name'));
				o = s.option(form.Value, 'ovpn_pass', _('OpenVPN password'));
				o.password = true;
				o = s.option(form.Value, 'ovpn_keypass', _('OpenVPN key pass phrase'));
				o.password = true;
			}
		} else if (structured) {
			var XR = [ 'vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http' ];
			var TLSP = [ 'vless', 'vmess', 'trojan' ];
			/* What has a transport to choose: the TLS protocols, and SOCKS and
			   HTTP, as in PassWall2. */
			var TRP = TLSP.concat([ 'socks', 'http' ]);

			o = field(form.ListValue, 'proto', _('Protocol'));
			[ [ 'vless', 'VLESS' ], [ 'vmess', 'VMess' ], [ 'trojan', 'Trojan' ], [ 'shadowsocks', 'Shadowsocks' ],
			  [ 'socks', 'Socks' ], [ 'http', 'HTTP' ], [ 'hysteria2', 'Hysteria2' ], [ 'tuic', 'TUIC' ], [ 'warp', 'WARP' ],
			  [ 'wireguard', 'WireGuard' ], [ 'openvpn', 'OpenVPN' ], [ '_balancing', 'Balancing' ],
			  [ '_shunt', 'Shunt' ], [ '_iface', 'Custom Interface' ] ]
				.forEach(function(v) { o.value(v[0], v[1]); });

			var candidates = (data && data[1] && data[1].nodes) || [];
			var origins = (data && data[3]) || {};
			var nodes = candidates.filter(function(n) {
				return !/^(hysteria2|hysteria|tuic|openvpn|amneziawg|balancing|shunt|interface)$/.test(n.protocol);
			}).map(function(n) {
				var origin = origins[n.tag];
				return origin ? { tag: origin, label: n.label || n.tag } : null;
			}).filter(Boolean);
			var interfaces = (data && data[2] && data[2].interfaces) || [];
			o = s.option(form.MultiValue, 'balancing_node', _('Load balancing node list'));
			o.depends('_proto', '_balancing');
			o.rmempty = false;
			o.widget = 'checkbox';
			nodes.forEach(function(n) { o.value(n.tag, n.label || n.tag); });
			pui.checkboxes(o);

			o = s.option(form.ListValue, 'balancingStrategy', _('Balancing Strategy'));
			o.depends('_proto', '_balancing');
			[ 'random', 'roundRobin', 'leastPing', 'leastLoad' ].forEach(function(v) { o.value(v); });
			o.default = 'random';

			o = s.option(form.ListValue, 'fallback_node', _('Fallback Node'));
			o.depends('_proto', '_balancing');
			o.value('_direct', _('Direct Connection'));
			o.default = '_direct';
			nodes.forEach(function(n) { o.value(n.tag, n.label || n.tag); });

			o = s.option(form.Value, 'probeInterval', _('Probe Interval'));
			o.depends('_proto', '_balancing');
			o.default = '1m';

			o = s.option(form.Value, 'probeUrl', _('Probe URL'));
			o.depends('_proto', '_balancing');
			o.default = 'https://www.google.com/generate_204';

			o = s.option(form.ListValue, 'iface', _('Interface'));
			o.depends('_proto', '_iface');
			o.rmempty = false;
			interfaces.forEach(function(x) {
				if (x && x.dev) o.value(x.dev, x.net && x.net != x.dev ? x.net + ' (' + x.dev + ')' : x.dev);
			});

			var rules = uci.sections('zirgozar', 'shunt_rules');
			var groups = {};
			rules.forEach(function(r) { if (r.group) groups[r.group] = true; });
			o = s.option(form.ListValue, 'shunt_group', _('Shunt Rule Group'));
			o.depends('_proto', '_shunt');
			o.value('', _('default'));
			Object.keys(groups).sort().forEach(function(g) { o.value(g); });

			o = s.option(form.ListValue, 'shunt_default', _('Default Node'));
			o.depends('_proto', '_shunt');
			o.value('_direct', _('Direct Connection'));
			o.value('_blackhole', _('Blackhole (Block)'));
			nodes.forEach(function(n) { o.value(n.tag, n.label || n.tag); });

			rules.forEach(function(r) {
				var id = r['.name'], title = r.remarks || id;
				o = s.option(form.ListValue, 'shunt_' + id, _('Rule destination') + ': ' + title);
				o.depends('_proto', '_shunt');
				o.value('_default', _('Default Node'));
				o.value('_direct', _('Direct Connection'));
				o.value('_blackhole', _('Blackhole (Block)'));
				nodes.forEach(function(n) { o.value(n.tag, n.label || n.tag); });
			});

			o = s.option(form.DummyValue, '_traffic_rules', _('Traffic Rules'));
			o.depends('_proto', '_shunt');
			o.render = function() {
				return E('div', { 'class': 'cbi-value-field' }, [
					E('a', { 'href': L.url('admin', 'services', 'zirgozar', 'traffic') }, _('Open Traffic Rules'))
				]);
			};

			/* --------------------------------------------------- OpenVPN
			   The profile as it is, pasted or read from its file, and what it
			   may not carry itself: an account's user name and password, and
			   the pass phrase of an encrypted key. Each is left empty when the
			   profile needs none. */
			o = field(form.TextValue, 'ovpn_profile', _('OpenVPN profile'),
				_('The whole .ovpn profile. Choose the file and its contents are put in the box for you.'));
			o.rows = 10;
			o.monospace = true;
			o.rmempty = false;
			o.depends('_proto', 'openvpn');
			nodelink.withBrowse(o, _('an .ovpn file'));
			o.validate = function(section_id, value) {
				if (!value) return true;
				return /^\s*(client\s*$|remote\s+\S+|<ca>)/im.test(value) ? true : _('That is not an OpenVPN profile.');
			};
			o = s.option(form.Value, 'ovpn_user', _('OpenVPN user name'),
				_('Only for an OpenVPN profile that asks for a user name and password.'));
			o.depends('_proto', 'openvpn');
			o = s.option(form.Value, 'ovpn_pass', _('OpenVPN password'));
			o.password = true;
			o.depends('_proto', 'openvpn');
			o = s.option(form.Value, 'ovpn_keypass', _('OpenVPN key pass phrase'),
				_('Only for an OpenVPN profile whose private key is encrypted.'));
			o.password = true;
			o.depends('_proto', 'openvpn');

			/* A server of its own for all but WARP and OpenVPN, whose profile
			   names its own. */
			var SERVERS = XR.concat([ 'hysteria2', 'tuic', 'wireguard' ]);
			o = field(form.Value, 'address', _('Address (Support Domain Name)'));
			o.rmempty = false;
			SERVERS.forEach(function(p) { o.depends('_proto', p); });
			o = field(form.Value, 'port', _('Port'));
			o.datatype = 'port';
			o.rmempty = false;
			SERVERS.forEach(function(p) { o.depends('_proto', p); });

			/* ------------------------------------------------- WireGuard
			   The fields of a [Interface] and [Peer] pair, entered by hand.
			   A whole .conf is given with Add file instead. */
			o = field(form.Value, 'wg_secret', _('Private Key'));
			o.password = true;
			o.rmempty = false;
			o.depends('_proto', 'wireguard');
			o = field(form.Value, 'wg_address', _('Local Address'),
				_('This side’s address in the tunnel, as the server gave it: 10.0.0.2/32, and an IPv6 one after a comma if there is one.'));
			o.rmempty = false;
			o.placeholder = '10.0.0.2/32';
			o.depends('_proto', 'wireguard');
			o = field(form.Value, 'wg_pubkey', _('Peer Public Key'));
			o.rmempty = false;
			o.depends('_proto', 'wireguard');
			o = field(form.Value, 'wg_psk', _('Pre-shared Key'), _('Only if the server gave one.'));
			o.password = true;
			o.depends('_proto', 'wireguard');
			o = field(form.Value, 'wg_reserved', _('Reserved'),
				_('Three numbers, such as 12,34,56. Empty unless you were told otherwise.'));
			o.depends('_proto', 'wireguard');
			o.validate = function(section_id, value) {
				return (!value || /^\d{1,3},\d{1,3},\d{1,3}$/.test(value)) ? true : _('Three numbers with commas between them.');
			};
			o = field(form.Value, 'wg_mtu', 'MTU');
			o.datatype = 'range(576,9200)';
			o.placeholder = '1420';
			o.depends('_proto', 'wireguard');
			o = field(form.Value, 'wg_keepalive', _('Keep Alive'), _('Seconds between keep-alive packets. Empty sends none.'));
			o.datatype = 'uinteger';
			o.depends('_proto', 'wireguard');
			o = s.option(form.Flag, 'warpplus', _('Carry with warp-plus'),
				_('warp-plus sends junk ahead of every WireGuard handshake, which gets it past a filter that drops WireGuard on sight. It needs warp-plus, from App Update. As a pre-proxy or a landing node, the config is still carried by Xray.'));
			o.depends('_proto', 'wireguard');

			/* ------------------------------------------------------ WARP */
			o = field(form.ListValue, 'warp_mode', _('Mode'),
				_('WARP: Cloudflare’s own exit. WARP in WARP: a second WARP behind the first, for an exit address the first does not show. Psiphon behind WARP: an exit in the country chosen below. WARP over MASQUE: WARP reached over HTTP/3 on port 443 rather than WireGuard, for a connection that blocks WireGuard; it needs Vwarp.'));
			o.value('warp', _('WARP'));
			o.value('gool', _('WARP in WARP'));
			o.value('psiphon', _('Psiphon behind WARP'));
			o.value('masque', _('WARP over MASQUE'));
			o.depends('_proto', 'warp');

			o = field(form.ListValue, 'warp_country', _('Exit country'));
			WARP_COUNTRIES.forEach(function(c) { o.value(c); });
			o.depends({ '_proto': 'warp', '_warp_mode': 'psiphon' });

			o = field(form.Value, 'warp_endpoint', _('Endpoint'),
				_('A WARP address and port, such as 162.159.192.1:2408. Empty lets warp-plus choose one.'));
			o.placeholder = _('Auto');
			o.depends('_proto', 'warp');
			o.validate = function(section_id, value) {
				if (!value || splitHostPort(value)) return true;
				/* MASQUE is always on 443, so an address alone will do. */
				if (this.section.formvalue(section_id, '_warp_mode') == 'masque' && /^[0-9A-Za-z.:-]+$/.test(value)) return true;
				return _('An address and a port, such as 162.159.192.1:2408.');
			};

			o = field(form.Flag, 'warp_scan', _('Scan for an address'),
				_('Try the WARP addresses and use one that answers from here. Most of them are blocked in Iran, so leave this on.'));
			[ 'warp', 'gool', 'psiphon' ].forEach(function(md) {
				o.depends({ '_proto': 'warp', '_warp_mode': md, '_warp_endpoint': '' });
			});

			o = field(form.Value, 'warp_rtt', _('Scan: slowest answer (ms)'),
				_('Addresses that answer more slowly than this are passed over.'));
			o.placeholder = '1000';
			o.datatype = 'range(100,10000)';
			[ 'warp', 'gool', 'psiphon' ].forEach(function(md) {
				o.depends({ '_proto': 'warp', '_warp_mode': md, '_warp_endpoint': '', '_warp_scan': '1' });
			});

			o = field(form.ListValue, 'warp_ipv', _('IP version'),
				_('Which WARP addresses to use: IPv4 is the one most connections in Iran have.'));
			o.value('', _('Both'));
			o.value('4', _('IPv4 only'));
			o.value('6', _('IPv6 only'));
			o.depends('_proto', 'warp');

			o = field(form.ListValue, 'warp_mt', _('MASQUE over'),
				_('When Xray carries WARP over MASQUE itself (Disguise Off): HTTP/2 goes over TCP 443, which gets through where UDP is blocked; HTTP/3 is QUIC over UDP 443, Cloudflare’s own default.'));
			o.value('h2', _('HTTP/2 (TCP)'));
			o.value('h3', _('HTTP/3 (QUIC)'));
			o.depends({ '_proto': 'warp', '_warp_mode': 'masque' });

			o = field(form.ListValue, 'warp_noize', _('Disguise (noize)'),
				_('Junk and padding sent around the first packets, so that a filter does not recognise WireGuard or MASQUE. Heavier gets past more and connects more slowly. Anything but Off needs Vwarp. WARP over MASQUE with Off is carried by Xray itself when it speaks MASQUE - patterniha’s 26.10.8 or later - and Vwarp is then only needed to register the account.'));
			o.value('off', _('Off'));
			NOIZE.forEach(function(v) { o.value(v); });
			o.depends('_proto', 'warp');

			o = field(form.Value, 'warp_key', _('WARP+ licence'),
				_('Optional. A licence from the 1.1.1.1 app turns the account into WARP+. One licence works on five devices.'));
			o.password = true;
			o.depends('_proto', 'warp');
			o.validate = function(section_id, value) {
				return (!value || /^[A-Za-z0-9-]+$/.test(value)) ? true : _('A WARP+ licence is letters, digits and dashes.');
			};

			o = field(form.Value, 'warp_dns', _('DNS inside WARP'));
			o.placeholder = '1.1.1.1';
			o.datatype = 'ipaddr';
			o.depends('_proto', 'warp');

			o = field(form.Value, 'warp_reserved', _('Reserved'),
				_('Three numbers, such as 12,34,56. Empty uses the account’s own, which is right unless you were told otherwise.'));
			o.depends('_proto', 'warp');
			o.validate = function(section_id, value) {
				return (!value || /^\d{1,3},\d{1,3},\d{1,3}$/.test(value)) ? true : _('Three numbers with commas between them.');
			};

			if (f.proto == 'warp') {
				o = s.option(form.DummyValue, '_warp_account', _('WARP account'));
				o.render = function() { return warpAccount(sid); };
			}

			o = field(form.Value, 'uuid', _('ID'));
			o.password = true;
			[ 'vless', 'vmess', 'tuic' ].forEach(function(p) { o.depends('_proto', p); });

			o = field(form.Value, 'user', _('Username'));
			[ 'socks', 'http' ].forEach(function(p) { o.depends('_proto', p); });

			o = field(form.Value, 'password', _('Password'));
			o.password = true;
			[ 'trojan', 'shadowsocks', 'socks', 'http', 'hysteria2', 'tuic' ].forEach(function(p) { o.depends('_proto', p); });

			o = field(form.Flag, 'uot', _('UDP over TCP'),
				_('UDP is carried inside the TCP connection, for a SOCKS server that takes it that way. Only sing-box does this, so a node with it on is carried by sing-box when there is one.'));
			/* sing-box's socks has no transport, so plain TCP only. */
			o.depends({ '_proto': 'socks', '_type': 'tcp', '_header_type': 'none' });

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
			/* pqv: the server's ML-DSA-65 key, 2603 characters of base64url.
			   Xray refuses the whole node over anything else, so the router
			   leaves out a value that is not one - say so here, before saving. */
			o = field(form.Value, 'pqv', _('ML-DSA-65 Verify (pqv)'),
				_('The post-quantum check of the REALITY server: its ML-DSA-65 public key. Empty connects without the check. sing-box has no such check.'));
			o.validate = function(section_id, value) {
				var v = String(value || '').replace(/=+$/, '');
				if (v === '' || (/^[A-Za-z0-9_-]+$/.test(v) && v.length == 2603)) return true;
				return _('Not an ML-DSA-65 key: it has to be 2603 characters of base64url, and this is %d.').format(v.length);
			};
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
			TRP.forEach(function(p) { o.depends('_proto', p); });

			function onType(x, types) {
				TRP.forEach(function(p) { types.forEach(function(t) { x.depends({ '_proto': p, '_type': t }); }); });
			}

			o = field(form.ListValue, 'header_type', _('Camouflage Type'));
			[ 'none', 'http' ].forEach(function(v) { o.value(v); });
			onType(o, [ 'tcp' ]);

			o = field(form.Value, 'host', 'Host');
			onType(o, [ 'ws', 'httpupgrade', 'http', 'xhttp' ]);
			TRP.forEach(function(p) { o.depends({ '_proto': p, '_type': 'tcp', '_header_type': 'http' }); });

			o = field(form.Value, 'path', 'Path');
			onType(o, [ 'ws', 'httpupgrade', 'http', 'xhttp' ]);
			TRP.forEach(function(p) { o.depends({ '_proto': p, '_type': 'tcp', '_header_type': 'http' }); });

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
		[ 'vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'hysteria2', 'tuic', 'warp', 'wireguard', 'openvpn' ]
			.forEach(function(p) { o.depends('_proto', p); });
		o.value('', _('Close'));
		o.value('1', _('Preproxy Node'));
		o.value('2', _('Landing Node'));
		o = s.option(form.ListValue, 'preproxy_node', _('Preproxy Node'),
			_('This node is reached through the one chosen here.'));
		[ 'vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'hysteria2', 'tuic', 'warp', 'wireguard', 'openvpn' ]
			.forEach(function(p) { o.depends({ 'chain_proxy': '1', '_proto': p }); });
		others.forEach(function(n) { o.value(n['.name'], n.name || n['.name']); });
		o = s.option(form.ListValue, 'to_node', _('Landing Node'),
			_('Traffic goes through this node first and leaves from the one chosen here.'));
		[ 'vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'hysteria2', 'tuic', 'warp', 'wireguard', 'openvpn' ]
			.forEach(function(p) { o.depends({ 'chain_proxy': '2', '_proto': p }); });
		others.forEach(function(n) { o.value(n['.name'], n.name || n['.name']); });

		/* The link is put back together after every field has been read, from
		   the fields and the name as they now stand. */
		if (structured) {
			var parse = m.parse;
			m.parse = function() {
				return parse.apply(this, arguments).then(function() {
					var built = buildLink(f, uci.get('zirgozar', sid, 'name') || f.name || '');
					if (built) uci.set('zirgozar', sid, 'link', built);
					/* A profile has no #name: its comment or its server names it. */
					if (built && f.proto == 'openvpn' && !uci.get('zirgozar', sid, 'name')) {
						var got = nodelink.nameFromLink(built);
						if (got) uci.set('zirgozar', sid, 'name', got);
					}
				});
			};
		}

		/* A link or a file is kept as it was given, and named from it when no
		   name was typed. */
		if (isFile) {
			var parseFile = m.parse;
			m.parse = function() {
				return parseFile.apply(this, arguments).then(function() {
					if (uci.get('zirgozar', sid, 'name')) return;
					var got = nodelink.nameFromLink(uci.get('zirgozar', sid, 'link'));
					if (got) uci.set('zirgozar', sid, 'name', got);
				});
			};
		}

		/* Once an added node is saved it is an ordinary one: the address
		   names it, so that Save & Apply's reload, or the browser's, opens
		   this node again rather than another empty one. */
		if (isNew) {
			var save = m.save;
			m.save = function() {
				return save.apply(this, arguments).then(function(r) {
					window.history.replaceState(null, '', L.url('admin', 'services', 'zirgozar', 'node') + '?sid=' + encodeURIComponent(sid));
					return r;
				});
			};
		}

		/* The link as the fields now stand, saved or not: the form is read
		   into the page's copy of the configuration, which is what Save would
		   send, and the link is put back together from it. */
		function currentLink(b) {
			return m.parse().then(function() {
				var l = String(uci.get('zirgozar', sid, 'link') || '').trim();
				if (!l) pui.note(b, _('There is no link yet.'), 'warn');
				return l;
			}, function() {
				pui.note(b, _('Some fields are not filled in correctly.'), 'error');
				return '';
			});
		}

		function fromShareUrl() {
			var box = linkBox('', false);
			ui.showModal(_('From Share URL'), [
				E('p', {}, _('The link, or the whole file, takes the place of what this config has now. Press Save & Apply afterwards to keep it.')),
				box,
				E('div', { 'class': 'right' }, [
					closeBtn(), ' ',
					E('button', {
						'class': 'btn cbi-button cbi-button-positive',
						'click': ui.createHandlerFn(null, function(ev) {
							var b = ev.currentTarget, v = box.value.trim();
							if (!/:\/\//.test(v) && !/^\s*(\[(interface|peer)\]|client\s*$|remote\s+\S+|<ca>)/im.test(v)) {
								pui.note(b, _('Please enter the correct link.'), 'error');
								return;
							}
							var p = parseLink(v);
							uci.set('zirgozar', sid, 'link', v);
							if (p && p.name) uci.set('zirgozar', sid, 'name', p.name);
							/* Kept among the unsaved changes, and the page drawn
							   again from them: the fields are now the new link's. */
							return uci.save().then(function() {
								ui.hideModal();
								location.reload();
							});
						})
					}, _('Import'))
				])
			]);
		}

		function buildShareUrl(ev) {
			var b = ev.currentTarget;
			return currentLink(b).then(function(l) {
				if (!l) return;
				var box = linkBox(l, true);
				ui.showModal(_('Build Share URL'), [
					box,
					E('div', { 'class': 'right' }, [
						closeBtn(), ' ',
						E('button', {
							'class': 'btn cbi-button cbi-button-action',
							'click': function(e) { copyText(box, e.currentTarget); }
						}, _('Copy'))
					])
				]);
			});
		}

		function generateQr(ev) {
			var b = ev.currentTarget;
			return currentLink(b).then(function(l) {
				if (!l) return;
				var code = qr.svg(l, 300);
				if (!code) {
					pui.note(b, _('This config is too long for a QR code.'), 'error');
					return;
				}
				ui.showModal(_('Generate QRCode'), [
					E('div', { 'style': 'text-align:center;margin:8px 0 12px' }, [ code ]),
					E('div', { 'class': 'right' }, [ closeBtn() ])
				]);
			});
		}

		/* The node as saved: the configuration is made on the router, from
		   what is there. */
		function exportConfig(ev) {
			var b = ev.currentTarget;
			return callNodeConfig(sid).then(function(r) {
				if (!r || !r.ok || !r.config) {
					pui.note(b, (r && r.error == 'not xray')
						? _('Xray does not speak this protocol, so there is no Xray config file for it.')
						: _('This config could not be read.'), 'error');
					return;
				}
				var text = r.config;
				try { text = JSON.stringify(JSON.parse(text), null, 2); } catch (e) {}
				var name = String(uci.get('zirgozar', sid, 'name') || (f && f.name) || sid)
					.replace(/[\\\/:*?"<>|\s]+/g, '_');
				download(name + '.json', text + '\n');
			});
		}

		function tool(title, fn) {
			return E('button', { 'class': 'btn cbi-button cbi-button-action', 'click': ui.createHandlerFn(null, fn) }, title);
		}
		var tools = E('div', {
			'style': 'display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin:0 0 14px'
		}, [
			tool(_('From Share URL'), fromShareUrl),
			tool(_('Build Share URL'), buildShareUrl),
			tool(_('Generate QRCode'), generateQr),
			tool(_('Export Config File'), exportConfig)
		]);

		return m.render().then(function(mapEl) {
			/* Under the page's title, as in PassWall2. */
			var head = mapEl.querySelector('.cbi-section > h3, .cbi-section > legend');
			if (head) head.parentNode.insertBefore(tools, head.nextSibling);
			else mapEl.insertBefore(tools, mapEl.firstChild);
			return pui.page([
				E('div', { 'style': 'margin-bottom:12px' }, [
					E('a', { 'class': 'btn cbi-button', 'href': back }, _('Back to configs'))
				]),
				mapEl
			]);
		});
	}
});
