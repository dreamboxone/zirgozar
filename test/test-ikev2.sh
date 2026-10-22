#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
RIG_ROOT="${RIG_ROOT:-$(mktemp -d /tmp/zgz-ikev2-test.XXXXXX)}"
. "$(dirname "$0")/rig.sh"
rig_setup
node "$RIG_SRC/test/test-ikev2-form.js" || bad 'IKEv2 certificate import or authentication form failed'

# Exercise the production helpers without starting IPsec or altering routes.
sed '/^case "$MODE" in/,$d; s/^check() {/ikev2_check() {/' "$RIG/lib/zgz-ikev2" > "$RIG/ikev2-functions"
. "$RIG/ikev2-functions"
resolve_direct() { [ ! -f "$ZGZ_RUN/direct.answer" ] || cat "$ZGZ_RUN/direct.answer"; }
bounded() { shift; "$@"; }
cat > "$RIG/bin/nslookup" <<'SH'
#!/bin/sh
echo "$2" >> "$ZGZ_RUN/dns.calls"
printf 'Server: 127.0.0.1\nAddress: 127.0.0.1:53\nName: test.example\nAddress: 192.0.2.20\n'
SH
cat > "$RIG/bin/sleep" <<'SH'
#!/bin/sh
echo sleep >> "$ZGZ_RUN/wait.calls"
SH
cat > "$RIG/bin/swanctl" <<'SH'
#!/bin/sh
count=$(cat "$ZGZ_RUN/stats.count" 2>/dev/null || echo 0)
count=$((count+1))
echo "$count" > "$ZGZ_RUN/stats.count"
[ ! -f "$ZGZ_RUN/always-fail" ] && [ "$count" -ge 3 ]
SH
chmod +x "$RIG/bin/nslookup" "$RIG/bin/sleep" "$RIG/bin/swanctl"

check "$(resolve_ikev2 test.example)" 192.0.2.20 'unresponsive WAN DNS falls back to the existing router resolver'
check "$(cat "$ZGZ_RUN/dns.calls")" 127.0.0.1 'fallback uses the configured router resolver, not a new public provider'
printf '192.0.2.10\n' > "$ZGZ_RUN/direct.answer"
: > "$ZGZ_RUN/dns.calls"
check "$(resolve_ikev2 test.example)" 192.0.2.10 'working direct DNS remains preferred'
check "$(wc -l < "$ZGZ_RUN/dns.calls" | tr -d ' ')" 0 'working direct DNS does not trigger another lookup'

if wait_ipsec; then ok 'a restarting daemon is retried until VICI actually replies'; else bad 'daemon readiness retry'; fi
check "$(cat "$ZGZ_RUN/stats.count")" 3 'readiness requires a successful reply rather than a stale socket'
: > "$ZGZ_RUN/always-fail"
: > "$ZGZ_RUN/wait.calls"
if wait_ipsec; then bad 'unavailable VICI service was accepted'; else ok 'unavailable VICI service fails'; fi
check "$(wc -l < "$ZGZ_RUN/wait.calls" | tr -d ' ')" 10 'service wait is bounded'

# An unsaved account must install its own requirements, independent of UCI.
sed '/^case "${1:-check}" in/,$d' "$RIG/lib/zgz-deps" > "$RIG/deps-functions"
. "$RIG/deps-functions"
DEPS_PROTOCOL=ikev2
required="$(wanted)"
case " $required " in *strongswan-mod-eap-mschapv2*) ok 'unsaved IKEv2 account requests EAP-MSCHAPv2' ;; *) bad 'missing EAP prerequisite' ;; esac
case " $required " in *kmod-xfrm-interface*) ok 'unsaved IKEv2 account requests the XFRM device' ;; *) bad 'missing XFRM prerequisite' ;; esac
case " $required " in *ucode-mod-socket*) ok 'unsaved IKEv2 account requests VICI socket support' ;; *) bad 'missing socket prerequisite' ;; esac
case " $required " in *xl2tpd*|*sstp-client*|*openvpn*) bad 'unrelated protocol dependencies were added' ;; *) ok 'targeted dependency installation excludes unrelated protocols' ;; esac
cat > "$RIG/lib/zgz-deps" <<'SH'
#!/bin/sh
printf '%s\n' "$*" > "$ZGZ_RUN/protocol-install.calls"
SH
cat > "$RIG/bin/modprobe" <<'SH'
#!/bin/sh
exit 1
SH
chmod +x "$RIG/lib/zgz-deps" "$RIG/bin/modprobe"
ensure_dependencies
check "$(cat "$ZGZ_RUN/protocol-install.calls")" 'install ikev2' 'connection bootstrap installs the scoped protocol prerequisites'

# The active connection path must bypass localhost interception as well.
rig_set localhost_proxy 1
printf '{"type":"ikev2"}\n' > "$ZGZ_ETC/bridge.json"
cat > "$RIG/bin/ip" <<'SH'
#!/bin/sh
echo '    inet 192.0.2.1/32 scope global zgzikev2'
SH
cat > "$RIG/lib/zgz-rules" <<'SH'
#!/bin/sh
echo "$*" >> "$ZGZ_RUN/local.calls"
case "$2" in
    pause) touch "$ZGZ_RUN/local.paused" ;;
    resume) rm -f "$ZGZ_RUN/local.paused" ;;
esac
SH
cat > "$RIG/bin/curl" <<'SH'
#!/bin/sh
[ -f "$ZGZ_RUN/local.paused" ] || exit 1
echo 0.125
SH
chmod +x "$RIG/bin/ip" "$RIG/bin/curl" "$RIG/lib/zgz-rules"
check "$(sh "$RIG/lib/zgz-ikev2" test url < "$ZGZ_ETC/bridge.json")" 125 'active IKEv2 URL test bypasses localhost interception'
check "$(cat "$ZGZ_RUN/local.calls")" "$(printf 'local pause\nlocal resume')" 'active connection test restores localhost interception'
[ ! -e "$ZGZ_RUN/.l2tp-test-lock" ] && ok 'active connection test releases its lock' || bad 'active test left its lock'
rig_report
