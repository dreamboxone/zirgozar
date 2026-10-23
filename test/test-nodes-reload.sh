#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>

. "$(dirname "$0")/rig.sh"
rig_setup
. "$RIG/lib/zgz-common.sh"
sed -i "s|^\. /lib/functions.sh|. $RIG_SRC/test/functions-stub.sh|" "$RIG/lib/zgz-nodes"
ZGZ_TEST_SECTIONS="$RIG/sections"
export ZGZ_TEST_SECTIONS
rig_set sources own
rig_set node fixed-node
printf '#!/bin/sh\nexit 0\n' > "$RIG/lib/zgz-probe"
chmod +x "$RIG/lib/zgz-probe"
eval "$(sed -n '/^reload_service() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zirgozar.init")"
say_status() { :; }
restart() { :; }
STARTED_FLAG="$RIG/run/not-started"

for enabled in 0 1; do
	rig_set enabled "$enabled"
	printf 'm\tnode\nm\t.link\tvless://11111111-2222-3333-4444-555555555555@manual.example:443#manual\nm\t.enabled\t1\n' > "$ZGZ_TEST_SECTIONS"
	: > "$RIG/run/candidates.tsv"
	reload_service
	check "$(cut -f4 "$RIG/run/candidates.tsv")" manual.example "apply addition with enabled=$enabled and fixed node"
	: > "$ZGZ_TEST_SECTIONS"
	reload_service
	check "$(wc -l < "$RIG/run/candidates.tsv" | tr -d ' ')" 0 "apply last deletion clears cache with enabled=$enabled"
done
rig_report
