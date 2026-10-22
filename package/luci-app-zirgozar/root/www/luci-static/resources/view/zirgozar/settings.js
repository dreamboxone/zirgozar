/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * Basic Settings, the page of that name and this program's first
 * page: the row of tiles and what the tunnel is doing at the top, then the
 * Main tab with the main switch, the node, the router's own traffic and the
 * LAN's, and the SOCKS ports; the DNS tab; the Log tab; and at the foot what
 * has gone through the tunnel. There is one main switch, the one in the Main
 * tab, and it is saved and applied's is.
 *
 * How a node is chosen is on Configs, and everything else kept
 * in Other Settings is on that page here as well, and nowhere else.
 */

'use strict';
'require view';
'require form';
'require validation';
'require uci';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';
'require rpc';
'require zirgozar.status as status';

var callSubNodes = rpc.declare({ object: 'luci.zirgozar', method: 'subnodes', expect: { '': {} } });
var callAction = rpc.declare({ object: 'luci.zirgozar', method: 'action',
                               params: [ 'name', 'arg' ], expect: { '': {} } });

/* The Backup and Restore. The archive goes to and from the browser
   through LuCI's own file transfer, at the two paths the ACL allows. */
var BACKUP_PATH = '/tmp/zirgozar-backup.tar';
var RESTORE_PATH = '/tmp/zirgozar-restore';

function backupDownload() {
	var d = new Date(), pad = function(n) { return ('0' + n).slice(-2); };
	var name = 'zirgozar-backup-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
	           '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.tar';
	var form = E('form', { 'method': 'post', 'action': L.env.cgi_base + '/cgi-download', 'style': 'display:none' }, [
		E('input', { 'type': 'hidden', 'name': 'sessionid', 'value': rpc.getSessionID() }),
		E('input', { 'type': 'hidden', 'name': 'path', 'value': BACKUP_PATH }),
		E('input', { 'type': 'hidden', 'name': 'filename', 'value': name }),
		E('input', { 'type': 'hidden', 'name': 'mimetype', 'value': 'application/x-tar' })
	]);
	document.body.appendChild(form);
	form.submit();
	window.setTimeout(function() { if (form.parentNode) form.parentNode.removeChild(form); }, 1000);
}

function backupUpload(file) {
	var data = new FormData();
	data.append('sessionid', rpc.getSessionID());
	data.append('filename', RESTORE_PATH);
	data.append('filedata', file);
	return fetch(L.env.cgi_base + '/cgi-upload', { method: 'POST', body: data }).then(function(r) {
		if (!r.ok) throw new Error(_('The file could not be sent to the router.'));
	});
}

/* Asks for the file, and for a yes, before anything is sent. Resolves with
   the router's answer, or null when nothing was chosen. */
function backupRestore() {
	var picker = E('input', { 'type': 'file', 'accept': '.tar,.tar.gz,.tgz,.gz,application/x-tar,application/gzip', 'style': 'display:none' });
	return new Promise(function(resolve, reject) {
		picker.addEventListener('change', function() {
			var f = picker.files && picker.files[0];
			if (picker.parentNode) picker.parentNode.removeChild(picker);
			if (!f || !window.confirm(_('Every config, subscription and setting will be replaced by the ones in the backup file. Continue?')))
				return resolve(null);
			backupUpload(f).then(function() {
				return callAction('backup_restore', '');
			}).then(resolve, reject);
		});
		document.body.appendChild(picker);
		picker.click();
	});
}

/* Our own strings, in the language the setting names. The global _()
   is shadowed for this file only: LuCI translates through .lmo
   catalogues built by a tool this package's build does not have. */
var _ = i18n.tr;

/* The public Iranian resolvers, offered as the Direct DNS rather than typed.
   Nothing is chosen by default and nothing has to be: Auto uses the ISP's.
   Picking one means that resolver sees every name that goes straight out,
   which is a decision worth making deliberately. */
var IR_RESOLVERS = [
	[ '178.22.122.100', 'Shecan' ],
	[ '185.51.200.2', 'Shecan' ],
	[ '78.157.42.101', 'Electro' ],
	[ '10.202.10.202', '403.online' ],
	[ '10.202.10.102', '403.online' ],
	[ '10.202.10.10', 'Radar Game' ],
	[ '10.202.10.11', 'Radar Game' ],
	[ '185.55.226.26', 'Begzar' ],
	[ '185.55.225.25', 'Begzar' ]
];

function hostname(v) {
	return /^[A-Za-z0-9_]([A-Za-z0-9_-]{0,62}\.)*[A-Za-z0-9_-]{1,63}\.?$/.test(v);
}

/* One entry a line, as Xray writes them, # starting a comment. The first line
   that is not one is named in the answer. */
function eachLine(value, ok) {
	var lines = String(value || '').split(/\r?\n/);
	for (var i = 0; i < lines.length; i++) {
		var l = lines[i].trim();
		if (!l || l.charAt(0) == '#') continue;
		if (!ok(l)) return _('Not valid, please re-enter: %s').format(l);
	}
	return true;
}

function domainEntry(l) {
	if (/\s/.test(l)) return false;
	if (/^(regexp|keyword|geosite|ext|rule-set|rs):./.test(l)) return true;
	return hostname(l.replace(/^(domain|full):/, '').replace(/^\./, ''));
}

function ipEntry(l) {
	if (/^(geoip|ext|rule-set|rs):\S+$/.test(l)) return true;
	if (/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(l)) return true;
	return /^[0-9a-fA-F:]+:[0-9a-fA-F:]*(\/\d{1,3})?$/.test(l);
}

/* A DNS address typed into a list that already offers a few is kept: it is
   remembered, offered in the drop-down from then on, and carries a small x
   beside it that takes it away. The control forgot a typed address as soon as
   another was chosen, and had no way to remove one. */
function savedDns(opt, key, builtin) {
	function load(sid) {
		var v = uci.get('zirgozar', sid, key);
		return Array.isArray(v) ? v.slice() : (v ? [ v ] : []);
	}

	function forget(sid, value) {
		var rest = load(sid).filter(function(x) { return x != value; });
		if (rest.length)
			uci.set('zirgozar', sid, key, rest);
		else
			uci.unset('zirgozar', sid, key);
	}

	function decorate(node, sid) {
		if (!node || !node.querySelectorAll)
			return node;
		var mark = function() {
			var kept = load(sid);
			node.querySelectorAll('li[data-value]').forEach(function(li) {
				var v = li.getAttribute('data-value');
				/* Only an address that is really in the saved list: not one of
				   the built-in ones, and not the row for typing a new one. */
				if (!v || builtin.indexOf(v) >= 0 || kept.indexOf(v) < 0 ||
				    li.classList.contains('create-item') || li.querySelector('input, .zgz-del'))
					return;
				li.appendChild(E('span', {
					'class': 'zgz-del',
					'title': _('Remove'),
					'style': 'float:inline-end;cursor:pointer;color:#dc2626;font-weight:700;font-size:24px;line-height:1;padding:0 10px',
					'click': function(ev) {
						ev.preventDefault();
						ev.stopPropagation();
						forget(sid, v);
						if (li.parentNode)
							li.parentNode.removeChild(li);
					}
				}, '×'));
			});
		};
		new MutationObserver(mark).observe(node, { childList: true, subtree: true });
		mark();
		return node;
	}

	builtin = builtin.concat(opt.keylist || []);
	load('config').forEach(function(v) {
		if (builtin.indexOf(v) < 0)
			opt.value(v, v);
	});

	var render = opt.renderWidget;
	opt.renderWidget = function(section_id) {
		var r = render.apply(this, arguments);
		if (r && typeof r.then == 'function')
			return r.then(function(n) { return decorate(n, section_id); });
		return decorate(r, section_id);
	};

	var write = opt.write;
	opt.write = function(section_id, value) {
		if (value && builtin.indexOf(value) < 0) {
			var cur = load(section_id);
			if (cur.indexOf(value) < 0)
				uci.set('zirgozar', section_id, key, cur.concat([ value ]));
		}
		return write.apply(this, arguments);
	};
}

function fillNodeChoices(widget, keys, labels) {
	var choices = {};
	keys.forEach(function(key, i) { choices[key] = labels[i]; });
	if (typeof widget.addChoices === 'function') {
		widget.addChoices(keys, choices);
		return;
	}
	var root = widget.node;
	var select = root && (root.tagName === 'SELECT' ? root : root.querySelector('select'));
	if (!select) return;
	var current = select.value;
	keys.forEach(function(key, i) {
		if (!Array.prototype.some.call(select.options, function(option) { return option.value === key; }))
			select.appendChild(E('option', { value: key }, labels[i]));
	});
	select.value = current;
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('zirgozar').catch(function() { return null; }),
			status.load()
		]);
	},

	render: function(data) {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));
		var st = status.render(data[1]);
		var content = E('div', {}, _('Loading settings…'));
		var page = pui.page(st.top.concat([ content ]), { version: st.version });
		var self = this;
		/* Mount the dashboard before rendering the form. Subscription data is optional. */
		window.setTimeout(function() {
			self.renderForm([ data[0], data[1], { nodes: [] } ], st).then(function(formEl) {
				while (content.firstChild) content.removeChild(content.firstChild);
				content.appendChild(formEl);
			}).catch(function() {
				content.textContent = _('Could not load settings. Reload this page to retry.');
			});
		}, 0);
		return page;
	},

	renderForm: function(data, st) {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));

		var m, s, o, i;

		/* The nodes added by hand, for every node choice on the page. */
		var manual = uci.sections('zirgozar', 'node');
		function nodeChoices(opt) {
			manual.forEach(function(n) {
				opt.value(n['.name'], n.name || n['.name']);
			});
		}
		/* And for the tunnel's own node, the nodes of the subscriptions too, as
		   they are offered. A subscription's nodes are read afresh every
		   time, so one is kept by what it is - subscription, protocol, address,
		   port and name - and found again in each new list. */
		var subNodes = (data[2] && data[2].nodes) || [];
		var subscriptionOptions = [];
		/* Several nodes of one list can share a name and an address - one
		   with ECH, one with a fragment, one over IPv6 - and are told apart by
		   a fingerprint of the node, which the reference ends in and the name
		   shows when the name alone is not enough. */
		var seenName = {};
		subNodes.forEach(function(n) {
			var k = n.sub + '|' + n.label;
			seenName[k] = (seenName[k] || 0) + 1;
		});
		function subChoices(opt, keep, refresh) {
			if (!refresh) subscriptionOptions.push({ opt: opt, keep: keep });
			subNodes.forEach(function(n) {
				var parts = [ n.protocol, n.host, n.port, n.label ];
				if (n.fp) parts.push('#' + n.fp);
				var name = n.label || (n.host + ':' + n.port);
				if (n.fp && seenName[n.sub + '|' + n.label] > 1) name += ' · ' + n.fp.slice(0, 4);
				var key = 'sub:' + n.sub + ':' + parts.join('|');
				if (opt.keylist.indexOf(key) < 0) opt.value(key, n.subname + ' › ' + name);
			});
			/* A choice whose node has left the list is still the choice, and is
			   found again by the router; it keeps a name here. */
			(keep || [ uci.get('zirgozar', 'config', 'node') ]).forEach(function(cur) {
				cur = cur || '';
				if (cur.indexOf('sub:') == 0 && opt.keylist.indexOf(cur) < 0) {
					var k = cur.split(':').slice(2).join(':').split('|');
					opt.value(cur, (k[3] || k[1] || cur));
				}
			});
		}

		/* The tiles and the status card for the top of the page, and the
		   traffic for the Log tab. */

		m = new form.Map('zirgozar', _('Basic Settings'));

		s = m.section(form.NamedSection, 'config', 'zirgozar');
		s.anonymous = true;

		/* The tabs. */
		s.tab('main', _('Main'));
		s.tab('shunt', _('Shunt Rule'));
		s.tab('dns', _('DNS'));
		s.tab('log', _('Log'));
		s.tab('maintain', _('Maintain'));

		/* ---------------------------------------------------------- main */
		o = s.taboption('main', form.Flag, 'enabled', _('Main switch'),
			_('The tunnel on or off. Save and apply for it to take effect; it holds across a reboot.'));
		o.rmempty = false;

		o = s.taboption('main', form.ListValue, 'core_engine', _('Active core'),
			_('Auto: Xray, and sing-box for a config Xray cannot run. Xray (patterniha): his build first, with QUIC refused as PattN does. sing-box or sing-box-lx: every config through it; if it cannot start, Xray takes over. An OpenVPN config is always carried by OpenVPN itself, beside whichever is chosen here; install it on the App Update page.'));
		o.value('xray', _('Auto'));
		o.value('xray-patterniha', 'Xray (patterniha)');
		o.value('singbox', 'sing-box');
		o.value('singbox-lx', 'sing-box-lx');
		o.default = 'xray';
		o.rmempty = false;

		o = s.taboption('main', form.ListValue, 'node', _('Choose node'),
			_('Auto measures the nodes and uses the fastest. A node chosen here - added by hand or from a subscription - is used as it is, and nothing is measured. A subscription’s node is found again each time its list is read.'));
		o.value('', _('Auto (fastest)'));
		nodeChoices(o);
		subChoices(o);

		o = s.taboption('main', form.Flag, 'preproxy_enabled', _('Preproxy'),
			_('Every node the tunnel may choose dials out through this node first — the pre-proxy. For a node that cannot be reached from here directly, or to hide which nodes are being used. With it on, the first-pass handshake is skipped, because no node is reached directly.'));
		o.default = '0';
		o.rmempty = false;

		o = s.taboption('main', form.ListValue, 'preproxy_node', _('Preproxy Node'),
			_('Nodes added by hand on the Configs page.'));
		o.depends('preproxy_enabled', '1');
		nodeChoices(o);

		o = s.taboption('main', form.Flag, 'localhost_proxy', _('Localhost Proxy'),
			_('On: the router also uses the tunnel.'));
		o.default = '1';
		o.rmempty = false;

		o = s.taboption('main', form.Flag, 'client_proxy', _('Client Proxy'),
			_('When selected, devices in LAN go through the tunnel. Otherwise they do not, but the devices named on the Access Control page still do.'));
		o.default = '1';
		o.rmempty = false;

		o = s.taboption('main', form.Flag, 'kill_switch', _('Kill switch'),
			_('Off, the network works directly whenever the tunnel is not carrying it — stopped, failed, restarting, or not up yet after a reboot. On, a rule of its own, kept apart from the tunnel and never removed with it, closes the way out for the devices on your network in all of those cases: they reach the local network and nothing else, and are never sent out untunnelled without your knowing. Iranian addresses stay reachable if the Iran split is on, and so do the addresses and devices you set to go direct. Pings, which the tunnel does not carry, are blocked too. To get the direct network back, turn this off and save.'));
		o.default = '0';
		o.rmempty = false;

		o = s.taboption('main', form.Value, 'node_socks_port', _('Node Socks Listen Port'),
			_('A SOCKS server on the router that goes out the way the tunnel does. Empty for none.'));
		o.datatype = 'port';
		o.placeholder = '1070';
		o.default = '1070';

		o = s.taboption('main', form.Value, 'node_http_port', _('Node HTTP Listen Port'),
			_('An HTTP proxy beside it, the same way out. Empty for none.'));
		o.datatype = 'port';
		o.placeholder = '1071';

		o = s.taboption('main', form.Flag, 'node_socks_bind_local', _('Node Socks Bind Local'),
			_('When selected, it can only be accessed localhost.'));
		o.default = '1';
		o.rmempty = false;

		o = s.taboption('main', form.Flag, 'socks_enabled', _('Socks Main switch'),
			_('More SOCKS ports, each through a node of its own — the table below.'));
		o.default = '0';
		o.rmempty = false;

		/* The Socks Config, inside this tab rather than under the
		   page, so it is seen with the switch that turns it on. */
		o = s.taboption('main', form.SectionValue, '_socks', form.GridSection, 'socks', _('Socks Config'));
		o.depends('socks_enabled', '1');
		var ss = o.subsection;
		ss.addremove = true;
		ss.anonymous = true;
		ss.sortable = true;
		ss.nodescriptions = true;

		var so = ss.option(form.Flag, 'enabled', _('Enable'));
		so.default = '1';
		so.rmempty = false;
		so.editable = true;

		so = ss.option(form.ListValue, 'node', _('Socks Node'));
		so.value('', _('The node the tunnel is using'));
		nodeChoices(so);

		so = ss.option(form.Value, 'port', _('Socks Listen Port'));
		so.datatype = 'port';
		so.rmempty = false;
		/* After the tunnel's own ports, so a new row never lands on one. */
		so.default = String(1090 + uci.sections('zirgozar', 'socks').length);

		so = ss.option(form.Value, 'http_port', _('HTTP Listen Port'));
		so.datatype = 'port';
		so.placeholder = _('None');
		so.validate = function(section_id, value) {
			return (!value || value != this.section.formvalue(section_id, 'port')) ? true : _('Not the SOCKS port.');
		};

		/* Auto Switch: backups for this port, tried when its node fails. */
		so = ss.option(form.Flag, 'enable_autoswitch', _('Auto Switch'));
		so.default = '0';
		so.modalonly = true;

		so = ss.option(form.MultiValue, 'autoswitch_backup_node', _('Backup nodes'),
			_('Used in turn when the node above fails; the one that answers fastest is chosen.'));
		so.widget = 'checkbox';
		so.depends('enable_autoswitch', '1');
		so.modalonly = true;
		/* A new row has no list yet, and the widget reads .length. */
		so.cfgvalue = function(section_id) {
			var v = uci.get('zirgozar', section_id, 'autoswitch_backup_node');
			return v == null || v === '' ? [] : (Array.isArray(v) ? v : [ v ]);
		};
		nodeChoices(so);
		subChoices(so, []);
		pui.checkboxes(so);

		so = ss.option(form.Value, 'autoswitch_probe_url', _('Probe URL'));
		so.placeholder = 'https://www.google.com/generate_204';
		so.depends('enable_autoswitch', '1');
		so.modalonly = true;
		so.validate = function(section_id, value) {
			return (!value || /^https?:\/\/\S+$/.test(value)) ? true : _('Must start with http:// or https://');
		};

		so = ss.option(form.Value, 'autoswitch_testing_time', _('How often to test (min)'));
		so.datatype = 'range(1,60)';
		so.placeholder = '1';
		so.depends('enable_autoswitch', '1');
		so.modalonly = true;

		so = ss.option(form.Value, 'autoswitch_connect_timeout', _('Timeout (s)'));
		so.datatype = 'range(1,30)';
		so.placeholder = '3';
		so.depends('enable_autoswitch', '1');
		so.modalonly = true;

		so = ss.option(form.Value, 'autoswitch_retry_num', _('Failures before switching'));
		so.datatype = 'range(1,10)';
		so.placeholder = '1';
		so.depends('enable_autoswitch', '1');
		so.modalonly = true;

		so = ss.option(form.Flag, 'autoswitch_restore_switch', _('Back to the main node'),
			_('Return to the node above as soon as it works again.'));
		so.default = '1';
		so.depends('enable_autoswitch', '1');
		so.modalonly = true;

		/* Back to how the package installed it, on the next save. Asked about
		   when ticked, since there is no undo; the page reloads once it has
		   happened, because everything it shows has just changed. */
		o = s.taboption('main', form.Flag, 'factory_reset', _('Restore defaults'),
			_('Tick and save to delete every config and subscription and put every setting back as it was when the program was installed. The routing data, the downloaded cores and the traffic history are kept. There is no undo.'));
		o.default = '0';
		o.rmempty = true;
		/* A tick box rather than the switch every other setting is: this is
		   something done once, not something left on. */
		o.renderWidget = function(section_id, option_index, cfgvalue) {
			var w = form.Flag.prototype.renderWidget.apply(this, [ section_id, option_index, cfgvalue ]);
			var cb = w.querySelector ? w.querySelector('input[type=checkbox]') : null;
			if (cb) cb.classList.add('zgz-tick');
			return w;
		};
		o.onchange = function(ev, section_id, value) {
			if (value == '1' && !window.confirm(_('Every config, every subscription and every setting will be deleted when you save. Continue?'))) {
				var cb = ev && ev.target;
				if (cb) cb.checked = false;
				this.getUIElement(section_id).setValue('0');
				return;
			}
			if (value == '1') {
				document.addEventListener('uci-applied', function() {
					window.setTimeout(function() { location.reload(); }, 4000);
				}, { once: true });
			}
		};

		/* ---------------------------------------------------- shunt rule
		   The Shunt Rule tab, with the rules themselves in it too:
		   which traffic each rule is about, and where it goes. */
		var rules = uci.sections('zirgozar', 'shunt_rules');
		var groups = {};
		rules.forEach(function(r) {
			if (r.group) groups[r.group] = true;
		});
		var group = String(uci.get('zirgozar', 'config', 'shunt_group') || '').toLowerCase();

		function whereTo(opt, withDefault) {
			if (withDefault) {
				opt.value('', _('Close (Not use)'));
				opt.value('_default', _('Use default node'));
			}
			opt.value('_proxy', _('The node the tunnel is using'));
			opt.value('_direct', _('Direct Connection'));
			opt.value('_blackhole', _('Blackhole (Block)'));
			nodeChoices(opt);
			/* A subscription's nodes too, as for the tunnel's own node. */
			subChoices(opt, rules.map(function(r) { return r.node; })
				.concat([ uci.get('zirgozar', 'config', 'default_node') ]));
		}

		o = s.taboption('shunt', form.ListValue, 'domainStrategy', _('Domain Strategy'),
			_('AsIs: only the name is used for routing. IPIfNonMatch: when no rule matches the name, it is resolved to addresses and all the rules are tried again. IPOnDemand: whenever an address rule is met, the name is resolved at once. Auto chooses IPIfNonMatch when a rule or the Iran split has addresses in it, and AsIs otherwise.'));
		o.value('IPOnDemand');
		o.value('IPIfNonMatch');
		o.value('AsIs');
		o.value('auto', _('Auto'));
		o.default = 'IPOnDemand';

		o = s.taboption('shunt', form.ListValue, 'domainMatcher', _('Domain matcher'),
			_('Chooses how Xray matches domain names against routing rules. hybrid uses a combined matcher; linear checks the domain patterns sequentially. Keep hybrid unless you need linear for troubleshooting. This changes the matching method, not the rule order or DNS settings.'));
		o.value('', 'hybrid');
		o.value('linear');

		o = s.taboption('shunt', form.Flag, 'shunt_fakedns', _('FakeDNS Main switch'),
			_('Names that go through a node are answered with made-up addresses, and the node looks up the real one at the far end — for streaming services that unlock by DNS, or to save a lookup. Tick it for each rule below that should use it. The router itself can open those names only with Localhost Proxy on.'));
		o.default = '0';
		o.rmempty = false;

		o = s.taboption('shunt', form.ListValue, 'shunt_group', _('Shunt Rule Group'),
			_('Only the rules of this group are used. Save and apply for the table below to show them.'));
		o.value('', _('default'));
		Object.keys(groups).sort().forEach(function(g) { o.value(g); });

		/* The rules themselves, and where each goes, in one table: the row has
		   the rule's name and where it sends what it matches; the edit window
		   has which traffic that is. In this order, ahead of the Iran split. */
		o = s.taboption('shunt', form.SectionValue, '_shunt', form.GridSection, 'shunt_rules');
		var sr = o.subsection;
		sr.anonymous = true;
		sr.addremove = true;
		sr.sortable = true;
		sr.nodescriptions = true;
		sr.filter = function(section_id) {
			return String(uci.get('zirgozar', section_id, 'group') || '').toLowerCase() == group;
		};
		/* The words only: LuCI puts them in a row of its own. */
		sr.renderSectionPlaceholder = function() {
			return E('em', {}, _('No shunt rules yet. Add one with the button below.'));
		};

		so = sr.option(form.Value, 'remarks', _('Rule'));
		so.rmempty = false;
		so.validate = function(section_id, value) {
			value = String(value || '').trim();
			if (!value) return _('Remark cannot be empty.');
			var dup = uci.sections('zirgozar', 'shunt_rules').some(function(x) {
				return x['.name'] != section_id && String(x.remarks || '') == value;
			});
			return dup ? _('This remark already exists, please change a new remark.') : true;
		};

		so = sr.option(form.ListValue, 'node', _('Node name'));
		whereTo(so, true);
		so.editable = true;

		so = sr.option(form.Flag, 'fakedns', 'FakeDNS');
		so.default = '0';
		so.editable = true;

		so = sr.option(form.ListValue, 'preproxy', _('Preproxy'));
		so.value('', _('Close (Not use)'));
		nodeChoices(so);
		so.editable = true;
		so.validate = function(section_id, value) {
			var node = this.section.formvalue(section_id, 'node');
			return value && value == node ? _('A node cannot be its own pre-proxy.') : true;
		};

		so = sr.option(form.Value, 'group', _('Shunt Rule Group'));
		so.modalonly = true;
		/* A new rule lands in the group on show, or the table would hide it. */
		so.default = uci.get('zirgozar', 'config', 'shunt_group') || '';
		so.value('', _('default'));
		Object.keys(groups).sort().forEach(function(g) { so.value(g); });

		so = sr.option(form.MultiValue, 'protocol', _('Protocol'));
		so.modalonly = true;
		so.value('http');
		so.value('tls');
		so.value('quic');
		so.value('bittorrent');
		pui.checkboxes(so);

		so = sr.option(form.MultiValue, 'inbound', _('Inbound Tag'),
			_('None ticked is both.'));
		so.modalonly = true;
		so.value('tproxy', _('Transparent proxy'));
		so.value('socks', 'Socks');
		pui.checkboxes(so);

		so = sr.option(form.ListValue, 'network', _('Network'));
		so.modalonly = true;
		so.value('tcp,udp', 'TCP UDP');
		so.value('tcp', 'TCP');
		so.value('udp', 'UDP');

		so = sr.option(form.DynamicList, 'source', _('Source'),
			_('A device’s address, a range such as 192.168.1.0/24, or geoip:private.'));
		so.modalonly = true;
		so.validate = function(section_id, value) {
			if (!value || /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(value) || /^geoip:\S+$/.test(value)) return true;
			return _('Not valid, please re-enter: %s').format(value);
		};

		so = sr.option(form.Value, 'port', _('Port'),
			_('Such as 443, 80,443 or 1000-2000.'));
		so.modalonly = true;
		so.validate = function(section_id, value) {
			if (!value || /^[0-9]+([-:][0-9]+)?(,[0-9]+([-:][0-9]+)?)*$/.test(String(value).replace(/\s/g, ''))) return true;
			return _('Not valid, please re-enter: %s').format(value);
		};

		so = sr.option(form.TextValue, 'domain_list', _('Domain'),
			_('One a line. domain:example.com is that name and everything under it; full: that name only; regexp: a regular expression; keyword: or a plain word anywhere in the name; geosite: a list from the routing data. A line starting with # is a comment.'));
		so.modalonly = true;
		so.rows = 8;
		so.wrap = 'off';
		so.validate = function(section_id, value) {
			return eachLine(value, domainEntry);
		};

		so = sr.option(form.TextValue, 'ip_list', 'IP',
			_('One a line: an address, a range such as 10.0.0.0/8, or geoip: and a country code from the routing data. A line starting with # is a comment.'));
		so.modalonly = true;
		so.rows = 8;
		so.wrap = 'off';
		so.validate = function(section_id, value) {
			return eachLine(value, ipEntry);
		};

		so = sr.option(form.Flag, 'invert', 'invert',
			_('Invert match result.') + ' ' + _('Only support Sing-Box.') + ' ' +
			_('With Xray as the active core the rule is left out.'));
		so.modalonly = true;

		sr.description = E('div', { 'class': 'cbi-value-description' }, [
			E('p', {}, _('FakeDNS uses synthetic IP addresses for this rule’s domains. Enable the main FakeDNS switch and select a node as the rule destination.')),
			E('p', {}, _('Preproxy connects to this rule’s destination node through the node selected here. If the destination node already has its own proxy chain, that chain is preserved.'))
		]);

		o = s.taboption('shunt', form.ListValue, 'default_node', _('Default'),
			_('Where everything no rule claims goes.'));
		whereTo(o, false);
		o.default = '_proxy';

		o = s.taboption('shunt', form.Flag, 'default_fakedns', _('Default') + ' FakeDNS',
			_('Everything the tunnel carries gets made-up addresses — the DNS tab’s FakeDNS. Like that one, it takes effect only with lookups sent straight into the tunnel.'));
		o.depends('shunt_fakedns', '1');
		o.default = '0';

		o = s.taboption('shunt', form.ListValue, 'default_preproxy', _('Default Preproxy'),
			_('When the Default row goes to a node, it is reached through this node first.'));
		o.value('', _('Close (Not use)'));
		nodeChoices(o);

		/* ----------------------------------------------------------- DNS */
		o = s.taboption('dns', form.ListValue, 'dns_mode', _('Name lookups'),
			_('Keeps local device and DHCP names working. Internet lookups use the tunnel DNS without inheriting the router’s upstream servers. DHCP name changes may take up to five seconds to appear. “Straight into the tunnel” omits local names.'));
		o.value('dnsmasq', _('Through dnsmasq (recommended)'));
		o.value('direct', _('Straight into the tunnel'));
		o.value('off', _('Leave alone'));
		o.default = 'dnsmasq';

		o = s.taboption('dns', form.ListValue, 'direct_dns_protocol', _('Direct DNS Protocol'),
			_('Direct DNS answers for everything that goes straight out, and for the names of the nodes themselves — which can never be looked up through the tunnel they are the way into. Auto uses the router’s own upstream, then the ISP’s.'));
		o.value('', _('Auto'));
		o.value('udp', 'UDP');
		o.value('tcp', 'TCP');

		o = s.taboption('dns', form.Value, 'direct_dns', _('Direct DNS'));
		o.datatype = 'or(ipaddr,ipaddrport(1))';
		for (i = 0; i < IR_RESOLVERS.length; i++)
			o.value(IR_RESOLVERS[i][0], IR_RESOLVERS[i][0] + ' (' + IR_RESOLVERS[i][1] + ')');
		savedDns(o, 'direct_dns_custom', IR_RESOLVERS.map(function(r) { return r[0]; }));
		o.depends('direct_dns_protocol', 'udp');
		o.depends('direct_dns_protocol', 'tcp');

		o = s.taboption('dns', form.ListValue, 'direct_dns_query_strategy', _('Direct Query Strategy'));
		o.value('UseIP');
		o.value('UseIPv4');
		o.value('UseIPv6');
		o.default = 'UseIP';

		o = s.taboption('dns', form.ListValue, 'remote_dns_protocol', _('Remote DNS Protocol'),
			_('TCP is the default because a great many free nodes carry no UDP at all, and a lookup sent as UDP through one of them is simply lost.'));
		o.value('tcp', 'TCP');
		o.value('doh', 'DoH');
		o.value('tls', 'DoT');
		o.value('quic', 'DoQ (sing-box)');
		o.value('http3', 'DoH3 (sing-box)');
		o.value('udp', 'UDP');
		o.default = 'tcp';

		o = s.taboption('dns', form.Value, 'remote_dns', _('Remote DNS'));
		o.datatype = 'or(ipaddr,ipaddrport(1))';
		o.default = '8.8.8.8';
		o.value('1.1.1.1', '1.1.1.1 (CloudFlare)');
		o.value('1.1.1.2', '1.1.1.2 (CloudFlare-Security)');
		o.value('8.8.4.4', '8.8.4.4 (Google)');
		o.value('8.8.8.8', '8.8.8.8 (Google)');
		o.value('9.9.9.9', '9.9.9.9 (Quad9-Recommended)');
		o.value('149.112.112.112', '149.112.112.112 (Quad9-Recommended)');
		o.value('208.67.220.220', '208.67.220.220 (OpenDNS)');
		o.value('208.67.222.222', '208.67.222.222 (OpenDNS)');
		savedDns(o, 'remote_dns_custom', [ '1.1.1.1', '1.1.1.2', '8.8.4.4', '8.8.8.8', '9.9.9.9', '149.112.112.112', '208.67.220.220', '208.67.222.222' ]);
		o.depends('remote_dns_protocol', 'tcp');
		o.depends('remote_dns_protocol', 'udp');

		o = s.taboption('dns', form.Value, 'remote_dns_doh', _('Remote DNS DoH'),
			_('Use an HTTPS URL. A hostname requires one literal bootstrap IP after a comma; no direct DNS lookup is performed.'));
		o.default = 'https://8.8.8.8/dns-query';
		o.value('https://1.1.1.1/dns-query', 'CloudFlare');
		o.value('https://1.1.1.2/dns-query', 'CloudFlare-Security');
		o.value('https://8.8.4.4/dns-query', 'Google 8844');
		o.value('https://8.8.8.8/dns-query', 'Google 8888');
		o.value('https://9.9.9.9/dns-query', 'Quad9-Recommended 9.9.9.9');
		o.value('https://149.112.112.112/dns-query', 'Quad9-Recommended 149.112.112.112');
		o.value('https://208.67.222.222/dns-query', 'OpenDNS');
		o.value('https://dns.adguard.com/dns-query,94.140.14.14', 'AdGuard');
		o.value('https://doh.libredns.gr/dns-query,116.202.176.26', 'LibreDNS');
		savedDns(o, 'remote_dns_doh_custom', []);
		o.depends('remote_dns_protocol', 'doh');
		o.depends('remote_dns_protocol', 'http3');
		o.validate = function(section_id, value) {
			if (!value) return _('A DoH endpoint is required.');
			var parts = value.split(','), url;
			try { url = new URL(parts[0]); } catch (e) { return _('Invalid HTTPS endpoint.'); }
			if (url.protocol !== 'https:' || url.username || url.password || url.hash || /\s/.test(value) || parts.length > 2)
				return _('Invalid HTTPS endpoint.');
			var host = url.hostname.replace(/^\[|\]$/g, '');
			var isIP = function(v) { return !!(validation.parseIPv4(v) || validation.parseIPv6(v)); };
			if (parts.length === 2 && !isIP(parts[1])) return _('Enter one literal bootstrap IP.');
			if (!isIP(host) && !isIP(parts[1] || '')) return _('A hostname requires a bootstrap IP after a comma.');
			return true;
		};

		o = s.taboption('dns', form.Value, 'remote_dns_tls', _('DoT server IP'));
		o.datatype = 'ipaddr(1)';
		o.default = '1.1.1.1';
		o.rmempty = false;
		o.depends('remote_dns_protocol', 'tls');
		o.depends('remote_dns_protocol', 'quic');
		o = s.taboption('dns', form.Value, 'remote_dns_tls_port', _('DoT server port'));
		o.datatype = 'port';
		o.default = '853';
		o.rmempty = false;
		o.depends('remote_dns_protocol', 'tls');
		o.depends('remote_dns_protocol', 'quic');
		o = s.taboption('dns', form.Value, 'remote_dns_tls_server_name', _('DoT certificate name'),
			_('The certificate must match this name. TLS verification is always enabled; the selected DNS outbound is respected.'));
		o.datatype = 'hostname';
		o.default = 'cloudflare-dns.com';
		o.rmempty = false;
		o.depends('remote_dns_protocol', 'tls');
		o.depends('remote_dns_protocol', 'quic');

		o = s.taboption('dns', form.ListValue, 'encrypted_dns_policy', _('Client encrypted DNS policy'),
			_('Known services tunnels port 853 and known DoH destinations. Strict mode also tunnels TCP/UDP 5353 and additional protected DNS ports, while the Iran traffic split still controls ordinary websites. LAN and local mDNS remain available. With the Kill switch enabled, DNS protection stays active when the tunnel stops. Unknown DoH destinations and unlisted custom ports are not guaranteed.'));
		o.value('proxy', _('Tunnel known services'));
		o.value('strict', _('Strict DNS protection (preserve Iran split)'));
		o.value('rules', _('Follow traffic rules'));
		o.default = 'proxy';
		o = s.taboption('dns', form.DynamicList, 'dns_guard_ports', _('Additional protected DNS ports'),
			_('Strict mode always protects 853 and 5353. Add other DNS ports here. Port 443 follows website routing and cannot be added. Other services on these ports will also use the tunnel.'));
		o.datatype = 'port';
		o.depends('encrypted_dns_policy', 'strict');
		o.validate = function(section_id, value) {
			return (Array.isArray(value) ? value : [value]).some(function(p) { return Number(p) === 443; })
				? _('Port 443 follows website routing and cannot be a protected DNS port.') : true;
		};


		o = s.taboption('dns', form.Value, 'remote_dns_client_ip', _('Remote DNS EDNS Client Subnet'),
			_('Tells the DNS server where the client is, so that a CDN can answer with an edge near it. It cannot be a private address, and the server has to support EDNS Client Subnet (RFC 7871).'));
		o.datatype = 'ipaddr';

		o = s.taboption('dns', form.ListValue, 'remote_dns_detour', _('Remote DNS Outbound'));
		o.value('remote', _('Remote'));
		o.value('direct', _('Direct'));
		o.default = 'remote';

		o = s.taboption('dns', form.Flag, 'remote_fakedns', 'FakeDNS',
			_('Answers with a made-up address and lets the tunnel find the real one at the far end, which saves a lookup on every new site. Only takes effect with “Straight into the tunnel” above: with dnsmasq in front, the router’s own lookups would be made up too, and nothing the router fetches for itself would work.'));
		o.default = '0';
		o.rmempty = false;

		o = s.taboption('dns', form.ListValue, 'remote_dns_query_strategy', _('Remote Query Strategy'));
		o.value('UseIP');
		o.value('UseIPv4');
		o.value('UseIPv6');
		o.default = 'UseIPv4';

		o = s.taboption('dns', form.Value, 'node_dns', _('Node address DNS'),
			_('The resolver every node’s server name is looked up with, straight out - an IP address, since nothing can be looked up before the tunnel is up. Empty uses Direct DNS. Such as 1.1.1.1, tcp://8.8.8.8 or https://8.8.8.8/dns-query.'));
		o.placeholder = i18n.get() === 'fa' ? '\u2067' + _('Direct DNS') + '\u2069' : _('Direct DNS');
		o.validate = function(section_id, value) {
			if (!value || /^((udp|tcp):\/\/)?(\d{1,3}(\.\d{1,3}){3}|\[[0-9A-Fa-f:]+\])(:\d+)?$/.test(value) ||
			    /^https:\/\/(\d{1,3}(\.\d{1,3}){3}|\[[0-9A-Fa-f:]+\])(:\d+)?(\/\S*)?$/.test(value)) return true;
			return _('An IP address, such as 1.1.1.1, tcp://8.8.8.8 or https://8.8.8.8/dns-query.');
		};

		o = s.taboption('dns', form.TextValue, 'dns_hosts', _('Domain Override'),
			_('One per line: a name, a space, and the address it should resolve to.'));
		o.rows = 5;
		o.wrap = 'off';
		o.placeholder = 'example.com 1.2.3.4';

		o = s.taboption('dns', form.Flag, 'dns_hijack', _('DNS Redirect'),
			_('Some devices ignore the router and ask 8.8.8.8 or 1.1.1.1 themselves. Those questions leave without the tunnel, so the answer is whatever the censor wants it to be, and the device then connects to it — looking perfectly healthy while doing so. This drags such queries back to the router. Leave it on unless a device on your network genuinely has to reach a DNS server of its own.'));
		o.default = '1';
		o.rmempty = false;

		/* ----------------------------------------------------------- log */
		o = s.taboption('log', form.Flag, 'log_node', _('Enable Node Log'),
			_('What the core itself says, shown on the Runtime Logs page beside this program’s own log.'));
		o.default = '1';
		o.rmempty = false;

		o = s.taboption('log', form.ListValue, 'loglevel', _('Log Level'));
		o.value('debug');
		o.value('info');
		o.value('warning');
		o.value('error');
		o.default = 'warning';
		o.depends('log_node', '1');

		/* ------------------------------------------------------ maintain */
		o = s.taboption('maintain', form.DummyValue, '_backup', _('Backup and Restore'));
		o.render = function() {
			var down = pui.btn(_('Backup'), 'primary mk-small', function(ev) {
				var b = ev.currentTarget;
				return callAction('backup_create', '').then(function(r) {
					if (r && r.error) return pui.note(b, _(r.error), 'error');
					backupDownload();
				}).catch(function(e) { pui.note(b, String(e && e.message || e), 'error'); });
			}, 'download');
			/* Not returned to the button: the file chooser can be closed
			   without a word, and the button would turn for ever. */
			var up = pui.btn(_('Restore'), 'soft-blue mk-small', function(ev) {
				var b = ev.currentTarget;
				backupRestore().then(function(r) {
					if (!r) return;
					if (r.error) return pui.note(b, _(r.error), 'error');
					pui.note(b, _('Restored. The program is restarting with these settings; the page reloads in a moment.'), 'ok');
					window.setTimeout(function() { location.reload(); }, 5000);
				}).catch(function(e) { pui.note(b, String(e && e.message || e), 'error'); });
			}, 'refresh');
			return E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('Backup and Restore')),
				E('div', { 'class': 'cbi-value-field' }, [
					E('div', { 'style': 'display:flex;gap:10px;flex-wrap:wrap;align-items:center' }, [ down, up ]),
					E('div', { 'class': 'cbi-value-description' },
						_('Backup or Restore Client and Server Configurations.') + ' ' +
						_('The file holds every config, subscription, rule and setting, the shunt rules, the WARP and Aether accounts and the routing data. The cores and the traffic history are not in it.')),
					E('div', { 'class': 'cbi-value-description', 'style': 'color:#dc2626;font-weight:600' },
						_('Note: Restoring configurations across different versions may cause compatibility issues.'))
				])
			]);
		};

		o = s.taboption('log', form.DummyValue, '_traffic');
		o.render = function() {
			return E('div', { 'style': 'margin-top:16px' }, st.bottom);
		};

		return m.render().then(function(mapEl) {
			pui.sortable(mapEl, 'zirgozar');
			/* Fill choices in place; never redraw a form the user may have edited. */
			window.setTimeout(function() {
				callSubNodes().then(function(result) {
					if (!mapEl.isConnected) return;
					subNodes = result.nodes || [];
					seenName = {};
					subNodes.forEach(function(n) { var k = n.sub + '|' + n.label; seenName[k] = (seenName[k] || 0) + 1; });
					subscriptionOptions.forEach(function(binding) {
						var opt = binding.opt;
						subChoices(opt, binding.keep, true);
						uci.sections('zirgozar').forEach(function(section) {
							var widget = opt.getUIElement(section['.name']);
							if (widget) fillNodeChoices(widget, opt.keylist, opt.vallist);
						});
					});
				}).catch(function() {});
			}, 0);
			return mapEl;
		});
	}
});
