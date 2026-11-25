/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
'require view';
'require form';
'require rpc';
'require ui';
'require uci';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';
'require zirgozar.checksites as checksites';

var _ = i18n.tr;
var callLed = rpc.declare({ object: 'luci.zirgozar', method: 'led', expect: { '': {} } });
var callAction = rpc.declare({ object: 'luci.zirgozar', method: 'action',
	params: [ 'name', 'arg' ], expect: { '': {} } });

return view.extend({
	__init__: function() { return pui.mount(this); },

	load: function() {
		return Promise.all([
			pui.loadInfo('led', callLed).catch(function() { return {}; }),
			uci.load('zirgozar').catch(function() { return null; })
		]);
	},

	render: function(data) {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));

		var m = new form.Map('zirgozar'), s, o;
		var ledInfo = data && data[0];
		var pendingSiteSave = Promise.resolve();
		var saveForm = m.save;
		m.save = function() {
			var args = arguments;
			return pendingSiteSave.then(function() { return saveForm.apply(m, args); });
		};

		s = m.section(form.NamedSection, 'config', 'zirgozar', _('Connection check settings'));
		s.anonymous = true;
		o = s.option(form.MultiValue, 'connection_check_sites', _('Test sites'), _('Select up to four sites. Changes are saved automatically.'));
		o.widget = 'checkbox'; o.orientation = 'horizontal';
		checksites.sites.forEach(function(site) { o.value(site.id, site.name); });
		o.cfgvalue = function(section) { return checksites.selected(uci.get('zirgozar', section, this.option)).map(function(site) { return site.id; }); };
		o.validate = function(section, value) { return !value || (Array.isArray(value) ? value : String(value).split(/\s+/)).length <= 4 || _('Select up to four sites.'); };
		o.write = function(section, value) { uci.set('zirgozar', section, this.option, Array.isArray(value) && value.length ? value.join(' ') : 'none'); };
		o.remove = function(section) { this.write(section, []); };
		o.renderWidget = function(section, index, value) {
			var readonly = this.readonly != null ? this.readonly : this.map.readonly;
			var control = new ui.Select(value || [], this.transformChoices(), {
				id: this.cbid(section), sort: this.keylist, multiple: true, widget: 'checkbox',
				orientation: 'horizontal', optional: true, validate: this.getValidator(section), disabled: readonly
			});
			// LuCI Select reads radio buttons by default, even in checkbox mode.
			control.getValue = function() {
				return Array.from(this.node.querySelectorAll('input[type="checkbox"]')).filter(function(input) { return input.checked; }).map(function(input) { return input.value; });
			};
			control.setValue = function(values) {
				values = Array.isArray(values) ? values : [];
				Array.from(this.node.querySelectorAll('input[type="checkbox"]')).forEach(function(input) { input.checked = values.indexOf(input.value) >= 0; });
			};
			var widget = control.render();
			Array.from(widget.querySelectorAll('input[type="checkbox"]')).forEach(function(input) {
				control.setUpdateEvents(input, 'change', 'blur');
				control.setChangeEvents(input, 'change');
			});
			widget.classList.add('pwp-check-sites');
			function limit() {
				var inputs = Array.from(widget.querySelectorAll('input[type="checkbox"]'));
				var full = inputs.filter(function(input) { return input.checked; }).length >= 4;
				inputs.forEach(function(input) { input.disabled = readonly || (full && !input.checked); });
			}
			widget.addEventListener('change', limit); limit();
			var saved = control.getValue(), saving = 0;
			function waitForSiteSave(event) {
				var link = event.target.closest && event.target.closest('.mk-sidebar-link[href]');
				if (!saving || !link || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
				event.preventDefault();
				var href = link.href;
				pendingSiteSave.then(function() { pui.navigate(href).catch(function() {}); });
			}
			widget.addEventListener('change', function() {
				var choices = control.getValue();
				if (!saving++) document.addEventListener('click', waitForSiteSave, true);
				pendingSiteSave = pendingSiteSave.then(function() {
					return callAction('check_sites', choices.join(' ')).then(function(result) {
						if (!result || !result.ok) throw new Error((result && result.error) || _('Could not save settings.'));
						saved = choices;
						uci.set('zirgozar', section, 'connection_check_sites', choices.length ? choices.join(' ') : 'none');
					});
				}).catch(function(error) {
					if (control.getValue().join(' ') === choices.join(' ')) { control.setValue(saved); limit(); }
					ui.addNotification(null, E('p', {}, error.message || _('Could not save settings.')), 'error');
				}).finally(function() {
					if (!--saving) document.removeEventListener('click', waitForSiteSave, true);
				});
			});
			return widget;
		};

		var led = ledInfo || {};
		s = m.section(form.NamedSection, 'config', 'zirgozar', _('LED color'));
		s.anonymous = true;
		o = s.option(form.Flag, 'led_enabled', _('LED color'), led.supported
			? _('Use URL test latency of the current connection. Disabled follows OpenWrt LED settings. Failed tests or a disconnected tunnel turn the indicator off.')
			: _('No supported dimmable RGB indicator was detected on this router.'));
		o.default = '0'; o.rmempty = false; o.readonly = !led.supported;
		if (led.supported) {
			var bounds = [ ['green', 200, _('Green below (ms)')], ['yellow', 300, _('Yellow below (ms)')], ['orange', 500, _('Orange below (ms)')], ['red', 0, _('Red')] ];
			bounds.forEach(function(b) {
				if (b[0] != 'red') {
					var v = s.option(form.Value, 'led_' + b[0] + '_ms', b[2]);
					v.default = String(b[1]); v.rmempty = false; v.datatype = 'range(1,60000)'; v.depends('led_enabled', '1');
					v.validate = function(sid) {
						var vals = bounds.slice(0, 3).map(function(x) {
							var opt = m.lookupOption('led_' + x[0] + '_ms', sid);
							return Number(opt && opt[0] ? opt[0].formvalue(sid) : x[1]);
						});
						return vals.every(function(n) { return Number.isInteger(n) && n >= 1 && n <= 60000; }) && vals[0] < vals[1] && vals[1] < vals[2]
							? true : _('LED thresholds must increase: green, yellow, orange.');
					};
				}
				var mode = s.option(form.ListValue, 'led_' + b[0] + '_mode', b[2] + ' — ' + _('Light mode'));
				mode.value('steady', _('Steady')); if (led.blink) mode.value('blink', _('Blinking'));
				mode.default = 'steady'; mode.rmempty = false; mode.depends('led_enabled', '1');
			});
		}

		var layout = pui.getMenuLayout();
		var select = E('select', { 'id': 'zgz-menu-layout' }, [
			E('option', { 'value': 'vertical', 'selected': layout === 'vertical' ? '' : null }, _('Vertical')),
			E('option', { 'value': 'horizontal', 'selected': layout === 'horizontal' ? '' : null }, _('Horizontal'))
		]);
		select.addEventListener('change', function() { pui.setMenuLayout(select.value); });

		var menu = pui.card(_('Apearance'), 'sliders', null, E('label', { 'class': 'mk-field' }, [
			E('span', {}, _('Menu layout')),
			select
		]));
		return m.render().then(function(mapEl) { return pui.page([ menu, mapEl ]); });
	}
});
