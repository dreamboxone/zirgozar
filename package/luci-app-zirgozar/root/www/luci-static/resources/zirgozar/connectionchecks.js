/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
'require baseclass';
var sites = [
	{ id: 'ig', name: 'Instagram', mark: 'instagram', colour: '#df458e', url: 'https://www.instagram.com' },
	{ id: 'reddit', name: 'Reddit', mark: 'reddit', colour: '#ec693c', url: 'https://www.reddit.com' },
	{ id: 'x', name: 'X', mark: 'x', colour: '#329dc2', url: 'https://x.com' },
	{ id: 'youtube', name: 'YouTube', mark: 'youtube', colour: '#ff0033', url: 'https://www.youtube.com' },
	{ id: 'arvancloud', name: 'ArvanCloud', colour: '#00a99d', url: 'https://arvancloud.ir' },
	{ id: 'telegram', name: 'Telegram', mark: 'telegram', colour: '#26a5e4', url: 'https://telegram.org' },
	{ id: 'cloudflare', name: 'Cloudflare', colour: '#f48120', url: 'https://cloudflare.com' },
	{ id: 'nvidia', name: 'NVIDIA', colour: '#76b900', url: 'https://nvidia.com' },
	{ id: 'intel', name: 'Intel', colour: '#0071c5', url: 'https://intel.com' },
	{ id: 'steam', name: 'Steam', colour: '#38749a', url: 'https://store.steampowered.com' },
	{ id: 'digikala', name: 'Digikala', colour: '#ef394e', url: 'https://www.digikala.com/', icon: 'digikala.png' },
	{ id: 'snapp', name: 'Snapp', colour: '#00a65a', url: 'https://snapp.ir/', icon: 'snapp.svg' },
	{ id: 'telewebion', name: 'Telewebion', colour: '#b52669', url: 'https://telewebion.ir/', icon: 'telewebion.png' }
];
function normalizeUrl(value) {
	try {
		var url = new URL(String(value || '').trim());
		if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) return null;
		url.hash = '';
		return url.href;
	} catch (error) {
		return null;
	}
}
function entries(title, value) {
	var url = normalizeUrl(value);
	title = String(title || '').trim();
	return title && url ? sites.concat({ id: 'custom', name: title, url: url, colour: '#2563eb' }) : sites;
}
function selected(value, title, url) {
	if (value == null) value = ['ig', 'reddit', 'x'];
	var ids = Array.isArray(value) ? value : String(value).split(/\s+/);
	ids = ids.map(function(id) { return id == 'radiojavan' ? 'youtube' : id == 'soft98' ? 'telegram' : id; });
	return entries(title, url).filter(function(site) { return ids.indexOf(site.id) >= 0; }).slice(0, 4);
}
return baseclass.extend({ sites: sites, entries: entries, selected: selected, normalizeUrl: normalizeUrl });
