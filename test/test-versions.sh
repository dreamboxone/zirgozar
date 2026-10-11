#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
sed -n '/^ver_key() {/,/^}/p; /^ver_newer() {/,/^}/p' "$RIG/lib/zgz-cores" > "$RIG/run/version-functions.sh"
. "$RIG/run/version-functions.sh"
ver_newer v5.7.19-r2 5.7.19-r1
check "$?" 0 'revision two updates revision one'
ver_newer v5.7.19-r1 5.7.19-r2
check "$?" 1 'revision one cannot downgrade revision two'
ver_newer v5.7.19-r2 5.7.19-r2
check "$?" 1 'an installed revision is not an update'
ver_newer v5.7.20-r1 5.7.19-r2
check "$?" 0 'the next date takes precedence over the revision'
ver_newer v5.7.18-r9 5.7.19-r1
check "$?" 1 'a higher revision of an older date is not an update'
ver_newer v26.9.9 26.3.27
check "$?" 0 'ordinary core version ordering is preserved'
rig_report
