/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * One shunt rule, on a page of its own: PassWall2's shunt_rules page, field
 * for field, opened from the Sing-Box/Xray Shunt Rule list on Rule Manage.
 * Where the rule sends what it matches is chosen beside the rule in the
 * Shunt Rule tab of Basic Settings, as in PassWall2.
 */

'use strict';
'require view';
'require form';
'require uci';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';

var _ = i18n.tr;

function hostname(v) {
	return /^[A-Za-z0-9_]([A-Za-z0-9_-]{0,62}\.)*[A-Za-z0-9_-]{1,63}\.?$/.test(v);
}

/* PassWall2 takes the tabs, no-break and full-width spaces out of a list
   before it is read; so does this. */
function cleanText(v) {
	return String(v || '').replace(/\t| |　/g, ' ').replace(/\r\n/g, '\n')
		.replace(/[ \t]*\n[ \t]*/g, '\n').replace(/^\s+/, '');
}

function eachLine(value, ok, msg) {
	var lines = cleanText(value).split('\n');
	for (var i = 0; i < lines.length; i++) {
		var l = lines[i].trim();
		if (!l || l.charAt(0) == '#') continue;
		if (!ok(l)) return l + ' ' + msg;
	}
	return true;
}

function ruleSet(l) {
	var w = l.replace(/^(rule-set|rs):/, '');
	return w != l && /^(local|remote):./.test(w);
}

function domainEntry(l) {
	if (/\s/.test(l)) return false;
	if (/^(regexp|keyword|geosite|ext):./.test(l)) return true;
	if (ruleSet(l)) return true;
	return hostname(l.replace(/^(domain|full):/, '').replace(/^\./, ''));
}

function ipEntry(l) {
	if (/^(geoip|ext):\S+$/.test(l)) return true;
	if (ruleSet(l)) return true;
	if (/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(l)) return true;
	return /^[0-9a-fA-F:]+:[0-9a-fA-F:]*(\/\d{1,3})?$/.test(l);
}

function items(list) {
	return E('ul', { 'style': 'margin:.4em 0 0 1.2em' }, list.map(function(x) {
		return E('li', {}, x);
	}));
}

return view.extend({
	load: function() {
		return uci.load('zirgozar').catch(function() { return null; });
	},

	render: function() {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));

		var sid = new URLSearchParams(window.location.search).get('sid') || '';
		var back = L.url('admin', 'services', 'zirgozar', 'traffic');
		var backBtn = E('a', { 'class': 'btn cbi-button', 'href': back }, _('Back to Rule Manage'));

		if (!sid || uci.get('zirgozar', sid, '.type') != 'shunt_rules') {
			return pui.page([ E('div', { 'class': 'mk-alert' }, [
				E('p', {}, _('This shunt rule is not there any more.')),
				backBtn
			]) ]);
		}

		/* The names and groups of the other rules: a name is a rule's own,
		   and a group typed again in other letters is the same group. */
		var remarks = {}, groups = {};
		uci.sections('zirgozar', 'shunt_rules').forEach(function(r) {
			if (r['.name'] == sid) return;
			if (r.remarks) remarks[r.remarks] = true;
			if (r.group) groups[r.group] = true;
		});

		var m = new form.Map('zirgozar');
		var s = m.section(form.NamedSection, sid, 'shunt_rules', 'Sing-Box/Xray ' + _('Shunt Rule'));
		s.anonymous = true;
		s.addremove = false;

		var o;

		o = s.option(form.Value, 'remarks', _('Remarks'));
		o.default = sid;
		o.rmempty = false;
		o.validate = function(section_id, value) {
			value = String(value || '').trim();
			if (!value) return _('Remark cannot be empty.');
			if (remarks[value]) return _('This remark already exists, please change a new remark.');
			return true;
		};

		o = s.option(form.Value, 'group', _('Shunt Rule Group'));
		o.default = '';
		o.value('', _('default'));
		Object.keys(groups).sort().forEach(function(g) { o.value(g); });
		o.write = function(section_id, value) {
			value = String(value || '').trim();
			var lower = value.toLowerCase();
			if (!lower || lower == 'default')
				return uci.unset('zirgozar', section_id, 'group');
			var known = Object.keys(groups).filter(function(g) { return g.toLowerCase() == lower; })[0];
			uci.set('zirgozar', section_id, 'group', known || value);
		};
		o.remove = function(section_id) {
			uci.unset('zirgozar', section_id, 'group');
		};

		o = s.option(form.MultiValue, 'protocol', _('Protocol'));
		o.value('http');
		o.value('tls');
		o.value('quic');
		o.value('bittorrent');
		pui.checkboxes(o);

		o = s.option(form.MultiValue, 'inbound', _('Inbound Tag'));
		o.value('tproxy', _('Transparent proxy'));
		o.value('socks', 'Socks');
		pui.checkboxes(o);

		o = s.option(form.ListValue, 'network', _('Network'));
		o.value('tcp,udp', 'TCP UDP');
		o.value('tcp', 'TCP');
		o.value('udp', 'UDP');

		o = s.option(form.DynamicList, 'source', _('Source'), items([
			_('Example:'),
			_('IP') + ': 192.168.1.100',
			_('IP CIDR') + ': 192.168.1.0/24',
			'GeoIP: geoip:private'
		]));
		o.validate = function(section_id, value) {
			if (!value || /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(value) || /^geoip:\S+$/.test(value)) return true;
			return _('Not true format, please re-enter!') + ' ' + value;
		};

		o = s.option(form.Value, 'port', _('Port'));
		o.validate = function(section_id, value) {
			if (!value || /^[0-9]+([-:][0-9]+)?(,[0-9]+([-:][0-9]+)?)*$/.test(String(value).replace(/\s/g, ''))) return true;
			return _('Not valid, please re-enter: %s').format(value);
		};

		o = s.option(form.TextValue, 'domain_list', _('Domain'), items([
			_("Plaintext: If this string matches any part of the targeting domain, this rule takes effet. Example: rule 'sina.com' matches targeting domain 'sina.com', 'sina.com.cn' and 'www.sina.com', but not 'sina.cn'."),
			_("Regular expression: Begining with 'regexp:', the rest is a regular expression. When the regexp matches targeting domain, this rule takes effect. Example: rule 'regexp:\\.goo.*\\.com$' matches 'www.google.com' and 'fonts.googleapis.com', but not 'google.com'."),
			_("Subdomain (recommended): Begining with 'domain:' and the rest is a domain. When the targeting domain is exactly the value, or is a subdomain of the value, this rule takes effect. Example: rule 'domain:v2ray.com' matches 'www.v2ray.com', 'v2ray.com', but not 'xv2ray.com'."),
			_("Full domain: Begining with 'full:' and the rest is a domain. When the targeting domain is exactly the value, the rule takes effect. Example: rule 'domain:v2ray.com' matches 'v2ray.com', but not 'www.v2ray.com'."),
			_("Pre-defined domain list: Begining with 'geosite:' and the rest is a name, such as geosite:google or geosite:cn."),
			E('span', {}, [ _("Sing-Box rule-set: Begining with 'rule-set:remote:' or 'rule-set:local:'"), items([
				_('Such as:') + "'rule-set:remote:https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-cn.srs'",
				_('Such as:') + "'rule-set:local:/usr/share/sing-box/geosite-cn.srs'"
			]) ]),
			_('Annotation: Begining with #')
		]));
		o.rows = 10;
		o.wrap = 'off';
		o.validate = function(section_id, value) {
			return eachLine(value, domainEntry, _('Not valid domain name, please re-enter!'));
		};

		o = s.option(form.TextValue, 'ip_list', 'IP', items([
			_("IP: such as '127.0.0.1'."),
			_("CIDR: such as '127.0.0.0/8'."),
			_("GeoIP: such as 'geoip:cn'. It begins with geoip: (lower case) and followed by two letter of country code."),
			E('span', {}, [ _("Sing-Box rule-set: Begining with 'rule-set:remote:' or 'rule-set:local:'"), items([
				_('Such as:') + "'rule-set:remote:https://raw.githubusercontent.com/SagerNet/sing-geoip/rule-set/geoip-cn.srs'",
				_('Such as:') + "'rule-set:local:/usr/share/sing-box/geoip-cn.srs'"
			]) ]),
			_('Annotation: Begining with #')
		]));
		o.rows = 10;
		o.wrap = 'off';
		o.validate = function(section_id, value) {
			return eachLine(value, ipEntry, _('Not valid IP format, please re-enter!'));
		};

		/* Xray has no inverted rule. Under Xray a rule with this ticked is left
		   out - and the log says so - rather than run the right way round,
		   which would send exactly the other traffic. */
		o = s.option(form.Flag, 'invert', 'invert',
			_('Invert match result.') + ' ' + _('Only support Sing-Box.') + ' ' +
			_('With Xray as the active core the rule is left out.'));

		return m.render().then(function(mapEl) {
			if (i18n.get() == 'fa') {
				var heading = mapEl.querySelector('.cbi-section-title, .cbi-section > h3, .cbi-section > legend');
				if (heading) {
					heading.setAttribute('dir', 'rtl');
					while (heading.firstChild) heading.removeChild(heading.firstChild);
					heading.appendChild(E('span', {}, _('Shunt Rule')));
					heading.appendChild(document.createTextNode(' '));
					heading.appendChild(E('span', { 'dir': 'ltr' }, 'Sing-Box/Xray'));
				}
			}
			return pui.page([
				E('div', { 'style': 'margin-bottom:12px' }, [ backBtn ]),
				E('div', { 'style': 'color:#ef4444;margin:0 0 10px' },
					_('Where this rule sends what it matches is chosen in the Shunt Rule tab of Basic Settings.')),
				mapEl
			]);
		});
	}
});
