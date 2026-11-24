#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later

set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
name=$1
mkdir -p "$2"
output=$(CDPATH='' cd -- "$2" && pwd)
case "$name" in
	sing-box-lx)
		repo=Leadaxe/sing-box-lx
		commit=b5db574026d89c70136cb488a755da6398d6cfc8
		tag_var=LX_SOFTFLOAT_TAG
		;;
	aether)
		repo=CluvexStudio/Aether
		commit=d58f9d568083129ce2c767c85054021eb3ee6a38
		tag_var=AETHER_SOFTFLOAT_TAG
		;;
	*) exit 2 ;;
esac

tag=$(sed -n "s/^$tag_var=//p" "$root/package/zirgozar/files/zgz-cores")
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
src="$work/$name"
git -c advice.detachedHead=false clone --depth 1 --branch "$tag" "https://github.com/$repo.git" "$src"
test "$(git -C "$src" rev-parse HEAD)" = "$commit"
cpu=cortex-a9,vfp=off,vfp-d32=off,neon=off

if [ "$name" = sing-box-lx ]; then
	base="sing-box-${tag#v}-linux-arm-softfloat"
	dist="$work/$base"
	mkdir "$dist"
	cd "$src"
	git submodule update --init --depth 1 --jobs 4 -- submodules
	GOTOOLCHAIN=$(cat go.version)
	export GOTOOLCHAIN
	# Cronet's prebuilt ARM library needs VFP.
	tags=$(make -s -f Makefile.lx lx-print-tags)
	tags=$(printf '%s\n' "$tags" | sed 's/with_naive_outbound,//')
	CGO_ENABLED=0 GOOS=linux GOARCH=arm GOARM=7,softfloat go build -mod=readonly -trimpath \
		-tags "$tags" -ldflags "-X github.com/sagernet/sing-box/constant.Version=${tag#v} -checklinkname=0 -s -w -buildid=" \
		-o "$dist/sing-box" ./cmd/sing-box
	cp LICENSE "$dist/"
	qemu-arm -cpu "$cpu" "$dist/sing-box" version | grep -F "sing-box version ${tag#v}"
	archive="$output/$base.tar.gz"
	tar -czf "$archive" -C "$work" "$base"
	tar --exclude=.git -czf "$output/${name}_arm-softfloat-source.tar.gz" -C "$work" "$name"
else
	target=armv7-unknown-linux-musleabi
	sdk=openwrt-toolchain-25.12.5-bcm53xx-generic_gcc-14.3.0_musl_eabi.Linux-x86_64.tar.zst
	curl -fsSL --retry 3 "https://downloads.openwrt.org/releases/25.12.5/targets/bcm53xx/generic/$sdk" -o "$work/$sdk"
	printf '%s  %s\n' 79ce8143304de300dba8b66cce77388cc33caac0fda558509618da9e54c5b3b0 "$work/$sdk" | sha256sum -c
	mkdir "$work/toolchain"
	tar --zstd -xf "$work/$sdk" -C "$work/toolchain" --strip-components=1
	compiler=$(find "$work/toolchain" -name arm-openwrt-linux-muslgnueabi-gcc | head -1)
	test -x "$compiler"
	compiler=${compiler%-gcc}
	rustup target add "$target"
	export CARGO_TARGET_ARMV7_UNKNOWN_LINUX_MUSLEABI_LINKER="$compiler-gcc"
	export CC_armv7_unknown_linux_musleabi="$compiler-gcc"
	export CXX_armv7_unknown_linux_musleabi="$compiler-g++"
	export AR_armv7_unknown_linux_musleabi="$compiler-ar"
	sysroot=${compiler%/bin/*}
	export BINDGEN_EXTRA_CLANG_ARGS_armv7_unknown_linux_musleabi="--target=$target --sysroot=$sysroot -isystem$sysroot/include"
	export RUSTFLAGS='--cfg libc_unstable_musl_v1_2_3'
	export CMAKE_TOOLCHAIN_FILE_armv7_unknown_linux_musleabi="$work/arm.cmake"
	cat > "$CMAKE_TOOLCHAIN_FILE_armv7_unknown_linux_musleabi" <<EOF
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR arm)
set(CMAKE_C_COMPILER "$compiler-gcc")
set(CMAKE_CXX_COMPILER "$compiler-g++")
set(OPENSSL_NO_ASM ON CACHE BOOL "")
EOF
	cd "$src/aether"
	cargo build --locked --release --features tor --target "$target" --bin aether
	dist="$work/aether-dist"
	mkdir -p "$dist/pt" "$dist/LICENSES"
	cp "${CARGO_TARGET_DIR:-target}/$target/release/aether" "$dist/"
	qemu-arm -cpu "$cpu" "$dist/aether" --version | grep -F "${tag#v}"
	qemu-arm -cpu "$cpu" "$dist/aether" --help | grep -F -- '--gool-peer'
	GOTOOLCHAIN=go1.26.10 bash ../pt-build.sh linux arm "$dist/pt" 7,softfloat "$dist/LICENSES"
	GOTOOLCHAIN=go1.26.10 bash ../psiphon-build.sh linux arm "$dist/pt" 7,softfloat "$dist/LICENSES"
	cp ../LICENSE "$dist/LICENSES/aether-LICENSE.txt"
	python3 ../third-party-notices.py --target "$target" --features tor --output "$dist/LICENSES/THIRD-PARTY-NOTICES.txt"
	qemu-arm -cpu "$cpu" "$dist/pt/lyrebird" -version
	qemu-arm -cpu "$cpu" "$dist/pt/psiphon-tunnel-core" -version
	archive="$output/aether-linux-arm-softfloat.tar.gz"
	tar -czf "$archive" -C "$dist" aether pt LICENSES
	git -C "$src" archive --format=tar.gz --prefix="$name/" HEAD > "$output/${name}_arm-softfloat-source.tar.gz"
fi

(cd "$output" && sha256sum "$(basename "$archive")" > "$(basename "$archive").sha256")
