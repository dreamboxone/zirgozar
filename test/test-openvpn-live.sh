#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# A local TLS VPN server and HTTP endpoint, isolated from the host's routes.
set -e
. "$(dirname "$0")/rig.sh"
rig_setup
[ -n "${RIG_XRAY:-}" ] && command -v openvpn >/dev/null && [ "$(id -u)" = 0 ] || { echo 'skip: live OpenVPN needs root, OpenVPN and RIG_XRAY'; exit 77; }
ns="zgz-ovpn-$$"; host="zovh$$"; peer="zovp$$"; server=''; http=''
cleanup() {
 for pid in "$http" "$server"; do
  [ -z "$pid" ] || { kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; }
 done
 ip netns del "$ns" 2>/dev/null || true
 ip link del "$host" 2>/dev/null || true
 rm -rf "$RIG"
}
trap cleanup EXIT
trap 'exit 1' INT TERM
ip netns add "$ns"
ip link add "$host" type veth peer name "$peer"
ip link set "$peer" netns "$ns"
ip addr add 169.254.249.1/30 dev "$host"
ip link set "$host" up
ip -n "$ns" link set lo up
ip -n "$ns" addr add 169.254.249.2/30 dev "$peer"
ip -n "$ns" link set "$peer" up
umask 077
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$RIG/key.pem" -out "$RIG/cert.pem" \
 -days 1 -subj /CN=zirgozar-local-test -addext extendedKeyUsage=serverAuth,clientAuth \
 -addext keyUsage=digitalSignature,keyEncipherment > "$RIG/cert.log" 2>&1
cat > "$RIG/server.conf" <<EOF
dev zgzovpns
dev-type tun
proto udp
local 169.254.249.2
port 11940
server 10.249.0.0 255.255.255.0
topology subnet
ca $RIG/cert.pem
cert $RIG/cert.pem
key $RIG/key.pem
dh none
data-ciphers AES-256-GCM:AES-128-GCM
route-noexec
verb 3
EOF
ip netns exec "$ns" openvpn --config "$RIG/server.conf" > "$RIG/server.log" 2>&1 &
server=$!
n=0
until ip -n "$ns" -4 addr show dev zgzovpns 2>/dev/null | grep -q '10.249.0.1'; do
 n=$((n+1)); [ "$n" -le 10 ] || { cat "$RIG/server.log"; exit 1; }; sleep 1
done
mkdir "$RIG/public"
echo connected > "$RIG/public/index.html"
ip netns exec "$ns" python3 -m http.server 18080 --bind 10.249.0.1 --directory "$RIG/public" > "$RIG/http.log" 2>&1 &
http=$!
{
 printf 'client\ndev tun\nproto udp\nremote 169.254.249.2 11940\nnobind\nremote-cert-tls server\n<ca>\n'
 cat "$RIG/cert.pem"
 printf '</ca>\n<cert>\n'
 cat "$RIG/cert.pem"
 printf '</cert>\n<key>\n'
 cat "$RIG/key.pem"
 printf '</key>\n'
} | LC_ALL=C awk -f "$RIG/lib/zgz-parse" | cut -f6- > "$RIG/node.json"
rig_set test_url http://10.249.0.1:18080/
result=$(ZGZ_TEST_TRACE="$RIG/trace.log" sh "$RIG/lib/zgz-openvpn" test < "$RIG/node.json") || {
 cat "$RIG/trace.log" "$RIG/server.log"; exit 1
}
case "$result" in ''|*[!0-9]*|0) echo "invalid live measurement: $result"; exit 1 ;; esac
echo "live: real OpenVPN TLS tunnel and HTTP request measured in $result ms"
[ ! -d "$RIG/run/.openvpn-test-lock" ]
if ip link show dev zgzovpnt >/dev/null 2>&1; then echo 'temporary tunnel leaked'; exit 1; fi
[ -z "$(ip -4 route show table 19015 2>/dev/null)" ]
echo 'live: temporary tunnel, routes and lock cleaned up'
