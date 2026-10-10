#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar

. "$(dirname "$0")/rig.sh"
rig_setup
node "$RIG_SRC/test/test-aether-ui.js" || bad 'Aether UI corrupts share links'
if node "$RIG_SRC/test/test-aether-i18n.js"; then ok 'Aether runtime messages are Persian in Persian mode'; else bad 'untranslated Aether runtime message'; fi
. "$ZGZ_LIB/zgz-common.sh"
WORK="$RIG/aether-test"
mkdir -p "$WORK"
cat > "$WORK/aether" <<'CORE'
#!/bin/sh
case "$1" in
 --help) printf '%s\n' '--gool-peer --upstream --h2 --tor-only --psiphon-only --api-address --masque-sni'; exit 0 ;;
 --version) echo 'aether 2.3.0'; exit 0 ;;
esac
case " $* " in
 *' --register '*)
  printf '%s\n' "$@" >> "$ZGZ_RUN/account-argv"
  [ "${MOCK_ACCOUNT_FAIL:-0}" != 1 ] || exit 1
  case " $* " in *' --ech '*) [ "${MOCK_ECH_FAIL:-0}" != 1 ] || exit 1 ;; esac
  while [ "$#" -gt 0 ]; do
   if [ "$1" = --config ]; then shift; printf 'saved\n' > "${1%.toml}-masque.toml"; break; fi
   shift
  done
  exit 0 ;;
esac
printf '%s\n' "$@" > "$ZGZ_RUN/aether-argv"
CORE
chmod +x "$WORK/aether"
rig_set core_aether "$WORK/aether"
check "$("$ZGZ_LIB/zgz-aether" version)" 'aether 2.3.0' 'helper version works without a selected Aether node'
check "$(core_version "$ZGZ_LIB/zgz-aether")" '2.3.0' 'service records the real Aether core version'
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
if grep -qx -- '--ech' "$ZGZ_RUN/account-argv" && grep -qx 'udp://8.8.8.8' "$ZGZ_RUN/account-argv" && ! grep -qx -- '--ech' "$ZGZ_RUN/aether-argv"; then ok 'account ECH does not change tunnel ECH'; else bad 'account and tunnel ECH were mixed'; fi
rm -f "$ZGZ_RUN/account-argv"
"$ZGZ_LIB/zgz-aether" run
[ ! -e "$ZGZ_RUN/account-argv" ] && ok 'existing WARP keys are retained on reconnect' || bad 'reconnect registered new keys'
rm -f "$ZGZ_ETC/aether/a1/identity-masque.toml"
MOCK_ECH_FAIL=1 "$ZGZ_LIB/zgz-aether" run
check "$(grep -c '^--register$' "$ZGZ_RUN/account-argv")" 2 'automatic account provisioning falls back once when ECH fails'
rm -f "$ZGZ_RUN/account-argv" "$ZGZ_ETC/aether/a1/identity-masque.toml" "$ZGZ_RUN/aether-argv"
if MOCK_ACCOUNT_FAIL=1 "$ZGZ_LIB/zgz-aether" run >/dev/null 2>&1; then bad 'failed account provisioning started a tunnel'; else ok 'failed account provisioning stops with a specific error'; fi
[ ! -e "$ZGZ_RUN/aether-argv" ] && ok 'no tunnel starts after failed registration' || bad 'tunnel started without an account'
"$ZGZ_LIB/zgz-aether" run
node "$RIG_SRC/test/test-aether.js" argv "$ZGZ_RUN/aether-argv" || bad 'wrong Gool, transport or socket mark arguments'
rm -f "$ZGZ_RUN/aether-argv"
"$ZGZ_LIB/zgz-aether" prepare
[ ! -e "$ZGZ_RUN/aether-argv" ] && ok 'prepare retains keys without opening a tunnel' || bad 'prepare opened a tunnel'
ok 'helper command completed'
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
rig_report
