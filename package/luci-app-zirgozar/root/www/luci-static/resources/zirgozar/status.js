/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * What is shown at the top of the Basic Settings page, and this
 * program's first page shows the same way: a row of tiles - the core and
 * whether it is running, and three sites to press for a connection check -
 * then what the tunnel is doing and through which node. Consumption stays in
 * the compact card beside the site checks.
 *
 * There is no switch here. The main switch is the one in the form below,
 * saved and applied's is; two switches for one thing is one
 * too many.
 */

'use strict';
'require baseclass';
'require rpc';
'require poll';
'require ui';
'require uci';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';

var _ = i18n.tr;

var callState   = rpc.declare({ object: 'luci.zirgozar', method: 'state',   expect: { '': {} } });
var callTraffic = rpc.declare({ object: 'luci.zirgozar', method: 'traffic', expect: { '': {} } });
var callCheck   = rpc.declare({ object: 'luci.zirgozar', method: 'check',
                                params: [ 'url' ], expect: { '': {} } });
var callAction  = rpc.declare({ object: 'luci.zirgozar', method: 'action',
                                params: [ 'name', 'arg' ], expect: { '': {} } });


/* The one message the reader has already read and put away. Kept for as long
   as the page is open, which is exactly as long as it needs to be: a reload
   is a fresh look at the router and the message ought to be shown again. */
var dismissed = '';
var stateRequest = 0;
var refreshListeners = false;
function savedUsagePeriod() {
	try { var p = window.localStorage.getItem('zirgozar.usage.period'); return ['today', 'week', 'month'].indexOf(p) >= 0 ? p : 'today'; } catch (e) { return 'today'; }
}
function chooseUsagePeriod(period) {
	usagePeriod = period;
	try { window.localStorage.setItem('zirgozar.usage.period', period); } catch (e) {}
	renderUsage();
}
var usagePeriod = 'today', usageData = null, usageEnabled = true;

function usageTotals(data, period) {
	if (!data) return null;
	if (period !== 'month') return data[period] || null;
	var days = data.days || [], end = Math.max.apply(null, days.map(function(d) { return Date.parse(d.d + 'T00:00:00Z') || 0; }));
	if (!(end > 0)) return null;
	return days.reduce(function(total, d) {
		var date = Date.parse(d.d + 'T00:00:00Z');
		if (date >= end - 29 * 86400000 && date <= end) {
			total.up += Math.max(0, Number(d.up) || 0);
			total.down += Math.max(0, Number(d.down) || 0);
		}
		return total;
	}, { up: 0, down: 0 });
}

function renderUsage() {
	var totals = usageEnabled ? usageTotals(usageData, usagePeriod) : null;
	var card = byId('pwp-usage-card');
	if (card) card.setAttribute('data-enabled', String(usageEnabled));
	['up', 'down', 'total'].forEach(function(key) {
		var value = totals ? (key === 'total' ? (Number(totals.up) || 0) + (Number(totals.down) || 0) : Number(totals[key]) || 0) : null;
		setNode('pwp-usage-' + key, !usageEnabled ? _('Disabled') : value == null ? '—' : (Math.max(0, value) / 1000000000).toFixed(2));
	});
	['today', 'week', 'month'].forEach(function(period) {
		var button = byId('pwp-period-' + period);
		if (button) {
			button.disabled = !usageEnabled;
			button.setAttribute('aria-selected', String(period === usagePeriod));
			button.setAttribute('tabindex', period === usagePeriod ? '0' : '-1');
		}
	});
	var panel = byId('pwp-usage-panel');
	if (panel) panel.setAttribute('aria-labelledby', 'pwp-period-' + usagePeriod);
}

function usageCard() {
	var fa = i18n.get() === 'fa';
	return E('section', { 'id': 'pwp-usage-card', 'class': 'mk-card pwp-usage-card', 'aria-label': _('Usage (GB)') }, [
		E('div', { 'class': 'pwp-usage-title' }, _('Usage (GB)')),
		E('div', { 'class': 'pwp-usage-body' }, [
			E('div', { 'id': 'pwp-usage-panel', 'role': 'tabpanel', 'aria-labelledby': 'pwp-period-' + usagePeriod, 'class': 'pwp-usage-values', 'aria-live': 'polite' }, ['up', 'down', 'total'].map(function(key) {
				return E('div', { 'class': 'pwp-usage-value pwp-usage-' + key }, [ E('span', {}, _({ up: 'Upload', down: 'Download', total: 'Total' }[key])), E('strong', { 'id': 'pwp-usage-' + key, 'dir': 'ltr' }, '—') ]);
			})),
			E('div', { 'class': 'pwp-usage-periods', 'role': 'tablist', 'aria-orientation': 'vertical', 'aria-label': _('Period') }, ['today', 'week', 'month'].map(function(period, index) {
				return E('button', { 'id': 'pwp-period-' + period, 'type': 'button', 'role': 'tab', 'aria-controls': 'pwp-usage-panel', 'aria-selected': String(period === usagePeriod), 'tabindex': period === usagePeriod ? '0' : '-1', 'title': _(['Today', 'Last 7 days', 'Last 30 days'][index]), 'click': function() { chooseUsagePeriod(period); }, 'keydown': function(event) {
					var periods = ['today', 'week', 'month'], next;
					if (event.key === 'ArrowDown') next = (index + 1) % 3;
					else if (event.key === 'ArrowUp') next = (index + 2) % 3;
					else if (event.key === 'Home') next = 0;
					else if (event.key === 'End') next = 2;
					else return;
					event.preventDefault(); chooseUsagePeriod(periods[next]);
					var target = byId('pwp-period-' + usagePeriod); if (target) target.focus();
				} }, (fa ? ['۱ر', '۷ر', '۳۰ر'] : ['1d', '1w', '1m'])[index]);
			}))
		])
	]);
}

function socialCheck(id, name, mark, colour, url) {
	return E('button', { 'type': 'button', 'id': id, 'class': 'pwp-social-check', 'style': '--site-colour:' + colour, 'click': function() { return check(id, url); } }, [
		E('span', { 'class': 'pwp-social-icon' }, brand(mark)), E('span', { 'class': 'pwp-social-name' }, name), E('span', { 'class': 'pwp-check-value', 'id': id + '-v' }, _('Touch Check'))
	]);
}

/* The three sites' marks, drawn in one colour like every other icon on the
   page - white on the tile's own colour - rather than in their makers'. */
var BRANDS = {
	instagram:  '<path fill-rule="evenodd" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>' +
	            '<circle cx="17.5" cy="6.5" r="1.2"/>',
	reddit:     '<path fill-rule="evenodd" d="M4 14.5a8 5.5 0 1 0 16 0a8 5.5 0 1 0-16 0zm3.7-1a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0zm5.8 0a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0zM8.8 16.6q3.2 2.2 6.4 0q-3.2 1.1-6.4 0z"/>' +
	            '<circle cx="4.6" cy="10.6" r="1.9"/><circle cx="19.4" cy="10.6" r="1.9"/><circle cx="18.6" cy="4.4" r="1.7"/>' +
	            '<path d="M12 9l1.3-5.2 4 .9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
	x:          '<path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>'
};

function brand(name) {
	var s = E('span', { 'class': 'mk-ico', 'aria-hidden': 'true' });
	s.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">' + (BRANDS[name] || '') + '</svg>';
	return s;
}

function badge(st) {
	var text, cls;
	/* The switch is the intent. Off with the core still going is a tunnel on
	   its way down; off and still is simply off, whatever the last attempt
	   ended as - a failed measurement from before is not news with the switch
	   off. */
	if (!st.enabled && (st.running || st.connected))
	                                   { text = _('Disconnecting…'); cls = 'warn'; }
	else if (st.connected)             { text = _('Connected');    cls = 'ok'; }
	else if (st.status == 'selecting') { text = _('Finding a node…'); cls = 'warn'; }
	else if (st.status == 'starting')  { text = _('Starting…');    cls = 'warn'; }
	else if (!st.enabled)              { text = _('Main switch is off'); cls = ''; }
	else if (st.status == 'failed')    { text = _('Could not connect'); cls = 'error'; }
	else if (st.running)               { text = _('Connecting…');  cls = 'warn'; }
	else                               { text = _('Disconnected'); cls = ''; }

	return E('span', { 'class': 'mk-chip ' + cls, 'style': 'font-size:13px;padding:5px 14px' }, text);
}

/* The server's address beside its protocol, blurred until the pointer is on
   it (or, on a touch screen, until it is tapped) - a screenshot of this page
   is the usual way a server's address gets passed around, and nobody means to. */
function protoLine() {
	var host = E('span', { 'id': 'pwp-host', 'class': 'pwp-ip', 'dir': 'ltr', 'tabindex': '0' }, '');
	return E('div', { 'class': 'pwp-detail-row', 'style': 'display:flex;gap:10px;padding:4px 0;align-items:baseline' }, [
		E('span', { 'style': 'flex:0 0 130px;color:var(--muted);font-size:13px' }, _('Protocol')),
		E('span', { 'class': 'pwp-ticker', 'style': 'flex:1 1 auto;font-weight:600' }, [
			E('span', { 'class': 'pwp-ticker-track' }, [
			E('span', { 'id': 'pwp-proto' }, '-'),
			E('span', { 'id': 'pwp-hostwrap', 'style': 'display:none;gap:6px;align-items:center' }, [
				E('span', { 'style': 'color:var(--muted)' }, '·'), host,
				E('span', { 'id': 'pwp-exit', 'style': 'display:none;gap:6px;align-items:center' })
			])
			])
		])
	]);
}

/* Where the tunnel comes out, beside the address: the country the rest of the
   internet sees, as a flag and a name. Not hidden with the address - a
   country gives nobody a server - and not the address's own country, which
   for a server behind a CDN, or for WARP, is only where the CDN answered.

   The flag is a picture rather than the flag emoji, which Windows draws as
   two letters; if the picture cannot be had, the name says it alone. The
   name is the browser's own for the code, in the page's language. */
function countryName(cc) {
	try {
		var dn = new Intl.DisplayNames([ i18n.get() === 'fa' ? 'fa' : 'en' ], { type: 'region' });
		return dn.of(cc) || cc;
	} catch (e) {
		return cc;
	}
}

function renderExit(st) {
	var box = byId('pwp-exit');
	if (!box) return;
	var cc = /^[A-Z]{2}$/.test(st.exit_cc || '') ? st.exit_cc : '';
	var key = cc + '|' + (st.exit_ip || '');
	if (box.getAttribute('data-k') === key) return;
	box.setAttribute('data-k', key);
	while (box.firstChild) box.removeChild(box.firstChild);
	box.style.display = cc ? 'inline-flex' : 'none';
	if (!cc) return;
	box.setAttribute('title', _('Where the tunnel comes out') + (st.exit_ip ? ': ' + st.exit_ip : ''));
	var img = E('img', {
		'src': 'https://flagcdn.com/w40/' + cc.toLowerCase() + '.png',
		'alt': '', 'width': '22', 'height': '15',
		'style': 'border-radius:3px;box-shadow:0 0 0 1px #0002;object-fit:cover'
	});
	img.addEventListener('error', function() { if (img.parentNode) img.parentNode.removeChild(img); });
	box.appendChild(img);
	box.appendChild(E('span', {}, countryName(cc)));
}

function line(label, id) {
	return E('div', { 'class': 'pwp-detail-row', 'style': 'display:flex;gap:10px;padding:4px 0;align-items:baseline' }, [
		E('span', { 'style': 'flex:0 0 130px;color:var(--muted);font-size:13px' }, label),
		E('span', { 'class': 'pwp-ticker', 'style': 'flex:1 1 auto;font-weight:600' }, [
			E('span', { 'class': 'pwp-ticker-track' }, [ E('span', { 'id': id }, '-') ])
		])
	]);
}

/* The page's pieces while they are still being built and not yet in the
   document, so the first values can go straight in rather than waiting for
   the first poll; afterwards, the document. */
var scope = null;

function byId(id) {
	if (scope)
		for (var i = 0; i < scope.length; i++) {
			if (scope[i].id == id) return scope[i];
			var f = scope[i].querySelector('#' + id);
			if (f) return f;
		}
	return document.getElementById(id);
}

function setNode(id, content) {
	var n = byId(id);
	if (!n) return;
	while (n.firstChild) n.removeChild(n.firstChild);
	if (content == null) return;
	n.appendChild(content instanceof Node ? content
		: document.createTextNode(content === '' ? '-' : String(content)));
}

/* One of the row of tiles, drawn as Makhzan's metric card, with the
   icon given as an element so a brand mark can stand in for a line icon. */
function tile(id, ico, colour, title, value, onclick) {
	return E('div', {
		'class': 'mk-metric' + (onclick ? ' mk-click' : ''),
		'style': '--accent:' + colour,
		'id': id,
		'click': onclick || null
	}, [
		E('span', { 'class': 'mk-metric-ico' }, ico),
		E('div', { 'class': 'mk-metric-title', 'id': id + '-t' }, title),
		E('div', { 'class': 'mk-big', 'id': id + '-v' }, value)
	]);
}

function coreName(n) {
	n = String(n || 'xray');
	return n == 'xray' ? 'Xray' : n;
}

function coreTile(id, word, name, version, running) {
	var t = byId(id + '-t'), v = byId(id + '-v'), box = byId(id);
	if (t) t.textContent = word + ' ' + name;
	if (box) box.setAttribute('title', name + (version ? ' ' + version : ''));
	if (t && version)
		t.appendChild(E('div', { 'class': 'pwp-core-version' }, version));
	if (v) {
		v.className = 'mk-big ' + (running ? 'mk-on' : 'mk-bad');
		v.textContent = running ? _('RUNNING') : _('NOT RUNNING');
	}
}

function renderState(st) {
	if (st && st.stats_enabled != null) {
		usageEnabled = st.stats_enabled !== false;
		renderUsage();
	}
	window.requestAnimationFrame(updateTickers);
	st = st || {};
	setNode('pwp-version', pui.versionText(st.version));
	setNode('pwp-state', badge(st));
	setNode('pwp-node', st.server || '-');
	setNode('pwp-proto', st.protocol ? st.protocol : '-');
	setNode('pwp-host', st.host ? st.host : '');
	var hw = byId('pwp-hostwrap');
	if (hw) hw.style.display = st.host ? 'inline-flex' : 'none';
	renderExit(st);
	setNode('pwp-latency', st.latency_ms > 0 ? pui.ms(st.latency_ms) : '-');
	setNode('pwp-route', st.route_ir
		? (st.geo_ready ? _('Iran is Direct')
		                : _('Iran split is on, but the routing data is missing'))
		: _('Everything goes through the tunnel'));

	/* The core: its name beside the word, on
	   one line, and under it whether it is running, in green or in red. The
	   version is there when the pointer rests on the tile. */
	coreTile('pwp-core', _('Core'), coreName(st.core_name), st.core_version, st.core_running);

	/* Anything the user has to act on - and only that. The cross puts it away:
	   a stored message is cleared, and one worked out fresh each time is
	   remembered as dismissed so it does not come straight back. */
	var msg = byId('pwp-msg');
	if (msg) {
		var text = st.message ? _(st.message) : '';
		if (!text && st.passwall)
			text = _('PassWall2 is also redirecting traffic — turn one of them off.');
		if (text && text === dismissed) text = '';
		msg.style.display = text ? 'flex' : 'none';
		msg.setAttribute('data-text', text);
		setNode('pwp-msg-text', text);
		/* A message that asks for something to be installed has the button
		   that installs it beside it. Drawn when the message changes, not on
		   every refresh, so that an install under way keeps its button. */
		var act = byId('pwp-msg-act');
		if (act && act.getAttribute('data-for') !== (st.message || '')) {
			act.setAttribute('data-for', st.message || '');
			while (act.firstChild) act.removeChild(act.firstChild);
			var want = pui.installsIn(st.message);
			var b = want && pui.installButtons(want.cores, want.packages);
			if (b) act.appendChild(b);
		}
	}

	/* The card is about the tunnel. A job of another page - routing data
	   downloading, a core or this program installing, the servers being
	   checked or the subscriptions read - is shown on that page, not here;
	   it only holds back Choose the fastest, which would run into it. */
	var busy = (st.status == 'selecting' || st.status == 'starting');
	var reselect = byId('pwp-reselect');
	if (reselect) reselect.disabled = busy || !!st.job;

	/* Two passes, and they measure different things, so one bar that silently
	   changes meaning half way through would be a lie told twice. */
	var ok  = (st.connected || st.status == 'idle' || st.status == 'ready');
	/* With the switch off, how the last attempt ended is not news. */
	var bad = (st.status == 'failed') && !!st.enabled;
	var pct = 0, label = '';

	if (st.phase == 'prefilter' && st.total > 0) {
		pct = Math.min(100, Math.round((st.done || 0) * 100 / st.total));
		label = _('Checking which of %d nodes answer at all — %d so far').format(st.total, st.alive || 0);
	} else if (st.phase == 'urltest') {
		pct = st.alive > 0 ? Math.min(100, Math.round((st.tested || 0) * 100 / st.alive)) : 0;
		label = _('Measuring the %d that answered, best first — %d done').format(st.alive || 0, st.tested || 0);
	} else if (bad) {
		pct = 100;
		label = st.alive > 0
			? _('%d of %d nodes answered, but none completed a request').format(st.alive, st.total || 0)
			: _('No node on the list answered at all');
	} else if (ok) {
		pct = 100;
		label = '';
	}

	var bar = byId('pwp-bar');
	var fill = byId('pwp-fill');
	if (bar) bar.style.display = (busy || bad) ? 'block' : 'none';
	if (fill) {
		fill.style.width = pct + '%';
		fill.style.background = bad ? '#ef4444' : (ok ? '#10b981' : '#3b82f6');
	}
	setNode('pwp-pct', label);
}

function updateTickers() {
	document.querySelectorAll('.pwp-status-card .pwp-ticker').forEach(function(box) {
		var track = box.firstElementChild;
		if (!track) return;
		var distance = Math.max(0, track.scrollWidth - box.clientWidth);
		var moving = distance > 2;
		box.classList.toggle('pwp-ticker-moving', moving);
		if (moving) {
			var shift = (window.getComputedStyle(box).direction == 'rtl' ? 1 : -1) * distance;
			track.style.setProperty('--ticker-shift', shift + 'px');
			track.style.setProperty('--ticker-duration', Math.max(8, distance / 22 + 4) + 's');
		}
	});
}

function renderTraffic(t) {
	usageData = t || {};
	renderUsage();
}

function refreshState() {
	var request = ++stateRequest;
	return callState().then(function(st) {
		if (request === stateRequest) renderState(st);
	}).catch(function() {});
}

/* The connection check: press the tile, one request, timed. */
function check(id, url) {
	var button = byId(id);
	if (button && button.disabled) return Promise.resolve();
	if (button) button.disabled = true;
	var v = byId(id + '-v');
	if (v) {
		v.className = 'pwp-check-value mk-wait';
		v.textContent = _('Checking…');
	}
	return callCheck(url).then(function(r) {
		var ms = Number(r && r.ms) || 0;
		if (!v) return;
		v.className = 'pwp-check-value ' + (ms > 0 ? (ms < 1000 ? 'mk-on' : ms < 2000 ? 'mk-wait' : 'mk-bad') : 'mk-bad');
		v.textContent = ms > 0 ? pui.ms(ms) : _('N/A');
		v.title = r && r.http_code ? 'HTTP ' + r.http_code : '';
	}).catch(function() {
		if (v) { v.className = 'pwp-check-value mk-bad'; v.textContent = _('N/A'); v.title = ''; }
	}).then(function() { if (button) button.disabled = false; });
}

return baseclass.extend({
	/* A measurement started as the page opens, so that by the time the
	   reader has turned the switch on the answer is there. The state and the
	   traffic are not waited for: the page is drawn at once and they are
	   filled in the moment they arrive - asking the router for its state takes
	   most of a second on a small one, and a page that sat blank for that long
	   on every visit felt slow for no reason of its own. */
	load: function() {
		callAction('prepare', '').catch(function() {});
		return Promise.resolve([ null, null ]);
	},

	/* Everything for the top of the page, and the traffic for its foot. */
	render: function(data) {
		usagePeriod = savedUsagePeriod(); usageData = null;
		var st = (data && data[0]) || null;
		var tr = (data && data[1]) || null;
		usageEnabled = st ? st.stats_enabled !== false : uci.get('zirgozar', 'config', 'stats_enabled') != '0';

		var tiles = E('div', { 'class': 'mk-grid mk-metrics pwp-status-row', 'style': 'margin-bottom:18px' }, [
			tile('pwp-core', pui.icon('cpu'), '#3b82f6', _('Core'), '-'),
			E('section', { 'class': 'mk-card pwp-social-card', 'aria-label': _('Connection checks') }, [
				socialCheck('pwp-chk-ig', _('Instagram'), 'instagram', '#df458e', 'https://www.instagram.com'),
				socialCheck('pwp-chk-reddit', _('Reddit'), 'reddit', '#ec693c', 'https://www.reddit.com'),
				socialCheck('pwp-chk-x', 'X', 'x', '#329dc2', 'https://x.com')
			]),
			usageCard()
		]);

		var status = pui.card(_('Status'), 'pulse', '#10b981', E('div', {}, [
			E('div', { 'id': 'pwp-msg', 'class': 'mk-alert', 'style': 'display:none' }, [
				E('span', { 'id': 'pwp-msg-text', 'style': 'flex:1 1 200px' }, ''),
				E('div', { 'id': 'pwp-msg-act', 'style': 'flex:1 1 100%;order:3' }),
				E('button', {
					'type': 'button',
					'title': _('Dismiss'),
					'style': 'border:0;background:none;cursor:pointer;font-size:18px;line-height:1;opacity:.6;padding:0 2px;color:inherit',
					'click': function() {
						var box = byId('pwp-msg');
						dismissed = (box && box.getAttribute('data-text')) || '';
						if (box) box.style.display = 'none';
						callAction('clear_message', '').catch(function() {});
					}
				}, '×')
			]),
			E('div', { 'id': 'pwp-bar', 'style': 'display:none;margin:0 0 14px 0' }, [
				E('div', { 'style': 'height:8px;border-radius:6px;overflow:hidden;background:var(--line)' }, [
					E('div', {
						'id': 'pwp-fill',
						'style': 'height:100%;width:0%;background:#3b82f6;border-radius:6px;' +
						         'transition:width .45s ease,background .45s ease'
					}, '')
				]),
				E('div', { 'id': 'pwp-pct', 'style': 'margin-top:5px;font-size:12px;color:var(--muted)' }, '')
			]),
			line(_('Node name'), 'pwp-node'),
			protoLine(),
			E('div', { 'class': 'mk-row', 'style': 'margin-top:14px' }, [
				E('button', {
					'id': 'pwp-reselect',
					'type': 'button',
					'class': 'mk-btn soft-blue',
					'click': ui.createHandlerFn(null, function() {
						return callAction('reselect', '').then(refreshState);
					})
				}, [ pui.icon('refresh'), E('span', {}, _('Choose fastest')) ])
			])
		]));

		status.classList.add('pwp-status-card');
		status.querySelector('.mk-card-title').appendChild(E('span', { 'id': 'pwp-state', 'style': 'font-size:13px;white-space:nowrap' }, '-'));
		tiles.insertBefore(status, tiles.firstChild);

		poll.add(refreshState, 3);
		if (!refreshListeners) {
			refreshListeners = true;
			window.addEventListener('focus', refreshState);
			document.addEventListener('visibilitychange', function() {
				if (!document.hidden) refreshState();
			});
		}
		/* Traffic moves in five-minute steps. */
		var statsOn = usageEnabled;
		if (statsOn) poll.add(function() {
			return callTraffic().then(renderTraffic).catch(function() {});
		}, 15);

		/* Filled in now, in the pieces themselves. */
		if (st) {
			scope = [ tiles, status ];
			renderState(st);
			renderTraffic(tr || {});
			scope = null;
		} else {
			/* Asked for now; drawn once the pieces are in the document, where
			   these find them - LuCI puts the page there a moment after this
			   returns. */
			var gotState = callState().catch(function() { return {}; });
			var gotTraffic = statsOn ? callTraffic().catch(function() { return {}; }) : null;
			var tries = 0;
			(function whenShown() {
				if (!byId('pwp-state') && tries++ < 100) { window.setTimeout(whenShown, 50); return; }
				gotState.then(renderState);
				if (gotTraffic) gotTraffic.then(renderTraffic);
			})();
		}

		return { top: [ tiles ], bottom: [], version: st ? st.version : null };
	}
});
