/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * PassWall2's Server-Side: the router as a proxy server, for phones and
 * laptops away from home. Xray serves VLESS, VMess, Trojan, Shadowsocks,
 * SOCKS and HTTP; sing-box serves Hysteria2 and TUIC. The settings are a
 * file of their own, /etc/config/zirgozar_server, and a service of their own
 * runs them, so saving a server never restarts the tunnel.
 *
 * Each server has a share link and its QR code, put together here from its
 * settings, so that a phone can be given it without anybody typing a key.
 */
'use strict';
'require view';
'require form';
'require rpc';
'require poll';
'require ui';
'require uci';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';
'require zirgozar.qr as qr';

var _ = i18n.tr;

var callServer = rpc.declare({ object: 'luci.zirgozar', method: 'server', expect: { '': {} } });
var callAction = rpc.declare({ object: 'luci.zirgozar', method: 'action',
                               params: [ 'name', 'arg' ], expect: { '': {} } });

var CONF = 'zirgozar_server';
var TLS_PROTOS = [ 'vless', 'vmess', 'trojan' ];
var SB_PROTOS = [ 'hysteria2', 'tuic' ];

function randomHex(n) {
	var a = new Uint8Array(n);
	window.crypto.getRandomValues(a);
	return Array.prototype.map.call(a, function(b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}

function uuid() {
	var h = randomHex(16).split('');
	h[12] = '4';
	h[16] = '89ab'[parseInt(h[16], 16) & 3];
	h = h.join('');
	return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
}

function sectionName() {
	var n;
	do { n = 'u' + randomHex(3); } while (uci.get(CONF, n));
	return n;
}

function b64(s) {
	return btoa(unescape(encodeURIComponent(s)));
}

function get(sid, key) {
	var v = uci.get(CONF, sid, key);
	return Array.isArray(v) ? v : (v == null ? '' : String(v));
}

function first(sid, key) {
	var v = uci.get(CONF, sid, key);
	return Array.isArray(v) ? (v[0] || '') : (v || '');
}

/* ------------------------------------------------------------ share link */

function linkHost(sid) {
	var h = get(sid, 'link_address') || window.location.hostname;
	return h.indexOf(':') >= 0 && h.charAt(0) != '[' ? '[' + h + ']' : h;
}

function isIp(h) {
	return /^[\d.]+$/.test(h) || h.indexOf(':') >= 0 || h.charAt(0) == '[';
}

function query(q) {
	return Object.keys(q).filter(function(k) { return q[k] != null && q[k] !== ''; })
		.map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]); }).join('&');
}

/* The link a client imports, as v2rayN and NekoBox read them. */
function shareLink(sid) {
	var proto = get(sid, 'protocol'), host = linkHost(sid), port = get(sid, 'port');
	var name = '#' + encodeURIComponent(get(sid, 'remarks') || sid);
	var net = get(sid, 'transport') || 'raw', sec = get(sid, 'security') || 'none';
	var sni = isIp(host) ? '' : host;

	if (proto == 'vless' || proto == 'trojan') {
		var q = { security: sec, type: net == 'raw' ? 'tcp' : net };
		if (proto == 'vless') {
			q.encryption = 'none';
			if ((net == 'raw') && sec != 'none') q.flow = get(sid, 'flow');
		}
		if (sec == 'tls') { q.sni = sni; q.alpn = (uci.get(CONF, sid, 'alpn') || []).join(','); }
		if (sec == 'reality') {
			var names = uci.get(CONF, sid, 'reality_server_name') || [];
			q.sni = names[0] || (get(sid, 'reality_dest') || 'www.microsoft.com:443').replace(/:\d+$/, '');
			q.fp = 'chrome';
			q.pbk = get(sid, 'reality_public_key');
			q.sid = first(sid, 'reality_short_id');
		}
		if (net == 'ws' || net == 'httpupgrade' || net == 'xhttp') { q.path = get(sid, 'path') || '/'; q.host = get(sid, 'host'); }
		if (net == 'xhttp') q.mode = get(sid, 'xhttp_mode') || 'auto';
		if (net == 'grpc') q.serviceName = get(sid, 'service_name');
		if (net == 'kcp') { q.headerType = get(sid, 'header_type') || 'none'; q.seed = get(sid, 'kcp_seed'); }
		return proto + '://' + encodeURIComponent(first(sid, 'uuid')) + '@' + host + ':' + port + '?' + query(q) + name;
	}
	if (proto == 'vmess') {
		var j = {
			v: '2', ps: get(sid, 'remarks') || sid, add: host.replace(/^\[|\]$/g, ''), port: port,
			id: first(sid, 'uuid'), aid: '0', scy: 'auto', net: net == 'raw' ? 'tcp' : net,
			type: net == 'kcp' ? (get(sid, 'header_type') || 'none') : 'none',
			host: get(sid, 'host'), path: net == 'grpc' ? get(sid, 'service_name') : (net == 'kcp' ? get(sid, 'kcp_seed') : get(sid, 'path')),
			tls: sec == 'tls' ? 'tls' : '', sni: sec == 'tls' ? sni : ''
		};
		return 'vmess://' + b64(JSON.stringify(j));
	}
	if (proto == 'shadowsocks')
		return 'ss://' + b64((get(sid, 'method') || 'aes-256-gcm') + ':' + get(sid, 'password')).replace(/=+$/, '') +
			'@' + host + ':' + port + name;
	if (proto == 'socks' || proto == 'http') {
		var auth = get(sid, 'auth') == '1'
			? (proto == 'socks' ? b64(get(sid, 'username') + ':' + get(sid, 'password'))
			                    : encodeURIComponent(get(sid, 'username')) + ':' + encodeURIComponent(get(sid, 'password'))) + '@'
			: '';
		return proto + '://' + auth + host + ':' + port + name;
	}
	if (proto == 'hysteria2') {
		var hq = { sni: sni, insecure: get(sid, 'link_insecure') == '1' ? '1' : '' };
		if (get(sid, 'hy2_obfs_password')) { hq.obfs = 'salamander'; hq['obfs-password'] = get(sid, 'hy2_obfs_password'); }
		var hs = query(hq);
		return 'hysteria2://' + encodeURIComponent(get(sid, 'password')) + '@' + host + ':' + port + (hs ? '?' + hs : '') + name;
	}
	if (proto == 'tuic') {
		var tq = { congestion_control: get(sid, 'tuic_cc') || 'bbr', alpn: (uci.get(CONF, sid, 'alpn') || [ 'h3' ]).join(','),
		           sni: sni, allow_insecure: get(sid, 'link_insecure') == '1' ? '1' : '' };
		return 'tuic://' + encodeURIComponent(first(sid, 'uuid')) + ':' + encodeURIComponent(get(sid, 'password')) +
			'@' + host + ':' + port + '?' + query(tq) + name;
	}
	return '';
}

function showLink(sid) {
	var l = shareLink(sid);
	var box = E('textarea', {
		'rows': 4, 'readonly': '',
		'style': 'width:100%;direction:ltr;text-align:left;font-family:monospace;word-break:break-all'
	});
	box.value = l;
	var code = qr.svg(l, 260);
	ui.showModal(_('Share link'), [
		code ? E('div', { 'style': 'text-align:center;margin:4px 0 10px' }, [ code ]) : '',
		box,
		E('p', { 'style': 'font-size:12px;opacity:.7' },
			_('The address in the link is the one this page was opened at, unless Address in the share link says otherwise. A phone away from home needs the router’s public address or domain.')),
		E('div', { 'class': 'right' }, [
			E('button', { 'class': 'btn cbi-button cbi-button-neutral', 'click': ui.hideModal }, _('Close window')),
			' ',
			E('button', {
				'class': 'btn cbi-button cbi-button-action',
				'click': function(ev) {
					var b = ev.currentTarget;
					box.select();
					var ok = function() { pui.note(b, _('Copied'), 'ok'); };
					if (navigator.clipboard && window.isSecureContext)
						navigator.clipboard.writeText(l).then(ok, function() { document.execCommand('copy'); ok(); });
					else { try { document.execCommand('copy'); ok(); } catch (e) {} }
				}
			}, _('Copy'))
		])
	]);
}

/* -------------------------------------------------------------- status */

function statusText(d) {
	if (!d || !d.enabled) return [ _('Server-Side is off.'), 'info' ];
	var parts = [], bad = [];
	if (d.xray) parts.push('Xray');
	if (d.singbox) parts.push('sing-box');
	if (d.xray_error) bad.push('Xray: ' + d.xray_error);
	if (d.singbox_error) bad.push('sing-box: ' + d.singbox_error);
	if (bad.length) return [ _('Could not start: %s').format(bad.join(' / ')), 'error' ];
	if (!parts.length) return [ _('No server is running. Add one below and press Save & Apply.'), 'warn' ];
	return [ _('Running (%s), listening on %s.').format(parts.join(', '), String(d.ports || '').trim() || '-'), 'ok' ];
}

function renderStatus(d) {
	var el = document.getElementById('zgz-server-status');
	if (!el) return;
	var t = statusText(d);
	el.textContent = t[0];
	el.style.color = t[1] == 'ok' ? '#10b981' : t[1] == 'error' ? '#dc2626' : t[1] == 'warn' ? '#d97706' : '';
}

return view.extend({
	load: function() {
		return Promise.all([
			callServer().catch(function() { return {}; }),
			uci.load('zirgozar').catch(function() { return null; }),
			uci.load(CONF).catch(function() { return null; })
		]);
	},

	render: function(data) {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));

		var m, s, o;
		m = new form.Map(CONF);

		/* --------------------------------------------------- the switch */
		s = m.section(form.NamedSection, 'global', 'global');
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.DummyValue, '_status', _('Status'));
		o.rawhtml = true;
		o.cfgvalue = function() { return '<span id="zgz-server-status" style="font-weight:600;display:inline-block;padding-top:10px"></span>'; };

		o = s.option(form.Flag, 'enable', _('Enable'),
			_('The router as a proxy server: phones and laptops away from home connect to it. A server that listens beyond the router has its port opened in the firewall while it runs.'));
		o.rmempty = false;

		o = s.option(form.ListValue, 'loglevel', _('Log level'));
		[ 'debug', 'info', 'warning', 'error', 'none' ].forEach(function(v) { o.value(v); });
		o.default = 'warning';

		/* ---------------------------------------------------- the users */
		s = m.section(form.GridSection, 'user', _('Users Manager'));
		s.addremove = true;
		s.anonymous = true;
		s.sortable = true;
		s.handleAdd = function(ev) {
			return form.GridSection.prototype.handleAdd.apply(this, [ ev, sectionName() ]);
		};

		s.tab('main', _('Main'));
		s.tab('transport', _('Transport'));
		s.tab('out', _('Outbound'));

		o = s.taboption('main', form.Flag, 'enable', _('Enable'));
		o.default = '1';
		o.rmempty = false;
		o.editable = true;

		o = s.taboption('main', form.Value, 'remarks', _('Remarks'));
		o.rmempty = false;
		o.placeholder = 'phone';

		o = s.taboption('main', form.ListValue, 'protocol', _('Protocol'));
		[ [ 'vless', 'VLESS' ], [ 'vmess', 'VMess' ], [ 'trojan', 'Trojan' ], [ 'shadowsocks', 'Shadowsocks' ],
		  [ 'socks', 'Socks' ], [ 'http', 'HTTP' ], [ 'hysteria2', 'Hysteria2' ], [ 'tuic', 'TUIC' ] ]
			.forEach(function(v) { o.value(v[0], v[1]); });
		o.default = 'vless';

		o = s.taboption('main', form.Value, 'port', _('Listen Port'));
		o.datatype = 'port';
		o.rmempty = false;
		o.default = String(20000 + Math.floor(Math.random() * 30000));

		o = s.taboption('main', form.Flag, 'bind_local', _('Bind Local'),
			_('Listen on the router itself only; the port is not opened in the firewall.'));
		o.modalonly = true;

		o = s.taboption('main', form.DynamicList, 'uuid', _('ID / Password'),
			_('One per user. VLESS and VMess take a UUID, Trojan a password.'));
		o.modalonly = true;
		o.default = [ uuid() ];
		[ 'vless', 'vmess', 'trojan', 'tuic' ].forEach(function(p) { o.depends('protocol', p); });

		o = s.taboption('main', form.ListValue, 'flow', _('flow'));
		o.modalonly = true;
		o.value('', _('Disable'));
		o.value('xtls-rprx-vision', 'xtls-rprx-vision');
		o.depends('protocol', 'vless');

		o = s.taboption('main', form.ListValue, 'method', _('Encrypt Method'));
		o.modalonly = true;
		[ 'aes-128-gcm', 'aes-256-gcm', 'chacha20-poly1305', 'chacha20-ietf-poly1305', 'xchacha20-poly1305',
		  'xchacha20-ietf-poly1305', '2022-blake3-aes-128-gcm', '2022-blake3-aes-256-gcm', '2022-blake3-chacha20-poly1305' ]
			.forEach(function(v) { o.value(v); });
		o.default = 'aes-256-gcm';
		o.depends('protocol', 'shadowsocks');

		o = s.taboption('main', form.Flag, 'auth', _('Auth'));
		o.modalonly = true;
		o.depends('protocol', 'socks');
		o.depends('protocol', 'http');

		o = s.taboption('main', form.Value, 'username', _('Username'));
		o.modalonly = true;
		o.depends('auth', '1');

		o = s.taboption('main', form.Value, 'password', _('Password'),
			_('A 2022 Shadowsocks method needs a base64 key of its own length: 16 bytes for aes-128, 32 for the others.'));
		o.modalonly = true;
		o.password = true;
		o.default = randomHex(12);
		[ 'shadowsocks', 'hysteria2', 'tuic' ].forEach(function(p) { o.depends('protocol', p); });
		o.depends('auth', '1');

		o = s.taboption('main', form.Value, 'hy2_obfs_password', _('Obfuscation password'),
			_('salamander. Empty is no obfuscation.'));
		o.modalonly = true;
		o.depends('protocol', 'hysteria2');

		o = s.taboption('main', form.Value, 'hy2_up_mbps', _('Max upload Mbps'));
		o.modalonly = true;
		o.datatype = 'uinteger';
		o.depends('protocol', 'hysteria2');
		o = s.taboption('main', form.Value, 'hy2_down_mbps', _('Max download Mbps'));
		o.modalonly = true;
		o.datatype = 'uinteger';
		o.depends('protocol', 'hysteria2');

		o = s.taboption('main', form.ListValue, 'tuic_cc', _('Congestion control'));
		o.modalonly = true;
		[ 'bbr', 'cubic', 'new_reno' ].forEach(function(v) { o.value(v); });
		o.depends('protocol', 'tuic');

		o = s.taboption('main', form.Value, 'link_address', _('Address in the share link'),
			_('The router’s public address or a domain that points to it. Empty is the address this page was opened at.'));
		o.modalonly = true;
		o.placeholder = window.location.hostname;

		/* ---------------------------------------- transport and security */
		o = s.taboption('transport', form.ListValue, 'transport', _('Transport'));
		o.modalonly = true;
		[ [ 'raw', 'RAW (TCP)' ], [ 'ws', 'WebSocket' ], [ 'grpc', 'gRPC' ], [ 'httpupgrade', 'HTTPUpgrade' ],
		  [ 'xhttp', 'XHTTP' ], [ 'kcp', 'mKCP' ] ].forEach(function(v) { o.value(v[0], v[1]); });
		TLS_PROTOS.forEach(function(p) { o.depends('protocol', p); });

		function onNet(x, nets) {
			TLS_PROTOS.forEach(function(p) { nets.forEach(function(n) { x.depends({ protocol: p, transport: n }); }); });
		}

		o = s.taboption('transport', form.Value, 'path', 'Path');
		o.modalonly = true;
		o.placeholder = '/';
		onNet(o, [ 'ws', 'httpupgrade', 'xhttp' ]);
		o = s.taboption('transport', form.Value, 'host', 'Host');
		o.modalonly = true;
		onNet(o, [ 'ws', 'httpupgrade', 'xhttp' ]);
		o = s.taboption('transport', form.Value, 'service_name', _('Service Name'));
		o.modalonly = true;
		onNet(o, [ 'grpc' ]);
		o = s.taboption('transport', form.ListValue, 'xhttp_mode', _('XHTTP Mode'));
		o.modalonly = true;
		[ 'auto', 'packet-up', 'stream-up', 'stream-one' ].forEach(function(v) { o.value(v); });
		onNet(o, [ 'xhttp' ]);
		o = s.taboption('transport', form.ListValue, 'header_type', _('Camouflage Type'));
		o.modalonly = true;
		[ 'none', 'srtp', 'utp', 'wechat-video', 'dtls', 'wireguard' ].forEach(function(v) { o.value(v); });
		onNet(o, [ 'kcp' ]);
		o = s.taboption('transport', form.Value, 'kcp_seed', _('mKCP Seed'));
		o.modalonly = true;
		onNet(o, [ 'kcp' ]);

		o = s.taboption('transport', form.ListValue, 'security', _('Security'),
			_('REALITY needs no certificate and no domain, and is the one to choose for VLESS. It works with VLESS and Trojan.'));
		o.modalonly = true;
		o.value('none', _('None'));
		o.value('tls', 'TLS');
		o.value('reality', 'REALITY');
		TLS_PROTOS.forEach(function(p) { o.depends('protocol', p); });
		o.validate = function(section_id, value) {
			var p = this.section.formvalue(section_id, 'protocol');
			if (value == 'reality' && p == 'vmess') return _('REALITY works with VLESS and Trojan only.');
			return true;
		};

		function onTls(x) {
			TLS_PROTOS.forEach(function(p) { x.depends({ protocol: p, security: 'tls' }); });
			SB_PROTOS.forEach(function(p) { x.depends('protocol', p); });
		}

		o = s.taboption('transport', form.Value, 'tls_cert', _('Public key absolute path'),
			_('The certificate, as a file on the router. Hysteria2 and TUIC always need one.'));
		o.modalonly = true;
		o.placeholder = '/etc/zirgozar/server.crt';
		onTls(o);
		o = s.taboption('transport', form.Value, 'tls_key', _('Private key absolute path'));
		o.modalonly = true;
		o.placeholder = '/etc/zirgozar/server.key';
		onTls(o);
		o = s.taboption('transport', form.DynamicList, 'alpn', 'alpn');
		o.modalonly = true;
		[ 'h3', 'h2', 'http/1.1' ].forEach(function(v) { o.value(v); });
		onTls(o);
		o = s.taboption('transport', form.Flag, 'link_insecure', _('allowInsecure'),
			_('In the share link only: for a self-signed certificate the client cannot check.'));
		o.modalonly = true;
		SB_PROTOS.forEach(function(p) { o.depends('protocol', p); });

		function onReality(x) {
			[ 'vless', 'trojan' ].forEach(function(p) { x.depends({ protocol: p, security: 'reality' }); });
		}

		o = s.taboption('transport', form.Value, 'reality_private_key', _('Private Key'));
		o.modalonly = true;
		o.rmempty = false;
		onReality(o);
		o.renderWidget = function(section_id, option_index, cfgvalue) {
			var self = this;
			var w = form.Value.prototype.renderWidget.apply(this, [ section_id, option_index, cfgvalue ]);
			var btn = E('button', {
				'class': 'btn cbi-button cbi-button-action',
				'click': ui.createHandlerFn(this, function(ev) {
					ev.preventDefault();
					var b = ev.currentTarget;
					return callAction('server_keys', '').then(function(r) {
						if (!r || !r.ok) { pui.note(b, _((r && r.error) || 'Xray could not make a key pair.'), 'error'); return; }
						self.getUIElement(section_id).setValue(r.private);
						var pub = self.section.getUIElement(section_id, 'reality_public_key');
						if (pub) pub.setValue(r.public);
						pui.note(b, _('A new key pair. Save & Apply to use it.'), 'ok');
					});
				})
			}, _('Generate'));
			return E([ w, E('div', { 'style': 'margin-top:6px' }, [ btn ]) ]);
		};
		o = s.taboption('transport', form.Value, 'reality_public_key', _('Public Key'),
			_('The other half of the pair, for the share link. Generate fills both.'));
		o.modalonly = true;
		onReality(o);
		o = s.taboption('transport', form.DynamicList, 'reality_short_id', _('Short Id'));
		o.modalonly = true;
		o.default = [ randomHex(4) ];
		onReality(o);
		o = s.taboption('transport', form.Value, 'reality_dest', _('Handshake server'),
			_('A real site the handshake is borrowed from, as host:port.'));
		o.modalonly = true;
		o.placeholder = 'www.microsoft.com:443';
		onReality(o);
		o = s.taboption('transport', form.DynamicList, 'reality_server_name', _('Server names'),
			_('The names a client may ask for. Empty is the handshake server’s.'));
		o.modalonly = true;
		onReality(o);

		/* ------------------------------------------------------ way out */
		o = s.taboption('out', form.ListValue, 'outbound', _('Outbound'),
			_('Where the traffic of whoever connects leaves from. Hysteria2 and TUIC servers can use the first three.'));
		o.modalonly = true;
		o.value('', _('Direct Connection'));
		o.value('_tunnel', _('Through the Zirgozar tunnel'));
		o.value('_socks', _('Custom SOCKS server'));
		uci.sections('zirgozar', 'node').forEach(function(n) {
			o.value(n['.name'], n.name || n['.name']);
		});

		o = s.taboption('out', form.Value, 'outbound_socks_address', _('Address'));
		o.modalonly = true;
		o.placeholder = '127.0.0.1';
		o.depends('outbound', '_socks');
		o = s.taboption('out', form.Value, 'outbound_socks_port', _('Port'));
		o.modalonly = true;
		o.datatype = 'port';
		o.placeholder = '1080';
		o.depends('outbound', '_socks');
		o = s.taboption('out', form.Value, 'outbound_socks_username', _('Username'));
		o.modalonly = true;
		o.depends('outbound', '_socks');
		o = s.taboption('out', form.Value, 'outbound_socks_password', _('Password'));
		o.modalonly = true;
		o.password = true;
		o.depends('outbound', '_socks');

		o = s.taboption('out', form.Flag, 'accept_lan', _('Accept LAN Access'),
			_('Lets whoever connects reach the devices on this network and the router itself. Off, the private ranges are refused.'));
		o.modalonly = true;

		/* The share link, beside the settings in the table. */
		o = s.option(form.DummyValue, '_link', _('Share link'));
		o.modalonly = false;
		o.editable = true;
		o.renderWidget = function(section_id) {
			return E([
				pui.btn(_('Share link'), 'soft-blue mk-small', function() {
					if (uci.get(CONF, section_id, 'protocol') == null) return;
					showLink(section_id);
				}, 'link'),
				new ui.Hiddenfield('', { id: this.cbid(section_id) }).render()
			]);
		};

		return m.render().then(function(mapEl) {
			renderStatus(data[0]);
			window.setTimeout(function() { renderStatus(data[0]); }, 0);
			poll.add(function() {
				return callServer().then(renderStatus).catch(function() {});
			}, 5);
			pui.sortable(mapEl, CONF);
			return pui.page([ mapEl ]);
		});
	}
});
