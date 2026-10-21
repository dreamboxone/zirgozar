#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
"""Index content-defined ranges of the unchanged, installable release packages."""
import hashlib
import gzip
import io
import json
from pathlib import Path
import sys
import tarfile
import zlib

MIN_CHUNK = 64 * 1024
MAX_CHUNK = 1024 * 1024
BOUNDARY = b'\xb7\x3a'


def boundaries(data):
    offset = 0
    while offset < len(data):
        end = min(offset + MAX_CHUNK, len(data))
        marker = data.find(BOUNDARY, offset + MIN_CHUNK, end)
        if marker >= 0:
            end = marker + len(BOUNDARY)
        yield offset, end
        offset = end


def compress_ranges(data, window):
    """Keep a valid deflate stream, resetting its dictionary at stable boundaries."""
    compressor = zlib.compressobj(6, zlib.DEFLATED, window)
    output = io.BytesIO()
    for start, end in boundaries(data):
        output.write(compressor.compress(memoryview(data)[start:end]))
        output.write(compressor.flush(zlib.Z_FULL_FLUSH))
    output.write(compressor.flush(zlib.Z_FINISH))
    return output.getvalue()


def normalize(path):
    """Change compression only. apk/opkg still read ordinary standard packages."""
    original = path.read_bytes()
    if path.suffix == '.apk':
        if original[:4] != b'ADBd':
            raise ValueError(f'Unsupported APK compression: {path.name}')
        content = zlib.decompress(original[4:], -15)
        updated = b'ADBd' + compress_ranges(content, -15)
        assert zlib.decompress(updated[4:], -15) == content
    else:
        output = io.BytesIO()
        with tarfile.open(fileobj=io.BytesIO(original), mode='r:gz') as src:
            with tarfile.open(fileobj=output, mode='w', format=tarfile.GNU_FORMAT) as dst:
                for entry in src:
                    if not entry.isfile():
                        raise ValueError(f'Unexpected IPK member: {entry.name}')
                    data = src.extractfile(entry).read()
                    if entry.name.removeprefix('./') == 'data.tar.gz':
                        content = gzip.decompress(data)
                        data = compress_ranges(content, 31)
                        assert gzip.decompress(data) == content
                    entry.size = len(data)
                    entry.mtime = 0
                    dst.addfile(entry, io.BytesIO(data))
        updated = compress_ranges(output.getvalue(), 31)
        assert gzip.decompress(updated) == output.getvalue()
    path.write_bytes(updated)


def index(path):
    chunks = []
    data = path.read_bytes()
    if not data or len(data) > 128 * 1024 * 1024:
        raise ValueError(f'Unsupported package size: {path.name}')
    for offset, end in boundaries(data):
        part = memoryview(data)[offset:end]
        chunks.append([offset, end - offset, hashlib.sha256(part).hexdigest()])
    return {'format': 1, 'name': path.name, 'size': len(data),
            'sha256': hashlib.sha256(data).hexdigest(), 'chunks': chunks}


def main():
    directory = Path(sys.argv[1])
    for path in sorted(directory.iterdir()):
        if path.suffix in ('.apk', '.ipk'):
            normalize(path)
            manifest = index(path)
            path.with_name(path.name + '.chunks.json').write_text(
                json.dumps(manifest, separators=(',', ':')) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
