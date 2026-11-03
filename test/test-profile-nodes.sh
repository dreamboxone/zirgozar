#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
. "$(dirname "$0")/rig.sh"
rig_setup
sed -i "s|^\. /lib/functions.sh|. $RIG_SRC/test/functions-stub.sh|" "$RIG/lib/zgz-nodes"
ZGZ_TEST_SECTIONS="$RIG/sections"
export ZGZ_TEST_SECTIONS
profile='{"outbounds":[{"type":"shadowsocks","tag":"one","server":"one.example","server_port":443,"method":"aes-128-gcm","password":"test"},{"type":"shadowsocks","tag":"two","server":"two.example","server_port":443,"method":"aes-128-gcm","password":"test"}]}'
manual='vless://11111111-2222-3333-4444-555555555555@manual.example:443#manual'
rig_set sources own
rig_set p.link "$profile"
rig_set p.name Profile
rig_set m.link "$manual"
printf 'p\tnode\np\t.link\t%s\np\t.name\tProfile\nm\tnode\nm\t.link\t%s\n' "$profile" "$manual" > "$ZGZ_TEST_SECTIONS"
sh "$RIG/lib/zgz-nodes" build
check "$(wc -l < "$RIG/run/candidates.tsv" | tr -d ' ')" 3 'profile and ordinary nodes are imported'
check "$(grep -c 'file:p' "$RIG/run/candidate-sources.tsv")" 2 'profile nodes have a separate source'
row="$(awk -F'\t' '$4=="one.example" {print;exit}' "$RIG/run/candidates.tsv")"
tag="$(printf '%s' "$row" | cut -f1)"
replacement="$(printf '%s\n' "$row" | awk -F'\t' 'BEGIN{OFS="\t"} {$2="renamed";print}')"
printf '%s\n' "$replacement" | sh "$RIG/lib/zgz-nodes" save-record file:p "$tag" "$row"
check "$?" 0 'individual profile edit succeeds'
check "$(awk -F'\t' '$4=="one.example" {print $2}' "$RIG/run/candidates.tsv")" renamed 'profile edit survives rebuild'
check "$(uci -q get zirgozar.p.link)" "$profile" 'editing a member preserves the original profile'
tag="$(awk -F'\t' '$4=="one.example" {print $1;exit}' "$RIG/run/candidates.tsv")"
sh "$RIG/lib/zgz-nodes" drop-file-node p "$tag"
check "$?" 0 'individual profile deletion succeeds'
check "$(cut -f4 "$RIG/run/candidates.tsv" | sort | paste -sd, -)" manual.example,two.example 'deletion preserves other profile members and manual nodes'
check "$(uci -q get zirgozar.p.link)" "$profile" 'deleting a member preserves the profile section'
rig_report
