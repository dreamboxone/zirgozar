/* SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 */
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const values = {
 protocol: 'masque', transport: 'h2', scan: 'verified', api_host: 'api.devices.cloudflare.com', api_sni: 'api.devices.cloudflare.com',
 exit_loc_secs: '90', stats: '1', stats_secs: '30', quick_reconnect: '0', h2_peer: '162.159.198.201:443',
 quic_v2: '0', data_check: '0', validate_secs: '15', startup_secs: '45', reconnect_secs: '3', tls_verify: '1',
 tls_ciphers: 'ECDHE-RSA-AES128-GCM-SHA256', tls13_ciphers: 'TLS_AES_128_GCM_SHA256', tls_groups: 'X25519:P-256',
 tls_key_shares: 'X25519', disable_grease: '1', enable_grease_sigalgs: '1', tls_sigalgs: 'rsa_pss_rsae_sha256',
 tls_cert_compression: 'brotli', tls_alps: 'new', tls_trust_anchors: '11129.9.1', tls_server_padding: '6000',
 enable_ech_grease: '1', disable_ocsp_stapling: '1', disable_sct: '1', disable_session_ticket: '1',
 disable_extension_permutation: '1', keepalive: '10', profile_retry: '0', tor_relay_ports: 'any', tor_relays: '80',
 team: 'example', access_id: 'test-id', access_secret: 'test-secret', access_token: 'test-token', gateway: '1',
 route_block: 'port:25,full:blocked.example', route_direct: 'private', perf: 'low', log_level: 'warn',
 route_sniff: '0', route_sniff_ms: '500', wg_endpoint_cooldown_secs: '300', wg_stale_secs: '20',
 masque_h2_keepalive_secs: '20', masque_h2_keepalive_timeout_secs: '30', ironclad_port: '80', max_clients: '128',
 half_close_secs: '30', tcp_keepalive_secs: '60', tcp_connect_secs: '30', reprovision: '0'
};
const booleans = new Set('stats tls_verify disable_grease enable_grease_sigalgs enable_ech_grease disable_ocsp_stapling disable_sct disable_session_ticket disable_extension_permutation gateway'.split(' '));
const negatives = { quick_reconnect: 'no-quick-reconnect', quic_v2: 'no-quic-v2', data_check: 'no-data-check', profile_retry: 'no-profile-retry' };
const envKeys = 'route_sniff route_sniff_ms wg_endpoint_cooldown_secs wg_stale_secs masque_h2_keepalive_secs masque_h2_keepalive_timeout_secs ironclad_port max_clients half_close_secs tcp_keepalive_secs tcp_connect_secs reprovision'.split(' ');
const flag = key => '--' + key.replaceAll('_', '-');
if (process.argv[2] === 'help') {
 console.log('--gool-peer --upstream --masque-sni --tor-only --psiphon-only ' + Object.keys(values).map(flag).join(' ') + ' ' + Object.values(negatives).map(x => '--' + x).join(' '));
} else if (process.argv[2] === 'link') {
 console.log('aether://?' + Object.entries(values).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&'));
} else {
 const args = fs.readFileSync(process.argv[3], 'utf8').trim().split('\n');
 const env = fs.readFileSync(process.argv[4], 'utf8').trim().split('\n');
 for (const [key, value] of Object.entries(values)) {
  if (envKeys.includes(key)) assert.ok(env.includes('AETHER_' + key.toUpperCase() + '=' + value), key);
  else if (key === 'transport') assert.ok(args.includes('--h2'));
  else if (booleans.has(key)) assert.ok(args.includes(flag(key)), key);
  else if (negatives[key]) assert.ok(args.includes('--' + negatives[key]), key);
  else assert.equal(args[args.lastIndexOf(flag(key)) + 1], value, key);
 }
 console.log('Aether 2.4 option forwarding passed');
}
