#!/bin/sh
#
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
# Part of Zirgozar - https://github.com/dreamboxone/zirgozar
#
# build-core.sh - fetch the Xray core for an OpenWrt target.
#
#   ./build/build-core.sh              # default: armv7 / ipq40xx
#   ./build/build-core.sh aarch64
#   ./build/build-core.sh x86_64
#
# Only the executable is kept. The release archive also carries geoip.dat and
# geosite.dat, about twelve megabytes of routing data for deciding which
# traffic to send where - and this build sends everything through the tunnel,
# so they would be twelve megabytes of a router's flash spent on a question
# nobody asks.

set -e

TARGET="${1:-armv7}"
XRAY_VERSION="${XRAY_VERSION:-v26.9.9}"
BASE="https://github.com/XTLS/Xray-core/releases/download/$XRAY_VERSION"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# The names the build has always taken, for the OpenWrt architecture each
# stood for.
case "$TARGET" in
	armv7|ipq40xx|arm)               TARGET=arm_cortex-a7_neon-vfpv4 ;;
	aarch64|arm64|filogic|mediatek)  TARGET=aarch64_cortex-a53 ;;
	mipsel|mipsle|ramips|mt7621)     TARGET=mipsel_24kc ;;
	amd64)                           TARGET=x86_64 ;;
	i386|x86)                        TARGET=i386_pentium4 ;;
esac

# Any OpenWrt architecture name, to the Xray build that runs on it. A package
# installs only on a router whose own name it carries, so the same program is
# packaged under every name a family of routers goes by. The MIPS builds are
# the soft-float ones: most MIPS router chips have no FPU, and a hard-float
# program there leans on the kernel's emulator for every float.
OUTDIR="$TARGET"
BIN=xray
case "$TARGET" in
	aarch64_*)                       ASSET=Xray-linux-arm64-v8a.zip ;;
	arm_arm926ej-s|arm_xscale)       ASSET=Xray-linux-arm32-v5.zip ;;
	arm_arm1176jzf-s_vfp)            ASSET=Xray-linux-arm32-v6.zip ;;
	arm_cortex-a*)                   ASSET=Xray-linux-arm32-v7a.zip ;;
	mips64el_*)                      ASSET=Xray-linux-mips64le.zip ;;
	mips64_*)                        ASSET=Xray-linux-mips64.zip ;;
	mipsel_*)                        ASSET=Xray-linux-mips32le.zip; BIN=xray_softfloat ;;
	mips_*)                          ASSET=Xray-linux-mips32.zip;   BIN=xray_softfloat ;;
	x86_64)                          ASSET=Xray-linux-64.zip ;;
	i386_pentium4)                   ASSET=Xray-linux-32.zip ;;
	riscv64_*)                       ASSET=Xray-linux-riscv64.zip ;;
	loongarch64_*)                   ASSET=Xray-linux-loong64.zip ;;
	*)
		echo "unknown target '$TARGET'"
		echo "give an OpenWrt architecture name, such as arm_cortex-a7_neon-vfpv4, aarch64_cortex-a53, mipsel_24kc or x86_64"
		exit 1 ;;
esac

command -v curl >/dev/null 2>&1 || { echo "curl not found in PATH"; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "unzip not found in PATH"; exit 1; }

WORK="${ZGZ_WORK:-$ROOT/.build}/$OUTDIR"
OUT="$ROOT/prebuilt/$OUTDIR/xray"

echo ">>> target      : $TARGET"
echo ">>> xray release: $XRAY_VERSION"
echo ">>> asset       : $ASSET"
echo ">>> openwrt arch: $OUTDIR"

rm -rf "$WORK"
mkdir -p "$WORK" "$(dirname "$OUT")"

echo ">>> downloading"
curl -fsSL --retry 3 -o "$WORK/xray.zip" "$BASE/$ASSET"

echo ">>> extracting the executable only ($BIN)"
unzip -o -q "$WORK/xray.zip" "$BIN" -d "$WORK" 2>/dev/null || {
	# A release without the soft-float build: the ordinary one still runs.
	BIN=xray
	unzip -o -q "$WORK/xray.zip" xray -d "$WORK"
}
[ -f "$WORK/$BIN" ] || { echo "no '$BIN' entry inside $ASSET"; exit 1; }

install -m 0755 "$WORK/$BIN" "$OUT"
printf '%s\n' "$XRAY_VERSION" > "$ROOT/prebuilt/$OUTDIR/xray-version.txt"

echo ">>> done: $OUT"
ls -l "$OUT"
command -v file >/dev/null 2>&1 && file "$OUT" || true
