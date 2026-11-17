# Amnezia configuration importer

Build with Go 1.22 or later using `sh build/build-amnezia.sh <OpenWrt architecture>` before an SDK package build. The standalone package builders and release workflow build it automatically. The executable uses only the Go standard library and runs without a kernel AmneziaWG module. The imported tunnel uses the existing sing-box-lx integration.

The importer accepts native AmneziaWG client exports in `vpn://` format, including Qt-compressed exports, and current API subscriptions containing `api_config` and `auth_data`. Legacy `api_endpoint` subscriptions are rejected explicitly. `amnezia://free?country=ir` requests a new Free connection for Iran through the current API. The provider determines service availability and may require a CAPTCHA; the import dialog displays it and submits the user's answer using the same installation identity and WireGuard key pair.

API requests use the gateway's RSA/AES envelope. On transport or decryption failure, encrypted relay lists from the official storage locations are tried. Requests bypass the local transparent VPN with socket mark 255; an optional HTTP(S) or SOCKS5 proxy can be configured with `zirgozar.config.amnezia_proxy` when direct bootstrap is unavailable. Certificates remain verified. The importer does not use proxy environment variables implicitly.

Accounts and resolved profiles are stored under `/etc/zirgozar/amnezia` with private file permissions. A valid cached configuration works without contacting the API. Expired configurations are refreshed when resolved; a failed refresh preserves the saved account and does not silently activate an expired profile. Importing a subscription keeps its original link in UCI so later builds can refresh it. Native exports containing a complete client profile are imported offline. Multiple API subscriptions in one batch may take longer than the LuCI RPC timeout; import them one at a time.

Protocol references and public gateway parameters:

- [Official client 5.1.0.6](https://github.com/amnezia-vpn/amnezia-client/tree/5.1.0.6): `gatewayController.cpp`, `subscriptionController.cpp`, `wireGuardProtocolConfig.cpp`, and `serverConfigUtils.cpp`.
- [Official gateway transport description](https://github.com/amnezia-vpn/libagw).
- The public RSA key and relay storage addresses match the official Linux 5.1.0.6 release. The key is public protocol metadata, not an account credential. Its SHA-256 is `8c470f207d071799be894e5562a171da73400268a195a32106e7fd56fe30bc36`.

Run `cd tools/amnezia && go test -race ./...` for bounded decoding, encrypted API errors, relay failover, CAPTCHA identity continuity, profile preservation and cache expiry tests. Tests use local servers and synthetic credentials.
