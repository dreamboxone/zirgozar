/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
'require baseclass';
'require rpc';
'require ui';
'require zirgozar.i18n as i18n';
var _ = i18n.tr;
var action = rpc.declare({ object: 'luci.zirgozar', method: 'action', params: [ 'name', 'arg' ], expect: { '': {} } });

function applyEndpoints(map, sid, fields, result, protocol) {
	if (fields.proto != 'aether' || fields.aether_protocol != protocol) throw new Error(_('The Aether protocol changed; scan again.'));
	var values = protocol == 'wg' || protocol == 'masque'
		? { endpoint: result.endpoint || '' }
		: { outer: result.outer || '' };
	if ((protocol == 'gool' || protocol == 'mim') && result.inner) values.inner = result.inner;
	Object.keys(values).forEach(function(key) {
		fields['aether_' + key] = values[key];
		var options = map.lookupOption('_aether_' + key, sid), field = options && options[0] && options[0].getUIElement(sid);
		if (field) {
			field.setValue(values[key]);
			var root = field.node;
			if (root) root.dispatchEvent(new Event('change', { bubbles: true }));
		}
	});
}
function open(draft, apply) {
	var closed = false, running = true, timer, found = null, protocol = '';
	var status = E('p', {}, _('Starting Aether scan…'));
	var endpoints = E('bdi', { dir: 'ltr', style: 'display:block;white-space:pre-wrap' });
	var log = E('pre', { dir: 'ltr', style: 'max-height:260px;overflow:auto;white-space:pre-wrap;text-align:left' });
	var box = E('div', {}, [
		E('p', {}, _('The scan tests the current form without saving it. A working result is applied to the form automatically; save the config to keep it.')),
		status, endpoints, log
	]);
	function stopPolling() { closed = true; if (timer) window.clearTimeout(timer); }
	var close = E('button', { class: 'btn cbi-button', click: function() {
		stopPolling();
		if (running) action('aether_scan_cancel', draft.sid).catch(function() {});
		ui.hideModal();
	} }, _('Close window'));
	var cancel = E('button', { class: 'btn cbi-button', click: function() {
		cancel.disabled = true; status.textContent = _('Stopping Aether scan…');
		return action('aether_scan_cancel', draft.sid).catch(showError);
	} }, _('Cancel scan'));
	box.appendChild(E('div', { class: 'right' }, [ cancel, ' ', close ]));
	ui.showModal(_('Aether endpoint scan'), [ box ]);
	function showError(error) {
		running = false; cancel.disabled = true;
		status.textContent = _(error && error.message ? error.message : _('Aether scan failed.'));
	}
	function update(response) {
		if (!response || !response.ok) { showError(new Error((response && response.error) || _('Aether scan failed.'))); return; }
		running = !!response.running;
		cancel.disabled = !running;
		log.textContent = response.log || response.message || '';
		if (response.state == 'found') {
			found = response.result; protocol = response.protocol;
			endpoints.textContent = [ found.endpoint, found.outer, found.inner ].filter(Boolean).join('\n');
			try { apply(found, protocol); status.textContent = _('Endpoints applied to form. Save the config to keep them.'); }
			catch (e) { showError(e); }
		} else if (response.state == 'cancelled') status.textContent = _('Aether scan cancelled.');
		else if (response.state == 'error') status.textContent = _(response.message || 'Aether scan failed.');
		else status.textContent = _('Scanning and testing Aether endpoints…');
		if (running) timer = window.setTimeout(poll, 1500);
	}
	function poll() {
		if (closed || box.isConnected === false) {
			stopPolling(); if (running) action('aether_scan_cancel', draft.sid).catch(function() {}); return;
		}
		return action('aether_scan_status', draft.sid).then(update).catch(showError);
	}
	return action('aether_scan_start', JSON.stringify(draft)).then(function(response) {
		if (closed) { if (response && response.running) return action('aether_scan_cancel', draft.sid); return; }
		update(response);
	}).catch(showError);
}
return baseclass.extend({ open: open, applyEndpoints: applyEndpoints });
