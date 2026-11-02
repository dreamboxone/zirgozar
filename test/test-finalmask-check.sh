#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
set -eu
command -v ucode >/dev/null 2>&1 || { echo 'ucode unavailable; skipping FinalMask core checks'; exit 0; }
root="$(cd "$(dirname "$0")/.." && pwd)"
task="$(mktemp -d /tmp/zgz-finalmask-test.XXXXXX)"
trap 'rm -rf "$task"' EXIT
mkdir -p "$task/lib" "$task/run" "$task/bin" "$task/cores"
export ZGZ_LIB="$task/lib" ZGZ_RUN="$task/run" MASK_CORE_DIR="$task/cores" MASK_CORE="$task/cores/xray"
export MASK_ENGINE=xray MASK_MODE=supported
cat > "$ZGZ_LIB/zgz-common.sh" <<'SH'
core_engine() { echo "$MASK_ENGINE"; }
core_dir() { echo "$MASK_CORE_DIR"; }
xray_preferred() { echo "$MASK_CORE"; }
xray_by_version() { echo "$MASK_CORE_DIR/xray"; }
bounded() { shift; "$@"; }
SH
cat > "$task/bin/jsonfilter" <<'SH'
#!/bin/sh
exec ucode -e 'import {readfile} from "fs"; let r=json(readfile(ARGV[0])); if(r.patterniha) print("true");' "$2"
SH
cat > "$MASK_CORE" <<'SH'
#!/bin/sh
[ "$1 $2 $3" = 'run -test -config' ] || exit 1
case "$4" in *.json) : ;; *) echo 'config extension is required'; exit 1 ;; esac
if [ "$MASK_MODE" = legacy ]; then exit 0; fi
if [ "$MASK_MODE" = broken ]; then echo 'core crashed'; exit 1; fi
if grep -q zirgozar-invalid-mask "$4"; then echo 'unknown config id: zirgozar-invalid-mask'; exit 1; fi
if grep -q unsupported-mask "$4"; then echo 'unknown config id: unsupported-mask'; exit 1; fi
exit 0
SH
chmod +x "$task/bin/jsonfilter" "$MASK_CORE"
cp "$MASK_CORE" "$MASK_CORE_DIR/xray-patterniha"
export PATH="$task/bin:$PATH"
check() {
	result="$(printf '%s\n' "$1" | sh "$root/package/zirgozar/files/zgz-finalmask-check")"
	printf '%s' "$result" | ucode -e 'import {readfile} from "fs"; let r=json(readfile("/dev/stdin")); if(r.ok != (ARGV[0] == "true")) { warn(sprintf("%J\n",r)); exit(1); } if(ARGV[1] && index(r.error,ARGV[1]) < 0) exit(1);' "$2" "${3:-}"
	[ -z "$(find "$ZGZ_RUN" -mindepth 1 -print -quit)" ] || { echo 'request files were not removed'; exit 1; }
}
check '{"mask":{"tcp":[{"type":"fragment","settings":{}}]}}' true
check '{"mask":[]}' false 'Invalid'
check 'not JSON' false 'Invalid'
check '{"mask":{"tcp":[{"type":"unsupported-mask"}]}}' false 'not supported'
MASK_MODE=legacy; export MASK_MODE
check '{"mask":{}}' false 'does not recognize'
MASK_MODE=broken; export MASK_MODE
check '{"mask":{}}' false 'could not validate'
MASK_MODE=supported MASK_ENGINE=singbox; export MASK_MODE MASK_ENGINE
check '{"mask":{}}' false 'requires an Xray'
check '{"mask":{},"patterniha":true}' true
MASK_ENGINE=xray MASK_CORE="$task/missing"; export MASK_ENGINE MASK_CORE
check '{"mask":{}}' false 'not installed'
MASK_CORE=''; export MASK_CORE
check '{"mask":{}}' true
if [ -n "${RIG_XRAY:-}" ] && [ -x "$RIG_XRAY" ]; then
	MASK_CORE="$RIG_XRAY"; export MASK_CORE
	check '{"mask":{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["100-200"],"delays":["0"]}}]}}' true
fi
echo 'FinalMask core checks: support, legacy rejection, unknown masks, engine selection, invalid input and cleanup passed'
