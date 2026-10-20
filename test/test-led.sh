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
 led_green_ms) echo "${TEST_GREEN:-200}" ;;
 led_yellow_ms) echo 300 ;;
 led_orange_ms) echo 500 ;;
 led_red_ms) echo 1000 ;;
 *_mode) echo "${TEST_MODE:-steady}" ;;
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
thresholds
for pair in '0 off' '199 green' '200 yellow' '299 yellow' '300 orange' '499 orange' '500 red' '1000 red' '1001 off'; do
 set -- $pair
 [ "$(colour "$1")" = "$2" ]
done
TEST_GREEN=400
if thresholds; then echo 'invalid thresholds accepted'; exit 1; fi
unset TEST_GREEN
snapshot
for c in green yellow orange red off; do
 apply_colour "$c"
 case "$c" in
 green) [ "$(cat "$GREEN/brightness")" = 255 ]; [ "$(cat "$RED/brightness")" = 0 ] ;;
 yellow) [ "$(cat "$GREEN/brightness")" = 255 ]; [ "$(cat "$RED/brightness")" = 255 ] ;;
 orange) [ "$(cat "$GREEN/brightness")" = 63 ]; [ "$(cat "$RED/brightness")" = 255 ] ;;
 red) [ "$(cat "$GREEN/brightness")" = 0 ]; [ "$(cat "$RED/brightness")" = 255 ] ;;
 off) [ "$(cat "$GREEN/brightness")" = 0 ]; [ "$(cat "$RED/brightness")" = 0 ] ;;
 esac
 [ "$(cat "$BLUE/brightness")" = 0 ]
done
TEST_MODE=blink
apply_colour yellow
[ "$(cat "$RED/trigger")" = timer ]; [ "$(cat "$GREEN/delay_on")" = 500 ]
restore
for c in "$RED" "$GREEN" "$BLUE"; do
 [ "$(cat "$c/brightness")" = 42 ]; [ "$(cat "$c/trigger")" = default-on ]
done
[ ! -d "$SAVE" ]
unset TEST_MODE
ZGZ_STATUS="$ZGZ_RUN/status"
echo ready > "$ZGZ_STATUS"
cat > "$ZGZ_LIB/zgz-test" <<'EOF'
#!/bin/sh
[ "$1" = live ] || exit 1
echo 250
EOF
chmod +x "$ZGZ_LIB/zgz-test"
cfg_bool() { [ -f "$ZGZ_RUN/enabled" ] && echo 1 || echo 0; }
tunnel_running() { return 0; }
exit_identity() { echo current-node; }
sleep() {
 printf '%s %s\n' "$(cat "$RED/brightness")" "$(cat "$GREEN/brightness")" > "$ZGZ_RUN/observed"
 rm -f "$ZGZ_RUN/enabled"
}
touch "$ZGZ_RUN/enabled"
(run)
[ "$(cat "$ZGZ_RUN/observed")" = '255 255' ]
[ "$(cat "$GREEN/brightness")" = 42 ]
[ ! -d "$SAVE" ]
echo 1 > "$GREEN/max_brightness"
if detect; then echo 'binary channels accepted'; exit 1; fi
echo 'LED: capability detection, all latency boundaries, steady/blinking colours and restoration passed'
