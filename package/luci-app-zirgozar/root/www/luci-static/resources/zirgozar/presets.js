/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
'require baseclass';
'require form';
'require zirgozar.i18n as i18n';
var _ = i18n.tr;

function hello(lengths) {
	return { tcp: [
		{ type: 'fragment', settings: { packets: 'tlshello', lengths: lengths, delays: [ '0' ], maxSplit: '0' } },
		{ type: 'fragment', settings: { packets: '1-1', lengths: [ '114', '1' ], delays: [ '1' ], maxSplit: '11' } }
	] };
}
var finalMasks = [
	{ id: 'tlshello-zero', name: 'tlshello-0-len (0-104-1-0-0-114-1-1-11)', value: hello([ '0', '104', '1' ]) },
	{ id: 'tlshello', name: 'tlshello (6-98-1-0-0-114-1-1-11)', value: hello([ '6', '98', '1' ]) },
	{ id: 'udp-noise', name: 'udp-noise (rnd-24-1200-1230)', value: { udp: [ { type: 'noise', settings: {
		reset: '28', noise: Array.from({ length: 24 }, function() { return { rand: '1200-1230', delay: '10' }; })
	} } ] } }
];
function canonical(value) {
	if (Array.isArray(value)) return value.map(canonical);
	if (value && typeof value == 'object') {
		var out = {};
		Object.keys(value).sort().forEach(function(k) { out[k] = canonical(value[k]); });
		return out;
	}
	return value;
}
function identify(text) {
	if (!String(text || '').trim()) return '';
	try {
		var key = JSON.stringify(canonical(JSON.parse(text)));
		for (var i = 0; i < finalMasks.length; i++)
			if (JSON.stringify(canonical(finalMasks[i].value)) == key) return finalMasks[i].id;
	} catch (e) {}
	return 'custom';
}
function validate(text) {
	if (!String(text || '').trim()) return true;
	try {
		var value = JSON.parse(text);
		return !!value && typeof value == 'object' && !Array.isArray(value);
	} catch (e) { return false; }
}
function withFinalMask(option) {
	option.validate = function(section, value) { return validate(value) || _('Expected a JSON object.'); };
	option.renderWidget = function(section, index, value) {
		var self = this, box = form.TextValue.prototype.renderWidget.call(this, section, index, value);
		var picker = E('select', { 'class': 'cbi-input-select', 'aria-label': _('FinalMask preset') },
			[ E('option', { value: '' }, _('Default')), E('option', { value: 'custom' }, _('Custom')) ].concat(
				finalMasks.map(function(p) { return E('option', { value: p.id }, p.name); })));
		picker.value = identify(value);
		picker.addEventListener('change', function() {
			var field = self.getUIElement(section), current = field ? field.getValue() : '';
			if (picker.value == 'custom') return;
			if (identify(current) == 'custom' && !window.confirm(_('Replace the custom FinalMask with this preset?'))) {
				picker.value = 'custom'; return;
			}
			var preset = finalMasks.filter(function(p) { return p.id == picker.value; })[0];
			if (field) field.setValue(preset ? JSON.stringify(preset.value, null, 2) : '');
			var textarea = box.querySelector('textarea');
			if (textarea) [ 'input', 'change', 'blur' ].forEach(function(t) { textarea.dispatchEvent(new Event(t, { bubbles: true })); });
		});
		box.addEventListener('input', function() { var field = self.getUIElement(section); if (field) picker.value = identify(field.getValue()); });
		return E('div', {}, [ picker, box ]);
	};
	return option;
}
function withDialMode(option) {
	option.value('', _('Default'));
	option.description = _('Empty uses the core default. Custom dialMode names require a core that implements them.');
	option.validate = function(section, value) { return !value || /^[A-Za-z0-9._-]{1,64}$/.test(value) || _('Invalid dialMode name.'); };
	return option;
}
return baseclass.extend({ finalMasks: finalMasks, identify: identify, validate: validate, withFinalMask: withFinalMask, withDialMode: withDialMode });
