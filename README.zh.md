<p align="center">
  <img alt="Zirgozar" src="package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/logo.png" width="200">
</p>

<h3 align="center">适用于 OpenWrt 的全路由器隧道</h3>

<p align="center">
  <a href="https://github.com/dreamboxone/zirgozar/releases/latest"><img alt="发布版本" src="https://img.shields.io/github/v/release/dreamboxone/zirgozar?style=for-the-badge&color=0b3d91&label=release&cacheSeconds=300"></a>
  <a href="https://github.com/dreamboxone/zirgozar/releases"><img alt="下载量" src=".github/badges/downloads.svg"></a>
  <img alt="OpenWrt" src="https://img.shields.io/badge/OpenWrt-23.05%20%7C%2024.10%20%7C%2025.12-00B5E2?style=for-the-badge&logo=openwrt&logoColor=white">
  <a href="LICENSE"><img alt="许可证" src="https://img.shields.io/badge/license-AGPL--3.0-16a34a?style=for-the-badge"></a>
</p>

<p align="center">
  <a href="README.md">فارسی</a> · <a href="README.en.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ru.md">Русский</a>
</p>

<p align="center">
  <a href="https://github.com/dreamboxone/zirgozar/releases/latest">下载最新版本</a> · <a href="https://t.me/routekernel1">Telegram 支持</a>
</p>

## ✨ 功能

- 手机、电脑、电视和游戏机等局域网设备共用路由器隧道，无需逐台安装客户端。
- 自动测试配置，选择延迟较低的可用连接，故障时切换；订阅按各自计划更新，默认公共列表每 15 分钟更新。
- 界面支持 فارسی、English、简体中文和 Русский，语言在页面顶部切换。
- 适配 Argon、Material、Material3、Aurora 和移动设备；可以跟随 LuCI 主题或单独选择明暗外观。
- 支持分流、设备访问控制、代理链、SOCKS、服务端、Cloudflare WARP、流量统计、备份和应用内更新。
- 伊朗流量可直连。使用 nftables 和 Geoview 时，伊朗 IPv4 目的地址可在进入核心前绕过隧道。dnsmasq 模式下，伊朗域名使用独立的直连 UDP DNS；服务开启期间，境外 DNS 不回退到直连。
- dnsmasq-full 的 nftset 可以将伊朗域名解析得到的 IPv4 地址加入直连规则，即使网站托管在境外。映射在核心重启时保留，服务停止时清除。自定义分流与设备规则优先；`route_ir_pre=0` 恢复仅由核心分流。
- 不影响隧道的设置保存不会重启隧道。主要核心为 [Xray](https://github.com/XTLS/Xray-core)，也支持 sing-box 及其他协议核心。

## 💾 1. 安装前检查资源

| 资源 | 最低要求 | 建议 |
|---|---|---|
| 基础安装可用存储 | 约 120 MiB | 至少 160 MiB |
| RAM | 128 MB | 256 MB 或更多 |
| CPU | 有对应 Xray 构建的架构 | 双核或更多 |

主包同时包含 Xray 和 sing-box。在 `arm_cortex-a7_neon-vfpv4` 参考路由器上，主包安装后约占 105 MiB，界面不足 1 MiB。已安装其他 `xray-core` 不会省去主包自带副本；压缩包大小也不等于安装占用。

安装全部列出的核心、工具和完整路由数据约需 400 MiB，建议至少准备 1 GiB 可用存储。此测量包含 Xray、patterniha Xray、sing-box、sing-box-lx、Geoview、warp-plus、Vwarp、Aether 及其辅助文件、Mihomo、shadowsocks-rust、OpenVPN 和 HAProxy。更新缓存另约 38 MiB；完整路由数据约 24 MiB，精简版两文件约 2 MiB。订阅、历史、后续版本和临时解压还会增加占用；完整安装适合 USB 或 extroot。

```sh
df -h /overlay /tmp
du -sh /usr/libexec/zirgozar /etc/zirgozar /www/luci-static/resources/zirgozar
```

32/64 MB 总闪存装不下当前基础包；128 MB 总闪存也不代表有 120 MiB 可写空间。仅把下载目录改为 USB，不会移动初始包自带的两个核心。

运行核心通常占用 40–80 MB RAM。小内存设备可将配置页的 **Checked at once** 从 30 降到 10，降低并行握手压力。参考设备为四核 Cortex-A7、717 MHz，实测隧道约 1.6 MB/s，98 个配置的选择约 8.8 秒；这些不是所有设备的性能保证。

## 📦 2. 安装

| OpenWrt | 包管理器 | 需要安装的包 |
|---|---|---|
| 25.12 及更新 | `apk` | `zirgozar-<version>.<arch>.apk` |
| 24.10、23.05 | `opkg` | `zirgozar_<version>_<arch>.ipk` |

从 `/etc/openwrt_release` 的 `DISTRIB_ARCH` 确认架构，安装包必须匹配。LuCI、翻译和菜单已包含在 `zirgozar` 中，新安装只需一个包。小型 `luci-app-zirgozar` 包仅为旧自动更新器保留，不含界面文件。发布覆盖 ARM、ARM64、MIPS、x86、RISC-V、LoongArch 共 29 种架构，例如 `arm_cortex-a7_neon-vfpv4`、`aarch64_cortex-a53`、`mipsel_24kc` 和 `x86_64`。

### 通过 LuCI 安装

进入 **系统 → 软件包 → 上传软件包**，安装 `zirgozar` 包，然后按一次 **Ctrl+F5**。

### 通过 SSH 从 GitHub 安装

在路由器上执行以下命令。它使用 `jsonfilter` 查找最新已发布版本，并按本机架构下载、安装或升级：

```sh
(
  set -eu
  . /etc/openwrt_release
  tag="$(wget -qO- https://api.github.com/repos/dreamboxone/zirgozar/releases/latest | jsonfilter -e '@.tag_name')"
  case "$tag" in
    v[0-9]*) ;;
    *) echo 'Could not determine the latest release.' >&2; exit 1 ;;
  esac
  version="${tag#v}"
  base="https://github.com/dreamboxone/zirgozar/releases/download/$tag"
  install_dir="/tmp/zirgozar-install-$version"
  mkdir -p "$install_dir"
  if command -v apk >/dev/null 2>&1; then
    main="zirgozar-$version.$DISTRIB_ARCH.apk"
    wget -O "$install_dir/$main" "$base/$main"
    apk update
    apk add --allow-untrusted --upgrade "$install_dir/$main"
  elif command -v opkg >/dev/null 2>&1; then
    main="zirgozar_${version}_${DISTRIB_ARCH}.ipk"
    wget -O "$install_dir/$main" "$base/$main"
    opkg update
    opkg install "$install_dir/$main"
  else
    echo 'apk or opkg was not found.' >&2
    exit 1
  fi
)
```

### 安装已经下载到 `/tmp` 的包

下载适合路由器架构的 `zirgozar` 包。使用 [MobaXterm](https://mobaxterm.mobatek.net/download.html) 连接路由器，通过文件传输面板将文件复制到路由器的 `/tmp` 文件夹。

旧版 OpenWrt 改传 `.ipk`。`/tmp` 使用 RAM，重启后文件消失；先检查 `df -h /tmp`。安装仍需 `/overlay` 可写空间和下载缺失依赖的网络。

在路由器上运行以下命令；`/tmp` 中应只保留一个适合该架构的 `zirgozar` 包：

```sh
(
  set -eu
  . /etc/openwrt_release
  if command -v apk >/dev/null 2>&1; then
    set -- /tmp/zirgozar-*."$DISTRIB_ARCH".apk
    [ "$#" -eq 1 ] && [ -f "$1" ] || {
      echo 'Keep exactly one matching zirgozar package in /tmp.' >&2; exit 1;
    }
    apk update
    apk add --allow-untrusted --upgrade "$1"
  elif command -v opkg >/dev/null 2>&1; then
    set -- /tmp/zirgozar_*_"$DISTRIB_ARCH".ipk
    [ "$#" -eq 1 ] && [ -f "$1" ] || {
      echo 'Keep exactly one matching zirgozar package in /tmp.' >&2; exit 1;
    }
    opkg update
    opkg install "$1"
  else
    echo 'apk or opkg was not found.' >&2; exit 1
  fi
)
```

> [!IMPORTANT]
> 安装时必须已有可用网络。原版 OpenWrt 未必带有 `kmod-nft-tproxy`、`curl`、`ip-full` 等依赖；包管理器需要下载它们。请在需要隧道之前完成安装。

若依赖未装好，打开 **App Update → Router requirements**，检查透明代理、策略路由和 HTTPS 能力，按按钮补装。此操作不会替换其他软件的 `xray-core`。

安装后主开关保持关闭，程序不会自行启用隧道。

**DNS 前置条件：** 现在依赖 `dnsmasq-full`。已有安装的依赖安装器会保留 DNS/DHCP 配置并替换普通 dnsmasq：apk 在一次事务中完成；opkg 先下载所需文件和离线回滚包，失败时恢复普通 dnsmasq。全新 opkg 安装可能需先手动替换，命令和回滚步骤见[波斯语安装示例](README.md#-۲-نصب)。应用内更新会自动准备。

## 🚀 3. 第一次连接

1. 打开 **服务 → Zirgozar → Basic Settings**。
2. 页面会开始测试配置，状态卡显示进度。
3. 在 **Main** 中开启 **Main switch**，按 **Save & Apply**。

没有配置时，进入 **Configs → Import share links** 导入一个自己的链接，再返回连接。订阅地址可能要先有隧道才能访问；自己的配置可以打破这个循环。

> [!WARNING]
> 同一路由器上运行的 PassWall2 应先关闭。两个透明代理会争用流量；程序发现冲突时会在状态卡提示。

## 🧭 4. 页面和选项

页面包括 Basic Settings、Configs、Node Subscribe、Other Settings、App Update、Rule Manage、Geoview、Server-Side、Access Control 和 Runtime Logs。语言选择保存为 `lang=en/fa/zh/ru`。

设置位于 UCI 文件 `/etc/config/zirgozar`；以下保留英文界面名称和 UCI 键，方便对照。问号打开帮助，点击外部或按 Escape 关闭。表单修改需 **Save & Apply**；更新、删除、使用等即时按钮会在附近说明。反馈出现在相关控件旁，错误会保留到下次操作。

### ⚙️ 4.1 Basic Settings：基本设置

顶部显示状态、核心、连接检测和用量；版本与运行时间位于语言选择下方。用量可选今天、最近 7 天、最近 30 天，浏览器记住选择。

**Core** 显示名称、版本和运行状态。Instagram / Reddit / X 按钮通过路由器当前路径发起一次请求：不足 1 秒为绿色、不足 2 秒为黄色、更慢为红色，失败为 N/A。

状态卡显示当前配置、协议、延迟和路由；服务器 IP 默认模糊，悬停或点按可查看。出口国家通过隧道查询，更换配置后和每 15 分钟更新。手选配置的延迟来自一次端口握手。**Choose again** 清除当前选择并重新测量；提示可关闭，同一问题再发生时会重新出现。

#### Main：主设置

| 选项 / UCI 键 | 默认及作用 |
|---|---|
| Main switch / `enabled` | 关闭。应用后启停隧道，重启后保留。 |
| Active core / `core_engine` | Auto（值 `xray`）：优先 Xray，必要时用 sing-box；也可固定 sing-box 或 sing-box-lx。OpenVPN 始终由官方客户端承载。 |
| Node / `node` | 自动选最快；手选配置则不进行自动排名。订阅更新后依次按配置内容、协议/地址/端口、地址/端口、地址、名称找回；均无匹配时使用该订阅首项并记录日志。 |
| Preproxy / `preproxy_enabled` | 关闭。先经过自己的前置配置再连接目标；启用时跳过直接 TCP 预筛选。 |
| Preproxy Node / `preproxy_node` | 前置配置，仅可选手动添加项。 |
| Localhost Proxy / `localhost_proxy` | 开启。路由器自己的下载、时钟、包管理器等也走隧道；测试配置及读取订阅期间可直连，以便修复连接。 |
| Client Proxy / `client_proxy` | 开启。局域网设备使用隧道；关闭后访问控制明确指定的设备仍可代理。 |
| Kill switch / `kill_switch` | 关闭时隧道断开会直连。开启后持久防火墙规则阻止设备经 WAN 绕过隧道，停止、故障、重启期间仍保留，并在启动早期装载。 |
| Node Socks Listen Port / `node_socks_port` | `1070`；使用当前隧道的 SOCKS 端口，留空禁用。 |
| Node Socks Bind Local / `node_socks_bind_local` | 开启，仅路由器本机可连接。 |
| Socks Main switch / `socks_enabled` | 关闭。启用下方独立 SOCKS 端口表。 |
| Restore defaults / `factory_reset` | 需确认后应用；删除配置、订阅和设置，恢复 `/usr/share/zirgozar` 中初始副本。保留路由数据、下载的核心和流量历史，无撤销。 |

sing-box 接收转换后的入站、规则、DNS 和伊朗分流，原生运行 hysteria2/tuic；不继承 mux、noise、FakeDNS、mKCP 和 poisoned-address 入站。其流量统计通过轮询，可能偏低。官方 sing-box 不支持 xhttp，[sing-box-lx](https://github.com/Leadaxe/sing-box-lx) 支持；所选核心缺失或不支持时回退 Xray 并提示。

Kill switch 使用独立 nftables 表 `zirgozar_ks` 或 iptables 链 `ZGZ_KS`。仍允许本地网络、明确的直连地址/设备/端口和外部入站连接的回复。伊朗分流开启且 Geoview 成功提取地址时允许相应目的地，否则也阻止。ICMP 同样会被阻止；路由器自身 DNS 在服务停止后仍回到运营商。要恢复普通直连，关闭 Kill switch 并应用。

**Socks Config** 每行对应 `config socks`：`enabled` 启停，`node` 选择配置（空为当前隧道），`port` 指定端口，新行从 1090 起寻找空闲端口。

#### Shunt Rule：分流

| 选项 / 键 | 默认及作用 |
|---|---|
| Domain Strategy / `domainStrategy` | Auto：涉及 IP 规则或伊朗分流时用 IPIfNonMatch，否则 AsIs。AsIs 仅按域名；IPIfNonMatch 域名未匹配后解析；IPOnDemand 遇到 IP 规则即解析。 |
| Domain matcher / `domainMatcher` | `hybrid` 更快，`linear` 更省内存。 |
| FakeDNS Main switch / `shunt_fakedns` | 关闭。允许规则返回合成 IP，由远端解析真实地址；路由器自身访问需 Localhost Proxy。 |
| Shunt Rule Group / `shunt_group` | `default`；一次使用一组，应用后刷新表。 |
| Default / `default_node` | 未命中规则的流量，默认使用当前隧道。 |
| Default FakeDNS / `default_fakedns` | 关闭；仅直接将 DNS 送入隧道的模式可用。 |
| Default Preproxy / `default_preproxy` | 无；默认出口为手动配置时可指定前置。 |

每行 `config shunt_rules` 按顺序匹配，可添加、编辑、删除、拖动。`remarks` 是名称；`node` 可关闭规则、用默认、当前隧道、直连、阻断或自选配置；`fakedns` 仅代理规则可用；`preproxy` 只加一层前置，已有链保持自己的链。

编辑字段：`group` 规则组；`protocol` 为 http/tls/quic/bittorrent；`inbound` 选透明代理/SOCKS，均未选表示两者；`network` 选 TCP/UDP；`source` 为设备地址、网段或 `geoip:private`；`port` 支持 `443`、`80,443`、`1000-2000`；`domain_list` 每行一个 `domain:`、`full:`、`regexp:`、`keyword:`、`geosite:` 或普通关键词，`#` 注释；`ip_list` 接受地址、网段、`geoip:`。

规则作用于主隧道及未独立指定配置的 SOCKS，位于阻断、本地网络和明确直连之后、伊朗分流之前。访问控制指定独立配置的设备保持自己的出口。

#### DNS

| 选项 / 键 | 默认及作用 |
|---|---|
| Name lookups / `dns_mode` | Through dnsmasq：隔离解析器只以上游隧道 DNS 解析，导入本地/DHCP 名称而不导入系统上游；租约更新约 5 秒可见。Straight into the tunnel 不保留本地域名；Leave alone 不修改 DNS。 |
| Direct DNS Protocol / `direct_dns_protocol` | Auto：路由器上游，其次运营商；用于直连目的地及配置服务器自身域名。 |
| Direct DNS / `direct_dns` | UDP/TCP 解析器，格式 `IP` 或 `IP:53`。选用的解析器可看到直连域名查询。 |
| Direct Query Strategy / `direct_dns_query_strategy` | `UseIPv4`；直连查询的地址族。 |
| Remote DNS Protocol / `remote_dns_protocol` | TCP；另有 UDP、DoH、DoT，DoQ/DoH3 需 sing-box。许多免费配置不承载 UDP。 |
| Remote DNS / `remote_dns` | `8.8.8.8`；TCP/UDP 使用。部分 Cloudflare Workers 配置无法访问 `1.1.1.1`，旧默认值会迁移一次。 |
| Remote DNS DoH / `remote_dns_doh` | `https://8.8.8.8/dns-query`。若 URL 使用域名，逗号后必须加一个有效的字面 bootstrap IP；不会用直连 DNS 解析该端点。 |
| DoT / DoQ | `remote_dns_tls`、`remote_dns_tls_port`、`remote_dns_tls_server_name` 默认 `1.1.1.1`、`853`、`cloudflare-dns.com`。始终验证 TLS；DoQ 需 sing-box。 |
| Client encrypted DNS policy / `encrypted_dns_policy` | `proxy`：代理 853 和已知 DoH；`strict` 另保护 5353 和 `dns_guard_ports`，阻断未捕获连接，同时保留普通网站伊朗分流；`rules` 按流量规则。严格防护可随 Kill switch 保留；未知 DoH/未列出端口不在保证内。 |
| EDNS Client Subnet / `remote_dns_client_ip` | 可选真实客户端子网，供支持 RFC 7871 的 DNS 优化 CDN，不填私有地址。 |
| Remote DNS Outbound / `remote_dns_detour` | Remote：经隧道；也可直连。 |
| FakeDNS / `remote_fakedns` | 关闭；只用于 Straight into the tunnel，避免污染路由器自身 dnsmasq 查询。 |
| Remote Query Strategy / `remote_dns_query_strategy` | `UseIPv4`。 |
| Domain Override / `dns_hosts` | 每行 `域名 地址`。 |
| DNS Redirect / `dns_hijack` | 开启；将设备绕过路由器发出的普通 DNS 查询带回受控解析路径。 |

#### Log 与 Maintain

`log_node` 默认开启核心日志；`loglevel` 默认 `warning`，可选 debug/info/warning/error。流量图显示今天、最近 7 天、本月、最近两周及本月直连用量；每 5 分钟读取计数，写闪存频率在 Other Settings 设置。

**Backup** 包含客户端/服务端设置、配置、订阅、分流、WARP/Aether 账户和路由数据，不含核心二进制和流量历史。**Restore** 导入备份；不同版本设置可能不兼容。

### 📋 4.2 Configs：配置

| 选项 / 键 | 默认及作用 |
|---|---|
| Nodes to use / `sources` | 仅手动配置；另可选全部或仅订阅。决定候选集合，最终按测试结果选择。 |
| Automatic detection delay / `auto_detection_time` | TCP Ping；打开页面时测量手动项，可改 Ping 或关闭。 |
| Show server address and port / `show_node_info` | 关闭；在列表显示地址端口。 |
| URL Test Address / `test_url` | `http://www.gstatic.com/generate_204`；实际代理请求测试地址。 |
| First pass / `prefilter` | TCP 握手；也可 Ping 或两者。CDN 的 ICMP 回应不能证明后端可用。 |
| Good enough / `good_ms` | `1000` ms；找到低于此值的可用配置即停止。 |
| Measured at a time / `batch_size` | `10`；每批完整请求数。 |
| Batches at most / `max_batches` | `5`；未找到足够快的配置时最多测几批。 |
| Checked at once / `sift_parallel` | `30`；第一轮并行握手数，小内存设备应调低。 |

**Add** 逐字段新建；**Import share links** 每行导入一个链接；**Add file** 接受链接、WireGuard `.conf`、OpenVPN `.ovpn`、Xray `.json`、Clash `.yaml/.yml`。还有全选/取消、删除所选、分组、清空。批量删除不删除当前隧道正在使用项；删除配置会同步清理主节点、前置、SOCKS、访问控制和分流中的引用。

手动项是 `config node`：`name` 留空时用链接 `#` 后名称，`group` 为空时为默认组，`enabled` 控制启用，`link` 保存链接或文件内容。**Browse** 读取文件到编辑框，不单独上传。`chain_proxy` 可选前置或落地，`preproxy_node` 是先连接的节点，`to_node` 是最终出口。每行支持 **Edit / Delete / To Top / Use / Copy**；Use 会设为主节点，隧道开启时重新连接。

**Ping** 测 ICMP；**TCPing** 测端口握手；**URL Test** 测完整代理请求。后者才证明可承载请求，并使用实际选定的核心及必要回退。未测显示 Test，失败 `✕`，不适用 `—`。底部全部配置列表按测量排序；找到足够快的节点后停止完整测试，所以很多 URL Test 留空。**Check all** 不打断现有隧道。

编辑页把支持的链接展开为协议、地址、端口、ID/密码、flow、安全及传输字段。支持 TLS/REALITY 的 SNI、ALPN、指纹、公钥、Short ID、Spider X；`pqv` 的 ML-DSA-65 校验键交给 Xray，sing-box 不提供此校验。传输包括 RAW、WebSocket、gRPC、HTTP/2、HTTPUpgrade、XHTTP Extra、mKCP Seed。未知参数保留；文件或多链接按原文本编辑。

顶部按钮：**From Share URL** 替换，应用后保留；**Build Share URL** 生成当前字段链接；**Generate QRCode** 在浏览器离线生成二维码；**Export Config File** 导出已保存的 Xray 配置，含 `127.0.0.1:1080` SOCKS 和 `127.0.0.1:1081` HTTP。

| 附加字段 / 键 | 作用 |
|---|---|
| TLS Chain Fingerprint / `tls_pin` | SHA256 证书链指纹必须匹配。 |
| CertName / `cert_name` | 验证服务器证书名称。 |
| TLS Certificate / `tls_pem` | 使用指定 PEM 证书验证。 |
| ECH / `ech` | ECH 配置或发布它的域名/DNS；字段优先于 PattN 链接中的 `ech`。 |
| Cipher Suites / `cipher_suites` | 冒号分隔，读取 PattN 的 `cs`；与 unsafe 指纹配合可改变 TLS 首包。 |
| User-Agent / `user_agent` | WebSocket、HTTPUpgrade、XHTTP、gRPC 使用。 |
| FinalMask / `finalmask` | 本节点 JSON；读取 PattN 的 `fm`。未自行定义的 fragment/noise 仍可由全局设置补入。 |
| TCP Fast Open / MPTCP | `tcp_fast_open`、`tcp_mptcp`；服务器也需支持。 |
| Domain DNS Resolve / `dns_resolver` | 直接解析服务器域名的 DNS，如 `udp://1.1.1.1`。 |
| Domain Strategy / `domain_strategy` | 连接前解析及地址族。 |
| Happy Eyeballs / `happy_eyeballs` | 同时尝试 IPv4/IPv6，选择较快者。 |

sing-box 可转换 ECH、cipher、PEM、TFO、MPTCP、Domain Strategy，不支持上述链指纹和 CertName。

#### 协议说明

- **WireGuard：** 读取 `PrivateKey`、`Address`、`MTU`、`Reserved`、`PublicKey`、`PresharedKey`、`Endpoint`、`PersistentKeepalive`；忽略 `AllowedIPs` 和 `DNS`，路由/DNS 由应用控制。
- **OpenVPN：** 必须使用 `openvpn-openssl`，缺失时在 Router requirements 安装。支持官方客户端连接指令，包括静态密钥、pkcs12、代理、重连、MTU/mssfix/fragment；移除会改动路由器的脚本、插件、management、路由/DNS、设备名，以及 OpenVPN 2.6 拒绝的旧/Windows 指令；`tls-remote` 转为 `verify-x509-name`。旧 cipher 按配置回退，BF-CBC 等需 `libopenssl-legacy`。服务器域名直连解析，`zgzovpn` 设备承载出口并保留分流。可填用户名、密码、私钥口令；不支持 TAP，只能手选，不参加自动排名。
- **L2TP/IPsec：** IPv4 或域名、端口默认 1701、账户密码，可启用 IPsec 填 PSK；MTU 默认 1400。链接 `l2tp://user:password@server:1701?ipsec=0#name` 或 `l2tp+ipsec://user:password@server:1701?psk=key#name`，特殊字符要 URL 编码。使用 `zgzl2tp`；Ping 测服务器，TCPing/URL Test 经隧道测目标。普通 L2TP 不加密；仅主隧道，不支持链/均衡。
- **PPTP / SSTP：** 账户密码，默认端口 1723/443、MTU 1400；`pptp://user:password@server:1723?mppe=1#name`、`sstp://user:password@server:443#name`。依赖由 Router requirements 安装，设备 `zgzpptp`/`zgzsstp`。SSTP 使用 HTTPS，但此客户端不验证服务器证书；PPTP 加密较弱，MPPE 默认开。仅主隧道。
- **IKEv2：** EAP 用户名密码或 PSK，端口默认 500、MTU 1400。EAP 服务器证书应为公共 CA，或在 Certificate authority 粘贴私有 CA；名称不同则填 Server identity。链接 `ikev2://user:password@server:500?id=vpn.example.com#name` 或 `ikev2://server:500?psk=key#name`；`ca=` 为 base64 证书。连接/测试时补装 strongSwan EAP/OpenSSL 和 XFRM 模块，浏览页面不会安装。PureVPN 用账户密码，服务器身份 `pointtoserver.com`，不是 PSK。使用 `zgzikev2`，不影响其他 strongSwan；仅主隧道。
- **AmneziaWG：** `.conf` 含 `Jc/Jmin/Jmax`、`S1`–`S4`、`H1`–`H4` 或 `I1`–`I5` 时识别 v2/v3。需 [sing-box-lx](https://github.com/Leadaxe/sing-box-lx) 独立承载整个隧道，Xray/官方 sing-box 不支持；手动选择。
- **Aether：** 导入 `aether://`，支持 MASQUE、WireGuard、多层隧道及受支持的 `aetherCommand` JSON。安装 Aether 核心后使用；字段与高级功能见 [Aether 专题说明](docs/aether.md)。`perf`、`api_ech` 在本应用输入/输出中保留，但 PattN/PattNG 导入器忽略这两个参数。

#### WARP、warp-plus 与 Vwarp

Add 中选 WARP，通过 [warp-plus](https://github.com/bepass-org/warp-plus) 注册账户、寻找可用地址并提供本机 SOCKS；Xray/sing-box 继续处理分流、DNS、访问控制和统计。先在 App Update 安装所需核心。

链接格式 `warp://[licence@]endpoint-or-auto?mode=…#name`，与 Hiddify 格式相同：

| 字段 | 链接参数及作用 |
|---|---|
| Mode | `mode`：普通 WARP、WARP in WARP、WARP 后接 Psiphon。 |
| Exit country | `country`：warp-plus 支持的 31 个 Psiphon 国家之一。 |
| Endpoint | `?` 前的 `IP:PORT`，留空自动。 |
| Scan | `scan`：无固定端点时扫描。 |
| Scan: slowest answer | `rtt`：默认 1000 ms，更慢的忽略。 |
| IP version | `ipv`：双栈、IPv4、IPv6。 |
| WARP+ licence | `@` 前可选许可证，一份可供五台设备。 |
| DNS inside WARP | `dns`：默认 `1.1.1.1`。 |
| Reserved | `reserved`：三个数，空为账户值。 |

账户卡显示免费/WARP+ 和剩余流量。每个配置的账户保存在 `/etc/zirgozar/warp/<section>`，重启不重新注册。**Register** 按路由器当前网络路径注册；若已有连接并开 Localhost Proxy，可经其访问注册 API。**New account** 替换现有账户。连接和 URL Test 可需约一分钟，服务等待两分钟；不参加自动排名，Ping/TCPing 无意义。

普通 WARP 注册后可作为前置、落地、分流、设备规则、SOCKS 或服务端出口，由 Xray WireGuard 承载；WARP in WARP 和 Psiphon 仅作为主隧道。当前 WARP 主节点在分流/ACL 中复用现有隧道，不重复建立账户会话。普通 WireGuard 编辑页的 **Carry with warp-plus** 可让握手前加噪声；作为前置/落地时仍由 Xray 承载。

**WARP over MASQUE** 使用 [Vwarp](https://github.com/voidr3aper-anon/Vwarp)，链接 `mode=masque`，HTTP/3 默认端点 `162.159.198.1:443`，单独地址默认 443；账户独立，Register 可经当前隧道注册。WARP 的 `noize` 有 off/minimal/light/medium/heavy/stealth/gfw/firewall；非 off 交给 Vwarp，MASQUE 未指定时用 medium。更重不保证更快或一定可用。

#### XDRIVE（VLESS）

粘贴 `xdriveSettings` JSON：`service` 支持 `google-drive`、`template`、`local`，设置 `remoteFolder` 与 `secrets`；保留嵌套 template、`hrefPath/hrefMethod` 和 `xmux`。HTTP/3 使用 TLS 且 ALPN 仅 `h3`，需 Xray 26.10.22+。

必须启用 VLESS encryption，清空 flow。用 `xray vlessenc` 生成匹配密钥：服务端 decryption，客户端 encryption。客户端所需 Mux 自动开启，`xmux` 另管存储连接。JSON/链接保留传输设置，自动选择跳过 TCP 预筛选而测真实代理路径。

### 🔗 4.3 Node Subscribe：订阅

| 全局选项 / 键 | 默认及作用 |
|---|---|
| Keyword filter / `filter_keyword_mode` | Discard List；按名称中的原样子串过滤，可关闭、丢弃、保留、保留优先的丢弃、丢弃优先的保留。 |
| Discard / Keep List | `filter_discard_list` / `filter_keep_list`；相应关键词。 |
| Nodes kept at most / `max_nodes` | 所有订阅共最多 300。 |
| Manual subscription All | 立即更新全部订阅。 |
| Delete All Subscribe Node | 清除缓存节点，下次更新会恢复。 |

每行 `config subscription` 显示名称、数量、提供方报告的余量/到期日、更新时间/失败原因、URL、启用开关及更新/删除节点按钮。接受普通链接、base64、Xray/sing-box（含 LX xhttp）/Clash JSON 或 YAML、hysteria2 YAML、WireGuard conf；此订阅路径跳过 AmneziaWG。

| 编辑字段 / 键 | 默认及作用 |
|---|---|
| Name / `name` | 唯一名称。 |
| Subscribe URL / `url` | HTTP/HTTPS 地址。 |
| Or a file / `content` | 本地配置内容，Browse 填入；此时 URL 留空。 |
| On / `enabled` | 开启。 |
| Access Method / `access_mode` | Auto 按路由器路径；未启用 Localhost Proxy 时，隧道可用则走代理，否则直连。可明确 Direct/Proxy。 |
| User-Agent / `user_agent` | `v2rayN/9.99`；某些服务商按客户端返回内容。 |
| Keyword filter | `filter_keyword_mode` 默认继承全局，可用本订阅的 discard/keep 列表覆盖。 |
| Update Once on Boot / `boot_update` | 关闭。 |
| Auto Update Mode / `update_week_mode` | Disable；可每 15 分钟、Loop、每天、每周某天。禁用后仅手动或从未读取时更新。 |
| Update Time / `update_time_mode` | `0:00`，日/周计划使用。 |
| Update Interval / `update_interval_mode` | `2` 小时，Loop 使用。 |
| Chain Proxy / `chain_proxy` | 关闭；给订阅配置加前置或落地，仅适用相应 Xray 配置，hysteria2/tuic 不加入落地链。 |
| Preproxy / Landing | `preproxy_node` / `to_node`。 |

订阅内容变化时才写闪存，重启可保留周更列表。若 ECH 的普通 DNS 取键被阻断，可在节点编辑器启用 **ECH DNS through TLS (echOutbound)**：经 TLS 到 `1.1.1.1:443`，使用 Microsoft SNI、fromMitM 证书/ALPN 处理与 Chrome 指纹，查询 `h2c://1.1.1.1/dns-query`。ECH 字段可写 `cloudflare-ech.com+h2c://1.1.1.1/dns-query`，否则用节点 SNI。此预设替换为 Cloudflare resolver，需支持 echSockopt/fromMitM 的近期 Xray，不支持 sing-box；默认关闭，测试和配置导出包含它。

### 🧰 4.4 Other Settings：其他设置

首页不等待订阅处理完成才显示，节点选项随后填充；流量时间范围由浏览器记忆。

| 定时与健康选项 / 键 | 默认及作用 |
|---|---|
| Daemon / `start_daemon` | 开启；连续两次请求失败触发修复，与订阅更新计划独立。 |
| Health interval / `health_interval` | 3 分钟，可选 1/2/3/5/10/15/30。 |
| Replace slow config / `health_switch_slow` | 开启，仅自动选择：两次慢检查加确认后找替代；替代再测且至少快 1.5 倍，两次搜索至少间隔 10 分钟。 |
| Minimum slow delay / `health_slow_ms` | 1500 ms，且需超过当前配置最佳延迟的两倍；不是下载速度。 |
| Delay Start / `start_delay` | 启动后等 1 秒。 |
| Stop / Start / Restart schedule | `stop_week_mode/stop_time_mode`、`start_week_mode/start_time_mode`、`restart_week_mode/restart_time_mode`；默认 Disable、0:00。日/周计划，重启另可 Loop。 |
| Restart Interval / `restart_interval_mode` | Loop 默认 2 小时。 |

周从星期六开始；这些任务只在主开关开启时保留。

| 转发选项 / 键 | 默认及作用 |
|---|---|
| 不转发 TCP/UDP 端口 | `tcp_no_redir_ports` / `udp_no_redir_ports`；空，优先级最高。 |
| 转发 TCP/UDP 端口 | `tcp_redir_ports` / `udp_redir_ports`；全部，可选常用或仅 80/443。 |
| Firewall backend / `firewall_backend` | Auto，nftables 或 iptables。 |
| TCP Proxy Way / `tcp_proxy_way` | REDIRECT；可选 TPROXY，UDP 始终 TPROXY。 |
| Hijacking ICMP / `accept_icmp` | 关闭；隧道不承载 ICMP，开启后由路由器回复。 |
| IPv6 / `ipv6` | 连接期间拒绝 IPv6，使设备回退到受代理的 IPv4。 |
| Interfaces to tunnel / `lan_zone` | 全部 LAN；可只选指定接口。 |

| Xray 选项 / 键 | 默认及作用 |
|---|---|
| Fragment / `fragment` | 关闭；分片部分 TCP 写入。 |
| Fragment Packets / `fragment_packets` | `tlshello`；或 `1-3` 等客户端最初写入。 |
| Fragment Length / `fragment_lengths` | `3-5,6-8,10-20` 字节。 |
| Fragment Delay / `fragment_delays` | `10-20` ms。 |
| Max Split / `fragment_maxSplit` | `3-6`。 |
| Noise / `noise` | 关闭；用于 mKCP 和 xhttp/HTTP3 的 UDP 噪声。 |
| Mux / `mux` | 关闭；不用于 VLESS flow、xhttp、WireGuard。 |
| Mux / XUDP concurrency | `mux_concurrency=8`、`xudp_concurrency=16`。 |
| Override destination / `sniffing_override_dest` | 关闭；默认只用识别域名做路由，不替换目的地址。 |
| Excluded Domains / `excluded_domains` | Apple push、Xiaomi、WeChat 等，不替换这些目的地址。 |
| Buffer Size / `buffer_size` | 每连接 kB，空为核心默认。 |

噪声表 `config xray_noise_packets`：`enabled` 启用；`type` 为 rand/str/hex/base64/array；`packet` 为内容或随机长度/范围；`delay` 为之后的毫秒间隔/范围。

**Load Balancing：** 从 Cores 安装 HAProxy，在本页启用并填写服务器、本地监听端口、均衡方法和健康间隔。配置指向 `127.0.0.1:组端口`；故障服务器被排除，状态控制台另设端口和账户密码。

**Traffic history：** `stats_flush_minutes=5` 控制写闪存频率；尚未写入的数据断电会丢失。Forget all recorded traffic 清空历史并重新计数。**Set router clock** 设置伊朗时间，错误时间会影响 TLS。

**LED color：** 默认关闭，仅支持匹配的三路独立调光 RGB 指示灯。开启后每 15 秒做当前连接的 URL 测试：<200 ms 绿、200–299 黄、300–499 橙、≥500 红，失败/断开则熄灭。三条边界可改，各色可按硬件支持常亮/闪烁；禁用恢复 OpenWrt 设置。

### ⬆️ 4.5 App Update：更新

应用更新可复用旧包未变区段，只下载缺少部分，最后以 `SHA256SUMS` 验证完整发布包并由 apk/opkg 安装。首次完整下载；缓存位于 `/usr/libexec/zirgozar/.update-cache`，每组件最多保留一个不超过 64 MiB 的包，并预留至少 8 MiB 空间。缓存缺失、不兼容、复用少或 Range 失败时改为完整下载。删除缓存不影响安装；打开页面可能刷新版本元数据，但下载包需要明确更新操作。

- **App Update：** 检查、下载、验证、安装；保留设置，原来开启的隧道恢复，页面刷新。
- **Cores：** 版本、发布状态、路径及 Check/Install/Reinstall/Update/Remove。Check 仅本行，Check all 只检查全部核心。Xray 可选预发布，但自动升级仅提示较新稳定版；Reinstall 可重装相同 Xray 版本。其他核心未必支持精确版本重装，OpenVPN/HAProxy 使用包管理器索引。
- **Router requirements：** 检查透明代理、策略路由、HTTPS、防火墙和缺包，Details/Install them 展示并补装。

还可安装 sing-box-lx、Aether、Mihomo、shadowsocks-rust 等。patterniha Xray 不拒绝连接公网且未使用传输安全的 VLESS/Trojan；官方 Xray 对私有地址和自带加密的 VLESS 有例外。

| 路径键 | 作用 |
|---|---|
| `core_dir` | 默认 `/usr/libexec/zirgozar`，可改 USB；不移动其他包安装的核心。 |
| `core_xray` | 空时选能接受配置的 Xray，优先已安装版本。 |
| `core_singbox`、`core_singbox_lx` | 相应核心安装/运行路径。 |
| `core_geoview`、`core_warpplus`、`core_vwarp` | Geoview、warp-plus、Vwarp 路径。 |
| `core_aether`、`core_mihomo`、`core_sslocal` | Aether、Mihomo（SSR）、sslocal（选用 shadowsocks-rust 的 SS）路径。 |

路径放 `/tmp` 可从内存运行，但每次重启需重装；先保存应用，再点安装。

### 🗺️ 4.6 Rule Manage：规则管理

| 选项 / 键 | 默认及作用 |
|---|---|
| GeoIP / Geosite URL | `geoip_url`、`geosite_url`；默认 Chocolate4U 伊朗数据，也有 lite、Loyalsoldier、MetaCubeX、runetfreedom。 |
| Location / `geo_dir` | `/etc/zirgozar/geo`；完整文件约 17 MB 和 8 MB，可改 USB 或 lite。 |
| Auto Update / `geo_update_week_mode` | Disable；日/周/Loop 更新，运行中会重启隧道载入。 |
| Time / Interval | `geo_update_time_mode=0:00`、`geo_update_interval_mode=2` 小时。 |
| GeoIP / Geosite 勾选 | `geoip_update`、`geosite_update` 默认开启，控制下载哪些文件。 |

显示大小与更新时间。Manually update 立即下载；空间不足或核心无法读取的文件不会替换现有数据。

分流规则按组展示，支持任意语言名称、添加、编辑、删除、置顶、拖动，保存应用后保留顺序。字母数字下划线名称可直接作 ID，其余自动分配 ID。字段见基本设置分流，另有 `invert`：sing-box 可反转整条规则，Xray 会跳过并记日志；`rule-set:local:` / `rule-set:remote:`（简写 `rs:`）也仅 sing-box 使用。出口在 Basic Settings 的 Shunt Rule 选择。

| 应用规则 / 键 | 默认及作用 |
|---|---|
| Iran direct / `route_ir` | 关闭；需含伊朗类别的路由数据，缺失时提示且暂不启用分流。 |
| Block advertising / `block_ads` | 关闭；使用 `category-ads-all`。 |
| Block BitTorrent / `block_torrent` | 关闭。 |
| Refuse QUIC / `block_quic` | 关闭；可让不能正常转发 UDP 的连接改用 TCP。 |
| Rebind exceptions / `rebind_domain` | 伊朗银行/服务等允许返回私有地址的域名及子域。 |
| Direct IP List / `direct_ip` | 直接绕过核心的地址。 |
| Direct domains / `direct_domain` | 域名含子域，支持 `full:`、`regexp:`、`keyword:`。 |

### 🔍 4.7 Geoview

从本页或 App Update 安装 [Geoview](https://github.com/snowie2000/geoview)。Domain/IP Query 查地址/域名属于哪些列表及相关分流；GeoIP/Geosite Query 查看 `geosite:ir`、`geoip:ir`、`geosite:google` 等列表，最多显示前 5000 行。

### 🛡️ 4.8 Access Control：访问控制

总开关 `acl_enable` 默认关闭。每行 `config acl_rule`：`enabled`、`remarks`、源接口 `interface`（默认全部）、设备 `sources`（MAC、IP、范围、网段或 `ipset:`）。`mode` 可不代理、使用当前隧道、使用独立配置；`node` 指定独立配置，hysteria2/tuic 独立规则回退到当前隧道。Proxy 页签可覆盖这些设备的 `tcp_no_redir_ports`、`udp_no_redir_ports`、`tcp_redir_ports`、`udp_redir_ports`。

### 📜 4.9 Runtime Logs：运行日志

显示应用启停、选择和失败原因，以及核心自己的 Node log；每几秒刷新，可清空。波斯语模式仅在显示时翻译已知消息，原始日志保留，未知消息原样显示。

### 🖥️ 4.10 Server-Side：服务端

路由器可供外部设备接入，访问家庭网络、使用隧道或作中继。独立服务 `/etc/init.d/zirgozar-server`、配置 `/etc/config/zirgozar_server`，保存不重启客户端隧道，客户端关闭时也可运行。

| 字段 / 键 | 作用 |
|---|---|
| Enable / `global.enable` | 服务端总开关。 |
| Protocol / `protocol` | Xray：VLESS/VMess/Trojan/Shadowsocks/SOCKS/HTTP；sing-box：Hysteria2/TUIC，需先安装。 |
| Port / Bind Local | `port` / `bind_local`；非仅本机监听时运行期间开防火墙端口。 |
| ID / Password / `uuid` | 每用户身份。 |
| Security / `security` | 无、TLS（路由器证书/密钥文件）、REALITY；Generate 生成 REALITY 密钥，无需证书域名。 |
| Transport / `transport` | RAW、WebSocket、gRPC、HTTPUpgrade、XHTTP、XDRIVE（VLESS）、mKCP。 |
| XDRIVE | `xdrive_settings`、`vless_decryption`、`vless_encryption`；分享仅含客户端 encryption。 |
| Source filters | `filter_allowed`、`filter_blocked`，IP/CIDR；拒绝优先，非空允许表排除其余来源；仅 Xray，需 26.10.21+。 |
| Outbound / `outbound` | 直连、当前隧道、SOCKS 或手动配置。 |
| Accept LAN Access / `accept_lan` | 关闭时拒绝家庭网络及路由器私有地址。 |
| Share address / `link_address` | 公网 IP/域名，空为打开页面的地址。 |

每行可显示链接和二维码，供 v2rayNG/NekoBox 等使用。外部接入需要公网可达地址或上级调制解调器端口转发。

## 🎯 5. 自动选择原理

先并行 TCP 握手（默认 30），排除不可连接项；再按初筛延迟顺序，每批 10 个发完整网页请求，找到低于阈值（默认 1 秒）的配置就停止。结果缓存，故障时尝试后续候选，而非总是从头测。Ping 常由 CDN 边缘回复，也有正常服务器不回应 ICMP，因此默认不是 Ping。选用其他预筛选或前置代理时行为按对应设置调整。

## 📝 6. 仅配置文件中的选项

| 键 | 默认及作用 |
|---|---|
| `tproxy_port` / `dns_port` / `api_port` / `bridge_port` / `redir_port` | `1082` / `1053` / `10853` / `10808` / `1085`，分别为透明代理、DNS、统计、辅助协议、REDIRECT。 |
| `sift_timeout` | 握手 2 秒。 |
| `test_timeout` | 完整请求 6 秒。 |
| `fresh_seconds` | 3600 秒内的测量复用。 |
| `https_probe` | 依赖检查下载的 GitHub 小文件。 |
| `rebind_seeded` | `1`，初始 rebind 列表已添加，不反复覆盖用户修改。 |
| `subs_scheduled` | `1`，已迁移独立订阅计划。 |

手动配置和订阅以稳定的 `n…` / `s…` ID 引用，增删排序不改变其他项引用。1.0.x 升级：`stats_flush_seconds` 改用 `stats_flush_minutes`，`ir_dns` 改 Direct DNS，`autostart` 改主开关；默认订阅仍每 15 分钟更新，其他订阅各有计划。

## 🛠️ 7. 排障

| 现象或提示 | 处理 |
|---|---|
| 没有节点列表 | 检查订阅或手动添加自己的配置，解决“先有隧道才能读取订阅”的循环。 |
| 全部无握手回应 | 更新列表，检查网络封锁。 |
| 握手成功但请求全失败 | Choose again，仍失败则更换列表。 |
| 已连接但网站打不开 | 确认状态 Connected，关闭冲突的 PassWall2，尝试 Refuse QUIC 或其他配置。 |
| 只有部分网站打不开 | 检查 DNS，优先确认 Through dnsmasq。 |
| 本地设备域名失效 | Straight into the tunnel 不保留本地解析，改 Through dnsmasq。 |
| 伊朗分流无效/数据缺失或类别不符 | Rule Manage 更新正确 GeoIP/Geosite；此前隧道可能不启用分流运行。 |
| 流量始终零 | 核心统计接口未回应，检查日志。 |
| 返回的路由文件不可读 | 可能是错误页/地址不对，旧文件保留；检查 URL。 |
| 空间不足 | 释放空间或使用 lite 数据。 |
| 下载失败/截断 | 检查网络后重试。 |
| 核心无本机架构版本 | 此核心无法在当前架构安装。 |
| 下载的核心安装失败 | 检查架构/文件损坏并重试。 |
| 缺少 unzip 或其他依赖 | App Update → Router requirements 补装；包名不兼容则手装。 |
| 无法查询 GitHub 版本 | 先建立可用网络/隧道。 |
| 没有 apk/opkg | 无法自动安装，需手动处理。 |
| 内核不支持透明代理 | 补装对应 tproxy 模块；完全没有 nftables/iptables 表示固件功能不完整。 |
| 隔离 DNS 启动/保护失败 | 不会宣布 DNS 就绪，现有保护保留；检查日志、端口冲突并重连。 |
| 订阅无法识别为节点 | 检查格式和返回内容。 |
| Xray 不支持所选协议 | hysteria2/tuic 安装 sing-box；AmneziaWG 安装 sing-box-lx。 |
| 缺少 OpenVPN / warp-plus | 安装所需客户端/核心。 |
| 辅助核心未启动、进程不监听 | 查看 Runtime Logs 或换配置。 |
| WARP 两分钟内未连接 | 账户注册或扫描失败；先经其他配置联网注册，开启扫描或换端点。 |
| 无法注册 WARP | 经其他配置连接，开 Localhost Proxy 后再 Register。 |
| 手选节点无法读取 | 选择其他配置或 Auto。 |

状态卡的提示可关闭，问题再发生时重新显示。SSH 排查：

```sh
logread -e zirgozar
cat /tmp/log/zirgozar.log
/usr/libexec/zgz-rules status
```

最后一条检查防火墙规则是否加载及计数。支持：[t.me/routekernel1](https://t.me/routekernel1)。测试范围与尚未覆盖事项见 [AUDIT.md](AUDIT.md)。

## 🗑️ 8. 卸载

```sh
/etc/init.d/zirgozar-server stop
/etc/init.d/zirgozar stop
apk del luci-app-zirgozar zirgozar
```

OpenWrt 24.10/23.05 用 `opkg remove` 代替 `apk del`。服务、核心、页面和计划任务删除，但保留设置。若也要永久删除设置、路由数据、订阅缓存和流量历史：

```sh
rm -rf /etc/config/zirgozar /etc/config/zirgozar_server /etc/zirgozar
```

不修改其他软件配置或防火墙区域；运行时规则在服务停止时移除，Kill switch 的持久策略应按前述设置处理。

## ⚖️ 9. 许可证

GNU AGPL v3 或更新版本（AGPL-3.0-or-later），全文见 [LICENSE](LICENSE)。Xray-core 由其作者按 MPL-2.0 授权。若修改后的版本通过网络供他人使用，AGPL 要求提供该版本对应源代码。

## 🙏 10. 致谢

感谢 [patterniha](https://github.com/patterniha) 的 [Xray-core](https://github.com/patterniha/Xray-core) 和 [PattN](https://github.com/patterniha/PattN)，它们使核心及链接参数兼容成为可能。默认免费公共配置为 [@Raydikalx](https://t.me/raydikalx) 维护的 **TOP 100**；伊朗路由数据来自 [Chocolate4U/Iran-v2ray-rules](https://github.com/Chocolate4U/Iran-v2ray-rules)，查询使用 [Geoview](https://github.com/snowie2000/geoview)，WARP 使用 [warp-plus](https://github.com/bepass-org/warp-plus)。本项目不运营自己的代理服务器，只测试和选择这些来源在你所在网络可用的配置。

## 💚 11. 支持项目

如需捐助，请仅使用 **USDT — BEP20（BSC）网络**：

```
0x56daaa6b76d88ee0c8dba8042121f4b77de0a813
```

> [!WARNING]
> 此地址仅接收 BEP20（BSC）上的 USDT；其他币种或通过其他网络发送的 USDT 会丢失。
