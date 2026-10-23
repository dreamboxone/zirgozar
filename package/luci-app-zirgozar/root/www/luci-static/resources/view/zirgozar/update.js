/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * App Update: this program's version and the
 * latest one published, each core with its version, a Check update and a
 * Reinstall, and where each core lives. The routing data is here too -
 * The rule files are kept beside the cores.
 */

'use strict';
'require view';
'require form';
'require rpc';
'require poll';
'require ui';
'require uci';
'require zirgozar.i18n as i18n';
'require zirgozar.ui as pui';

var _ = i18n.tr;

var callSystem = rpc.declare({ object: 'luci.zirgozar', method: 'system', expect: { '': {} } });
var callAction = rpc.declare({ object: 'luci.zirgozar', method: 'action',
                               params: [ 'name', 'arg' ], expect: { '': {} } });

/* Sizes in the page's language - see ui.js. */
function bytes(n) {
	return pui.bytes(n);
}

/* This program's version on its own row, short: "5.7.20-7" in Persian - the
   release, then its revision on its right - with no word before it, and as
   everywhere else in English. Kept left to right inside the Persian text, so
   that the revision stays on the right. */
function appVersion(v) {
	if (!v) return '';
	if (i18n.get() !== 'fa') return ltr(String(v).replace(/^v/i, ''));
	var m = /^(.*?)-r(\d+)$/.exec(String(v));
	return '\u2066' + (m ? m[1] + '-' + m[2] : v + '-1') + '\u2069';
}

function chip(text, tone) {
	return E('span', { 'class': 'mk-chip ' + (tone || '') }, text);
}

/* A version left to right whatever the page's direction: "1.14.3-lx.16" in
   a Persian line otherwise came out as "lx.16-1.14.3". */
function ltr(t) {
	return '\u2066' + t + '\u2069';
}

/* Keep the version badge sized to its text. */
function verChip(text, tone) {
	var c = chip(text, tone);
	c.style.cssText = 'width:max-content;flex:0 0 auto;justify-content:center;box-sizing:border-box';
	return c;
}

function verState(node) {
	return E('span', { 'style': 'display:inline-flex;align-items:center;min-width:118px' }, node || '');
}

/* What a button said, kept by row. The rows are drawn afresh every few
   seconds, and a message put beside a button would go with it - so it is
   kept here and drawn again under its row each time. */
var notes = {};

/* How far the running download has got, for the row it belongs to. */
var progressKey = '', progressPct = -1, progressJob = '';
var progressPhase = '', phaseJob = '';

function downloadText(name) {
	var key = 'Downloading %s:', text = _(key);
	if (i18n.get() === 'fa' && text === key) text = 'در حال دانلود %s:';
	name = String(name).trim().replace(/^(?:Installing|Updating)\s+/i, '').replace(/^xray$/i, 'Xray');
	return text.format(name === 'Zirgozar' && i18n.get() === 'fa' ? 'زیرگذر' : ltr(name));
}

function noteFor(key) {
	var n = key && notes[key];
	var active = key && key == progressKey && progressJob;
	if (active && (!n || n.kind == 'info'))
		n = { text: progressPhase == 'installing' ? jobName(progressJob) : downloadText(progressJob.replace(/^Installing /, '')), kind: 'info' };
	var going = key && key == progressKey && progressPct >= 0;
	/* A download keeps its note while it runs, however long it takes. */
	if (n && going && n.until) n.until = Date.now() + 15000;
	if (!n || (n.until && Date.now() > n.until)) return '';
	return E('div', { 'class': 'pwp-note ' + n.kind, 'style': 'margin:0;display:flex;gap:6px;align-items:center', 'dir': i18n.dir() },
		going && n.kind == 'info' ? [ E('span', {}, n.text), E('bdi', { 'dir': 'ltr' }, progressPct + '%') ] : n.text);
}

function say(key, text, kind) {
	kind = kind || 'info';
	notes[key] = { text: text, kind: kind,
	               until: (kind == 'warn' || kind == 'error') ? 0 : Date.now() + 15000 };
	var box = document.querySelector('[data-note="' + key + '"]');
	if (box) {
		while (box.firstChild) box.removeChild(box.firstChild);
		var n = noteFor(key);
		if (n) box.appendChild(n);
	}
}

function row(label, value, action, key) {
	return E('div', {
		'class': key && key.indexOf('core:') === 0 ? 'pwp-core-update-row' : '',
		'style': 'display:flex;gap:12px;align-items:center;padding:10px 0;flex-wrap:wrap;' +
		         'border-bottom:1px solid var(--line)'
	}, [
		E('div', { 'style': 'flex:0 0 150px;font-weight:800;font-size:14px' }, label),
		E('div', { 'style': 'flex:1 1 220px;font-size:13px;display:flex;gap:8px;' +
		                    'align-items:center;flex-wrap:wrap' }, value),
		E('div', { 'style': 'flex:0 0 auto;display:flex;gap:6px;flex-wrap:wrap' }, action || []),
		key ? E('div', { 'data-note': key, 'style': 'flex:1 1 100%' }, noteFor(key)) : ''
	]);
}

/* The router's web services restart while this program is installed, and
   for those seconds a request to it is not found or cut off. That is the
   update under way, not a failure: the page reloads itself when it is done. */
function restarting(e) {
	return /Object not found|-32000|XHR request (timed out|aborted)|NetworkError|Failed to fetch/i.test(String(e && e.message || e));
}

/* An install, an update or a removal under way. The buttons that start one
   are off the moment one is pressed, all of them - two at once would fight
   over the same files - and stay off until the router says it is done. The
   router's own word for it is its job; until that is first seen, the press
   itself stands for it. */
var actAsked = 0, actKey = '';
/* The Xray version chosen in the list, kept across the redraws. */
var xrayPicked = '';

function working(d) {
	return !!(d && d.job && d.job.indexOf(CHECK_JOB) !== 0) || (actAsked && Date.now() - actAsked < 8000);
}

/* The row a running job belongs to. */
function jobKey(j) {
	var m = /^Installing (.+)$/.exec(j || '');
	if (m) return m[1] == 'dependencies' ? 'deps' : 'core:' + m[1];
	if (j == 'Updating Zirgozar') return 'app';
	return '';
}

function holdButtons(key) {
	document.querySelectorAll('button.zgz-act').forEach(function(b) {
		b.disabled = true;
		b.zgzBusy = true;
		if (b.dataset.key == key && b.dataset.icon != 'trash') b.classList.add('mk-running');
	});
}

/* A button that starts something; drawn off while anything is running. */
function actBtn(text, tone, key, fn, ico, d) {
	var b = pui.btn(text, tone, fn, ico);
	b.classList.add('zgz-act');
	b.dataset.key = key;
	b.dataset.icon = ico || '';
	if (working(d)) {
		b.disabled = true;
		b.zgzBusy = true;
		if (ico != 'trash' && key == (jobKey(d && d.job) || actKey)) b.classList.add('mk-running');
	}
	return b;
}

function act(key, name, arg, note) {
	actAsked = Date.now();
	actKey = key;
	phaseJob = ''; progressPhase = '';
	if (key == 'deps') lastDeps = '';
	holdButtons(key);
	return callAction(name, arg || '').then(function(r) {
		if (r && r.error) { actAsked = 0; say(key, _(r.error), 'error'); }
		else if (note) say(key, note, 'info');
		/* A removal is done by the time the answer comes. */
		if (name == 'core_remove') actAsked = 0;
	}).catch(function(e) {
		if (restarting(e))
			say(key, name == 'app_update' ? note : _('The router’s services are restarting. Try again in a few seconds.'), 'info');
		else {
			actAsked = 0;
			say(key, String(e && e.message || e), 'error');
		}
	}).then(function() { return refreshNow(); });
}

/* Checking for new versions says so in one place only: the Check update
   buttons turn until the router has an answer. The rows are drawn afresh
   every few seconds, so the turning is drawn from this, not kept on a button;
   and the job may not have begun yet when the next drawing comes. */
var CHECK_JOB = 'Checking for new versions';
var checkAsked = 0, checkKey = '';
var refreshNow = function() {};
var quickRefresh = 0;

function checking(d, key) {
	var job = d && d.job || '';
	var target = job.indexOf(CHECK_JOB + ': ') === 0 ? job.slice(CHECK_JOB.length + 2) : '';
	var selected = key === 'app' ? 'zirgozar' : String(key || '').replace(/^core:/, '');
	var allCores = target === 'all-cores' || (!target && checkKey === 'all-cores');
	return (job.indexOf(CHECK_JOB) === 0 && (!key || (allCores ? key !== 'app' : (target ? target === selected : key === checkKey)))) ||
		(checkAsked && Date.now() - checkAsked < 5000 && (!key || key === checkKey || (checkKey === 'all-cores' && key !== 'app')));
}

function checkUpdate(key) {
	return function() {
		checkAsked = Date.now();
		checkKey = key;
		return callAction('cores_latest', key === 'app' ? 'zirgozar' : key.replace(/^core:/, '')).then(function(r) {
			if (r && r.error) {
				checkAsked = 0;
				say(key, _(r.error), 'error');
			}
		}).catch(function(e) {
			checkAsked = 0;
			say(key, String(e && e.message || e), 'error');
		}).then(function() { return refreshNow(); });
	};
}

function checkBtn(tone, key, busy, label) {
	var b = pui.btn(label || _('Check'), tone + ' mk-small', checkUpdate(key), 'refresh');
	if (busy) {
		b.classList.add('mk-running');
		b.disabled = true;
	}
	return b;
}

/* The version the page was opened with, and the last update result seen. */
var firstVersion = '';
var lastSelf = '';
var lastCore = '';
var lastDeps = '';


/* An install the router stopped because the flash or memory it was going to
   land on was too full - said under its own row, so the reader knows why
   nothing changed. The router says how much was needed when it knows. */
function noRoom(need, free) {
	need = +need; free = +free;
	return need > 0
		? _('Not enough free space on the router: %s needed, %s free. Nothing was installed.').format(pui.bytes(need), pui.bytes(free))
		: _('Not enough free space on the router: %s free. Nothing was installed.').format(pui.bytes(free));
}

/* What the router says it is busy with, in the page's language. */
function jobName(j) {
	if (j === 'Updating Zirgozar')
		return _('Installing %s').format(i18n.get() === 'fa' ? 'زیرگذر' : 'Zirgozar');
	var m = /^Installing (.+)$/.exec(j);
	if (m && m[1] != 'dependencies') return _('Installing %s').format(m[1]);
	return _(j);
}

function yes() { return chip(_('yes'), 'ok'); }
function no()  { return chip(_('no'), 'error'); }

/* What the router can actually do - moved here from the settings, because
   what it answers is a list of things to install. */
var depsOpen = null;

function renderDeps(deps, state) {
	deps = deps || {};
	var can = deps.can || {};
	var box = document.getElementById('zgz-deps');
	if (!box) return;
	while (box.firstChild) box.removeChild(box.firstChild);
	/* The router is still finding out; it has been asked already. */
	if (deps.pending) {
		box.appendChild(E('p', { 'class': 'mk-muted', 'style': 'margin:0' }, _('Waiting for the router…')));
		return;
	}

	/* One line when everything is there; the details open by themselves
	   when something is missing, and otherwise only when asked for. */
	var missing = deps.missing || [];
	var fw = deps.backend == 'nft' ? 'nftables' : deps.backend == 'ipt' ? 'iptables' : '';
	var lacks = (can.tproxy ? 0 : 1) + (can.policy_routing ? 0 : 1) + (can.https ? 0 : 1) +
	            (fw ? 0 : 1) + (missing.length ? 1 : 0);
	var open = depsOpen != null ? depsOpen : lacks > 0;
	box.appendChild(E('div', { 'style': 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [
		lacks ? chip(_('%d missing').format(lacks), 'error') : chip(_('Everything is ready'), 'ok'),
		fw ? E('span', { 'style': 'font-size:12.5px;color:var(--muted)' }, _('Firewall in use') + ': ' + fw) : '',
		E('span', { 'style': 'flex:1' }),
		pui.btn(open ? _('Hide details') : _('Details'), 'soft-blue mk-small', function() {
			depsOpen = !open;
			renderDeps(deps, state);
		}, open ? 'chevron-up' : 'chevron-down')
	]));
	if (!open) return;
	var dbox = E('div', { 'style': 'margin-top:8px' });
	box.appendChild(dbox);
	var httpsErrors = {
		5: _('The HTTPS check could not resolve the proxy hostname.'),
		6: _('The HTTPS check could not resolve the download hostname. Check the router DNS.'),
		7: _('The HTTPS check could not connect to the download server.'),
		22: _('The download server returned an HTTP error. Check the HTTPS probe URL.'),
		28: _('The HTTPS check timed out. Check access to the download server.'),
		35: _('The HTTPS TLS handshake failed.'),
		60: _('The HTTPS certificate could not be verified. Check CA certificates and the router clock.'),
		77: _('The HTTPS CA certificate file is missing or unreadable.'),
		127: _('curl is unavailable. Install the missing packages.')
	};
	dbox.appendChild(E('p', { 'style': 'font-size:12px;color:var(--muted);margin:0 0 4px' },
		_('These are questions put to the running system, not a list of package names. A package can be installed and the thing it provides still not work.')));
	dbox.appendChild(row(_('Transparent proxy'),
		[ can.tproxy ? yes() : no(),
		  E('span', { 'style': 'color:var(--muted)' },
		    can.tproxy ? _('the kernel can redirect traffic')
		               : _('the kernel module for this is missing — nothing will be tunnelled')) ]));
	dbox.appendChild(row(_('Policy routing'),
		[ can.policy_routing ? yes() : no(),
		  E('span', { 'style': 'color:var(--muted)' },
		    can.policy_routing ? _('the full ip command is installed')
		                       : _('busybox ip cannot add the route this needs — install ip-full')) ]));
	dbox.appendChild(row(_('HTTPS'),
		[ can.https ? yes() : no(),
		  E('span', { 'style': 'color:var(--muted)' },
		    can.https ? _('the router can fetch over HTTPS')
		              : (httpsErrors[deps.https_code] || _('The HTTPS download check failed. This does not establish that all downloads are blocked.'))) ]));
	dbox.appendChild(row(_('Firewall in use'),
		[ E('span', {}, deps.backend == 'nft' ? 'nftables'
		              : deps.backend == 'ipt' ? 'iptables' : _('none found')) ]));
	dbox.appendChild(row(_('Packages'),
		missing.length
			? [ chip(_('%d missing').format(missing.length), 'warn'),
			    E('code', {}, missing.join(' ')) ]
			: [ yes(), E('span', { 'style': 'color:var(--muted)' }, _('everything needed is installed')) ],
		missing.length
			? [ actBtn(_('Install'), 'primary mk-small', 'deps', function() {
					return act('deps', 'deps_install', '', _('Installing. This needs a working connection and may take a minute.'));
				}, 'download', state) ]
			: [], 'deps'));
}

/* The page is drawn whole the moment it opens, from what the router said
   the last time it was opened here - or, the very first time, with every row
   in place and its version still to come - and filled in when the router
   answers. Waiting for the answer left three empty cards on the screen. */
var KEPT = 'zirgozar.update.last';
var CORE_NAMES = [ 'xray', 'xray-patterniha', 'sing-box', 'sing-box-lx',
                   'geoview', 'warp-plus', 'vwarp', 'aether', 'mihomo', 'sslocal', 'openvpn', 'haproxy' ];

var answered = false;

function keep(d) {
	try {
		window.localStorage.setItem(KEPT, JSON.stringify({ cores: d.cores, deps: d.deps }));
	} catch (e) {}
}

function kept() {
	var d = null;
	try { d = JSON.parse(window.localStorage.getItem(KEPT) || 'null'); } catch (e) {}
	if (d && d.cores && d.cores.cores) return d;
	/* Where the files go is in the settings, already loaded with the page,
	   so it is shown from the start rather than waited for. */
	var dir = uci.get('zirgozar', 'config', 'core_dir') || '/usr/libexec/zirgozar';
	var set = { xray: 'core_xray', 'sing-box': 'core_singbox', 'sing-box-lx': 'core_singbox_lx',
	            geoview: 'core_geoview', 'warp-plus': 'core_warpplus',
	            vwarp: 'core_vwarp', aether: 'core_aether', mihomo: 'core_mihomo', sslocal: 'core_sslocal' };
	var own = { aether: 'aether/aether' };
	return {
		cores: { app: { unknown: true }, unknown: true, dir: dir,
		         cores: CORE_NAMES.map(function(n) {
		             var path = n == 'openvpn' ? '/usr/sbin/openvpn' : n == 'haproxy' ? '/usr/sbin/haproxy'
		                 : (set[n] && uci.get('zirgozar', 'config', set[n])) || dir + '/' + (own[n] || n);
		             return { name: n, arch_ok: true, unknown: true, path: path };
		         }) },
		deps: { pending: true }
	};
}

function render(d, early) {
	d = d || {};
	var cores = d.cores || {};
	if (!early) { answered = true; keep(d); }

	/* This program's own update. The install restarts the services the page
	   talks to, so how it went is read afterwards from what the router left
	   behind: a failure is shown under the row, and success - a different
	   version from the one this page was opened with - reloads the page, whose
	   own files have just been replaced. */
	var app0 = early ? {} : ((d.cores || {}).app || {});
	if (app0.version && !firstVersion) firstVersion = app0.version;
	var res = early ? lastSelf : String(d.self || '');
	if (res.indexOf('error ') == 0 && res != lastSelf) {
		var room = /^error room (\d+) (\d+)$/.exec(res);
		say('app', room ? noRoom(room[1], room[2]) : _(res.slice(6)), 'error');
	}
	/* The release on GitHub is the one installed: the update stopped there. */
	if (res.trim() == 'same' && res != lastSelf)
		say('app', _('This is already the latest version. Nothing was downloaded.'), 'info');
	lastSelf = res;

	var cres = early ? lastCore : String(d.core_result || '');
	if (cres && cres != lastCore) {
		var lack = /^(\S+) room (\d+) (\d+)$/.exec(cres);
		var fail = /^(\S+) error (.+)$/.exec(cres);
		if (lack) say('core:' + lack[1], noRoom(lack[2], lack[3]), 'error');
		else if (fail) say('core:' + fail[1], _(fail[2]), 'error');
	}
	lastCore = cres;
	if (!d.job && app0.version && firstVersion && app0.version != firstVersion) {
		say('app', _('Updated to %s.').format(app0.version), 'info');
		window.setTimeout(function() { location.reload(); }, 1500);
	}

	var dr = early ? lastDeps : String(d.deps_result || '');
	if (dr && dr != lastDeps) {
		if (dr == 'ok') say('deps', _('Package installation finished. Check the capability results above.'), 'ok');
		else if (dr.indexOf('error') == 0) say('deps', _('Dependency installation failed. Details: %s').format(_(dr.slice(6).trim()) || _('See the installation log.')), 'error');
	}
	lastDeps = dr;
	renderDeps(d.deps, d);
	/* Keep the result visible even when no packages remain missing. */
	var db = document.getElementById('zgz-deps');
	if (db && !db.querySelector('[data-note="deps"]') && noteFor('deps'))
		db.appendChild(E('div', { 'data-note': 'deps' }, noteFor('deps')));

	/* While a check runs, what was known before it is not shown as an
	   answer, and the page asks again sooner than its usual ten seconds. */
	var busy = checking(d);
	if (!early) {
		progressKey = jobKey(d.job);
		progressJob = d.job || '';
		progressPct = (d.job && d.progress >= 0) ? +d.progress : -1;
		if (phaseJob != progressJob) {
			phaseJob = progressJob;
			progressPhase = '';
		}
		if (progressPct >= 0 && progressPhase != 'installing') progressPhase = 'downloading';
		else if (progressPct < 0 && progressPhase == 'downloading') progressPhase = 'installing';
		if (progressPhase == 'installing') progressPct = -1;
	}
	/* The job is the router's word now; the press no longer stands for it. */
	if (!early && d.job && d.job.indexOf(CHECK_JOB) !== 0) actAsked = 0;
	if (!early && (busy || (d.deps || {}).pending || working(d)) && !quickRefresh)
		quickRefresh = window.setTimeout(function() { quickRefresh = 0; refreshNow(); }, 2000);
	if (!busy) checkAsked = 0;

	/* ------------------------------------------------------ this program */
	var abox = document.getElementById('pwp-app');
	if (abox) {
		var appBusy = checking(d, 'app');
		var app = cores.app || {};
		while (abox.firstChild) abox.removeChild(abox.firstChild);
		/* Shown as the cores below are: the installed version in brackets,
		   and a newer one, when there is one, after an arrow. */
		var value = [ app.unknown ? verChip('…') : verChip('【 ' + (appVersion(app.version) || '?') + ' 】', 'ok') ];
		if (!appBusy && app.update && app.latest)
			value.push(verState(chip((i18n.dir() === 'rtl' ? '← ' : '→ ') + appVersion(app.latest), 'info')));
		else if (!appBusy && app.latest)
			value.push(verState(E('span', { 'style': 'color:var(--muted)' }, _('Up to date'))));
		abox.appendChild(row('Zirgozar', value, [
			checkBtn('primary', 'app', appBusy),
			!appBusy && app.update && app.latest
				? actBtn(_('Update to %s').format(appVersion(app.latest)), 'success mk-small', 'app', function() {
					return act('app', 'app_update', '',
						_('Downloading and installing the new version. This takes a minute or two; the page reloads by itself when it is done.'));
				}, 'download', d)
				: ''
		], 'app'));
	}

	/* ------------------------------------------------------------- cores */
	var cbox = document.getElementById('pwp-cores');
	/* Not while the version list is open: redrawing would shut it under the
	   reader's hand. The next turn draws it, once they are done. */
	var picking = document.activeElement && document.activeElement.classList &&
		document.activeElement.classList.contains('pwp-vsel') && !working(d);
	if (cbox && !picking) {
		while (cbox.firstChild) cbox.removeChild(cbox.firstChild);
		cbox.appendChild(E('div', { 'style': 'display:flex;justify-content:flex-end;margin-bottom:8px' }, [
			checkBtn('soft-blue', 'all-cores', checking(d, 'all-cores'), _('Check all'))
		]));
		(cores.cores || []).forEach(function(c) {
			var coreBusy = checking(d, 'core:' + c.name);
			var value = [];
			if (c.unknown) {
				value.push(verChip('…'));
				value.push(verState());
				value.push(E('code', { 'title': c.path, 'style': 'font-size:11.5px;color:var(--muted)' }, c.path));
			} else if (c.installed) {
				value.push(verChip('【 ' + (c.version ? ltr(c.version) : _('installed')) + ' 】', 'ok'));
				/* What the project has published, when it is not what is
				   installed. Two different strings, not "newer" - version
				   numbers written by three different projects are a way to be
				   confidently wrong about which way round they go. */
				if (!coreBusy && c.update && c.latest)
					value.push(verState(chip((i18n.dir() === 'rtl' ? '← ' : '→ ') + ltr(c.latest), 'info')));
				else if (!coreBusy && c.latest)
					value.push(verState(E('span', { 'style': 'color:var(--muted)' }, _('Up to date'))));
				else
					value.push(verState());
				value.push(E('code', { 'style': 'font-size:11.5px;color:var(--muted)' }, c.path));
				if (!c.ours)
					value.push(E('span', { 'style': 'font-size:12px;color:var(--muted)' },
						_('(installed by another package — left alone)')));
			} else if (!c.arch_ok) {
				value.push(verChip(_('no build for this router')));
			} else {
				value.push(verChip(_('not installed')));
				if (c.latest)
					value.push(verState(E('span', { 'style': 'color:var(--muted)' }, _('latest is %s').format(ltr(c.latest)))));
			}

			var actions = [];
			if (c.arch_ok) {
				actions.push(checkBtn('soft-blue', 'core:' + c.name, coreBusy));
				if (!c.unknown) actions.push(actBtn(c.installed
					? (c.update && c.latest ? _('Update to %s').format(c.latest) : _('Reinstall'))
					: _('Install'), 'primary mk-small', 'core:' + c.name, function() {
					var target = c.name;
					if (c.name == 'xray' && c.installed && !(c.update && c.latest))
						target = 'xray@v' + String(c.version).replace(/^v/, '');
					return act('core:' + c.name, 'core_install', target, downloadText(c.name));
				}, 'download', d));
			}
			/* Any recent Xray, pre-releases included - those are what most
			   people run, and GitHub's "latest" leaves them out. */
			if (c.name == 'xray' && c.arch_ok && (cores.xray_versions || []).length) {
				/* The row is drawn afresh every few seconds; the version picked
				   here stays picked through that. */
				var sel = E('select', { 'class': 'pwp-vsel', 'change': function(ev) { xrayPicked = ev.target.value; } },
					(cores.xray_versions || []).map(function(v) {
						var t = v.tag.replace(/^v/, '');
						return E('option', { 'value': v.tag }, v.pre ? _('%s (pre-release)').format(t) : t);
					}));
				if (xrayPicked && (cores.xray_versions || []).some(function(v) { return v.tag == xrayPicked; }))
					sel.value = xrayPicked;
				actions.push(sel);
				actions.push(actBtn(_('Install this version'), 'soft-blue mk-small', 'core:xray', function() {
					return act('core:xray', 'core_install', 'xray@' + sel.value,
						_('Downloading Xray %s.').format(sel.value.replace(/^v/, '')));
				}, 'download', d));
			}
			if (c.installed && c.ours && c.name != 'xray')
				actions.push(actBtn(_('Remove'), 'danger mk-small', 'core:' + c.name, function() {
					return act('core:' + c.name, 'core_remove', c.name, _('%s removed.').format(c.name));
				}, 'trash', d));

			cbox.appendChild(row({ xray: 'Xray', geoview: 'Geoview', 'sing-box-lx': 'sing-box-lx', 'warp-plus': 'warp-plus', vwarp: 'Vwarp', aether: 'Aether', mihomo: 'Mihomo', sslocal: 'shadowsocks-rust', haproxy: 'HAProxy', 'xray-patterniha': _('Xray (patterniha)'), openvpn: 'OpenVPN' }[c.name] || c.name, value, actions, 'core:' + c.name));
		});
		var freeRow = row(_('Free space'),
			[ E('span', {}, cores.unknown ? '…' : bytes(cores.free)), verState(), E('code', { 'title': cores.dir || '', 'style': 'font-size:11.5px;color:var(--muted)' }, cores.dir || '') ]);
		freeRow.classList.add('pwp-core-update-row');
		cbox.appendChild(freeRow);
		cbox.appendChild(E('p', { 'style': 'font-size:12px;color:var(--muted);margin:8px 0 0' },
			_('Xray carries the traffic. sing-box is only needed for nodes that speak what Xray does not — it is then run as a local helper for that one node, and everything else works exactly as before.')));
		cbox.appendChild(E('p', { 'style': 'font-size:12px;color:var(--muted);margin:6px 0 0' },
			_('Geoview shows where a name or an address belongs, on the Geoview page. sing-box cannot read the routing data without it: when sing-box carries the tunnel with the Iran split or ad blocking on, Geoview is installed by itself if it is missing.')));
		cbox.appendChild(E('p', { 'style': 'font-size:12px;color:var(--muted);margin:6px 0 0' },
			_('warp-plus is only needed for WARP nodes: Cloudflare WARP, WARP in WARP, Psiphon behind WARP, and WireGuard nodes set to be carried by it.')));
		cbox.appendChild(E('p', { 'style': 'font-size:12px;color:var(--muted);margin:6px 0 0' },
			_('Vwarp is warp-plus with WARP over MASQUE and noize; WARP nodes that use either need it. Xray (patterniha) is Xray that also carries VLESS and Trojan without TLS to public addresses - configs over Cloudflare’s plain-HTTP ports - which the official Xray refuses; installed beside it, it is used for those configs.')));
		cbox.appendChild(E('p', { 'style': 'font-size:12px;color:var(--muted);margin:6px 0 0' },
			_('OpenVPN is the official client, from the router’s own packages: every OpenVPN config is carried by it and by nothing else. Install, update and remove go through the package manager.')));
	}
}

return view.extend({
	/* The settings only. What the router has installed is asked for once the
	   page is up and filled in when it answers: waiting for it here held the
	   whole page back - blank, and in English - for as long as the router
	   took, which on a small one was ten seconds. */
	load: function() {
		return uci.load('zirgozar').catch(function() { return null; });
	},

	render: function() {
		i18n.setLang(uci.get('zirgozar', 'config', 'lang'));

		var m, s, o;

		/* Where each core lives. An App Path per core; here one
		   folder holds the cores this package downloads, and one setting can
		   insist on a particular Xray. The routing data is on Rule Manage, as
		   it is elsewhere. */
		m = new form.Map('zirgozar');
		s = m.section(form.NamedSection, 'config', 'zirgozar', _('App Path'));
		s.anonymous = true;

		o = s.option(form.Value, 'core_dir', _('Core download folder'),
			_('Point this at USB storage on a router short of flash. A core another package installed is used where it is and never moved.'));
		o.placeholder = '/usr/libexec/zirgozar';

		o = s.option(form.Value, 'core_xray', _('Xray App Path'),
			_('Empty means: whichever Xray on this router accepts the configuration, preferring one already installed.'));
		o.placeholder = '/usr/bin/xray';

		/* The App Path for the other two: the file this program
		   installs, updates and runs. Empty is its own copy in the folder
		   above. */
		o = s.option(form.Value, 'core_singbox', _('Sing-Box App Path'),
			_('Empty means this program’s own copy in the folder above.'));
		o.placeholder = '/usr/libexec/zirgozar/sing-box';

		o = s.option(form.Value, 'core_singbox_lx', _('Sing-Box-LX App Path'),
			_('The sing-box build that speaks xhttp. Empty means this program’s own copy in the folder above.'));
		o.placeholder = '/usr/libexec/zirgozar/sing-box-lx';

		o = s.option(form.Value, 'core_geoview', _('Geoview App Path'),
			_('The Geoview page needs it, and so does sing-box whenever the Iran split or ad blocking is on - it is then installed by itself. Empty means this program’s own copy in the folder above.'));
		o.placeholder = '/usr/libexec/zirgozar/geoview';

		o = s.option(form.Value, 'core_warpplus', _('warp-plus App Path'),
			_('Only WARP nodes need it. Empty means this program’s own copy in the folder above.'));
		o.placeholder = '/usr/libexec/zirgozar/warp-plus';

		o = s.option(form.Value, 'core_vwarp', _('Vwarp App Path'),
			_('Only WARP nodes over MASQUE or with noize need it. Empty means this program’s own copy in the folder above.'));
		o.placeholder = '/usr/libexec/zirgozar/vwarp';
		o = s.option(form.Value, 'core_aether', _('Aether App Path'),
			_('Aether carries aether:// configs, including WireGuard-over-MASQUE and Tor/Psiphon. Install it above.'));
		o.placeholder = '/usr/libexec/zirgozar/aether/aether';

		o = s.option(form.Value, 'core_mihomo', _('Mihomo App Path'), _('Only SSR nodes need it.'));
		o.placeholder = '/usr/libexec/zirgozar/mihomo';
		o = s.option(form.Value, 'core_sslocal', _('shadowsocks-rust App Path'), _('Only Shadowsocks nodes set to use it need it.'));
		o.placeholder = '/usr/libexec/zirgozar/sslocal';

		o = s.option(form.DummyValue, '_path_tip');
		o.render = function() {
			return E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, ''),
				E('div', { 'class': 'cbi-value-field', 'style': 'color:#dc2626;font-weight:600;font-size:13px' },
					_('To run a core from memory, give a path beginning with /tmp, save and apply, then press Install beside it above. It has to be installed again after every reboot.'))
			]);
		};


		return m.render().then(function(mapEl) {
			var content = [
				pui.card(_('App Update'), 'download', '#1e88e5', E('div', { 'id': 'pwp-app' })),
				pui.card(_('Cores'), 'cpu', '#8b5cf6', E('div', { 'id': 'pwp-cores' })),
				pui.card(_('Router requirements'), 'shield', '#f59e0b', E('div', { 'id': 'zgz-deps' })),
				mapEl
			];
			/* Asked at once, and then every ten seconds while the page is open -
			   often enough to see a download finish. */
			refreshNow = refresh;
			var pendingRefresh = null;
			function refresh() {
				if (pendingRefresh) return pendingRefresh;
				pendingRefresh = callSystem().then(render).catch(function() {}).then(function() { pendingRefresh = null; });
				return pendingRefresh;
			}
			poll.add(refresh, 10);
			window.setTimeout(refresh, 0);
			/* Opening the page also has the router look for new releases when
			   it has not lately; that takes a few seconds, and what it finds
			   is shown without waiting for the next ten-second turn. */
			window.setTimeout(refresh, 4000);
			var page = pui.page(content);
			/* render() finds its boxes by id, so it draws into the page once
			   the page is in the document - which is right after this. */
			(function early() {
				if (answered) return;
				if (!document.getElementById('pwp-app')) return window.setTimeout(early, 20);
				render(kept(), true);
			})();
			return page;
		});
	}
});
