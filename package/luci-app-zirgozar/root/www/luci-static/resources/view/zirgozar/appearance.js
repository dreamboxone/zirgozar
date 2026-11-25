/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
'require view';
'require uci';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';

var _ = i18n.tr;

return view.extend({
	__init__: function() { return pui.mount(this); },

	load: function() {
		return uci.load('zirgozar').catch(function() {});
	},

	render: function() {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));

		var layout = pui.getMenuLayout();
		var select = E('select', { 'id': 'zgz-menu-layout' }, [
			E('option', { 'value': 'vertical', 'selected': layout === 'vertical' ? '' : null }, _('Vertical')),
			E('option', { 'value': 'horizontal', 'selected': layout === 'horizontal' ? '' : null }, _('Horizontal'))
		]);
		select.addEventListener('change', function() { pui.setMenuLayout(select.value); });

		return pui.page([ pui.card(_('Apearance'), 'sliders', null, E('label', { 'class': 'mk-field' }, [
			E('span', {}, _('Menu layout')),
			select
		])) ]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
