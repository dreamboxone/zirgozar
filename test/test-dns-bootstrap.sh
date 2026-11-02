#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
set -eu
command -v ucode >/dev/null 2>&1 || exit 0
root="$(cd "$(dirname "$0")/.." && pwd)"
task="$(mktemp -d /tmp/zgz-bootstrap-test.XXXXXX)"
trap 'rm -rf "$task"' EXIT
mkdir -p "$task/lib" "$task/run" "$task/bin"
export ZGZ_LIB="$task/lib" ZGZ_RUN="$task/run" DNS_TEST_MODE=A DNS_TEST_CONNECTED=1
cat > "$ZGZ_LIB/zgz-common.sh" <<'SH'
tunnel_running() { [ "$DNS_TEST_CONNECTED" = 1 ]; }
cfg() { echo 1070; }
SH
cat > "$task/bin/curl" <<'SH'
#!/bin/sh
args="$*"
case "$args" in *'--socks5-hostname 127.0.0.1:1070'*'--connect-to dns.google:443:8.8.8.8:443'*) : ;; *) exit 1 ;; esac
case "$args" in *'--insecure'*|*' -k '*) exit 1 ;; esac
case "$DNS_TEST_MODE:$args" in
 A:*) echo '{"Status":0,"Answer":[{"type":1,"data":"203.0.113.5"}]}' ;;
 AAAA:*type=AAAA*) echo '{"Status":0,"Answer":[{"type":28,"data":"2001:db8::5"}]}' ;;
 *) echo '{"Status":0,"Answer":[{"type":1,"data":"999.1.1.1"}]}' ;;
esac
SH
chmod +x "$task/bin/curl"
export PATH="$task/bin:$PATH"
check() {
 result="$(sh "$root/package/zirgozar/files/zgz-doh-bootstrap" "$1")"
 printf '%s' "$result" | ucode -e 'import {readfile} from "fs"; let r=json(readfile("/dev/stdin")); if(r.ok!=(ARGV[0]=="true") || (ARGV[1] && r.ip!=ARGV[1])) {warn(sprintf("%J",r));exit(1);}' "$2" "${3:-}"
 [ -z "$(find "$ZGZ_RUN" -mindepth 1 -print -quit)" ]
}
check https://dns.malw.link/dns-query true 203.0.113.5
DNS_TEST_MODE=AAAA;export DNS_TEST_MODE
check https://dns.malw.link/ true 2001:db8::5
DNS_TEST_MODE=invalid;export DNS_TEST_MODE
check https://dns.malw.link/ false
DNS_TEST_CONNECTED=0;export DNS_TEST_CONNECTED
check https://dns.malw.link/ false
check http://dns.malw.link/ false
check 'https://bad..example/' false
echo 'Bootstrap DNS: tunnel-only lookup, A/AAAA, invalid results, disconnected state and cleanup passed'
