#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
set -eu
src="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d /tmp/zgz-led.XXXXXX)"
case "$tmp" in /tmp/zgz-led.*) : ;; *) exit 1 ;; esac
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/lib" "$tmp/run" "$tmp/leds"
cat > "$tmp/lib/zgz-common.sh" <<'EOF'
cfg() {
 case "$1" in
 led_rules) echo "${TEST_RULES:-$2}" ;;
 *) echo "$2" ;;
 esac
}
json_escape() { printf '%s' "$1"; }
EOF
ZGZ_LIB="$tmp/lib"; ZGZ_RUN="$tmp/run"; ZGZ_LED_ROOT="$tmp/leds"
export ZGZ_LIB ZGZ_RUN ZGZ_LED_ROOT
sed '/^case "${1:-status}" in/,$d' "$src/package/zirgozar/files/zgz-led" > "$tmp/functions"
. "$tmp/functions"
if detect; then echo 'unexpected hardware'; exit 1; fi
for colour_name in Red Green Blue; do
 d="$ZGZ_LED_ROOT/LED0_$colour_name"; mkdir -p "$d"
 echo 255 > "$d/max_brightness"; echo 42 > "$d/brightness"
 echo 'none timer [default-on]' > "$d/trigger"
done
detect
[ "$BLINK" = 1 ]
RULES='1:499:green:steady:0 500:999:blue:blink:20 1000:1500:white:blink:60'
[ "$(rule_for_ping 499)" = green:steady:0 ]
[ "$(rule_for_ping 500)" = blue:blink:20 ]
[ "$(rule_for_ping 1500)" = white:blink:60 ]
[ "$(rule_for_ping 1501)" = red:steady:0 ]
[ "$(rule_for_ping 0)" = red:steady:0 ]
[ "$(rule_for_ping "")" = red:steady:0 ]
RULES="$RULES 400:500:orange:steady:0"
[ "$(rule_for_ping 500)" = red:steady:0 ]
RULES='1:1000:red:blink:0 1:1000:blue:blink:0020 1:1000:unknown:steady:0'
[ "$(rule_for_ping 500)" = blue:blink:20 ]
RULES=none
[ "$(rule_for_ping 750)" = red:steady:0 ]
snapshot
for c in green yellow orange red blue white; do
 apply_colour "$c" steady 0
 case "$c" in
 green) expected='0 255 0' ;;
 yellow) expected='255 255 0' ;;
 orange) expected='255 63 0' ;;
 red) expected='255 0 0' ;;
 blue) expected='0 0 255' ;;
 white) expected='255 255 255' ;;
 esac
 [ "$(paste -sd ' ' "$RED/brightness" "$GREEN/brightness" "$BLUE/brightness" | paste -sd ' ' -)" = "$expected" ]
done
apply_colour blue blink 20
[ "$(cat "$BLUE/brightness")" = 255 ]; [ "$(cat "$BLUE/trigger")" = timer ]
[ "$(cat "$BLUE/delay_on")" = 1500 ]; [ "$(cat "$BLUE/delay_off")" = 1500 ]
apply_colour white blink 60
for c in "$RED" "$GREEN" "$BLUE"; do
 [ "$(cat "$c/brightness")" = 255 ]; [ "$(cat "$c/delay_on")" = 500 ]
done
restore
for c in "$RED" "$GREEN" "$BLUE"; do
 [ "$(cat "$c/brightness")" = 42 ]; [ "$(cat "$c/trigger")" = default-on ]
done
[ ! -d "$SAVE" ]
TEST_RULES='500:999:yellow:steady:0'
ZGZ_STATUS="$ZGZ_RUN/status"
echo ready > "$ZGZ_STATUS"
cat > "$ZGZ_LIB/zgz-test" <<'EOF'
#!/bin/sh
[ "$1" = live ] || exit 1
echo 750
EOF
chmod +x "$ZGZ_LIB/zgz-test"
cfg_bool() {
 case "$1" in
 led_outage_enabled) [ -f "$ZGZ_RUN/outage-enabled" ] && echo 1 || echo 0 ;;
 *) [ -f "$ZGZ_RUN/enabled" ] && echo 1 || echo 0 ;;
 esac
}
internet_online() { [ -f "$ZGZ_RUN/online" ]; }
tunnel_running() { return 0; }
exit_identity() { echo current-node; }
sleep() {
 printf '%s %s %s\n' "$(cat "$RED/brightness")" "$(cat "$GREEN/brightness")" "$(cat "$BLUE/brightness")" > "$ZGZ_RUN/observed"
 rm -f "$ZGZ_RUN/enabled" "$ZGZ_RUN/outage-enabled"
}
touch "$ZGZ_RUN/enabled"
(run)
[ "$(cat "$ZGZ_RUN/observed")" = '255 255 0' ]
[ "$(cat "$GREEN/brightness")" = 42 ]
[ ! -d "$SAVE" ]
echo failed > "$ZGZ_STATUS"
touch "$ZGZ_RUN/enabled"
(run)
[ "$(cat "$ZGZ_RUN/observed")" = '255 0 0' ]
[ "$(cat "$BLUE/brightness")" = 42 ]
[ ! -d "$SAVE" ]
touch "$ZGZ_RUN/outage-enabled"
(run)
[ "$(cat "$ZGZ_RUN/observed")" = '127 0 31' ]
[ "$(cat "$RED/brightness")" = 42 ]
touch "$ZGZ_RUN/outage-enabled" "$ZGZ_RUN/online"
(run)
[ "$(cat "$ZGZ_RUN/observed")" = '42 42 42' ]
echo 1 > "$GREEN/max_brightness"
if detect; then echo 'binary channels accepted'; exit 1; fi
echo 'LED: capability detection, custom ranges, conflict fallback, steady/blinking colours and restoration passed'
