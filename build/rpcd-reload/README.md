# rpcd reload descriptor fix

The patch targets rpcd commit `d99f703e` (2026.10.04). Its SIGHUP path calls
`execv()` without closing descriptors retained by loaded plugins. The next
instance inherits source files and pipes without `FD_CLOEXEC` and loads new
copies. Mark every descriptor above stderr close-on-exec immediately before
re-execution. This also covers descriptors held by future plugins.

Apply the patch to the matching rpcd source and rebuild the rpcd executable
with the OpenWrt SDK for the target router. Existing rpcd plugins are unchanged.
Keep the upstream license and copyright notices. Do not install an executable
built for a different CPU, libc, or library ABI.

On the verified router: OpenWrt 25.12.6, arm_cortex-a7_neon-vfpv4, musl EABI;
libubox `ff13b89e` ABI 20260213; ubus `24864e78` ABI 20251202;
uci `66127cd7` ABI 20250120; json-c 0.18. The executable was built with the
OpenWrt 25.12.5 ipq40xx SDK, using these dependency revisions. No system
libraries or plugins were replaced.

Verify a candidate without touching the active daemon:

```sh
RPC_BINARY=/tmp/rpcd-fixed RPC_EXPECT_STABLE=1 sh test/live/rpc-health.sh
```

The regression uses a private ubus socket, private rpcd instance, and a 64-file
soft limit. Twenty reloads must retain the initial descriptor count and keep
RPC calls working. On the affected original build the count rose by seven
per reload and RPC execution failed. With the patch it stayed at fifteen.

The router's original executable is backed up under
`/root/zirgozar-recovery/rpcd.before-fd-fix`. Restoring that executable requires
a restart of rpcd, not of the tunnel. Firmware or package upgrades may replace
the locally patched executable; integrate this patch into the firmware package
build to preserve it across those upgrades. Zirgozar packages do not silently
replace the operating system's rpcd executable.
