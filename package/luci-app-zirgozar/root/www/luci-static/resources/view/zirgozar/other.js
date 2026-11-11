/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * Other Settings, the page of that name, section for section: Delay
 * Settings, Forwarding Settings, Xray Settings and the Xray noise packets.
 * After them, the two things of this program's own that are neither a basic
 * setting nor an update: the router's clock and the traffic history.
 *
 * Native sing-box-lx options sit beside the Xray settings and are passed to
 * the native tunnel and helper configurations.
 */

'use strict';
'require view';
'require form';
'require rpc';
'require ui';
'require uci';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';
'require zirgozar.checksites as checksites';

var _ = i18n.tr;

var callLed = rpc.declare({ object: 'luci.zirgozar', method: 'led', expect: { '': {} } });
var callLan = rpc.declare({ object: 'luci.zirgozar', method: 'lan', expect: { '': {} } });
var callAction = rpc.declare({ object: 'luci.zirgozar', method: 'action',
                               params: [ 'name', 'arg' ], expect: { '': {} } });

var PORTS_RE = /^\d+([:-]\d+)?(,\d+([:-]\d+)?)*$/;

function portValidate(section_id, value) {
	if (!value || PORTS_RE.test(value.replace(/\s+/g, ''))) return true;
	return _('The port settings support single ports and ranges. Separate multiple ports with commas (,). Example: 21,80,443,1000:2000.');
}

/* The week as it runs in Iran, from Saturday. The numbers are cron's. */
var WEEK = [
	[ '7', 'Every day' ], [ '6', 'Every Saturday' ], [ '0', 'Every Sunday' ],
	[ '1', 'Every Monday' ], [ '2', 'Every Tuesday' ], [ '3', 'Every Wednesday' ],
	[ '4', 'Every Thursday' ], [ '5', 'Every Friday' ]
];

return view.extend({
	__init__: function() { return pui.mount(this); },
	load: function() {
		return Promise.all([
			/* One ubus list and a lookup per interface: a tenth of a second,
			   for the interface list and nothing else. */
			pui.loadInfo('lan', callLan).catch(function() { return {}; }),
			uci.load('zirgozar').catch(function() { return null; }),
			pui.loadInfo('led', callLed).catch(function() { return {}; })
		]);
	},

	render: function(data) {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));

		var lan = (data && data[0]) || {};
		var m, s, o, i;

		m = new form.Map('zirgozar', _('Other Settings'));

		/* ------------------------------------------------ Delay Settings */
		s = m.section(form.NamedSection, 'config', 'zirgozar', _('Delay Settings'));
		s.anonymous = true;

		o = s.option(form.Flag, 'start_daemon', _('Open and close Daemon'),
			_('Checks the tunnel on its own schedule. Two consecutive failed checks trigger repair.'));
		o.default = '1';
		o.rmempty = false;

		o = s.option(form.ListValue, 'health_interval', _('Health check interval (minutes)'));
		[ 1, 2, 3, 5, 10, 15, 30 ].forEach(function(n) { o.value(String(n), String(n)); });
		o.default = '3';
		o.depends('start_daemon', '1');
		o = s.option(form.Flag, 'health_switch_slow', _('Replace a repeatedly slow config'),
			_('In Auto mode, two slow checks and a confirmation trigger testing alternatives. A replacement must pass another test and be at least 1.5 times faster. Sweeps are at least 10 minutes apart. Manually selected configs are kept.'));
		o.default = '1';
		o.rmempty = false;
		o.depends('start_daemon', '1');
		o = s.option(form.Value, 'health_slow_ms', _('Minimum slow delay (ms)'),
			_('A request must exceed both this delay and twice the best observed delay of the current config to count as slow.'));
		o.default = '1500';
		o.datatype = 'range(500,30000)';
		o.depends({ start_daemon: '1', health_switch_slow: '1' });

		o = s.option(form.Value, 'start_delay', _('Delay Start'), _('Units:seconds'));
		o.datatype = 'uinteger';
		o.default = '1';
		o.placeholder = '1';

		[ [ 'stop', _('Stop automatically mode'), _('Stop Time') ],
		  [ 'start', _('Start automatically mode'), _('Start Time') ],
		  [ 'restart', _('Restart automatically mode'), _('Restart Time') ] ].forEach(function(w) {
			o = s.option(form.ListValue, w[0] + '_week_mode', w[1]);
			o.value('', _('Disable'));
			if (w[0] == 'restart')
				o.value('8', _('Loop Mode'));
			WEEK.forEach(function(d) { o.value(d[0], _(d[1])); });

			o = s.option(form.Value, w[0] + '_time_mode', w[2]);
			for (i = 0; i < 24; i++)
				o.value(i + ':00');
			o.default = '0:00';
			o.datatype = 'timehhmm';
			WEEK.forEach(function(d) { o.depends(w[0] + '_week_mode', d[0]); });

			if (w[0] == 'restart') {
				o = s.option(form.ListValue, 'restart_interval_mode', _('Restart Interval(Hour)'));
				for (i = 1; i <= 24; i++)
					o.value(String(i), i + ' ' + _('Hour'));
				o.default = '2';
				o.depends('restart_week_mode', '8');
			}
		});

		/* ------------------------------------------- Forwarding Settings */
		s = m.section(form.NamedSection, 'config', 'zirgozar', _('Forwarding Settings'));
		s.anonymous = true;

		o = s.option(form.Value, 'tcp_no_redir_ports', _('Do not forward these TCP ports'));
		o.value('', _('No patterns are used'));
		o.value('1:65535', _('All'));
		o.validate = portValidate;

		o = s.option(form.Value, 'udp_no_redir_ports', _('Do not forward these UDP ports'),
			E('span', { 'style': 'color:#ef4444' },
				_('Fill in the ports you don\'t want to be forwarded by the agent, with the highest priority.')));
		o.value('', _('No patterns are used'));
		o.value('1:65535', _('All'));
		o.validate = portValidate;

		o = s.option(form.Value, 'tcp_redir_ports', _('Forward these TCP ports'));
		o.value('1:65535', _('All'));
		o.value('22,25,53,80,143,443,465,587,853,873,993,995,5222,8080,8443,9418', _('Common Use'));
		o.value('80,443', _('Only Web'));
		o.default = '1:65535';
		o.validate = portValidate;

		o = s.option(form.Value, 'udp_redir_ports', _('Forward these UDP ports'));
		o.value('1:65535', _('All'));
		o.default = '1:65535';
		o.validate = portValidate;

		o = s.option(form.DummyValue, '_ports_tip', ' ');
		o.rawhtml = true;
		o.cfgvalue = function() {
			return '<span style="color:#ef4444">' +
				_('The port settings support single ports and ranges. Separate multiple ports with commas (,). Example: 21,80,443,1000:2000.') +
				'</span>';
		};

		o = s.option(form.ListValue, 'firewall_backend', _('Prefer firewall tools'),
			_('Automatic is right unless this router has both and the wrong one is being picked.'));
		o.value('auto', _('Auto'));
		o.value('nftables', 'Nftables');
		o.value('iptables', 'Iptables');
		o.default = 'auto';

		o = s.option(form.ListValue, 'tcp_proxy_way', _('TCP Proxy Way'),
			_('REDIRECT: TCP goes to a port of its own and UDP by TPROXY. TPROXY carries both on one port.'));
		o.value('redirect', 'REDIRECT');
		o.value('tproxy', 'TPROXY');
		o.default = 'redirect';

		o = s.option(form.Flag, 'accept_icmp', _('Hijacking ICMP (PING)'),
			_('A tunnel carries no ICMP, so a ping to a tunnelled address never comes back. With this on, the router answers it.'));
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.ListValue, 'ipv6', _('IPv6'),
			_('Directly: IPv6 goes out without the tunnel. Refused: devices use IPv4, which goes through the tunnel. Through the tunnel: IPv6 goes through the node too; the node has to carry IPv6, and the firewall has to be nftables.'));
		o.value('off', _('Directly, outside the tunnel'));
		o.value('block', _('Refused, devices use IPv4'));
		o.value('proxy', _('Through the tunnel'));
		o.default = 'off';

		o = s.option(form.Flag, 'accept_icmpv6', _('Hijacking ICMPv6 (IPv6 PING)'),
			_('With IPv6 through the tunnel, the router answers pings to IPv6 addresses.'));
		o.default = '0';
		o.depends('ipv6', 'proxy');

		o = s.option(form.ListValue, 'lan_zone', _('Interfaces to tunnel'),
			_('Read from this router. Left unset — which is how it ships — every LAN interface is tunnelled, which is what almost everyone wants. Choose one to pick traffic up from that interface only.'));
		o.value('', _('All'));
		var seen = {};
		(lan.interfaces || []).forEach(function(it) {
			if (!it || !it.dev || seen[it.dev]) return;
			seen[it.dev] = true;
			o.value(it.dev, it.dev + ' (' + (it.net || '') + ')');
		});
		var curlan = uci.get('zirgozar', 'config', 'lan_zone');
		if (curlan && !seen[curlan])
			o.value(curlan, curlan);

		/* ---------------------------------------------- sing-box-lx Settings */
		s = m.section(form.NamedSection, 'config', 'zirgozar', 'sing-box-lx');
		s.anonymous = true;
		o = s.option(form.ListValue, 'lx_decoy_mode', _('QUIC anti-sniff paths'),
			_('Requires sing-box-lx 1.14.4-lx.33 or newer. Retry sends a decoy only after a failed attempt.'));
		o.value('', _('Default'));
		[ 'off', 'direct', 'detour', 'all' ].forEach(function(v) { o.value(v); });
		o = s.option(form.ListValue, 'lx_decoy_send', _('QUIC decoy timing'));
		o.value('', _('Default')); o.value('retry', _('Retry')); o.value('always', _('Always'));
		o = s.option(form.DynamicList, 'lx_decoy_outbound', _('QUIC decoy node types'));
		[ 'masque', 'hysteria2', 'tuic', 'trusttunnel', 'vless', 'vmess', 'trojan', 'wireguard' ].forEach(function(v) { o.value(v); });
		o.placeholder = 'masque';
		o.validate = function(section_id, value) { return !value || /^(masque|hysteria2|tuic|trusttunnel|vless|vmess|trojan|wireguard)$/.test(value) || _('Invalid value.'); };
		o = s.option(form.DynamicList, 'lx_decoy_detour', _('QUIC decoy relay types'));
		o.placeholder = 'vless';
		o.validate = function(section_id, value) { return !value || (/^[a-z][a-z0-9-]*$/.test(value) && !/^(selector|urltest|chain)$/.test(value)) || _('Invalid value.'); };
		o = s.option(form.ListValue, 'lx_mtu_mode', _('Tunnel MTU alignment'));
		o.value('', _('Default')); [ 'off', 'fill', 'clamp' ].forEach(function(v) { o.value(v); });
		o = s.option(form.DynamicList, 'lx_mtu_except', _('MTU alignment exceptions'),
			_('Exact outbound or endpoint tags excluded from automatic MTU alignment.'));
		o.placeholder = 'proxy';
		[ [ 'lx_masque_idle', 'MASQUE idle timeout' ], [ 'lx_trusttunnel_idle', 'TrustTunnel idle timeout' ] ].forEach(function(item) {
			o = s.option(form.Value, item[0], _(item[1]), _('Duration such as 30s or 5m. Empty keeps the core default.'));
			o.placeholder = '5m';
			o.validate = function(section_id, value) { return !value || /^(0|(?:[0-9]+(?:\.[0-9]+)?(?:ns|us|ms|s|m|h))+)$/.test(value) || _('Invalid value.'); };
		});
		o = s.option(form.TextValue, 'singbox_lx_options', _('Advanced sing-box-lx options (JSON)'),
			_('Root lx object. Fields above override matching JSON settings. Removed awg_masquerade and mobile-only wg idle controls are rejected.'));
		o.rows = 5; o.monospace = true;
		o.validate = function(section_id, value) {
			if (!value) return true;
			try { var v=JSON.parse(value); if (v && typeof v == 'object' && !Array.isArray(v) && !Object.prototype.hasOwnProperty.call(v,'awg_masquerade') && (!v.wg || Object.keys(v.wg).length == 0)) return true; } catch (e) {}
			return _('Enter supported sing-box-lx settings as a JSON object.');
		};

		/* -------------------------------------------------- Xray Settings */
		s = m.section(form.NamedSection, 'config', 'zirgozar', _('Xray Settings'));
		s.anonymous = true;

		o = s.option(form.TextValue, 'freedom_close', 'Freedom close (JSON)',
			_('Modify the first HTTP/1.1 request on the direct outbound. Supports rewriteHost, originalHostHeader, setHeaders, overrideHeaders, addHeaders, appendHeaders, removeHeaders, timeoutMs, onTimeout, nonHTTP and noHost. Empty disables it. Requires Xray-patterniha 26.11.12 or newer.'));
		o.rows = 6; o.monospace = true;
		o.placeholder = '{"rewriteHost":"example.com","setHeaders":{"Connection":"close"}}';
		o.validate = function(section_id, value) {
			if (!value) return true;
			try { var v = JSON.parse(value); if (v && typeof v == 'object' && !Array.isArray(v)) return true; } catch (e) {}
			return _('Enter a JSON object.');
		};

		o = s.option(form.Flag, 'fragment', _('Fragment'),
			_('TCP fragments, which can deceive the censorship system in some cases, such as bypassing SNI blacklists.'));
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.ListValue, 'fragment_packets', _('Fragment Packets'),
			_('“tlshello” splits the TLS client hello. “1-3” splits at the TCP layer, the first one to three writes the client makes.'));
		o.value('tlshello', 'tlshello');
		o.value('1-1', '1-1');
		o.value('1-2', '1-2');
		o.value('1-3', '1-3');
		o.value('1-5', '1-5');
		o.default = 'tlshello';
		o.depends('fragment', '1');

		o = s.option(form.Value, 'fragment_lengths', _('Fragment Length'), _('Fragmented packet length (byte)'));
		o.default = '3-5,6-8,10-20';
		o.placeholder = '3-5,6-8,10-20';
		o.depends('fragment', '1');

		o = s.option(form.Value, 'fragment_delays', _('Fragment Delay'), _('Fragmentation interval (ms)'));
		o.default = '10-20';
		o.placeholder = '10-20';
		o.depends('fragment', '1');

		o = s.option(form.Value, 'fragment_maxSplit', _('Max Split'), _('Limit the maximum number of splits.'));
		o.datatype = 'or(uinteger,portrange)';
		o.default = '3-6';
		o.placeholder = '3-6';
		o.depends('fragment', '1');

		o = s.option(form.Flag, 'noise', _('Noise'),
			_('Only affects mKCP configs and xhttp over HTTP/3. The packets are defined in the table below.'));
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.Flag, 'mux', _('Mux'),
			_('Several connections carried in one. Not used on a VLESS flow, xhttp or WireGuard node, where it cannot work.'));
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.Value, 'mux_concurrency', _('Mux concurrency'));
		o.datatype = 'integer';
		o.default = '8';
		o.depends('mux', '1');

		o = s.option(form.Value, 'xudp_concurrency', _('XUDP Mux concurrency'));
		o.datatype = 'integer';
		o.default = '16';
		o.depends('mux', '1');

		o = s.option(form.Flag, 'sniffing_override_dest', _('Override the connection destination address'),
			_('Override the connection destination address with the sniffed domain. Otherwise the sniffed domain is used for routing only.'));
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.TextValue, 'excluded_domains', _('Excluded Domains'),
			_('If the traffic sniffing result is in this list, the destination address will not be overridden.'));
		o.rows = 8;
		o.wrap = 'off';
		o.depends('sniffing_override_dest', '1');

		o = s.option(form.Value, 'buffer_size', _('Buffer Size'), _('Buffer size for every connection (kB)'));
		o.datatype = 'uinteger';

		/* ------------------------------------------- Xray noise packets */
		s = m.section(form.GridSection, 'xray_noise_packets', _('Xray Noise Packets'),
			E('span', { 'style': 'color:#ef4444' }, _('To send noise packets, select "Noise" in Xray Settings.')));
		s.addremove = true;
		s.anonymous = true;
		s.sortable = true;
		s.nodescriptions = true;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.default = '1';
		o.rmempty = false;
		o.editable = true;

		o = s.option(form.ListValue, 'type', _('Type'));
		o.value('rand', 'rand');
		o.value('array', 'array');
		o.value('str', 'str');
		o.value('hex', 'hex');
		o.value('base64', 'base64');

		o = s.option(form.Value, 'packet', _('Packet | Rand Length'));
		o.datatype = 'minlength(1)';
		o.rmempty = false;

		o = s.option(form.Value, 'delay', _('Delay (ms)'));
		o.datatype = 'or(uinteger,portrange)';
		o.rmempty = false;

		/* ----------------------------------------------- load balancing */
		s = m.section(form.NamedSection, 'config', 'zirgozar', _('Connection check settings'));
		s.anonymous = true;
		o = s.option(form.MultiValue, 'connection_check_sites', _('Test sites'), _('Select up to four sites. Changes are saved automatically.'));
		o.widget = 'checkbox'; o.orientation = 'horizontal';
		checksites.sites.forEach(function(site) { o.value(site.id, site.name); });
		o.cfgvalue = function(section) { return checksites.selected(uci.get('zirgozar', section, this.option)).map(function(site) { return site.id; }); };
		o.validate = function(section, value) { return !value || (Array.isArray(value) ? value : String(value).split(/\s+/)).length <= 4 || _('Select up to four sites.'); };
		o.write = function(section, value) { uci.set('zirgozar', section, this.option, Array.isArray(value) && value.length ? value.join(' ') : 'none'); };
		o.remove = function(section) { this.write(section, []); };
		o.renderWidget = function(section, index, value) {
			var readonly = this.readonly != null ? this.readonly : this.map.readonly;
			var control = new ui.Select(value || [], this.transformChoices(), {
				id: this.cbid(section), sort: this.keylist, multiple: true, widget: 'checkbox',
				orientation: 'horizontal', optional: true, validate: this.getValidator(section), disabled: readonly
			});
			// LuCI Select reads radio buttons by default, even in checkbox mode.
			control.getValue = function() {
				return Array.from(this.node.querySelectorAll('input[type="checkbox"]')).filter(function(input) { return input.checked; }).map(function(input) { return input.value; });
			};
			control.setValue = function(values) {
				values = Array.isArray(values) ? values : [];
				Array.from(this.node.querySelectorAll('input[type="checkbox"]')).forEach(function(input) { input.checked = values.indexOf(input.value) >= 0; });
			};
			var widget = control.render();
			Array.from(widget.querySelectorAll('input[type="checkbox"]')).forEach(function(input) {
				control.setUpdateEvents(input, 'change', 'blur');
				control.setChangeEvents(input, 'change');
			});
			widget.classList.add('pwp-check-sites');
			function limit() {
				var inputs = Array.from(widget.querySelectorAll('input[type="checkbox"]'));
				var full = inputs.filter(function(input) { return input.checked; }).length >= 4;
				inputs.forEach(function(input) { input.disabled = readonly || (full && !input.checked); });
			}
			widget.addEventListener('change', limit); limit();
			var pending = Promise.resolve(), saved = control.getValue(), saving = 0;
			document.addEventListener('click', function(event) {
				var link = event.target.closest && event.target.closest('.mk-tabs a[href]');
				if (!saving || !link || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
				event.preventDefault();
				var href = link.href;
				pending.then(function() { pui.navigate(href); });
			}, true);
			widget.addEventListener('change', function() {
				var choices = control.getValue();
				saving++;
				pending = pending.then(function() {
					return callAction('check_sites', choices.join(' ')).then(function(result) {
						if (!result || !result.ok) throw new Error((result && result.error) || _('Could not save settings.'));
						saved = choices;
						uci.set('zirgozar', section, 'connection_check_sites', choices.length ? choices.join(' ') : 'none');
					});
				}).catch(function(error) {
					if (control.getValue().join(' ') === choices.join(' ')) { control.setValue(saved); limit(); }
					ui.addNotification(null, E('p', {}, error.message || _('Could not save settings.')), 'error');
				}).finally(function() { saving--; });
			});
			return widget;
		};

		s = m.section(form.NamedSection, 'config', 'zirgozar', _('Load Balancing'),
			_('HAProxy, from App Update, spreads connections over the servers below and leaves out one that stops answering. Point a config at 127.0.0.1 and the port to use them.'));
		s.anonymous = true;

		o = s.option(form.Flag, 'balancing_enable', _('Enable Load Balancing'));
		o.rmempty = false;

		o = s.option(form.Value, 'health_check_inter', _('Health Check Inter (s)'));
		o.datatype = 'range(5,3600)';
		o.placeholder = '60';
		o.depends('balancing_enable', '1');

		o = s.option(form.Value, 'console_port', _('Console Port'), _('A page showing each server as up or down. Empty for none.'));
		o.datatype = 'port';
		o.depends('balancing_enable', '1');
		o = s.option(form.Value, 'console_user', _('Console Username'));
		o.depends('balancing_enable', '1');
		o = s.option(form.Value, 'console_password', _('Console Password'));
		o.password = true;
		o.depends('balancing_enable', '1');

		s = m.section(form.GridSection, 'haproxy_config', _('Load balancing servers'));
		s.addremove = true;
		s.anonymous = true;
		s.sortable = true;
		s.nodescriptions = true;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.default = '1';
		o.rmempty = false;
		o.editable = true;

		o = s.option(form.Value, 'lbss', _('Server address'), _('host:port'));
		o.rmempty = false;
		o.validate = function(section_id, value) {
			return /^(\[[0-9a-fA-F:]+\]|[^:\s]+):\d+$/.test(value || '') ? true : _('Expecting: %s').format('host:port');
		};

		o = s.option(form.Value, 'lbort', _('Listen Port'));
		o.datatype = 'port';
		o.rmempty = false;
		o.default = '1181';

		o = s.option(form.Value, 'lbweight', _('Weight'));
		o.datatype = 'range(1,256)';
		o.default = '5';

		o = s.option(form.Flag, 'backup', _('Backup'));
		o.editable = true;

		/* ------------------------------------------------------ traffic */
		s = m.section(form.NamedSection, 'config', 'zirgozar', _('Traffic history'));
		s.anonymous = true;

		o = s.option(form.Flag, 'stats_enabled', _('Traffic statistics'),
			_('Shows the tunnel traffic.'));
		o.default = '1';
		o.rmempty = false;

		o = s.option(form.Value, 'stats_flush_minutes', _('Traffic: written every (Min)'),
			_('How often the running total is written to storage, in minutes. Anything not yet written is lost if the router loses power. Five is the default and matches how often the counters are read, so at most one reading is ever at risk.'));
		o.datatype = 'range(1,1440)';
		o.default = '5';
		o.placeholder = '5';
		/* Written out on save rather than left absent. A router upgraded from
		   1.0.0 has no value for this at all - the old field was in seconds
		   and is gone - and an empty box beside a number that is quietly
		   being used is a worse answer than the number. */
		o.rmempty = false;

		o = s.option(form.DummyValue, '_forget');
		o.render = function() {
			return E('div', { 'style': 'padding:12px 0' }, [
				pui.btn(_('Forget all recorded traffic'), 'danger mk-small', function(ev) {
					var b = ev.currentTarget;
					return callAction('stats_reset', '').then(function() {
						pui.note(b, _('Traffic history cleared.'), 'ok');
					});
				}, 'trash')
			]);
		};

		var led = data[2] || {};
		s = m.section(form.NamedSection, 'config', 'zirgozar', _('LED color'));
		s.anonymous = true;
		o = s.option(form.Flag, 'led_enabled', _('LED color'), led.supported
			? _('Use URL test latency of the current connection. Disabled follows OpenWrt LED settings. Failed tests or a disconnected tunnel turn the indicator off.')
			: _('No supported dimmable RGB indicator was detected on this router.'));
		o.default = '0'; o.rmempty = false; o.readonly = !led.supported;
		if (led.supported) {
			var bounds = [ ['green', 200, _('Green below (ms)')], ['yellow', 300, _('Yellow below (ms)')], ['orange', 500, _('Orange below (ms)')], ['red', 0, _('Red')] ];
			bounds.forEach(function(b) {
				if (b[0] != 'red') {
				var v = s.option(form.Value, 'led_' + b[0] + '_ms', b[2]);
				v.default = String(b[1]); v.rmempty = false; v.datatype = 'range(1,60000)'; v.depends('led_enabled', '1');
				v.validate = function(sid, value) {
					var vals = bounds.slice(0, 3).map(function(x) {
						var opt = m.lookupOption('led_' + x[0] + '_ms', sid);
						return Number(opt && opt[0] ? opt[0].formvalue(sid) : x[1]);
					});
					return vals.every(function(n) { return Number.isInteger(n) && n >= 1 && n <= 60000; }) && vals[0] < vals[1] && vals[1] < vals[2]
						? true : _('LED thresholds must increase: green, yellow, orange.');
				};
				}
				var mode = s.option(form.ListValue, 'led_' + b[0] + '_mode', b[2] + ' — ' + _('Light mode'));
				mode.value('steady', _('Steady')); if (led.blink) mode.value('blink', _('Blinking'));
				mode.default = 'steady'; mode.rmempty = false; mode.depends('led_enabled', '1');
			});
		}

		return m.render().then(function(mapEl) {
			/* The router's clock: not a setting, one button. */
			var clock = pui.card(_('Router clock'), 'clock', '#f59e0b', E('div', {}, [
				E('p', { 'style': 'font-size:13px;color:var(--muted);margin:0 0 10px' },
					_('Sets the router clock to Iran time. If the router clock is wrong, secure connections and tunnel connections cannot be made.')),
				pui.btn(_('Set router clock'), 'primary mk-small', function(ev) {
					var b = ev.currentTarget;
					return callAction('set_clock', '').then(function(r) {
						pui.note(b, (r && r.already)
							? _('The router clock was already set.')
							: _('Router clock set: Tehran time, with the Iranian time servers.'), 'ok');
					});
				}, 'clock')
			]));
			pui.sortable(mapEl, 'zirgozar');
			return pui.page([ mapEl, clock ]);
		});
	}
});
