#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>

. "$(dirname "$0")/rig.sh"
rig_setup
sed -i "s|^\. /lib/functions.sh|. $RIG_SRC/test/functions-stub.sh|" "$RIG/lib/zgz-nodes"
ZGZ_TEST_SECTIONS="$RIG/sections"
export ZGZ_TEST_SECTIONS
mkdir -p "$RIG/run/subs"
manual='vless://11111111-2222-3333-4444-555555555555@manual.example:443?security=tls#manual'
subscription='vless://11111111-2222-3333-4444-555555555555@sub.example:443?security=tls#subscription'

sections() {
	printf 'm\tnode\nm\t.link\t%s\nm\t.enabled\t%s\ns\tsubscription\ns\t.enabled\t%s\n' "$manual" "$2" "$1" > "$ZGZ_TEST_SECTIONS"
}
build_check() {
	rig_set sources "$1"
	sh "$RIG/lib/zgz-nodes" build > "$RIG/build.log" 2>&1
	check "$?" "$3" "$4: exit status"
	check "$(cut -f4 "$RIG/run/candidates.tsv" | paste -sd, -)" "$2" "$4: candidates"
}

sections 1 1
printf '%s\n' "$subscription" > "$RIG/run/subs/s.links"
build_check own manual.example 0 'manual only'
build_check both manual.example,sub.example 0 'all sources'
build_check subs sub.example 0 'usable subscription excludes manual nodes'
sections 0 1
build_check subs manual.example 0 'all subscriptions disabled'
sections 1 1
rm -f "$RIG/run/subs/s.links"
build_check subs manual.example 0 'enabled subscription missing its list'
: > "$RIG/run/subs/s.links"
build_check subs manual.example 0 'enabled subscription has an empty list'
printf 'not a config\n' > "$RIG/run/subs/s.links"
build_check subs manual.example 0 'enabled subscription cannot be parsed'
check "$(uci -q get zirgozar.config.sources)" subs 'fallback preserves subscription preference'
sections 1 0
build_check subs '' 1 'disabled manual node is not a fallback'
sections 1 1
printf '%s\n' "$subscription" > "$RIG/run/subs/s.links"
build_check subs sub.example 0 'recovered subscription replaces fallback'
printf 'n0\n' > "$RIG/run/rejected"
build_check subs sub.example 0 'unchanged candidate list'
check "$(cat "$RIG/run/rejected")" n0 'unchanged list preserves rejected nodes'
build_check own manual.example 0 'source switch reassigns n0 to a manual node'
if [ ! -e "$RIG/run/rejected" ]; then ok 'changed list clears rejected tags'; else bad 'changed list clears rejected tags'; fi
printf 'n0\n' > "$RIG/run/rejected"
sections 1 0
build_check own '' 1 'candidate list becomes empty'
if [ ! -e "$RIG/run/rejected" ]; then ok 'empty list clears rejected tags'; else bad 'empty list clears rejected tags'; fi
rig_report
