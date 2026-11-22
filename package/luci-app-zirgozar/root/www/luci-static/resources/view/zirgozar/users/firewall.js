/* SPDX-License-Identifier: Apache-2.0 */
/* Copyright (C) 2026 Tuhin Garai <tuhin@nightcode.org> */

'use strict';
'require zirgozar.clients as clientUI';
'require rpc';

var _ = clientUI.tr;

var callGetClients = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getClients',
	expect: { clients: [] }
});

var callGetFirewallRules = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getFirewallRules',
	expect: { rules: [] }
});

var callSetFirewallRule = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'setFirewallRule',
	params: ['mac', 'action']
});

var callDeleteFirewallRule = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'deleteFirewallRule',
	params: ['mac']
});

return clientUI.view('firewall', {
	load: function() {
		return Promise.all([
			callGetClients(),
			callGetFirewallRules()
		]);
	},

	render: function(data) {
		var clients = data[0] || [];
		var rules = data[1] || [];

		var blockedMacs = {};
		rules.forEach(function(r) {
			if (r.src_mac) blockedMacs[r.src_mac.toUpperCase()] = r;
		});

		var tableBody = E('tbody', {});

		clients.forEach(function(c) {
			var blocked = !!blockedMacs[c.mac];
			var displayName = c.name || c.hostname || c.mac;

			var toggleBtn = E('button', {
				'class': blocked
					? 'cbi-button cbi-button-apply'
					: 'cbi-button cbi-button-negative',
				'data-mac': c.mac,
				'click': function() {
					var action = blocked ? 'unblock' : 'block';
					callSetFirewallRule(c.mac, action).then(clientUI.checkResult).then(function() {
						window.location.reload();
					}).catch(clientUI.showError);
				}
			}, blocked ? _('Unblock') : _('Block'));

			tableBody.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td' }, E('bdi', {}, displayName)),
				E('td', { 'class': 'td' }, c.ip || '—'),
				E('td', { 'class': 'td' },
					E('code', { 'style': 'font-size:0.85em' }, c.mac)),
				E('td', { 'class': 'td' },
					blocked
						? E('span', { 'style': 'color:#e74c3c' }, _('Blocked'))
						: E('span', { 'style': 'color:#27ae60' }, _('Allowed'))),
				E('td', { 'class': 'td' }, toggleBtn)
			]));
		});

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Firewall Policies')),
			E('div', { 'class': 'cbi-map-descr' },
				_('Block or allow internet access for individual devices.')),

			clientUI.scrollTable(E('table', { 'class': 'table zgz-client-firewall-table' }, [
				E('thead', {}, E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, _('Device')),
					E('th', { 'class': 'th' }, _('IP')),
					E('th', { 'class': 'th' }, _('MAC')),
					E('th', { 'class': 'th' }, _('Status')),
					E('th', { 'class': 'th' }, _('Action'))
				])),
				tableBody
			]), _('Firewall Policies'))
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
