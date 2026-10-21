#!/usr/bin/ucode -S
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
import { readfile, open, stat } from 'fs';

function valid(m) {
	if (type(m) != 'object' || m.format != 1 || type(m.name) != 'string' ||
	    !match(m.name, /^[A-Za-z0-9_.+-]+\.(apk|ipk)$/) ||
	    type(m.sha256) != 'string' || !match(m.sha256, /^[0-9a-f]{64}$/) ||
	    type(m.size) != 'int' || m.size < 1 || m.size > 134217728 ||
	    type(m.chunks) != 'array' || !length(m.chunks) || length(m.chunks) > 2048)
		return false;
	let end = 0;
	for (let c in m.chunks) {
		if (type(c) != 'array' || length(c) != 3 || type(c[0]) != 'int' ||
		    type(c[1]) != 'int' || c[0] != end || c[1] < 1 || c[1] > 1048576 ||
		    type(c[2]) != 'string' || !match(c[2], /^[0-9a-f]{64}$/)) return false;
		end += c[1];
	}
	return end == m.size;
}

if (ARGV[0] == 'copy') {
	// Bounded binary reads avoid dd's byte-at-a-time traversal on routers.
	let offset = +ARGV[3], size = +ARGV[4];
	if (offset < 0 || size < 1 || size > 134217728) exit(1);
	let source = open(ARGV[1], 'r'), dest = open(ARGV[2], 'w');
	if (!source || !dest || source.seek(offset) == null) exit(1);
	while (size > 0) {
		let data = source.read(min(size, 65536));
		if (!data || dest.write(data) != length(data)) exit(1);
		size -= length(data);
	}
	source.close(); dest.close();
	exit(0);
}

let target = json(readfile(ARGV[1]) || 'null');
if (!valid(target) || target.name != ARGV[3] || target.sha256 != ARGV[4]) exit(1);
if (ARGV[0] == 'validate') { printf('%d\n', target.size); exit(0); }
let previous = json(readfile(ARGV[2]) || 'null');
if (!valid(previous)) exit(2);
let old = {};
for (let c in previous.chunks) old[c[2]] = c;
let operations = [], reused = 0;
for (let c in target.chunks) {
	let prior = old[c[2]], local = prior && prior[1] == c[1];
	let op = [local ? 'local' : 'remote', local ? prior[0] : c[0], c[1]];
	if (local) reused += c[1];
	let last = operations[length(operations) - 1];
	if (last && last[0] == op[0] && last[1] + last[2] == op[1]) last[2] += op[2];
	else push(operations, op);
}
// A full download is cheaper than many range requests for little reuse.
if (reused < 65536 || reused * 4 < target.size || length(operations) > 128) exit(2);
for (let op in operations) printf('%s\t%d\t%d\n', op[0], op[1], op[2]);
