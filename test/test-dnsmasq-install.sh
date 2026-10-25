#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
export ZGZ_DNSMASQ_CONFIG_ROOT="$RIG/router-etc"
mkdir -p "$ZGZ_DNSMASQ_CONFIG_ROOT/config"
rig_set enabled 0
bounded() { shift; case "$1" in /etc/init.d/dnsmasq) echo restart >> "$ZGZ_RUN/pkg.calls" ;; *) "$@" ;; esac; }
opkg() {
 echo "$*" >> "$ZGZ_RUN/pkg.calls"
 case "$*" in
  'list-installed dnsmasq') [ -f "$ZGZ_RUN/base" ] && echo 'dnsmasq - 2.90' ;;
  *'install --download-only dnsmasq-full') [ "$MIGRATE_MODE" != download-fail ] ;;
  'download dnsmasq') echo rollback > dnsmasq_2.90_test.ipk ;;
  '--force-depends remove dnsmasq') rm -f "$ZGZ_RUN/base"; echo removed > "$ZGZ_DNSMASQ_CONFIG_ROOT/config/dhcp" ;;
  'remove dnsmasq') return 1 ;;
  *'install dnsmasq-full') [ "$MIGRATE_MODE" != install-fail ] || return 1; touch "$ZGZ_RUN/full"; echo replaced > "$ZGZ_DNSMASQ_CONFIG_ROOT/config/dhcp" ;;
  *dnsmasq_2.90_test.ipk) touch "$ZGZ_RUN/base" ;;
 esac
}
apk() { echo "$*" >> "$ZGZ_RUN/pkg.calls"; touch "$ZGZ_RUN/full"; rm -f "$ZGZ_RUN/base"; echo replaced > "$ZGZ_DNSMASQ_CONFIG_ROOT/config/dhcp"; }
for MIGRATE_MODE in success download-fail install-fail apk; do
 export MIGRATE_MODE
 : > "$ZGZ_RUN/pkg.calls"; touch "$ZGZ_RUN/base"; rm -f "$ZGZ_RUN/full"
 echo original > "$ZGZ_DNSMASQ_CONFIG_ROOT/config/dhcp"
 manager=opkg; [ "$MIGRATE_MODE" != apk ] || manager=apk
 rc=0; install_dnsmasq_full "$manager" || rc=$?
 check "$(cat "$ZGZ_DNSMASQ_CONFIG_ROOT/config/dhcp")" original "$MIGRATE_MODE preserves DHCP settings"
 case "$MIGRATE_MODE" in
  success|apk) check "$rc" 0 "$MIGRATE_MODE installs full resolver"; [ -f "$ZGZ_RUN/full" ] && [ ! -f "$ZGZ_RUN/base" ] && ok "$MIGRATE_MODE replaces basic resolver" || bad 'replacement incomplete' ;;
  download-fail) check "$rc" 1 'download failure aborts migration'; if grep -q 'remove dnsmasq' "$ZGZ_RUN/pkg.calls"; then bad 'removed DNS before downloads'; else ok 'download failure keeps basic DNS installed'; fi ;;
  install-fail) check "$rc" 1 'replacement failure remains visible'; [ -f "$ZGZ_RUN/base" ] && ok 'failed replacement restores offline rollback package' || bad 'rollback missing' ;;
 esac
done
rig_report
