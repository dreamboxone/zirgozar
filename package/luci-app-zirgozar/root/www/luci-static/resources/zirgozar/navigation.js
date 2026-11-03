/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
'require baseclass';
'require dom';
'require poll';
'require rpc';
'require uci';
'require ui';
'require zirgozar.i18n as i18n';

var views = {}, installed = false, importing = false, pending = null, loadingData = false;
var baseline = [], dirty = false, currentURL = '', historyIndex = 0, restoring = false;
var pages = ['settings','nodes','node','subscribe','other','update','traffic','shunt_rule','geoview','server','acl','log'];
var _ = i18n.tr;

function route(value) {
	var url;
	try { url = new URL(value, window.location.href); } catch (e) { return null; }
	var base = L.url('admin', 'services', 'zirgozar');
	if (url.origin !== window.location.origin || (url.pathname !== base && url.pathname.indexOf(base + '/') !== 0)) return null;
	var page = url.pathname.slice(base.length).replace(/^\//, '') || 'settings';
	if (pages.indexOf(page) < 0) return null;
	return {url:url, page:page};
}

function markTabs(destination) {
	var selected = destination.page === 'node' ? 'nodes' : destination.page === 'shunt_rule' ? 'traffic' : destination.page;
	document.querySelectorAll('.mk-tabs a').forEach(function(link) {
		var target = route(link.href), active = target && target.page === selected;
		link.classList.toggle('mk-tab-on', !!active);
		link.setAttribute('aria-selected', String(!!active));
	});
}

function busy(value) {
	var frame = document.querySelector('#view > .mk');
	if (!frame) return;
	frame.classList.toggle('zgz-navigating', value);
	frame.setAttribute('aria-busy', String(value));
	var content = frame.querySelector('.zgz-page-content');
	if (content) content.inert = value;
}

function stopPagePolls() {
	(poll.queue || []).slice().forEach(function(entry) {
		if (baseline.indexOf(entry.fn) < 0) poll.remove(entry.fn);
	});
}

function footer(instance) {
	var vp = document.getElementById('view');
	var previous = vp.querySelector('.zgz-view-actions');
	if (previous) previous.remove();
	var actions = E('div', {'class':'zgz-view-actions'});
	dom.append(actions, instance.addFooter());
	vp.appendChild(actions);
}

function display(instance) {
	var started = Date.now(), loaded;
	loadingData = true;
	return Promise.resolve().then(function() { return instance.load(); }).then(function(data) {
		loaded = Date.now();
		return instance.render(data);
	}).then(function(nodes) {
		var vp = document.getElementById('view');
		if (nodes.parentNode !== vp) dom.content(vp, nodes);
		footer(instance);
		var frame = vp.querySelector('.mk');
		if (frame) { frame.setAttribute('data-load-ms', String(loaded - started)); frame.setAttribute('data-render-ms', String(Date.now() - loaded)); }
		dirty = false;
		busy(false);
		var destination = route(window.location.href);
		if (destination) markTabs(destination);
		currentURL = window.location.href;
	}).finally(function() { loadingData = false; });
}

function guard(instance) {
	if (instance.zgzNavigationGuard) return;
	instance.zgzNavigationGuard = true;
	['handleSave','handleSaveApply','handleReset'].forEach(function(name) {
		var original = instance[name];
		if (typeof original !== 'function') return;
		instance[name] = function() {
			return Promise.resolve(original.apply(this, arguments)).then(function(result) {
				dirty = false;
				currentURL = window.location.href;
				return result;
			});
		};
	});
}

function navigate(value, popIndex) {
	var destination = route(value);
	if (!destination) { window.location.href = value; return Promise.resolve(); }
	if (pending) return pending.then(function() { return navigate(value, popIndex); });
	if (dirty && !window.confirm(_('There are unsaved changes. Leave this page?'))) {
		if (popIndex != null) { restoring = true; window.history.go(historyIndex - popIndex); }
		return Promise.resolve(false);
	}
	stopPagePolls();
	dirty = false;
	ui.hideModal();
	if (popIndex == null) {
		historyIndex++;
		window.history.pushState({zirgozarIndex:historyIndex}, '', destination.url.href);
	} else historyIndex = popIndex;
	L.env.dispatchpath = ['admin','services','zirgozar',destination.page];
	markTabs(destination);
	busy(true);
	uci.unload(['zirgozar','zirgozar_server']);
	var loading;
	if (views[destination.page]) loading = Promise.resolve(views[destination.page]);
	else {
		importing = true;
		loading = L.require('view.zirgozar.' + destination.page).finally(function() { importing = false; });
	}
	pending = loading.then(function(instance) {
		views[destination.page] = instance;
		guard(instance);
		return display(instance);
	}).catch(function(error) {
		busy(false);
		ui.addNotification(null, E('p', {}, String(error.message || error)), 'danger');
		throw error;
	}).finally(function() { pending = null; });
	return pending;
}

function install() {
	if (installed) return;
	installed = true;
	/* LuCI normally waits for an animation frame to batch RPCs. A background
	   tab may throttle that frame for seconds; reads needed to open a view
	   must not wait for it. Normal polling keeps its usual batching. */
	var originalCall = rpc.call;
	rpc.call = function(message, callback, nobatch) {
		var params = message && message.params;
		if (loadingData && message.method === 'call' && Array.isArray(params) &&
			((params[1] === 'uci' && (params[2] === 'get' || params[2] === 'configs')) ||
			 (params[1] === 'luci.zirgozar' && params[2] !== 'action') ||
			 (params[1] === 'luci' && params[2] === 'getHostHints')))
			nobatch = true;
		return originalCall.call(this, message, callback, nobatch);
	};
	baseline = (poll.queue || []).map(function(entry) { return entry.fn; });
	currentURL = window.location.href;
	window.history.replaceState({zirgozarIndex:0}, '', currentURL);
	document.addEventListener('click', function(event) {
		if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
		var link = event.target.closest && event.target.closest('a[href]');
		if (!link || link.target || link.hasAttribute('download')) return;
		var destination = route(link.href);
		if (!destination || destination.url.pathname + destination.url.search === window.location.pathname + window.location.search) return;
		event.preventDefault();
		navigate(destination.url.href).catch(function() {});
	});
	function changed(event) {
		if ((event.isTrusted || event.target === document.activeElement) && event.target.closest && event.target.closest('#view .cbi-map')) dirty = true;
	}
	document.addEventListener('input', changed);
	document.addEventListener('change', changed);
	window.addEventListener('beforeunload', function(event) {
		if (dirty) { event.preventDefault(); event.returnValue = ''; }
	});
	window.addEventListener('popstate', function(event) {
		if (restoring) { restoring = false; return; }
		var index = event.state && event.state.zirgozarIndex;
		if (index == null) { window.location.reload(); return; }
		navigate(window.location.href, index).catch(function() {});
	});
}

function mount(instance) {
	var destination = route(window.location.href);
	if (destination) views[destination.page] = instance;
	guard(instance);
	if (importing) return Promise.resolve();
	install();
	var ready = ((window.L && window.L.loaded) || L.loaded || document.readyState === 'complete') ? Promise.resolve() : new Promise(function(resolve) { document.addEventListener('luci-loaded', resolve, {once:true}); });
	return ready.then(function() { return display(instance); }).catch(function(error) {
		ui.addNotification(null, E('p', {}, String(error.message || error)), 'danger');
	});
}

return baseclass.extend({mount:mount, navigate:navigate});
