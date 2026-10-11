#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
. "$(dirname "$0")/rig.sh"
rig_setup
. "$ZGZ_LIB/zgz-common.sh"
printf 'label=old\n' > "$ZGZ_BEST_META"
say_status ready
cat > "$RIG/bin/curl" <<'CURL'
#!/bin/sh
echo call >> "$ZGZ_RUN/curl.calls"
case "$(cat "$ZGZ_RUN/scenario" 2>/dev/null)" in
 switch)
  printf 'label=new\n' > "$ZGZ_ETC/best.meta"
  cp "$ZGZ_ETC/best.meta" "$ZGZ_RUN/active.meta"
  echo new-connection > "$ZGZ_RUN/active.token" ;;
 fail) exit 1 ;;
esac
printf 'ip=192.0.2.10\nloc=DE\n'
CURL
chmod +x "$RIG/bin/curl"
"$ZGZ_LIB/zgz-test" exit
check "$(sed -n 's/^cc=//p' "$ZGZ_RUN/exit")" DE 'current connection exit is recorded'
check "$(sed -n 's/^identity=//p' "$ZGZ_RUN/exit")" "$(exit_identity)" 'exit result carries connection identity'
rm -f "$ZGZ_RUN/exit"
echo switch > "$ZGZ_RUN/scenario"
"$ZGZ_LIB/zgz-test" exit
if [ ! -e "$ZGZ_RUN/exit" ]; then ok 'late answer from previous connection is discarded'; else bad 'late answer mislabeled'; fi
say_status starting
"$ZGZ_LIB/zgz-test" exit
check "$(wc -l < "$ZGZ_RUN/curl.calls" | tr -d ' ')" 2 'transition does not query the old core'
say_status ready
echo fail > "$ZGZ_RUN/scenario"
"$ZGZ_LIB/zgz-test" exit
check "$(wc -l < "$ZGZ_RUN/curl.calls" | tr -d ' ')" 3 'failed proxy query does not fall back to router egress'
check "$(sed -n 's/^ip=//p' "$ZGZ_RUN/exit")" '' 'failed query does not invent an exit address'
rig_report
