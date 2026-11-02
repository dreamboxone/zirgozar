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
	{ id: 'soft98', name: 'Soft98', colour: '#339c54', url: 'https://soft98.ir' },
	{ id: 'cloudflare', name: 'Cloudflare', colour: '#f48120', url: 'https://cloudflare.com' },
	{ id: 'nvidia', name: 'NVIDIA', colour: '#76b900', url: 'https://nvidia.com' },
	{ id: 'intel', name: 'Intel', colour: '#0071c5', url: 'https://intel.com' },
	{ id: 'steam', name: 'Steam', colour: '#38749a', url: 'https://store.steampowered.com' }
];
function selected(value) {
	if (value == null) value = ['ig', 'reddit', 'x'];
	var ids = Array.isArray(value) ? value : String(value).split(/\s+/);
	ids = ids.map(function(id) { return id == 'radiojavan' ? 'youtube' : id; });
	return sites.filter(function(site) { return ids.indexOf(site.id) >= 0; }).slice(0, 4);
}
return baseclass.extend({ sites: sites, selected: selected });
