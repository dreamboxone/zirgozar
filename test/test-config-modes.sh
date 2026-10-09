#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar

. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
WORK="$RIG/modes"
mkdir -p "$WORK"

rig_set n1.link 'socks5://127.0.0.1:39080#member'
rig_set n1.name member
rig_set b1.link 'balancing://b1'
rig_set b1.balancing_node n1
rig_set node b1

for strategy in random roundRobin leastPing leastLoad; do
	rig_set b1.balancingStrategy "$strategy"
	node_records b1 1 | cut -f6- > "$RIG/etc/best.json"
	printf 'tag=b1\nprotocol=balancing\nhost=127.0.0.1\nport=39080\n' > "$RIG/etc/best.meta"
	sh "$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/$strategy.json"
	if node "$RIG_SRC/test/test-config-modes.js" "$WORK/$strategy.json"; then
		ok "$strategy emits its members and routes loopback to the balancer"
	else
		bad "$strategy has invalid routing or missing members"
	fi
	if [ -n "$RIG_XRAY" ] && [ -x "$RIG_XRAY" ]; then
		if "$RIG_XRAY" run -test -config "$WORK/$strategy.json" > "$WORK/$strategy.err" 2>&1; then
			ok "Xray accepts $strategy"
		else
			bad "Xray refuses $strategy"
			cat "$WORK/$strategy.err"
		fi
	fi
done

reject_cycle() {
	_rc=0
	timeout -k 1 3 sh -c '. "$ZGZ_LIB/zgz-common.sh"; node_records "$1" 1' sh "$1" > "$WORK/cycle.tsv" 2>/dev/null || _rc=$?
	check "$_rc" 1 "$2 is refused without hanging"
	check "$(wc -c < "$WORK/cycle.tsv" | tr -d ' ')" 0 "$2 emits no partial record"
}

rig_set b1.balancing_node b1
reject_cycle b1 'balancing self-reference'
rig_set b2.link 'balancing://b2'
rig_set b1.balancing_node b2
rig_set b2.balancing_node b1
reject_cycle b1 'two balancing nodes referencing each other'
rig_set s1.link 'shunt://s1'
rig_set s1.shunt_default s1
reject_cycle s1 'shunt self-reference'
rig_set s2.link 'shunt://s2'
rig_set s1.shunt_default s2
rig_set s2.shunt_default s1
reject_cycle s1 'two shunt nodes referencing each other'
rig_set b1.balancing_node s1
rig_set s1.shunt_default b1
reject_cycle b1 'balancing and shunt referencing each other'

# A bad member must not hide the usable node after it.
rig_set b1.balancing_node 'b1 n1'
check "$(timeout -k 1 3 sh -c '. "$ZGZ_LIB/zgz-common.sh"; node_records b1 1' | cut -f3)" balancing 'valid member survives a rejected virtual member'
rig_set s1.shunt_default n1
check "$(node_records s1 1 | cut -f3)" shunt 'shunt with a real default remains usable'
rig_set i1.link 'interface://i1'
rig_set i1.iface eth0
node_records i1 1 | cut -f6- > "$RIG/etc/best.json"
printf 'tag=i1\nprotocol=interface\nport=0\n' > "$RIG/etc/best.meta"
sh "$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/interface.json"
if node "$RIG_SRC/test/test-config-modes.js" "$WORK/interface.json"; then
	ok 'custom interface retains its device and bypass mark'
else
	bad 'custom interface has an invalid outbound'
fi
if [ -n "$RIG_XRAY" ] && [ -x "$RIG_XRAY" ]; then
	if "$RIG_XRAY" run -test -config "$WORK/interface.json" > "$WORK/interface.err" 2>&1; then
		ok 'Xray accepts the custom interface config'
	else
		bad 'Xray refuses the custom interface config'
		cat "$WORK/interface.err"
	fi
fi
rig_report
