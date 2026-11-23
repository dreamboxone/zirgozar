/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
'require view';
'require baseclass';
'require uci';
'require ui';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as frame';

var sections = [
	[ 'dashboard', 'Devices' ],
	[ 'wifi', 'WiFi Access' ],
	[ 'firewall', 'Firewall Policies' ],
	[ 'bandwidth', 'Bandwidth Monitor' ]
];

function url(section) {
	var root = L.url('admin', 'services', 'zirgozar', 'users');
	return section === 'dashboard' ? root : root + '/' + section;
}

function clientView(section, handlers) {
	var load = handlers.load, render = handlers.render;
	handlers.load = function() {
		var self = this;
		return uci.load('zirgozar').then(function() {
			i18n.setLang(uci.get('zirgozar', 'config', 'lang'));
			return load.call(self);
		});
	};
	handlers.render = function(data) {
		var current = section === 'details' ? 'dashboard' : section;
		var links = sections.map(function(entry) {
			var active = entry[0] === current;
			return E('a', {
				'class': 'zgz-client-tab',
				'href': url(entry[0]),
				'aria-current': active ? 'page' : null
			}, i18n.tr(entry[1]));
		});
		return frame.page([
			E('nav', { 'class': 'zgz-client-tabs', 'aria-label': i18n.tr('User Management') }, links),
			E('div', { 'class': 'zgz-client-content' }, render.call(this, data))
		]);
	};
	return view.extend(handlers);
}

function scrollTable(table, label) {
	return E('div', {
		'class': 'zgz-client-table-scroll',
		'role': 'region',
		'aria-label': label,
		'tabindex': '0'
	}, table);
}

function checkResult(result) {
	if (!result || result.success !== true) {
		var reason = result && result.error || 'Could not apply client settings.';
		var error = new Error(i18n.tr(reason));
		error.firewallSettings = reason === 'Disable firewall flow offloading before applying client policies.';
		throw error;
	}
	return result;
}

function showError(error) {
	var content = [error.message];
	if (error.firewallSettings) {
		content.push(' ', E('a', { 'href': L.url('admin', 'network', 'firewall') }, i18n.tr('Open firewall settings')));
	}
	ui.addNotification(null, E('p', {}, content), 'danger');
}

return baseclass.extend({ url: url, view: clientView, scrollTable: scrollTable, tr: i18n.tr, checkResult: checkResult, showError: showError });
