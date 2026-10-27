#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Resolve once per release build; XRAY_VERSION remains an explicit override.
set -eu

version="${XRAY_VERSION:-}"
if [ -z "$version" ]; then
	version="$(curl -fsSL --connect-timeout 15 --max-time 45 --retry 3 \
		-o /dev/null -w '%{url_effective}' \
		https://github.com/XTLS/Xray-core/releases/latest 2>/dev/null |
		sed -n 's|^https://github.com/XTLS/Xray-core/releases/tag/\([^/?#]*\)$|\1|p')" || version=''
	if [ -z "$version" ]; then
		version="$(curl -fsSL --connect-timeout 15 --max-time 45 --retry 3 \
			https://api.github.com/repos/XTLS/Xray-core/releases/latest 2>/dev/null |
			sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)" || version=''
	fi
fi
valid=1
case "$version" in ''|*[!A-Za-z0-9.-]*) valid=0 ;; esac
if [ "$valid" != 1 ] || ! printf '%s\n' "$version" | grep -Eq '^v[0-9]+(\.[0-9]+){1,3}([.-][A-Za-z0-9]+)*$'; then
	echo 'Could not resolve a valid official Xray release. Retry or set XRAY_VERSION explicitly.' >&2
	exit 1
fi
printf '%s\n' "$version"
