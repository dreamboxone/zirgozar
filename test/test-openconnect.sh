#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
DIR="$ZGZ_RUN/tests"
mkdir -p "$DIR"
sed -n '/^endpoint_url_ms() (/,/^do_url() {/p' "$ZGZ_LIB/zgz-test" | sed '$d' > "$RIG/oc-functions"
. "$RIG/oc-functions"
cat > "$RIG/bin/ucode" <<'EOF'
#!/bin/sh
echo '{}'
EOF
cat > "$RIG/core/sing-box" <<'EOF'
#!/bin/sh
case "$1" in
 version) [ "$OC_MODE" = unsupported ] || echo with_openconnect,with_quic ;;
 check) exit 0 ;;
 run) echo $$ > "$ZGZ_RUN/oc.pid"; trap 'exit 0' TERM INT; while :; do sleep 1; done ;;
esac
EOF
cat > "$RIG/bin/curl" <<'EOF'
#!/bin/sh
n=$(cat "$ZGZ_RUN/curl.count" 2>/dev/null || echo 0); n=$((n+1)); echo "$n" > "$ZGZ_RUN/curl.count"
for arg in "$@"; do url="$arg"; done
case "$OC_MODE" in
 ready) if [ "$n" -le 2 ]; then for f in "$ZGZ_RUN"/tests/oc-test.*/run.log; do echo 'endpoint is not ready yet' >> "$f"; done; exit 1; fi ;;
 certificate) for f in "$ZGZ_RUN"/tests/oc-test.*/run.log; do echo 'client terminated: certificate mismatch' >> "$f"; done; exit 1 ;;
 fallback) [ "$url" = https://www.google.com/generate_204 ] || exit 1 ;;
 custom) exit 1 ;;
esac
echo 0.123
EOF
chmod +x "$RIG/bin/ucode" "$RIG/bin/curl" "$RIG/core/sing-box"
singbox_path() { echo "$RIG/core/sing-box"; }
singbox_lx_path() { echo "$RIG/core/missing"; }
export OC_MODE
for OC_MODE in ready fallback certificate custom unsupported; do
 rm -f "$ZGZ_RUN/curl.count" "$ZGZ_RUN/oc.pid"
 if [ "$OC_MODE" = custom ]; then rig_set test_url https://custom.example/check; else rig_set test_url http://www.gstatic.com/generate_204; fi
 result=$(endpoint_url_ms '{"type":"openconnect","server":"test.example","port":443}' 2>/dev/null) || true
 case "$OC_MODE" in
  ready) check "$result" 123 'waits for endpoint authentication before reporting latency'; check "$(cat "$ZGZ_RUN/curl.count")" 3 'readiness errors are retried' ;;
  fallback) check "$result" 123 'stock HTTP probe has an HTTPS control' ;;
  certificate) check "$result" 0 'certificate failure is a failed connection, not unsupported' ;;
  custom) check "$result" 0 'explicit test URL remains authoritative'; check "$(cat "$ZGZ_RUN/curl.count")" 1 'custom probe does not silently try another site' ;;
  unsupported) check "$result" -2 'missing OpenConnect core is reported as unsupported' ;;
 esac
 if [ -e "$ZGZ_RUN/oc.pid" ] && kill -0 "$(cat "$ZGZ_RUN/oc.pid")" 2>/dev/null; then bad "$OC_MODE leaves a test process"; else ok "$OC_MODE reaps the test process"; fi
 if [ -d "$DIR/.oc-lock" ] || find "$DIR" -name 'oc-test.*' | grep -q .; then bad "$OC_MODE leaves credentials or a lock"; else ok "$OC_MODE removes temporary credentials and lock"; fi
done
OC_MODE=fallback
rm -f "$ZGZ_RUN/curl.count"
result=$(endpoint_url_ms '{"type":"hysteria2","server":"test.example","port":443}' hysteria2 2>/dev/null) || true
check "$result" 123 'Hysteria2 URL testing uses a QUIC-capable helper'
sed -n '/^cmd_live() {/,/^}/p' "$ZGZ_LIB/zgz-test" > "$RIG/oc-live"
. "$RIG/oc-live"
bridge_type() { echo "$OC_ACTIVE"; }
OC_MODE=fallback; OC_ACTIVE=openconnect
rig_set test_url http://www.gstatic.com/generate_204
rm -f "$ZGZ_RUN/curl.count"
result=$(cmd_live) || true
check "$result" 123 'live OpenConnect health uses the same HTTPS control'
rig_set test_url https://custom.example/check
result=$(cmd_live) || true
check "$result" 0 'live health respects an explicit probe URL'
rig_set test_url http://www.gstatic.com/generate_204
OC_ACTIVE=wireguard
result=$(cmd_live) || true
check "$result" 0 'OpenConnect fallback does not change other protocols'
rig_report
