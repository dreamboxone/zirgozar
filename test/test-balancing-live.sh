#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Explicit live test: RIG_XRAY must name a real core, and port 1070 must
# already carry traffic. No router firewall or DNS settings are changed.
. "$(dirname "$0")/rig.sh"
[ -n "${RIG_XRAY:-}" ] && [ -x "$RIG_XRAY" ] || { echo 'skip - set RIG_XRAY for the live startup test'; exit 0; }
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
export ZGZ_LOG="$RIG/live.log"
rig_set tproxy_port 31080
rig_set node_socks_port 31081
rig_set test_url 'http://www.gstatic.com/generate_204'
printf 'protocol=balancing\n' > "$ZGZ_BEST_META"
STARTED_FLAG="$ZGZ_RUN/started"
touch "$STARTED_FLAG"
RULES="$RIG/bin/rules"
DNS="$RIG/bin/noop"
STATS="$DNS"
cat > "$RULES" <<'EOF'
#!/bin/sh
echo 'backend: test'
exit 0
EOF
printf '#!/bin/sh\nexit 0\n' > "$DNS"
chmod +x "$RULES" "$DNS"
eval "$(sed -n '/^service_started() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zirgozar.init")"
eval "$(sed -n '/^report_ready() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zirgozar.init")"
eval "$(sed -n '/^listening() {/,/^}/p' "$RIG_SRC/package/zirgozar/files/zirgozar.init")"
dns_signature() { echo isolated-live-test; }
bridge_wanted() { return 1; }
active_engine() { echo xray; }
core_pid=''
stop_core() {
 [ -z "$core_pid" ] || { kill "$core_pid" 2>/dev/null || true; wait "$core_pid" 2>/dev/null || true; }
 core_pid=''
}
trap stop_core EXIT
trap 'exit 1' INT TERM
start_core() {
 stop_core
 cat > "$ZGZ_CONFIG_JSON" <<EOF
{"log":{"loglevel":"warning"},"inbounds":[
{"tag":"transparent","listen":"127.0.0.1","port":31080,"protocol":"socks","settings":{"udp":false}},
{"tag":"test","listen":"127.0.0.1","port":31081,"protocol":"socks","settings":{"udp":false}}],
"outbounds":[{"protocol":"socks","settings":{"servers":[{"address":"127.0.0.1","port":$1}]},"streamSettings":{"sockopt":{"mark":255}}}]}
EOF
 "$RIG_XRAY" run -config "$ZGZ_CONFIG_JSON" >> "$RIG/core.log" 2>&1 &
 core_pid=$!
 n=0
 until listening 31080; do
  n=$((n + 1))
  if [ "$n" -gt 10 ] || ! kill -0 "$core_pid" 2>/dev/null; then bad 'isolated live core did not start'; return 1; fi
  sleep 1
 done
}
start_core 9 || { rig_report; exit 1; }
service_started
check "$(cat "$ZGZ_STATUS")" failed 'listening sockets without a working route cannot report ready'
if grep -q 'connectivity test failed' "$ZGZ_MESSAGE"; then ok 'failed startup explains the connectivity failure'; else bad 'startup failure message'; fi
start_core 1070 || { rig_report; exit 1; }
service_started
check "$(cat "$ZGZ_STATUS")" ready 'successful real HTTP request allows ready'
check "$(cat "$ZGZ_MESSAGE" 2>/dev/null)" '' 'successful recovery clears its old balancing error'
stop_core
trap - EXIT
rig_report
