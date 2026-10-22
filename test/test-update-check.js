/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../package/luci-app-zirgozar/root/www/luci-static/resources/view/zirgozar/update.js'), 'utf8');
const body = source.slice(source.indexOf('function checking('), source.indexOf('\nfunction checkUpdate('));
const checking = new Function('checkAsked', 'checkKey', 'CHECK_JOB', body + '\nreturn checking;')(Date.now(), 'core:xray', 'Checking for new versions');
for (const job of ['', 'Checking for new versions', 'Checking for new versions: xray']) {
	assert.ok(checking({job}, 'core:xray'));
	for (const key of ['core:sing-box', 'core:haproxy', 'core:xray-patterniha', 'app'])
		assert.ok(!checking({job}, key), `${job}: ${key} must stay still`);
}
const idle = new Function('checkAsked', 'checkKey', 'CHECK_JOB', body + '\nreturn checking;')(0, '', 'Checking for new versions');
assert.ok(!idle({job:'Checking for new versions'}, 'core:sing-box'));
assert.ok(idle({job:'Checking for new versions: haproxy'}, 'core:haproxy'));
assert.ok(!idle({job:'Checking for new versions: haproxy'}, 'core:xray'));
for (const key of ['core:xray', 'core:sing-box', 'core:haproxy', 'all-cores'])
	assert.ok(idle({job:'Checking for new versions: all-cores'}, key));
assert.ok(!idle({job:'Checking for new versions: all-cores'}, 'app'));
console.log('Update checks: only the selected component animates, including generic transitional jobs');
