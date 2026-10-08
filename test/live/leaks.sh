#!/bin/sh
#
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar
#
# leaks.sh - does anything leave the router that should not, and what does a
# broken tunnel let through. Run on a machine on the router's LAN, against a
# router with the tunnel up:
#
#   ROUTER=root@192.168.2.1 SSH_KEY=~/.ssh/id_ed25519 sh test/live/leaks.sh
#   sh test/live/leaks.sh dns       only the name-lookup checks
#   sh test/live/leaks.sh fail      only what a broken tunnel lets through
#
# Not part of test/run.sh: it needs a real router, a real uplink, tcpdump on
# the router (tcpdump-mini will do), and it interrupts the tunnel on purpose.
#
# Name lookups. Counting port-53 packets on the uplink says nothing: the
# router resolves the nodes' names itself, and Iranian names go straight out
# by design. So a name nobody has ever asked for is made up for each check -
# under a real foreign domain, not .invalid, which a resolver may answer
# without asking anyone and so pass for the wrong reason - and the one
# question is whether that exact name crossed the uplink in clear.
# Each "must not" check has a "must" beside it - a made-up name under .ir,
# which the Iran split sends straight out - because a capture on the wrong
# interface, or one that sees nothing at all, would otherwise pass every
# check without looking at anything.
#
# A broken tunnel. With the core killed the rules stay in place and point at
# a port nobody listens on, so nothing should get out until procd starts it
# again. With the service stopped the rules go and the network works without
# the tunnel - on purpose, "better disconnected than unreachable" - and that
# is reported as what it is rather than as a pass or a leak.
#
# IPv6 is only as tested as the uplink allows: with no IPv6 default route on
# the router there is no IPv6 to leak, and the check says so instead of
# passing.

ROUTER="${ROUTER:-root@192.168.2.1}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
ONLY="${1:-all}"
LEAK=0
WEIRD=0

r() { ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=8 "$ROUTER" "$@"; }
say() { printf '%s\n' "$*"; }
pass() { say "  PASS  $*"; }
leak() { say "  LEAK  $*"; LEAK=1; }
void() { say "  VOID  $*"; WEIRD=1; }
note() { say "  NOTE  $*"; }

label() { printf 'zgz%s%04x' "$(date +%H%M%S)" "$(awk 'BEGIN { srand(); print int(rand() * 65535) }')"; }

# Where the router meets the world.
WAN="$(r 'ifstatus wan 2>/dev/null | jsonfilter -e "@.l3_device" 2>/dev/null')"
[ -n "$WAN" ] || { say "cannot find the router's uplink device"; exit 2; }
r 'command -v tcpdump >/dev/null' || { say "tcpdump is not on the router: apk add tcpdump-mini (or opkg install tcpdump-mini)"; exit 2; }
say "router $ROUTER, uplink $WAN, status $(r 'cat /var/run/zirgozar/status 2>/dev/null')"

# --------------------------------------------------------------- lookups

lookup() {   # lookup <name> <server>
	nslookup "$1" "$2" >/dev/null 2>&1 || true
}

dns_checks() {
	say ""
	say "== name lookups on the uplink"
	IN="$(label).cloudflare.com"    # must stay in the tunnel
	IR="$(label).ir"                # must go straight out: the control
	HJ="$(label).cloudflare.com"    # asked of 8.8.8.8 directly: hijacked, so in the tunnel
	RT="$(label).cloudflare.com"    # the router's own lookup
	r "timeout 25 tcpdump -n -l -i $WAN -s 512 -A 'port 53' 2>/dev/null" > /tmp/zgz-leaks.cap &
	CAP=$!
	sleep 3
	lookup "$IN" "${ROUTER#*@}"
	lookup "$IR" "${ROUTER#*@}"
	lookup "$HJ" 8.8.8.8
	r "nslookup $RT 127.0.0.1 >/dev/null 2>&1" || true
	wait "$CAP" 2>/dev/null
	n_in="$(grep -c "$IN" /tmp/zgz-leaks.cap)"
	n_ir="$(grep -c "$IR" /tmp/zgz-leaks.cap)"
	n_hj="$(grep -c "$HJ" /tmp/zgz-leaks.cap)"
	n_rt="$(grep -c "$RT" /tmp/zgz-leaks.cap)"
	n_all="$(grep -cE '^[0-9]{2}:[0-9]{2}:[0-9]{2}' /tmp/zgz-leaks.cap)"
	rm -f /tmp/zgz-leaks.cap
	if [ "$n_ir" -gt 0 ]; then
		pass "control: the .ir name went straight out, as the split says ($n_ir packets) - the capture sees lookups"
	else
		void "control: the .ir name never showed on $WAN - the capture is blind, so the checks below prove nothing ($n_all DNS packets seen)"
	fi
	[ "$n_in" -eq 0 ] && pass "a name asked of the router stayed in the tunnel" || leak "a name asked of the router crossed $WAN in clear ($n_in packets)"
	[ "$n_hj" -eq 0 ] && pass "a name asked of 8.8.8.8 directly was caught and stayed in the tunnel" || leak "a name asked of 8.8.8.8 directly crossed $WAN in clear ($n_hj packets) - is DNS hijack off?"
	[ "$n_rt" -eq 0 ] && pass "the router's own lookup stayed in the tunnel" || leak "the router's own lookup crossed $WAN in clear ($n_rt packets)"

	if r 'ip -6 route show default | grep -q .'; then
		note "the uplink has IPv6: run this from an IPv6-capable client too - IPv6 is not covered here"
	else
		note "the uplink has no IPv6 default route, so there was no IPv6 to leak - not a pass, just not tested"
	fi
}

# ---------------------------------------------------------- broken tunnel

exit_ip() {   # the address this machine is seen from, or nothing
	curl -s -m 6 https://www.cloudflare.com/cdn-cgi/trace 2>/dev/null | sed -n 's/^ip=//p'
}

wait_ready() {
	i=0
	while [ "$i" -lt 36 ]; do
		[ "$(r 'cat /var/run/zirgozar/status 2>/dev/null')" = "ready" ] && return 0
		sleep 5
		i=$((i + 1))
	done
	return 1
}

fail_checks() {
	say ""
	say "== what a broken tunnel lets through"
	WANIP="$(r "curl -s -m 8 --interface $WAN https://www.cloudflare.com/cdn-cgi/trace | sed -n 's/^ip=//p'")"
	BASE="$(exit_ip)"
	if [ -z "$BASE" ] || [ -z "$WANIP" ]; then
		void "no baseline: this machine ${BASE:+reaches the internet}${BASE:-reaches nothing}, the router's uplink ${WANIP:+answers}${WANIP:-does not answer}"
		return
	fi
	[ "$BASE" != "$WANIP" ] && pass "baseline: this machine leaves by the tunnel, not by the uplink's own address" ||
		leak "baseline: this machine already leaves by the uplink's own address with the tunnel up"
	# The router itself must still answer: "reached nothing" is only worth
	# something when the LAN is alive.
	ctl() { curl -s -m 4 -o /dev/null -w '%{http_code}' "http://${ROUTER#*@}/" 2>/dev/null; }

	say "  -- the core killed (procd starts it again)"
	r 'for p in $(pgrep -f "xray run|sing-box run"); do kill -9 $p; done'
	sleep 1
	got="$(exit_ip)"; lan="$(ctl)"
	if [ "$lan" = "000" ] || [ -z "$lan" ]; then
		void "the router itself did not answer either, so nothing can be said"
	elif [ -z "$got" ]; then
		pass "nothing got out while the core was down"
	elif [ "$got" = "$WANIP" ]; then
		leak "traffic left by the uplink's own address while the core was down"
	else
		note "traffic still left by the tunnel's address - the core was back before the check"
	fi
	sleep 8
	[ -n "$(exit_ip)" ] && pass "the core is back and carrying traffic" || leak "the core did not come back within 9 seconds"

	say "  -- the core held down with the rules in place (procd told to stop that one instance)"
	r 'ubus call service delete "{\"name\":\"zirgozar\",\"instance\":\"zirgozar\"}" >/dev/null 2>&1'
	sleep 2
	got="$(exit_ip)"; lan="$(ctl)"
	drops="$(r 'nft list chain inet zirgozar prerouting 2>/dev/null' | awk '/counter packets [0-9]+ bytes [0-9]+ drop/ { s += $(NF - 3) } END { print s + 0 }')"
	if [ "$lan" = "000" ] || [ -z "$lan" ]; then
		void "the router itself did not answer either, so nothing can be said"
	elif [ -z "$got" ]; then
		pass "nothing got out with the core down and the rules up ($drops packets dropped by the guard)"
	elif [ "$got" = "$WANIP" ]; then
		leak "with the core down and the rules up, traffic left by the uplink's own address"
	else
		void "with the core down, traffic left by $got - neither the tunnel nor the uplink"
	fi
	r '/etc/init.d/zirgozar restart >/dev/null 2>&1'
	wait_ready && pass "the tunnel is back up" || leak "the tunnel did not come back within three minutes"

	say "  -- the service stopped (by design the network then works without the tunnel)"
	r '/etc/init.d/zirgozar stop >/dev/null 2>&1'
	sleep 3
	got="$(exit_ip)"
	if [ "$got" = "$WANIP" ]; then
		note "with the service stopped this machine leaves by the uplink directly - as designed, not a leak"
	elif [ -z "$got" ]; then
		note "with the service stopped nothing got out"
	else
		void "with the service stopped this machine left by $got, which is neither the tunnel nor the uplink"
	fi
	r '/etc/init.d/zirgozar start >/dev/null 2>&1'
	wait_ready && pass "the tunnel is back up" || leak "the tunnel did not come back within three minutes"
}

case "$ONLY" in
	dns)  dns_checks ;;
	fail) fail_checks ;;
	*)    dns_checks; fail_checks ;;
esac

say ""
if [ "$LEAK" = "1" ]; then say "RESULT: LEAK"; exit 1; fi
if [ "$WEIRD" = "1" ]; then say "RESULT: some checks could not be made (VOID)"; exit 3; fi
say "RESULT: no leak found"
exit 0
