/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
'require baseclass';
'require form';
'require uci';
'require zirgozar.i18n as i18n';
var _ = i18n.tr;
var fallbackKeys = ['fallback_failed', 'fallback_no_response', 'fallback_no_ip'];
function nativeNode(node) {
	var link = String(node.link || '').trim(), protocol;
	try {
		if (node.record) protocol = String(node.record).split('\t')[2];
		else if (link.charAt(0) == '{') {
			var json = JSON.parse(link);
			protocol = (json.outbounds ? json.outbounds[0] : json).protocol;
		} else protocol = (link.match(/^([a-z0-9]+):\/\//i) || [])[1];
	} catch (e) { return false; }
	return /^(vless|vmess|trojan|ss|shadowsocks|socks|socks5|http|https|wireguard|wg|freedom)$/.test(protocol || '');
}
function validateFallback(nodes, source, target, read) {
	if (!target || target == '_none') return true;
	var byId = Object.create(null);
	nodes.forEach(function(node) { byId[node['.name']] = node; });
	if (!byId[target] || !nativeNode(byId[target])) return _('Choose an existing native Xray config.');
	function visit(id, path) {
		if (path.indexOf(id) >= 0 || path.length >= 32) return false;
		var node = byId[id];
		if (!node) return false;
		var next = fallbackKeys.map(function(key) { return read(id, key); }).filter(function(ref) { return ref && ref != '_none'; });
		var chain = read(id, 'chain_proxy');
		if (chain == '1') next.push(read(id, 'preproxy_node'));
		if (chain == '2') next.push(read(id, 'to_node'));
		return next.filter(Boolean).every(function(ref) { return visit(ref, path.concat(id)); });
	}
	return visit(target, [source]) || _('Fallback and proxy chains must not contain loops or missing configs.');
}
function addFields(section, xr, tlsOnly, sid) {
	var description = _('Requires Xray-patterniha 26.11.20 or newer. Empty preserves the imported setting; zero uses the core default.');
	function number(key, label, wrapper, max, desc) {
		var option = wrapper(section.option(form.Value, key, _(label), desc || description));
		option.datatype = 'and(uinteger,range(0,' + max + '))'; option.placeholder = _('Default');
		return option;
	}
	number('tcp_handshake_timeout', 'TCP connection timeout (ms)', xr, 2147483647);
	number('tls_handshake_timeout', 'TLS handshake timeout (ms)', tlsOnly, 2147483647);
	number('tcp_keepalive_count', 'TCP keepalive probe count', xr, 127);
	var option = xr(section.option(form.ListValue, 'happy_eyeballs_success', _('Happy Eyeballs success criterion'),
		_('Choose whether an IP wins after TCP connects or only after TLS completes. Existing Happy Eyeballs tuning is preserved. Requires Xray-patterniha 26.11.20 or newer.')));
	option.value('', _('Default')); option.value('tcpConnected', _('TCP connected')); option.value('tlsHandshakeComplete', _('TLS handshake complete'));
	function booleanOverride(key, label, help, dependency) {
		var field = section.option(form.ListValue, key, _(label), _(help));
		field.depends(dependency[0], dependency[1]);
		field.retain = true;
		field.value('', _('Default')); field.value('1', _('On')); field.value('0', _('Off'));
	}
	var interleave = section.option(form.Value, 'happy_eyeballs_interleave', _('Addresses per Happy Eyeballs group'),
		_('Number of addresses to try from each IP family before alternating. Empty preserves the imported value.'));
	interleave.depends('happy_eyeballs', '1');
	interleave.retain = true;
	interleave.datatype = 'range(1,32)';
	interleave.placeholder = _('Default');
	booleanOverride('happy_eyeballs_assure', 'Fill the first Happy Eyeballs group',
		'Repeat addresses when the first group for an IP family has too few. Requires Xray-patterniha 26.11.22 or newer.',
		['happy_eyeballs', '1']);
	booleanOverride('fallback_pass_address', 'Use the first connection address for fallback',
		'Use the primary connection’s IP and port for the no-response fallback. Requires Xray-patterniha 26.11.21 or newer.',
		['fallback_no_response', /^(?!_none$).+/]);
	// All fields use the same protocol visibility as the existing Happy Eyeballs switch.
	var nodes = uci.sections('zirgozar', 'node');
	[
		['fallback_failed', 'Fallback on connection failure'],
		['fallback_no_response', 'Fallback on no response'],
		['fallback_no_ip', 'Fallback on DNS failure']
	].forEach(function(spec) {
		var field = xr(section.option(form.ListValue, spec[0], _(spec[1]),
			_('Retry reaching this config’s server through the selected config. This changes the path to the server, not the final destination. Only native Xray configs are supported. Requires Xray-patterniha 26.11.20 or newer.')));
		field.value('', _('Default'));
		field.value('_none', _('Disabled'));
		nodes.filter(function(node) { return node['.name'] != sid && nativeNode(node); }).forEach(function(node) { field.value(node['.name'], node.name || node['.name']); });
		field.validate = function(id, value) {
			return validateFallback(nodes, id, value, function(ref, key) {
				if (ref == id) { var v = section.formvalue(ref, key); if (v != null) return v; }
				return uci.get('zirgozar', ref, key);
			});
		};
	});
	number('fallback_wait_ms', 'No-response wait (ms)', xr, 2147483647,
		_('Only used with the no-response fallback. Zero waits until the connection closes or fails.'));
	number('fallback_buffer_size', 'Fallback replay buffer (bytes)', xr, 16777216,
		_('Only used with the no-response fallback. Default: 16384 bytes. A larger request disables replay.'));
}
return baseclass.extend({addFields:addFields, nativeNode:nativeNode, validateFallback:validateFallback});
