#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
. "$(dirname "$0")/rig.sh"
rig_setup
cat >> "$RIG/lib/zgz-common.sh" <<'EOF'
connectivity_identity() { cat "$ZGZ_RUN/identity"; }
EOF
cat > "$RIG/bin/curl" <<'EOF'
#!/bin/sh
printf '%s\n' "$*" > "$ZGZ_RUN/curl.args"
[ ! -e "$ZGZ_RUN/change" ] || echo new > "$ZGZ_RUN/identity"
cat "$ZGZ_RUN/code"
[ "$(cat "$ZGZ_RUN/code")" != fail ]
EOF
chmod +x "$RIG/bin/curl"
echo old > "$RIG/run/identity"
echo 204 > "$RIG/run/code"
sh "$RIG/lib/zgz-test" connectivity
check "$(awk '{print $3}' "$RIG/run/connectivity")" 1 'HTTPS 204 confirms traffic'
case "$(cat "$RIG/run/curl.args")" in *'--socks5-hostname 127.0.0.1:1070'*'https://www.google.com/generate_204'*) ok 'probe uses live SOCKS and remote DNS' ;; *) bad 'probe uses live SOCKS and remote DNS' ;; esac
for code in 200 302 fail; do
 echo "$code" > "$RIG/run/code"
 sh "$RIG/lib/zgz-test" connectivity
 check "$(awk '{print $3}' "$RIG/run/connectivity")" 0 "response $code cannot prove connectivity"
done
echo 204 > "$RIG/run/code"
touch "$RIG/run/change"
sh "$RIG/lib/zgz-test" connectivity
check "$(awk '{print $1}' "$RIG/run/connectivity")" old 'node change discards in-flight success'
rm "$RIG/run/change"
rig_set node_socks_port 0
sh "$RIG/lib/zgz-test" connectivity
check "$(awk '{print $3}' "$RIG/run/connectivity")" 0 'disabled live port cannot use a candidate probe'
# Exercise the shipped RPC method with system boundaries stubbed.
sed -n '/^method_state() {/,/^# ------------------------------------------------------------------- traffic/p' "$RIG_SRC/package/zirgozar/files/luci.zirgozar" > "$RIG/state.sh"
. "$RIG/lib/zgz-common.sh"
. "$RIG/state.sh"
tunnel_running() { return 0; }
firewall_backend() { echo nft; }
nft() { return 0; }
geo_dir() { return 1; }
passwall_running() { return 1; }
exit_identity() { return 1; }
detach() { :; }
echo '{}' > "$ZGZ_BEST"
echo name=xray > "$ZGZ_RUN/core.info"
TEST="$RIG/lib/zgz-test"
JOB="$RIG/run/job"
for tuple in "new $(date +%s) 1:true" "old $(date +%s) 1:false" "new 1 1:false" "new $(date +%s) 0:false"; do
 printf '%s\n' "${tuple%:*}" > "$RIG/run/connectivity"
 answer="$(method_state)"
 actual="$(printf '%s' "$answer" | sed -n 's/.*"connected":\(true\|false\).*/\1/p')"
 check "$actual" "${tuple##*:}" "RPC validates identity, freshness and result ($tuple)"
done
rig_report
