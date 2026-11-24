#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$RIG/lib/zgz-common.sh"
sed -i "s|^\. /lib/functions.sh|. $RIG_SRC/test/functions-stub.sh|" "$RIG/lib/zgz-nodes"
ZGZ_TEST_SECTIONS="$RIG/sections"
export ZGZ_TEST_SECTIONS
importer="$RIG_SRC/prebuilt/${RIG_AMNEZIA_ARCH:-x86_64}/zgz-amnezia"
[ -x "$importer" ] || { echo 'build the Amnezia importer first' >&2; exit 1; }
if [ -n "${RIG_AMNEZIA_CPU:-}" ]; then
	printf '#!/bin/sh\nexec qemu-arm -cpu "%s" "%s" "$@"\n' "$RIG_AMNEZIA_CPU" "$importer" > "$ZGZ_OWN_DIR/zgz-amnezia"
	chmod +x "$ZGZ_OWN_DIR/zgz-amnezia"
else
	cp -p "$importer" "$ZGZ_OWN_DIR/zgz-amnezia"
fi
rig_set core_dir "$RIG/custom-cores"
mkdir -m 700 "$ZGZ_ETC/amnezia"
link="$(python3 - "$ZGZ_ETC/amnezia" <<'PY'
import json, base64, hashlib, pathlib, sys, zlib, struct
profile='[Interface]\nPrivateKey = '+base64.b64encode(bytes(32)).decode()+'\nAddress = 10.7.0.2/32\nJc = 4\nH1 = 100-200\nI1 = <b 0x12>\n[Peer]\nPublicKey = '+base64.b64encode(bytes(32)).decode()+'\nEndpoint = 192.0.2.10:51820\n'
free_link = b'amnezia://free?country=ir'
account = pathlib.Path(sys.argv[1]) / (hashlib.sha256(free_link).hexdigest() + '.json')
account.write_text(json.dumps({'profile': profile}))
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
rig_set amnezia_free.link 'amnezia://free?country=ir'
rig_set amnezia_free.name 'Amnezia Free IR'
rig_set node amnezia_free
: > "$ZGZ_RUN/alive.tsv"
"$RIG/lib/zgz-probe" use amnezia_free
check "$(sed -n 's/^protocol=//p' "$ZGZ_BEST_META")" amneziawg 'Basic Settings selects the cached Amnezia Free IR profile'
check "$(grep -c '100-200' "$ZGZ_ETC/bridge.json")" 1 'the selected Amnezia Free profile keeps its AWG parameters'
cat > "$ZGZ_OWN_DIR/zgz-amnezia" <<'SH'
#!/bin/sh
echo 'Amnezia verification is required. Import the same link again from Configs to enter the code.' >&2
exit 1
SH
status=0
"$RIG/lib/zgz-probe" use amnezia_free || status=$?
check "$status" 2 'a failed Amnezia selection reports its own error'
check "$(cat "$ZGZ_MESSAGE")" 'Amnezia verification is required. Import the same link again from Configs to enter the code.' 'the status page explains how to complete renewal'
rig_report
