#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later

set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
name=$1
output=$2
case "$name" in
	warp-plus)
		repo=bepass-org/warp-plus
		commit=94c33060b277bb872c5173e201fc6802ddbeca63
		license=LICENSE
		toolchain=go1.22.10
		tag_var=WARPPLUS_SOFTFLOAT_TAG
		link_flags=''
		;;
	vwarp)
		repo=voidr3aper-anon/Vwarp
		commit=cdced3e5fa831858b69d0a35640c59d5638e9e18
		license=LICENSE-GPL-3.0
		toolchain=go1.24.6
		tag_var=VWARP_SOFTFLOAT_TAG
		link_flags='-buildid= -checklinkname=0'
		;;
	*) exit 2 ;;
esac

mkdir -p "$output"
output=$(CDPATH= cd -- "$output" && pwd)
tag=$(sed -n "s/^$tag_var=//p" "$root/package/zirgozar/files/zgz-cores")
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
src="$work/$name"
dist="$work/dist"
mkdir "$dist"
git clone --depth 1 --branch "$tag" "https://github.com/$repo.git" "$src"
test "$(git -C "$src" rev-parse HEAD)" = "$commit"

(
	cd "$src"
	GOTOOLCHAIN="$toolchain" go mod vendor
	cat > build-arm-softfloat.sh <<'SH'
#!/bin/sh
set -eu
GOTOOLCHAIN="$1" CGO_ENABLED=0 GOOS=linux GOARCH=arm GOARM=5 go build -mod=vendor -trimpath \
	-ldflags "-s -w $5 -X main.version=$2" -o "$3" "./cmd/$4"
SH
	sh build-arm-softfloat.sh "$toolchain" "$tag" "$dist/$name" "$name" "$link_flags"
	cp "$license" "$dist/"
	cp vendor/github.com/Psiphon-Labs/psiphon-tunnel-core/LICENSE "$dist/LICENSE.psiphon"
)

archive="$output/${name}_linux-arm-softfloat.zip"
(
	cd "$dist"
	test "$(qemu-arm -cpu arm926 "./$name" version 2>&1)" = "$tag"
	test "$(qemu-arm -cpu cortex-a9,vfp=off,vfp-d32=off,neon=off "./$name" version 2>&1)" = "$tag"
	zip -q "$archive" "$name" "$license" LICENSE.psiphon
)
tar --exclude=.git -czf "$output/${name}_arm-softfloat-source.tar.gz" -C "$work" "$name"
printf 'SHA2-256= %s\n' "$(sha256sum "$archive" | cut -d ' ' -f 1)" > "$archive.dgst"
