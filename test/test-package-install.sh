#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
set -u
src="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
common="${AUDIT_COMMON:-$src/package/zirgozar/files/zgz-common.sh}"
cores="${AUDIT_CORES:-$src/package/zirgozar/files/zgz-cores}"
audit_root="$(mktemp -d /tmp/zgz-package-audit.XXXXXX)"
case "$audit_root" in /tmp/zgz-package-audit.*) : ;; *) exit 1 ;; esac
trap 'rm -rf "$audit_root"' EXIT
export ZGZ_RUN="$audit_root/run" ZGZ_ETC="$audit_root/etc" ZGZ_APK_ROOT="$audit_root/apk" ZGZ_RELEASE_FILE="$audit_root/release"
mkdir -p "$ZGZ_RUN" "$ZGZ_ETC" "$ZGZ_APK_ROOT/repositories.d"
printf "DISTRIB_RELEASE='25.12.6'\nDISTRIB_TARGET='ipq40xx/chromium'\n" > "$ZGZ_RELEASE_FILE"
# Redirect paths in old implementations as well, so this regression suite
# can prove their failures without ever reading/writing the real feeds.
sed -e "s|/etc/apk|$ZGZ_APK_ROOT|g" -e "s|/etc/openwrt_release|$ZGZ_RELEASE_FILE|g" "$common" > "$audit_root/common"
. "$audit_root/common"
sed -n '/^install_openvpn() {/,/^}/p' "$cores" > "$audit_root/openvpn"
. "$audit_root/openvpn"
say_message() { printf '%s\n' "$*" > "$audit_root/message"; }
warn() { :; }
log() { :; }
bounded() { shift; "$@"; }
ovpn_pkg_manager() { echo apk; }
ovpn_pkg() { echo openvpn-openssl; }
openvpn_path() { echo /usr/sbin/openvpn; }
core_version() { echo old-version; }
curl_code=0; verify_code=0; update_code=0; install_code=1
apk() {
 case "$1" in
 list) echo 'kernel-6.12.112~abcdef-r1 arm {kernel} [installed]' ;;
 verify) return "$verify_code" ;;
 update) [ "$update_code" = 0 ] || { echo 'DNS lookup failed'; return "$update_code"; } ;;
 add) echo 'kmod-tun: no such package'; return "$install_code" ;;
 esac
}
curl() {
 printf '%s\n' "$*" >> "$audit_root/curl-calls"
 [ "$curl_code" = 0 ] || { echo 'network diagnostic' >&2; return "$curl_code"; }
 while [ "$#" -gt 0 ]; do
  if [ "$1" = -o ]; then shift; echo signed-index > "$1"; fi
  shift
 done
}
pass=0; fail=0
check() {
 if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "ok - $3"
 else fail=$((fail+1)); echo "FAIL - $3 (got $1, wanted $2)"; fi
}
feed="https://downloads.openwrt.org/releases/25.12.6/targets/ipq40xx/chromium/kmods/6.12.112-1-abcdef/packages.adb"
for bad in "# $feed" 'https://downloads.openwrt.org/releases/25.12.6/targets/ipq40xx/chromium/kmods/wrong/packages.adb'; do
 printf '%s\n' "$bad" > "$ZGZ_APK_ROOT/repositories.d/distfeeds.list"
 rm -f "$ZGZ_APK_ROOT/repositories.d/zirgozar-kmods.list" "$audit_root/curl-calls"
 rc=0; ensure_kmods_feed || rc=$?
 check "$rc" 0 'matching repository repair succeeds'
 actual="$(cat "$ZGZ_APK_ROOT/repositories.d/zirgozar-kmods.list" 2>/dev/null)"
 check "$actual" "$feed" 'commented or wrong ABI feed is not accepted as valid'
done
check "$(grep -c -- '-fsSL' "$audit_root/curl-calls")" 1 'repository check uses GET with redirects'
printf '%s\n' "$feed" > "$ZGZ_APK_ROOT/repositories.d/distfeeds.list"
rm -f "$ZGZ_APK_ROOT/repositories.d/zirgozar-kmods.list"
rc=0; install_openvpn || rc=$?
check "$rc" 1 'failed upgrade cannot succeed because an old binary exists'
update_code=1
rc=0; install_openvpn || rc=$?
check "$rc" 1 'failed index refresh aborts the install'
check "$(grep -ic DNS "$audit_root/message")" 1 'index DNS error is preserved instead of blaming firmware'
update_code=0
rm -f "$ZGZ_APK_ROOT/repositories.d/distfeeds.list"
verify_code=1
rc=0; ensure_kmods_feed || rc=$?
check "$rc" 1 'untrusted repository index is rejected'
check "$([ -e "$ZGZ_APK_ROOT/repositories.d/zirgozar-kmods.list" ] && echo yes || echo no)" no 'untrusted repository is never saved'
verify_code=0; curl_code=6
rc=0; ensure_kmods_feed || rc=$?
check "$rc" 1 'repository DNS failure is reported'
check "$(grep -ic DNS "$audit_root/message")" 1 'repository DNS diagnostic is actionable'
if command -v pkg_lock >/dev/null 2>&1; then
 pkg_lock
 printf '. "%s"\npkg_lock\n' "$audit_root/common" > "$audit_root/contender"
 rc=0; sh "$audit_root/contender" 2>/dev/null || rc=$?
 check "$rc" 1 'concurrent package transaction is rejected'
 pkg_unlock
 check "$([ -d "$ZGZ_RUN/package.lock" ] && echo yes || echo no)" no 'transaction lock is released'
else
 fail=$((fail+1)); echo 'FAIL - no package transaction lock'
fi
printf '%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" = 0 ]
