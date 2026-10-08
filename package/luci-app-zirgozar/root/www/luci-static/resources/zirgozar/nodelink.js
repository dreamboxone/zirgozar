/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * A node given as a link or as a whole file: the name it carries, and the
 * Browse button that puts a file's text in the box. Node List's edit window
 * and the Node Config page's "new config" both take nodes this way.
 */

'use strict';
'require baseclass';
'require form';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';

var _ = i18n.tr;

/* --------------------------------------------------- the name in the link

   Practically every share link ends in #something, and that something is the
   name whoever published it gave the node. A reader who pastes a link and
   leaves the name box empty meant that name, so there is no reason to make
   them type it a second time.

   It is percent-encoded UTF-8, so a Persian name arrives as %D8%B9%D9%84%DB%8C
   and has to be decoded rather than shown as it stands. Some links are not
   encoded at all and carry the characters directly; decodeURIComponent throws
   on those, which is what the catch is for. */
function decodeName(s) {
	s = String(s || '');
	if (!s) return '';
	try { s = decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { /* raw already */ }
	s = s.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
	if (s.length > 60) s = s.slice(0, 60).trim();
	return s;
}

/* vmess is the one that hides its name in the middle rather than at the end:
   the whole link is one base64 object and the name is its "ps" field. atob
   hands back bytes, so a non-English name has to be read back as UTF-8 or it
   comes out as one wrong character per byte. */
function vmessName(link) {
	try {
		var b = link.replace(/^vmess:\/\//i, '').replace(/[#?].*$/, '')
		            .replace(/-/g, '+').replace(/_/g, '/');
		while (b.length % 4) b += '=';
		var raw = atob(b), bytes = new Uint8Array(raw.length);
		for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
		var o = JSON.parse(new TextDecoder('utf-8').decode(bytes));
		return decodeName(o.ps || o.remarks || '');
	} catch (e) {
		return '';
	}
}

function nameFromLink(text) {
	/* By line, not by whitespace: names have spaces in them, and splitting on
	   every space would take “سرور خانه” down to “سرور”. Only a second link
	   on the same line ends the first one's name. */
	var lines = String(text || '').split(/[\r\n]+/);
	/* A WireGuard .conf: the comment a provider puts first, or else the
	   host of its endpoint. */
	if (/^\s*\[(interface|peer)\]/im.test(String(text || ''))) {
		for (var c = 0; c < lines.length; c++) {
			var cm = lines[c].match(/^\s*[#;]\s*(.+?)\s*$/);
			if (cm) return cm[1];
		}
		var ep = String(text).match(/^\s*endpoint\s*=\s*\[?([^\]\s:]+)/im);
		return ep ? ep[1] : '';
	}
	/* An OpenVPN profile: the comment it opens with, or else its first remote. */
	if (/^\s*(client\s*$|remote\s+\S+|<ca>)/im.test(String(text || ''))) {
		for (var o = 0; o < lines.length; o++) {
			var om = lines[o].match(/^\s*[#;]\s*(.+?)\s*$/);
			if (om) return om[1];
		}
		var rm = String(text).match(/^\s*remote\s+(\S+)/im);
		return rm ? rm[1] : '';
	}
	for (var i = 0; i < lines.length; i++) {
		var l = lines[i].trim(), name = '';
		if (l.indexOf('://') < 0) continue;
		var h = l.indexOf('#');
		if (h >= 0) {
			name = l.slice(h + 1);
			var m = name.match(/\s+[a-z][a-z0-9+.-]*:\/\//i);
			if (m) name = name.slice(0, m.index);
			name = decodeName(name);
		} else if (/^vmess:\/\//i.test(l)) {
			name = vmessName(l.split(/\s+/)[0]);
		}
		if (name) return name;
	}
	return '';
}

/* ------------------------------------------------------------ give a file

   A WireGuard .conf and an Xray or sing-box configuration both arrive as
   files, not as a line of text, and asking somebody to open one in an editor
   and copy it out is asking them to do by hand what the browser will do for
   nothing.

   The file is read in the browser and its text goes into the box. It is never
   uploaded anywhere, and what gets saved is the same text as if it had been
   typed - so everything downstream, the parser included, sees exactly what it
   saw before and none of it had to learn about files. */
function withBrowse(o, hint) {
	o.renderWidget = function(section_id, option_index, cfgvalue) {
		var self = this;
		var box = form.TextValue.prototype.renderWidget.apply(this,
			[ section_id, option_index, cfgvalue ]);

		var picker = E('input', {
			'type': 'file',
			'accept': '.conf,.ovpn,.txt,.json,.yaml,.yml,text/plain',
			'style': 'display:none',
			'change': function(ev) {
				var f = ev.target.files && ev.target.files[0];
				if (!f) return;
				var reader = new FileReader();
				reader.onload = function() {
					var el = self.getUIElement(section_id);
					if (el) el.setValue(String(reader.result || '').trim());
					/* setValue puts the text in without telling anyone, so the
					   box went on counting as empty: LuCI had checked it once,
					   when it was empty, and never again - which is why the
					   Save button did nothing and said nothing. The events it
					   listens for are sent by hand. */
					var ta = box.querySelector('textarea');
					if (ta) {
						['input', 'keyup', 'change', 'blur'].forEach(function(t) {
							ta.dispatchEvent(new Event(t, { bubbles: true }));
						});
					}
				};
				reader.onerror = function() {
					pui.note(browse, _('That file could not be read.'), 'error');
				};
				reader.readAsText(f);
				/* So that choosing the same file twice in a row still fires
				   a change. */
				ev.target.value = '';
			}
		});

		var browse = E('button', {
			'class': 'btn cbi-button',
			'click': function(ev) { ev.preventDefault(); picker.click(); }
		}, _('Browse…'));

		return E([ box, E('div', { 'style': 'margin-top:6px' }, [
			browse,
			E('span', { 'style': 'margin-inline-start:8px;font-size:12px;opacity:.65' }, hint),
			picker
		]) ]);
	};
	return o;
}

return baseclass.extend({
	nameFromLink: nameFromLink,
	withBrowse: withBrowse
});
