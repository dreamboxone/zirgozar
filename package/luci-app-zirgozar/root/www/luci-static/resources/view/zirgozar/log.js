/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * Runtime Logs: this program's own log, a date on
 * every line and each step of a start indented under it - the node, the
 * core, the DNS, the firewall - with a button that empties it. And under it,
 * what the core itself said, which is where the reason is when a node is
 * refused.
 */

'use strict';
'require view';
'require rpc';
'require poll';
'require ui';
'require uci';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';
'require zirgozar.logfa as logfa';

/* Our own strings, in the language the setting names. */
var _ = i18n.tr;

var callLog = rpc.declare({ object: 'luci.zirgozar', method: 'log', expect: { '': {} } });
var callAction = rpc.declare({ object: 'luci.zirgozar', method: 'action',
                               params: [ 'name', 'arg' ], expect: { '': {} } });

/* Persian logs keep a fixed right edge even when a line starts with a core
   name or a path. Embedded Latin text retains its own character order. */
function box() {
	if (i18n.get() === 'fa')
		return E('pre', { 'dir': 'rtl', 'class': 'mk-log mk-log-fa',
		                  'style': 'direction:rtl;unicode-bidi:embed;text-align:right' }, '');
	return E('pre', { 'dir': 'ltr', 'class': 'mk-log' }, '');
}

/* Kept at the bottom while the reader is at the bottom, and left alone once
   they have scrolled up to read something. */
function fill(el, text, empty) {
	var atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
	el.textContent = text || empty;
	if (atEnd || !el.dataset.drawn) el.scrollTop = el.scrollHeight;
	el.dataset.drawn = '1';
}

return view.extend({
	load: function() {
		return Promise.all([
			callLog().catch(function() { return {}; }),
			uci.load('zirgozar').catch(function() { return null; })
		]);
	},

	render: function(data) {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));

		var runtime = box(), core = box();

		/* In Persian when it can be, and as it came when it cannot - a
		   browser still holding an older logfa.js must not get an empty box. */
		function said(fn, t) {
			if (i18n.get() !== 'fa') return t;
			if (typeof logfa[fn] !== 'function') {
				/* An older copy: fetched afresh, and the page drawn again with
				   it - once, so a copy that really lacks it cannot loop. */
				try {
					if (!window.sessionStorage.getItem('zirgozar-logfa-fresh')) {
						window.sessionStorage.setItem('zirgozar-logfa-fresh', '1');
						var v = L.env.resource_version ? '?v=' + L.env.resource_version : '';
						fetch(L.env.base_url + '/zirgozar/logfa.js' + v, { cache: 'reload' })
							.then(function() { location.reload(); }).catch(function() {});
					}
				} catch (e) {}
				return t;
			}
			try { return logfa[fn](t); } catch (e) { return t; }
		}

		function draw(d) {
			d = d || {};
			fill(runtime, said('text', d.text), _('Nothing has been logged yet.'));
			fill(core, said('core', d.core), uci.get('zirgozar', 'config', 'log_node') === '0'
				? _('The node log is switched off in Settings → Log.')
				: _('The core has not said anything yet.'));
		}

		poll.add(function() {
			return callLog().then(draw).catch(function() {});
		}, 5);

		var page = pui.page([
			pui.card(_('Runtime Logs'), 'book', '#1e88e5', E('div', {}, [
				E('div', { 'class': 'mk-row', 'style': 'margin-bottom:10px;justify-content:space-between' }, [
					E('span', { 'style': 'font-size:13px;color:var(--muted)' },
						_('What Zirgozar does is shown here, refreshed every 5 seconds. It is emptied when the router reboots.')),
					E('div', { 'style': 'display:flex;gap:8px;align-items:center' }, [
						/* What is in the box, as it reads on the page. */
						pui.copyBtn ? pui.copyBtn(function() { return runtime.textContent; }) : '',
						pui.btn(_('Clear logs'), 'danger mk-small', function() {
							return callAction('clear_log', '').then(function() {
								return callLog().then(draw);
							});
						}, 'trash')
					])
				]),
				runtime
			])),
			pui.card(_('Node log'), 'cpu', '#8b5cf6', E('div', {}, [
				E('div', { 'class': 'mk-row', 'style': 'margin-bottom:10px;justify-content:space-between' }, [
					E('span', { 'style': 'font-size:13px;color:var(--muted)' },
						_('The Xray core’s messages are shown here.')),
					E('div', { 'style': 'display:flex;gap:8px;align-items:center' }, [
						/* What is in the box, as it reads on the page. */
						pui.copyBtn ? pui.copyBtn(function() { return core.textContent; }) : '',
						pui.btn(_('Clear logs'), 'danger mk-small', function() {
							return callAction('clear_core_log', '').then(function() {
								return callLog().then(draw);
							});
						}, 'trash')
					])
				]),
				core
			]))
		]);

		/* Once LuCI has put the page in the document. */
		window.setTimeout(function() { draw(data[0]); }, 0);
		return page;
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
