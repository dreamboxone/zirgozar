/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const proxy = config.outbounds.find(o => o.tag === 'proxy');
if (proxy.protocol === 'loopback') {
	const inbound = proxy.settings.inboundTag;
	const route = config.routing.rules[0];
	assert.deepEqual(route.inboundTag, [inbound]);
	assert.ok(route.balancerTag);
	const balancer = config.routing.balancers.find(b => b.tag === route.balancerTag);
	assert.ok(balancer);
	for (const selected of balancer.selector) {
		assert.ok(config.outbounds.some(o => o.tag === selected), 'missing member ' + selected);
	}
	assert.ok(config.outbounds.some(o => o.tag === balancer.fallbackTag), 'missing fallback');
	assert.ok(config.observatory || config.burstObservatory, 'missing fallback observation dependency');
} else {
	assert.equal(proxy.protocol, 'freedom');
	assert.equal(proxy.streamSettings.sockopt.interface, 'eth0');
	assert.equal(proxy.streamSettings.sockopt.mark, 255);
	assert.equal(config.routing.balancers, undefined);
}
