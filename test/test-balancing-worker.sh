#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
if ! command -v ucode >/dev/null 2>&1; then
	echo 'skip - balancing worker regression needs ucode'
	exit 0
fi
rig_setup
export REGRESSION_TRACE="$RIG/trace"
export ZGZ_LOG="$RIG/worker.log"
cat >> "$ZGZ_LIB/zgz-common.sh" <<'EOF'
find_xray() { echo "$REGRESSION_TRACE/core"; }
EOF
mkdir -p "$REGRESSION_TRACE"
cat > "$REGRESSION_TRACE/core" <<'EOF'
#!/bin/sh
trap 'touch "$REGRESSION_TRACE/core-stopped"; exit 0' TERM INT
if [ "$ZGZ_TEST_FAIL" = core ]; then sleep 1; exit 7; fi
while :; do sleep 1; done
EOF
cat > "$REGRESSION_TRACE/helper" <<'EOF'
#!/bin/sh
trap 'touch "$REGRESSION_TRACE/helper-stopped"; exit 0' TERM INT
if [ "$ZGZ_TEST_FAIL" = helper ]; then sleep 1; exit 9; fi
while :; do sleep 1; done
EOF
cat > "$ZGZ_LIB/zgz-mkconfig" <<'EOF'
#!/bin/sh
echo '{"inbounds":[],"outbounds":[],"routing":{"rules":[]}}'
EOF
cat > "$ZGZ_LIB/zgz-bridge" <<'EOF'
#!/bin/sh
echo "$REGRESSION_TRACE/helper"
EOF
printf '#!/bin/sh\nexit 0\n' > "$RIG/bin/curl"
chmod +x "$REGRESSION_TRACE/core" "$REGRESSION_TRACE/helper" "$RIG/bin/curl"
export ZGZ_TEST_FAIL=core
printf 'test\ttest\tikev2\t192.0.2.1\t500\t{"type":"ikev2"}\n' | "$ZGZ_LIB/zgz-balancing" prepare 997 >/dev/null
work="$(tail -1 "$ZGZ_RUN/balancing.instances")"
if "$ZGZ_LIB/zgz-balancing" run "$work"; then bad 'dead core accepted'; else ok 'core failure exits the worker'; fi
check "$(cat "$work/status")" failed 'dead core marks the member failed'
check "$(cat "$work/retries")" 1 'first failure persists its retry count'
if [ -f "$REGRESSION_TRACE/helper-stopped" ]; then ok 'core failure terminates its helper'; else bad 'helper left alive'; fi
if grep -q 'Xray exited with status 7' "$ZGZ_LOG"; then ok 'core exit code is recorded'; else bad 'core exit diagnostic'; fi
export ZGZ_TEST_FAIL=helper
start="$(date +%s)"
"$ZGZ_LIB/zgz-balancing" run "$work" >/dev/null 2>&1
elapsed=$(($(date +%s) - start))
if [ "$elapsed" -ge 5 ]; then ok 'repeated failure waits before launching children'; else bad 'retry did not wait'; fi
check "$(cat "$work/retries")" 2 'repeated failure increases retry history'
if [ -f "$REGRESSION_TRACE/core-stopped" ]; then ok 'helper failure terminates its core'; else bad 'core left alive'; fi
if grep -q 'tunnel helper exited with status 9' "$ZGZ_LOG"; then ok 'helper exit code is recorded separately'; else bad 'helper exit diagnostic'; fi
# Stopping during the longest backoff must not wait five minutes or start
# another tunnel after an administrator has stopped the worker.
echo 8 > "$work/retries"
"$ZGZ_LIB/zgz-balancing" run "$work" >/dev/null 2>&1 &
pid=$!
sleep 1
start="$(date +%s)"
kill "$pid"
wait "$pid" 2>/dev/null || true
elapsed=$(($(date +%s) - start))
if [ "$elapsed" -le 3 ]; then ok 'stop interrupts a capped backoff promptly'; else bad 'stop blocked by backoff'; fi
check "$(cat "$work/retries")" 8 'cancelled backoff does not start another attempt'
check "$(cat "$work/status")" stopped 'cancelled backoff is reported as stopped'

# Advance only the worker health clock; real process waits remain real.
cat > "$RIG/bin/date" <<'EOF'
#!/bin/sh
if [ "$1" != +%s ]; then exec /bin/date "$@"; fi
n="$(cat "$REGRESSION_TRACE/clock" 2>/dev/null)" || n=0
n=$((n + 100))
echo "$n" > "$REGRESSION_TRACE/clock"
echo "$n"
EOF
printf '#!/bin/sh\nexit 1\n' > "$RIG/bin/curl"
chmod +x "$RIG/bin/date"
export ZGZ_TEST_FAIL=none
echo 0 > "$work/retries"
"$ZGZ_LIB/zgz-balancing" run "$work" >/dev/null 2>&1
check "$(cat "$work/status")" failed 'live processes with repeated failed requests are restarted'
if grep -q 'three connectivity tests failed' "$ZGZ_LOG"; then ok 'probe failures explain the member restart'; else bad 'probe failure diagnostic'; fi
printf '#!/bin/sh\nexit 0\n' > "$RIG/bin/curl"
echo 0 > "$work/retries"
"$ZGZ_LIB/zgz-balancing" run "$work" >/dev/null 2>&1 &
pid=$!
n=0
while [ "$n" -lt 15 ]; do
 [ "$(cat "$work/retries")" = 0 ] && [ "$(cat "$work/status")" = connected ] && break
 sleep 1; n=$((n + 1))
done
check "$(cat "$work/retries")" 0 'sustained successful requests reset retry history'
kill "$pid"
wait "$pid" 2>/dev/null || true
rig_report
