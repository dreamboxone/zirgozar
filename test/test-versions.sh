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

for pair in 'v1.14.3-lx.23 1.14.3-lx.24-rc.1 1' 'v1.14.3-lx.24 1.14.3-lx.24-rc.1 0' 'v1.14.3-lx.24-rc.2 1.14.3-lx.24-rc.1 0' 'v1.14.3-lx.24-rc.1 1.14.3-lx.24 1' 'v1.14.3-lx.24-rc.1 1.14.3-lx.24-rc.1 1' 'v1.14.3-lx.23 1.14.3-lx.9 0' 'v1.14.4-lx.1 1.14.3-lx.24 0'; do
 set -- $pair
 ver_newer "$1" "$2"
 check "$?" "$3" "LX ordering: $1 versus $2"
done

echo '== repository-managed core version checks'
. "$RIG/lib/zgz-common.sh"
sed -n '/^pkg_latest() {/,/^}/p; /^ovpn_latest() {/,/^}/p; /^cmd_latest() {/,/^}/p' "$RIG/lib/zgz-cores" > "$RIG/run/package-version-functions.sh"
. "$RIG/run/package-version-functions.sh"
LATEST_CACHE="$RIG/run/latest"
CORE_RESULT="$RIG/run/core-result"
APP_CHECKED="$RIG/run/app-checked"
APP_MAX_AGE=3600
LATEST_MAX_AGE=43200
manager=apk
ovpn_pkg_manager() { echo "$manager"; }
ovpn_pkg() { echo openvpn-openssl; }
latest_of() { awk -F '\t' -v name="$1" '$1 == name { print $2; exit }' "$LATEST_CACHE"; }
app_latest() { :; }
for package_manager in apk opkg; do
	cat > "$RIG/bin/$package_manager" <<'PKG'
#!/bin/sh
echo "$*" >> "$ZGZ_RUN/package-calls"
case "$1" in
	update)
		[ "${ZGZ_TEST_REFRESH_FAIL:-0}" = 0 ] || { echo 'TLS error' >&2; exit 1; }
		echo 2.7.7 > "$ZGZ_RUN/feed-version" ;;
	search) echo "$3-$(cat "$ZGZ_RUN/feed-version")-r1" ;;
	list) echo "$2 - $(cat "$ZGZ_RUN/feed-version")-1" ;;
esac
PKG
	chmod +x "$RIG/bin/$package_manager"
done
for manager in apk opkg; do
	echo 2.7.6 > "$RIG/run/feed-version"
	printf 'openvpn\t2.7.6\nxray\t26.10.22\n' > "$LATEST_CACHE"
	: > "$RIG/run/package-calls"
	cmd_latest force openvpn
	check "$(latest_of openvpn)" 2.7.7 "$manager check reads the refreshed feed version"
	check "$(head -1 "$RIG/run/package-calls")" update "$manager refresh precedes version lookup"
	check "$(latest_of xray)" 26.10.22 "$manager targeted check preserves other core versions"
	: > "$RIG/run/package-calls"
	cmd_latest '' ''
	check "$(wc -l < "$RIG/run/package-calls" | tr -d ' ')" 0 "$manager background poll does not refresh repositories"
	export ZGZ_TEST_REFRESH_FAIL=1
	cmd_latest force openvpn >/dev/null 2>&1
	check "$?" 1 "$manager refresh failure is reported"
	check "$(latest_of openvpn)" '' "$manager failed refresh clears stale latest version"
	case "$(cat "$CORE_RESULT")" in openvpn\ error\ *) ok "$manager failure is available to the interface" ;; *) bad "$manager missing check error" ;; esac
	unset ZGZ_TEST_REFRESH_FAIL
	cmd_latest force openvpn
	check "$(latest_of openvpn)" 2.7.7 "$manager retry recovers the version"
	if [ ! -e "$CORE_RESULT" ]; then ok "$manager retry clears the previous error"; else bad "$manager retry leaves a stale error"; fi
done
rig_report
