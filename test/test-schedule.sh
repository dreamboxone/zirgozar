#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>

. "$(dirname "$0")/rig.sh"
rig_setup
mv "$RIG/bin/uci" "$RIG/bin/uci-base"
cat > "$RIG/bin/uci" <<'EOF'
#!/bin/sh
case " $* " in
 *' show '*) printf 'zirgozar.default=subscription\nzirgozar.patterniha=subscription\n' ;;
 *' get zirgozar.default '*|*' get zirgozar.patterniha '*) echo subscription ;;
 *) exec "$(dirname "$0")/uci-base" "$@" ;;
esac
EOF
chmod +x "$RIG/bin/uci"
ZGZ_CRONTAB="$RIG/crontab"
export ZGZ_CRONTAB
printf '*/15 * * * * /usr/libexec/zgz-refresh >/dev/null 2>&1\n' > "$ZGZ_CRONTAB"
rig_set default.enabled 1
rig_set default.update_week_mode refresh
rig_set default.update_minute_offset 5
rig_set patterniha.enabled 1
rig_set patterniha.update_week_mode refresh
rig_set patterniha.update_minute_offset 0
sh "$RIG/lib/zgz-router" schedule sync >/dev/null 2>&1
check "$?" 0 'subscription schedule sync succeeds'
check "$(grep 'schedule sub patterniha' "$ZGZ_CRONTAB" | cut -d' ' -f1)" '0,15,30,45' 'Patterniha runs every quarter hour'
check "$(grep 'schedule sub default' "$ZGZ_CRONTAB" | cut -d' ' -f1)" '5,20,35,50' 'Top 100 runs five minutes later'
sh "$RIG/lib/zgz-router" schedule sync >/dev/null 2>&1
check "$(grep -c 'schedule sub' "$ZGZ_CRONTAB")" 2 'schedule sync does not duplicate jobs'
rig_set patterniha.enabled 0
sh "$RIG/lib/zgz-router" schedule sync >/dev/null 2>&1
check "$(grep -c 'schedule sub patterniha' "$ZGZ_CRONTAB")" 0 'disabled subscription loses its scheduled job'
check "$(grep -c 'zgz-refresh' "$ZGZ_CRONTAB")" 1 'subscription maintenance is preserved'
rig_set enabled 1
sh "$RIG/lib/zgz-router" schedule sync >/dev/null 2>&1
check "$(grep 'schedule health' "$ZGZ_CRONTAB" | cut -d' ' -f1)" '*/3' 'health checks have an independent three-minute schedule'
rig_set health_interval 5
sh "$RIG/lib/zgz-router" schedule sync >/dev/null 2>&1
check "$(grep 'schedule health' "$ZGZ_CRONTAB" | cut -d' ' -f1)" '*/5' 'changing the health interval replaces its job'
check "$(grep -c 'schedule health' "$ZGZ_CRONTAB")" 1 'health jobs are not duplicated'
rig_set start_daemon 0
sh "$RIG/lib/zgz-router" schedule sync >/dev/null 2>&1
check "$(grep -c 'schedule health' "$ZGZ_CRONTAB")" 0 'disabled daemon removes its health job'
cat > "$RIG/lib/zgz-nodes" <<'EOF'
#!/bin/sh
printf '%s\n' "$*" >> "$ZGZ_RUN/fetched"
EOF
chmod +x "$RIG/lib/zgz-nodes"
rig_set sources both
sh "$RIG/lib/zgz-router" schedule sub patterniha >/dev/null 2>&1
if [ ! -e "$RIG/run/fetched" ]; then ok 'stale job cannot fetch a disabled subscription'; else bad 'stale job cannot fetch a disabled subscription'; fi
sh "$RIG/lib/zgz-router" schedule sub default >/dev/null 2>&1
check "$(cat "$RIG/run/fetched")" 'update default' 'scheduled job updates only its own subscription'
rig_report
