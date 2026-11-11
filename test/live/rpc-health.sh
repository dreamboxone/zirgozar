#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Run on an OpenWrt router after installing zgz-rpc. Only a private ubus
# socket and private rpcd process are fault-injected or restarted.
set -eu
WORK="$(mktemp -d /tmp/zgz-rpc-live.XXXXXX)"
case "$WORK" in /tmp/zgz-rpc-live.*) : ;; *) exit 1 ;; esac
export WORK
mkdir "$WORK/bin" "$WORK/run"
REAL_UBUS="$(command -v ubus)"
export REAL_UBUS
/sbin/ubusd -s "$WORK/bus" >"$WORK/bus.log" 2>&1 &
BUS_PID=$!
cleanup() {
	if [ -s "$WORK/rpc.pid" ]; then kill "$(cat "$WORK/rpc.pid")" 2>/dev/null || true; fi
	kill "$BUS_PID" 2>/dev/null || true
	rm -rf "$WORK"
}
trap cleanup EXIT
sleep 1
cat > "$WORK/service" <<'SERVICE'
#!/bin/sh
[ "$1" = restart ] || exit 1
if [ -s "$WORK/rpc.pid" ]; then kill "$(cat "$WORK/rpc.pid")" 2>/dev/null || true; fi
(ulimit -n 64; exec /sbin/rpcd -s "$WORK/bus" -t 3) >"$WORK/rpc.log" 2>&1 &
echo "$!" > "$WORK/rpc.pid"
echo restart >> "$WORK/restarts"
SERVICE
cat > "$WORK/bin/ubus" <<'UBUS'
#!/bin/sh
exec "$REAL_UBUS" -s "$WORK/bus" "$@"
UBUS
chmod +x "$WORK/service" "$WORK/bin/ubus"
export PATH="$WORK/bin:$PATH" ZGZ_RUN="$WORK/run" ZGZ_RPC_SERVICE="$WORK/service"
HELPER=/usr/libexec/zgz-rpc
"$WORK/service" restart
sleep 2
"$HELPER" ensure
rpc_pid="$(cat "$WORK/rpc.pid")"
for i in 1 2 3; do "$HELPER" ensure; done
[ "$(cat "$WORK/rpc.pid")" = "$rpc_pid" ]
echo 'PASS: repeated healthy registration checks preserve the RPC process'
broken=0
for i in 1 2 3 4 5 6 7 8 9 10; do
	kill -HUP "$rpc_pid"
	sleep 1
	if ! "$HELPER" check; then broken=1; break; fi
done
if [ "$broken" = 0 ]; then
	echo 'SKIP: this rpcd did not reproduce descriptor exhaustion after reload'
	exit 0
fi
ubus list luci.zirgozar | grep -q '^luci.zirgozar$'
echo 'PASS: reproduced a registered object whose execution path is broken'
echo 0 > "$ZGZ_RUN/rpc-restart"
"$HELPER" watch
"$HELPER" check
[ "$(cat "$WORK/rpc.pid")" != "$rpc_pid" ]
echo 'PASS: automatic recovery repaired the private RPC service'
