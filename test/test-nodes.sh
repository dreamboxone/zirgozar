#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>

. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"

# Supply OpenWrt's UCI traversal on the host, leaving the production builder
# and parser intact. Config values still go through the rig's UCI command.
cat > "$ZGZ_LIB/test-functions.sh" <<'FUNCTIONS'
config_load() { :; }
config_get() {
 local _value
 _value="$(uci -q get "zirgozar.$2.$3")" || _value="${4:-}"
 export "$1=$_value"
}
config_get_bool() {
 local _value
 _value="$(uci -q get "zirgozar.$2.$3")" || _value="${4:-0}"
 case "$_value" in 1|on|true|yes) _value=1 ;; *) _value=0 ;; esac
 export "$1=$_value"
}
config_foreach() {
 local _section _sections
 case "$2" in node) _sections="$RIG_NODES" ;; subscription) _sections="$RIG_SUBS" ;; esac
 for _section in $_sections; do "$1" "$_section"; done
 return 0
}
FUNCTIONS
sed 's|^\. /lib/functions.sh$|. "$ZGZ_LIB/test-functions.sh"|' \
 "$RIG_SRC/package/zirgozar/files/zgz-nodes" > "$ZGZ_LIB/zgz-nodes"
chmod +x "$ZGZ_LIB/zgz-nodes"
RIG_NODES='manual1 manual2 disabled'
RIG_SUBS='sub1'
export RIG_NODES RIG_SUBS
rig_set manual1.link 'socks://127.0.0.1:31001#manual-one'
rig_set manual2.link 'socks://127.0.0.1:31002#manual-two'
rig_set disabled.link 'socks://127.0.0.1:31003#disabled'
rig_set disabled.enabled 0
rig_set sub1.enabled 0
rig_set sources subs
mkdir -p "$ZGZ_RUN/subs"
printf '%s\n' 'socks://127.0.0.1:32001#subscription' > "$ZGZ_RUN/subs/sub1.links"
printf '%s\n' 'socks://127.0.0.1:32002#legacy' > "$ZGZ_NODE_CACHE"
printf '%s\n' stale > "$ZGZ_CANDIDATES"
say_message 'There is no node list yet: previous build failed'
if "$ZGZ_LIB/zgz-nodes" build; then ok 'all subscriptions off falls back to manual configs'; else bad 'manual fallback failed'; fi
check "$(wc -l < "$ZGZ_CANDIDATES" | tr -d ' ')" 2 'only the two enabled manual configs remain'
if grep -Eq 'subscription|legacy|disabled|stale' "$ZGZ_CANDIDATES"; then bad 'disabled or cached subscription survived'; else ok 'disabled sources and old candidates are excluded'; fi
[ ! -e "$ZGZ_MESSAGE" ] && ok 'successful rebuild clears its old warning' || bad 'old list warning survived'

say_message 'Aether cannot run on this router.'
"$ZGZ_LIB/zgz-nodes" build >/dev/null
check "$(cat "$ZGZ_MESSAGE")" 'Aether cannot run on this router.' 'rebuild preserves unrelated runtime errors'

rig_set sub1.enabled 1
if "$ZGZ_LIB/zgz-nodes" build; then ok 'enabled subscription remains usable'; else bad 'subscription build failed'; fi
check "$(cut -f2 "$ZGZ_CANDIDATES")" subscription 'subscription-only choice is respected while a subscription is enabled'
rig_set sources both
"$ZGZ_LIB/zgz-nodes" build >/dev/null
check "$(wc -l < "$ZGZ_CANDIDATES" | tr -d ' ')" 3 'both sources includes manual and subscription configs'
rig_set sources own
"$ZGZ_LIB/zgz-nodes" build >/dev/null
check "$(wc -l < "$ZGZ_CANDIDATES" | tr -d ' ')" 2 'manual-only choice excludes subscriptions'

rig_set sources subs
rm -f "$ZGZ_RUN/subs/sub1.links"
if "$ZGZ_LIB/zgz-nodes" build; then bad 'unreadable enabled subscription silently fell back'; else ok 'unreadable enabled subscription reports failure'; fi
[ ! -s "$ZGZ_CANDIDATES" ] && ok 'empty rebuild removes stale candidates' || bad 'stale candidates survived'
check "$(cat "$ZGZ_MESSAGE")" 'No configs are available from the enabled subscriptions. Update them or select manual configs.' 'failure explains which source is empty'

rig_set sub1.enabled 0
rig_set manual1.enabled 0
rig_set manual2.enabled 0
if "$ZGZ_LIB/zgz-nodes" build; then bad 'disabled manual configs were used'; else ok 'all disabled correctly produces an empty list'; fi
check "$(cat "$ZGZ_MESSAGE")" 'No enabled manual configs are available. Add or enable a config on the Configs page.' 'empty fallback asks for an enabled manual config'

rig_set manual1.enabled 1
rig_set manual1.link 'unsupported://invalid'
if "$ZGZ_LIB/zgz-nodes" build; then bad 'invalid manual link was accepted'; else ok 'invalid manual link is rejected'; fi
check "$(cat "$ZGZ_MESSAGE")" 'Nothing in the list could be read as a node' 'invalid config differs from no enabled config'

RIG_SUBS=''
export RIG_SUBS
printf '%s\n' 'socks://127.0.0.1:32002#legacy' > "$ZGZ_NODE_CACHE"
if "$ZGZ_LIB/zgz-nodes" build; then ok 'pre-section legacy cache still migrates'; else bad 'legacy cache migration failed'; fi
check "$(cut -f2 "$ZGZ_CANDIDATES")" legacy 'legacy cache is used only without configured subscriptions'
rig_report
