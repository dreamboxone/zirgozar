/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
'require baseclass';
'require form';
'require rpc';
'require zirgozar.i18n as i18n';
var _ = i18n.tr;
var callMaskCheck = rpc.declare({object: 'luci.zirgozar', method: 'action', params: ['name', 'arg'], expect: {'': {}}});

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
var maskTypes = {
	tcp: ['fragment', 'merge', 'filter', 'header-custom', 'sudoku', 'xmc'],
	udp: ['noise', 'salamander', 'sudoku', 'udphop', 'xdns', 'xicmp', 'realm', 'filter', 'header-custom', 'mkcp-legacy']
};
var maskDefaults = {
	fragment: {packets: 'tlshello', lengths: ['100-200'], delays: ['0-1']},
	merge: {times: 1, delayMs: 30, maxBytes: 16384},
	noise: {reset: '0', noise: [{rand: '16-32', delay: '0'}]}
};
var maskFields = {
	fragment: [['packets','Packets','text'], ['lengths','Fragment lengths','list'], ['delays','Fragment delays','list'], ['maxSplit','Maximum splits','text']],
	merge: [['times','Merge count','number',0], ['delayMs','Merge delay (ms)','number',0], ['maxBytes','Maximum buffered bytes','number',0]],
	salamander: [['password','Password','password']],
	udphop: [['mode','Hop mode','text'], ['interval','Hop interval (seconds)','text'], ['remoteIPs','Remote IPs','list'], ['remotePorts','Remote ports','text']],
	xicmp: [['dgram','Datagram socket','boolean'], ['ips','Remote IPs','list']]
};
var quicFields = [
	['congestion','Congestion control',['bbr','reno','brutal','force-brutal']],
	['bbrProfile','BBR profile',['conservative','standard','aggressive']],
	['brutalUp','Upload bandwidth','text'], ['brutalDown','Download bandwidth','text'],
	['initStreamReceiveWindow','Initial stream window (bytes)','number',16384],
	['maxStreamReceiveWindow','Maximum stream window (bytes)','number',16384],
	['initConnectionReceiveWindow','Initial connection window (bytes)','number',16384],
	['maxConnectionReceiveWindow','Maximum connection window (bytes)','number',16384],
	['maxIdleTimeout','Idle timeout (seconds)','number',4,120],
	['keepAlivePeriod','Keepalive interval (seconds)','number',2,60],
	['maxIncomingStreams','Maximum incoming streams','number',8],
	['disablePathMTUDiscovery','Disable path MTU discovery','boolean'],
	['disableGSO','Disable GSO','boolean'],
	['disableChromeParrot','Disable Chrome QUIC fingerprint','boolean'],
	['disableStatelessReset','Disable stateless reset','boolean'],
	['brutalDisableLossCompensation','Disable Brutal loss compensation','boolean']
];
function editMask(text, change) {
	if (!validate(text)) throw new Error(_('Expected a JSON object.'));
	var root = String(text || '').trim() ? JSON.parse(text) : {};
	change(root);
	return Object.keys(root).length ? JSON.stringify(root, null, 2) : '';
}
function coreCheck(value, patterniha) {
	if (!validate(value)) return Promise.reject(new Error(_('Expected a JSON object.')));
	if (!String(value || '').trim()) return Promise.resolve({ok:true});
	return callMaskCheck('finalmask_check', JSON.stringify({mask:JSON.parse(value), patterniha:!!patterniha})).then(function(result) {
		if (!result || !result.ok) {
			var message = _((result && result.error) || 'The selected core could not validate FinalMask.');
			var error = new Error(message);
			error.detail = result && result.detail;
			throw error;
		}
		return result;
	});
}
function maskEditor(option, section, box, initial) {
	var editor = E('div', {'class':'pwp-mask-editor'}), notice = E('p', {'class':'pwp-mask-notice','role':'status'});
	var diagnosticText=E('pre',{'class':'pwp-mask-notice'}), diagnostics=E('details',{'hidden':''},[E('summary',{},_('Core diagnostics')),diagnosticText]);
	var writing = false, errors = {}, fieldSequence = 0, rawBindings = [];
	var readonly = option.readonly != null ? option.readonly : !!(option.map && option.map.readonly);
	option._maskEditors = option._maskEditors || {};
	function read() { var field=option.getUIElement(section); return field ? field.getValue() : (initial || ''); }
	function write(root, redraw) {
		var field = option.getUIElement(section);
		if (!field) return;
		field.setValue(Object.keys(root).length ? JSON.stringify(root,null,2) : '');
		writing = true;
		var textarea = box.querySelector('textarea');
		if (textarea) ['input','change','blur'].forEach(function(t) { textarea.dispatchEvent(new Event(t,{bubbles:true})); });
		writing = false; notice.textContent = '';
		if (!redraw) rawBindings.forEach(function(binding) { binding.input.value=JSON.stringify(binding.read(root),null,2); });
		if (redraw) render();
	}
	function change(fn, redraw) { var root = String(read() || '').trim() ? JSON.parse(read()) : {}; fn(root); write(root,redraw); }
	function button(label, fn) { return E('button', {'type':'button','class':'btn cbi-button','disabled':readonly ? '' : null,'click':fn}, label); }
	function field(parent, spec, value, save) {
		var key=spec[0], kind=spec[2], input, errorKey='field'+(++fieldSequence);
		if (Array.isArray(kind) || kind == 'boolean') {
			var values = kind == 'boolean' ? ['true','false'] : kind;
			input = E('select', {'class':'cbi-input-select','aria-label':_(spec[1]),'disabled':readonly ? '' : null}, [E('option',{value:''},_('Default'))].concat(values.map(function(v) {
				return E('option',{value:v},kind == 'boolean' ? (v == 'true' ? _('On') : _('Off')) : v);
			})));
			input.value = value == null ? '' : String(value);
		} else {
			input = E('input', {'class':'cbi-input-text','aria-label':_(spec[1]),'disabled':readonly ? '' : null,'type':kind == 'number' ? 'number' : kind == 'password' ? 'password' : 'text',
				'value':value == null ? '' : Array.isArray(value) ? value.join(', ') : String(value),
				'min':spec[3] == null ? null : spec[3], 'max':spec[4] == null ? null : spec[4],
				'placeholder':kind == 'number' ? _('Default') : (key == 'brutalUp' || key == 'brutalDown') ? '10 mbps' : ''});
		}
		function apply() {
			try {
				if (input.checkValidity && !input.checkValidity()) throw new Error(input.validationMessage);
				var v = input.value.trim();
				if (v !== '') v = kind == 'number' ? Number(v) : kind == 'boolean' ? v == 'true' : kind == 'list' ? v.split(',').map(function(s) {return s.trim();}).filter(Boolean) : v;
				if (kind == 'number' && v !== '' && !Number.isSafeInteger(v)) throw new Error(_('Enter a whole number.'));
				delete errors[errorKey]; save(v === '' ? undefined : v);
			} catch(e) { errors[errorKey]=e.message; notice.textContent=e.message; }
		}
		input.addEventListener('input', apply);
		input.addEventListener('change', apply);
		parent.appendChild(E('label', {'class':'pwp-mask-field'}, [E('span',{},_(spec[1])),input]));
	}
	function rawSettings(parent, settings, save, errorKey, readSettings) {
		var raw = E('textarea', {'class':'cbi-input-textarea','rows':3,'readonly':readonly ? '' : null,'aria-label':_('Additional mask settings')}, JSON.stringify(settings,null,2));
		rawBindings.push({input:raw,read:readSettings});
		raw.addEventListener('change',function() {
			try { if (!validate(raw.value)) throw new Error(_('Expected a JSON object.')); delete errors[errorKey]; save(JSON.parse(raw.value)); }
			catch(e) { errors[errorKey]=e.message; notice.textContent=e.message; }
		});
		parent.appendChild(E('details',{},[E('summary',{},_('Additional mask settings')),raw]));
	}
	function render() {
		editor.textContent=''; errors={}; rawBindings=[];
		if (!validate(read())) { editor.appendChild(E('p',{},_('Correct the JSON to use the form.'))); return; }
		var root=String(read() || '').trim() ? JSON.parse(read()) : {};
		['tcp','udp'].forEach(function(family) {
			var list=root[family];
			if (list != null && !Array.isArray(list)) { editor.appendChild(E('p',{},_('Mask lists must be arrays.'))); return; }
			list=list || [];
			var body=E('div',{'class':'pwp-mask-list'});
			list.forEach(function(mask,index) {
				if (!mask || typeof mask != 'object' || Array.isArray(mask)) return;
				var row=E('div',{'class':'pwp-mask-row'}), type=E('select',{'class':'cbi-input-select','aria-label':_('Mask type'),'disabled':readonly ? '' : null},
					maskTypes[family].concat(maskTypes[family].indexOf(mask.type)<0 ? [mask.type] : []).map(function(t){return E('option',{value:t},t);}));
				type.value=mask.type;
				type.addEventListener('change',function(){change(function(r){r[family][index]={type:type.value,settings:JSON.parse(JSON.stringify(maskDefaults[type.value] || {}))};},true);});
				row.appendChild(E('div',{'class':'pwp-mask-row-head'},[type,button(_('Remove'),function(){change(function(r){r[family].splice(index,1);if(!r[family].length)delete r[family];},true);})]));
				var settings=mask.settings && typeof mask.settings == 'object' && !Array.isArray(mask.settings) ? mask.settings : {};
				var grid=E('div',{'class':'pwp-mask-grid'});
				(maskFields[mask.type] || []).forEach(function(spec){field(grid,spec,settings[spec[0]],function(v){change(function(r){var s=r[family][index].settings=r[family][index].settings || {};if(v===undefined)delete s[spec[0]];else s[spec[0]]=v;});});});
				row.appendChild(grid);
				if (mask.type == 'noise' && !settings.script) {
					field(grid,['reset','Noise reset','text'],settings.reset,function(v){change(function(r){var s=r[family][index].settings=r[family][index].settings || {};if(v===undefined)delete s.reset;else s.reset=v;});});
					var noises=Array.isArray(settings.noise) ? settings.noise : [];
					noises.forEach(function(item,n) {
						var noiseRow=E('div',{'class':'pwp-mask-grid'});
						[['rand','Random packet length','text'],['delay','Noise delay (ms)','text'],['packet','Packet data','text'],['type','Packet encoding',['str','hex','base64']]].forEach(function(spec) {
							field(noiseRow,spec,item[spec[0]],function(v){change(function(r){var target=r[family][index].settings.noise[n];if(v===undefined)delete target[spec[0]];else target[spec[0]]=v;});});
						});
						noiseRow.appendChild(button(_('Remove'),function(){change(function(r){r[family][index].settings.noise.splice(n,1);},true);})); row.appendChild(noiseRow);
					});
					row.appendChild(button(_('Add noise packet'),function(){change(function(r){var s=r[family][index].settings=r[family][index].settings || {};s.noise=s.noise || [];s.noise.push({rand:'16-32',delay:'0'});},true);}));
				}
				rawSettings(row,settings,function(s){change(function(r){r[family][index].settings=s;},true);},family+index,function(r){return r[family][index].settings || {};});
				body.appendChild(row);
			});
			body.appendChild(button(_('Add mask'),function(){change(function(r){var t=family=='tcp'?'fragment':'noise';r[family]=r[family] || [];r[family].push({type:t,settings:JSON.parse(JSON.stringify(maskDefaults[t]))});},true);}));
			editor.appendChild(E('details',{'open':list.length ? '' : null},[E('summary',{},family=='tcp'?_('TCP masks'):_('UDP masks')),body]));
		});
		var quic=root.quicParams;
		if (quic != null && (!quic || typeof quic != 'object' || Array.isArray(quic))) { editor.appendChild(E('p',{},_('Expected a JSON object.'))); return; }
		var grid=E('div',{'class':'pwp-mask-grid'});
		quicFields.forEach(function(spec){field(grid,spec,(quic || {})[spec[0]],function(v){change(function(r){r.quicParams=r.quicParams || {};if(v===undefined)delete r.quicParams[spec[0]];else r.quicParams[spec[0]]=v;if(!Object.keys(r.quicParams).length)delete r.quicParams;});});});
		editor.appendChild(E('details',{'open':quic ? '' : null},[E('summary',{},_('QUIC settings')),E('p',{},_('Empty fields use the core defaults. Some masks require matching server settings.')),grid]));
	}
	function check() {
		if (Object.keys(errors).length) return Promise.reject(new Error(errors[Object.keys(errors)[0]]));
		notice.textContent=_('Checking…');
		diagnostics.hidden=true;
		return coreCheck(read(),option.option == 'aether_exit_finalmask').then(function(r){notice.textContent=_('The selected core accepts these settings.');return r;},function(e){notice.textContent=e.message;diagnosticText.textContent=e.detail || '';diagnostics.hidden=!e.detail;throw e;});
	}
	option._maskEditors[section]={check:check,error:function(){return errors[Object.keys(errors)[0]];}};
	box.addEventListener('input',function(){if(!writing){notice.textContent='';render();}});
	render();
	return E('div',{},[editor,button(_('Check core compatibility'),function(){check().catch(function(){});}),notice,diagnostics]);
}
function withFinalMask(option) {
	var parse=option.parse;
	option.validate = function(section, value) { return (this._maskEditors && this._maskEditors[section] && this._maskEditors[section].error()) || validate(value) || _('Expected a JSON object.'); };
	if (typeof parse == 'function') option.parse=function(section) {
		var self=this,args=arguments;
		if (!self.isActive(section)) return parse.apply(self,args);
		var editor=self._maskEditors && self._maskEditors[section];
		var checked=editor ? editor.check() : coreCheck(self.formvalue(section),self.option == 'aether_exit_finalmask');
		return checked.then(function(){return parse.apply(self,args);});
	};
	option.renderWidget = function(section, index, value) {
		var self = this, box = form.TextValue.prototype.renderWidget.call(this, section, index, value);
		var picker = E('select', { 'class': 'cbi-input-select', 'aria-label': _('FinalMask preset'), 'disabled':(self.readonly != null ? self.readonly : !!(self.map && self.map.readonly)) ? '' : null },
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
		return E('div', {'class':'pwp-finalmask'}, [ picker, maskEditor(self,section,box,value), E('details',{},[E('summary',{},_('FinalMask JSON')),box]) ]);
	};
	return option;
}
function withDialMode(option) {
	option.value('', _('Default'));
	option.description = _('Empty uses the core default. Custom dialMode names require a core that implements them.');
	option.validate = function(section, value) {
		if (!value) return true;
		if (value.length > 64) return _('Invalid dialMode name.');
		if (value.indexOf('oob.') == 0)
			return value.slice(4).split(',').every(function(step) {
				return step == '_' || (/^\d+$/.test(step) && Number(step) <= 255);
			}) || _('Invalid dialMode name.');
		return /^[A-Za-z0-9._-]+$/.test(value) || _('Invalid dialMode name.');
	};
	option.value('oob.0,_,12', 'oob.0,_,12');
	return option;
}
return baseclass.extend({ finalMasks: finalMasks, identify: identify, validate: validate, editMask: editMask, coreCheck: coreCheck, withFinalMask: withFinalMask, withDialMode: withDialMode });
