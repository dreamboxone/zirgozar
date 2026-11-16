# Offline IKEv2 issuer certificates

Source: [Let's Encrypt certificate repository](https://letsencrypt.org/certificates/).
Retrieved 2026-11-16. These are public CA certificates, not account credentials.

The package installs these files under `/usr/share/zirgozar/ikev2-intermediates`.
`zgz-ikev2config` loads them into strongSwan before EAP connections. They are
deliberately excluded from the connection's `remote.cacerts` constraint: the
chain must still reach a system root or a CA explicitly supplied by the user.
PSK connections do not load them. No CA website is contacted during this step.

This supplies the current Let's Encrypt 2024 and Generation Y chains, including
the cross-certificates back to ISRG Root X1/X2. It is not a complete collection
of every public or private issuer. Other incomplete server chains may still
require the provider to fix its chain or supply a CA. Update this collection
with package releases as issuers rotate; do not promote downloaded server
certificates to trust anchors or disable certificate verification.

To update, download the PEMs from the official URLs below, verify every chain
against the system roots with `test/test-ikev2-intermediates.py`, and review the
subjects, issuers, validity and hashes before committing. Do not add self-signed
roots here. Certificate artifacts retain their original bytes.

| File | Official source | SHA-256 (PEM bytes) |
| --- | --- | --- |
| `e5.pem` | [PEM](https://letsencrypt.org/certs/2024/e5.pem) | `b6ffef8106f353f17760c87571330245487d3ac7a4d3865379029baa3de330e1` |
| `e6.pem` | [PEM](https://letsencrypt.org/certs/2024/e6.pem) | `1429463d25654be735b6af5026b96ac989709b04a8107580bc5efcd8209ae72d` |
| `e7.pem` | [PEM](https://letsencrypt.org/certs/2024/e7.pem) | `4625e2d4a1b9e1378b305a64577f80581b1a7ec88b8f4756bb86c56f9dceb79c` |
| `e8.pem` | [PEM](https://letsencrypt.org/certs/2024/e8.pem) | `f2c0dde62e2c90e6332fa55af79ed1a0c41329ad03ecf812bd89817a2fc340a9` |
| `e9.pem` | [PEM](https://letsencrypt.org/certs/2024/e9.pem) | `dcf876beaf4399c3d32b0b1d176febaa9763cad29e1a91b7b9a66a7c6f6b123a` |
| `int-ye1.pem` | [PEM](https://letsencrypt.org/certs/gen-y/int-ye1.pem) | `30028f6eecdb9ba45b1a2440187278be1bc08c360da6611f21b4b3e74b103981` |
| `int-ye2.pem` | [PEM](https://letsencrypt.org/certs/gen-y/int-ye2.pem) | `a1809226d01db1ae8df803a73a31a97330a924e3059c42b4be599449c43c5119` |
| `int-ye3.pem` | [PEM](https://letsencrypt.org/certs/gen-y/int-ye3.pem) | `09711a7e8d7e1ef9ff74af42e688ccc1ea727c59a5a243eb0771f758920083d7` |
| `int-yr1.pem` | [PEM](https://letsencrypt.org/certs/gen-y/int-yr1.pem) | `d5efc243446ef865c0e165eb1958a2f068c9514aa17238701bd6f7ad90253ce7` |
| `int-yr2.pem` | [PEM](https://letsencrypt.org/certs/gen-y/int-yr2.pem) | `f504663442f7a619127e8e12214a58a198599986d4ab42e22587d22af7e9e7eb` |
| `int-yr3.pem` | [PEM](https://letsencrypt.org/certs/gen-y/int-yr3.pem) | `8935085a7b0090af327d691930e948eb61b9c97fb75080cea7f8975d7b123a30` |
| `r10.pem` | [PEM](https://letsencrypt.org/certs/2024/r10.pem) | `29ee679fb573c905bf3538126de6893a9e20ebe1cf400c6df22e5d171c94f543` |
| `r11.pem` | [PEM](https://letsencrypt.org/certs/2024/r11.pem) | `6c06a45850f93aa6e31f9388f956379d8b4fb7ffca5211b9bab4ad159bdfb7b9` |
| `r12.pem` | [PEM](https://letsencrypt.org/certs/2024/r12.pem) | `c6afa726f611cd87bb3c7b743567221782655db4c4f47e7c64993d1bbdaae8f3` |
| `r13.pem` | [PEM](https://letsencrypt.org/certs/2024/r13.pem) | `6c595b12bcc415caa5ac38c60ad01414131a8b1944c21c7a0c5b1c97631968c9` |
| `r14.pem` | [PEM](https://letsencrypt.org/certs/2024/r14.pem) | `0c830c96b727bd4b1f4e83e5babbee24b43b73dbe83d800adb699d9bc1e78404` |
| `root-x2-by-x1.pem` | [PEM](https://letsencrypt.org/certs/gen-y/root-x2-by-x1.pem) | `4dadd67f1de699b79466b1e672187e6caef5e0fdab4404d649ad8188a1b2d9a1` |
| `root-ye-by-x2.pem` | [PEM](https://letsencrypt.org/certs/gen-y/root-ye-by-x2.pem) | `2681e97e939cab7cde4fad1dc733fc7c99e39a203190e8f298e1c02ab431b1e9` |
| `root-yr-by-x1.pem` | [PEM](https://letsencrypt.org/certs/gen-y/root-yr-by-x1.pem) | `b3858d7a4d598b4ab6ed2892a1b8c0ee035154876dd40a082a3b05387eea11a4` |
