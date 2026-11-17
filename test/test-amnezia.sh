#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$RIG/lib/zgz-common.sh"
sed -i "s|^\. /lib/functions.sh|. $RIG_SRC/test/functions-stub.sh|" "$RIG/lib/zgz-nodes"
ZGZ_TEST_SECTIONS="$RIG/sections"
export ZGZ_TEST_SECTIONS
export ZGZ_AMNEZIA_BIN="$RIG_SRC/prebuilt/x86_64/zgz-amnezia"
[ -x "$ZGZ_AMNEZIA_BIN" ] || { echo 'build the x86_64 Amnezia importer first' >&2; exit 1; }
link="$(python3 - <<'PY'
import json, base64, zlib, struct
profile='[Interface]\nPrivateKey = '+base64.b64encode(bytes(32)).decode()+'\nAddress = 10.7.0.2/32\nJc = 4\nH1 = 100-200\nI1 = <b 0x12>\n[Peer]\nPublicKey = '+base64.b64encode(bytes(32)).decode()+'\nEndpoint = 192.0.2.10:51820\n'
data=json.dumps({'containers':[{'amnezia-awg':{'last_config':json.dumps({'config':profile})}}]}).encode()
print('vpn://'+base64.urlsafe_b64encode(struct.pack('>I',len(data))+zlib.compress(data)).decode())
PY
)"
rig_set sources own
rig_set amnezia_test.link "$link"
rig_set amnezia_test.name 'Amnezia test'
printf 'amnezia_test\tnode\namnezia_test\t.link\t%s\namnezia_test\t.name\tAmnezia test\n' "$link" > "$ZGZ_TEST_SECTIONS"
node_records amnezia_test > "$RIG/run/amnezia.tsv"
check "$(cut -f3 "$RIG/run/amnezia.tsv")" amneziawg 'native vpn link becomes an AmneziaWG record'
check "$(cut -f4 "$RIG/run/amnezia.tsv")" 192.0.2.10 'endpoint survives import'
check "$(grep -c '100-200' "$RIG/run/amnezia.tsv")" 1 'header ranges survive import'
check "$(printf '%s\n' "$link" | missing_cores)" sing-box-lx 'native imports report their missing core'
"$RIG/lib/zgz-nodes" build
check "$(grep -c amneziawg "$ZGZ_CANDIDATES")" 1 'candidate build resolves native vpn links'
rig_report
