/* SPDX-License-Identifier: Apache-2.0 */
/* Copyright (C) 2026 Tuhin Garai <tuhin@nightcode.org> */

'use strict';
'require zirgozar.clients as clientUI';
'require rpc';
'require ui';

var _ = clientUI.tr;
var filterLabels = { allow: 'Allow listed devices', deny: 'Block listed devices', disable: 'Disabled' };

var callGetClients = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getClients',
	expect: { clients: [] }
});

var callGetWifiInterfaces = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getWifiInterfaces',
	expect: { interfaces: [] }
});

var callSetMacFilter = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'setMacFilter',
	params: ['section', 'mac', 'action']
});

return clientUI.view('wifi', {
	load: function() {
		return Promise.all([
			callGetClients(),
			callGetWifiInterfaces()
		]);
	},

	render: function(data) {
		var clients = data[0] || [];
		var ifaces = data[1] || [];

		var macSelect = E('select', {
			'class': 'cbi-input-select cm-dropdown',
			'id': 'cm-wifi-mac'
		});

		macSelect.appendChild(E('option', { 'value': '' },
			_('— Select a device —')));
		clients.forEach(function(c) {
			var label = (c.name || c.hostname || _('Unknown')) +
				' (' + c.mac + ')';
			macSelect.appendChild(E('option', { 'value': c.mac }, label));
		});
		macSelect.appendChild(E('option', { 'value': 'custom' },
			_('✏️ Custom MAC Address...')));

		var customMacInput = E('input', {
			'type': 'text',
			'class': 'cbi-input-text',
			'id': 'cm-wifi-custom-mac',
			'placeholder': 'AA:BB:CC:DD:EE:FF',
			'aria-label': _('MAC Address'),
			'dir': 'ltr',
			'hidden': true,
			'maxlength': '17'
		});

		var deviceField = E('div', { 'class': 'cbi-value-field zgz-client-fields' }, [
			macSelect,
			customMacInput
		]);

		// Group interfaces by radio/device
		var byRadio = {};
		ifaces.forEach(function(iface) {
			if (iface.disabled === '1') return;
			var radio = iface.device || _('Unknown');
			if (!byRadio[radio]) byRadio[radio] = [];
			byRadio[radio].push(iface);
		});

		var ifaceContainer = E('div', { 'id': 'cm-wifi-ifaces' });

		Object.keys(byRadio).sort().forEach(function(radio) {
			var radioDiv = E('section', { 'class': 'cbi-section' }, [
				E('h3', { 'class': 'zgz-client-section-title', 'dir': 'auto' }, radio)
			]);

			byRadio[radio].forEach(function(iface) {
				var checkboxId = 'cm-wifi-interface-' + iface.section;

				var row = E('div', {
					'class': 'cbi-value',
					'data-section': iface.section,
					'data-maclist': JSON.stringify(iface.maclist || []),
					'data-mode': iface.macfilter || 'disable'
				}, [
					E('label', { 'class': 'cbi-value-title', 'for': checkboxId },
						E('bdi', {}, iface.ssid || iface.section)),
					E('div', { 'class': 'cbi-value-field zgz-client-fields' }, [
						E('input', {
							'type': 'checkbox',
							'class': 'cm-wifi-cb',
							'data-section': iface.section,
							'id': checkboxId,
							'disabled': 'disabled'
						}),
						E('span', {}, _('Filter mode: %s').format(_(filterLabels[iface.macfilter] || filterLabels.disable)))
					])
				]);
				radioDiv.appendChild(row);
			});

			ifaceContainer.appendChild(radioDiv);
		});

		function getActiveMac() {
			if (macSelect.value === 'custom') {
				return (customMacInput.value || '').trim().replace(/-/g, ':').toUpperCase();
			}
			return (macSelect.value || '').trim().toUpperCase();
		}

		function isAllowed(row, mac) {
			var maclist = JSON.parse(row.getAttribute('data-maclist')).map(function(entry) {
				return entry.replace(/-/g, ':').toUpperCase();
			});
			var mode = row.getAttribute('data-mode'), present = maclist.indexOf(mac) >= 0;
			return mode === 'allow' ? present : mode !== 'deny' || !present;
		}

		function updateCheckboxes() {
			var mac = getActiveMac();
			var isValid = /^([0-9A-FA-F]{2}[:-]){5}([0-9A-FA-F]{2})$/.test(mac);
			var cbs = ifaceContainer.querySelectorAll('.cm-wifi-cb');
			cbs.forEach(function(cb) {
				if (!isValid) {
					cb.disabled = true;
					cb.checked = false;
					return;
				}
				cb.disabled = false;
				cb.checked = isAllowed(cb.closest('[data-maclist]'), mac);
			});
		}

		// Update checkboxes when selection or custom MAC changes
		macSelect.addEventListener('change', function() {
			if (this.value === 'custom') {
				customMacInput.hidden = false;
				customMacInput.focus();
			} else {
				customMacInput.hidden = true;
			}
			updateCheckboxes();
		});

		customMacInput.addEventListener('input', updateCheckboxes);

		var applyBtn = E('button', {
			'class': 'cbi-button cbi-button-save',
			'click': function() {
				var mac = getActiveMac();
				var macRegex = /^([0-9A-FA-F]{2}[:-]){5}([0-9A-FA-F]{2})$/;
				if (!mac || !macRegex.test(mac)) {
					ui.addNotification(null,
						E('p', {}, _('Please enter or select a valid MAC address (e.g. AA:BB:CC:DD:EE:FF).')), 'warning');
					return;
				}

				var changes = [];
				var cbs = ifaceContainer.querySelectorAll('.cm-wifi-cb');
				cbs.forEach(function(cb) {
					var section = cb.getAttribute('data-section');
					var row = cb.closest('[data-maclist]');
					if (cb.checked !== isAllowed(row, mac))
						changes.push({ section: section, action: cb.checked ? 'add' : 'remove' });
				});

				if (!changes.length) {
					ui.addNotification(null,
						E('p', {}, _('No changes to apply.')), 'info');
					return;
				}

				changes.reduce(function(previous, change) {
					return previous.then(function() {
						return callSetMacFilter(change.section, mac, change.action).then(clientUI.checkResult);
					});
				}, Promise.resolve()).then(function() {
					ui.addNotification(null,
						E('p', {}, _('MAC filter updated for %s. WiFi is reloading…').format(mac)),
						'info');
					window.setTimeout(function() {
						window.location.reload();
					}, 3000);
				}).catch(clientUI.showError);
			}
		}, _('Apply Changes'));

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('WiFi Access')),
			E('div', { 'class': 'cbi-map-descr' },
				_('Manage which SSIDs a device is allowed to connect to using MAC filtering.')),

			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'cm-wifi-mac' }, _('Device')),
					deviceField
				])
			]),

			Object.keys(byRadio).length ? ifaceContainer : E('p', {}, _('No active WiFi networks.')),

			E('div', { 'class': 'cbi-page-actions' }, applyBtn)
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
