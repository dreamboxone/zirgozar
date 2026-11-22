/* SPDX-License-Identifier: Apache-2.0 */
/* Copyright (C) 2026 Tuhin Garai <tuhin@nightcode.org> */

'use strict';
'require zirgozar.clients as clientUI';
'require rpc';
'require dom';

var _ = clientUI.tr;

var callGetBandwidth = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getBandwidth',
	expect: { bandwidth: [] }
});

var callGetClients = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getClients',
	expect: { clients: [] }
});

var callGetSpeedLimits = rpc.declare({
	object: 'luci.zirgozar_clients',
	method: 'getSpeedLimits',
	expect: { limits: [] }
});

function formatBytes(bytes) {
	if (!bytes || bytes === 0) return '0 B';
	var units = ['B', 'KB', 'MB', 'GB', 'TB'];
	var i = Math.floor(Math.log(bytes) / Math.log(1024));
	return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function ipToLong(ip) {
	if (!ip) return 999999999999;
	var p = ip.split('.');
	if (p.length === 4) {
		return (+p[0] * 16777216) + (+p[1] * 65536) + (+p[2] * 256) + (+p[3]);
	}
	return 999999999999;
}

function buildBandwidthEntries(bandwidth, clients, speedLimits) {
	var bwMap = {};
	bandwidth.forEach(function(b) {
		if (b.ip) bwMap[b.ip] = b;
	});

	var limitMap = {};
	(speedLimits || []).forEach(function(l) {
		if (l.mac) limitMap[l.mac.replace(/:/g, '').toUpperCase()] = l;
	});

	var entries = [];
	clients.forEach(function(c) {
		if (!c.ip || c.ip === '127.0.0.1' || c.connected === false) return;

		var bw4 = bwMap[c.ip] || {}, bw6 = bwMap[c.ip6] || {};
		var bw = { tx: (bw4.tx || 0) + (bw6.tx || 0), rx: (bw4.rx || 0) + (bw6.rx || 0) };
		var macClean = (c.mac || '').replace(/:/g, '').toUpperCase();
		var lim = limitMap[macClean] || { download_val: '0', download_unit: 'Mbps', upload_val: '0', upload_unit: 'Mbps' };

		entries.push({
			displayName: c.hostname || c.ip,
			ip: c.ip,
			mac: c.mac || '—',
			tx: bw.tx || 0,
			rx: bw.rx || 0,
			bytes: bw.bytes || ((bw.tx || 0) + (bw.rx || 0)),
			dlVal: lim.download_val || lim.download_mbps || '0',
			dlUnit: lim.download_unit || 'Mbps',
			ulVal: lim.upload_val || lim.upload_mbps || '0',
			ulUnit: lim.upload_unit || 'Mbps'
		});
	});

	entries.sort(function(a, b) {
		var numA = ipToLong(a.ip);
		var numB = ipToLong(b.ip);
		if (numA !== numB) {
			return numA - numB;
		}
		return a.ip.localeCompare(b.ip);
	});

	return entries;
}

function formatSpeedLimitCell(dlVal, dlUnit, ulVal, ulUnit) {
	var numDl = parseFloat(dlVal);
	var numUl = parseFloat(ulVal);

	var hasDl = !isNaN(numDl) && numDl > 0;
	var hasUl = !isNaN(numUl) && numUl > 0;

	if (hasDl || hasUl) {
		var dlStr = hasDl ? (numDl + ' ' + (dlUnit || 'Mbps')) : '∞';
		var ulStr = hasUl ? (numUl + ' ' + (ulUnit || 'Mbps')) : '∞';
		return E('span', { 'style': 'color:#e67e22;font-weight:bold;font-size:0.9em;' },
			_('↓ %s · ↑ %s').format(dlStr, ulStr));
	}
	return E('span', { 'style': 'opacity:0.6;' }, _('Unlimited'));
}

return clientUI.view('bandwidth', {
	load: function() {
		return Promise.all([
			callGetBandwidth().catch(function() { return []; }),
			callGetClients().catch(function() { return []; }),
			callGetSpeedLimits().catch(function() { return []; })
		]);
	},

	render: function(data) {
		var bandwidth = data[0] || [];
		var clients = data[1] || [];
		var speedLimits = data[2] || [];

		var entries = buildBandwidthEntries(bandwidth, clients, speedLimits);
		var tableBody = E('tbody', { 'id': 'cm-bw-tbody' });

		if (entries.length === 0) {
			tableBody.appendChild(
				E('tr', { 'class': 'tr placeholder' },
					E('td', { 'class': 'td', 'colspan': '7',
						'style': 'text-align:center;padding:24px;' },
						_('No active connected clients available.')))
			);
		} else {
			entries.forEach(function(e) {
				tableBody.appendChild(E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, E('bdi', {}, e.displayName)),
					E('td', { 'class': 'td' }, e.ip),
					E('td', { 'class': 'td' },
						E('code', { 'style': 'font-size:0.85em' }, e.mac)),
					E('td', { 'class': 'td', 'dir': 'ltr' }, formatBytes(e.tx)),
					E('td', { 'class': 'td', 'dir': 'ltr' }, formatBytes(e.rx)),
					E('td', { 'class': 'td', 'dir': 'ltr', 'style': 'font-weight:bold' },
						formatBytes(e.bytes)),
					E('td', { 'class': 'td' }, formatSpeedLimitCell(e.dlVal, e.dlUnit, e.ulVal, e.ulUnit))
				]));
			});
		}

		var updateData = function() {
			return Promise.all([
				callGetBandwidth().catch(function() { return []; }),
				callGetClients().catch(function() { return []; }),
				callGetSpeedLimits().catch(function() { return []; })
			]).then(function(newData) {
				var tbody = document.getElementById('cm-bw-tbody');
				if (!tbody) return;

				var newBw = newData[0] || [];
				var newClients = newData[1] || [];
				var newSpeedLimits = newData[2] || [];
				var newEntries = buildBandwidthEntries(newBw, newClients, newSpeedLimits);

				var newBody = E('tbody', { 'id': 'cm-bw-tbody' });
				if (newEntries.length === 0) {
					newBody.appendChild(
						E('tr', { 'class': 'tr placeholder' },
							E('td', { 'class': 'td', 'colspan': '7',
								'style': 'text-align:center;padding:24px;' },
								_('No active connected clients available.')))
					);
				} else {
					newEntries.forEach(function(e) {
						newBody.appendChild(E('tr', { 'class': 'tr' }, [
							E('td', { 'class': 'td' }, E('bdi', {}, e.displayName)),
							E('td', { 'class': 'td' }, e.ip),
							E('td', { 'class': 'td' },
								E('code', { 'style': 'font-size:0.85em' }, e.mac)),
							E('td', { 'class': 'td', 'dir': 'ltr' }, formatBytes(e.tx)),
							E('td', { 'class': 'td', 'dir': 'ltr' }, formatBytes(e.rx)),
							E('td', { 'class': 'td', 'dir': 'ltr', 'style': 'font-weight:bold' },
								formatBytes(e.bytes)),
							E('td', { 'class': 'td' }, formatSpeedLimitCell(e.dlVal, e.dlUnit, e.ulVal, e.ulUnit))
						]));
					});
				}

				dom.content(tbody, Array.prototype.slice.call(newBody.children));
			}).catch(function() {
				// Silently handle error
			});
		};

		var refreshBtn = E('button', {
			'class': 'cbi-button cbi-button-action',
			'click': function() { updateData(); }
		}, _('↻ Refresh'));

		var currentTimer = null;

		function startIntervalTimer(ms) {
			if (currentTimer) {
				window.clearInterval(currentTimer);
				currentTimer = null;
			}
			currentTimer = window.setInterval(function() {
				if (!document.getElementById('cm-bw-tbody')) {
					if (currentTimer) window.clearInterval(currentTimer);
					return;
				}
				updateData();
			}, ms);
		}

		var intervalSelect = E('select', {
			'class': 'cbi-input-select cm-dropdown',
			'id': 'cm-bw-interval',
			'change': function(ev) {
				var val = parseInt(ev.target.value, 10);
				startIntervalTimer(val);
			}
		}, [
			E('option', { 'value': '1000' }, _('1 sec')),
			E('option', { 'value': '5000', 'selected': 'selected' }, _('5 sec')),
			E('option', { 'value': '10000' }, _('10 sec'))
		]);

		startIntervalTimer(5000);

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Bandwidth Monitor')),
			E('div', { 'class': 'cbi-map-descr' },
				_('Current per-device bandwidth usage for active connected clients.')),
			E('div', { 'class': 'zgz-client-toolbar' }, [
				refreshBtn,
				E('label', { 'for': 'cm-bw-interval' }, _('Refresh Interval')),
				intervalSelect
			]),

			clientUI.scrollTable(E('table', { 'class': 'table zgz-client-bandwidth-table' }, [
				E('thead', {}, E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, _('Device')),
					E('th', { 'class': 'th' }, _('IP Address')),
					E('th', { 'class': 'th' }, _('MAC')),
					E('th', { 'class': 'th' }, _('Upload')),
					E('th', { 'class': 'th' }, _('Download')),
					E('th', { 'class': 'th' }, _('Total')),
					E('th', { 'class': 'th' }, _('Speed Limit'))
				])),
				tableBody
			]), _('Bandwidth Monitor'))
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
