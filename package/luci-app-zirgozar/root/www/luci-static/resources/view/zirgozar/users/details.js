/* SPDX-License-Identifier: Apache-2.0 */
/* Copyright (C) 2026 Tuhin Garai <tuhin@nightcode.org> */

'use strict';
'require zirgozar.clients as clientUI';
'require zirgozar.ui as frame';
'require rpc';
'require ui';

var _ = clientUI.tr;

var callGetClientDetail = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getClientDetail',
	params: ['mac'],
	expect: { '': {} }
});

var callSetFirewallRule = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'setFirewallRule',
	params: ['mac', 'action']
});

var callGetFirewallRules = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getFirewallRules',
	expect: { rules: [] }
});

var callGetStatus = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getStatus',
	expect: { '': {} }
});

var callGetSpeedLimits = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getSpeedLimits',
	expect: { limits: [] }
});

var callSetSpeedLimit = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'setSpeedLimit',
	params: ['mac', 'ip', 'download_val', 'download_unit', 'upload_val', 'upload_unit']
});

var callDeleteSpeedLimit = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'deleteSpeedLimit',
	params: ['mac']
});

function getMac() {
	var macPattern = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;

	var path = L.env.requestpath || [];
	var idx = path.indexOf('details');
	if (idx > -1 && path.length > idx + 1) {
		var pMac = decodeURIComponent(path.slice(idx + 1).join(':'));
		var m1 = pMac.match(macPattern);
		if (m1) return m1[0].toUpperCase();
	}

	if (window.location.search) {
		var params = new URLSearchParams(window.location.search);
		var qMac = params.get('mac');
		if (qMac) {
			var m2 = decodeURIComponent(qMac).match(macPattern);
			if (m2) return m2[0].toUpperCase();
		}
	}

	if (window.location.hash) {
		var hash = decodeURIComponent(window.location.hash).replace(/^#/, '');
		var m3 = hash.match(macPattern);
		if (m3) return m3[0].toUpperCase();
	}

	if (window.location.pathname) {
		var m4 = decodeURIComponent(window.location.pathname).match(macPattern);
		if (m4) return m4[0].toUpperCase();
	}

	return '';
}

function formatRadioFreq(freq, ifName) {
	if (!freq) {
		var lower = (ifName || '').toLowerCase();
		if (lower.indexOf('phy0') > -1 || lower.indexOf('wlan0') > -1 || lower.indexOf('ra0') > -1)
			return '2.4 GHz';
		if (lower.indexOf('phy1') > -1 || lower.indexOf('wlan1') > -1 || lower.indexOf('ra1') > -1)
			return '5 GHz';
		if (lower.indexOf('phy2') > -1 || lower.indexOf('wlan2') > -1)
			return '6 GHz';
		return '';
	}
	var num = parseFloat(freq);
	if (!isNaN(num) && num > 100) {
		return (num / 1000).toFixed(3) + ' GHz';
	}
	return freq;
}

function formatIfaceName(ifName, isWireless, ssid, freq) {
	if (!ifName) return '—';
	if (!isWireless) return ifName;

	var radioFreq = formatRadioFreq(freq, ifName);

	if (ssid && radioFreq) {
		return ifName + '(' + ssid + '(' + radioFreq + '))';
	} else if (ssid) {
		return ifName + '(' + ssid + ')';
	} else if (radioFreq) {
		return ifName + '(' + radioFreq + ')';
	}

	return ifName;
}

function formatLimitString(val, unit) {
	var num = parseFloat(val);
	if (!isNaN(num) && num > 0) {
		return num + ' ' + (unit || 'Mbps');
	}
	return 'Unlimited';
}

return clientUI.view('details', {
	load: function() {
		var mac = getMac();
		if (!mac) return Promise.resolve([{}, [], {}, []]);
		return Promise.all([
			callGetClientDetail(mac),
			callGetFirewallRules(),
			callGetStatus().catch(function() { return { low_resource: false }; }),
			callGetSpeedLimits().catch(function() { return []; })
		]);
	},

	render: function(data) {
		var mac = getMac();
		if (!mac) {
			return E('div', { 'class': 'cbi-map' }, [
				E('h2', {}, _('Device Details')),
				E('p', {}, _('No device selected.')),
				E('a', { 'href': clientUI.url('dashboard') },
					_('← Back to Client List'))
			]);
		}

		var client = data[0] || {};
		var fwRules = data[1] || [];
		var sysStatus = data[2] || {};
		var speedLimits = data[3] || [];

		var cleanMac = mac.replace(/:/g, '').toUpperCase();

		var currentLimit = speedLimits.find(function(l) {
			return l.mac && l.mac.replace(/:/g, '').toUpperCase() === cleanMac;
		}) || { download_val: '0', download_unit: 'Mbps', upload_val: '0', upload_unit: 'Mbps' };

		var isBlocked = fwRules.some(function(r) {
			return r.src_mac && r.src_mac.replace(/:/g, '').toUpperCase() === cleanMac &&
				r.target === 'REJECT';
		});

		var pageTitle = client.hostname ? (client.hostname + ' (' + mac + ')') : mac;

		var blockBtn = E('button', {
			'class': isBlocked ? 'cbi-button cbi-button-apply' : 'cbi-button cbi-button-negative',
			'click': function() {
				var action = isBlocked ? 'unblock' : 'block';
				ui.showModal(_('Confirm'), [
					E('p', {},
						isBlocked
							? _('Allow this device to access the internet?')
							: _('Block this device from accessing the internet?')),
					E('div', { 'class': 'right' }, [
						E('button', {
							'class': 'cbi-button',
							'click': ui.hideModal
						}, _('Cancel')),
						' ',
						E('button', {
							'class': 'cbi-button cbi-button-negative',
							'click': function() {
								ui.hideModal();
								callSetFirewallRule(mac, action).then(clientUI.checkResult).then(function() {
									window.location.reload();
								}).catch(clientUI.showError);
							}
						}, isBlocked ? _('Unblock') : _('Block'))
					])
				]);
			}
		}, isBlocked ? _('🔓 Unblock Internet') : [frame.icon('close'), _('Block')]);

		var dlInput = E('input', {
			'type': 'number',
			'class': 'cbi-input-text',
			'id': 'cm-download-limit',
			'placeholder': _('Unlimited'),
			'min': '0',
			'step': 'any',
			'value': (parseFloat(currentLimit.download_val) > 0) ? currentLimit.download_val : ''
		});

		var dlUnitSelect = E('select', { 'class': 'cbi-input-select cm-dropdown', 'aria-label': _('Speed Unit') }, [
			E('option', { 'value': 'Mbps', 'selected': (currentLimit.download_unit === 'Mbps' || !currentLimit.download_unit) ? true : null }, 'Mbps'),
			E('option', { 'value': 'MBps', 'selected': currentLimit.download_unit === 'MBps' ? true : null }, 'MBps'),
			E('option', { 'value': 'Kbps', 'selected': currentLimit.download_unit === 'Kbps' ? true : null }, 'Kbps'),
			E('option', { 'value': 'KBps', 'selected': currentLimit.download_unit === 'KBps' ? true : null }, 'KBps')
		]);

		var ulInput = E('input', {
			'type': 'number',
			'class': 'cbi-input-text',
			'id': 'cm-upload-limit',
			'placeholder': _('Unlimited'),
			'min': '0',
			'step': 'any',
			'value': (parseFloat(currentLimit.upload_val) > 0) ? currentLimit.upload_val : ''
		});

		var ulUnitSelect = E('select', { 'class': 'cbi-input-select cm-dropdown', 'aria-label': _('Speed Unit') }, [
			E('option', { 'value': 'Mbps', 'selected': (currentLimit.upload_unit === 'Mbps' || !currentLimit.upload_unit) ? true : null }, 'Mbps'),
			E('option', { 'value': 'MBps', 'selected': currentLimit.upload_unit === 'MBps' ? true : null }, 'MBps'),
			E('option', { 'value': 'Kbps', 'selected': currentLimit.upload_unit === 'Kbps' ? true : null }, 'Kbps'),
			E('option', { 'value': 'KBps', 'selected': currentLimit.upload_unit === 'KBps' ? true : null }, 'KBps')
		]);

		var applySpeedLimitAction = function(dlVal, dlUnit, ulVal, ulUnit) {
			callSetSpeedLimit(mac, client.ip || '', dlVal, dlUnit, ulVal, ulUnit).then(clientUI.checkResult).then(function() {
				ui.addNotification(null, E('p', {}, _('Bandwidth limit saved for %s.').format(mac)), 'info');
				window.location.reload();
			}).catch(clientUI.showError);
		};

		var onSaveSpeedLimit = function() {
			var dlVal = dlInput.value.trim();
			var dlUnit = dlUnitSelect.value;
			var ulVal = ulInput.value.trim();
			var ulUnit = ulUnitSelect.value;

			if (sysStatus.low_resource || (sysStatus.mem_total_mb > 0 && sysStatus.mem_total_mb < 128)) {
				ui.showModal(_('Hardware Performance Warning'), [
					E('div', { 'style': 'color:#e67e22;font-weight:bold;font-size:1.1em;margin-bottom:8px;' },
						_('⚠️ Memory / CPU Performance Warning')),
					E('p', {},
						_('Your router has limited hardware memory capacity (%s MB RAM detected). Enabling per-client bandwidth limits forces packet inspection that bypasses hardware flow offloading, which may increase CPU load during peak network usage.').format(sysStatus.mem_total_mb || '<128')),
					E('p', {},
						_('Are you sure you want to customize this client\'s bandwidth limit?')),
					E('div', { 'class': 'right', 'style': 'margin-top:16px;' }, [
						E('button', {
							'class': 'cbi-button',
							'click': ui.hideModal
						}, _('Cancel')),
						' ',
						E('button', {
							'class': 'cbi-button cbi-button-action',
							'click': function() {
								ui.hideModal();
								applySpeedLimitAction(dlVal, dlUnit, ulVal, ulUnit);
							}
						}, _('Proceed Anyway (Bypass Warning)'))
					])
				]);
			} else {
				applySpeedLimitAction(dlVal, dlUnit, ulVal, ulUnit);
			}
		};

		var removeSpeedLimit = function() {
			callDeleteSpeedLimit(mac).then(clientUI.checkResult).then(function() {
				ui.addNotification(null, E('p', {}, _('Speed limit removed.')), 'info');
				window.location.reload();
			}).catch(clientUI.showError);
		};

		var applyLimitBtn = E('button', {
			'class': 'cbi-button cbi-button-save',
			'click': onSaveSpeedLimit
		}, _('Save'));

		var removeLimitBtn = E('button', {
			'class': 'cbi-button cbi-button-remove',
			'click': removeSpeedLimit
		}, _('Remove Limit'));

		var formattedIface = formatIfaceName(client.interface, client.wireless, client.ssid, client.freq);

		var hasLimit = (parseFloat(currentLimit.download_val) > 0) || (parseFloat(currentLimit.upload_val) > 0);

		var infoTable = E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'width:160px;font-weight:bold' },
					_('MAC Address')),
				E('td', { 'class': 'td' }, E('code', {}, mac))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('IPv4 Address')),
				E('td', { 'class': 'td' }, client.ip || '—')
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('IPv6 Address')),
				E('td', { 'class': 'td' }, client.ip6 ? E('code', { 'style': 'font-size:0.85em;' }, client.ip6) : '—')
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Hostname')),
				E('td', { 'class': 'td' }, client.hostname || '—')
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Connection Interface')),
				E('td', { 'class': 'td' }, formattedIface)
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Signal Strength')),
				E('td', { 'class': 'td' },
					client.wireless ? (client.signal ? E('bdi', { 'dir': 'ltr' }, client.signal + ' dBm') : '—') : _('Wired Connection'))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Internet Access')),
				E('td', { 'class': 'td' },
					isBlocked
						? E('span', { 'style': 'color:#e74c3c' }, _('⛔ Blocked'))
						: E('span', { 'style': 'color:#27ae60' }, _('✓ Allowed')))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'style': 'font-weight:bold' },
					_('Configured Speed Limit')),
				E('td', { 'class': 'td' },
					hasLimit
						? (_('↓ %s · ↑ %s').format(formatLimitString(currentLimit.download_val, currentLimit.download_unit),
						   formatLimitString(currentLimit.upload_val, currentLimit.upload_unit)))
						: _('Unlimited'))
			])
		]);

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, E('bdi', {}, pageTitle)),
			E('a', {
				'href': clientUI.url('dashboard'),
				'style': 'display:inline-block;margin-bottom:16px;'
			}, _('← Back to Client List')),

			E('section', { 'class': 'cbi-section' }, [
				E('h3', { 'class': 'zgz-client-section-title' }, _('Device Information')),
				infoTable
			]),

			E('section', { 'class': 'cbi-section' }, [
				E('h3', { 'class': 'zgz-client-section-title' }, _('Bandwidth Speed Limiter')),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'cm-download-limit' }, _('Download Limit')),
					E('div', { 'class': 'cbi-value-field zgz-client-fields zgz-client-limit' }, [dlInput, dlUnitSelect])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'cm-upload-limit' }, _('Upload Limit')),
					E('div', { 'class': 'cbi-value-field zgz-client-fields zgz-client-limit' }, [ulInput, ulUnitSelect])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('div', { 'class': 'cbi-value-field zgz-client-fields' }, [
						applyLimitBtn,
						hasLimit ? removeLimitBtn : ''
					])
				])
			]),

			E('section', { 'class': 'cbi-section' }, [
				E('h3', { 'class': 'zgz-client-section-title' }, _('Internet Access Control')),
				E('div', { 'style': 'padding:8px 0' }, blockBtn)
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
