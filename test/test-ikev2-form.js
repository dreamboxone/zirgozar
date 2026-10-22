/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = '../package/luci-app-zirgozar/root/www/luci-static/resources/';
const source = fs.readFileSync(path.join(__dirname, root, 'view/zirgozar/node.js'), 'utf8');
const api = new Function('rpc', 'i18n', source.slice(0, source.indexOf('\nreturn view.extend(')) + '\nreturn { parseLink, buildLink };')(
	{ declare: () => () => Promise.resolve({}) }, { tr: s => s });
const upload = fs.readFileSync(path.join(__dirname, root, 'zirgozar/nodelink.js'), 'utf8');
const certificatePEM = new Function(upload.slice(upload.indexOf('function certificatePEM('), upload.indexOf('\nfunction withBrowse(')) + '\nreturn certificatePEM;')();
const der = Uint8Array.from([0x30, 3, 2, 1, 0]);
const pem = certificatePEM(der.buffer);
assert.deepEqual(Buffer.from(pem.split('\n')[1], 'base64'), Buffer.from(der));
assert.equal(certificatePEM(new TextEncoder().encode(pem).buffer), pem);
assert.throws(() => certificatePEM(new TextEncoder().encode('invalid file').buffer));
const form = { proto: 'ikev2', rest: {}, address: 'vpn.example.com', user: 'test', password: 'test-pass', ikev2_auth: 'eap', ikev2_ca: pem };
let parsed = api.parseLink(api.buildLink(form, 'test'));
assert.equal(parsed.ikev2_auth, 'eap');
assert.equal(parsed.ikev2_ca.trim(), pem);
form.ikev2_auth = 'psk'; form.ikev2_psk = 'shared-test-key';
parsed = api.parseLink(api.buildLink(form, 'test'));
assert.equal(parsed.ikev2_auth, 'psk');
assert.equal(parsed.ikev2_psk, form.ikev2_psk);
assert.equal(parsed.ikev2_ca, '');
console.log('IKEv2 certificate import and EAP/PSK form roundtrips passed');
