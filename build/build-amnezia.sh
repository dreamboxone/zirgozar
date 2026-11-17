#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
set -eu
root="$(cd "$(dirname "$0")/.." && pwd)"
target="${1:-arm_cortex-a7_neon-vfpv4}"
export GOOS=linux CGO_ENABLED=0
case "$target" in
	aarch64_*) GOARCH=arm64 ;;
	arm_arm926ej-s|arm_xscale) GOARCH=arm; GOARM=5 ;;
	arm_arm1176jzf-s_vfp) GOARCH=arm; GOARM=6 ;;
	arm_cortex-a*) GOARCH=arm; GOARM=7 ;;
	mips64el_*) GOARCH=mips64le; GOMIPS64=softfloat ;;
	mips64_*) GOARCH=mips64; GOMIPS64=softfloat ;;
	mipsel_*) GOARCH=mipsle; GOMIPS=softfloat ;;
	mips_*) GOARCH=mips; GOMIPS=softfloat ;;
	x86_64) GOARCH=amd64 ;;
	i386_pentium4) GOARCH=386; GO386=softfloat ;;
	riscv64_*) GOARCH=riscv64 ;;
	loongarch64_*) GOARCH=loong64 ;;
	*) echo "unsupported Amnezia target: $target" >&2; exit 1 ;;
esac
export GOARCH GOARM GOMIPS GOMIPS64 GO386
mkdir -p "$root/prebuilt/$target"
cd "$root/tools/amnezia"
go build -trimpath -ldflags='-s -w' -o "$root/prebuilt/$target/zgz-amnezia" .
