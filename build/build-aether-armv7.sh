#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
set -euo pipefail

# The Aether revision used by PattNG, including configurable MASQUE SNI and
# fragmented account requests. Build in a Linux filesystem, outside the SDK.
revision=512726803eb7245802d0d877eb9682243a31bac5
sdk=${1:?Usage: build-aether-armv7.sh <OpenWrt ARMv7 SDK> <work directory>}
work=${2:?A Linux work directory is required}
sdk=$(cd "$sdk" && pwd)
mkdir -p "$work"
work=$(cd "$work" && pwd)
src="$work/source"
if [ ! -d "$src/.git" ]; then
 git clone https://github.com/patterniha/Aether.git "$src"
fi
test -z "$(git -C "$src" status --porcelain)"
git -C "$src" fetch origin "$revision"
git -C "$src" checkout --detach "$revision"
test "$(git -C "$src" rev-parse HEAD)" = "$revision"

toolchain=$(find "$sdk/staging_dir" -maxdepth 1 -type d -name 'toolchain-arm_cortex-a7*' -print -quit)
test -n "$toolchain"
toolbin="$toolchain/bin"
export PATH="$HOME/.cargo/bin:$sdk/staging_dir/host/bin:$PATH"
export CARGO_TARGET_ARMV7_UNKNOWN_LINUX_MUSLEABIHF_LINKER="$toolbin/arm-openwrt-linux-muslgnueabi-gcc"
export CC_armv7_unknown_linux_musleabihf="$toolbin/arm-openwrt-linux-muslgnueabi-gcc"
export CXX_armv7_unknown_linux_musleabihf="$toolbin/arm-openwrt-linux-muslgnueabi-g++"
export AR_armv7_unknown_linux_musleabihf="$toolbin/arm-openwrt-linux-muslgnueabi-ar"
export BINDGEN_EXTRA_CLANG_ARGS_armv7_unknown_linux_musleabihf="--target=armv7-unknown-linux-musleabihf --sysroot=$toolchain"
export RUSTFLAGS='--cfg libc_unstable_musl_v1_2_3'
export CARGO_TARGET_DIR="$work/target"
cd "$src/aether"
cargo build --locked --release --features tor --target armv7-unknown-linux-musleabihf
mkdir -p "$work/output"
cp "$CARGO_TARGET_DIR/armv7-unknown-linux-musleabihf/release/aether" "$work/output/aether"
cp "$src/LICENSE" "$work/output/LICENSE"
printf 'Source: https://github.com/patterniha/Aether\nRevision: %s\n' "$revision" > "$work/output/SOURCE"
(cd "$work/output" && sha256sum aether > aether.sha256)
printf 'Built %s/output/aether\n' "$work"
