/* SPDX-License-Identifier: Apache-2.0 */
/* Copyright (C) 2026 Tuhin Garai <tuhin@nightcode.org> */

'use strict';
'require zirgozar.clients as clientUI';
'require rpc';
'require dom';

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

function formatExpiry(ts) {
	if (!ts || ts === 0) return _('Static');
	var d = new Date(ts * 1000);
	if (d.getTime() < Date.now()) return _('Expired');
	var mins = Math.round((d.getTime() - Date.now()) / 60000);
	if (mins < 60) return _('%s min').format(mins);
	return _('%s hr %s min').format(Math.floor(mins / 60), mins % 60);
}

function signalIndicator(signal) {
	var value = Number(signal);
	if (!Number.isFinite(value) || value >= 0) return '—';

	var level = value > -50 ? 4 : value > -60 ? 3 : value > -70 ? 2 : 1;
	var reading = value + ' dBm';
	var bars = [1, 2, 3, 4].map(function(bar) {
		return E('span', { 'class': bar <= level ? 'is-active' : null });
	});

	return E('span', { 'class': 'zgz-client-signal', 'data-level': level, 'dir': 'ltr', 'role': 'img', 'aria-label': reading }, [
		E('span', { 'class': 'zgz-client-signal-bars', 'aria-hidden': 'true' }, bars),
		E('span', { 'aria-hidden': 'true' }, reading)
	]);
}

function deviceIcon(client) {
	var isConn = (client.connected !== false);
	var baseIcon = client.wireless ? '📶' : '🔗';

	if (!isConn) {
		return E('span', {
			'style': 'opacity:0.35;filter:grayscale(100%);display:inline-block;',
			'title': _('Disconnected / Offline')
		}, baseIcon);
	}

	return E('span', { 'title': _('Connected / Online') }, baseIcon);
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

function ipToLong(ip) {
	if (!ip) return 999999999999;
	var p = ip.split('.');
	if (p.length === 4) {
		return (+p[0] * 16777216) + (+p[1] * 65536) + (+p[2] * 256) + (+p[3]);
	}
	return 999999999999;
}

return clientUI.view('dashboard', {
	load: function() {
		return Promise.all([
			callGetClients(),
			callGetFirewallRules()
		]);
	},

	render: function(data) {
		var clients = data[0] || [];
		var rules = data[1] || [];

		// Sort clients strictly by IP in ascending order
		clients.sort(function(a, b) {
			var numA = ipToLong(a.ip);
			var numB = ipToLong(b.ip);
			if (numA !== numB) {
				return numA - numB;
			}
			var ipStrA = a.ip || a.ip6 || '';
			var ipStrB = b.ip || b.ip6 || '';
			return ipStrA.localeCompare(ipStrB);
		});

		var blockedMacs = {};
		rules.forEach(function(r) {
			if (r.target === 'REJECT' && r.src_mac)
				blockedMacs[r.src_mac.toUpperCase()] = true;
		});

		var searchInput = E('input', {
			'type': 'text',
			'placeholder': _('Search by hostname, IP, MAC, or SSID…'),
			'class': 'cbi-input-text',
			'style': 'width:100%;margin-bottom:12px;padding:8px;font-size:14px;',
			'id': 'cm-search'
		});

		var ipFilterSelect = E('select', {
			'class': 'cbi-input-select cm-dropdown',
			'id': 'cm-ip-filter',
			'aria-label': _('IP Address'),
			'change': function(ev) {
				applyFilters();
			}
		}, [
			E('option', { 'value': 'all', 'selected': 'selected' }, _('IP Address (v4 & v6)')),
			E('option', { 'value': 'v4' }, _('IPv4 Only')),
			E('option', { 'value': 'v6' }, _('IPv6 Only'))
		]);

		var ifaceOptions = [
			E('option', { 'value': 'all', 'selected': 'selected' }, _('Interface (All)')),
			E('option', { 'value': 'wireless' }, _('Wireless')),
			E('option', { 'value': 'wired' }, _('Wired'))
		];

		var uniqueIfaces = {};
		clients.forEach(function(c) {
			if (c.interface) {
				var ifName = c.interface;
				var isWanOrPhy = /^(wan|wan6|wwan|modem|pppoe|eth1|phy[0-9])/i.test(ifName);
				if (!isWanOrPhy) {
					uniqueIfaces[ifName] = true;
				}
			}
		});

		Object.keys(uniqueIfaces).sort().forEach(function(ifName) {
			ifaceOptions.push(E('option', { 'value': ifName }, ifName));
		});

		var ifaceFilterSelect = E('select', {
			'class': 'cbi-input-select cm-dropdown',
			'id': 'cm-iface-filter',
			'aria-label': _('Interface'),
			'change': function(ev) {
				applyFilters();
			}
		}, ifaceOptions);

		var leaseFilterSelect = E('select', {
			'class': 'cbi-input-select cm-dropdown',
			'id': 'cm-lease-filter',
			'aria-label': _('IP Lease'),
			'change': function(ev) {
				applyFilters();
			}
		}, [
			E('option', { 'value': 'all', 'selected': 'selected' }, _('Lease (All)')),
			E('option', { 'value': 'static' }, _('Static Only')),
			E('option', { 'value': 'dynamic' }, _('Dynamic Only'))
		]);

		var statusFilterSelect = E('select', {
			'class': 'cbi-input-select cm-dropdown',
			'id': 'cm-status-filter',
			'aria-label': _('Status'),
			'change': function(ev) {
				applyFilters();
			}
		}, [
			E('option', { 'value': 'all', 'selected': 'selected' }, _('Status (All)')),
			E('option', { 'value': 'online' }, _('Online / Allowed')),
			E('option', { 'value': 'blocked' }, _('Blocked Only'))
		]);

		var tableHead = E('tr', { 'class': 'tr table-titles' }, [
			E('th', { 'class': 'th' }, ''),
			E('th', { 'class': 'th' }, _('Name / Hostname')),
			E('th', { 'class': 'th' }, _('IP Address')),
			E('th', { 'class': 'th' }, _('MAC Address')),
			E('th', { 'class': 'th' }, _('Interface')),
			E('th', { 'class': 'th zgz-client-signal-cell' }, _('Signal')),
			E('th', { 'class': 'th' }, _('IP Lease')),
			E('th', { 'class': 'th' }, _('Status'))
		]);

		var tableBody = E('tbody', { 'id': 'cm-client-tbody' });

		if (clients.length === 0) {
			tableBody.appendChild(
				E('tr', { 'class': 'tr placeholder' },
					E('td', { 'class': 'td', 'colspan': '8',
						'style': 'text-align:center;padding:24px;' },
						_('No connected clients found.')))
			);
		}

		var clientMap = {};

		function renderIpCellContent(c, mode) {
			var ip4 = c.ip || '';
			var ip6 = c.ip6 || '';
			if (mode === 'v4') return ip4 || '—';
			if (mode === 'v6') return ip6 ? E('code', { 'dir': 'ltr', 'style': 'font-size:0.85em;' }, ip6) : '—';
			if (ip4 && ip6) {
				return E('div', {}, [
					E('span', {}, ip4),
					E('br'),
					E('small', { 'dir': 'ltr', 'style': 'opacity:0.75;font-family:monospace;' }, ip6)
				]);
			}
			return ip4 || (ip6 ? E('code', { 'dir': 'ltr', 'style': 'font-size:0.85em;' }, ip6) : '—');
		}

		function applyFilters() {
			var term = (searchInput.value || '').toLowerCase().trim();
			var ipFilter = ipFilterSelect.value || 'all';
			var ifaceFilter = ifaceFilterSelect.value || 'all';
			var leaseFilter = leaseFilterSelect.value || 'all';
			var statusFilter = statusFilterSelect.value || 'all';

			var rows = tableBody.querySelectorAll('tr[data-mac]');
			rows.forEach(function(row) {
				var mac = row.getAttribute('data-mac');
				var c = clientMap[mac];
				if (!c) return;

				var isBlocked = !!blockedMacs[c.mac];
				var isDynamic = (c.expires && c.expires > 0);

				var matchesIp = true;
				if (ipFilter === 'v4' && !c.ip) matchesIp = false;
				if (ipFilter === 'v6' && !c.ip6) matchesIp = false;

				var matchesIface = true;
				if (ifaceFilter === 'wireless' && !c.wireless) matchesIface = false;
				if (ifaceFilter === 'wired' && c.wireless) matchesIface = false;
				if (ifaceFilter !== 'all' && ifaceFilter !== 'wireless' && ifaceFilter !== 'wired') {
					if (c.interface !== ifaceFilter) matchesIface = false;
				}

				var matchesLease = true;
				if (leaseFilter === 'static' && isDynamic) matchesLease = false;
				if (leaseFilter === 'dynamic' && !isDynamic) matchesLease = false;

				var matchesStatus = true;
				if (statusFilter === 'online' && isBlocked) matchesStatus = false;
				if (statusFilter === 'blocked' && !isBlocked) matchesStatus = false;

				var searchData = row.getAttribute('data-search') || '';
				var matchesSearch = !term || searchData.indexOf(term) > -1;

				var showRow = matchesIp && matchesIface && matchesLease && matchesStatus && matchesSearch;
				row.style.display = showRow ? '' : 'none';

				var ipTd = row.querySelector('.cm-ip-td');
				if (ipTd) {
					dom.content(ipTd, renderIpCellContent(c, ipFilter));
				}
			});
		}

		clients.forEach(function(c) {
			clientMap[c.mac] = c;
			var displayName = c.hostname || c.ip || _('Unknown');
			var blocked = blockedMacs[c.mac] || false;

			var detailURL = clientUI.url('details') + '?mac=' + encodeURIComponent(c.mac);
			var nameCell = E('td', { 'class': 'td' }, [
				E('a', { 'href': detailURL, 'dir': 'auto' }, E('strong', {}, displayName))
			]);

			var formattedIface = formatIfaceName(c.interface, c.wireless, c.ssid, c.freq);

			var row = E('tr', {
				'class': 'tr',
				'style': 'cursor:pointer;' +
					(blocked ? 'opacity:0.5;' : ''),
				'data-mac': c.mac,
				'data-search': [
					displayName, c.hostname, c.ip, c.ip6, c.mac, c.ssid, formattedIface
				].join(' ').toLowerCase(),
				'click': function(ev) {
					if (!ev.target.closest('a')) window.location.href = detailURL;
				}
			}, [
				E('td', { 'class': 'td', 'style': 'font-size:1.3em;text-align:center;width:40px;' },
					deviceIcon(c)),
				nameCell,
				E('td', { 'class': 'td cm-ip-td' }, renderIpCellContent(c, 'all')),
				E('td', { 'class': 'td' },
					E('code', { 'style': 'font-size:0.85em' }, c.mac)),
				E('td', { 'class': 'td' }, E('bdi', {}, formattedIface)),
				E('td', { 'class': 'td zgz-client-signal-cell' },
					c.wireless ? signalIndicator(c.signal) : '—'),
				E('td', { 'class': 'td' }, formatExpiry(c.expires)),
				E('td', { 'class': 'td' },
					blocked ?
						E('span', { 'style': 'color:#e74c3c' }, '⛔ ' + _('Blocked')) :
						E('span', { 'style': 'color:#27ae60' }, '✓ ' + _('Online')))
			]);

			tableBody.appendChild(row);
		});

		searchInput.addEventListener('input', applyFilters);

		var tbl = E('table', { 'class': 'table', 'id': 'cm-client-table', 'aria-label': _('Devices') }, [
			E('thead', {}, tableHead),
			tableBody
		]);

		var summary = E('div', {
			'style': 'margin-bottom:12px;opacity:0.7;font-size:0.9em;'
		}, [
			_('%s connected').format(clients.length),
			' · ',
			_('%s wireless').format(clients.filter(function(c) { return c.wireless; }).length),
			' · ',
			_('%s blocked').format(Object.keys(blockedMacs).length)
		]);

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Client Manager')),
			E('div', { 'class': 'cbi-map-descr' },
				_('View and manage all devices connected to your router.')),
			summary,
			searchInput,
			E('div', { 'class': 'zgz-client-toolbar zgz-client-filters' }, [
				ipFilterSelect, ifaceFilterSelect, leaseFilterSelect, statusFilterSelect
			]),
			clientUI.scrollTable(tbl, _('Devices'))
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
