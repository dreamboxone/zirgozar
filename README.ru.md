<p align="center">
  <img alt="Zirgozar" src="package/luci-app-zirgozar/root/www/luci-static/resources/zirgozar/logo.png" width="200">
</p>

<h3 align="center">Туннель для всей сети на роутере OpenWrt</h3>

<p align="center">
  <a href="https://github.com/dreamboxone/zirgozar/releases/latest"><img alt="Версия" src="https://img.shields.io/github/v/release/dreamboxone/zirgozar?style=for-the-badge&color=0b3d91&label=release&cacheSeconds=300"></a>
  <a href="https://github.com/dreamboxone/zirgozar/releases"><img alt="Загрузки" src=".github/badges/downloads.svg"></a>
  <img alt="OpenWrt" src="https://img.shields.io/badge/OpenWrt-23.05%20%7C%2024.10%20%7C%2025.12-00B5E2?style=for-the-badge&logo=openwrt&logoColor=white">
  <a href="LICENSE"><img alt="Лицензия" src="https://img.shields.io/badge/license-AGPL--3.0-16a34a?style=for-the-badge"></a>
</p>

<p align="center">
  <a href="README.md">فارسی</a> · <a href="README.en.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ru.md">Русский</a>
</p>

<p align="center">
  <a href="https://github.com/dreamboxone/zirgozar/releases/latest">Скачать последнюю версию</a> · <a href="https://t.me/routekernel1">Поддержка в Telegram</a>
</p>

## ✨ Возможности

- Телефоны, компьютеры, телевизоры и консоли используют туннель роутера без установки отдельного клиента.
- Автоматическая проверка конфигураций, выбор рабочего соединения с низкой задержкой и переключение при сбоях. У каждой подписки своё расписание; стандартный публичный список обновляется каждые 15 минут.
- Четыре языка интерфейса: فارسی, English, 简体中文 и Русский. Переключатель находится вверху страницы.
- Поддержка тем Argon, Material, Material3, Aurora и мобильных экранов. Можно следовать теме LuCI либо отдельно выбрать светлое или тёмное оформление.
- Правила маршрутизации, настройки для отдельных устройств, цепочки прокси, SOCKS, серверная часть, Cloudflare WARP, статистика, резервные копии и обновление из интерфейса.
- Иранский трафик можно направить напрямую. С nftables и Geoview иранские IPv4-адреса обходят ядро. В режиме dnsmasq иранские домены используют отдельный прямой UDP DNS; пока служба включена, зарубежный DNS не переключается на прямое соединение.
- dnsmasq-full с nftset добавляет IPv4-адреса из ответов для иранских доменов в исключения, включая сайты на зарубежном хостинге. Записи переживают перезапуск ядра и очищаются при остановке службы. Пользовательские правила устройств и маршрутизации сохраняют приоритет; `route_ir_pre=0` оставляет разделение только внутри ядра.
- Сохранение настроек, не влияющих на туннель, не разрывает соединение. Основное ядро — [Xray](https://github.com/XTLS/Xray-core); также поддерживаются sing-box и протокольные помощники.

## 💾 1. Ресурсы перед установкой

| Ресурс | Минимум | Рекомендуется |
|---|---|---|
| Свободное место для базовой установки | около 120 MB | не менее 160 MB |
| RAM | 128 MB | 256 MB и больше |
| CPU | архитектура со сборкой Xray | два ядра и больше |

Основной пакет включает Xray и sing-box. На эталонном `arm_cortex-a7_neon-vfpv4` он занимает около 105 MB после установки, интерфейс — менее 1 MB. Наличие другого пакета `xray-core` не убирает встроенную копию; размер архива не равен установленному размеру.

Все перечисленные ядра, инструменты и полные данные маршрутизации занимают около 400 MB; для полной установки рекомендуется не менее 1 GB доступного хранилища. Замер включает Xray, Xray от patterniha, sing-box, sing-box-lx, Geoview, warp-plus, Vwarp, Aether с помощниками, Mihomo, shadowsocks-rust, OpenVPN и HAProxy. Кеш обновлений добавляет около 38 MB, полные геоданные — около 24 MB, облегчённая пара — около 2 MB. Подписки, история, новые версии и временная распаковка увеличивают расход; подойдут USB или extroot.

```sh
df -h /overlay /tmp
du -sh /usr/libexec/zirgozar /etc/zirgozar /www/luci-static/resources/zirgozar
```

Роутеры с 32/64 MB общей flash-памяти не вмещают текущий базовый пакет. Даже 128 MB общей flash не означают 120 MB свободного записываемого места. Перенос только каталога загрузки ядер на USB не переносит два ядра из начального пакета.

Работающее ядро обычно занимает 40–80 MB RAM. На маломощном роутере уменьшите **Checked at once** с 30 до 10: это снижает число параллельных рукопожатий. На эталонном устройстве с четырьмя Cortex-A7 по 717 MHz измерено 1,6 MB/s через туннель и 8,8 секунды на выбор из 98 конфигураций. Это ориентир, а не гарантия скорости.

## 📦 2. Установка

| OpenWrt | Менеджер | Нужный пакет |
|---|---|---|
| 25.12 и новее | `apk` | `zirgozar-<version>.<arch>.apk` |
| 24.10, 23.05 | `opkg` | `zirgozar_<version>_<arch>.ipk` |

Архитектура указана в `DISTRIB_ARCH` файла `/etc/openwrt_release`, пакет должен ей соответствовать. Сборки охватывают 29 архитектур ARM, ARM64, MIPS, x86, RISC-V и LoongArch, включая `arm_cortex-a7_neon-vfpv4`, `aarch64_cortex-a53`, `mipsel_24kc`, `x86_64`.

### Через LuCI

Откройте **Система → Программное обеспечение → Загрузить пакет**, установите `zirgozar`, затем нажмите **Ctrl+F5**.

### Через SSH прямо из GitHub

Выполните на роутере следующую команду. Она использует `jsonfilter`, определяет последний опубликованный релиз и устанавливает либо обновляет подходящий пакет:

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

### Установка файлов из `/tmp`

Скачайте пакет `zirgozar` для архитектуры роутера. Подключитесь к роутеру через [MobaXterm](https://mobaxterm.mobatek.net/download.html) и перенесите файл в папку `/tmp` на роутере с помощью панели передачи файлов.

Для старого OpenWrt перенесите `.ipk`. `/tmp` находится в RAM и очищается при перезагрузке; сначала проверьте `df -h /tmp`. Для установки всё равно нужно место на `/overlay` и доступ к репозиториям зависимостей.

На роутере выполните команду ниже. В `/tmp` должен находиться ровно один пакет `zirgozar` для его архитектуры:

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
> Во время установки нужен работающий интернет: штатная прошивка может не содержать `kmod-nft-tproxy`, `curl`, `ip-full` и другие зависимости. Установите приложение до того, как туннель понадобится для доступа к сети.

При проблемах откройте **App Update → Router requirements**: проверяются прозрачное проксирование, policy routing и HTTPS, недостающие пакеты можно установить кнопкой. Пакет `xray-core` других программ не заменяется.

После установки главный переключатель выключен: туннель сам не запускается.

**DNS:** требуется `dnsmasq-full`. Установщик зависимостей заменяет обычный dnsmasq с сохранением DNS/DHCP. apk делает это одной транзакцией; opkg сначала скачивает необходимые файлы и пакет для автономного отката, а при неудаче восстанавливает обычный dnsmasq. Новая установка через opkg может потребовать предварительной ручной замены; команды и откат приведены в [примере на персидском](README.md#-۲-نصب). Встроенное обновление выполняет подготовку автоматически.

**Зависимости и ошибки репозиториев.** Проверка Router requirements только показывает состояние; установка пакетов и замена DNS выполняются действием установки. L2TP, PPTP, SSTP, IKEv2 и OpenVPN могут требовать отдельные пакеты или модули ядра. В APK недоступность одного репозитория не блокирует доступные пакеты из исправных индексов, если нет устаревших индексов, ошибок подписи или сертификата. Проверки зависимостей и совместимости сохраняются. Это также относится к OpenVPN, HAProxy, xz и подготовке DNS при обновлении.

Модули должны точно соответствовать ядру и прошивке. Ошибка HTTP или `unexpected end of file` сама по себе не доказывает несовместимость: сначала проверьте адрес репозитория и соединение. Журнал установки: `/var/run/zirgozar/deps-install.log`. Если нужных модулей нет, требуется репозиторий производителя прошивки или совместимая прошивка с этими модулями. Ошибка репозитория OpenVPN/HAProxy не прерывает проверку Xray и других независимых ядер через **Check all**.

Устанавливайте один пакет `zirgozar`: приложение и интерфейс LuCI входят в него и обновляются вместе.

## 🚀 3. Первое подключение

1. Откройте **Службы → Zirgozar → Basic Settings**.
2. Начнётся проверка конфигураций; ход работы виден в карточке состояния.
3. На вкладке **Main** включите **Main switch** и нажмите **Save & Apply**.

Если конфигураций нет, добавьте собственную через **Configs → Import share links** и вернитесь к подключению. Адрес подписки может открываться только после подключения; собственная конфигурация разрывает этот замкнутый круг.

> [!WARNING]
> Сначала выключите PassWall2 на этом же роутере: два прозрачных прокси конфликтуют. При обнаружении такого перенаправления появится предупреждение.

## 🧭 4. Страницы и настройки

Разделы: Basic Settings, Configs, Node Subscribe, Other Settings, App Update, Rule Manage, Geoview, Server-Side, Access Control, Runtime Logs. Выбор языка сохраняется как `lang=en/fa/zh/ru`.

Настройки хранятся в UCI-файле `/etc/config/zirgozar`. Ниже сохранены английские названия и технические ключи для сопоставления с интерфейсом. Вопросительный знак открывает справку; щелчок снаружи или Escape закрывает её. Изменения формы действуют после **Save & Apply**; мгновенные действия отмечены рядом с кнопкой. Сообщения выводятся у соответствующего элемента, ошибки остаются до следующей попытки.

### ⚙️ 4.1 Basic Settings — основные настройки

Вверху находятся состояние, ядро, проверки и расход трафика; под переключателем языка — версия и время работы. Можно выбрать сегодня, последние 7 или 30 дней; браузер запоминает период.

**Core** показывает имя, версию и состояние процесса. Кнопки Instagram / Reddit / X выполняют один запрос через текущий маршрут роутера: меньше секунды — зелёный, меньше двух — жёлтый, больше — красный, сбой — N/A.

Карточка состояния показывает конфигурацию, протокол, задержку и маршрутизацию. IP сервера размыт; наведите указатель или коснитесь адреса. Страна выхода запрашивается через туннель при смене конфигурации и каждые 15 минут. Задержка выбранной вручную конфигурации — одно рукопожатие к её порту. **Choose again** очищает выбор и запускает измерения заново. Предупреждение можно закрыть; при повторном возникновении проблемы оно появится снова.

#### Main

| Настройка / ключ | Значение и назначение |
|---|---|
| Main switch / `enabled` | Выключено; после применения запускает/останавливает туннель, сохраняется после перезагрузки. |
| Active core / `core_engine` | Auto (`xray`): Xray, при необходимости sing-box; можно явно выбрать sing-box или sing-box-lx. OpenVPN всегда использует официальный клиент. |
| Node / `node` | Auto выбирает быстрый рабочий узел; ручной выбор не участвует в автоматическом рейтинге. После обновления подписки поиск идёт по содержимому, протоколу/адресу/порту, адресу/порту, адресу, имени; иначе берётся первая запись подписки с сообщением в журнале. |
| Preproxy / `preproxy_enabled` | Выключено. Сначала подключаться через собственную промежуточную конфигурацию; прямое предварительное рукопожатие пропускается. |
| Preproxy Node / `preproxy_node` | Промежуточная конфигурация из добавленных вручную. |
| Localhost Proxy / `localhost_proxy` | Включено; собственные загрузки, часы и менеджер пакетов роутера используют туннель. Во время измерений/чтения подписок возможен прямой путь для восстановления соединения. |
| Client Proxy / `client_proxy` | Включено для LAN; при отключении явно указанные правила Access Control всё ещё могут проксировать устройства. |
| Kill switch / `kill_switch` | Выключено: без туннеля трафик идёт напрямую. Включено: отдельные постоянные правила блокируют обход через WAN, включая остановку, сбой и раннюю загрузку. |
| Node Socks Listen Port / `node_socks_port` | `1070`; SOCKS через текущий туннель, пусто — отключён. |
| Node Socks Bind Local / `node_socks_bind_local` | Включено: доступ только с самого роутера. |
| Socks Main switch / `socks_enabled` | Выключено; включает таблицу независимых SOCKS-портов. |
| Restore defaults / `factory_reset` | После подтверждения и применения удаляет настройки, конфигурации и подписки, восстанавливает копию из `/usr/share/zirgozar`. Геоданные, скачанные ядра и история трафика сохраняются; отмены нет. |

sing-box получает преобразованные входы, правила, DNS и разделение Ирана, нативно обслуживает hysteria2/tuic. Не переносятся mux, noise, FakeDNS, mKCP и poisoned-address inbound; статистика опрашивается и может быть немного занижена. Официальный sing-box не поддерживает xhttp, [sing-box-lx](https://github.com/Leadaxe/sing-box-lx) поддерживает. Если выбранное ядро отсутствует или не принимает конфигурацию, используется Xray с уведомлением.

Kill switch использует таблицу nftables `zirgozar_ks` или цепочку iptables `ZGZ_KS`. Доступны локальная сеть, явные прямые адреса/устройства/порты и ответы на внешние входящие соединения. Иранские назначения разрешаются при включённом разделении и наличии данных, извлечённых Geoview; иначе тоже блокируются. ICMP блокируется. DNS самого роутера после остановки службы возвращается к провайдеру. Для обычного прямого доступа выключите Kill switch и примените настройки.

**Socks Config**, секция `config socks`: `enabled` — включение, `node` — конфигурация (пусто: текущий туннель), `port` — порт; новые строки предлагают свободный начиная с 1090.

#### Shunt Rule — маршрутизация

| Настройка / ключ | Значение и назначение |
|---|---|
| Domain Strategy / `domainStrategy` | Auto: IPIfNonMatch при IP-правилах/разделении Ирана, иначе AsIs. AsIs — только имя; IPIfNonMatch — DNS после отсутствия совпадения имени; IPOnDemand — DNS при встрече IP-правила. |
| Domain matcher / `domainMatcher` | `hybrid` быстрее, `linear` экономнее по памяти. |
| FakeDNS Main switch / `shunt_fakedns` | Выключено; синтетические адреса с разрешением на удалённой стороне. Самому роутеру нужен Localhost Proxy. |
| Group / `shunt_group` | `default`; применяется одна группа, таблица обновляется после сохранения. |
| Default / `default_node` | По умолчанию текущий туннель для трафика без совпадений. |
| Default FakeDNS / `default_fakedns` | Выключено; только при DNS непосредственно в туннель. |
| Default Preproxy / `default_preproxy` | Нет; промежуточный узел для выбранного вручную стандартного выхода. |

Строки `config shunt_rules` применяются по порядку, доступны добавление/редактирование/удаление/перетаскивание. `remarks` — имя; `node` — не использовать правило, стандартный выход, текущий туннель, прямое соединение, блокировка или своя конфигурация. `fakedns` — только для проксируемых правил; `preproxy` добавляет один промежуточный узел, существующая цепочка сохраняется.

Поля редактора: `group`; `protocol` — http/tls/quic/bittorrent; `inbound` — прозрачный/SOCKS (ничего не выбрано: оба); `network` — TCP/UDP; `source` — адрес, сеть, `geoip:private`; `port` — `443`, `80,443`, `1000-2000`; `domain_list` — по строке `domain:`, `full:`, `regexp:`, `keyword:`, `geosite:` или обычное ключевое слово, комментарий с `#`; `ip_list` — адрес, сеть или `geoip:`.

Правила касаются основного туннеля и SOCKS без собственной конфигурации. Они идут после блокировок, локальной сети и явных прямых доменов, но до разделения Ирана. Устройства с независимым выходом в Access Control сохраняют его.

#### DNS

| Настройка / ключ | Значение и назначение |
|---|---|
| Name lookups / `dns_mode` | Through dnsmasq: изолированный резолвер с единственным upstream через туннель, локальными/DHCP-именами без системных upstream; изменения аренды появляются примерно за 5 секунд. Straight into the tunnel теряет локальные имена; Leave alone не меняет DNS. |
| Direct DNS Protocol / `direct_dns_protocol` | Auto: upstream роутера, затем провайдер; прямые назначения и домены серверов конфигураций. |
| Direct DNS / `direct_dns` | Для UDP/TCP: `IP` или `IP:53`. Этот резолвер видит прямые запросы. |
| Direct Query Strategy / `direct_dns_query_strategy` | `UseIPv4`; семейство адресов. |
| Remote DNS Protocol / `remote_dns_protocol` | TCP; также UDP/DoH/DoT, DoQ/DoH3 требуют sing-box. Многие бесплатные конфигурации не передают UDP. |
| Remote DNS / `remote_dns` | `8.8.8.8` для TCP/UDP: часть Cloudflare Workers не достигает `1.1.1.1`, старое значение переносится однократно. |
| Remote DNS DoH / `remote_dns_doh` | `https://8.8.8.8/dns-query`; URL с доменом требует после запятой один явный bootstrap IP, без прямого DNS-разрешения конечной точки. |
| DoT / DoQ | `remote_dns_tls=1.1.1.1`, `remote_dns_tls_port=853`, `remote_dns_tls_server_name=cloudflare-dns.com`; TLS всегда проверяется, DoQ требует sing-box. |
| Client encrypted DNS policy / `encrypted_dns_policy` | `proxy`: порт 853 и известный DoH через туннель; `strict` также защищает 5353/`dns_guard_ports` и блокирует неперехваченные соединения, сохраняя разделение обычных сайтов; `rules` следует правилам. С Kill switch строгая защита сохраняется при остановке. Неизвестный DoH/неуказанные порты не гарантируются. |
| EDNS Client Subnet / `remote_dns_client_ip` | Необязательная реальная подсеть для CDN при поддержке RFC 7871, не частный адрес. |
| Remote DNS Outbound / `remote_dns_detour` | Remote: через туннель; возможно прямое подключение. |
| FakeDNS / `remote_fakedns` | Выключено, только Straight into the tunnel, чтобы не подменять собственные запросы dnsmasq. |
| Remote Query Strategy / `remote_dns_query_strategy` | `UseIPv4`. |
| Domain Override / `dns_hosts` | По строке: имя, пробел, адрес. |
| DNS Redirect / `dns_hijack` | Включено; возвращает обычные DNS-запросы устройств, обходящих роутер, в управляемый путь. |

#### Log и Maintain

`log_node` по умолчанию включает журнал ядра; `loglevel=warning`, доступны debug/info/warning/error. Графики показывают сегодня, 7 дней, календарный месяц, две недели и прямой трафик месяца. Счётчики читаются раз в 5 минут; запись во flash настраивается отдельно.

**Backup** сохраняет клиент/сервер, конфигурации, подписки, правила, учётные записи WARP/Aether и геоданные, но не бинарные ядра и историю трафика. **Restore** загружает копию; настройки другой версии могут быть несовместимы.

### 📋 4.2 Configs — конфигурации

| Настройка / ключ | Значение и назначение |
|---|---|
| Nodes to use / `sources` | Только ручные; можно выбрать все либо только подписки. Определяет кандидатов, победитель выбирается тестом. |
| Automatic detection delay / `auto_detection_time` | TCP Ping при открытии страницы; можно Ping или выключить. |
| Show server address and port / `show_node_info` | Выключено; показывает адрес и порт под именем. |
| URL Test Address / `test_url` | `http://www.gstatic.com/generate_204`, цель реального запроса через прокси. |
| First pass / `prefilter` | TCP handshake; также Ping или оба. Ответ CDN на ICMP не подтверждает работу сервера. |
| Good enough / `good_ms` | `1000` ms; остановка поиска при достаточно быстром ответе. |
| Measured at a time / `batch_size` | `10` полных проверок в группе. |
| Batches at most / `max_batches` | `5` групп при отсутствии быстрого ответа. |
| Checked at once / `sift_parallel` | `30` предварительных рукопожатий; уменьшите при малой RAM. |

**Add** создаёт запись по полям; **Import share links** импортирует по ссылке на строку; **Add file** принимает ссылку, WireGuard `.conf`, OpenVPN `.ovpn`, Xray `.json`, Clash `.yaml/.yml`. Доступны выделение, удаление выбранных, смена группы и очистка. Массовое удаление не удаляет текущий узел туннеля. При удалении очищаются ссылки на него в главных настройках, цепочках, SOCKS, ACL и маршрутизации.

Ручная запись — `config node`: `name` либо имя после `#` в ссылке, `group` (пусто: стандартная), `enabled`, `link`. **Browse** читает содержимое в форму, отдельной загрузки файла нет. `chain_proxy` выбирает промежуточный или конечный узел, `preproxy_node` — первый, `to_node` — окончательный выход. В строке доступны **Edit / Delete / To Top / Use / Copy**; Use выбирает главный узел и переподключает работающий туннель.

**Ping** — ICMP, **TCPing** — рукопожатие к порту, **URL Test** — запрос через конфигурацию. Последний проверяет фактическую работу с выбранным ядром и теми же откатами, что у туннеля. До проверки показано Test, ошибка `✕`, неприменимо `—`. Нижний список всех узлов отсортирован по измерениям; после достаточно быстрого результата полные проверки прекращаются, поэтому часть URL Test пуста. **Check all** не прерывает работающий туннель.

Редактор раскрывает поддерживаемые ссылки в поля протокола, адреса, порта, ID/пароля, flow, TLS/REALITY и транспорта. Есть SNI, ALPN, fingerprint, public key, Short ID, Spider X; ключ `pqv` для ML-DSA-65 передаётся Xray, sing-box эту проверку не выполняет. Транспорты: RAW, WebSocket, gRPC, HTTP/2, HTTPUpgrade, XHTTP Extra, mKCP Seed. Неизвестные параметры сохраняются; файлы и несколько ссылок редактируются текстом.

**From Share URL** заменяет содержимое до сохранения; **Build Share URL** формирует ссылку из текущих полей; **Generate QRCode** работает локально в браузере; **Export Config File** выгружает сохранённую Xray-конфигурацию с SOCKS `127.0.0.1:1080` и HTTP `127.0.0.1:1081`.

| Дополнительное поле / ключ | Назначение |
|---|---|
| TLS Chain Fingerprint / `tls_pin` | Совпадение SHA256-отпечатка цепочки сертификатов. |
| CertName / `cert_name` | Проверяемое имя сертификата. |
| TLS Certificate / `tls_pem` | Проверка по заданному PEM. |
| ECH / `ech` | Конфигурация ECH или домен/DNS; поле важнее параметра `ech` ссылки PattN. |
| Cipher Suites / `cipher_suites` | Список через двоеточие, читается `cs` из PattN; с unsafe меняет TLS ClientHello. |
| User-Agent / `user_agent` | Для WebSocket, HTTPUpgrade, XHTTP и gRPC. |
| FinalMask / `finalmask` | JSON узла, включая `fm` из PattN; глобальные fragment/noise добавляются, если своих нет. |
| TCP Fast Open / MPTCP | `tcp_fast_open` / `tcp_mptcp`, нужна поддержка сервера. |
| Domain DNS Resolve / `dns_resolver` | Прямой DNS для адреса сервера, например `udp://1.1.1.1`. |
| Domain Strategy / `domain_strategy` | Разрешение адреса перед подключением и семейство IP. |
| Happy Eyeballs / `happy_eyeballs` | Совместная попытка IPv4/IPv6 с выбором быстрого. |

sing-box получает ECH, cipher suites, PEM, TFO, MPTCP, Domain Strategy; проверок chain fingerprint и CertName у него нет.

#### Особенности протоколов

- **WireGuard:** читаются `PrivateKey`, `Address`, `MTU`, `Reserved`, `PublicKey`, `PresharedKey`, `Endpoint`, `PersistentKeepalive`. `AllowedIPs` и `DNS` игнорируются: ими управляет приложение.
- **OpenVPN:** требуется `openvpn-openssl`, устанавливается через Router requirements. Сохраняются директивы подключения официального клиента: статический ключ, pkcs12, прокси, повторы, MTU/mssfix/fragment. Убираются скрипты, плагины, management, системные маршруты/DNS, имя устройства и несовместимые старые/Windows-директивы; `tls-remote` преобразуется в `verify-x509-name`. Старый cipher используется как fallback; BF-CBC и подобные требуют `libopenssl-legacy`. Домены серверов разрешаются напрямую; выход через `zgzovpn` сохраняет общую маршрутизацию. Можно задать логин/пароль/пароль ключа. TAP не поддерживается; выбор только вручную.
- **L2TP/IPsec:** IPv4 или домен, порт 1701, логин/пароль, при IPsec — PSK, MTU 1400. Ссылки `l2tp://user:password@server:1701?ipsec=0#name` и `l2tp+ipsec://user:password@server:1701?psk=key#name`; спецсимволы URL-кодируются. Устройство `zgzl2tp`; Ping проверяет сервер, TCPing/URL Test идут через туннель. Обычный L2TP не шифруется; только главный туннель, без цепочек/балансировки.
- **PPTP / SSTP:** логин/пароль, порты 1723/443, MTU 1400. `pptp://user:password@server:1723?mppe=1#name`, `sstp://user:password@server:443#name`. Зависимости устанавливает Router requirements, устройства `zgzpptp`/`zgzsstp`. SSTP идёт внутри HTTPS, но сертификат сервера здесь не проверяется; шифрование PPTP слабое, MPPE включено по умолчанию. Только главный туннель.
- **IKEv2:** EAP с логином/паролем либо PSK, порт 500, MTU 1400. Сертификат EAP-сервера должен быть от публичного CA либо задан в Certificate authority; несовпадающее имя укажите в Server identity. `ikev2://user:password@server:500?id=vpn.example.com#name` или `ikev2://server:500?psk=key#name`, `ca=` содержит base64 сертификата. При подключении/тесте ставятся strongSwan EAP/OpenSSL и XFRM, открытие страницы установку не запускает. Для PureVPN: логин/пароль, Server identity `pointtoserver.com`, не PSK. Устройство `zgzikev2`, другие соединения strongSwan не затрагиваются; только главный туннель.
- **AmneziaWG:** `.conf` с `Jc/Jmin/Jmax`, `S1`–`S4`, `H1`–`H4`, `I1`–`I5` распознаётся как v2/v3. Нужен [sing-box-lx](https://github.com/Leadaxe/sing-box-lx), самостоятельно обслуживающий весь туннель; Xray и официальный sing-box не подходят. Выбор вручную.
- **Aether:** ссылки `aether://`, MASQUE, WireGuard, вложенные туннели и поддерживаемый JSON `aetherCommand`. Сначала установите ядро; подробности — в [руководстве Aether](docs/aether.md). `perf` и `api_ech` сохраняются при импорте/экспорте приложения, но импортёры PattN/PattNG их игнорируют.

#### WARP, warp-plus и Vwarp

Добавьте WARP через Add. [warp-plus](https://github.com/bepass-org/warp-plus) регистрирует аккаунт, ищет доступный адрес и предоставляет локальный SOCKS, а Xray/sing-box продолжает обрабатывать DNS, правила, ACL и статистику. Ядро устанавливается в App Update.

Формат как у Hiddify: `warp://[licence@]endpoint-or-auto?mode=…#name`.

| Поле | Параметр и назначение |
|---|---|
| Mode | `mode`: обычный WARP, WARP in WARP, Psiphon после WARP. |
| Exit country | `country`: одна из 31 страны Psiphon в warp-plus. |
| Endpoint | `IP:PORT` перед `?`, пусто — автоматически. |
| Scan | `scan`: поиск, если нет фиксированного адреса. |
| Scan: slowest answer | `rtt`: предел 1000 ms по умолчанию. |
| IP version | `ipv`: оба семейства, IPv4 или IPv6. |
| WARP+ licence | Необязательно перед `@`; одна лицензия на пять устройств. |
| DNS inside WARP | `dns`, по умолчанию `1.1.1.1`. |
| Reserved | `reserved`: три числа, пусто — значения аккаунта. |

Карточка аккаунта показывает free/WARP+ и остаток. Данные каждого узла находятся в `/etc/zirgozar/warp/<section>`, перезагрузка не создаёт новый аккаунт. **Register** использует текущий маршрут роутера: через другую работающую конфигурацию при Localhost Proxy. **New account** заменяет старый. Подключение/URL Test могут занять около минуты; служба ждёт две. Автоматический рейтинг не используется, Ping/TCPing здесь не показательны.

Обычный WARP после регистрации может быть промежуточным/конечным узлом, выходом правил, ACL, SOCKS или сервера через WireGuard в Xray. Вложенный WARP и Psiphon работают только как главный туннель. Текущий WARP-узел в правилах повторно использует существующий туннель, не открывая вторую сессию аккаунта. **Carry with warp-plus** у обычного WireGuard добавляет шум перед рукопожатием; в цепочке его всё равно обслуживает Xray.

**WARP over MASQUE** использует [Vwarp](https://github.com/voidr3aper-anon/Vwarp), `mode=masque`, HTTP/3, стандартный адрес `162.159.198.1:443`; без порта подразумевается 443. Аккаунт отдельный, Register может идти через текущий туннель. `noize`: off/minimal/light/medium/heavy/stealth/gfw/firewall; не off передаёт обработку Vwarp, для MASQUE без явного выбора medium. Более тяжёлый профиль не гарантирует лучшего соединения.

#### XDRIVE (VLESS)

Вставьте объект `xdriveSettings`: `service` — `google-drive`, `template` или `local`, задайте `remoteFolder` и `secrets`. Сохраняются вложенные template, `hrefPath/hrefMethod`, `xmux`. Для HTTP/3 включите TLS и только ALPN `h3`; нужен Xray 26.10.22+.

Нужны VLESS encryption и пустой flow. `xray vlessenc` создаёт пару: decryption на сервере, encryption на клиенте. Клиентский Mux включается автоматически, `xmux` отдельно управляет соединениями с хранилищем. JSON/ссылки сохраняют транспорт, автоматическая проверка пропускает прямой TCP-фильтр и измеряет реальный путь.

### 🔗 4.3 Node Subscribe — подписки

| Общая настройка / ключ | Значение и назначение |
|---|---|
| Keyword filter / `filter_keyword_mode` | Discard List; точный поиск подстрок в имени. Режимы: выключено, исключать, оставлять, исключать с приоритетом сохранения, сохранять с приоритетом исключения. |
| Discard / Keep List | `filter_discard_list` / `filter_keep_list`, слова для фильтра. |
| Nodes kept at most / `max_nodes` | Всего до 300 узлов из всех подписок. |
| Manual subscription All | Обновить все сейчас. |
| Delete All Subscribe Node | Очистить полученные записи, следующее обновление вернёт их. |

Каждая строка `config subscription` показывает имя, количество, остаток/срок от провайдера, время обновления или причину ошибки, URL, включение и кнопки Update/Delete Nodes. Принимаются ссылки, base64, Xray/sing-box (включая LX xhttp)/Clash JSON или YAML, hysteria2 YAML, WireGuard conf. В этом пути AmneziaWG пропускается.

| Поле редактора / ключ | Значение и назначение |
|---|---|
| Name / `name` | Уникальное имя. |
| Subscribe URL / `url` | HTTP/HTTPS. |
| Or a file / `content` | Содержимое файла через Browse, URL оставьте пустым. |
| On / `enabled` | Включено. |
| Access Method / `access_mode` | Auto — маршрут роутера; без Localhost Proxy через доступный туннель, иначе напрямую. Можно явно Direct/Proxy. |
| User-Agent / `user_agent` | `v2rayN/9.99`; провайдер может возвращать разный ответ разным клиентам. |
| Keyword filter | `filter_keyword_mode` наследует общий либо использует свои discard/keep. |
| Update Once on Boot / `boot_update` | Выключено. |
| Auto Update Mode / `update_week_mode` | Disable; варианты: 15 минут, Loop, каждый день, день недели. При Disable — кнопка либо первое чтение. |
| Update Time / `update_time_mode` | `0:00` для дневного/недельного расписания. |
| Update Interval / `update_interval_mode` | `2` часа для Loop. |
| Chain Proxy / `chain_proxy` | Выключено; промежуточный/конечный узел для совместимых Xray-конфигураций. hysteria2/tuic не добавляются в конечную цепочку. |
| Preproxy / Landing | `preproxy_node` / `to_node`. |

Кеш подписки записывается во flash только при изменении, поэтому недельный список переживает перезагрузку. Для ECH с заблокированным обычным DNS включите **ECH DNS through TLS (echOutbound)** в редакторе: запрос `h2c://1.1.1.1/dns-query` через TLS к `1.1.1.1:443`, Microsoft SNI, fromMitM для сертификата/ALPN и Chrome fingerprint. Поле ECH может содержать `cloudflare-ech.com+h2c://1.1.1.1/dns-query`, иначе берётся SNI узла. Пресет заменяет резолвер на Cloudflare; нужен недавний Xray с echSockopt/fromMitM, sing-box не подходит. По умолчанию выключен; учитывается тестом и экспортом конфигурации.

### 🧰 4.4 Other Settings — другие настройки

Главная страница не ждёт обработки подписок, варианты узлов заполняются позже; браузер запоминает период статистики.

| Расписание и здоровье / ключ | Значение и назначение |
|---|---|
| Daemon / `start_daemon` | Включён; две неудачи подряд вызывают восстановление, отдельно от подписок. |
| Health interval / `health_interval` | 3 минуты; доступны 1/2/3/5/10/15/30. |
| Replace slow config / `health_switch_slow` | Включено только для Auto: два медленных теста и подтверждение запускают поиск; замена проверяется ещё раз и должна быть быстрее минимум в 1,5 раза. Между поисками не менее 10 минут. |
| Minimum slow delay / `health_slow_ms` | 1500 ms и более чем вдвое хуже лучшего результата текущего узла; это задержка запроса, не скорость загрузки. |
| Delay Start / `start_delay` | 1 секунда после загрузки. |
| Stop / Start / Restart | `stop_week_mode/stop_time_mode`, `start_week_mode/start_time_mode`, `restart_week_mode/restart_time_mode`; Disable и 0:00. День/неделя, для restart ещё Loop. |
| Restart Interval / `restart_interval_mode` | 2 часа в Loop. |

Неделя начинается в субботу; задачи сохраняются только при включённом главном переключателе.

| Перенаправление / ключ | Значение и назначение |
|---|---|
| Не перенаправлять TCP/UDP | `tcp_no_redir_ports` / `udp_no_redir_ports`, пусто; наивысший приоритет. |
| Перенаправлять TCP/UDP | `tcp_redir_ports` / `udp_redir_ports`, все; можно обычные или только 80/443. |
| Firewall backend / `firewall_backend` | Auto, nftables либо iptables. |
| TCP Proxy Way / `tcp_proxy_way` | REDIRECT либо TPROXY; UDP всегда TPROXY. |
| Hijacking ICMP / `accept_icmp` | Выключено; при включении роутер отвечает вместо недоступного через туннель ICMP. |
| IPv6 / `ipv6` | Запрет во время соединения для перехода устройств на проксируемый IPv4. |
| Interfaces to tunnel / `lan_zone` | Все LAN либо выбранные интерфейсы. |

| Xray / ключ | Значение и назначение |
|---|---|
| Fragment / `fragment` | Выключено, разделение TCP. |
| Fragment Packets / `fragment_packets` | `tlshello` или начальные записи вроде `1-3`. |
| Fragment Length / `fragment_lengths` | `3-5,6-8,10-20` байт. |
| Fragment Delay / `fragment_delays` | `10-20` ms. |
| Max Split / `fragment_maxSplit` | `3-6`. |
| Noise / `noise` | Выключено; UDP-шум для mKCP и xhttp/HTTP3. |
| Mux / `mux` | Выключено; не применяется к VLESS flow, xhttp, WireGuard. |
| Mux / XUDP concurrency | `mux_concurrency=8`, `xudp_concurrency=16`. |
| Override destination / `sniffing_override_dest` | Выключено: найденное имя только для маршрутизации; включено — заменяет назначение. |
| Excluded Domains / `excluded_domains` | Apple push, Xiaomi, WeChat и другие исключения из замены назначения. |
| Buffer Size / `buffer_size` | kB на соединение, пусто — выбор ядра. |

Таблица `config xray_noise_packets`: `enabled`, `type` (rand/str/hex/base64/array), `packet` (данные либо длина/диапазон случайных), `delay` (пауза в ms/диапазон).

**Load Balancing:** установите HAProxy через Cores, включите балансировку, задайте серверы, локальный порт, алгоритм и интервал проверок. Конфигурация направляется на `127.0.0.1:порт_группы`; неработающие серверы исключаются. Консоль состояния имеет отдельные порт/логин/пароль.

**Traffic history:** `stats_flush_minutes=5` — период записи во flash; незаписанное теряется при отключении питания. Forget all recorded traffic обнуляет историю. **Set router clock** устанавливает иранское время; неверные часы мешают TLS.

**LED color:** по умолчанию выключено, нужны три согласованных независимо регулируемых RGB-канала. Проверка URL каждые 15 секунд: <200 ms зелёный, 200–299 жёлтый, 300–499 оранжевый, ≥500 красный; сбой/отключение гасит индикатор. Три границы редактируются, постоянный свет/мигание зависит от оборудования. Отключение возвращает настройки OpenWrt.

### ⬆️ 4.5 App Update — обновления

Обновление переиспользует неизменившиеся диапазоны старых пакетов, затем проверяет точный полный пакет по `SHA256SUMS` и устанавливает через apk/opkg. Первое скачивание полное. Кеш `/usr/libexec/zirgozar/.update-cache` содержит по одному пакету компонента до 64 MB, оставляя минимум 8 MB свободными. При отсутствии кеша, несовместимости, малой выгоде или ошибке Range выполняется полная загрузка. Удаление кеша лишь отключает повторное использование. Открытие страницы может обновить сведения о версии; скачивание пакетов требует действия установки/обновления.

- **App Update:** версия, проверка, скачивание и установка с сохранением настроек; ранее работающий туннель восстанавливается, страница обновляется.
- **Cores:** версия, статус релиза, путь и Check/Install/Reinstall/Update/Remove. Check работает только со строкой, Check all — со всеми ядрами, но не с приложением. Xray предлагает предварительные версии, однако автоматическое предложение — только новая стабильная. Reinstall повторяет установленную Xray-версию; для других ядер точная переустановка реализована не всегда. OpenVPN/HAProxy используют индекс менеджера пакетов.
- **Router requirements:** Details проверяет прозрачный прокси, policy routing, HTTPS, firewall и зависимости; Install them устанавливает недостающее.

Также доступны sing-box-lx, Aether, Mihomo, shadowsocks-rust. Сборка patterniha не отклоняет VLESS/Trojan к публичным адресам без защиты транспорта; официальный Xray делает исключение для частных адресов и VLESS с собственной encryption.

| Ключ пути | Назначение |
|---|---|
| `core_dir` | `/usr/libexec/zirgozar`, можно USB; ядра других пакетов не перемещаются. |
| `core_xray` | Пусто: совместимый с конфигурацией Xray с приоритетом уже установленного. |
| `core_singbox`, `core_singbox_lx` | Пути установки/запуска соответствующих ядер. |
| `core_geoview`, `core_warpplus`, `core_vwarp` | Пути Geoview, warp-plus, Vwarp. |
| `core_aether`, `core_mihomo`, `core_sslocal` | Aether, Mihomo для SSR, sslocal для выбранных SS-конфигураций. |

Для запуска из RAM укажите путь в `/tmp`, сохраните и установите; после каждой перезагрузки потребуется новая установка.

### 🗺️ 4.6 Rule Manage — правила

| Настройка / ключ | Значение и назначение |
|---|---|
| GeoIP / Geosite URL | `geoip_url`, `geosite_url`; Chocolate4U (IR), также lite, Loyalsoldier, MetaCubeX, runetfreedom. |
| Location / `geo_dir` | `/etc/zirgozar/geo`; полные файлы около 17 MB и 8 MB, можно USB/lite. |
| Auto Update / `geo_update_week_mode` | Disable; день/неделя/Loop. После загрузки работающий туннель перезапускается. |
| Time / Interval | `geo_update_time_mode=0:00`, `geo_update_interval_mode=2` часа. |
| GeoIP / Geosite | `geoip_update`, `geosite_update` включены; какие файлы обновлять. |

Показаны размер и время обновления. Manually update загружает выбранные файлы; при нехватке места или нечитаемых данных старые не заменяются.

Правила распределены по группам, можно добавлять имя на любом языке, редактировать, удалять, поднимать и перетаскивать. Порядок сохраняется после применения. Имя из букв/цифр/`_` может быть ID, иначе ID выделяется отдельно. Поля описаны в Shunt Rule; дополнительно `invert` переворачивает всё условие только в sing-box, Xray пропускает его с записью в журнале. `rule-set:local:` / `rule-set:remote:` (`rs:`) также только для sing-box. Выход выбирается в Basic Settings → Shunt Rule.

| Правило приложения / ключ | Значение и назначение |
|---|---|
| Iran direct / `route_ir` | Выключено; нужны геоданные с иранскими категориями, иначе предупреждение и работа без разделения. |
| Block advertising / `block_ads` | Выключено, список `category-ads-all`. |
| Block BitTorrent / `block_torrent` | Выключено. |
| Refuse QUIC / `block_quic` | Выключено; помогает перейти на TCP при проблемном UDP. |
| Rebind exceptions / `rebind_domain` | Иранские банки/службы и другие разрешённые имена с частными адресами, включая поддомены. |
| Direct IP List / `direct_ip` | Прямые адреса в обход ядра. |
| Direct domains / `direct_domain` | Имя с поддоменами, также `full:`, `regexp:`, `keyword:`. |

### 🔍 4.7 Geoview

Установите [Geoview](https://github.com/snowie2000/geoview) на этой странице или в App Update. Domain/IP Query находит списки и связанные правила для имени/адреса. GeoIP/Geosite Query показывает `geosite:ir`, `geoip:ir`, `geosite:google` и другие списки, максимум первые 5000 строк.

### 🛡️ 4.8 Access Control — доступ устройств

`acl_enable` по умолчанию выключен. Строка `config acl_rule`: `enabled`, `remarks`, исходный `interface` (все), `sources` (MAC, IP, диапазон, сеть, `ipset:`). `mode` — без прокси, через текущий туннель или отдельную конфигурацию; `node` задаёт её. Отдельные правила hysteria2/tuic используют текущий туннель. На вкладке Proxy переопределяются `tcp_no_redir_ports`, `udp_no_redir_ports`, `tcp_redir_ports`, `udp_redir_ports` для этих устройств.

### 📜 4.9 Runtime Logs — журналы

Журнал приложения показывает этапы запуска/остановки, выбор и причины ошибок; ниже Node log ядра. Обновляются каждые несколько секунд, есть очистка. В персидском интерфейсе известные сообщения переводятся только при отображении; исходные записи сохраняются, неизвестные остаются без изменения.

### 🖥️ 4.10 Server-Side — сервер

Позволяет внешним устройствам подключаться к домашней сети или использовать роутер как прокси/ретранслятор. Независимые служба `/etc/init.d/zirgozar-server` и настройки `/etc/config/zirgozar_server`; сохранение не перезапускает клиентский туннель, сервер работает и без него.

| Поле / ключ | Назначение |
|---|---|
| Enable / `global.enable` | Общий переключатель. |
| Protocol / `protocol` | Xray: VLESS/VMess/Trojan/Shadowsocks/SOCKS/HTTP; sing-box: Hysteria2/TUIC, его нужно установить. |
| Port / Bind Local | `port` / `bind_local`; при внешнем прослушивании firewall открывается на время работы. |
| ID / Password / `uuid` | Учётные данные пользователя. |
| Security / `security` | None, TLS с файлами сертификата/ключа на роутере, REALITY; Generate создаёт пару REALITY без домена и сертификата. |
| Transport / `transport` | RAW, WebSocket, gRPC, HTTPUpgrade, XHTTP, XDRIVE (VLESS), mKCP. |
| XDRIVE | `xdrive_settings`, `vless_decryption`, `vless_encryption`; в ссылку попадает только клиентский encryption. |
| Source filters | `filter_allowed`, `filter_blocked`: IP/CIDR, запрет приоритетнее, непустой allowlist отвергает остальных. Только Xray 26.10.21+. |
| Outbound / `outbound` | Напрямую, текущий туннель, SOCKS или ручной узел. |
| Accept LAN Access / `accept_lan` | Выключено: частные адреса роутера и домашней сети запрещены. |
| Share address / `link_address` | Публичный IP/домен, пусто — адрес открытой страницы. |

Кнопка Share link показывает ссылку/QR для v2rayNG, NekoBox и подобных клиентов. Для доступа извне нужен публично достижимый адрес или проброс порта на вышестоящем модеме.

## 🎯 5. Как работает автоматический выбор

Сначала параллельные TCP-рукопожатия (обычно 30) отсеивают недоступное. Затем по результатам предварительной задержки идут полные веб-запросы группами по 10; первый быстрее порога (обычно 1 секунда) завершает поиск. Результаты кешируются, при отказе можно взять следующего кандидата. ICMP часто отвечает с CDN либо блокируется рабочим сервером, поэтому Ping не выбран по умолчанию. Другие варианты предварительной проверки и preproxy меняют поведение согласно настройкам.

## 📝 6. Только в файле конфигурации

| Ключ | Значение и назначение |
|---|---|
| `tproxy_port` / `dns_port` / `api_port` / `bridge_port` / `redir_port` | `1082` / `1053` / `10853` / `10808` / `1085`: прозрачный прокси, DNS, статистика, помощник протокола, REDIRECT. |
| `sift_timeout` | 2 секунды на рукопожатие. |
| `test_timeout` | 6 секунд на полный запрос. |
| `fresh_seconds` | Повторно использовать измерение моложе 3600 секунд. |
| `https_probe` | Небольшой файл GitHub для проверки HTTPS. |
| `rebind_seeded` | `1`: исходные исключения добавлены один раз и не восстанавливаются поверх изменений. |
| `subs_scheduled` | `1`: подписки переведены на независимые расписания. |

Ручные узлы и подписки имеют стабильные ID `n…` / `s…`, поэтому перестановка/удаление не меняет другие ссылки. Для обновления с 1.0.x: вместо `stats_flush_seconds` используйте `stats_flush_minutes`, `ir_dns` заменён Direct DNS, `autostart` — главным переключателем. Стандартная подписка сохраняет 15-минутное обновление, остальные — своё расписание.

## 🛠️ 7. Устранение неполадок

| Ситуация / сообщение | Действие |
|---|---|
| Нет списка узлов | Проверьте подписку или добавьте свою конфигурацию, чтобы сначала получить доступ к подписке через туннель. |
| Никто не отвечает на рукопожатие | Обновите список, проверьте блокировку сети. |
| Рукопожатия есть, все запросы неудачны | Choose again, затем другой список. |
| Соединено, но сайт не открывается | Убедитесь в Connected, выключите PassWall2, попробуйте Refuse QUIC или другой узел. |
| Не открывается часть сайтов | Проверьте DNS и режим Through dnsmasq. |
| Не разрешаются локальные имена | Straight into the tunnel их не сохраняет, используйте Through dnsmasq. |
| Нет разделения Ирана / не те категории | Обновите GeoIP/Geosite в Rule Manage; до этого возможна работа без разделения. |
| Статистика всегда нулевая | Не отвечает API статистики ядра, смотрите журнал. |
| Файл геоданных нечитаем | Проверьте URL: могла прийти страница ошибки; старый файл сохранён. |
| Недостаточно места | Освободите место или выберите lite. |
| Загрузка не удалась/оборвана | Проверьте сеть и повторите. |
| Нет сборки ядра для CPU | Это ядро нельзя установить на данной архитектуре. |
| Скачанное ядро не установилось | Проверьте архитектуру/повреждение и повторите. |
| Нет unzip/зависимостей | Router requirements; при несовпадении имён пакетов — вручную. |
| GitHub недоступен для проверки версии | Сначала установите рабочее соединение. |
| Нет apk/opkg | Автоматическая установка невозможна, устанавливайте вручную. |
| Нет transparent proxy в ядре ОС | Установите tproxy; отсутствие nftables и iptables означает неполную прошивку. |
| Сбой изолированного DNS/защиты | Готовность не объявляется, защита сохраняется; журнал, конфликт портов, переподключение. |
| В подписке не распознаны узлы | Проверьте формат и содержимое ответа. |
| Xray не поддерживает узел | sing-box для hysteria2/tuic, sing-box-lx для AmneziaWG. |
| Нет OpenVPN / warp-plus | Установите соответствующий клиент/ядро. |
| Помощник не стартовал / процесс не слушает | Runtime Logs либо другой узел. |
| WARP не подключился за две минуты | Регистрация/поиск неудачны; подключитесь иначе и зарегистрируйте аккаунт, включите сканирование или смените endpoint. |
| Регистрация WARP недоступна | Другая конфигурация, Localhost Proxy, затем Register. |
| Выбранный узел нечитаем | Другой узел либо Auto. |

Предупреждение состояния можно закрыть, при повторении проблемы оно вернётся. Для диагностики по SSH:

```sh
logread -e zirgozar
cat /tmp/log/zirgozar.log
/usr/libexec/zgz-rules status
```

Последняя команда показывает загрузку правил firewall и счётчики. Поддержка: [t.me/routekernel1](https://t.me/routekernel1). Подробности проверок и непокрытых случаев: [AUDIT.md](AUDIT.md).

## 🗑️ 8. Удаление

```sh
/etc/init.d/zirgozar-server stop
/etc/init.d/zirgozar stop
apk del luci-app-zirgozar 2>/dev/null || true
apk del zirgozar
```

В OpenWrt 24.10/23.05 замените `apk del` на `opkg remove`. Служба, ядро, страницы и расписание удаляются, настройки сохраняются. Для необратимого удаления настроек, геоданных, кеша подписок и истории:

```sh
rm -rf /etc/config/zirgozar /etc/config/zirgozar_server /etc/zirgozar
```

Настройки других пакетов и firewall-зоны не меняются. Рабочие правила снимаются при остановке; постоянная политика Kill switch управляется описанной выше настройкой.

## ⚖️ 9. Лицензия

GNU AGPL v3 или новее (AGPL-3.0-or-later), полный текст в [LICENSE](LICENSE). Xray-core лицензируется его авторами под MPL-2.0. При сетевом использовании изменённой версии другими людьми AGPL требует предложить исходный код этой версии.

## 🙏 10. Благодарности

Спасибо [patterniha](https://github.com/patterniha) за [Xray-core](https://github.com/patterniha/Xray-core) и [PattN](https://github.com/patterniha/PattN), благодаря которым поддерживаются ядро и параметры ссылок. Стандартный бесплатный публичный список **TOP 100** поддерживается [@Raydikalx](https://t.me/raydikalx). Иранские данные — [Chocolate4U/Iran-v2ray-rules](https://github.com/Chocolate4U/Iran-v2ray-rules), просмотр — [Geoview](https://github.com/snowie2000/geoview), WARP — [warp-plus](https://github.com/bepass-org/warp-plus). Проект не содержит собственных прокси-серверов: он измеряет доступность этих источников и выбирает рабочие для вашей сети.

## 💚 11. Поддержать проект

Пожертвование: **USDT — только сеть BEP20 (BSC)**.

```
0x56daaa6b76d88ee0c8dba8042121f4b77de0a813
```

> [!WARNING]
> Адрес предназначен только для USDT в сети BEP20 (BSC). Другая валюта или USDT в другой сети будут потеряны.
