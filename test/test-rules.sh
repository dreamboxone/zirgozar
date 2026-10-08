#!/bin/sh
#
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar
#
# The firewall ruleset, put in front of a real nft rather than read carefully.
#
#   sh test/test-rules.sh
#
# nftables parses a ruleset and then fails at commit time when a kernel module
# is missing, and `nft --check` catches neither that nor a typo in a chain that
# only appears when a particular setting is switched on. So every combination
# of the settings that change the ruleset is generated and checked, which is
# how the QUIC option came to load fine on its own and break the whole ruleset
# the moment it was combined with anything else.

. "$(dirname "$0")/rig.sh"

rig_setup

if ! command -v nft >/dev/null 2>&1; then
	echo "  skip - no nft on this machine"
	rig_report
	exit 0
fi

WORK="$RIG/work"
mkdir -p "$WORK"

check_ruleset() {
	_what="$1"
	sh "$RIG/lib/zgz-rules" dump > "$WORK/rules.nft" 2>"$WORK/rules.err"
	if [ ! -s "$WORK/rules.nft" ]; then
		bad "$_what: nothing was generated ($(cat "$WORK/rules.err"))"
		return
	fi
	if nft --check --file "$WORK/rules.nft" >"$WORK/nft.err" 2>&1; then
		ok "$_what"
	else
		bad "$_what: $(head -2 "$WORK/nft.err" | tr '\n' ' ')"
	fi
}

# The device list is normally discovered from the running system; here it is
# pinned so the test says the same thing on every machine.
rig_set lan_zone "br-lan eth1"

echo "== every combination of the settings that change the ruleset"

rig_set ipv6 block;  rig_set block_quic 0; rig_set dns_hijack 1
check_ruleset "ipv6 blocked, no quic block, dns hijacked"

rig_set ipv6 block;  rig_set block_quic 1; rig_set dns_hijack 1
check_ruleset "ipv6 blocked, quic blocked, dns hijacked"

rig_set ipv6 off;    rig_set block_quic 1; rig_set dns_hijack 1
check_ruleset "ipv6 left alone, quic blocked, dns hijacked"

rig_set ipv6 off;    rig_set block_quic 0; rig_set dns_hijack 0
check_ruleset "ipv6 left alone, no quic block, no dns hijack"

rig_set ipv6 off;    rig_set block_quic 0; rig_set dns_hijack 1
check_ruleset "no forward chain at all, dns hijacked"

# A single interface has to work as well as several: `!= { "a" }` and
# `!= { "a", "b" }` are different enough syntactically to get wrong.
rig_set lan_zone "br-lan"
rig_set ipv6 block; rig_set block_quic 1; rig_set dns_hijack 1
check_ruleset "one LAN interface"

echo "== the pieces that have to be present"
rig_set lan_zone "br-lan"
sh "$RIG/lib/zgz-rules" dump > "$WORK/rules.nft"

for want in 'tproxy ip to 127.0.0.1:1082' 'meta mark set 0x162' \
            'ct direction reply return' 'ip daddr @reserved return' \
            'th dport 53 return'; do
	if grep -q "$want" "$WORK/rules.nft"; then
		ok "ruleset contains: $want"
	else
		bad "ruleset contains: $want"
	fi
done

# A tproxy rule with nothing listening steps aside rather than dropping, and
# the packet goes out of the uplink untunnelled - so each one is followed by
# the same match, dropping. Measured on a router before this was added: a LAN
# machine left by the uplink's own address a second after the core died.
unguarded="$(awk '
	prev != "" { sel = prev; sub(/[ \t]*counter[ \t]+tproxy .*$/, "", sel)
	             if (index($0, sel " counter drop") == 0) n++
	             prev = "" }
	/ tproxy ip6? to / { prev = $0 }
	END { print n + 0 }' "$WORK/rules.nft")"
if [ "$unguarded" = "0" ] && grep -q 'tproxy ip to' "$WORK/rules.nft"; then
	ok "every tproxy rule is followed by a drop for what it could not take"
else
	bad "every tproxy rule is followed by a drop for what it could not take ($unguarded are not)"
fi

# Name lookups must be let past the transparent proxy chain and taken by the
# nat chain instead. Both rules in the same chain would mean queries are
# tproxied and redirected at once, and the redirect never happens.
if awk '/chain prerouting/, /^\t}/' "$WORK/rules.nft" | grep -q 'redirect to'; then
	bad "the DNS redirect is in the prerouting chain, where it does not belong"
else
	ok "the DNS redirect is not in the transparent proxy chain"
fi

# The return for port 53 has to come before the tproxy rules, or it never runs.
# The LAN's rules, that is: the router's own traffic arrives on lo already
# sifted - its output chain lets port 53, local and direct addresses past
# before marking anything - and its rule has to come before the LAN-only
# check, so it is first on purpose and left out here.
order=$(awk '/chain prerouting/, /^\t}/' "$WORK/rules.nft" | grep -v 'iifname "lo"' |
	grep -n 'th dport 53 return\|tproxy ip to' | head -2 | cut -d: -f2)
first=$(awk '/chain prerouting/, /^\t}/' "$WORK/rules.nft" | grep -v 'iifname "lo"' |
	grep -n 'th dport 53 return\|tproxy ip to' | head -1)
case "$first" in
	*"dport 53 return"*) ok "port 53 is let past before the tproxy rules" ;;
	*) bad "port 53 is let past before the tproxy rules (got: $first)" ;;
esac

# Refusing QUIC has to happen in prerouting and ahead of the tproxy rules. A
# packet handed to the local socket there never reaches the forward hook, so a
# rule sitting on forward - which is where this one sat - refuses nothing at
# all. It passed every syntax check in this file the whole time it was doing
# nothing, which is what this asserts instead.
rig_set block_quic 1
sh "$RIG/lib/zgz-rules" dump > "$WORK/rules.nft"
pre=$(awk '/chain prerouting/, /^\t}/' "$WORK/rules.nft" | grep -v 'iifname "lo"')
if printf '%s\n' "$pre" | grep -q 'dport 443'; then
	ok "the QUIC rule is in the prerouting chain"
	q=$(printf '%s\n' "$pre" | grep -n 'dport 443' | head -1 | cut -d: -f1)
	t=$(printf '%s\n' "$pre" | grep -n 'tproxy ip to' | head -1 | cut -d: -f1)
	if [ -n "$q" ] && [ -n "$t" ] && [ "$q" -lt "$t" ]; then
		ok "and ahead of the tproxy rules, which is the only place it works"
	else
		bad "and ahead of the tproxy rules, which is the only place it works"
	fi
else
	bad "the QUIC rule is in the prerouting chain"
fi
if awk '/chain forward/, /^\t}/' "$WORK/rules.nft" | grep -q 'dport 443'; then
	bad "the QUIC rule is not left on the forward hook, where it never runs"
else
	ok "the QUIC rule is not left on the forward hook, where it never runs"
fi
rig_set block_quic 0

# A device that looked a blocked name up while the tunnel was off still has the
# filtering address for it. That address is inside 10.0.0.0/8, so it has to be
# sent to the tunnel before the reserved-address return, or it never is.
sh "$RIG/lib/zgz-rules" dump > "$WORK/rules.nft"
pre=$(awk '/chain prerouting/, /^	}/' "$WORK/rules.nft")
p=$(printf '%s
' "$pre" | grep -n 'ip daddr 10.10.34.0/24 meta l4proto tcp .*tproxy ip to 127.0.0.1:1084' | head -1 | cut -d: -f1)
r=$(printf '%s
' "$pre" | grep -n 'ip daddr @reserved return' | head -1 | cut -d: -f1)
if [ -n "$p" ] && [ -n "$r" ] && [ "$p" -lt "$r" ]; then
	ok "the filtering addresses go to their own inbound, ahead of the reserved return"
else
	bad "the filtering addresses go to their own inbound, ahead of the reserved return"
fi
rig_set client_proxy 0
sh "$RIG/lib/zgz-rules" dump > "$WORK/rules.nft"
if grep -q '10.10.34.0/24' "$WORK/rules.nft"; then
	bad "with Client Proxy off the filtering addresses are left alone"
else
	ok "with Client Proxy off the filtering addresses are left alone"
fi
rig_set client_proxy 1

echo "== QUIC on automatic"
# Refused while the node in use goes through a CDN transport - a Cloudflare
# Worker carries no UDP - and with patterniha's Xray chosen, as PattN does.
rig_set block_quic auto
quic_auto() {
	printf '%s' "$2" > "$ZGZ_ETC/best.json"
	sh "$RIG/lib/zgz-rules" dump > "$WORK/rules.nft"
	if grep -q 'udp th dport 443 counter drop' "$WORK/rules.nft"; then _q=1; else _q=0; fi
	if [ "$_q" = "$3" ]; then ok "$1"; else bad "$1"; fi
}
quic_auto "a node over WebSocket: QUIC refused" '{"protocol":"vless","streamSettings":{"network":"ws"}}' 1
quic_auto "a node over XHTTP: QUIC refused" '{"protocol":"vless","streamSettings":{"network":"xhttp"}}' 1
quic_auto "a node over plain TCP: QUIC let through" '{"protocol":"vless","streamSettings":{"network":"tcp"}}' 0
rig_set core_engine xray-patterniha
quic_auto "patterniha's Xray chosen: QUIC refused" '{"protocol":"vless","streamSettings":{"network":"tcp"}}' 1
rig_set core_engine xray
rig_set block_quic 0
quic_auto "off is off, whatever the node" '{"protocol":"vless","streamSettings":{"network":"ws"}}' 0
rm -f "$ZGZ_ETC/best.json"

echo "== the Kill switch"
# A table of its own, loaded by its own boot script and kept when the tunnel
# comes down. What matters is what it lets past: everything the tunnel itself
# lets go direct, and nothing else.
ks_dump() { sh "$RIG/lib/zgz-rules" ks dump > "$WORK/ks.nft" 2>"$WORK/ks.err"; }
ks_check() {
	_what="$1"
	ks_dump
	if [ ! -s "$WORK/ks.nft" ]; then
		bad "$_what: nothing was generated ($(cat "$WORK/ks.err"))"
		return
	fi
	{ printf 'add table inet zirgozar_ks\ndelete table inet zirgozar_ks\n'; cat "$WORK/ks.nft"; } > "$WORK/ks.load.nft"
	if nft --check --file "$WORK/ks.load.nft" >"$WORK/nft.err" 2>&1; then
		ok "$_what"
	else
		bad "$_what: $(head -2 "$WORK/nft.err" | tr '\n' ' ')"
	fi
}
ks_has() {
	if grep -q -- "$1" "$WORK/ks.nft"; then ok "$2"; else bad "$2"; fi
}
ks_hasnt() {
	if grep -q -- "$1" "$WORK/ks.nft"; then bad "$2"; else ok "$2"; fi
}

ZGZ_GEO_SEARCH=""; export ZGZ_GEO_SEARCH
rig_clear
rig_set lan_zone "br-lan eth1"
rig_set kill_switch 1
ks_check "the defaults load"
ks_has 'hook forward priority -5' "it sits on the forward hook, ahead of the firewall's own chain"
ks_has 'iifname != { "br-lan", "eth1" } return' "only what comes from the LAN is looked at"
ks_has 'oifname { "br-lan", "eth1" } return' "LAN to LAN is left alone"
ks_has 'ct direction reply return' "replies to connections from outside are left alone"
ks_has 'ip daddr @reserved return' "private addresses are left alone"
ks_has 'counter drop' "and the rest is dropped"
ks_hasnt 'tproxy' "it has nothing of the tunnel in it"
ks_hasnt '@ir4' "no Iranian addresses with the split off"

# Nothing of it is the tunnel's: taking the tunnel down must leave it.
if awk '/^cmd_down\(\)/, /^}/' "$RIG/lib/zgz-rules" | grep -q 'KS_TABLE\|ks_\|ZGZ_KS'; then
	bad "taking the tunnel down leaves the Kill switch alone"
else
	ok "taking the tunnel down leaves the Kill switch alone"
fi

for combo in "ipv6 off" "ipv6 block" "dns_hijack 0" "dns_hijack 1" "client_proxy 0" "client_proxy 1"; do
	# shellcheck disable=SC2086
	rig_set $combo
	ks_check "loads with $combo"
done
rig_set ipv6 block; rig_set dns_hijack 1; rig_set client_proxy 1

rig_set ipv6 off
ks_dump
ks_has 'meta nfproto ipv6 return' "IPv6 left alone is not the Kill switch's business"
rig_set ipv6 block
ks_dump
ks_hasnt 'meta nfproto ipv6 return' "IPv6 refused by the tunnel is refused here too"

rig_set dns_hijack 0
ks_dump
ks_has 'th dport 53 return' "with DNS Redirect off, name lookups go as the tunnel lets them"
rig_set dns_hijack 1
ks_dump
ks_hasnt 'th dport 53 return' "with DNS Redirect on, they are redirected and not let out"

rig_set client_proxy 0
ks_dump
ks_hasnt 'counter drop' "with Client Proxy off, devices are not the tunnel's and are not dropped"
rig_set client_proxy 1

rig_set direct_ip "1.2.3.4 5.6.0.0/16"
ks_dump
ks_has 'ip daddr @direct return' "addresses on the Traffic Rules page that go direct are let past"
ks_has '5.6.0.0/16' "with their ranges"
rig_set direct_ip ""

rig_set tcp_no_redir_ports "25,587"
ks_dump
ks_has 'tcp dport { 25, 587 } return' "ports that go straight out are let past"
rig_set tcp_no_redir_ports ""

# Iranian addresses: only with the split on, the routing data there, and a
# list cut out of it.
mkdir -p "$ZGZ_ETC/geo"
: > "$ZGZ_ETC/geo/geoip.dat"; : > "$ZGZ_ETC/geo/geosite.dat"
echo x > "$ZGZ_ETC/geo/geoip.dat"; echo x > "$ZGZ_ETC/geo/geosite.dat"
printf '5.22.0.0/17\n2.176.0.0/12\n2a01:4f8::/32\n' > "$ZGZ_ETC/ks-ir.list"
rig_set route_ir 0
ks_dump
ks_hasnt '@ir4' "a list of Iranian ranges is not used with the split off"
rig_set route_ir 1
ks_check "loads with the Iran split on"
ks_has 'ip daddr @ir4 return' "Iranian IPv4 addresses are let past with the split on"
ks_has 'ip6 daddr @ir6 return' "and Iranian IPv6 ones"
ks_has '2.176.0.0/12' "the ranges are in the set"
rm -f "$ZGZ_ETC/geo/geoip.dat"
ks_dump
ks_hasnt '@ir4' "no routing data, no Iranian exception - the split is not on either"
rm -f "$ZGZ_ETC/geo/geosite.dat" "$ZGZ_ETC/ks-ir.list"
rig_set route_ir 0

# Access Control
rig_set acl_enable 1
printf 'r1\t-\t00:11:22:33:44:55\t192.168.1.50\t-\t0\t0\t-\t-\t-\t-\nr2\t-\t-\t192.168.1.60-192.168.1.70\t-\t2\t0\t25\t-\t-\t-\n' > "$ZGZ_RUN/acl.tsv"
ks_check "loads with Access Control rules"
ks_has 'ether saddr { 00:11:22:33:44:55 } jump ks_acl_1' "a device set to go direct is looked at first"
ks_has 'ip saddr { 192.168.1.60-192.168.1.70 } jump ks_acl_2' "and so is a range set to be tunnelled"
awk '/chain ks_acl_1 /, /^\t}/' "$WORK/ks.nft" | grep -q 'accept' && ok "a direct device is accepted" || bad "a direct device is accepted"
awk '/chain ks_acl_2 /, /^\t}/' "$WORK/ks.nft" | grep -q 'counter drop' && ok "a tunnelled device is held" || bad "a tunnelled device is held"
awk '/chain ks_acl_2 /, /^\t}/' "$WORK/ks.nft" | grep -q 'tcp dport { 25 } accept' && ok "except for the ports that rule sends direct" || bad "except for the ports that rule sends direct"
rig_set acl_enable 0
ks_dump
ks_hasnt 'ks_acl_' "Access Control rules are not read with the page off"
rm -f "$ZGZ_RUN/acl.tsv"

echo "== the Kill switch, iptables"
rig_set lan_zone "br-lan"
rig_set kill_switch 1
sh "$RIG/lib/zgz-rules" ks dump-ipt > "$WORK/ks.ipt" 2>&1
for want in '^-N ZGZ_KS$' '^-A ZGZ_KS -o br-lan -j RETURN$' '^-A ZGZ_KS -d 192.168.0.0/16 -j RETURN$' '^-A ZGZ_KS -j DROP$'; do
	if grep -q -- "$want" "$WORK/ks.ipt"; then ok "iptables rules contain: $want"; else bad "iptables rules contain: $want"; fi
done
if grep -q 'DROP' "$WORK/ks.ipt" && [ "$(tail -1 "$WORK/ks.ipt")" = "-A ZGZ_KS -j DROP" ]; then
	ok "the drop is the last rule"
else
	bad "the drop is the last rule"
fi

echo "== the Kill switch outlasts the tunnel"
# Its boot script runs before the firewall (19) and the network (20), and
# never takes it away.
start_n="$(sed -n 's/^START=//p' "$RIG_SRC/package/zirgozar/files/zirgozar-killswitch.init")"
if [ -n "$start_n" ] && [ "$start_n" -lt 19 ]; then
	ok "its boot script runs before the firewall"
else
	bad "its boot script runs before the firewall (START=$start_n)"
fi
if awk '/^stop\(\)/, /^}/' "$RIG_SRC/package/zirgozar/files/zirgozar-killswitch.init" | grep -q 'ks down\|ks_down'; then
	bad "its boot script never takes it down"
else
	ok "its boot script never takes it down"
fi
# Both the stop and the failed paths of the tunnel's own service call the
# tunnel's `down`, which does not touch it - and none calls `ks down`.
if grep -n 'ks down' "$RIG_SRC/package/zirgozar/files/zirgozar.init" "$RIG_SRC/package/zirgozar/files/zgz-connect" >/dev/null 2>&1; then
	bad "nothing on the tunnel's way down takes the Kill switch down"
else
	ok "nothing on the tunnel's way down takes the Kill switch down"
fi
rig_clear

rig_report
