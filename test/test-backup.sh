#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar
#
# Backup and Restore: what goes in the file, that it comes back as it was,
# and that a file this program did not make writes nothing.

. "$(dirname "$0")/rig.sh"
rig_setup

ZGZ_UCI_DIR="$RIG/config"
ZGZ_BACKUP_OUT="$RIG/backup.tar"
ZGZ_RESTORE_IN="$RIG/restore"
ZGZ_CRONTAB="$RIG/crontab"
export ZGZ_UCI_DIR ZGZ_BACKUP_OUT ZGZ_RESTORE_IN ZGZ_CRONTAB
: > "$ZGZ_CRONTAB"
mkdir -p "$ZGZ_UCI_DIR" "$ZGZ_ETC/warp/n1/primary" "$ZGZ_ETC/geo" "$ZGZ_ETC/subs" "$ZGZ_ETC/aether/a1/identity.toml-psiphon"
printf "config zirgozar 'config'\n\toption node 'n1'\n" > "$ZGZ_UCI_DIR/zirgozar"
printf "config global 'global'\n\toption enable '0'\n" > "$ZGZ_UCI_DIR/zirgozar_server"
echo account > "$ZGZ_ETC/warp/n1/wgcf-account.toml"
echo identity > "$ZGZ_ETC/warp/n1/primary/wgcf-identity.json"
echo big > "$ZGZ_ETC/geo/geosite.dat"
echo ips > "$ZGZ_ETC/geo/geoip.dat"
echo key > "$ZGZ_ETC/aether/a1/identity.toml"
echo servers > "$ZGZ_ETC/aether/a1/identity.toml-psiphon/list"
echo cached > "$ZGZ_ETC/subs/default.links"
echo 5.7.21-r3 > "$ZGZ_ETC/version"
ROUTER="$RIG/lib/zgz-router"

sh "$ROUTER" backup >/dev/null 2>&1
check "$?" 0 'backup is made'
_list="$(tar -tf "$ZGZ_BACKUP_OUT" 2>/dev/null | sed 's#^\./##' | sort | tr '\n' ' ')"
case "$_list" in
	*etc/config/zirgozar\ *) ok 'backup holds the settings' ;;
	*) bad "backup lacks the settings: $_list" ;;
esac
case "$_list" in
	*etc/config/zirgozar_server*) ok 'backup holds the server settings' ;;
	*) bad 'backup lacks the server settings' ;;
esac
case "$_list" in
	*etc/zirgozar/warp/n1/wgcf-account.toml*) ok 'backup holds the WARP accounts' ;;
	*) bad 'backup lacks the WARP accounts' ;;
esac
case "$_list" in
	*geo/geoip.dat*geo/geosite.dat*) ok 'backup holds the routing data' ;;
	*) bad "backup lacks the routing data: $_list" ;;
esac
case "$_list" in
	*etc/zirgozar/aether/a1/identity.toml\ *) ok 'backup holds the Aether keys' ;;
	*) bad 'backup lacks the Aether keys' ;;
esac
case "$_list" in
	*subs*|*psiphon*) bad 'backup carries data that is fetched again' ;;
	*) ok 'subscription caches and Psiphon lists are left out' ;;
esac

# Changed after the backup, then restored: back as it was.
printf "config zirgozar 'config'\n\toption node 'n2'\n" > "$ZGZ_UCI_DIR/zirgozar"
rm -rf "$ZGZ_ETC/warp" "$ZGZ_ETC/geo" "$ZGZ_ETC/aether"
echo '{}' > "$ZGZ_ETC/best.json"
cp "$ZGZ_BACKUP_OUT" "$ZGZ_RESTORE_IN"
sh "$ROUTER" restore >/dev/null 2>&1
check "$?" 0 'restore succeeds'
check "$(sed -n "s/.*option node '\(.*\)'/\1/p" "$ZGZ_UCI_DIR/zirgozar")" n1 'settings are back as they were'
check "$(cat "$ZGZ_ETC/warp/n1/wgcf-account.toml" 2>/dev/null)" account 'WARP accounts are back'
check "$(cat "$ZGZ_ETC/warp/n1/primary/wgcf-identity.json" 2>/dev/null)" identity 'and the ones in folders of their own'
check "$(cat "$ZGZ_ETC/geo/geosite.dat" 2>/dev/null)" big 'routing data is back'
check "$(cat "$ZGZ_ETC/aether/a1/identity.toml" 2>/dev/null)" key 'Aether keys are back'

# A packed backup, as earlier versions made, is read as well.
printf "config zirgozar 'config'\n\toption node 'n2'\n" > "$ZGZ_UCI_DIR/zirgozar"
gzip -c "$ZGZ_BACKUP_OUT" > "$ZGZ_RESTORE_IN"
sh "$ROUTER" restore >/dev/null 2>&1
check "$?" 0 'a packed backup is restored'
check "$(sed -n "s/.*option node '\(.*\)'/\1/p" "$ZGZ_UCI_DIR/zirgozar")" n1 'and its settings are back'
[ -e "$ZGZ_ETC/best.json" ] && bad 'the node chosen under the old settings is kept' || ok 'the node chosen under the old settings is dropped'
[ -e "$ZGZ_RESTORE_IN" ] && bad 'the received file is left behind' || ok 'the received file is removed'

# Files this program did not make.
W="$RIG/foreign"
mkdir -p "$W/etc/config" "$W/etc/zirgozar"
printf "config zirgozar 'config'\n\toption node 'evil'\n" > "$W/etc/config/zirgozar"
echo zirgozar-backup > "$W/zirgozar-backup"
echo x > "$W/etc/passwd"
( cd "$W" && tar -czf "$ZGZ_RESTORE_IN" zirgozar-backup etc )
_out="$(sh "$ROUTER" restore 2>/dev/null)"
check "$?" 1 'an archive with another file in it is refused'
check "$_out" 'This is not a Zirgozar backup file.' 'and says why'
check "$(sed -n "s/.*option node '\(.*\)'/\1/p" "$ZGZ_UCI_DIR/zirgozar")" n1 'and nothing was replaced'

rm -f "$W/etc/passwd" "$W/zirgozar-backup"
( cd "$W" && tar -czf "$ZGZ_RESTORE_IN" etc )
sh "$ROUTER" restore >/dev/null 2>&1
check "$?" 1 'an archive without the backup mark is refused'

ln -s /etc/shadow "$W/etc/zirgozar/warp" 2>/dev/null
echo zirgozar-backup > "$W/zirgozar-backup"
( cd "$W" && tar -czf "$ZGZ_RESTORE_IN" zirgozar-backup etc )
sh "$ROUTER" restore >/dev/null 2>&1
check "$?" 1 'an archive with a link in it is refused'

rm -rf "$W"; mkdir -p "$W/etc/config" "$W/geo"
printf "config zirgozar 'config'
	option node 'evil'
" > "$W/etc/config/zirgozar"
echo zirgozar-backup > "$W/zirgozar-backup"
mkdir -p "$W/geo/sub"; echo x > "$W/geo/sub/f"
( cd "$W" && tar -czf "$ZGZ_RESTORE_IN" zirgozar-backup etc geo )
sh "$ROUTER" restore >/dev/null 2>&1
check "$?" 1 'an archive with a folder inside the routing data is refused'

echo 'not an archive' > "$ZGZ_RESTORE_IN"
sh "$ROUTER" restore >/dev/null 2>&1
check "$?" 1 'a file that is not an archive is refused'
check "$(sed -n "s/.*option node '\(.*\)'/\1/p" "$ZGZ_UCI_DIR/zirgozar")" n1 'the settings are untouched by all of them'

rig_report
