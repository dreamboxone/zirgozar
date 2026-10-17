#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
mkdir -p "$RIG/dropins" "$RIG/system-dns"
sed '/^case "${1:-}" in/,$d' "$RIG/lib/zgz-dns" > "$RIG/dns-functions"
cat > "$RIG/dns-runner" <<'EOF'
#!/bin/sh
. "$RIG/dns-functions"
firewall_backend() { case "$DNS_TEST" in ipt-*) echo ipt ;; unknown) echo unknown ;; *) echo nft ;; esac; }
iptables() {
 printf '%s\n' "$*" >> "$ZGZ_RUN/iptables.calls"
 case "$DNS_TEST:$*" in ipt-install-fail:*) return 1 ;; ipt-verify-fail:*' -C '*) return 1 ;; esac
 return 0
}
ip6tables() { printf 'IPv6 ' >> "$ZGZ_RUN/iptables.calls"; iptables "$@"; }
lan_devices() { echo br-lan; }
nft() {
 case "$*" in
  '-f -') cat > "$ZGZ_RUN/guard.nft"; echo guard >> "$ZGZ_RUN/events"; [ "$DNS_TEST" != install-fail ] ;;
  'list chain inet zirgozar_dns dnsmasq_out') [ "$DNS_TEST" != verify-fail ] ;;
  *) return 0 ;;
 esac
}
dnsmasq_confdir() { echo "$RIG/dropins"; }
dnsmasq_running() { return 1; }
dnsmasq_pids() { echo 1234; }
dnsmasq_uids() { [ "$DNS_TEST" != uid-fail ] || return 1; echo "${DNS_UID:-453}"; }
reload_dnsmasq() { echo main-restart >> "$ZGZ_RUN/events"; [ "$DNS_TEST" != migration-fail ]; }
bounded() { echo "$*" >> "$ZGZ_RUN/events"; }
private_up() { echo private-start >> "$ZGZ_RUN/events"; [ "$DNS_TEST" != private-fail ]; }
private_stop() { echo private-stop >> "$ZGZ_RUN/events"; }
sleep() { :; }
if [ "$DNS_TEST" = down ]; then cmd_down; else cmd_up; fi
EOF
chmod +x "$RIG/dns-runner"
export RIG DNS_TEST
run_dns() { DNS_TEST="$1" sh "$RIG/dns-runner" >"$RIG/out" 2>&1; }
reset_dns() { rm -f "$RIG/run/"dns* "$RIG/run/events" "$RIG/run/resolver.layout" "$RIG/dropins/zirgozar.conf"; }
for failure in install-fail verify-fail ipt-install-fail ipt-verify-fail unknown; do
 reset_dns
 if run_dns "$failure"; then bad "$failure must propagate"; else ok "$failure propagates"; fi
 check "$(cat "$RIG/run/status")" failed "$failure is visible"
 grep -q '/etc/init.d/dnsmasq stop' "$RIG/run/events" && ok "$failure stops an unguarded original resolver" || bad 'unguarded resolver left running'
 if grep -q private-start "$RIG/run/events"; then bad 'private resolver started before guard'; else ok 'private resolver is not started before guard'; fi
done
reset_dns
if run_dns success; then ok 'guarded isolated startup succeeds'; else bad "startup failed: $(cat "$RIG/out")"; fi
check "$(head -1 "$RIG/run/events")" guard 'guard precedes private startup'
if grep -q main-restart "$RIG/run/events"; then bad 'normal startup must not restart DHCP'; else ok 'normal startup leaves DHCP running'; fi
grep -q 'redirect to :1054' "$RIG/run/guard.nft" && ok 'LAN DNS targets isolated port' || bad 'isolated port missing'
grep -q 'type nat hook output' "$RIG/run/guard.nft" && ok 'router DNS gets output NAT' || bad 'router redirect missing'
grep -q 'oifname "lo" meta l4proto { tcp, udp } th dport 53' "$RIG/run/guard.nft" && ok 'router redirect is confined to local DNS services' || bad 'local-output condition missing'
grep -q 'meta skuid != { 453 } return' "$RIG/run/guard.nft" && ok 'second guard uses real daemon UID' || bad 'runtime guard missing'
DNS_UID=0 run_dns success
grep -q 'meta skuid != { 0 } return' "$RIG/run/guard.nft" && ok 'root UID remains protected' || bad 'root guard missing'
if command -v nft >/dev/null 2>&1; then
 if nft --check -f "$RIG/run/guard.nft" >"$RIG/nft.err" 2>&1; then ok 'real nft accepts both output hooks'; else bad "nft: $(head -2 "$RIG/nft.err")"; fi
else echo '  skip - real nft check requires nftables'; fi
for failure in uid-fail private-fail; do
 reset_dns
 if run_dns "$failure"; then bad "$failure must fail"; else ok "$failure fails"; fi
 if grep -q '/etc/init.d/dnsmasq stop' "$RIG/run/events"; then bad 'guarded failure unnecessarily stopped DHCP'; else ok 'installed guard preserves DHCP during resolver failure'; fi
 grep -q private-stop "$RIG/run/events" && ok 'failed private resolver is stopped' || bad 'private resolver not stopped'
done
reset_dns
printf '# Written by Zirgozar while the tunnel is up.\nno-resolv\nserver=127.0.0.1#1053\n' > "$RIG/dropins/zirgozar.conf"
if run_dns success; then ok 'legacy migration succeeds'; else bad 'legacy migration failed'; fi
[ ! -f "$RIG/dropins/zirgozar.conf" ] && ok 'old shared-resolver drop-in is removed' || bad 'old drop-in retained'
check "$(grep -c main-restart "$RIG/run/events")" 1 'migration restarts original resolver once'
run_dns success
check "$(grep -c main-restart "$RIG/run/events")" 1 'subsequent starts do not restart DHCP'
reset_dns
if run_dns ipt-success; then ok 'iptables startup succeeds'; else bad 'iptables startup failed'; fi
grep -q -- '-t nat -A ZGZ_DNSROUTER_N -o lo -p tcp --dport 53 -j REDIRECT --to-ports 1054' "$RIG/run/iptables.calls" && ok 'iptables captures local router TCP DNS' || bad 'iptables router capture missing'
DNS_UID='453 65534' run_dns ipt-success
if grep -q -- '--uid-owner 65534' "$RIG/run/iptables.calls"; then ok 'iptables protects multiple daemon UIDs'; else bad 'second daemon UID missing'; fi
rig_set dns_mode direct
reset_dns
run_dns success
grep -q 'redirect to :1053' "$RIG/run/guard.nft" && ok 'direct mode targets core port' || bad 'direct mode target incorrect'
if grep -q private-start "$RIG/run/events"; then bad 'direct mode started private resolver'; else ok 'direct mode stops private resolver'; fi
rig_set dns_mode dnsmasq
reset_dns
run_dns success
run_dns down
grep -q private-stop "$RIG/run/events" && ok 'explicit stop shuts down private resolver' || bad 'explicit stop missing'
# Exercise the actual runtime identity reader, not a duplicate implementation.
actual_uids=$(sh -c '. "$RIG/dns-functions"; dnsmasq_pids() { echo 1; }; dnsmasq_uids')
check "$(echo $actual_uids)" 0 'proc reader accepts UID zero'
if sh -c '. "$RIG/dns-functions"; dnsmasq_pids() { echo 999999999; }; dnsmasq_uids' >/dev/null 2>&1; then bad 'unreadable identity accepted'; else ok 'unreadable identity fails'; fi

# Generate the shipped isolated configuration from an intentionally dirty source.
export ZGZ_DNS_CONFIG_DIR="$RIG/system-dns"
mkdir -p "$RIG/system-dns/extra"
cat > "$RIG/system-dns/dnsmasq.conf.test" <<EOF
server=8.8.8.8
server=/external.example/9.9.9.9#5353
resolv-file=/tmp/untrusted-resolv
conf-dir=$RIG/system-dns/extra
conf-script=/bin/false
port=53
dhcp-range=192.168.2.100,192.168.2.200,12h
dhcp-leasefile=$RIG/leases
enable-ra
enable-tftp
local=/lan/
domain=lan
expand-hosts
host-record=router.lan,192.168.2.1
EOF
cat > "$RIG/system-dns/extra/local.conf" <<EOF
server=10.202.10.10
server=/another.example/1.1.1.1
host-record=printer.lan,192.168.2.9
EOF
printf '0 aa:bb:cc:dd:ee:ff 192.168.2.30 laptop *\n1 aa:bb:cc:dd:ee:00 192.168.2.31 expired *\n0 aa 192.168.2.32 * *\n' > "$RIG/leases"
rig_set lan_zone lo
sh "$RIG/lib/zgz-dns-local" config > "$RIG/run/resolver.conf"
sh "$RIG/lib/zgz-dns-local" hosts
check "$(grep '^server=' "$RIG/run/resolver.conf")" 'server=127.0.0.1#1053' 'isolated resolver has exactly one forwarding upstream'
if grep -Eq '^(conf-|resolv-file|dhcp-range|enable-ra|enable-tftp)' "$RIG/run/resolver.conf"; then bad 'unsafe system directives copied'; else ok 'upstream includes and DHCP/RA/TFTP directives are excluded'; fi
grep -q '^host-record=printer.lan,192.168.2.9' "$RIG/run/resolver.conf" && ok 'local records survive included files' || bad 'included local records lost'
grep -q '^192.168.2.30 laptop laptop.lan$' "$RIG/run/resolver.hosts" && ok 'live DHCP names are imported' || bad 'live DHCP name missing'
if grep -q 'expired\|\*' "$RIG/run/resolver.hosts"; then bad 'expired or invalid hostname imported'; else ok 'expired and invalid DHCP names are excluded'; fi
# Exercise private_up with the real renderer and a controlled service boundary.
mkdir -p "$RIG/private-bin"
cat > "$RIG/private-bin/dnsmasq" <<'EOF'
#!/bin/sh
[ "$DNS_TEST" != syntax-fail ]
EOF
chmod +x "$RIG/private-bin/dnsmasq"
cat > "$RIG/private-runner" <<'EOF'
#!/bin/sh
. "$RIG/dns-functions"
PATH="$RIG/private-bin:$PATH"; export PATH
private_ready() { [ "$DNS_TEST" != listen-fail ] && [ -f "$ZGZ_RUN/private-listening" ]; }
bounded() {
 echo restart >> "$ZGZ_RUN/private-events"
 [ "$DNS_TEST" = listen-fail ] || touch "$ZGZ_RUN/private-listening"
}
sleep() { :; }
if [ "$DNS_TEST" = repeat ]; then
 private_up 1054
 private_up 1054
else
 private_up 1054
fi
EOF
if DNS_TEST=repeat sh "$RIG/private-runner"; then ok 'private startup and repeat succeed'; else bad 'private startup failed'; fi
check "$(wc -l < "$RIG/run/private-events" | tr -d ' ')" 1 'healthy unchanged private resolver is not restarted'
if DNS_TEST=syntax-fail sh "$RIG/private-runner"; then bad 'syntax failure accepted'; else ok 'invalid private config prevents service launch'; fi
if DNS_TEST=listen-fail sh "$RIG/private-runner"; then bad 'missing listener accepted'; else ok 'missing listener prevents ready status'; fi
if [ -n "${RIG_DNSMASQ:-}" ] || command -v dnsmasq >/dev/null 2>&1; then
 binary="${RIG_DNSMASQ:-$(command -v dnsmasq)}"
 if "$binary" --test --conf-file="$RIG/run/resolver.conf" >"$RIG/dnsmasq.err" 2>&1; then ok 'real dnsmasq accepts isolated configuration'; else bad "dnsmasq: $(cat "$RIG/dnsmasq.err")"; fi
 if command -v python3 >/dev/null 2>&1; then
  python3 "$RIG_SRC/test/test-dns-live.py" "$binary"
  case "$?" in 0) ok 'live isolated resolver checks' ;; 77) echo '  skip - live sockets are unavailable in this runtime' ;; *) bad 'live isolated resolver checks failed' ;; esac
 fi
else echo '  skip - live resolver checks require dnsmasq'; fi
# Regenerate the strict guard, then exercise its real output and forward hooks.
rig_set encrypted_dns_policy strict
reset_dns
run_dns success || bad 'strict guard failed to install'
grep -q 'th dport { 853, 5353 }' "$RIG/run/guard.nft" && ok 'strict guard covers TLS DNS and alternative DNS' || bad 'strict ports missing'
if command -v nft >/dev/null 2>&1 && command -v unshare >/dev/null 2>&1; then
 python3 "$RIG_SRC/test/test-dns-firewall.py" "$RIG/run/guard.nft"
 case "$?" in 0) ok 'live encrypted DNS firewall checks' ;; 77) echo '  skip - network namespace unavailable here' ;; *) bad 'live encrypted DNS firewall checks failed' ;; esac
fi
reset_dns
if run_dns ipt-success; then
 grep -q 'IPv6 .*ZGZ_EDNSOUT_N .*--dport 5353 -j DROP' "$RIG/run/iptables.calls" && ok 'legacy IPv6 output is protected' || bad 'IPv6 output guard missing'
 grep -q 'IPv6 .*ZGZ_EDNSFWD_N .*--dport 853 -j DROP' "$RIG/run/iptables.calls" && ok 'legacy IPv6 forwarding is protected' || bad 'IPv6 forwarding guard missing'
else bad 'legacy strict guard failed'; fi
rig_set kill_switch 1
reset_dns
run_dns down || bad 'protected stop failed'
grep -q 'th dport { 853, 5353 }' "$RIG/run/guard.nft" && ok 'strict guard survives stop with Kill switch' || bad 'strict guard disappeared on stop'
grep -q 'redirect to :1053' "$RIG/run/guard.nft" && ok 'stopped resolver cannot fall back to the system DNS' || bad 'stopped resolver fallback is possible'
rig_set kill_switch 0
rig_set dns_guard_ports '1853 8853'
reset_dns
run_dns success || bad 'additional DNS ports failed'
grep -q 'th dport { 853, 1853, 5353, 8853 }' "$RIG/run/guard.nft" && ok 'additional DNS ports reach the firewall' || bad 'additional ports missing'
rig_set dns_guard_ports '443'
if run_dns success; then bad 'HTTPS accepted as a protected DNS port'; else ok 'HTTPS cannot override Iran website routing'; fi
rig_set dns_guard_ports ''
rig_set encrypted_dns_policy rules
reset_dns
run_dns success || bad 'traffic-rule policy failed'
if grep -q 'chain encrypted_' "$RIG/run/guard.nft"; then bad 'disabled encrypted guard persisted'; else ok 'traffic-rule policy removes encrypted guard'; fi
rig_report
