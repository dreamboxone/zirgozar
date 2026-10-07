/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * A QR code for a share link, drawn here rather than fetched: the router may
 * have no way out to a CDN, and the page that most needs a QR code is the one
 * open while the tunnel is down. Byte mode only, error correction M, or L
 * when the text is too long for M - a share link is bytes, and the largest
 * code holds about three kilobytes of it.
 */
'use strict';
'require baseclass';

/* Index 0 is unused; [ecl][version]. ecl 0 is L, 1 is M. */
var ECC_PER_BLOCK = [
	[ -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30 ],
	[ -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28 ]
];
var NUM_BLOCKS = [
	[ -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25 ],
	[ -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49 ]
];
/* The two bits the format information gives each level. */
var ECL_BITS = [ 1, 0 ];

function rawModules(ver) {
	var r = (16 * ver + 128) * ver + 64;
	if (ver >= 2) {
		var n = Math.floor(ver / 7) + 2;
		r -= (25 * n - 10) * n - 55;
		if (ver >= 7) r -= 36;
	}
	return r;
}

function dataCodewords(ver, ecl) {
	return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * NUM_BLOCKS[ecl][ver];
}

/* GF(2^8) with the QR polynomial. */
function gfMul(x, y) {
	var z = 0;
	for (var i = 7; i >= 0; i--) {
		z = (z << 1) ^ ((z >>> 7) * 0x11D);
		z ^= ((y >>> i) & 1) * x;
	}
	return z;
}

function rsDivisor(degree) {
	var r = [], root = 1, i, j;
	for (i = 0; i < degree - 1; i++) r.push(0);
	r.push(1);
	for (i = 0; i < degree; i++) {
		for (j = 0; j < r.length; j++) {
			r[j] = gfMul(r[j], root);
			if (j + 1 < r.length) r[j] ^= r[j + 1];
		}
		root = gfMul(root, 0x02);
	}
	return r;
}

function rsRemainder(data, div) {
	var r = div.map(function() { return 0; });
	data.forEach(function(b) {
		var f = b ^ r.shift();
		r.push(0);
		div.forEach(function(c, i) { r[i] ^= gfMul(c, f); });
	});
	return r;
}

function utf8(s) {
	var u = unescape(encodeURIComponent(s)), out = [];
	for (var i = 0; i < u.length; i++) out.push(u.charCodeAt(i));
	return out;
}

/* The modules of one code, or null when the text is too long for any. */
function encode(text) {
	var bytes = utf8(String(text || '')), ver = 0, ecl, e, v;

	for (e = 1; e >= 0 && !ver; e--)
		for (v = 1; v <= 40; v++)
			if (4 + (v < 10 ? 8 : 16) + 8 * bytes.length <= dataCodewords(v, e) * 8) { ver = v; ecl = e; break; }
	if (!ver) return null;

	/* The bit stream: mode, length, the bytes, a terminator, padding. */
	var bits = [];
	function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
	put(4, 4);
	put(bytes.length, ver < 10 ? 8 : 16);
	bytes.forEach(function(b) { put(b, 8); });
	var cap = dataCodewords(ver, ecl) * 8;
	put(0, Math.min(4, cap - bits.length));
	put(0, (8 - bits.length % 8) % 8);
	for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
	var data = [];
	for (var i = 0; i < bits.length; i += 8) {
		var b = 0;
		for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
		data.push(b);
	}

	/* Split into blocks, add each block's error correction, interleave. */
	var nb = NUM_BLOCKS[ecl][ver], eccLen = ECC_PER_BLOCK[ecl][ver];
	var raw = Math.floor(rawModules(ver) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
	var div = rsDivisor(eccLen), blocks = [], at = 0;
	for (i = 0; i < nb; i++) {
		var dat = data.slice(at, at + shortLen - eccLen + (i < nShort ? 0 : 1));
		at += dat.length;
		var ecc = rsRemainder(dat, div);
		if (i < nShort) dat.push(0);
		blocks.push(dat.concat(ecc));
	}
	var words = [];
	for (i = 0; i < blocks[0].length; i++)
		for (var j = 0; j < blocks.length; j++)
			if (i != shortLen - eccLen || j >= nShort) words.push(blocks[j][i]);

	/* The grid. */
	var size = ver * 4 + 17, mod = [], fn = [], x, y;
	for (y = 0; y < size; y++) { mod.push([]); fn.push([]); for (x = 0; x < size; x++) { mod[y].push(false); fn[y].push(false); } }
	function setFn(x, y, dark) { mod[y][x] = !!dark; fn[y][x] = true; }

	for (i = 0; i < size; i++) { setFn(6, i, i % 2 == 0); setFn(i, 6, i % 2 == 0); }

	function finder(cx, cy) {
		for (var dy = -4; dy <= 4; dy++)
			for (var dx = -4; dx <= 4; dx++) {
				var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
				if (xx >= 0 && xx < size && yy >= 0 && yy < size) setFn(xx, yy, d != 2 && d != 4);
			}
	}
	finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

	var align = [];
	if (ver > 1) {
		var na = Math.floor(ver / 7) + 2, step = Math.floor((ver * 8 + na * 3 + 5) / (na * 4 - 4)) * 2;
		for (var p = size - 7; align.length < na - 1; p -= step) align.unshift(p);
		align.unshift(6);
	}
	align.forEach(function(ay, ii) {
		align.forEach(function(ax, jj) {
			if ((ii == 0 && jj == 0) || (ii == 0 && jj == align.length - 1) || (ii == align.length - 1 && jj == 0)) return;
			for (var dy = -2; dy <= 2; dy++)
				for (var dx = -2; dx <= 2; dx++)
					setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
		});
	});

	function formatBits(mask) {
		var d = ECL_BITS[ecl] << 3 | mask, r = d;
		for (var n = 0; n < 10; n++) r = (r << 1) ^ ((r >>> 9) * 0x537);
		var fb = (d << 10 | r) ^ 0x5412, bit = function(n) { return ((fb >>> n) & 1) != 0; };
		for (n = 0; n <= 5; n++) setFn(8, n, bit(n));
		setFn(8, 7, bit(6)); setFn(8, 8, bit(7)); setFn(7, 8, bit(8));
		for (n = 9; n < 15; n++) setFn(14 - n, 8, bit(n));
		for (n = 0; n < 8; n++) setFn(size - 1 - n, 8, bit(n));
		for (n = 8; n < 15; n++) setFn(8, size - 15 + n, bit(n));
		setFn(8, size - 8, true);
	}
	formatBits(0);

	if (ver >= 7) {
		var r = ver;
		for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
		var vb = ver << 12 | r;
		for (i = 0; i < 18; i++) {
			var dk = ((vb >>> i) & 1) != 0, a = size - 11 + i % 3, c = Math.floor(i / 3);
			setFn(a, c, dk); setFn(c, a, dk);
		}
	}

	/* The codewords, two columns at a time, zigzagging up and down. */
	var n = 0;
	for (var right = size - 1; right >= 1; right -= 2) {
		if (right == 6) right = 5;
		for (var vert = 0; vert < size; vert++)
			for (j = 0; j < 2; j++) {
				x = right - j;
				y = ((right + 1) & 2) == 0 ? size - 1 - vert : vert;
				if (!fn[y][x] && n < words.length * 8) {
					mod[y][x] = ((words[n >>> 3] >>> (7 - (n & 7))) & 1) != 0;
					n++;
				}
			}
	}

	function masked(m, x, y) {
		switch (m) {
		case 0: return (x + y) % 2 == 0;
		case 1: return y % 2 == 0;
		case 2: return x % 3 == 0;
		case 3: return (x + y) % 3 == 0;
		case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 == 0;
		case 5: return x * y % 2 + x * y % 3 == 0;
		case 6: return (x * y % 2 + x * y % 3) % 2 == 0;
		default: return ((x + y) % 2 + x * y % 3) % 2 == 0;
		}
	}
	function applyMask(m) {
		for (var y = 0; y < size; y++)
			for (var x = 0; x < size; x++)
				if (!fn[y][x] && masked(m, x, y)) mod[y][x] = !mod[y][x];
	}

	/* Any mask reads; the least blotchy one reads best. Runs, 2x2 blocks and
	   the balance of dark and light are what a scanner minds. */
	function penalty() {
		var s = 0, dark = 0, x, y;
		for (y = 0; y < size; y++) {
			var rr = 1, rc = 1;
			for (x = 0; x < size; x++) {
				if (mod[y][x]) dark++;
				if (x > 0) {
					if (mod[y][x] == mod[y][x - 1]) { if (++rr == 5) s += 3; else if (rr > 5) s++; } else rr = 1;
					if (mod[x][y] == mod[x - 1][y]) { if (++rc == 5) s += 3; else if (rc > 5) s++; } else rc = 1;
				}
				if (x > 0 && y > 0 && mod[y][x] == mod[y][x - 1] && mod[y][x] == mod[y - 1][x] && mod[y][x] == mod[y - 1][x - 1]) s += 3;
			}
		}
		var total = size * size;
		return s + (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
	}

	var best = 0, bestP = Infinity;
	for (var m = 0; m < 8; m++) {
		applyMask(m); formatBits(m);
		var pp = penalty();
		if (pp < bestP) { bestP = pp; best = m; }
		applyMask(m);
	}
	applyMask(best); formatBits(best);
	return mod;
}

/* An SVG of the code, dark on white whatever the theme - a scanner needs the
   contrast - with the four-module quiet zone around it. */
function svg(text, px) {
	var mod = encode(text);
	if (!mod) return null;
	var size = mod.length, q = 4, d = '';
	for (var y = 0; y < size; y++)
		for (var x = 0; x < size; x++)
			if (mod[y][x]) d += 'M' + (x + q) + ' ' + (y + q) + 'h1v1h-1z';
	var w = size + q * 2;
	var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	el.setAttribute('viewBox', '0 0 ' + w + ' ' + w);
	el.setAttribute('width', px || 280);
	el.setAttribute('height', px || 280);
	el.setAttribute('shape-rendering', 'crispEdges');
	el.innerHTML = '<rect width="' + w + '" height="' + w + '" fill="#fff"/><path fill="#000" d="' + d + '"/>';
	return el;
}

return baseclass.extend({
	encode: encode,
	svg: svg
});
