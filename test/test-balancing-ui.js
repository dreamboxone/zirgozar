/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/node.js'), 'utf8');
const start = source.indexOf('\t\t\tvar candidates =');
const end = source.indexOf('\t\t\tvar interfaces =', start);
const choices = new Function('data', 'uci', 'parseLink', 'sid', source.slice(start, end) + '\nreturn nodes;');
const protocols = ['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'wireguard', 'warp',
	'hysteria2', 'hysteria', 'tuic', 'anytls', 'snell', 'naive', 'openconnect', 'tailscale', 'ssh',
	'ssplugin', 'ssr', 'ssrust', 'mieru', 'shadowquic', 'trusttunnel', 'openvpn', 'amneziawg',
	'l2tp', 'pptp', 'sstp', 'ikev2', 'aether', 'interface'];
const saved = protocols.map(protocol => ({ tag: protocol, label: protocol + ' saved', protocol }));
saved.push({ tag: 'group', label: 'nested group', protocol: 'balancing' });
const data = [null, { nodes: [] }, null, {}, [{ sub: 'feed', protocol: 'l2tp', host: 'host', port: 1701, label: 'Node with spaces', fp: 'abc' }], saved];
const result = choices(data, { sections: () => [] }, () => null, 'new');
for (const protocol of protocols) assert.ok(result.some(n => n.tag === protocol), protocol + ' is selectable without a runtime cache');
assert.ok(result.some(n => n.tag === 'sub:feed:l2tp|host|1701|Node with spaces|#abc'));
assert.ok(!result.some(n => n.tag === 'group'));
const duplicate = choices([null, { nodes: [{ tag: 'runtime', protocol: 'wireguard' }] }, null,
	{ runtime: 'wireguard' }, [], saved], { sections: () => [] }, () => null, 'new');
assert.equal(duplicate.filter(n => n.tag === 'wireguard').length, 1);

const intervalStart = source.indexOf('\t\t\tif (i18n.get()');
const intervalEnd = source.indexOf("\n\t\t\to = s.option(form.Value, 'probeUrl'", intervalStart);
let stored;
const styles = {};
const input = { style: { setProperty: (key, value, priority) => { styles[key] = [value, priority]; } } };
const widget = { matches: () => false, querySelector: () => input };
const option = { renderWidget: () => widget };
new Function('i18n', 'o', 'uci', source.slice(intervalStart, intervalEnd))(
	{ get: () => 'fa' }, option, { get: () => stored || '1m', set: (config, section, key, value) => { stored = value; } });
assert.equal(option.cfgvalue('node'), '۱ دقیقه');
assert.equal(option.renderWidget('node', 0, '۱ دقیقه'), widget);
assert.equal(input.dir, 'rtl');
assert.deepEqual(styles.direction, ['rtl', 'important']);
assert.deepEqual(styles['text-align'], ['right', 'important']);
for (const [display, raw] of [['۲ دقیقه', '2m'], ['۳۰ ثانیه', '30s'], ['۱ ساعت', '1h'], ['15s', '15s']]) {
	assert.equal(option.validate('node', display), true);
	option.write('node', display);
	assert.equal(stored, raw);
}
assert.notEqual(option.validate('node', '۰ دقیقه'), true);
assert.notEqual(option.validate('node', '-1m'), true);
console.log('Balancing: all transport types, saved file nodes, subscriptions, deduplication and Persian intervals passed');
