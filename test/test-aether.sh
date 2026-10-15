#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar

. "$(dirname "$0")/rig.sh"
rig_setup
node "$RIG_SRC/test/test-aether-ui.js" || bad 'Aether UI corrupts share links'
. "$ZGZ_LIB/zgz-common.sh"
WORK="$RIG/aether-test"
mkdir -p "$WORK"
cat > "$WORK/aether" <<'CORE'
#!/bin/sh
case "$1" in
 --help) printf '%s\n' '--gool-peer --upstream --h2 --tor-only --psiphon-only'; exit 0 ;;
 --version) echo 'aether 2.3.0'; exit 0 ;;
esac
for arg in "$@"; do
	case "$arg" in --no-fragment|--psiphon-no-bundled) echo "unsupported option: $arg" >&2; exit 1 ;; esac
done
printf '%s\n' "$@" > "$ZGZ_RUN/aether-argv"
printf '%s\n' "${AETHER_MASQUE_H2_FRAGMENT:-}" > "$ZGZ_RUN/aether-fragment"
CORE
chmod +x "$WORK/aether"
rig_set core_aether "$WORK/aether"
rig_set n1.link 'socks5://127.0.0.1:39080#entry'
rig_set a1.link 'aether://?protocol=wg-over-masque&scan=balanced&ip=v4&transport=h2&outer=162.159.198.204%3A443#aether'
rig_set node a1
node_records a1 1 > "$WORK/record.tsv"
check "$(cut -f3 "$WORK/record.tsv")" aether 'sample link is an Aether node'
check "$(cut -f4,5 "$WORK/record.tsv")" "$(printf '162.159.198.204\t443')" 'outer endpoint is URL-decoded'
if cut -f6- "$WORK/record.tsv" | grep -q '"id":"a1"'; then ok 'Aether identity belongs to its node'; else bad 'Aether identity has no node id'; fi
"$ZGZ_LIB/zgz-probe" use a1 >/dev/null 2>&1
check "$(bridge_type)" aether 'selected Aether is stored as a bridge'
check "$(wanted_engine)" xray 'Aether does not force a second routing engine'
if bridge_wanted singbox; then ok 'Aether is also a helper under sing-box'; else bad 'sing-box dropped the Aether helper'; fi
if "$ZGZ_LIB/zgz-aether" check; then ok 'Aether validates without starting a tunnel'; else bad 'Aether validation failed'; fi
[ ! -e "$ZGZ_RUN/aether-argv" ] && ok 'validation does not launch Aether' || bad 'validation launched a tunnel'
"$ZGZ_LIB/zgz-aether" run
node "$RIG_SRC/test/test-aether.js" argv "$ZGZ_RUN/aether-argv" || bad 'wrong Gool, transport or socket mark arguments'
ok 'helper command completed'
if grep -qx -- '--upstream' "$ZGZ_RUN/aether-argv"; then bad 'a plain Aether config is sent back through the core'; else ok 'a plain Aether config goes straight out, marked'; fi
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/direct.json"
if node "$RIG_SRC/test/test-aether.js" direct "$WORK/direct.json"; then ok 'direct Aether keeps marked egress and bootstrap DNS outside its tunnel'; else bad 'direct Aether has a bootstrap loop'; fi
rig_set a1.aether_exit_node n1
"$ZGZ_LIB/zgz-aether" run
node "$RIG_SRC/test/test-aether.js" upstream "$ZGZ_RUN/aether-argv" || bad 'wrong upstream direction'
"$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/chained.json"
if node "$RIG_SRC/test/test-aether.js" config "$WORK/chained.json"; then ok 'exit-node gets a separate SOCKS inlet and routing rule'; else bad 'Aether upstream routing is invalid'; fi
if [ -n "$RIG_XRAY" ] && [ -x "$RIG_XRAY" ]; then
 if "$RIG_XRAY" run -test -config "$WORK/chained.json" > "$WORK/core.log" 2>&1; then ok 'Xray accepts chained Aether routing'; else bad 'Xray refuses Aether routing'; cat "$WORK/core.log"; fi
fi
for KIND in tor psiphon; do
 rig_set a1.link "aether://?protocol=masque&transport=h2&$KIND=only#exit"
 "$ZGZ_LIB/zgz-probe" use a1 >/dev/null 2>&1
 "$ZGZ_LIB/zgz-aether" run
 if grep -qx -- "--$KIND-only" "$ZGZ_RUN/aether-argv" && grep -qx 'socks5://127.0.0.1:10809' "$ZGZ_RUN/aether-argv"; then ok "selected-config carries $KIND"; else bad "$KIND lost the selected-config upstream"; fi
done
rig_set a1.aether_exit_node a1
_rc=0
timeout -k 1 3 "$ZGZ_LIB/zgz-aether" check >/dev/null 2>&1 || _rc=$?
check "$_rc" 1 'self-reference is rejected without hanging'
rig_set a1.aether_exit_node missing
if "$ZGZ_LIB/zgz-mkconfig" nogeo > "$WORK/missing.json" 2>/dev/null; then bad 'missing exit-node silently went direct'; else ok 'missing exit-node stops configuration'; fi
rig_set a1.aether_exit_node n1
rig_set aether_upstream_port 10808
if "$ZGZ_LIB/zgz-aether" check >/dev/null 2>&1; then bad 'Aether accepted overlapping ports'; else ok 'overlapping helper and upstream ports are rejected'; fi
for LINK in 'aether://?protocol=unknown' 'aether://?protocol=masque&scan=unknown' 'aether://?protocol=masque&transport=h9'; do
 check "$(printf '%s\n' "$LINK" | LC_ALL=C awk -f "$ZGZ_LIB/zgz-parse")" '' 'invalid Aether options are ignored without a partial record'
done
rig_set aether_upstream_port 10809
rig_set a1.aether_exit_node _direct
rig_set a1.link 'aether://?protocol=masque&transport=h2&fragment=0&psiphon=chain&psiphon_bundled=0#test'
"$ZGZ_LIB/zgz-probe" use a1 >/dev/null 2>&1
if "$ZGZ_LIB/zgz-aether" run; then ok 'core without negative switches runs with fragmentation and bundled list off'; else bad 'unsupported switches prevent execution'; fi
check "$(cat "$ZGZ_RUN/aether-fragment")" 0 'fragmentation is explicitly disabled through the supported environment'
rig_set a1.link 'aether://?protocol=masque&transport=h2&psiphon_servers=%2Ftmp%2Funsafe#test'
"$ZGZ_LIB/zgz-probe" use a1 >/dev/null 2>&1
if "$ZGZ_LIB/zgz-aether" check 2>/dev/null; then bad 'external server list path accepted'; else ok 'server list is restricted to persistent application storage'; fi
rig_set a1.link 'aether://?protocol=masque&transport=h2#auto'
mkdir -p "$ZGZ_RUN/tests"
echo 123 > "$ZGZ_RUN/tests/a1.tcp"
"$ZGZ_LIB/zgz-test" ping a1
check "$(cat "$ZGZ_RUN/tests/a1.ping")" -2 'automatic Aether endpoint has no fixed ICMP target'
check "$(cat "$ZGZ_RUN/tests/a1.tcp")" 123 'Aether ping does not overwrite the TCP result'
"$ZGZ_LIB/zgz-test" tcp a1
check "$(cat "$ZGZ_RUN/tests/a1.tcp")" -2 'automatic Aether endpoint has no fixed TCP target'
cat > "$RIG/bin/curl" <<'CURL'
#!/bin/sh
printf '0.123'
exit 56
CURL
chmod +x "$RIG/bin/curl"
rig_set a1.link 'aether://?protocol=wg-over-masque&transport=h2&outer=162.159.198.204%3A443#fixed'
"$ZGZ_LIB/zgz-test" tcp a1
check "$(cat "$ZGZ_RUN/tests/a1.tcp")" 123 'TCP timing is kept when the TLS port rejects a plain HTTP request'
cat > "$ZGZ_LIB/zgz-aether" <<'HELPER'
#!/bin/sh
[ "$1" = test ] && [ "$2" = a1 ] || exit 1
[ "$(cat "$ZGZ_RUN/tests/a1.url")" = -1 ] || exit 1
cat > "$ZGZ_RUN/aether-url-payload"
echo 321
HELPER
chmod +x "$ZGZ_LIB/zgz-aether"
"$ZGZ_LIB/zgz-test" url a1
check "$(cat "$ZGZ_RUN/tests/a1.url")" 321 'URL Test measures the Aether helper while retaining the running marker'
grep -q '"type":"aether"' "$ZGZ_RUN/aether-url-payload" && ok 'URL Test receives the selected Aether configuration' || bad 'URL Test lost the Aether configuration'
rig_report
