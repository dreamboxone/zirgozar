#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later

"""Prepare an authenticated Psiphon server list for OpenWrt packages."""

import base64
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import urllib.request
import zlib


LIST_URL = "https://s3.amazonaws.com//psiphon/web/mjr4-p23r-puwl/server_list_compressed"
# Psiphon's public signing key, as pinned by Aether 2.4 and PattN/PattNG.
SIGNING_KEY = (
    "MIICIDANBgkqhkiG9w0BAQEFAAOCAg0AMIICCAKCAgEAt7Ls+/39r+T6zNW7GiVpJfzq/xvL9SBH"
    "5rIFnk0RXYEYavax3WS6HOD35eTAqn8AniOwiH+DOkvgSKF2caqk/y1dfq47Pdymtwzp9ikpB1C5"
    "OfAysXzBiwVJlCdajBKvBZDerV1cMvRzCKvKwRmvDmHgphQQ7WfXIGbRbmmk6opMBh3roE42Kcot"
    "LFtqp0RRwLtcBRNtCdsrVsjiI1Lqz/lH+T61sGjSjQ3CHMuZYSQJZo/KrvzgQXpkaCTdbObxHqb6"
    "/+i1qaVOfEsvjoiyzTxJADvSytVtcTjijhPEV6XskJVHE1Zgl+7rATr/pDQkw6DPCNBS1+Y6fy7G"
    "stZALQXwEDN/qhQI9kWkHijT8ns+i1vGg00Mk/6J75arLhqcodWsdeG/M/moWgqQAnlZAGVtJI1O"
    "geF5fsPpXu4kctOfuZlGjVZXQNW34aOzm8r8S0eVZitPlbhcPiR4gT/aSMz/wd8lZlzZYsje/Jr8"
    "u/YtlwjjreZrGRmG8KMOzukV3lLmMppXFMvl4bxv6YFEmIuTsOhbLTwFgh7KYNjodLj/LsqRVfwz"
    "31PgWQFTEPICV7GCvgVlPRxnofqKSjgTWI4mxDhBpVcATvaoBl1L/6WLbFvBsoAUBItWwctO2xal"
    "KxF5szhGm8lccoc5MZr8kfE0uxMgsxz4er68iCID+rsCAQM="
)
DOWNLOAD_LIMIT = 4 * 1024 * 1024
UNPACK_LIMIT = 16 * 1024 * 1024


def verify_list(packed, output):
    inflater = zlib.decompressobj()
    decoded = inflater.decompress(packed, UNPACK_LIMIT)
    if not inflater.eof or inflater.unused_data:
        raise ValueError("Invalid compressed Psiphon list")
    envelope = json.loads(decoded)
    key = SIGNING_KEY.encode("ascii")
    digest = base64.b64decode(envelope["signingPublicKeyDigest"], validate=True)
    if digest != hashlib.sha256(key).digest():
        raise ValueError("Unexpected Psiphon signing key")
    data = envelope["data"].encode("utf-8")
    entries = sum(bool(line.strip()) for line in data.splitlines())
    if entries < 50:
        raise ValueError(f"Only {entries} entries in the Psiphon list")

    with tempfile.TemporaryDirectory(dir=output.parent) as directory:
        scratch = Path(directory)
        key_file = scratch / "key.der"
        signature_file = scratch / "signature"
        entries_file = scratch / "entries"
        key_file.write_bytes(base64.b64decode(key, validate=True))
        signature_file.write_bytes(base64.b64decode(envelope["signature"], validate=True))
        entries_file.write_bytes(data)
        subprocess.run(
            ["openssl", "dgst", "-sha256", "-keyform", "DER", "-verify",
             str(key_file), "-signature", str(signature_file), str(entries_file)],
            check=True,
        )
        entries_file.replace(output)
    return entries


def main():
    if len(sys.argv) != 2:
        sys.exit(f"Usage: {sys.argv[0]} OUTPUT")
    with urllib.request.urlopen(LIST_URL, timeout=30) as response:
        packed = response.read(DOWNLOAD_LIMIT + 1)
    if len(packed) > DOWNLOAD_LIMIT:
        sys.exit("Psiphon download exceeds the size limit")
    entries = verify_list(packed, Path(sys.argv[1]))
    print(f"Verified {entries} Psiphon server entries")


if __name__ == "__main__":
    main()
