#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
mkdir -p "$RIG/dropins"
# Load the shipped functions, replacing only the command dispatcher.
sed '/^case "${1:-}" in/,$d' "$RIG/lib/zgz-dns" > "$RIG/dns-functions"
cat > "$RIG/dns-runner" <<'EOF'
#!/bin/sh
. "$RIG/dns-functions"
firewall_backend() { case "$DNS_TEST" in ipt-*) echo ipt ;; unknown) echo unknown ;; *) echo nft ;; esac; }
iptables() {
 printf '%s\n' "$*" >> "$ZGZ_RUN/iptables.calls"
 case "$DNS_TEST:$*" in
  ipt-install-fail:*) return 1 ;;
  ipt-verify-fail:*' -C '*) return 1 ;;
 esac
 return 0
}
lan_devices() { echo br-lan; }
nft() {
 case "$*" in
  '-f -') cat > "$ZGZ_RUN/guard.nft"; [ "$DNS_TEST" != install-fail ] ;;
  'list chain inet zirgozar_dns dnsmasq_out') [ "$DNS_TEST" != verify-fail ] ;;
  *) return 0 ;;
 esac
}
dnsmasq_running() { [ ! -f "$ZGZ_RUN/stopped" ]; }
dnsmasq_confdir() { echo "$RIG/dropins"; }
dnsmasq_pids() { echo 1234; }
dnsmasq_uids() { [ "$DNS_TEST" != uid-fail ] || return 1; echo "${DNS_UID:-453}"; }
reload_dnsmasq() {
 echo restart >> "$ZGZ_RUN/events"
 [ "$DNS_TEST" != restart-fail ] || return 1
 rm -f "$ZGZ_RUN/stopped"
}
bounded() { echo stop >> "$ZGZ_RUN/events"; touch "$ZGZ_RUN/stopped"; }
sleep() { :; }
case "$DNS_TEST" in
 no-dnsmasq) dnsmasq_running() { return 1; } ;;
 no-confdir) dnsmasq_confdir() { return 1; } ;;
esac
if [ "$DNS_TEST" = down ]; then cmd_down; else cmd_up; fi
EOF
chmod +x "$RIG/dns-runner"
export RIG DNS_TEST
run_dns() { DNS_TEST="$1" sh "$RIG/dns-runner" >"$RIG/out" 2>&1; }
reset_dns() { rm -f "$RIG/run/"dns* "$RIG/run/stopped" "$RIG/run/events" "$RIG/dropins/zirgozar.conf"; }
for failure in install-fail verify-fail ipt-install-fail ipt-verify-fail unknown; do
 reset_dns
 echo 'original configuration' > "$RIG/dropins/zirgozar.conf"
 if run_dns "$failure"; then bad "$failure propagates failure"; else ok "$failure propagates failure"; fi
 check "$(cat "$RIG/dropins/zirgozar.conf")" 'original configuration' "$failure does not change resolver settings"
 check "$(cat "$RIG/run/events")" stop "$failure stops dnsmasq without restarting it"
 check "$(cat "$RIG/run/status")" failed "$failure is shown as failed"
 [ -f "$RIG/run/dns.failed" ] && ok "$failure is retained for retry" || bad 'failure marker missing'
done
reset_dns
if run_dns success; then ok 'verified guard allows resolver setup'; else bad 'verified setup failed'; fi
check "$(cat "$RIG/run/events")" restart 'dnsmasq starts only after guard installation and verification'
grep -q 'meta mark & 0xff == 0xff return' "$RIG/run/guard.nft" && ok 'marked core DNS is allowed' || bad 'core mark exception missing'
grep -q 'meta skuid != { 453 } return' "$RIG/run/guard.nft" && ok 'final guard uses verified runtime UID' || bad 'runtime UID missing'
DNS_UID=0 run_dns success
if grep -q 'meta skuid != { 0 } return' "$RIG/run/guard.nft"; then ok 'root dnsmasq is protected rather than skipped'; else bad 'root UID skipped'; fi
if run_dns uid-fail; then bad 'missing runtime identity must fail'; else ok 'missing runtime identity fails visibly'; fi
run_dns success
grep -q 'type filter hook output' "$RIG/run/guard.nft" && ok 'router DNS is protected in output' || bad 'output guard missing'
grep -q 'meta l4proto { tcp, udp } th dport { 53 } counter drop' "$RIG/run/guard.nft" && ok 'unmarked TCP and UDP DNS are blocked for both IP families' || bad 'DNS drop missing'
if command -v nft >/dev/null 2>&1; then
 if nft --check -f "$RIG/run/guard.nft" >"$RIG/nft.err" 2>&1; then ok 'real nft accepts the guard'; else bad "real nft rejected guard: $(head -2 "$RIG/nft.err")"; fi
else
 echo '  skip - real nft validation requires nftables (release CI installs it)'
fi
reset_dns
if run_dns ipt-success; then ok 'iptables guard installation succeeds'; else bad 'iptables guard installation failed'; fi
if grep -q -- '-m mark --mark 0xff/0xff -j RETURN' "$RIG/run/iptables.calls" && grep -q -- '--uid-owner 453' "$RIG/run/iptables.calls"; then
 ok 'iptables protects the runtime UID and exempts core marks'
else bad 'iptables runtime protection missing'; fi
reset_dns
if run_dns restart-fail; then bad 'restart failure must propagate'; else ok 'restart failure propagates'; fi
check "$(tail -1 "$RIG/run/events")" stop 'failed restart leaves dnsmasq stopped'
if run_dns success; then ok 'retry restores dnsmasq after verifying guard'; else bad 'retry failed'; fi
[ ! -f "$RIG/run/dns.failed" ] && ok 'successful retry clears failure marker' || bad 'failure marker not cleared'
for mode in no-dnsmasq no-confdir; do
 reset_dns
 if run_dns "$mode"; then ok "$mode fallback succeeds with a verified guard"; else bad "$mode fallback failed"; fi
 grep -q 'type filter hook output' "$RIG/run/guard.nft" && ok "$mode fallback retains output protection" || bad "$mode lost output guard"
done
reset_dns
run_dns install-fail
if run_dns down; then ok 'explicit stop recovers after initial guard failure'; else bad 'explicit stop failed'; fi
check "$(tail -1 "$RIG/run/events")" restart 'explicit stop restores resolver even without a drop-in'
actual_uids=$(sh -c '. "$RIG/dns-functions"; dnsmasq_pids() { echo 1; }; dnsmasq_uids')
check "$(echo $actual_uids)" "0" 'real proc reader accepts UID zero from proc'
if sh -c '. "$RIG/dns-functions"; dnsmasq_pids() { echo 999999999; }; dnsmasq_uids' >/dev/null 2>&1; then
 bad 'unreadable proc identity must fail'
else ok 'unreadable proc identity fails'; fi
rig_report
