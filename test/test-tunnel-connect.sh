#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
export RIG
cat > "$RIG/bin/sstpc" <<'CLIENT'
#!/bin/sh
printf '%s\n' "$*" > "$RIG/client.args"
touch "$RIG/client.ready"
trap 'exit 0' TERM INT
while :; do sleep 1; done
CLIENT
cp "$RIG/bin/sstpc" "$RIG/bin/xl2tpd"
chmod +x "$RIG/bin/sstpc" "$RIG/bin/xl2tpd"
run_connect() (
 . "$RIG/lib/zgz-common.sh"
 kind="$1"; family="$2"
 MODE=test; STATE="$RIG/run/$kind-$family"; DEV="zgz${kind}t"; TABLE=19015
 mkdir -p "$STATE"
 NODE="$STATE/node.json"
 printf '{"type":"l2tp","server":"vpn.example","port":1701,"username":"u","password":"p","mtu":1400,"ipsec":false}' > "$NODE"
 fail() { echo "$*" >&2; exit 1; }
 check() { TYPE=sstp; NAME=SSTP; SERVER=vpn.example; PORT=443; USER=u; PASS=p; MTU=1400; }
 quote() { printf '"%s"' "$1"; }
 field() { [ "$1" != ipv6 ] || echo false; }
 resolve_direct() { [ "$family" != 4 ] || echo 192.0.2.1; }
 resolve_direct_all() { if [ "$family" = 4 ]; then echo 192.0.2.1; else echo 2001:db8::1; fi; }
 tunnel_relay_start() { printf '%s\n' "$*" > "$RIG/relay.args"; }
 ip() {
  printf '%s\n' "$*" >> "$RIG/ip.args"
  case "$*" in
   '-6 route get '*) [ "$family" != missing ] && echo '2001:db8::1 src 2001:db8::2' ;;
   '-4 route get '*) echo '192.0.2.1 src 192.0.2.2' ;;
   '-4 route show table '*) : ;;
   '-4 addr show dev '*) [ ! -e "$RIG/client.ready" ] || echo 'inet 10.8.0.2/32' ;;
   *) : ;;
  esac
  return 0
 }
 trap '[ -z "${PID:-}" ] || { kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true; }' EXIT
 trap 'exit 1' INT TERM
 rm -f "$RIG/relay.args" "$RIG/client.ready" "$RIG/client.args"
 if [ "$kind" = l2tp ]; then
  eval "$(sed -n '/^connect() {/,/^}/p' "$RIG/lib/zgz-l2tp")"
 else
  eval "$(sed -n '/^connect() {/,/^}/p' "$RIG/lib/zgz-pppvpn")"
 fi
 connect || exit 1
 if [ "$family" = 6 ]; then
  grep -q '2001:db8::1' "$RIG/relay.args" || exit 1
  if [ "$kind" = l2tp ]; then
   grep -q 'udp 2001:db8::1 1701 21702 2001:db8::2' "$RIG/relay.args" || exit 1
   grep -q 'lns = 127.0.0.1:21702' "$STATE/xl2tpd.conf" || exit 1
  else
   grep -q 'tcp 2001:db8::1 443 29015 2001:db8::2' "$RIG/relay.args" || exit 1
   grep -q '127.0.0.1:29015' "$RIG/client.args" || exit 1
  fi
 else
  [ ! -e "$RIG/relay.args" ] || exit 1
 fi
)
for kind in sstp l2tp; do
 for family in 4 6; do
  if [ "$kind" = l2tp ] && ! command -v ucode >/dev/null 2>&1; then continue; fi
  if run_connect "$kind" "$family"; then ok "$kind connects through the correct IPv$family transport"; else bad "$kind IPv$family connection setup failed"; fi
 done
done
if run_connect sstp missing > "$RIG/no-route.log" 2>&1; then bad 'IPv6 without a WAN route accepted'; else
 grep -q 'no direct route' "$RIG/no-route.log" && ok 'missing IPv6 WAN route has a clear error' || bad 'wrong missing route error'
fi
rig_report
