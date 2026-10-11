#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
cat >> "$RIG/lib/zgz-common.sh" <<'EOF'
tunnel_running() { return 0; }
bounded() { printf '%s\n' "$*" >> "$ZGZ_RUN/service.calls"; echo ready > "$ZGZ_STATUS"; return 0; }
EOF
cat > "$RIG/lib/zgz-test" <<'EOF'
#!/bin/sh
if [ "$1" = url ]; then
 mkdir -p "$ZGZ_RUN/tests"
 cat "$ZGZ_RUN/candidate.delay" > "$ZGZ_RUN/tests/$2.url"
 exit 0
fi
cat "$ZGZ_RUN/live.delay"
[ "$(cat "$ZGZ_RUN/live.delay")" -gt 0 ]
EOF
cat > "$RIG/lib/zgz-rules" <<'EOF'
#!/bin/sh
echo 'active: yes'
EOF
cp "$RIG/lib/zgz-connect" "$RIG/connect-real"
cat > "$RIG/lib/zgz-connect" <<'EOF'
#!/bin/sh
printf '%s\n' "$1" >> "$ZGZ_RUN/repair.calls"
EOF
cat > "$RIG/lib/zgz-nodes" <<'EOF'
#!/bin/sh
printf '%s\n' "$1" >> "$ZGZ_RUN/nodes.calls"
EOF
chmod +x "$RIG/lib/zgz-test" "$RIG/lib/zgz-rules" "$RIG/lib/zgz-connect" "$RIG/lib/zgz-nodes"
rig_set enabled 1
rig_set start_daemon 1
printf '{"protocol":"freedom"}\n' > "$RIG/etc/best.json"
echo 200 > "$RIG/run/live.delay"
health() { sh "$RIG/lib/zgz-refresh" health >/dev/null 2>&1; }
health
check "$(cat "$RIG/run/health.baseline")" 200 'first healthy request establishes a baseline'
if [ ! -e "$RIG/run/nodes.calls" ]; then ok 'health checks do not fetch subscriptions'; else bad 'health checks do not fetch subscriptions'; fi
echo 2000 > "$RIG/run/live.delay"
health
check "$(cat "$RIG/run/health.slow")" 1 'one slow request cannot switch the config'
health
check "$(cat "$RIG/run/repair.calls")" degraded 'repeated slow requests trigger an alternative check'
health
check "$(wc -l < "$RIG/run/repair.calls" | tr -d ' ')" 1 'cooldown prevents repeated full sweeps'
echo 200 > "$RIG/run/live.delay"
health
if [ ! -e "$RIG/run/health.slow" ]; then ok 'recovery clears the slow counter'; else bad 'recovery clears the slow counter'; fi
echo 0 > "$RIG/run/live.delay"
health
check "$(cat "$RIG/run/health.fail")" 1 'one failed request cannot repair the tunnel'
health
check "$(tail -1 "$RIG/run/repair.calls")" force 'two failed requests trigger repair'
rig_set node manual1
echo 200 > "$RIG/run/live.delay"
health
rm -f "$RIG/run/health.sweep"
echo 2500 > "$RIG/run/live.delay"
health; health
check "$(tail -1 "$RIG/run/repair.calls")" force 'slow checks preserve a manually selected config'
rig_set node ''
touch "$RIG/run/schedule.stopped"
echo 0 > "$RIG/run/live.delay"
health
if [ ! -e "$RIG/run/health.fail" ]; then ok 'a scheduled stop suppresses health checks'; else bad 'a scheduled stop suppresses health checks'; fi
rm "$RIG/run/schedule.stopped"
mkdir -p "$RIG/run/lock"; echo $$ > "$RIG/run/lock/pid"
health
if [ ! -e "$RIG/run/health.fail" ]; then ok 'a busy connection operation suppresses health checks'; else bad 'a busy connection operation suppresses health checks'; fi
rm -rf "$RIG/run/lock"
rig_set start_daemon 0
health
if [ ! -e "$RIG/run/health.fail" ]; then ok 'disabled daemon suppresses health checks'; else bad 'disabled daemon suppresses health checks'; fi
rig_set start_daemon 1

# Exercise the real replacement operation with measured routes.
cp "$RIG/connect-real" "$RIG/lib/zgz-connect"
cat > "$RIG/lib/zgz-probe" <<'EOF'
#!/bin/sh
case "$1" in
 measure) printf 'n1\t600\n' ;;
 pick) echo '{"protocol":"socks"}' > "$ZGZ_ETC/best.json"; echo picked >> "$ZGZ_RUN/picked" ;;
esac
EOF
chmod +x "$RIG/lib/zgz-probe"
signature=$(sha256sum "$RIG/etc/best.json")
echo 1000 > "$RIG/run/candidate.delay"
echo 1600 > "$RIG/run/live.delay"
sh "$RIG/lib/zgz-connect" degraded "$signature" >/dev/null 2>&1
check "$(cat "$RIG/run/picked")" picked 'confirmed replacement must be more than 1.5 times faster'
check "$(grep -c 'zirgozar restart' "$RIG/run/service.calls")" 1 'confirmed replacement restarts once'
signature=$(sha256sum "$RIG/etc/best.json")
echo 1200 > "$RIG/run/candidate.delay"
sh "$RIG/lib/zgz-connect" degraded "$signature" >/dev/null 2>&1
check "$(wc -l < "$RIG/run/picked" | tr -d ' ')" 1 'small improvements do not switch'
echo 600 > "$RIG/run/candidate.delay"
echo 1200 > "$RIG/run/live.delay"
sh "$RIG/lib/zgz-connect" degraded "$signature" >/dev/null 2>&1
check "$(wc -l < "$RIG/run/picked" | tr -d ' ')" 1 'recovered current route does not switch'
echo 3000 > "$RIG/run/live.delay"
echo 0 > "$RIG/run/candidate.delay"
sh "$RIG/lib/zgz-connect" degraded "$signature" >/dev/null 2>&1
check "$(wc -l < "$RIG/run/picked" | tr -d ' ')" 1 'failed candidate confirmation does not switch'
echo 500 > "$RIG/run/candidate.delay"
sh "$RIG/lib/zgz-connect" degraded stale >/dev/null 2>&1
check "$(wc -l < "$RIG/run/picked" | tr -d ' ')" 1 'a changed current config cancels a stale replacement'
rig_report
