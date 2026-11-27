/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
'require view';
'require form';
'require rpc';
'require ui';
'require uci';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';
'require zirgozar.connectionchecks as checksites';

var _ = i18n.tr;
var callLed = rpc.declare({ object: 'luci.zirgozar', method: 'led', expect: { '': {} } });
var callAction = rpc.declare({ object: 'luci.zirgozar', method: 'action',
	params: [ 'name', 'arg' ], expect: { '': {} } });

function ledRuleFields(value, canBlink, readonly, update) {
	var colors = {
		green: _('Green'), yellow: _('Yellow'), orange: _('Orange'),
		red: _('Red'), blue: _('Blue'), white: _('White')
	};
	var modes = { steady: _('Steady'), blink: _('Blinking') };
	var rules = String(value || '').split(/\s+/).map(function(item) { return item.split(':'); })
		.filter(function(rule) { return rule.length === 5; });
	var lower = number(), upper = number(), rate = number();
	var color = choices(colors), mode = choices(canBlink ? modes : { steady: modes.steady });
	var titles = [ _('Light color'), _('Minimum ping (ms)'), _('Maximum ping (ms)'),
		_('Light mode'), _('Blinks per minute') ];
	var rateField = field(titles[4], rate);
	var list = E('tbody', {});
	var table = E('div', { 'class': 'zgz-led-rules' }, E('table', {}, [
		E('thead', {}, E('tr', {}, titles.concat(_('Remove')).map(function(title) {
			return E('th', { 'scope': 'col' }, title);
		}))),
		list
	]));
	var error = E('p', { 'class': 'zgz-led-error', 'role': 'alert', 'hidden': '' });

	function number() {
		return E('input', { 'type': 'text', 'inputmode': 'numeric', 'dir': 'ltr',
			'disabled': readonly ? '' : null });
	}

	function readNumber(input) {
		var digits = input.value.trim().replace(/[۰-۹٠-٩]/g, function(digit) {
			return String(digit.charCodeAt(0) & 15);
		});
		return /^\d+$/.test(digits) ? Number(digits) : NaN;
	}

	function choices(values) {
		return E('select', { 'disabled': readonly ? '' : null }, [
			E('option', { 'value': '', 'disabled': '', 'selected': '' }, '—')
		].concat(Object.keys(values).map(function(key) {
			return E('option', { 'value': key }, values[key]);
		})));
	}

	function field(label, control) {
		return E('label', { 'class': 'zgz-led-field' }, [ E('span', {}, label), control ]);
	}

	function message(text) {
		error.textContent = text || '';
		error.hidden = !text;
	}

	function refresh() {
		list.replaceChildren();
		table.hidden = !rules.length;
		rules.forEach(function(rule, index) {
			var remove = E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-remove',
				'disabled': readonly ? '' : null }, _('Remove'));
			remove.addEventListener('click', function() {
				rules.splice(index, 1);
				changed();
			});
			var values = [ colors[rule[2]], String(rule[0]), String(rule[1]), modes[rule[3]],
				rule[3] === 'blink' ? String(rule[4]) : '—', remove ];
			list.appendChild(E('tr', {}, values.map(function(value) { return E('td', {}, value); })));
		});
	}

	function changed() {
		rules.sort(function(a, b) { return Number(a[0]) - Number(b[0]); });
		update(rules.map(function(rule) { return rule.join(':'); }).join(' ') || 'none');
		message();
		refresh();
	}

	mode.addEventListener('change', function() { rateField.hidden = mode.value !== 'blink'; });
	rateField.hidden = true;
	rate.value = '20';
	var add = E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-add',
		'disabled': readonly ? '' : null }, _('Add'));
	add.addEventListener('click', function() {
		if (readonly) return;
		var min = readNumber(lower), max = readNumber(upper);
		if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 60000 || min > max) {
			message(_('Enter a valid ping range from 1 to 60000 ms.'));
			return;
		}
		if (!color.value || !mode.value) {
			message(_('Select a light color and mode.'));
			return;
		}
		var blinks = mode.value === 'blink' ? readNumber(rate) : 0;
		if (mode.value === 'blink' && (!Number.isInteger(blinks) || blinks < 1 || blinks > 600)) {
			message(_('Enter 1 to 600 blinks per minute.'));
			return;
		}
		if (rules.some(function(rule) { return min <= Number(rule[1]) && max >= Number(rule[0]); })) {
			message(_('This ping range overlaps an existing rule.'));
			return;
		}
		rules.push([ min, max, color.value, mode.value, blinks ]);
		changed();
		lower.value = upper.value = color.value = mode.value = '';
		rate.value = '20';
		rateField.hidden = true;
		lower.focus();
	});

	refresh();
	return E('div', { 'class': 'zgz-led-editor' }, [ E('div', { 'class': 'zgz-led-fields' }, [
		field(titles[0], color), field(titles[1], lower), field(titles[2], upper),
		field(titles[3], mode), rateField
	]), E('div', { 'class': 'zgz-led-actions' }, add), error, table ]);
}

return view.extend({
	__init__: function() { return pui.mount(this); },

	load: function() {
		return Promise.all([
			callLed().catch(function() { return {}; }),
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
		o.widget = 'checkbox'; o.orientation = 'vertical';
		var loadSites = o.load;
		o.load = function(section) {
			var self = this;
			self.keylist = []; self.vallist = [];
			checksites.entries(uci.get('zirgozar', section, 'connection_check_custom_title'),
				uci.get('zirgozar', section, 'connection_check_custom_url')).forEach(function(site) {
				self.value(site.id, site.id === 'custom' ? site.name : _(site.name));
			});
			return loadSites.call(self, section);
		};
		o.cfgvalue = function(section) {
			return checksites.selected(uci.get('zirgozar', section, this.option),
				uci.get('zirgozar', section, 'connection_check_custom_title'),
				uci.get('zirgozar', section, 'connection_check_custom_url')).map(function(site) { return site.id; });
		};
		o.validate = function(section, value) { return !value || (Array.isArray(value) ? value : String(value).split(/\s+/)).length <= 4 || _('Select up to four sites.'); };
		o.write = function(section, value) { uci.set('zirgozar', section, this.option, Array.isArray(value) && value.length ? value.join(' ') : 'none'); };
		o.remove = function(section) { this.write(section, []); };
		o.renderWidget = function(section, index, value) {
			var readonly = this.readonly != null ? this.readonly : this.map.readonly;
			var control = new ui.Select(value || [], this.transformChoices(), {
				id: this.cbid(section), sort: this.keylist, multiple: true, widget: 'checkbox',
				orientation: 'vertical', optional: true, validate: this.getValidator(section), disabled: readonly
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

		var titleField = s.option(form.Value, 'connection_check_custom_title', _('Custom site title'));
		var urlField = s.option(form.Value, 'connection_check_custom_url', _('Custom site URL'),
			_('Custom sites use the Zirgozar logo.'));
		titleField.validate = function(section, value) {
			return !String(value || '').trim() ||
				!!checksites.normalizeUrl(urlField.formvalue(section)) || _('Enter a valid HTTP or HTTPS URL.');
		};
		urlField.validate = function(section, value) {
			if (!String(value || '').trim()) return true;
			if (!checksites.normalizeUrl(value)) return _('Enter a valid HTTP or HTTPS URL.');
			return !!String(titleField.formvalue(section) || '').trim() || _('Enter a title for the custom site.');
		};
		var sitesField = o;
		var addSite = s.option(form.DummyValue, '_add_check_site', '');
		addSite.renderWidget = function(section) {
			var readonly = this.readonly != null ? this.readonly : this.map.readonly;
			var button = E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-add',
				'disabled': readonly ? '' : null }, _('Add'));
			button.addEventListener('click', function() {
				var title = String(titleField.formvalue(section) || '').trim();
				var url = checksites.normalizeUrl(urlField.formvalue(section));
				if (!title || !url) {
					ui.addNotification(null, E('p', {}, title ? _('Enter a valid HTTP or HTTPS URL.') :
						_('Enter a title for the custom site.')), 'error');
					return;
				}
				button.disabled = true;
				pendingSiteSave = pendingSiteSave.then(function() {
					return callAction('check_site_custom', JSON.stringify({ title: title, url: url }));
				}).then(function(result) {
					if (!result || !result.ok) throw new Error();
					uci.set('zirgozar', section, 'connection_check_custom_title', title);
					uci.set('zirgozar', section, 'connection_check_custom_url', url);
					return sitesField.load(section);
				}).then(function() {
					var widget = document.getElementById(sitesField.cbid(section));
					if (widget) widget.replaceWith(sitesField.renderWidget(section, 0, sitesField.cfgvalue(section)));
				}).catch(function() {
					ui.addNotification(null, E('p', {}, _('Could not save settings.')), 'error');
				}).finally(function() { button.disabled = false; });
			});
			return button;
		};

		var led = ledInfo || {};
		var ledTitle = _('Router LED settings');
		var ledHelp = led.supported
			? _('Add a rule with a ping range, a color, and a steady or blinking mode. For blinking, set the number of blinks per minute.') + ' ' +
				_('Ping limits are inclusive. Unmatched pings and failed tests show steady red. Disabled follows OpenWrt LED settings.')
			: _('No supported dimmable RGB indicator was detected on this router.');
		s = m.section(form.NamedSection, 'config', 'zirgozar', ledTitle);
		s.anonymous = true;
		var internetTitle = _('Router internet outage indicator');
		o = s.option(form.DummyValue, '_led_outage', internetTitle,
			_('Checks the router’s internet link every 15 seconds. When access is lost, the light glows steady burgundy. After recovery it returns to its usual behavior.'));
		o.renderWidget = function(section) {
			var enabled = led.outage_enabled === true;
			var readonly = this.readonly != null ? this.readonly : this.map.readonly;
			var toggle = E('input', { 'type': 'checkbox', 'role': 'switch', 'class': 'mk-switch',
				'data-widget-id': 'widget.' + this.cbid(section), 'aria-label': internetTitle,
				'checked': enabled ? '' : null, 'disabled': led.supported && !readonly ? null : '' });
			toggle.addEventListener('change', function() {
				var requested = toggle.checked;
				toggle.disabled = true;
				callAction('led_outage', requested ? '1' : '0').then(function(result) {
					if (!result || !result.ok) throw new Error();
					enabled = requested;
				}).catch(function() {
					ui.addNotification(null, E('p', {}, _('Could not save settings.')), 'error');
					return callLed().then(function(state) {
						enabled = state && state.outage_enabled === true;
					}).catch(function() {});
				}).finally(function() {
					led.outage_enabled = enabled;
					toggle.checked = enabled;
					toggle.disabled = false;
				});
			});
			return toggle;
		};
		var pingLedTitle = _('Show router light based on ping');
		o = s.option(form.Flag, 'led_enabled', pingLedTitle);
		o.default = '0'; o.rmempty = false; o.readonly = !led.supported;
		if (led.supported) {
			o = s.option(form.Value, 'led_rules', _('LED rules'));
			o.default = 'none'; o.rmempty = false; o.retain = true; o.depends('led_enabled', '1');
			o.renderWidget = function(section, index, value) {
				var readonly = this.readonly != null ? this.readonly : this.map.readonly;
				var control = new ui.Textfield(value || 'none', { id: this.cbid(section), disabled: readonly });
				var widget = control.render();
				var input = widget.querySelector('input');
				input.type = 'hidden';
				var editor = ledRuleFields(value, led.blink, readonly, function(next) {
					control.setValue(next);
					input.dispatchEvent(new Event('change', { bubbles: true }));
				});
				return E('div', {}, [ widget, editor ]);
			};
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
		var renderContents = m.renderContents;
		m.renderContents = function() { return renderContents.call(m).then(function(mapEl) {
			var sites = mapEl.querySelector('[data-field="cbid.zirgozar.config.connection_check_sites"]');
			var checkSettings = sites && sites.closest('.cbi-section');
			if (checkSettings) {
				checkSettings.id = 'zgz-connection-check-settings';
			}
			var row = mapEl.querySelector('[data-field="cbid.zirgozar.config.led_enabled"]');
			var heading = row && row.closest('.cbi-section').querySelector('h3');
			if (heading) {
				heading.classList.add('zgz-led-heading');
				heading.after(E('div', { 'class': 'cbi-value-description zgz-section-help' }, ledHelp));
			}
			var toggle = row && row.querySelector('input[type="checkbox"]');
			if (toggle) toggle.setAttribute('aria-label', pingLedTitle);
			return mapEl;
		}); };
		return m.render().then(function(mapEl) { return pui.page([ menu, mapEl ]); });
	}
});
