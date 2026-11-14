/* SPDX-License-Identifier: AGPL-3.0-or-later */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/traffic.js'), 'utf8');
const start = source.indexOf("o = s.option(form.DynamicList, 'direct_ip'");
const end = source.indexOf('return m.render()', start);
const options = {}, saved = {};
new Function('s', 'form', 'E', '_', 'uci', 'hostname', 'var o;\n' + source.slice(start, end))(
 {option(type, name) { return options[name] = {option: name}; }}, {DynamicList: {}}, () => ({}), s => s,
 {set(pkg, section, key, value) { saved[key] = value; }}, value => /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(value)
);
for (const value of ['regexp:.*\\.ir$', 'regexp:.*\\.xn--mgba3a4f16a$', 'ext:geosite_IR.dat:ir', 'ext:geoip_IR.dat:ir', 'geosite:google-play ', 'geoip:ir', 'example.com'])
 assert.equal(options.direct_domain.validate('config', value), true, value);
for (const value of ['192.0.2.1', '192.0.2.0/24', '192.0.2.0/255.255.255.0', 'geoip:ir', 'ext:geoip_IR.dat:ir', 'ext:custom.dat:ir'])
 assert.equal(options.direct_ip.validate('config', value), true, value);
for (const value of ['999.2.3.4', '1.2.3.4/99', 'ext:../file.dat:ir', 'geosite:'])
 assert.notEqual(options.direct_ip.validate('config', value), true, value);
for (const value of ['ext:../file.dat:ir', 'ext:file.dat:', 'geosite:', 'https://example.com/path'])
 assert.notEqual(options.direct_domain.validate('config', value), true, value);
options.direct_domain.write('config', [' geosite:google-play ']);
assert.deepEqual(saved.direct_domain, ['geosite:google-play']);
console.log('Direct rule form: Xray syntax, IP ranges, invalid entries and whitespace passed');
