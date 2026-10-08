#!/bin/sh
#
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar
#
# A stand-in for OpenWrt's /lib/functions.sh, just enough of it for the
# config_foreach loops the scripts run: the sections are read from the file
# ZGZ_TEST_SECTIONS names, one line "section<TAB>type" for each section and
# "section<TAB>.option<TAB>value" for each option, \n in a value for a new line.
config_load() { :; }
config_foreach() {
	_cf_fn="$1"; _cf_type="$2"; shift 2
	for _cf_s in $(awk -F'\t' -v t="$_cf_type" 'NF == 2 && $2 == t { print $1 }' "$ZGZ_TEST_SECTIONS"); do
		"$_cf_fn" "$_cf_s" "$@"
	done
}
config_get() {
	_cg_var="$1"; _cg_s="$2"; _cg_o="$3"; _cg_d="$4"
	_cg_v="$(awk -F'\t' -v s="$_cg_s" -v o=".$_cg_o" '$1 == s && $2 == o { print $3; f = 1; exit } END { exit !f }' "$ZGZ_TEST_SECTIONS")" || _cg_v="$_cg_d"
	_cg_v="$(printf '%b' "$_cg_v")"
	eval "$_cg_var=\$_cg_v"
}
config_get_bool() {
	config_get "$1" "$2" "$3" "$4"
	eval "_cb=\$$1"
	case "$_cb" in 1|on|true|yes|enabled) eval "$1=1" ;; *) eval "$1=0" ;; esac
}
