/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * The Persian interface.
 *
 * LuCI translates through .lmo catalogues built by po2lmo, which is part of
 * the OpenWrt build system - and this package is built by three shell scripts
 * that do not have it. So the translation lives here instead: a dictionary and
 * a lookup, and each view shadows the global _() with this one for its own
 * strings only. Nothing else on the page is affected, and a string that is not
 * in the dictionary comes back exactly as it was written, in English.
 *
 * Keys are the English source strings, so adding a string to a view without
 * translating it is not an error - it is simply not translated yet.
 *
 * Two things this file has to get right beyond the words.
 *
 * The direction. A Persian sentence in a left-to-right box is not merely
 * right-aligned wrongly: the parts of it move. "این قسمت برای تنظیمات QUIC
 * می‌باشد" came out as "می‌باشد QUIC این قسمت برای تنظیمات", because the
 * browser lays out a right-to-left run inside a left-to-right paragraph by
 * putting the whole run where the paragraph wants it and only then reversing
 * the letters inside. The Latin word in the middle splits the sentence into
 * two runs, and the two runs then appear in the wrong order. Nothing about
 * the text is wrong; the box it is in is. page() below is that box, and it
 * has to wrap everything a view returns, not only the parts that look
 * obviously textual.
 *
 * And the technical words. handshake, ping, node, tunnel, QUIC: these are not
 * translated, they are written in Persian letters - هندشیک, پینگ, نود, تونل.
 * A reader looking for the thing they read about in a Telegram channel needs
 * to recognise the word, and a Persian coinage for it is a word they have
 * never seen and will not search for.
 */

'use strict';
'require baseclass';

var LANG = 'en';

var FA = {
	'Usage (GB)': 'میزان مصرف (GB)',
	'N/A': 'ندارد',
	'Connection checks': 'بررسی اتصال',
	'Instagram': 'اینستاگرام',
	'Reddit': 'ردیت',
	'Upload': 'آپلود',
	'Total': 'مجموع',
	'Period': 'بازه',
	'Last 30 days': '۳۰ روز اخیر',
	'Use an HTTPS URL. A hostname requires one literal bootstrap IP after a comma; no direct DNS lookup is performed.': 'نشانی HTTPS وارد کنید. برای نام دامنه، یک IP اولیه بعد از ویرگول الزامی است؛ درخواست DNS مستقیم ارسال نمی‌شود.',
	'A DoH endpoint is required.': 'نشانی سرور DoH الزامی است.',
	'Invalid HTTPS endpoint.': 'نشانی HTTPS معتبر نیست.',
	'Enter one literal bootstrap IP.': 'یک IP اولیهٔ معتبر وارد کنید.',
	'A hostname requires a bootstrap IP after a comma.': 'برای نام دامنه، IP اولیه را بعد از ویرگول وارد کنید.',
	'DoT server IP': 'IP سرور DoT',
	'DoT server port': 'پورت سرور DoT',
	'DoT certificate name': 'نام گواهی سرور DoT',
	'The certificate must match this name. TLS verification is always enabled; the selected DNS outbound is respected.': 'دامنه وارد شده باید با دامنه معتبر در گواهی سرور DoT مطابقت داشته باشد. بررسی گواهی TLS همیشه فعال است و مسیر خروج انتخاب شده برای DNS رعایت می شود.',
	'Additional protected DNS ports': 'پورت‌های DNS افزوده برای حفاظت',
	'Strict mode always protects 853 and 5353. Add other DNS ports here. Port 443 follows website routing and cannot be added. Other services on these ports will also use the tunnel.': 'در حالت سخت‌گیرانه، پورت‌های ۸۵۳ و ۵۳۵۳ همیشه محافظت می‌شوند. پورت‌های دیگر DNS را اینجا اضافه کنید. پورت ۴۴۳ تابع مسیریابی سایت‌هاست و نمی‌توان آن را افزود. سرویس‌های دیگر روی این پورت‌ها هم از تونل عبور می‌کنند.',
	'Port 443 follows website routing and cannot be a protected DNS port.': 'پورت ۴۴۳ تابع مسیریابی سایت‌هاست و نمی‌توان آن را به پورت‌های DNS افزود.',
	'Client encrypted DNS policy': 'نحوه عبور DNS رمزگذاری شده دستگاه ها',
	'Known services tunnels port 853 and known DoH destinations. Strict mode also tunnels TCP/UDP 5353 and additional protected DNS ports, while the Iran traffic split still controls ordinary websites. LAN and local mDNS remain available. With the Kill switch enabled, DNS protection stays active when the tunnel stops. Unknown DoH destinations and unlisted custom ports are not guaranteed.': 'حالت شناخته‌شده، پورت ۸۵۳ و مقصدهای شناخته‌شده DoH را از تونل می‌فرستد. حالت سخت‌گیرانه پورت ۵۳۵۳ و پورت‌های DNS افزوده را هم محافظت می‌کند؛ مسیر سایت‌های عادی همچنان تابع گزینه تفکیک ایران است. LAN و mDNS محلی حفظ می‌شوند. با قطع اضطراری روشن، محافظ DNS هنگام توقف تونل باقی می‌ماند. مقصدهای ناشناخته DoH و پورت‌های سفارشی ثبت‌نشده تضمین نمی‌شوند.',
	'Tunnel known services': 'سرویس‌های شناخته‌شده از تونل',
	'Strict DNS protection (preserve Iran split)': 'محافظت سخت‌گیرانه DNS با حفظ تفکیک ایران',
	'Follow traffic rules': 'پیروی از قوانین ترافیک',

	'Psiphon server list file': 'فایل فهرست آغازین سایفون',
	'Plain server entries file under /etc/zirgozar. Empty uses the core’s saved servers and discovery.': 'فایل متنی سرورهای سایفون در /etc/zirgozar؛ اگر خالی باشد، سرورهای ذخیره‌شده و کشف خودکار هسته استفاده می‌شوند.',
	'Clear Psiphon data': 'پاک‌کردن داده‌های سایفون',
	'Psiphon data cleared.': 'داده‌های سایفون پاک شد.',
	'Could not clear Psiphon data.': 'پاک‌کردن داده‌های سایفون موفق نبود.',
	'Exit-node FinalMask JSON': 'FinalMask مسیر ورودی، به شکل JSON',
	'Applied to the direct entry of Aether. When an exit node is selected, edit that node’s own settings.': 'روی ورودی مستقیم اتر اعمال می‌شود؛ اگر نودی برای این مسیر انتخاب کرده‌اید، تنظیمات همان نود را ویرایش کنید.',
	'Expected a JSON object.': 'یک شی JSON معتبر وارد کنید.',
	'Exit-node dialMode': 'dialMode مسیر ورودی',
	'Requires an Xray build supporting dialMode. Leave empty for the default.': 'به هسته Xray دارای پشتیبانی dialMode نیاز دارد؛ برای حالت پیش‌فرض خالی بگذارید.',
	'Fingerprint': 'فینگرپرینت',
	'Aether App Path': 'مسیر برنامه اتر',
	'Aether carries aether:// configs, including WireGuard-over-MASQUE and Tor/Psiphon. Install it above.': 'اتر کانفیگ‌های aether://، از جمله WireGuard روی MASQUE و تور/سایفون را اجرا می‌کند. از بخش بالا نصبش کنید.',
	'Aether protocol': 'پروتکل اتر',
	'Aether did not connect within two minutes. Check its exit-node and the Runtime Logs page.': 'اتر در دو دقیقه وصل نشد. نود خروجی آن و صفحه گزارش‌ها را بررسی کنید.',
	'No Aether config is selected.': 'هیچ کانفیگ اتر انتخاب نشده است.',
	'An Aether config needs Aether. Install it on the App Update page.': 'برای اجرای کانفیگ اتر، برنامه اتر را از صفحه به‌روزرسانی نصب کنید.',
	'Aether cannot run on this router.': 'اتر روی این روتر قابل اجرا نیست.',
	'Aether 2.3.0 or later is required for WireGuard-over-MASQUE.': 'برای وایرگارد روی MASQUE، اتر نسخه ۲.۳.۰ یا جدیدتر لازم است.',
	'This Aether build does not support exit-node chaining.': 'این نسخه اتر از زنجیره کردن نود خروجی پشتیبانی نمی‌کند.',
	'Invalid Aether account identifier.': 'شناسه اکانت اتر معتبر نیست.',
	'Invalid Aether SOCKS port.': 'پورت ساکس اتر معتبر نیست.',
	'Aether and its exit-node need different SOCKS ports.': 'پورت ساکس اتر و نود خروجی آن باید متفاوت باشند.',
	'Aether auxiliary and exit-node SOCKS ports must be different.': 'پورت کمکی اتر باید با پورت‌های ساکس اتر و نود خروجی متفاوت باشد.',
	'Unsupported Aether protocol.': 'این پروتکل اتر پشتیبانی نمی‌شود.',
	'Invalid Aether scan mode.': 'روش اسکن اتر معتبر نیست.',
	'Invalid Aether IP version.': 'نسخه IP اتر معتبر نیست.',
	'Invalid Aether transport.': 'روش انتقال اتر معتبر نیست.',
	'The selected Aether exit-node is missing or unsupported.': 'نود خروجی انتخاب‌شده برای اتر موجود نیست یا پشتیبانی نمی‌شود.',
	'Invalid Aether Tor mode.': 'حالت تور در اتر معتبر نیست.',
	'Invalid Aether Psiphon mode.': 'حالت سایفون در اتر معتبر نیست.',
	'Choose Tor or Psiphon for one Aether config.': 'برای هر کانفیگ اتر یکی از تور یا سایفون را انتخاب کنید.',
	'Tor/Psiphon reverse mode requires MASQUE over HTTP/2.': 'حالت معکوس تور یا سایفون به MASQUE روی HTTP/2 نیاز دارد.',
	'The installed Aether does not support %s.': 'اتر نصب‌شده از گزینه %s پشتیبانی نمی‌کند.',
	'Invalid Aether TLS fingerprint.': 'فینگرپرینت TLS اتر معتبر نیست.',
	'Invalid Aether fragmentation setting.': 'تنظیم فرگمنت اتر معتبر نیست.',
	'The Aether config needs its Tor bridge lines.': 'خطوط پل تور را در کانفیگ اتر وارد کنید.',
	'Invalid Aether Tor bridge mode.': 'حالت پل تور در اتر معتبر نیست.',
	'Invalid Aether Tor relay mode.': 'حالت رله تور در اتر معتبر نیست.',
	'This Aether build cannot disable its bundled Psiphon list.': 'این نسخه اتر امکان غیرفعال کردن فهرست همراه سایفون را ندارد.',
	'Usage: zgz-aether check|run': 'روش اجرای فرمان: zgz-aether check|run',
	'The Aether exit-node is missing or cannot be used by Xray. Choose a usable exit-node on its config page.': 'نود خروجی اتر موجود نیست یا با ایکس‌ری قابل اجرا نیست. در صفحه کانفیگ اتر یک نود خروجی قابل اجرا انتخاب کنید.',
	'Aether has no supported build for %s.': 'برای معماری %s نسخه قابل اجرای اتر منتشر نشده است.',
	'The Aether download failed its checksum check.': 'چک‌سام فایل دانلودشده اتر معتبر نیست.',
	'The downloaded Aether cannot run on this router.': 'فایل اتر دانلودشده روی این روتر قابل اجرا نیست.',
	'This Aether build lacks WireGuard-over-MASQUE.': 'این نسخه اتر از وایرگارد روی MASQUE پشتیبانی نمی‌کند.',
	'MASQUE transport': 'انتقال MASQUE',
	'Scan mode': 'روش اسکن',
	'Outer endpoint': 'آدرس لایه بیرونی',
	'Inner endpoint': 'آدرس لایه داخلی',
	'Tor mode': 'حالت تور',
	'Psiphon mode': 'حالت سایفون',
	'Obfuscation profile': 'روش مبهم‌سازی',
	'Exit node': 'نود خروجی',
	'The selected config carries Aether: selected-node → WARP / Psiphon / Tor.': 'اتصال اتر از کانفیگ انتخاب‌شده عبور می‌کند: کانفیگ انتخاب‌شده ← وارپ / سایفون / تور.',
	'Advanced Aether options': 'تنظیمات پیشرفته اتر',
	'Aether endpoint': 'آدرس اتر',
	'Aether DNS': 'DNS اتر',
	'The downloaded Aether lacks configurable MASQUE SNI. The installed core was kept.': 'نسخه دانلودشده اتر امکان تنظیم SNI مربوط به MASQUE را ندارد. هسته نصب‌شده حفظ شد.',
	'Usage: zgz-aether check|prepare|run': 'دستور اتر باید با گزینه بررسی، آماده‌سازی یا اجرا فراخوانی شود.',
	'Aether did not connect within four minutes. Check its endpoint and the Runtime Logs page.': 'اتر در چهار دقیقه متصل نشد. آدرس مقصد و صفحه گزارش‌ها را بررسی کنید.',
	'WARP account API address': 'آدرس API ساخت حساب وارپ',
	'WARP account ECH': 'ECH ساخت حساب وارپ',
	'WARP account ECH resolver': 'DNS دریافت ECH برای ساخت حساب وارپ',
	'Used only to create WARP keys; it does not enable ECH on the tunnel.': 'فقط برای ساخت کلیدهای وارپ استفاده می‌شود و ECH تونل را فعال نمی‌کند.',
	'Leave empty to scan automatically. A fixed endpoint disables automatic endpoint selection.': 'برای اسکن خودکار خالی بگذارید. با وارد کردن آدرس ثابت، انتخاب خودکار مقصد غیرفعال می‌شود.',
	'Invalid Aether account ECH setting.': 'تنظیم ECH ساخت حساب اتر معتبر نیست.',
	'Aether could not create its WARP account. On the Configs page, edit this config, turn on Advanced Aether options and change the WARP account API address or WARP account ECH. Runtime Logs has the details.': 'ساخت حساب وارپ اتر انجام نشد. در صفحه «کانفیگ‌ها» این کانفیگ را ویرایش کنید، «تنظیمات پیشرفته اتر» را روشن کنید و «آدرس API ساخت حساب وارپ» یا «ECH ساخت حساب وارپ» را تغییر دهید. جزئیات در «گزارش‌ها» است.',
	'Exit countries': 'کشورهای خروجی',
	'Germany': 'آلمان',
	'Sweden': 'سوید',
	'Finland': 'فنلاند',
	'Netherlands': 'هلند',
	'France': 'فرانسه',
	'United Kingdom': 'بریتانیا',
	'United States': 'آمریکا',
	'Canada': 'کانادا',
	'Turkey': 'ترکیه',
	'Japan': 'ژاپن',
	'Singapore': 'سنگاپور',
	'Only Germany and Sweden': 'فقط آلمان و سوید',
	'Exclude Iran, Azerbaijan and Russia': 'به جز ایران، آذربایجان و روسیه',
	'Exit country filter, not a country changer. Empty accepts any country. DE,SE accepts only Germany or Sweden; !IR,AZ,RU rejects these countries. You can enter comma-separated two-letter country codes. If no allowed exit is found, the tunnel will not connect.': 'این گزینه کشور خروجی را فیلتر می‌کند و کشور را تغییر نمی‌دهد. خالی یعنی همه کشورها مجاز هستند. DE,SE فقط آلمان یا سوید را قبول می‌کند؛ !IR,AZ,RU این کشورها را رد می‌کند. می‌توانید کدهای دو حرفی کشورها را با ویرگول انگلیسی جدا کنید. اگر خروجی مجاز پیدا نشود، تونل وصل نمی‌شود.',
	'Use uppercase two-letter country codes separated by commas, optionally starting with !.': 'کدهای دو حرفی کشورها را با حروف بزرگ و ویرگول انگلیسی وارد کنید. برای رد کردن کشورها، ابتدا ! بگذارید.',
	'Requests a Psiphon exit country. Empty selects automatically. You can enter another uppercase two-letter country code; availability depends on Psiphon servers.': 'کشور خروجی سایفون را درخواست می‌کند. خالی یعنی انتخاب خودکار. کد دو حرفی کشور دیگری را هم می‌توانید با حروف بزرگ وارد کنید؛ دسترسی به آن به سرورهای سایفون بستگی دارد.',
	'Use one uppercase two-letter country code, such as DE.': 'یک کد دو حرفی کشور با حروف بزرگ وارد کنید؛ مثلا DE.',
	'TLS fragmentation': 'فرگمنت TLS',
	'Fragment size': 'اندازه فرگمنت',
	'Fragment delay': 'تاخیر فرگمنت',
	'ECH resolver': 'DNS مربوط به ECH',
	'ECH domain': 'دامنه ECH',
	'Tor bridges': 'پل‌های تور',
	'Tor bridge lines': 'خطوط پل تور',
	'Tor relay source': 'منبع رله تور',
	'Psiphon connection mode': 'روش اتصال سایفون',
	'Psiphon bundled servers': 'سرورهای همراه سایفون',
	'CDN addresses': 'آدرس‌های CDN',
	'CDN server names': 'نام سرورهای CDN',
	'CDN sets': 'مجموعه‌های CDN',
	/* -------------------------------------------------------- how long ago */
	'just now': 'همین الان',
	'%d min ago': '%d دقیقه پیش',
	'%d h ago': '%d ساعت پیش',
	'%d days ago': '%d روز پیش',
	'Uptime': 'مدت فعالیت',
	'Backup and Restore': 'پشتیبان‌گیری و بازگردانی',
	'Create Backup File': 'ساخت فایل پشتیبان',
	'Restore Backup File': 'بازگردانی فایل پشتیبان',
	'Restore': 'بازگردانی',
	'Backup or Restore Client and Server Configurations.': 'پشتیبان‌گیری یا بازگردانی تنظیمات کلاینت و سرور.',
	'The file holds every config, subscription, rule and setting, the shunt rules, the WARP and Aether accounts and the routing data. The cores and the traffic history are not in it.': 'این فایل همه کانفیگ‌ها، اشتراک‌ها، قوانین و تنظیمات، قوانین شانت، حساب‌های WARP و Aether و داده‌های مسیریابی را در خود دارد. هسته‌ها و تاریخچه ترافیک در آن نیستند.',
	'Note: Restoring configurations across different versions may cause compatibility issues.': 'توجه: بازگردانی تنظیمات یک نسخه دیگر ممکن است مشکل سازگاری ایجاد کند.',
	'Every config, subscription and setting will be replaced by the ones in the backup file. Continue?': 'همه کانفیگ‌ها، اشتراک‌ها و تنظیمات با محتوای فایل پشتیبان جایگزین می‌شوند. ادامه می‌دهید؟',
	'Restored. The program is restarting with these settings; the page reloads in a moment.': 'بازگردانی انجام شد. برنامه با این تنظیمات دوباره راه‌اندازی می‌شود و صفحه تا چند لحظه دیگر دوباره بارگذاری می‌شود.',
	'The file could not be sent to the router.': 'فایل به روتر فرستاده نشد.',
	'The backup file could not be made.': 'فایل پشتیبان ساخته نشد.',
	'No backup file was received.': 'فایل پشتیبانی دریافت نشد.',
	'This is not a Zirgozar backup file.': 'این فایل، فایل پشتیبان زیرگذر نیست.',
	'The settings in this backup file are damaged.': 'تنظیمات داخل این فایل پشتیبان خراب است.',
	'Not enough free memory for the backup file: needs %s, %s free.': 'حافظه آزاد برای ساخت فایل پشتیبان کافی نیست: %s لازم است و %s آزاد است.',
	'Not enough free memory to open the backup file: needs %s, %s free.': 'حافظه آزاد برای باز کردن فایل پشتیبان کافی نیست: %s لازم است و %s آزاد است.',
	'For L2TP, PPTP, SSTP and IKEv2 it can be left empty: the standard port is used (1701, 1723, 443 and 500).': 'برای L2TP، PPTP، SSTP و IKEv2 می‌توان خالی گذاشت؛ پورت استاندارد استفاده می‌شود (1701، 1723، 443 و 500).',
	'Expecting: non-empty value': 'این فیلد نباید خالی باشد',
	'Available: %s': 'آماده نصب: %s',
	'days': 'روز',
	'day': 'روز',

	/* ----------------------------------------------------- the three tests */
	'Ping': 'پینگ',
	'TCPing': 'TCPing',
	'URL Test': 'تست URL',
	'Test': 'تست',
	'ICMP round trip to the address. Says nothing about the server behind it, which may not answer pings at all.':
		'زمان رفت و برگشت پینگ تا سرور؛ فقط نشان می‌دهد سرور روشن است.',
	'A handshake to the port the tunnel will use.':
		'زمان اتصال به پورت کانفیگ؛ نشان می‌دهد پورت سرور باز است.',
	'One whole request carried by this node. The only one that proves it works.':
		'یک درخواست واقعی از داخل کانفیگ؛ تنها آزمایشی که ثابت می‌کند کانفیگ کار می‌کند.',

	/* ----------------------------------------------------------- the nodes */
	'Node name': 'نام کانفیگ',
	'Choose node': 'انتخاب کانفیگ',
	'Nodes': 'کانفیگ‌ها',
	'%d nodes': '%d کانفیگ',
	'Protocol': 'پروتکل',
	'Balancing': 'توزیع بار',
	'Shunt': 'قوانین عبور',
	'Custom Interface': 'اینترفیس دلخواه',
	'Load balancing node list': 'کانفیگ‌های توزیع بار',
	'Balancing Strategy': 'روش توزیع بار',
	'Fallback Node': 'کانفیگ جایگزین',
	'Direct Connection': 'اتصال مستقیم',
	'Probe Interval': 'فاصله بررسی',
	'Probe URL': 'آدرس بررسی',
	'Interface': 'اینترفیس',
	'Shunt Rule Group': 'گروه قوانین عبور',
	'Default Node': 'کانفیگ پیش‌فرض',
	'Blackhole (Block)': 'مسدود کردن',
	'Rule destination': 'مقصد قانون',
	'Open Traffic Rules': 'باز کردن قوانین عبور',
	'in use': 'در حال استفاده',
	'Use': 'استفاده',
	'This is the node the tunnel is using at the moment. Press Disconnect, or Choose fastest, before deleting it.':
		'این همان کانفیگی است که تونل الان از آن استفاده می‌کند. قبل از حذفش «قطع» یا «انتخاب سریع‌ترین» را بزنید.',
	'Connecting through %s…': 'در حال اتصال از راه %s…',
	'Nothing read yet. Read the subscriptions on Node Subscribe, or turn on the main switch in Basic Settings.':
		'هنوز چیزی خوانده نشده. اشتراک‌ها را در صفحه «اشتراک کانفیگ‌ها» بخوانید، یا کلید اصلی را در «تنظیمات پایه» روشن کنید.',
	'Where nodes come from, and which ones to add by hand. Changes take effect the next time the list is read.':
		'کانفیگ‌ها از کجا می‌آیند، و کدام‌ها را دستی اضافه می‌کنید. تغییرات از دفعه بعدی که لیست خوانده شود اعمال می‌شوند.',
	'Which nodes to use': 'از کدام کانفیگ‌ها استفاده شود',
	'Nodes to use': 'کانفیگ‌های مورد استفاده',
	'The configs chosen here are measured to find the fastest one.':
		'کانفیگ‌های انتخابی در این بخش، برای سریع‌ترین کانفیگ سنجش می‌شوند.',
	'All configs': 'همه کانفیگ‌ها',
	'Only manually added configs': 'فقط کانفیگ‌های دستی',
	'Only the subscriptions': 'فقط اشتراک‌ها',
	'Subscriptions': 'اشتراک‌ها',
	'Use IPsec': 'استفاده از IPsec',
	'IPsec shared key (PSK)': 'کلید مشترک IPsec (PSK)',
	'Enable only for an L2TP/IPsec account. Enter the shared key supplied by the provider. Plain L2TP does not encrypt traffic.': 'فقط برای اکانت L2TP/IPsec روشن کنید و کلید مشترک دریافتی از فروشنده را وارد کنید. L2TP ساده ترافیک را رمزگذاری نمی‌کند.',
	'Default: 1400. Reduce it if the tunnel connects but some pages do not load.': 'پیش فرض ۱۴۰۰ است. اگر تونل وصل شد اما بعضی صفحه‌ها باز نشدند، این مقدار را کاهش دهید.',
	'L2TP tests': 'تست‌های L2TP',
	'Enter the L2TP server IPv4 address or domain name.': 'آدرس IPv4 یا نام دامنه سرور L2TP را وارد کنید.',
	'L2TP requires a username and password.': 'برای L2TP نام کاربری و رمز عبور لازم است.',
	'A handshake to the port the tunnel will use. For L2TP, PPTP and SSTP, a TCP connection through the tunnel to the test URL.': 'زمان برقراری اتصال به پورت سرور. برای L2TP، PPTP و SSTP، زمان اتصال TCP از داخل تونل به مقصد تست.',
	'Enter the server IPv4 address or domain name.': 'آدرس IPv4 یا نام دامنه سرور را وارد کنید.',
	'This account requires a username and password.': 'برای این اکانت نام کاربری و رمز عبور لازم است.',
	'MPPE encryption': 'رمزگذاری MPPE',
	'Almost every PPTP server requires it. Turn it off only if the provider says the server does not encrypt.': 'تقریباً همه سرورهای PPTP آن را لازم دارند. فقط وقتی خاموشش کنید که فروشنده بگوید سرور رمزگذاری ندارد.',
	'PPTP tests': 'تست‌های PPTP',
	'SSTP tests': 'تست‌های SSTP',
	'PPTP uses TCP port 1723 and GRE. Its encryption is weak: use it only when nothing else gets through. Ping measures the server address. TCPing measures a TCP connection through the tunnel to the test URL; URL Test measures the full request.': 'PPTP از پورت TCP شماره ۱۷۲۳ و GRE استفاده می‌کند. رمزگذاری آن ضعیف است: فقط وقتی استفاده کنید که چیز دیگری رد نمی‌شود. پینگ زمان پاسخ آدرس سرور را می‌سنجد. TCPing زمان اتصال TCP از داخل تونل به مقصد تست و URL Test زمان درخواست کامل را می‌سنجد.',
	'SSTP runs inside HTTPS, normally on port 443, so it gets through most firewalls. The server certificate is not checked. Ping measures the server address. TCPing measures a TCP connection through the tunnel to the test URL; URL Test measures the full request.': 'SSTP داخل HTTPS و معمولاً روی پورت ۴۴۳ کار می‌کند، برای همین از بیشتر فایروال‌ها رد می‌شود. گواهی سرور بررسی نمی‌شود. پینگ زمان پاسخ آدرس سرور را می‌سنجد. TCPing زمان اتصال TCP از داخل تونل به مقصد تست و URL Test زمان درخواست کامل را می‌سنجد.',
	"OpenVPN could not be installed: a kernel module it needs is not available for this router's firmware. Update the firmware to the latest official OpenWrt release.":
		'OpenVPN نصب نشد: ماژول کرنلی که لازم دارد برای فریم‌ور این روتر وجود ندارد. فریم‌ور را به آخرین نسخه رسمی OpenWrt به‌روز کنید.',
	"OpenVPN could not be installed: the official source of kernel modules (kmods) is missing from this router's package sources, so no kernel module can be installed. The line to add is on the Runtime Logs page.":
		'OpenVPN نصب نشد: منبع رسمی ماژول‌های کرنل (kmods) در فهرست منبع‌های بسته این روتر نیست، پس هیچ ماژول کرنلی نصب نمی‌شود. خطی که باید اضافه شود در صفحه «گزارش‌ها» نوشته شده.',
	'The %s that was downloaded could not be installed - %s.': '%s که دانلود شد نصب نشد - %s.',
	'what came back is not a program at all - the address may have moved, or answered with an error page':
		'چیزی که دانلود شد اصلاً برنامه نیست - ممکن است آدرس عوض شده باشد یا یک صفحه خطا برگشته باشد',
	'it is built for a different processor than this router': 'برای پردازنده‌ای غیر از پردازنده این روتر ساخته شده',
	'it stopped the moment it was started, without a word - the download was most likely cut off part way; try again':
		'همان لحظه اجرا متوقف شد و چیزی نگفت - به احتمال زیاد دانلود نیمه‌کاره قطع شده؛ دوباره امتحان کنید',
	'This is not a PPTP or SSTP account.': 'این اکانت PPTP یا SSTP نیست.',
	'PPTP needs PPP. Install dependencies under Router requirements.': 'PPTP به PPP نیاز دارد. وابستگی‌ها را در بخش نیازمندی‌های روتر نصب کنید.',
	'SSTP needs PPP. Install dependencies under Router requirements.': 'SSTP به PPP نیاز دارد. وابستگی‌ها را در بخش نیازمندی‌های روتر نصب کنید.',
	'PPTP needs the PPTP plugin for PPP. Install dependencies under Router requirements.': 'PPTP به افزونه PPTP برای PPP نیاز دارد. وابستگی‌ها را در بخش نیازمندی‌های روتر نصب کنید.',
	'SSTP needs sstp-client. Install dependencies under Router requirements.': 'SSTP به sstp-client نیاز دارد. وابستگی‌ها را در بخش نیازمندی‌های روتر نصب کنید.',
	'Invalid PPTP account. Check server, username and password.': 'اطلاعات اکانت PPTP درست نیست. آدرس سرور، نام کاربری و رمز را بررسی کنید.',
	'Invalid SSTP account. Check server, username and password.': 'اطلاعات اکانت SSTP درست نیست. آدرس سرور، نام کاربری و رمز را بررسی کنید.',
	'The PPTP server has no reachable IPv4 address.': 'سرور PPTP آدرس IPv4 در دسترسی ندارد.',
	'The SSTP server has no reachable IPv4 address.': 'سرور SSTP آدرس IPv4 در دسترسی ندارد.',
	'The PPTP client stopped. Check Runtime Logs.': 'برنامه PPTP متوقف شد. گزارش‌ها را بررسی کنید.',
	'The SSTP client stopped. Check Runtime Logs.': 'برنامه SSTP متوقف شد. گزارش‌ها را بررسی کنید.',
	'PPTP did not connect. Check server, username and password.': 'PPTP وصل نشد. آدرس سرور، نام کاربری و رمز را بررسی کنید.',
	'SSTP did not connect. Check server, username and password.': 'SSTP وصل نشد. آدرس سرور، نام کاربری و رمز را بررسی کنید.',
	'The PPTP device is already in use.': 'دستگاه PPTP در حال استفاده است.',
	'The SSTP device is already in use.': 'دستگاه SSTP در حال استفاده است.',
	'The PPTP routing table is already in use.': 'جدول مسیریابی PPTP در حال استفاده است.',
	'The SSTP routing table is already in use.': 'جدول مسیریابی SSTP در حال استفاده است.',
	'Invalid character in the PPTP account.': 'اکانت PPTP نویسه نامعتبر دارد.',
	'Invalid character in the SSTP account.': 'اکانت SSTP نویسه نامعتبر دارد.',
	'L2TP normally uses UDP port 1701. Ping measures the server address. TCPing measures a TCP connection through the tunnel to the test URL; URL Test measures the full request. Iran routing and traffic rules are applied by the routing core.': 'پورت معمول L2TP برابر ۱۷۰۱ و از نوع UDP است. پینگ زمان پاسخ آدرس سرور را می‌سنجد. TCPing زمان اتصال TCP از داخل تونل به مقصد تست و URL Test زمان درخواست کامل را می‌سنجد. تفکیک ایران و قوانین ترافیک در هسته مسیریابی اعمال می‌شوند.',
	'L2TP needs xl2tpd and PPP. Install dependencies under Router requirements.': 'L2TP به xl2tpd و PPP نیاز دارد. وابستگی‌ها را در بخش نیازمندی‌های روتر نصب کنید.',
	'L2TP/IPsec needs strongSwan. Install dependencies under Router requirements.': 'L2TP/IPsec به strongSwan نیاز دارد. وابستگی‌ها را در بخش نیازمندی‌های روتر نصب کنید.',
	'Invalid L2TP account or missing ucode socket module. Install dependencies and check the account.': 'اطلاعات اکانت L2TP درست نیست یا ماژول socket نصب نشده است. وابستگی‌ها و اطلاعات اکانت را بررسی کنید.',
	'L2TP/IPsec negotiation failed. Check PSK and Runtime Logs.': 'برقراری IPsec ناموفق بود. کلید مشترک و گزارش‌ها را بررسی کنید.',
	'L2TP did not connect. Check server, account password and IPsec settings.': 'L2TP وصل نشد. آدرس سرور، رمز اکانت و تنظیمات IPsec را بررسی کنید.',
	'L2TP did not connect. The Runtime Logs page says how far it got.': 'L2TP وصل نشد. جزئیات اتصال در برگه گزارش‌ها موجود است.',
	'PPTP did not connect. The Runtime Logs page says how far it got.': 'PPTP وصل نشد. جزئیات اتصال در برگه گزارش‌ها موجود است.',
	'SSTP did not connect. The Runtime Logs page says how far it got.': 'SSTP وصل نشد. جزئیات اتصال در برگه گزارش‌ها موجود است.',
	'IKEv2 did not connect. The Runtime Logs page says how far it got.': 'IKEv2 وصل نشد. جزئیات اتصال در برگه گزارش‌ها موجود است.',
	'Sign-in': 'روش ورود',
	'Authentication method': 'روش احراز هویت',
	'Certificate file (PEM / DER)': 'فایل گواهی (PEM / DER)',
	'Username and password': 'نام کاربری و رمز',
	'Shared key (PSK)': 'کلید مشترک (PSK)',
	'Server identity': 'شناسه سرور',
	'Optional. The name or address in the server certificate, when it is not the server address above.': 'اختیاری. دامنه یا آدرس IP درج شده در گواهی سرور را وارد کنید، اگر با آدرس سرور بالا فرق دارد.',
	'Local identity': 'شناسه این روتر',
	'Optional. Only when the provider gives one for this router.': 'اختیاری. فقط وقتی فروشنده یکی برای این روتر داده باشد.',
	'Certificate authority': 'گواهی مرجع (CA)',
	'Optional. The CA certificate the provider supplies, in PEM form. Left empty, the server certificate must be from a public authority, such as Let’s Encrypt.':
		'اختیاری. گواهی CA که فروشنده داده، به شکل PEM. اگر خالی بماند، گواهی سرور باید از یک مرجع عمومی مثل Let’s Encrypt باشد.',
	'Paste the whole certificate, from BEGIN CERTIFICATE to END CERTIFICATE.': 'کل گواهی را از BEGIN CERTIFICATE تا END CERTIFICATE وارد کنید.',
	'IKEv2 tests': 'تست‌های IKEv2',
	'IKEv2 uses UDP ports 500 and 4500, and strongSwan on the router. The server certificate is checked. Ping measures the server address. TCPing measures a TCP connection through the tunnel to the test URL; URL Test measures the full request.':
		'IKEv2 از پورت‌های UDP شماره ۵۰۰ و ۴۵۰۰ و برنامه strongSwan روی روتر استفاده می‌کند. گواهی سرور بررسی می‌شود. پینگ زمان پاسخ آدرس سرور را می‌سنجد. TCPing زمان اتصال TCP از داخل تونل به مقصد تست و URL Test زمان درخواست کامل را می‌سنجد.',
	'IKEv2 needs strongSwan. Install dependencies under Router requirements.': 'IKEv2 به strongSwan نیاز دارد. وابستگی‌ها را در بخش نیازمندی‌های روتر نصب کنید.',
	'IKEv2 needs strongSwan EAP. Install dependencies under Router requirements.': 'IKEv2 به EAP در strongSwan نیاز دارد. وابستگی‌ها را در بخش نیازمندی‌های روتر نصب کنید.',
	'IKEv2 needs the XFRM interface kernel module. Install dependencies under Router requirements.': 'IKEv2 به ماژول کرنل XFRM interface نیاز دارد. وابستگی‌ها را در بخش نیازمندی‌های روتر نصب کنید.',
	'Invalid IKEv2 account or missing ucode socket module. Install dependencies and check the account.': 'اطلاعات اکانت IKEv2 درست نیست یا ماژول socket نصب نشده است. وابستگی‌ها و اطلاعات اکانت را بررسی کنید.',
	'The IKEv2 routing table is already in use.': 'جدول مسیریابی IKEv2 در حال استفاده است.',
	'The IKEv2 server has no reachable IPv4 address.': 'سرور IKEv2 آدرس IPv4 در دسترسی ندارد.',
	'The IKEv2 server has no direct IPv4 route.': 'برای سرور IKEv2 مسیر مستقیم IPv4 وجود ندارد.',
	'Cannot create the IKEv2 device. Install dependencies under Router requirements.': 'دستگاه IKEv2 ساخته نشد. وابستگی‌ها را در بخش نیازمندی‌های روتر نصب کنید.',
	'The IPsec service did not start.': 'سرویس IPsec اجرا نشد.',
	'The IKEv2 account could not be loaded. Check Runtime Logs.': 'اکانت IKEv2 بارگذاری نشد. گزارش‌ها را بررسی کنید.',
	'IKEv2 did not connect: the server refused the account. Check username, password and shared key.': 'IKEv2 وصل نشد: سرور اکانت را نپذیرفت. نام کاربری، رمز و کلید مشترک را بررسی کنید.',
	'IKEv2 did not connect: the server certificate is not trusted. Give the certificate authority the provider supplies, or check the server identity.':
		'IKEv2 وصل نشد: گواهی سرور معتبر شناخته نشد. گواهی مرجعی را که فروشنده داده وارد کنید، یا شناسه سرور را بررسی کنید.',
	'IKEv2 did not connect: the server wants encryption this router does not offer.': 'IKEv2 وصل نشد: سرور رمزگذاری‌ای می‌خواهد که این روتر ندارد.',
	'IKEv2 did not connect. Check server, username, password and Runtime Logs.': 'IKEv2 وصل نشد. آدرس سرور، نام کاربری، رمز و گزارش‌ها را بررسی کنید.',
	'The IKEv2 server gave this router no address in the tunnel.': 'سرور IKEv2 آدرسی داخل تونل به این روتر نداد.',
	'Fetched every fifteen minutes. Xray, sing-box, Hysteria, Clash and WireGuard files are accepted, as are a plain list of links and a single base64 block.':
		'هر پانزده دقیقه یک بار خوانده می‌شود. فایل‌های Xray، sing-box، Hysteria، Clash و وایرگارد پذیرفته می‌شوند، و همین‌طور لیست ساده‌ای از لینک‌ها یا یک بلوک base64.',
	'Name': 'نام',
	'Address': 'آدرس',
	'Must start with http:// or https://': 'باید با ‎http://‎ یا ‎https://‎ شروع شود',
	'On': 'فعال',
	'Nodes added manually': 'ورود دستی کانفیگ‌ها',
	'Manage configs you add manually here. Use Add to enter a config, or import share links and supported configuration files with the import buttons. The source selection setting determines whether manual configs, subscriptions or both are used. Click a config’s Ping, TCPing or URL Test result to run that test: Ping measures the server response, TCPing tests a TCP connection, and URL Test sends a request through the config.':
		'کانفیگ هایی که خودتان اضافه می کنید در این جدول قرار می گیرند. با دکمه افزودن، کانفیگ بسازید یا با دکمه های ورود لینک و فایل، کانفیگ وارد کنید. تنظیم منبع کانفیگ تعیین می کند از کانفیگ های دستی، اشتراک ها یا هر دو استفاده شود. برای اجرای تست، روی نتیجه ستون Ping، TCPing یا URL Test همان کانفیگ بزنید. Ping پاسخ سرور را بررسی می کند، TCPing اتصال TCP را می سنجد و URL Test یک درخواست از داخل کانفیگ ارسال می کند.',
	'Share link': 'لینک اشتراک‌گذاری',
	'A share link, several of them one per line, or a whole WireGuard .conf file. Choose a file and its contents are put in the box for you.':
		'یک لینک، یا چند لینک هر کدام در یک خط، یا کل یک فایل ‎.conf وایرگارد. فایل را انتخاب کنید تا محتوایش خودش داخل کادر بیاید.',
	'Browse…': 'انتخاب فایل…',
	'a .conf file, or a list of links': 'یک فایل ‎.conf، یا لیستی از لینک‌ها',
	'a .json or .conf file': 'یک فایل ‎.json یا ‎.conf',
	'Or a file': 'یا یک فایل',
	'Instead of an address: a configuration file — Xray, sing-box, Clash, a WireGuard .conf, or a plain list of links. Leave the address empty when you use this.':
		'به‌جای آدرس: یک فایل کانفیگ — Xray، sing-box، Clash، یک فایل ‎.conf وایرگارد، یا فقط لیستی از لینک‌ها. وقتی از این استفاده می‌کنید آدرس را خالی بگذارید.',
	'That file could not be read.': 'آن فایل خوانده نشد.',
	'Import subscriptions from a file': 'افزودن اشتراک‌ها از فایل',
	'No subscription address was found in that file.': 'در آن فایل هیچ لینک اشتراکی پیدا نشد.',
	'Every subscription in that file is already here.': 'همه اشتراک‌های آن فایل از قبل اضافه شده‌اند.',
	'%d subscriptions added. Save and apply, then update them.': '%d اشتراک اضافه شد. ذخیره و اعمال کنید، سپس به‌روزرسانی کنید.',
	'That does not look like a share link': 'این شبیه یک لینک اشتراک‌گذاری نیست',
	'Last time the sources were read': 'آخرین باری که منابع خوانده شدند',
	'Reading the subscriptions. This page will fill in shortly.':
		'در حال خواندن اشتراک‌ها. این صفحه تا لحظاتی دیگر پر می‌شود.',
	'Read the subscriptions now': 'همین حالا اشتراک‌ها را بخوان',
	'Knocking on every node once. The TCPing column will fill in as answers come back.':
		'همه کانفیگ‌ها یک بار آزمایش سریع می‌شوند و ستون TCPing پر می‌شود.',
	'Check all': 'بررسی همه',
	'“TCPing” is the handshake every node is checked with first, so it is filled in for all of them. “URL Test” is a complete request through the node, which is only run on the ones that answered and only until a fast enough one is found — so most of that column is empty by design. Both are the same measurements the buttons above take, done for the whole list at once.':
		'ستون TCPing برای همه کانفیگ‌ها پر می‌شود. ستون تست URL فقط برای کانفیگ‌هایی پر می‌شود که در انتخاب خودکار آزمایش شده‌اند، پس خالی بودن بیشتر آن طبیعی است.',

	/* --------------------------------------------------------- the traffic */
	'Traffic through the tunnel': 'ترافیک عبوری از تونل',
	'Today': 'امروز',
	'Last 7 days': 'هفته اخیر',
	'This month': 'این ماه',
	'Last 14 days': 'چهارده روز اخیر',
	'total': 'مجموع',
	'down': 'دانلود',
	'up': 'آپلود',
	'Nothing recorded yet.': 'هنوز چیزی ثبت نشده.',
	'Sent straight out this month (not tunnelled): ':
		'ترافیک مستقیم ماه جاری: ',

	/* ---------------------------------------------------------- the status */
	'Connect': 'اتصال',
	'Disconnect': 'قطع',
	'Choose fastest': 'انتخاب سریع‌ترین',
	'Connected': 'متصل',
	'Disconnected': 'قطع',
	'Ready to connect': 'آماده اتصال',
	'Connecting…': 'در حال اتصال…',
	'Disconnecting…': 'در حال قطع…',
	'Starting…': 'در حال شروع…',
	'Finding a node…': 'در حال یافتن کانفیگ…',
	'Could not connect': 'اتصال برقرار نشد',
	'Latency': 'تاخیر',
	'Routing': 'مسیریابی',
	'Dismiss': 'بستن',
	'Iran is Direct': 'ایران مستقیم',
	'Iran split is on, but the routing data is missing':
		'تفکیک ایران روشن است، ولی داده مسیریابی نیست',
	'Everything goes through the tunnel': 'همه‌چیز از تونل می‌رود',
	'PassWall2 is also redirecting traffic — turn one of them off.':
		'پسوال هم در روتر شما فعال است. پسوال را خاموش نمایید.',
	'Checking which of %d nodes answer at all — %d so far':
		'از %d کانفیگ %d عدد پاسخ دادند',
	'Measuring the %d that answered, best first — %d done':
		'اندازه‌گیری %d کانفیگی که جواب دادند، بهترین اول — %d انجام شد',
	'%d of %d nodes answered, but none completed a request':
		'%d کانفیگ از %d جواب دادند، ولی هیچ‌کدام یک درخواست را کامل نکرد',
	'No node on the list answered at all': 'هیچ کانفیگی در لیست جواب نداد',

	/* ------------------------------------------------------------- the log */
	'Log': 'گزارش',
	'The last few hundred lines this program wrote to the system log, newest at the bottom. It refreshes every five seconds. Nothing here is stored by this package — it is the router’s own log, and it is emptied when the router restarts.':
		'چند صد خط آخری که این برنامه در گزارش سیستم نوشته، تازه‌ترین در پایین. هر پنج ثانیه تازه می‌شود. هیچ‌کدام از این‌ها را خود پکیج ذخیره نمی‌کند — گزارش خود روتر است و با ریستارت روتر پاک می‌شود.',
	/* The lines themselves are said in Persian by logfa.js, sentence by
	   sentence, with the paths and numbers in them left as they are. */
	'Nothing has been logged yet.': 'هنوز چیزی در گزارش نوشته نشده.',
	'Refresh': 'تازه‌سازی',
	'Following': 'دنبال کردن',
	'Not following': 'دنبال نکردن',

	/* -------------------------------------------------------- the settings */
	'Settings': 'تنظیمات',
	'Language': 'زبان',
	'English': 'English',
	'Persian': 'فارسی',

	'Routing data': 'داده مسیریابی',
	'Direct pass for Iranian traffic': 'عبور مستقیم ترافیک ایران',
	'Iranian sites and addresses skip the tunnel. Needs the routing data below — until that is downloaded this does nothing, because a core asked for a geo file it has not got refuses to start rather than carrying on without it.':
		'سایت‌ها و آدرس‌های ایرانی از تونل رد نمی‌شوند. به داده مسیریابی پایین نیاز دارد — تا وقتی آن دانلود نشده این گزینه هیچ کاری نمی‌کند، چون هسته‌ای که از آن فایل geo خواسته شده و ندارد اصلا بالا نمی‌آید و بی‌خیالش هم نمی‌شود.',
	'Geoip source': 'منبع Geoip',
	'geoip.dat file address': 'آدرس فایل ‎geoip.dat',
	'Geosite source': 'منبع Geosite',
	'geosite.dat file address': 'آدرس فایل ‎geosite.dat',
	'Iranian DNS': 'DNS ایرانی',
	'Used for Iranian domains in split mode to keep CDN traffic local. Leave empty to keep split routing active without exposing DNS lookups to Iranian servers.':
		'در حالت تفکیک برای دامنه‌های ایرانی استفاده می‌شود تا ترافیک CDN داخل کشور بماند. خالی بگذارید تا تفکیک کار کند بدون اینکه سرورهای ایرانی ببینند چه دامنه‌هایی جست‌وجو می‌شود.',
	'Block advertising': 'مسدود کردن تبلیغات',
	'Also needs the routing data.': 'این هم به داده مسیریابی نیاز دارد.',
	'Block BitTorrent': 'مسدود کردن بیت‌تورنت',
	'BitTorrent through a free node is how a free node stops existing.':
		'استفاده از بیت‌تورنت موجب انسداد سرور فیلترشکن و قطع دایمی کانفیگ شما می‌گردد.',

	'Network': 'شبکه',
	'Name lookups': 'روش پیدا کردن دامنه‌ها',
	'Keeps local device and DHCP names working. Internet lookups use the tunnel DNS without inheriting the router’s upstream servers. DHCP name changes may take up to five seconds to appear. “Straight into the tunnel” omits local names.':
		'نام دستگاه‌ها و DHCP حفظ می‌شود و دامنه‌های اینترنتی از DNS تونل پاسخ می‌گیرند؛ DNSهای بالادستی قبلی روتر به این مسیر منتقل نمی‌شوند. نمایش تغییر نام دستگاه‌های DHCP ممکن است تا پنج ثانیه زمان ببرد. حالت «DNS از طریق هسته تونل» نام‌های محلی را پشتیبانی نمی‌کند.',
	'Through dnsmasq (recommended)': 'از راه dnsmasq (پیشنهادی)',
	'Straight into the tunnel': 'DNS از طریق هسته تونل',
	'Leave alone': 'حفظ تنظیمات DNS روتر',
	'Force DNS through the router': 'اجبار DNS از راه روتر',
	'Some devices ignore the router and ask 8.8.8.8 or 1.1.1.1 themselves. Those questions leave without the tunnel, so the answer is whatever the censor wants it to be, and the device then connects to it — looking perfectly healthy while doing so. This drags such queries back to the router. Leave it on unless a device on your network genuinely has to reach a DNS server of its own.':
		'بعضی دستگاه‌ها DNS روتر را نادیده می‌گیرند و مستقیم از 8.8.8.8 یا 1.1.1.1 می‌پرسند. این درخواست‌ها بدون فیلترشکن می‌روند و جواب فیلترشده می‌گیرند، پس سایت باز نمی‌شود. این گزینه آن‌ها را به روتر برمی‌گرداند تا جواب درست بگیرند. روشن بماند.',
	'IPv6': 'IPv6',
	'Directly: IPv6 goes out without the tunnel. Refused: devices use IPv4, which goes through the tunnel. Through the tunnel: IPv6 goes through the node too; the node has to carry IPv6, and the firewall has to be nftables.': 'مستقیم: IPv6 بدون تونل بیرون می‌رود. رد شود: دستگاه‌ها از IPv4 استفاده می‌کنند که از تونل می‌رود. از تونل: IPv6 هم از کانفیگ می‌رود؛ کانفیگ باید IPv6 را پشتیبانی کند و فایروال باید nftables باشد.',
	'Directly, outside the tunnel': 'مستقیم، بیرون از تونل',
	'Refused, devices use IPv4': 'رد شود، دستگاه‌ها از IPv4 استفاده کنند',
	'Refuse QUIC': 'رد کردن QUIC',
	'Makes browsers fall back to TCP. Automatic refuses it while the node in use goes through a CDN (WebSocket, XHTTP, gRPC) - a Cloudflare Worker cannot carry UDP at all - and lets it through otherwise, where QUIC is faster.':
		'مرورگرها را به TCP برمی‌گرداند. حالت خودکار وقتی کانفیگ فعلی از CDN رد می‌شود (WebSocket، XHTTP، gRPC) QUIC را می‌بندد، چون ورکر کلودفلر اصلا UDP را جابه‌جا نمی‌کند. در بقیه حالت‌ها QUIC باز می‌ماند چون سریع‌تر است.',
	'Firewall': 'فایروال',
	'Automatic is right unless this router has both and the wrong one is being picked.':
		'روی خودکار بماند، مگر روتر هم nftables و هم iptables داشته باشد و اشتباه انتخاب شده باشد.',
	'Auto': 'خودکار',
	'Never': 'هرگز',
	'Always': 'همیشه',
	'Interfaces to tunnel': 'اینترفیس‌هایی که تونل شوند',
	'Read from this router. Left unset — which is how it ships — every LAN interface is tunnelled, which is what almost everyone wants. Choose one to pick traffic up from that interface only.':
		'اگر خالی بماند (پیشنهادی)، همه شبکه‌های داخلی از فیلترشکن استفاده می‌کنند. اگر یکی را انتخاب کنید فقط همان شبکه؛ مثلا فقط وای‌فای مهمان.',
	'Reconnect after a reboot': 'اتصال دوباره بعد از ریستارت',

	'Choosing a node': 'انتخاب کانفیگ',
	'Two passes. A quick handshake to every node, then a real request through the ones that answered — %d at a time (at most %d batches), best first, stopping at the first node faster than %d ms. Connecting therefore takes seconds, not a minute. WireGuard has no TCP port and skips the first pass; hysteria2, tuic and OpenVPN are not part of the automatic choice.':
		'انتخاب در دو مرحله است: اول یک آزمایش سریع روی کانفیگ‌ها، بعد آزمایش واقعی روی آن‌هایی که جواب داده‌اند، هر بار %d کانفیگ (حداکثر %d دسته) و بهترین‌ها اول. با پیدا شدن اولین کانفیگ سریع‌تر از %d م‌ثانیه کار تمام می‌شود؛ برای همین اتصال چند ثانیه طول می‌کشد، نه یک دقیقه. وایرگارد پورت TCP ندارد و مرحله اول را رد می‌کند؛ hysteria2 و tuic و OpenVPN در انتخاب خودکار شرکت نمی‌کنند.',
	'First pass': 'مرحله اول',
	'A TCP handshake to the node’s real port is the right test. A ping is quicker and wrong often enough to matter: a node behind a CDN answers pings at the edge whatever state it is in, and plenty of working nodes drop ICMP entirely.':
		'روش آزمایش سریع. «هندشیک TCP» اتصال به پورت واقعی کانفیگ است و دقیق‌تر است. «پینگ» سریع‌تر است ولی اشتباه زیاد دارد: کانفیگ‌های پشت CDN همیشه جواب می‌دهند و خیلی از کانفیگ‌های سالم به پینگ جواب نمی‌دهند.',
	'TCP handshake (recommended)': 'هندشیک TCP (پیشنهادی)',
	'Ping, then handshake': 'پینگ، بعد هندشیک',
	'Good enough (ms)': 'به‌قدر کافی خوب (م‌ثانیه)',
	'The first node measured faster than this is the one used. Lower means a better node and a longer wait.':
		'اولین کانفیگی که زمانش کمتر از این عدد باشد انتخاب می‌شود. عدد کمتر یعنی کانفیگ سریع‌تر، ولی پیدا کردنش بیشتر طول می‌کشد.',
	'Measured at a time': 'اندازه‌گیری همزمان کانفیگ',
	'How many nodes are measured properly in one go.':
		'در هر نوبت چند کانفیگ به‌طور کامل اندازه‌گیری شوند.',
	'Batches at most': 'حداکثر تعداد دسته',
	'How far down the list to keep going when nothing is fast enough.':
		'اگر هیچ کانفیگی به‌قدر کافی سریع نبود، حداکثر چند دسته آزمایش شود.',
	'Checked at once': 'بررسی همزمان کانفیگ',
	'How many handshakes run in parallel in the first pass. If your router has little RAM, lower this number.':
		'در مرحله اول چند هندشیک هم‌زمان اجرا شود. اگر روتر شما رم پایینی دارد، این عدد را کم کنید.',

	'Traffic': 'ترافیک',
	'Every (Min)': 'هر (دقیقه)',
	'How often the running total is written to storage, in minutes. Anything not yet written is lost if the router loses power. Five is the default and matches how often the counters are read, so at most one reading is ever at risk.':
		'آمار مصرف هر چند دقیقه روی حافظه دایمی روتر ذخیره شود. با قطع برق، آماری که هنوز ذخیره نشده از دست می‌رود.',

	'Does this router have what it needs?': 'آیا این روتر آنچه لازم دارد را دارد؟',
	'Router requirements': 'پیش‌نیازهای روتر',
	'Everything is ready': 'همه چیز آماده است',
	'Details': 'جزییات',
	'Restore defaults': 'بازگشت به حالت اولیه',
	'Chooses how Xray matches domain names against routing rules. hybrid uses a combined matcher; linear checks the domain patterns sequentially. Keep hybrid unless you need linear for troubleshooting. This changes the matching method, not the rule order or DNS settings.':
		'روش مقایسه نام دامنه با قوانین مسیریابی در Xray را تعیین می کند. hybrid از روش ترکیبی و linear از بررسی ترتیبی الگوهای دامنه استفاده می کند. معمولا hybrid را نگه دارید و برای عیب یابی می توانید linear را امتحان کنید. این گزینه ترتیب قوانین یا تنظیمات DNS را تغییر نمی دهد.',
	'Tick and save to delete every config and subscription and put every setting back as it was when the program was installed. The routing data, the downloaded cores and the traffic history are kept. There is no undo.':
		'کانفیگ‌ها و اشتراک‌ها حذف می‌شوند و تنظیمات به حالت زمان نصب برمی‌گردند. داده‌های مسیریابی، هسته‌های دانلودشده و تاریخچه مصرف حفظ می‌شوند. این کار برگشت‌پذیر نیست.',
	'Every config, every subscription and every setting will be deleted when you save. Continue?':
		'با ذخیره کردن، همه کانفیگ‌ها، اشتراک‌ها و تنظیمات پاک می‌شوند. ادامه می‌دهید؟',
	'%s (pre-release)': '%s (پیش‌انتشار)',
	'Install this version': 'نصب این نسخه',
	'Downloading Xray %s.': 'در حال دانلود Xray %s.',
	'Hide details': 'بستن جزییات',
	'These are questions put to the running system, not a list of package names. A package can be installed and the thing it provides still not work.':
		'این‌ها سوال‌هایی است که از سیستم در حال اجرا پرسیده شده، نه یک لیست از اسم پکیج‌ها. یک پکیج می‌تواند نصب باشد و چیزی که فراهم می‌کند باز هم کار نکند.',
	'Transparent proxy': 'پروکسی شفاف',
	'the kernel can redirect traffic': 'کرنل می‌تواند ترافیک را به تونل بفرستد',
	'the kernel module for this is missing — nothing will be tunnelled':
		'ماژول لازم کرنل نصب نیست؛ هیچ ترافیکی از تونل نمی‌رود',
	'Policy routing': 'روش مسیریابی',
	'the full ip command is installed': 'دستور کامل ip نصب است',
	'busybox ip cannot add the route this needs — install ip-full':
		'ip بیزی‌باکس این مسیر را نمی‌تواند اضافه کند — ip-full را نصب کنید',
	'HTTPS': 'HTTPS',
	'The HTTPS check could not resolve the proxy hostname.': 'در بررسی HTTPS، نام دامنهٔ پروکسی پیدا نشد.',
	'The HTTPS check could not resolve the download hostname. Check the router DNS.': 'نام دامنهٔ سرور دانلود پیدا نشد؛ DNS روتر را بررسی کنید.',
	'The HTTPS check could not connect to the download server.': 'بررسی HTTPS نتوانست به سرور دانلود وصل شود.',
	'The download server returned an HTTP error. Check the HTTPS probe URL.': 'سرور دانلود خطای HTTP داد؛ نشانی تست HTTPS را بررسی کنید.',
	'The HTTPS check timed out. Check access to the download server.': 'مهلت بررسی HTTPS تمام شد؛ دسترسی به سرور دانلود را بررسی کنید.',
	'The HTTPS TLS handshake failed.': 'برقراری ارتباط TLS در بررسی HTTPS ناموفق بود.',
	'The HTTPS certificate could not be verified. Check CA certificates and the router clock.': 'گواهی HTTPS تأیید نشد؛ گواهی‌های ریشه و ساعت روتر را بررسی کنید.',
	'The HTTPS CA certificate file is missing or unreadable.': 'فایل گواهی‌های ریشهٔ HTTPS وجود ندارد یا قابل خواندن نیست.',
	'curl is unavailable. Install the missing packages.': 'دستور curl در دسترس نیست؛ بسته‌های موردنیاز را نصب کنید.',
	'The HTTPS download check failed. This does not establish that all downloads are blocked.': 'تست دانلود HTTPS ناموفق بود؛ این نتیجه به‌تنهایی به معنی مسدود بودن همهٔ دانلودها نیست.',
	'the router can fetch over HTTPS': 'روتر می‌تواند از HTTPS دانلود کند',
	'certificates are missing or the connection is blocked — nothing can be downloaded':
		'گواهی‌ها نیستند یا اتصال مسدود است — هیچ چیزی دانلود نمی‌شود',
	'Firewall in use': 'فایروال در حال استفاده',
	'none found': 'چیزی پیدا نشد',
	'Packages': 'پکیج‌ها',
	'%d missing': '%d مورد کم است',
	'everything needed is installed': 'هرچه لازم بود نصب است',
	'Dependency installation failed. Details: %s': 'نصب پیش‌نیازها ناموفق بود. جزئیات: %s',
	'See the installation log.': 'گزارش نصب را در /var/run/zirgozar/deps-install.log بررسی کنید.',
	'Install them': 'نصب',
	'Installing. This needs a working connection and may take a minute.':
		'در حال نصب. به یک اتصال سالم نیاز دارد و ممکن است یک دقیقه طول بکشد.',

	'Addresses (geoip.dat)': 'آدرس‌ها (geoip.dat)',
	'Names (geosite.dat)': 'دامنه ها (geosite.dat)',
	'updated %s': 'به‌روزرسانی: %s',
	'date unknown': 'تاریخ نامعلوم',
	'not downloaded': 'دانلود نشده',
	'Download': 'دانلود',
	'Update': 'به‌روزرسانی',
	'Downloading. The page will show the new size when it is done.':
		'در حال دانلود. وقتی تمام شد، حجم جدید در همین صفحه نشان داده می‌شود.',
	'Downloading from the addresses shown. Press Save & Apply as well, or the automatic update will go back to the saved ones.':
		'از همین آدرس‌هایی که در صفحه هست دانلود می‌شود. «ذخیره و اعمال» را هم بزنید، وگرنه به‌روزرسانی خودکار دوباره از آدرس‌های ذخیره‌شده می‌گیرد.',
	'UDP over TCP': 'UDP روی TCP',
	'UDP is carried inside the TCP connection, for a SOCKS server that takes it that way. Only sing-box does this, so a node with it on is carried by sing-box when there is one.':
		'UDP درون همان اتصال TCP فرستاده می‌شود، برای سرور ساکسی که UDP را این‌طور می‌پذیرد. این کار فقط از sing-box برمی‌آید، پس اگر sing-box نصب باشد، این نود با sing-box اجرا می‌شود.',
	'Free space': 'فضای خالی',
	'The full files are about 17 MB and 8 MB. If they will not fit, the same project publishes geoip-lite.dat (38 KB) and geosite-lite.dat (2 MB), which carry the Iranian categories and nothing else — put those addresses in the boxes above. A download that will not fit is refused rather than half written.':
		'فایل‌های کامل حدود ۱۷ و ۸ مگابایت هستند. اگر جا نمی‌شوند، همان پروژه ‎geoip-lite.dat‎ (۳۸ کیلوبایت) و ‎geosite-lite.dat‎ (۲ مگابایت) را هم منتشر می‌کند که فقط دسته‌های ایرانی را دارند — آدرس آن‌ها را در کادرهای بالا بگذارید. دانلودی که جا نشود رد می‌شود، نه اینکه نصفه نوشته شود.',

	'Cores': 'هسته‌ها',
	'installed': 'نصب‌شده',
	'not installed': 'نصب نشده',
	'no build for this router': 'برای پردازنده این روتر نسخه‌ای منتشر نشده',
	'latest is %s': 'آخرین نسخه %s است',
	'Update to %s': 'به‌روزرسانی به %s',
	'Loading settings…': 'در حال دریافت تنظیمات…',
	'Could not load settings. Reload this page to retry.': 'دریافت تنظیمات ناموفق بود؛ برای تلاش دوباره صفحه را بازخوانی کنید.',
	'LED color': 'رنگ چراغ روتر',
	'Use URL test latency of the current connection. Disabled follows OpenWrt LED settings. Failed tests or a disconnected tunnel turn the indicator off.': 'رنگ چراغ بر اساس تست URL اتصال جاری، هر ۱۵ ثانیه بررسی می‌شود. در حالت غیرفعال از تنظیمات چراغ OpenWrt پیروی می‌کند. قطع اتصال یا تست ناموفق چراغ را خاموش می‌کند.',
	'No supported dimmable RGB indicator was detected on this router.': 'در این روتر چراغ RGB قابل تنظیم و پشتیبانی‌شده شناسایی نشد.',
	'Green below (ms)': 'سبز: کمتر از (میلی‌ثانیه)',
	'Yellow below (ms)': 'زرد: از مرز سبز تا کمتر از (میلی‌ثانیه)',
	'Orange below (ms)': 'نارنجی: از مرز زرد تا کمتر از (میلی‌ثانیه)',
	'Red': 'قرمز',
	'LED thresholds must increase: green, yellow, orange.': 'مرزهای چراغ باید به ترتیب افزایش یابند: سبز، زرد، نارنجی.',
	'Light mode': 'حالت چراغ',
	'Steady': 'ثابت',
	'Blinking': 'چشمک‌زن',
	'The installed kernel identity could not be read. Package sources were left unchanged.': 'شناسهٔ کرنل نصب‌شده خوانده نشد؛ مخازن بسته تغییر نکردند.',
	'The matching kernel repository could not be determined. Package sources were left unchanged.': 'مخزن سازگار با کرنل مشخص نشد؛ مخازن بسته تغییر نکردند.',
	'The kernel repository hostname could not be resolved. Check router DNS.': 'دامنهٔ مخزن کرنل پیدا نشد؛ DNS روتر را بررسی کنید.',
	'The kernel repository certificate could not be verified. Check CA certificates and the router clock.': 'گواهی مخزن کرنل تأیید نشد؛ گواهی‌های ریشه و ساعت روتر را بررسی کنید.',
	'The matching kernel repository returned an HTTP error. Firmware incompatibility has not been established. See Runtime Logs.': 'مخزن سازگار با کرنل خطای HTTP داد؛ ناسازگاری فریمور ثابت نشده است. جزئیات در گزارش‌هاست.',
	'The matching kernel repository could not be downloaded. Check connectivity and Runtime Logs.': 'دانلود مخزن سازگار با کرنل ناموفق بود؛ اتصال و گزارش‌ها را بررسی کنید.',
	'The kernel repository signature could not be verified. Package sources were left unchanged.': 'امضای مخزن کرنل تأیید نشد؛ مخازن بسته تغییر نکردند.',
	'Package installation ran out of storage. Free space and try again.': 'فضای ذخیره‌سازی برای نصب بسته کافی نیست؛ فضا آزاد کنید و دوباره امتحان کنید.',
	'Router storage is read-only. Package installation cannot continue.': 'حافظهٔ روتر فقط‌خواندنی است؛ نصب بسته نمی‌تواند ادامه پیدا کند.',
	'Package HTTPS verification failed. Check CA certificates and the router clock.': 'اعتبارسنجی HTTPS بسته‌ها ناموفق بود؛ گواهی‌های ریشه و ساعت روتر را بررسی کنید.',
	'Package repository DNS lookup failed. Check router DNS.': 'نام دامنهٔ مخزن بسته پیدا نشد؛ DNS روتر را بررسی کنید.',
	'Package signature verification failed. Check the repository and its trusted signing keys.': 'امضای بسته تأیید نشد؛ مخزن و کلیدهای امضای معتبر آن را بررسی کنید.',
	'Package repositories could not be reached. Check connectivity and try again.': 'دسترسی به مخازن بسته برقرار نشد؛ اتصال را بررسی کنید و دوباره امتحان کنید.',
	'Required packages are unavailable or incompatible in the current repositories. See the installation log; a firmware change may not be necessary.': 'بسته‌های موردنیاز در مخازن فعلی موجود یا سازگار نیستند؛ گزارش نصب را بررسی کنید. تغییر فریمور لزوماً لازم نیست.',
	'The package operation failed. See the installation log for the original error.': 'عملیات بسته ناموفق بود؛ علت اصلی را در گزارش نصب بررسی کنید.',
	'OpenVPN was installed but its executable did not pass verification. See the installation log.': 'بستهٔ OpenVPN نصب شد اما اجرای آن تأیید نشد؛ گزارش نصب را بررسی کنید.',
	'HAProxy was installed but its executable did not pass verification. See the installation log.': 'بستهٔ HAProxy نصب شد اما اجرای آن تأیید نشد؛ گزارش نصب را بررسی کنید.',
	'The package manager finished but required packages are still missing. See the installation log.': 'مدیر بسته تمام شد اما بعضی بسته‌های لازم هنوز نصب نیستند؛ گزارش نصب را بررسی کنید.',
	'The release checksum could not be retrieved or is invalid. Nothing was installed.': 'چک‌سام انتشار دریافت نشد یا معتبر نیست؛ چیزی نصب نشد.',
	'Package installation finished. Check the capability results above.': 'نصب بسته‌ها تمام شد؛ نتیجهٔ بررسی قابلیت‌ها را در ردیف‌های بالا ببینید.',
	'Install': 'نصب',
	'Downloading %s:': 'در حال دانلود %s:',
	'Remove': 'حذف',
	'%s removed.': '%s حذف شد.',
	'Check for new versions': 'بررسی نسخه‌های جدید',
	'Checking the latest version. It will be shown in a moment.':
		'آخرین نسخه در حال بررسی است و تا لحظاتی دیگر نمایش داده می‌شود.',
	'(installed by another package — left alone)':
		'(توسط پکیج دیگری نصب شده — دست‌نخورده مانده)',
	'Xray carries the traffic. sing-box is only needed for nodes that speak what Xray does not — it is then run as a local helper for that one node, and everything else works exactly as before.':
		'اولویت با هسته ایکس‌ری است. سینگ‌باکس فقط برای کانفیگ‌هایی لازم است که ایکس‌ری پشتیبانی نمی‌کند و در کنار آن اجرا می‌شود.',

	'Traffic history': 'تاریخچه مصرف',
	'Forget all recorded traffic': 'حذف تاریخچه مصرف',
	'Traffic history cleared.': 'تاریخچه مصرف پاک شد.',

	/* --------------------------------------------------- the traffic rules */
	'Traffic Rules': 'قوانین ترافیکی',
	'Sites with a rebind weakness': 'سایت‌های دارای ضعف امنیتی Rebind Attack',
	'Some sites answer with a private address — Iranian banks and government services among them, which resolve to 10.x addresses inside the country. The router’s DNS protection against rebind attacks refuses those answers, and the site simply does not open. Every name listed here is excused from that protection, together with everything under it.':
		'بعضی سایت‌های ایرانی، مثل بانک‌ها و سرویس‌های دولتی، آدرس داخلی (10.x.x.x) دارند. روتر برای امنیت این جواب‌ها را رد می‌کند و سایت باز نمی‌شود. سایت‌هایی که اینجا بنویسید، با زیردامنه‌هایشان، از این محدودیت معاف می‌شوند.',
	'Domains': 'دامنه‌ها',
	'That does not look like a domain name': 'این شبیه یک نام دامنه نیست',
	'Direct addresses': 'IPهای مستقیم',
	'These addresses always go straight out, never through the tunnel. One address or one range per entry.':
		'این آدرس‌ها همیشه مستقیم می‌روند و هیچ‌وقت از تونل رد نمی‌شوند. در هر ردیف یک آدرس یا یک رنج.',
	'Addresses': 'آدرس‌ها',
	'Sing-Box-LX App Path': 'مسیر Sing-Box-LX',
	'The sing-box build that speaks xhttp. Empty means this program’s own copy in the folder above.': 'نسخه‌ای از sing-box که xhttp را می‌فهمد. خالی یعنی نسخه خود این برنامه در پوشه بالا.',
	'Active core': 'هسته فعال',
	'Auto measures the nodes and uses the fastest. A node chosen here - added by hand or from a subscription - is used as it is, and nothing is measured. A subscription’s node is found again each time its list is read.': 'خودکار: سریع‌ترین کانفیگ.',
	'Nodes to use was set to manually added configs only, so the subscriptions could not be used. It is now set to all configs.': 'گزینه «کانفیگ‌هایی که استفاده شوند» روی «فقط کانفیگ‌های دستی» بود و اشتراک‌ها استفاده نمی‌شدند. حالا روی «همه کانفیگ‌ها» گذاشته شد.',
	'Traffic statistics': 'آمار ترافیک',
	'Shows the tunnel traffic.': 'ترافیک فیلترشکن را نشان می‌دهد.',
	'AmneziaWG needs sing-box-lx, the build that has it. Install it on the App Update page.': 'AmneziaWG به sing-box-lx نیاز دارد، همان نسخه‌ای که آن را دارد. از صفحه «به‌روزرسانی» نصبش کنید.',
	'A naive config needs sing-box-lx, the build that has it. Install it on the App Update page.': 'کانفیگ naive به sing-box-lx نیاز دارد. آن را از صفحه به‌روزرسانی برنامه نصب کنید.',
	'Over QUIC instead of HTTP/2. Needs sing-box-lx.': 'به‌جای HTTP/2 روی QUIC. به sing-box-lx نیاز دارد.',
	'Server type': 'نوع سرور',
	'Group': 'گروه',
	'Optional.': 'اختیاری.',
	'Path': 'مسیر',
	'Optional, such as /staff.': 'اختیاری، مثلاً /staff.',
	'Certificate fingerprint': 'اثر انگشت گواهی',
	'Optional. For a self-signed server certificate.': 'اختیاری. برای گواهی خودامضای سرور.',
	'Auth key': 'کلید احراز هویت',
	'Name or Tailscale IP of the exit node.': 'نام دستگاه نود خروجی در شبکه Tailscale یا آدرس IP تیل اسکیل آن را وارد کنید.',
	'Device name': 'نام دستگاه',
	'Control server': 'سرور کنترل',
	'Empty for Tailscale; a Headscale address otherwise.': 'خالی برای Tailscale؛ در غیر این صورت آدرس Headscale.',
	'Obfuscation host': 'میزبان مبهم‌سازی',
	'Version': 'نسخه',
	'OpenVPN user name': 'نام کاربری OpenVPN',
	'Only for an OpenVPN profile that asks for a user name and password.': 'فقط برای پروفایل OpenVPN که نام کاربری و رمز می‌خواهد.',
	'OpenVPN password': 'رمز OpenVPN',
	'OpenVPN key pass phrase': 'رمز کلید OpenVPN',
	'Only for an OpenVPN profile whose private key is encrypted.': 'فقط برای پروفایل OpenVPN که کلید خصوصی‌اش رمزدار است.',
	'A share link, several of them one per line, a whole WireGuard .conf file or an OpenVPN .ovpn profile. Choose a file and its contents are put in the box for you.': 'یک لینک اشتراک‌گذاری، چند لینک هر کدام در یک خط، کل یک فایل conf وایرگارد یا یک پروفایل ovpn اوپن‌وی‌پی‌ان. فایل را انتخاب کنید تا محتوایش خودش داخل کادر بیاید.',
	'An OpenVPN config needs OpenVPN on the router. Press Install dependencies under Router requirements.': 'کانفیگ OpenVPN به خود OpenVPN روی روتر نیاز دارد. زیر «پیش‌نیازهای روتر» دکمه نصب پیش‌نیازها را بزنید.',
	'This OpenVPN profile uses a TAP device (dev tap). Only TUN profiles are supported.': 'این پروفایل OpenVPN از دستگاه TAP (dev tap) استفاده می‌کند. فقط پروفایل‌های TUN پشتیبانی می‌شوند.',
	'This OpenVPN profile asks for a user name and password. Enter them in the settings of the config.': 'این پروفایل OpenVPN نام کاربری و رمز می‌خواهد. آن‌ها را در تنظیمات همین کانفیگ وارد کنید.',
	'There is no AmneziaWG config to run.': 'کانفیگ AmneziaWG برای اجرا وجود ندارد.',
	'This OpenVPN config was read by an earlier version. Open it on the Node List page and press Save, so that it is read again.':
		'این کانفیگ OpenVPN را نسخه‌ی قبلی خوانده است. آن را در صفحه‌ی نودها باز کنید و «ذخیره» را بزنید تا دوباره خوانده شود.',
	'The core refused the new settings, so the tunnel was left running as it was. Check the Runtime Logs page.': 'هسته تنظیمات جدید را نپذیرفت، پس تونل همان‌طور که بود روشن ماند. دلیلش را در صفحه «گزارش اجرا» ببینید.',
	'sing-box could not run this tunnel, so Xray is carrying it. The Runtime Logs page says why. The official sing-box has no xhttp: install sing-box-lx on the App Update page and choose it under Active core in Basic Settings, or choose Xray there.': 'sing-box نتوانست این تونل را اجرا کند و Xray آن را می‌برد. دلیلش را صفحه «گزارش اجرا» می‌گوید. sing-box رسمی xhttp ندارد: sing-box-lx را از صفحه «به‌روزرسانی» نصب کنید و در تنظیمات پایه زیر «هسته فعال» آن را انتخاب کنید، یا همان‌جا Xray را انتخاب کنید.',
	'Auto: Xray, and sing-box for a config Xray cannot run. Xray (patterniha): his build first, with QUIC refused as PattN does. sing-box or sing-box-lx: every config through it; if it cannot start, Xray takes over. An OpenVPN config is always carried by OpenVPN itself, beside whichever is chosen here; install it on the App Update page.':
		'خودکار: Xray، و برای کانفیگی که Xray اجرا نمی‌کند sing-box. Xray (patterniha): اول هسته پترنیها، و QUIC مثل PattN بسته می‌شود. با sing-box یا sing-box-lx همه کانفیگ‌ها با آن اجرا می‌شوند؛ اگر راه نیفتد، Xray جایش را می‌گیرد. کانفیگ OpenVPN همیشه با خود OpenVPN اجرا می‌شود، کنار هر هسته‌ای که اینجا انتخاب شده باشد؛ آن را از صفحه‌ی «به‌روزرسانی» نصب کنید.',
	'Direct addresses and domains': 'آدرس‌ها و دامنه‌های مستقیم',
	'These sites always go straight out, never through the tunnel. A name covers everything under it: example.com also covers www.example.com. Xray’s own forms — full:, regexp:, keyword: — are accepted as written.':
		'این سایت‌ها همیشه مستقیم می‌روند و هیچ‌وقت از تونل رد نمی‌شوند. هر دامنه زیردامنه‌هایش را هم شامل می‌شود: ‎example.com‎ شامل ‎www.example.com‎ هم هست. شکل‌های خود Xray — ‎full:‎، ‎regexp:‎، ‎keyword:‎ — همان‌طور که نوشته شوند پذیرفته می‌شوند.',

	/* --------------------------------------------------- the access control */
	'Access Control': 'کنترل دسترسی',
	'ACLs': 'کنترل دسترسی',
	'ACLs is a tools which used to designate specific IP proxy mode.':
		'با کنترل دسترسی تعیین می‌کنید دستگاه‌های مشخص از فیلترشکن استفاده کنند یا نه، و از کدام کانفیگ.',
	'Main switch': 'کلید اصلی',
	'Main': 'اصلی',
	'Proxy': 'پروکسی',
	'Enable': 'فعال',
	'Enable server': 'فعال سازی سرور',
	'Remarks': 'نام',
	'Source Interface': 'اینترفیس مبدا',
	'All': 'همه',
	'Source': 'مبدا',
	'Example:': 'مثال:',
	'MAC': 'MAC',
	'IP': 'IP',
	'IP CIDR': 'IP CIDR',
	'IP range': 'رنج IP',
	'IPSet': 'IPSet',
	'Not true format, please re-enter!': 'قالب درست نیست، دوباره وارد کنید!',
	'Mode': 'حالت',
	'No Proxy': 'بدون پروکسی',
	'Use global config': 'با تنظیمات سراسری',
	'the node the tunnel is using': 'کانفیگی که تونل از آن استفاده می‌کند',
	'Nodes added by hand on the Configs page. A hysteria2 or tuic node cannot be given a rule of its own; such a rule uses the node the tunnel is using instead.':
		'فقط کانفیگ‌های دستی صفحه «کانفیگ‌ها». کانفیگ‌های hysteria2 و tuic اینجا قابل استفاده نیستند و به جای آن‌ها کانفیگ اصلی تونل استفاده می‌شود.',
	'Do not forward these TCP ports': 'عدم فوروارد این پورت‌های TCP',
	'Do not forward these UDP ports': 'عدم فوروارد این پورت‌های UDP',
	'Forward these TCP ports': 'فوروارد این پورت‌های TCP',
	'Forward these UDP ports': 'فوروارد این پورت‌های UDP',
	'No patterns are used': 'استفاده نشود',
	'Common Use': 'پرکاربرد',
	'The port settings support single ports and ranges. Separate multiple ports with commas (,). Example: 21,80,443,1000:2000.':
		'پورت‌ها می‌توانند تکی یا رنج باشند. چند پورت را با کاما (,) جدا کنید. مثال: ‎21,80,443,1000:2000‎.',

	/* ------------------------------------------------------ the router clock */
	'Router clock': 'ساعت روتر',
	'Sets the router clock to Iran time. If the router clock is wrong, secure connections and tunnel connections cannot be made.':
		'ساعت روتر را روی وقت ایران تنظیم می‌کند. اگر ساعت روتر اشتباه باشد، هیچ اتصال امنی، از جمله کانفیگ‌ها، برقرار نمی‌شود.',
	'Set router clock': 'تنظیم ساعت روتر',
	'The router clock was already set.': 'ساعت روتر قبلا تنظیم شده است.',
	'Router clock set: Tehran time, with the Iranian time servers.':
		'ساعت روتر تنظیم شد: ساعت تهران، با سرورهای زمان ایرانی.',

	/* ------------------------------------------ the frame, banner, footer */
	'Light': 'روشن',
	'Follow LuCI theme': 'پیروی از تم LuCI',
	'Dark': 'تیره',
	'Display mode': 'حالت نمایش',
	'Status': 'وضعیت',
	'A total VPN manger for your router': 'مدیریت کامل فیلترشکن در روتر شما',
	'Version %s, revision %s': 'نسخه %s ویرایش %s',
	'No warranty': 'بدون ضمانت',
	'Source code': 'کد منبع',

	/* ------------------------------------------ the status page, PW2 style */
	'Main switch is off': 'کلید اصلی خاموش است',
	'RUNNING': 'در حال اجرا',
	'NOT RUNNING': 'اجرا نمی‌شود',
	'Checking…': 'در حال بررسی…',
	'Problem detected!': 'مشکل پیدا شد!',
	'Core': 'هسته',
	'Helper core': 'هسته کمکی',
	'Iranian site': 'سایت ایرانی',
	'Check': 'بررسی',
	'Connection check': 'بررسی اتصال',
	'Reddit Connection': 'اتصال ردیت',
	'X Connection': 'اتصال ایکس',

	/* ------------------------------------------------ the settings tabs */
	'How the fastest node is chosen': 'روش انتخاب سریع‌ترین کانفیگ',
	'DNS': 'DNS',
	'Xray': 'Xray',
	'Maintain': 'نگهداری',

	'Direct DNS Protocol': 'پروتکل DNS مستقیم',
	'Direct DNS answers for everything that goes straight out, and for the names of the nodes themselves — which can never be looked up through the tunnel they are the way into. Auto uses the router’s own upstream, then the ISP’s.':
		'DNS مستقیم برای سایت‌هایی است که بدون فیلترشکن باز می‌شوند، و برای پیدا کردن آدرس خود سرورهای کانفیگ. «خودکار» از DNS اینترنت روتر استفاده می‌کند.',
	'Direct DNS': 'DNS مستقیم',
	'Direct Query Strategy': 'روش درخواست DNS مستقیم',
	'Remote DNS Protocol': 'پروتکل DNS راه دور',
	'TCP is the default because a great many free nodes carry no UDP at all, and a lookup sent as UDP through one of them is simply lost.':
		'TCP پیشنهاد می‌شود، چون بسیاری از کانفیگ‌های رایگان UDP را عبور نمی‌دهند و جواب DNS با UDP نمی‌رسد.',
	'Remote DNS': 'DNS راه دور',
	'Remote DNS DoH': 'DoH برای DNS راه دور',
	'An address, such as the one a DNS service gives you. When it has a name, the server’s IP is looked up for it outside the tunnel; it can also be written after a comma.':
		'آدرس DoH را وارد کنید؛ مثلا آدرسی که سرویس DNS به شما داده است. اگر آدرس شامل دامنه است، آدرس IP اولیه سرور را بعد از ویرگول وارد کنید.',
	'DoH request address': 'آدرس درخواست DoH',
	'Format must be:': 'قالب باید این باشد:',
	'Remote DNS EDNS Client Subnet': 'EDNS Client Subnet برای DNS راه دور',
	'Tells the DNS server where the client is, so that a CDN can answer with an edge near it. It cannot be a private address, and the server has to support EDNS Client Subnet (RFC 7871).':
		'یک IP عمومی از شهر یا کشورتان وارد کنید تا سرور DNS نزدیک‌ترین سرور سایت‌ها را به شما بدهد. IP خصوصی قبول نیست. اگر مطمین نیستید خالی بگذارید.',
	'Remote DNS Outbound': 'مسیر DNS راه دور',
	'Remote': 'از تونل',
	'Direct': 'مستقیم',
	'Answers with a made-up address and lets the tunnel find the real one at the far end, which saves a lookup on every new site. Only takes effect with “Straight into the tunnel” above: with dnsmasq in front, the router’s own lookups would be made up too, and nothing the router fetches for itself would work.':
		'به جای آدرس واقعی یک آدرس موقت ساختگی داده می‌شود و آدرس واقعی در سمت سرور پیدا می‌شود؛ سایت‌های تازه کمی سریع‌تر باز می‌شوند. فقط با «DNS از طریق هسته تونل» کار می‌کند.',
	'Remote Query Strategy': 'روش درخواست DNS راه دور',
	'Domain Override': 'جایگزینی دامنه',
	'One per line: a name, a space, and the address it should resolve to.':
		'با این گزینه مشخص می کنید یک دامنه به کدام آدرس IP تبدیل شود، به جای اینکه IP آن از سرور DNS دریافت شود. در هر خط، دامنه و IP را با یک فاصله بنویسید. مثلا example.com 1.2.3.4 یعنی برای دامنه example.com از IP برابر 1.2.3.4 استفاده شود؛ این فقط یک مثال است. این گزینه مسیر اتصال را تعیین نمی کند؛ عبور مستقیم یا از تونل همچنان تابع قوانین مسیریابی است. اگر IP مشخصی برای جایگزینی ندارید، این بخش را خالی بگذارید.',
	'DNS Redirect': 'تغییر مسیر DNS',

	'Preproxy': 'پیش‌پروکسی',
	'Every node the tunnel may choose dials out through this node first — the pre-proxy. For a node that cannot be reached from here directly, or to hide which nodes are being used. With it on, the first-pass handshake is skipped, because no node is reached directly.':
		'هر کانفیگی که تونل انتخاب کند، اول از داخل این نود رد می‌شود. برای نودی که از اینجا مستقیم در دسترس نیست، یا برای پنهان کردن اینکه از کدام نودها استفاده می‌شود. وقتی روشن است، هندشیک مرحله اول انجام نمی‌شود، چون به هیچ نودی مستقیم وصل نمی‌شویم.',
	'Preproxy Node': 'کانفیگ پیش‌پروکسی',
	'Nodes added by hand on the Configs page.': 'کانفیگ‌هایی که در صفحه کانفیگ‌ها دستی اضافه شده‌اند.',
	'Fragment': 'فرگمنت',
	'TCP fragments, which can deceive the censorship system in some cases, such as bypassing SNI blacklists.':
		'اولین بسته های اتصال تکه تکه فرستاده می شوند تا تشخیص دامنه در SNI برای فیلترینگ دشوارتر شود. برای زمانی که کانفیگ به دلیل فیلتر SNI وصل نمی شود.',
	'Fragment Packets': 'بسته‌های فرگمنت',
	'“tlshello” splits the TLS client hello. “1-3” splits at the TCP layer, the first one to three writes the client makes.':
		'tlshello: فقط پیام شروع TLS تکه می‌شود (پیشنهادی). 1-3: یک تا سه بسته اول TCP تکه می‌شوند.',
	'Fragment Length': 'طول فرگمنت',
	'Fragmented packet length (byte)': 'طول هر تکه (بایت)',
	'Fragment Delay': 'تاخیر فرگمنت',
	'Fragmentation interval (ms)': 'فاصله بین تکه‌ها (م‌ثانیه)',
	'Max Split': 'حداکثر تکه',
	'Limit the maximum number of splits.': 'حداکثر تعداد تکه‌ها را محدود می‌کند.',
	'Noise': 'نویز',
	'Only affects mKCP configs and xhttp over HTTP/3. The packets are defined in the table below.':
		'فقط روی کانفیگ‌های mKCP و xhttp با HTTP/3 اثر دارد. بسته‌ها در جدول پایین تعریف می‌شوند.',
	'Mux': 'Mux',
	'Several connections carried in one. Not used on a VLESS flow, xhttp or WireGuard node, where it cannot work.':
		'چند اتصال داخل یک اتصال. روی کانفیگ‌های VLESS با flow، xhttp و وایرگارد استفاده نمی‌شود، چون آنجا کار نمی‌کند.',
	'Mux concurrency': 'تعداد هم‌زمان Mux',
	'XUDP Mux concurrency': 'تعداد هم‌زمان XUDP',
	'Enable Node Log': 'گزارش کانفیگ فعال باشد',
	'What the core itself says, shown on the Log page beside this program’s own runtime log.':
		'چیزهایی که خود هسته می‌گوید، که در صفحه گزارش کنار گزارش خود برنامه نشان داده می‌شود.',
	'Log Level': 'سطح گزارش',
	'Traffic: written every (Min)': 'ترافیک: ذخیره هر (دقیقه)',
	'Xray Noise Packets': 'بسته‌های نویز Xray',
	'To send noise packets, select "Noise" in Xray Settings.':
		'برای فرستادن بسته‌های نویز، «نویز» را در زبانه Xray روشن کنید.',
	'Type': 'نوع',
	'Packet | Rand Length': 'بسته | طول تصادفی',
	'Delay (ms)': 'تاخیر (م‌ثانیه)',

	/* -------------------------------------------------------- App Update */
	'App Update': 'به‌روزرسانی',
	'%s is available': 'نسخه %s آماده است',
	'Up to date': 'به‌روز است',
	'Check update': 'بررسی به‌روزرسانی',
	'Reinstall': 'نصب مجدد',
	'Downloading and installing the new version. This takes a minute or two; the page reloads by itself when it is done.':
		'در حال دانلود و نصب نسخه جدید. یکی دو دقیقه طول می‌کشد؛ وقتی تمام شد صفحه خودش دوباره بارگذاری می‌شود.',
	'Updated to %s.': 'به نسخه %s به‌روز شد.',
	'This router does not say what processor it has.': 'این روتر نوع پردازنده‌اش را اعلام نمی‌کند.',
	'No package manager found on this router.': 'روی این روتر مدیر پکیج پیدا نشد.',
	'GitHub could not be reached.': 'به گیت‌هاب دسترسی نیست.',
	'The latest release has no package for this router.': 'آخرین انتشار پکیجی برای این روتر ندارد.',
	'The latest release is incomplete.': 'آخرین انتشار ناقص است.',
	'Download failed.': 'دانلود ناموفق بود.',
	'The download failed: the server did not answer, or the connection broke half way.': 'دانلود ناموفق بود: سرور جواب نداد، یا اتصال وسط کار قطع شد.',
	'The download came back cut short.': 'فایل دانلودشده ناقص بود.',
	'This is already the latest version. Nothing was downloaded.': 'همین نسخه آخرین نسخه است. چیزی دانلود نشد.',
	'A downloaded file does not match the release\'s checksum - nothing was installed.':
		'فایل دانلودشده با چک‌سام انتشار جور نیست - چیزی نصب نشد.',
	'The package manager refused the new version. The Log page has the details.':
		'مدیر پکیج نسخه جدید را نپذیرفت. جزییات در صفحه گزارش است.',
	'Updating Zirgozar': 'در حال به‌روزرسانی زیرگذر',
	'Checking for new versions': 'در حال بررسی نسخه‌های جدید',
	'Checking which servers answer': 'در حال بررسی سرورهایی که جواب می‌دهند',
	'Downloading routing data': 'در حال دانلود داده‌های مسیریابی',
	'Installing dependencies': 'در حال نصب پیش‌نیازها',
	'Reading the subscriptions': 'در حال خواندن اشتراک‌ها',
	'Installing %s': 'در حال نصب %s',
	'The full files are about 17 MB and 8 MB. If they will not fit, the same project publishes geoip-lite.dat (38 KB) and geosite-lite.dat (2 MB), which carry the Iranian categories and nothing else — put those addresses in the boxes below. A download that will not fit is refused rather than half written.':
		'فایل‌های کامل حدود ۱۷ و ۸ مگابایت هستند. اگر جا نمی‌شوند، همان پروژه ‎geoip-lite.dat‎ (۳۸ کیلوبایت) و ‎geosite-lite.dat‎ (۲ مگابایت) را هم منتشر می‌کند که فقط دسته‌های ایرانی را دارند — آدرس آن‌ها را در کادرهای پایین بگذارید. دانلودی که جا نشود رد می‌شود، نه اینکه نصفه نوشته شود.',
	'App Path': 'مسیر برنامه‌ها',
	'Core download folder': 'پوشه دانلود هسته‌ها',
	'Point this at USB storage on a router short of flash. A core another package installed is used where it is and never moved.':
		'روی روتری که حافظه‌اش کم است، این را روی حافظه USB بگذارید. هسته‌ای که پکیج دیگری نصب کرده همان‌جا که هست استفاده می‌شود و جابه‌جا نمی‌شود.',
	'Xray App Path': 'مسیر Xray',
	'Empty means: whichever Xray on this router accepts the configuration, preferring one already installed.':
		'خالی یعنی برنامه خودش Xray مناسب را پیدا می‌کند، و اگر Xray از قبل نصب باشد همان را استفاده می‌کند.',

	/* ------------------------------------------------------ Runtime Logs */
	'Runtime Logs': 'گزارش‌ها',
	'The node log is switched off in Settings → Log.': 'گزارش کانفیگ در تنظیمات پایه، برگه گزارش، خاموش است.',
	'The core has not said anything yet.': 'هسته هنوز چیزی نگفته.',
	'What Zirgozar does is shown here, refreshed every 5 seconds. It is emptied when the router reboots.':
		'اقدامات برنامه زیرگذر در این بخش نمایش داده می‌شود که هر 5 ثانیه به‌روز می‌شود. پس از ریبوت روتر پاک می‌شود.',
	'Clear logs': 'پاک کردن گزارش‌ها',
	'Node log': 'گزارش کانفیگ',
	'The Xray core’s messages are shown here.':
		'پیام‌های هسته Xray در این بخش نمایش داده می‌شود.',

	/* ------------------------------------------------------- chain proxy */
	'Chain Proxy': 'پروکسی زنجیره‌ای',
	'Close': 'خاموش',
	'Landing Node': 'کانفیگ فرود',
	'This node is reached through the one chosen here.': 'این کانفیگ از داخل کانفیگی که اینجا انتخاب شود وصل می‌شود.',
	'A node cannot be its own pre-proxy.': 'یک کانفیگ نمی‌تواند پیش‌پروکسی خودش باشد.',
	'Traffic goes through this node first and leaves from the one chosen here.':
		'ترافیک اول از این کانفیگ می‌گذرد و از کانفیگی که اینجا انتخاب شود بیرون می‌رود.',
	'A node cannot be its own landing node.': 'یک کانفیگ نمی‌تواند کانفیگ فرود خودش باشد.',

	/* ----------------------------------------------------- traffic rules */
	'What goes through the tunnel, what goes straight out, and what goes nowhere.':
		'چه چیزی از تونل برود، چه چیزی مستقیم، و چه چیزی هیچ‌جا.',
	'Iran': 'ایران',
	'Iranian sites and addresses skip the tunnel. Needs the routing data above — until that is downloaded this does nothing, because a core asked for a geo file it has not got refuses to start rather than carrying on without it.':
		'سایت‌ها و آدرس‌های ایرانی بدون فیلترشکن باز می‌شوند. فایل‌های مسیریابی (بخش «وضعیت قوانین» بالا) باید دانلود شده باشند، وگرنه این گزینه کار نمی‌کند.',
	'Block': 'مسدودسازی',
	'For every device on the network. The names come from the category-ads-all list inside the same routing data, so this also needs it.':
		'تبلیغات برای همه دستگاه‌های شبکه مسدود می‌شود. به فایل‌های مسیریابی نیاز دارد.',

	/* ------------------------------------------------- Basic Settings */
	'Basic Settings': 'تنظیمات پایه',
	'Home': 'خانه',
	'The tunnel on or off - the same switch as on the Status page. It holds across a reboot.':
		'روشن یا خاموش بودن تونل — همان کلید صفحه وضعیت. بعد از ریستارت هم همان‌طور می‌ماند.',
	'Auto measures the nodes and uses the fastest. A node added by hand is used as it is, and nothing is measured.':
		'خودکار: همه کانفیگ‌ها آزمایش می‌شوند و سریع‌ترین انتخاب می‌شود. اگر یک کانفیگ دستی انتخاب کنید، همیشه از همان استفاده می‌شود و آزمایشی انجام نمی‌شود.',
	'Auto (fastest)': 'خودکار (سریع‌ترین)',
	'Localhost Proxy': 'پروکسی خود روتر',
	'On: the router also uses the tunnel.':
		'روشن: روتر هم از فیلترشکن استفاده می کند.',
	'Kill switch': 'کلید قطع اضطراری (Kill switch)',
	'Off, the network works directly whenever the tunnel is not carrying it — stopped, failed, restarting, or not up yet after a reboot. On, a rule of its own, kept apart from the tunnel and never removed with it, closes the way out for the devices on your network in all of those cases: they reach the local network and nothing else, and are never sent out untunnelled without your knowing. Iranian addresses stay reachable if the Iran split is on, and so do the addresses and devices you set to go direct. Pings, which the tunnel does not carry, are blocked too. To get the direct network back, turn this off and save.':
		'اگر خاموش باشد، هر وقت تونل ترافیک را عبور نمی‌دهد (متوقف، ناموفق، در حال راه‌اندازی دوباره، یا بعد از ری‌استارت هنوز بالا نیامده) اینترنت دستگاه‌ها مستقیم و بدون تونل کار می‌کند. اگر روشن باشد، یک قانون جدا از تونل که با تونل برداشته نمی‌شود، در همه‌ی این حالت‌ها راه بیرون رفتن دستگاه‌ها را می‌بندد: فقط به شبکه‌ی محلی دسترسی دارند و هیچ‌وقت بدون اطلاع شما مستقیم بیرون نمی‌روند. اگر «تفکیک ایران» روشن باشد مقصدهای ایرانی باز می‌مانند، و همین‌طور آدرس‌ها و دستگاه‌هایی که خودتان مستقیم گذاشته‌اید. پینگ هم که تونل حمل نمی‌کند بسته است. برای برگشتن به اینترنت مستقیم، این گزینه را خاموش و ذخیره کنید.',
	'No node on the list can carry traffic, and neither can the one in use. The Kill switch is on, so devices have no internet beyond the local network until a node works. Add a node that works on the Configs page, or check the subscription.':
		'هیچ کانفیگی در فهرست، و نه کانفیگ در حال استفاده، ترافیک را عبور نمی‌دهد. کلید قطع اضطراری روشن است، پس تا وقتی کانفیگ سالمی نباشد دستگاه‌ها جز شبکه‌ی محلی اینترنتی ندارند. در صفحه «کانفیگ‌ها» یک کانفیگ سالم اضافه کنید، یا اشتراک را بررسی کنید.',
	'The Kill switch is on, but this router has neither nftables nor iptables, so it cannot be put in place.':
		'کلید قطع اضطراری روشن است، اما این روتر نه nftables دارد و نه iptables، پس قانون آن نصب نمی‌شود.',
	'The Kill switch could not be put in place, so nothing is holding traffic back if the tunnel fails. The Runtime Logs page says why.':
		'قانون کلید قطع اضطراری نصب نشد، پس اگر تونل از کار بیفتد چیزی جلوی ترافیک مستقیم را نمی‌گیرد. دلیلش در صفحه «گزارش اجرا» نوشته شده است.',
	'Client Proxy': 'پروکسی دستگاه‌های شبکه',
	'When selected, devices in LAN go through the tunnel. Otherwise they do not, but the devices named on the Access Control page still do.':
		'اگر روشن باشد، همه دستگاه‌های وصل به روتر از فیلترشکن استفاده می‌کنند. اگر خاموش باشد، فقط دستگاه‌هایی که در صفحه «کنترل دسترسی» آمده‌اند.',
	'Node Socks Listen Port': 'پورت نود Socks',
	'A SOCKS server on the router that goes out the way the tunnel does. Empty for none.':
		'روی این پورت یک پراکسی SOCKS ساخته می‌شود که از فیلترشکن روتر بیرون می‌رود؛ می‌توانید آن را در تلگرام یا مرورگر وارد کنید. اگر خالی بماند ساخته نمی‌شود.',
	'Node Socks Bind Local': 'نود SOCKS محلی روتر',
	'When selected, it can only be accessed localhost.': 'اگر روشن باشد فقط خود روتر از این پورت استفاده می‌کند. اگر خاموش باشد، دستگاه‌های شبکه هم با آدرس روتر و همین پورت می‌توانند از آن استفاده کنند.',
	'Socks Main switch': 'کلید اصلی SOCKS',
	'More SOCKS ports, each through a node of its own — the table below.':
		'پورت‌های SOCKS بیشتر بسازید که هر کدام از یک کانفیگ جداگانه بیرون برود (جدول پایین).',
	'Socks Config': 'تنظیمات SOCKS',
	'Socks Node': 'کانفیگ SOCKS',
	'The node the tunnel is using': 'کانفیگی که تونل استفاده می‌کند',
	'Socks Listen Port': 'پورت SOCKS',
	'What the core itself says, shown on the Runtime Logs page beside this program’s own log.':
		'پیام‌های هسته Xray ثبت شوند و در صفحه «گزارش‌ها»، بخش «گزارش کانفیگ» نمایش داده شوند.',
	'Waiting for the router…': 'در انتظار پاسخ روتر…',

	/* ----------------------------------------------------------- units */
	'TB': 'ترابایت',
	'GB': 'گیگابایت',
	'MB': 'مگابایت',
	'KB': 'کیلوبایت',
	'B': 'بایت',
	'ms': 'م‌ثانیه',

	/* ------------------------------------------------- Other Settings */
	'Other Settings': 'تنظیمات دیگر',
	'Delay Settings': 'تنظیمات تاخیر',
	'Open and close Daemon': 'بررسی و ترمیم خودکار',
	'Checks the tunnel on its own schedule. Two consecutive failed checks trigger repair.': 'تونل را با فاصله زمانی مشخص بررسی می‌کند. دو بررسی ناموفق پیاپی باعث ترمیم اتصال می‌شود.',
	'Health check interval (minutes)': 'فاصله بررسی سلامت (دقیقه)',
	'Replace a repeatedly slow config': 'تعویض کانفیگ با کندی مداوم',
	'In Auto mode, two slow checks and a confirmation trigger testing alternatives. A replacement must pass another test and be at least 1.5 times faster. Sweeps are at least 10 minutes apart. Manually selected configs are kept.': 'در حالت خودکار، دو بررسی کند پیاپی و یک تست تاییدی باعث بررسی کانفیگ‌های دیگر می‌شود. جایگزین باید در تست دوباره موفق و دست‌کم ۱٫۵ برابر سریع‌تر باشد. فاصله بررسی جایگزین‌ها حداقل ۱۰ دقیقه است. کانفیگ انتخاب‌شده دستی تغییر نمی‌کند.',
	'Minimum slow delay (ms)': 'حداقل تاخیر برای تشخیص کندی (م‌ثانیه)',
	'A request must exceed both this delay and twice the best observed delay of the current config to count as slow.': 'برای تشخیص کندی، زمان درخواست باید هم از این مقدار و هم از دو برابر بهترین زمان ثبت‌شده کانفیگ فعلی بیشتر باشد.',
	'Checks every 15 minutes and, if the current config does not work, picks another.':
		'هر 15 دقیقه بررسی می‌کند و اگر کانفیگ فعلی کار نکند، کانفیگ دیگری را انتخاب می‌کند.',
	'Delay Start': 'تاخیر در شروع',
	'Units:seconds': 'واحد: ثانیه',
	'Stop automatically mode': 'توقف خودکار',
	'Stop Time': 'زمان توقف',
	'Start automatically mode': 'شروع خودکار',
	'Start Time': 'زمان شروع',
	'Restart automatically mode': 'راه‌اندازی مجدد خودکار',
	'Restart Time': 'زمان راه‌اندازی مجدد',
	'Disable': 'غیرفعال',
	'Loop Mode': 'حالت تکرار',
	'Restart Interval(Hour)': 'فاصله راه‌اندازی مجدد (ساعت)',
	'Hour': 'ساعت',
	'Every day': 'هر روز',
	'Every Monday': 'هر دوشنبه',
	'Every Tuesday': 'هر سه‌شنبه',
	'Every Wednesday': 'هر چهارشنبه',
	'Every Thursday': 'هر پنجشنبه',
	'Every Friday': 'هر جمعه',
	'Every Saturday': 'هر شنبه',
	'Every Sunday': 'هر یکشنبه',
	'Forwarding Settings': 'تنظیمات هدایت ترافیک',
	'Fill in the ports you don\'t want to be forwarded by the agent, with the highest priority.':
		'پورت‌هایی را که نمی‌خواهید از تونل بروند وارد کنید؛ این بالاترین اولویت را دارد.',
	'Only Web': 'فقط وب',
	'Prefer firewall tools': 'ابزار فایروال',
	'TCP Proxy Way': 'روش پروکسی TCP',
	'REDIRECT: TCP goes to a port of its own and UDP by TPROXY. TPROXY carries both on one port.':
		'REDIRECT: TCP به پورت جداگانه می‌رود و UDP با TPROXY. در TPROXY هر دو از یک پورت می‌روند.',
	'Hijacking ICMP (PING)': 'پاسخ به پینگ (ICMP)',
	'A tunnel carries no ICMP, so a ping to a tunnelled address never comes back. With this on, the router answers it.':
		'فیلترشکن پینگ را عبور نمی‌دهد، پس پینگ گرفتن از سایت‌ها جواب نمی‌دهد. اگر روشن باشد، خود روتر به این پینگ‌ها جواب می‌دهد (عدد پینگ واقعی نیست).',
	'Direct IP List': 'لیست IPهای مستقیم',
	'These had been joined ip addresses will connect directly (not entering the core).':
		'این آدرس‌ها مستقیم وصل می‌شوند و وارد هسته نمی‌شوند.',
	'Xray Settings': 'تنظیمات Xray',
	'Override the connection destination address': 'جایگزینی آدرس مقصد اتصال',
	'Override the connection destination address with the sniffed domain. Otherwise the sniffed domain is used for routing only.':
		'اگر روشن باشد، دامنه تشخیص داده شده از ترافیک جایگزین آدرس مقصد اتصال می شود. اگر خاموش باشد، دامنه فقط برای تطبیق قوانین مسیریابی استفاده می شود و آدرس مقصد تغییر نمی کند.',
	'Excluded Domains': 'دامنه‌های مستثنا',
	'If the traffic sniffing result is in this list, the destination address will not be overridden.':
		'برای این سایت‌ها آدرس عوض نمی‌شود؛ سرویس‌هایی که با این کار خراب می‌شوند.',
	'Buffer Size': 'اندازه بافر',
	'Buffer size for every connection (kB)': 'اندازه بافر هر اتصال (کیلوبایت)',

	/* ------------------------------------------ Configs, Node Subscribe */
	'Configs': 'کانفیگ‌ها',
	'Node Subscribe': 'اشتراک‌ها',
	'Automatic detection delay': 'بررسی خودکار تاخیر',
	'When this page opens, each node added by hand is measured this way, and the answer put in its column.':
		'با باز شدن این صفحه، هر کانفیگ دستی با این روش اندازه‌گیری می‌شود و نتیجه در ستون خودش نشان داده می‌شود.',
	'Show server address and port': 'نمایش آدرس و پورت سرور',
	'URL Test Address': 'آدرس تست URL',
	'What a real request through a node asks for, when a node is measured and when the URL Test column is pressed.':
		'آدرسی که هنگام اندازه‌گیری کانفیگ و زدن ستون «تست URL»، یک درخواست واقعی از طریق کانفیگ به آن فرستاده می‌شود.',
	'The tunnel on or off. Save and apply for it to take effect; it holds across a reboot.':
		'روشن یا خاموش کردن تونل. برای اعمال، «ذخیره و اعمال» را بزنید. پس از راه‌اندازی دوباره روتر هم همین‌طور می‌ماند.',
	'Node num': 'تعداد کانفیگ',
	'Discard List': 'فهرست حذف',
	'Keep List': 'فهرست نگه‌داشتن',
	'Discard List,But Keep List First': 'فهرست حذف، با اولویت فهرست نگه‌داشتن',
	'Keep List,But Discard List First': 'فهرست نگه‌داشتن، با اولویت فهرست حذف',
	'Subscriptions are not used now: on the Configs page, “Nodes to use” is set to only manually added configs.':
		'اشتراک‌ها الان استفاده نمی‌شوند: در صفحه «کانفیگ‌ها»، گزینه «کانفیگ‌های مورد استفاده» روی «فقط کانفیگ‌های دستی» است.',
	'Keyword filter method inside the config': 'روش فیلتر کلمات داخل کانفیگ',
	'Nodes are kept or dropped by words in their names. A word matches anywhere in the name, exactly as written.':
		'کانفیگ‌ها بر اساس کلمات موجود در نامشان نگه داشته یا حذف می‌شوند. کلمه در هر جای نام باشد، دقیقا همان‌طور که نوشته شده، پیدا می‌شود.',
	'Nodes kept at most': 'حداکثر تعداد کانفیگ‌ها',
	'From all the subscriptions together. A long list takes longer to measure and more memory to hold.':
		'از مجموع همه اشتراک‌ها. فهرست طولانی‌تر، زمان بیشتری برای اندازه‌گیری و حافظه بیشتری لازم دارد.',
	'Manual subscription All': 'به‌روزرسانی دستی همه اشتراک‌ها',
	'Delete All Subscribe Node': 'حذف همه کانفیگ‌های اشتراک',
	'Delete the nodes of every subscription? They come back the next time the subscriptions are read.':
		'کانفیگ‌های همه اشتراک‌ها حذف شوند؟ دفعه بعد که اشتراک‌ها خوانده شوند دوباره برمی‌گردند.',
	'Deleted.': 'حذف شد.',
	'When each subscription is read is set in its own edit window. Xray, sing-box, Hysteria, Clash and WireGuard files are accepted, as are a plain list of links and a single base64 block. When adding a new subscription, save and apply first, then update it manually.':
		'زمان خواندن هر اشتراک در پنجره ویرایش آن تعیین می‌شود. فایل‌های Xray، sing-box، Hysteria، Clash و WireGuard، فهرست ساده لینک‌ها و base64 پذیرفته می‌شوند. بعد از افزودن اشتراک تازه، اول «ذخیره و اعمال» را بزنید و بعد به‌روزرسانی دستی.',
	'Remark cannot be empty.': 'نام نمی‌تواند خالی باشد.',
	'This remark already exists, please change a new remark.': 'این نام قبلا استفاده شده است. نام دیگری انتخاب کنید.',
	'Subscribe Info': 'اطلاعات اشتراک',
	'Subscribe URL': 'آدرس اشتراک',
	'a file': 'یک فایل',
	'Subscribe URL Access Method': 'روش دسترسی به آدرس اشتراک',
	'Auto reads it the way the router’s own traffic goes when Localhost Proxy is on; otherwise through the tunnel when it is up, and straight out when it is not.':
		'خودکار: اگر «پروکسی خود روتر» روشن باشد از فیلترشکن خوانده می‌شود؛ وگرنه اگر تونل وصل باشد از تونل، و اگر نباشد مستقیم.',
	'Direct Connection': 'اتصال مستقیم',
	'User-Agent': 'User-Agent',

	/* ------------------------------------------------------ Shunt Rule */
	'Shunt Rule': 'قانون شانت',
	'Shunt Rule Group': 'گروه قانون شانت',
	'default': 'پیش‌فرض',
	'Default': 'پیش‌فرض',
	'Rule': 'قانون',
	'Port': 'پورت',
	'Domain': 'دامنه',
	'Domain Strategy': 'استراتژی دامنه',
	'Domain matcher': 'روش تطبیق دامنه',
	'Close (Not use)': 'خاموش (استفاده نشود)',
	'Use default node': 'مثل ردیف پیش‌فرض',
	'The node the tunnel is using': 'کانفیگی که تونل استفاده می‌کند',
	'Blackhole (Block)': 'مسدود',
	'Inbound Tag': 'ورودی',
	'Transparent proxy': 'پروکسی شفاف',
	'None ticked is both.': 'اگر هیچ‌کدام انتخاب نشود، هر دو.',
	'Where everything no rule claims goes.': 'ترافیکی که با هیچ قانونی جور نشود به اینجا می‌رود.',
	'Only the rules of this group are used. Save and apply for the table below to show them.':
		'فقط قانون‌های این گروه اجرا می‌شوند. بعد از تغییر گروه «ذخیره و اعمال» را بزنید تا جدول پایین قانون‌های همان گروه را نشان دهد.',
	'No shunt rules yet. Add one with the button below.':
		'هنوز قانون شانتی وجود ندارد. با دکمه پایین یکی اضافه کنید.',
	'AsIs: only the name is used for routing. IPIfNonMatch: when no rule matches the name, it is resolved to addresses and all the rules are tried again. IPOnDemand: whenever an address rule is met, the name is resolved at once. Auto chooses IPIfNonMatch when a rule or the Iran split has addresses in it, and AsIs otherwise.':
		'روش استفاده از دامنه و آدرس IP در قوانین مسیریابی را تعیین می کند. منظور از دامنه، عبارتی مثل example.com است. AsIs: دامنه برای تطبیق قوانین به IP تبدیل نمی شود. IPIfNonMatch: اگر هیچ قانونی با دامنه مطابقت نداشت، آدرس IP دامنه پیدا می شود و قوانین دوباره بررسی می شوند. IPOnDemand: به محض رسیدن به قانونی که به IP نیاز دارد، آدرس IP دامنه پیدا می شود. خودکار: اگر قوانین یا جداسازی ایران به آدرس IP نیاز داشته باشند، IPIfNonMatch انتخاب می شود؛ در غیر این صورت AsIs.',
	'Which traffic each rule is about. Where it goes — a node, direct, or blocked — is chosen in the Shunt Rule tab of Basic Settings. The rules steer the tunnel’s own traffic, in this order, ahead of the Iran split; a device with a node of its own on the Access Control page keeps it.':
		'هر قانون مشخص می‌کند درباره کدام ترافیک است. اینکه آن ترافیک کجا برود (یک کانفیگ، مستقیم یا مسدود) در زبانه «قانون شانت» صفحه «تنظیمات پایه» انتخاب می‌شود. قانون‌ها به همین ترتیب و پیش از جداسازی ایران روی ترافیک تونل اعمال می‌شوند. دستگاهی که در «کنترل دسترسی» کانفیگ جداگانه دارد، همان را نگه می‌دارد.',
	'A device’s address, a range such as 192.168.1.0/24, or geoip:private.':
		'آدرس یک دستگاه، یک محدوده مثل 192.168.1.0/24، یا geoip:private.',
	'Such as 443, 80,443 or 1000-2000.': 'مثل 443 یا 80,443 یا 1000-2000.',
	'One a line. domain:example.com is that name and everything under it; full: that name only; regexp: a regular expression; keyword: or a plain word anywhere in the name; geosite: a list from the routing data. A line starting with # is a comment.':
		'هر خط یک مورد. domain:example.com یعنی این دامنه و همه زیردامنه های آن. full:example.com فقط خود دامنه example.com را تطبیق می دهد. keyword:google یا فقط google یعنی هر دامنه ای که این عبارت را داشته باشد. geosite:google یعنی فهرست آماده دامنه های گوگل. regexp: برای الگوی عبارت منظم است. خطی که با # شروع شود نادیده گرفته می شود.',
	'One a line: an address, a range such as 10.0.0.0/8, or geoip: and a country code from the routing data. A line starting with # is a comment.':
		'هر خط یک مورد: یک IP، یک محدوده مثل 10.0.0.0/8، یا فهرست IP یک کشور یا سرویس مثل geoip:ir یا geoip:telegram. خطی که با # شروع شود نادیده گرفته می‌شود.',
	'Rule Manage': 'مدیریت قوانین',
	'FakeDNS Main switch': 'کلید اصلی FakeDNS',
	'Close window': 'بستن',
	'Add': 'افزودن',
	'Default Preproxy': 'پیش‌پراکسی پیش‌فرض',
	'Geoview': 'موقعیت‌یاب',
	'Geoview App Path': 'مسیر Geoview',
	'The Geoview page needs it, and so does sing-box whenever the Iran split or ad blocking is on - it is then installed by itself. Empty means this program’s own copy in the folder above.':
		'صفحه «موقعیت‌یاب» به آن نیاز دارد، و sing-box هم وقتی تفکیک ایران یا مسدود کردن تبلیغات روشن است — آن وقت خودش نصب می‌شود. خالی یعنی نسخه خود این برنامه در پوشه بالا.',
	'Geoview shows where a name or an address belongs, on the Geoview page. sing-box cannot read the routing data without it: when sing-box carries the tunnel with the Iran split or ad blocking on, Geoview is installed by itself if it is missing.':
		'موقعیت‌یاب نشان می‌دهد یک دامنه یا آدرس به کدام کشور تعلق دارد. سینگ‌باکس بدون آن تفکیک ترافیک نمی‌کند.',
	'sing-box needs Geoview to read the routing data, and it could not be installed, so the Iran split and ad blocking are off. Install Geoview on the App Update page, or choose Xray under Active core in Basic Settings.':
		'sing-box برای خواندن داده‌های مسیریابی به Geoview نیاز دارد و نصب آن ممکن نشد، پس تفکیک ایران و مسدود کردن تبلیغات خاموش است. Geoview را از صفحه «به‌روزرسانی» نصب کنید، یا در تنظیمات پایه زیر «هسته فعال» Xray را انتخاب کنید.',
	'Enter something to look for first.': 'اول چیزی برای جست‌وجو وارد کنید.',
	'Processing, please wait…': 'در حال پردازش، لطفا صبر کنید…',
	'Geoview is not installed. Install it with the button below, or on the App Update page.':
		'Geoview نصب نیست. با دکمه پایین یا در صفحه «به‌روزرسانی» نصبش کنید.',
	'The routing data is not on the router yet. Download it on the Rule Manage page.':
		'داده‌های مسیریابی هنوز روی روتر نیستند. آن‌ها را در صفحه «مدیریت قوانین» دانلود کنید.',
	'Write the list as geoip: or geosite: and its name, such as geosite:google.':
		'نام فهرست را با geoip: یا geosite: بنویسید، مثل geosite:google.',
	'That is not a name or an address.': 'این یک دامنه یا آدرس نیست.',
	'No results were found!': 'نتیجه‌ای پیدا نشد!',
	'Rules containing this value:': 'قانون‌هایی که این مقدار را دارند:',
	'Query': 'جست‌وجو',
	'Searches the routing data on this router with Geoview: which lists hold a domain or an address, and what a list such as geosite:ir holds. Useful for writing shunt rules.':
		'داده‌های مسیریابی روی روتر را با Geoview جست‌وجو می‌کند: یک دامنه یا آدرس در کدام فهرست‌هاست، و یک فهرست مثل geosite:ir چه چیزهایی دارد. برای نوشتن قانون‌های شانت مفید است.',
	'Domain/IP Query': 'جست‌وجوی دامنه یا IP',
	'GeoIP/Geosite Query': 'جست‌وجوی فهرست GeoIP یا Geosite',
	'Install Geoview': 'نصب Geoview',
	'Downloading Geoview. It is ready when it shows on the App Update page.':
		'Geoview در حال دانلود است. وقتی در صفحه «به‌روزرسانی» نشان داده شد آماده است.',
	'Geoview publishes no build for this router\'s processor.': 'Geoview برای پردازنده این روتر نسخه‌ای منتشر نمی‌کند.',
	'Auto Update': 'به‌روزرسانی خودکار',
	'Update Once on Boot': 'به‌روزرسانی یک‌بار هنگام راه‌اندازی',
	'Updates the subscription the first time runs automatically after each system boot.':
		'بعد از هر بار روشن شدن روتر، اشتراک یک بار به‌طور خودکار به‌روز می‌شود.',
	'Disable: read only when its button is pressed, or once if it has never been read. What it brought is kept on flash, so a reboot does not lose it.':
		'غیرفعال: فقط با زدن دکمه‌اش خوانده می‌شود، یا یک بار اگر هرگز خوانده نشده باشد. کانفیگ‌های آن روی حافظه روتر نگه داشته می‌شوند و با راه‌اندازی دوباره از بین نمی‌روند.',
	'Every 15 minutes': 'هر ۱۵ دقیقه',
	'Update offset (minutes)': 'تاخیر شروع به‌روزرسانی (دقیقه)',
	'For every 15 minutes: 0 runs at :00, :15, :30 and :45; 5 runs five minutes later.': 'در حالت هر ۱۵ دقیقه، مقدار صفر در دقیقه‌های ۰۰، ۱۵، ۳۰ و ۴۵ اجرا می‌شود؛ مقدار ۵، پنج دقیقه بعد از این زمان‌ها اجرا می‌شود.',
	'Chained proxy works only with Xray nodes; a hysteria2 or tuic node of this subscription is left out of a landing chain. Only support a layer of proxy.':
		'زنجیره فقط برای کانفیگ‌های Xray است و فقط یک لایه دارد. کانفیگ‌های hysteria2 و tuic این اشتراک در حالت «کانفیگ فرود» استفاده نمی‌شوند.',
	'Every node of this subscription is reached through the one chosen here.':
		'همه کانفیگ‌های این اشتراک از طریق کانفیگی که اینجا انتخاب می‌شود وصل می‌شوند.',
	'Traffic goes through a node of this subscription first and leaves from the one chosen here.':
		'ترافیک اول از یک کانفیگ این اشتراک عبور می‌کند و از کانفیگی که اینجا انتخاب می‌شود خارج می‌شود.',
	'Add the node via the link': 'افزودن با لینک',
	'This config is already in the list: %s': 'این کانفیگ از قبل در فهرست هست: %s',
	'They are already in the list.': 'این‌ها از قبل در فهرست هستند.',
	'This subscription is already in the list: %s': 'این اشتراک از قبل در فهرست هست: %s',
	'Source port': 'پورت مبدأ',
	'UDP relay mode': 'حالت رله UDP',
	'0-RTT handshake': 'دست‌دادن 0-RTT',
	'Heartbeat (s)': 'Heartbeat (ثانیه)',
	'Port hopping': 'پرش پورت',
	'Ports the server hops over, such as 20000-30000. Empty for none.': 'پورت‌هایی که سرور بین آن‌ها جابه‌جا می‌شود، مثلاً 20000-30000. خالی یعنی ندارد.',
	'Hop interval (s)': 'فاصله پرش (ثانیه)',
	'Upload (Mbps)': 'آپلود (مگابیت)',
	'Download (Mbps)': 'دانلود (مگابیت)',
	'Private key': 'کلید خصوصی',
	'Optional, instead of the password.': 'اختیاری، به‌جای رمز.',
	'Plugin': 'پلاگین',
	'Plugin options': 'گزینه‌های پلاگین',
	'Such as obfs=http;obfs-host=bing.com': 'مثلاً obfs=http;obfs-host=bing.com',
	'Uplink capacity (MB/s)': 'ظرفیت آپلود (مگابایت بر ثانیه)',
	'Downlink capacity (MB/s)': 'ظرفیت دانلود (مگابایت بر ثانیه)',
	'Read buffer (MB)': 'بافر خواندن (مگابایت)',
	'Write buffer (MB)': 'بافر نوشتن (مگابایت)',
	'Keeps an idle WebSocket open. Empty for none.': 'WebSocket بی‌کار را باز نگه می‌دارد. خالی یعنی ندارد.',
	'Health check interval (s)': 'فاصله بررسی سلامت (ثانیه)',
	'Empty for none.': 'خالی یعنی ندارد.',
	'Health check timeout (s)': 'مهلت بررسی سلامت (ثانیه)',
	'Health check without streams': 'بررسی سلامت بدون جریان فعال',
	'Initial window size': 'اندازه پنجره اولیه',
	'sing-box Mux': 'Mux در sing-box',
	'Only with the sing-box engine.': 'فقط با هسته sing-box.',
	'Max streams': 'بیشترین تعداد جریان',
	'Padding': 'Padding',
	'TCP Brutal upload (Mbps)': 'آپلود TCP Brutal (مگابیت)',
	'The server must support it. Empty for off.': 'سرور باید پشتیبانی کند. خالی یعنی خاموش.',
	'TCP Brutal download (Mbps)': 'دانلود TCP Brutal (مگابیت)',
	'System interface': 'رابط سیستمی',
	'Protocol parameter': 'پارامتر پروتکل',
	'Only if the provider asks for one, such as session=abc; token=xyz': 'فقط اگر فروشنده خواسته باشد، مثلاً session=abc; token=xyz',
	'Port mapping': 'باز کردن پورت مودم',
	'Opens a port on the modem by UPnP or NAT-PMP, for a better chance of a direct connection.': 'با UPnP یا NAT-PMP یک پورت روی مودم باز می‌کند تا اتصال مستقیم راحت‌تر برقرار شود.',
	'The certificate, as a file on the router. Hysteria, TUIC, AnyTLS and NaiveProxy always need one.': 'گواهی، به‌صورت فایلی روی روتر. Hysteria، TUIC، AnyTLS و NaiveProxy همیشه به آن نیاز دارند.',
	'Shadowsocks (shadowsocks-rust)': 'Shadowsocks (با shadowsocks-rust)',
	'Tunnel (port forward)': 'تونل (انتقال پورت)',
	'v6 (a password of 12 characters or more)': 'v6 (رمز ۱۲ حرف یا بیشتر)',
	'Target address': 'آدرس مقصد',
	'Target port': 'پورت مقصد',
	'The router’s address in the tunnel; the client gets the next one.': 'آدرس روتر داخل تونل؛ کلاینت آدرس بعدی را می‌گیرد.',
	'Router key': 'کلید روتر',
	'This config needs %s, which is not installed.': 'این کانفیگ به %s نیاز دارد که نصب نیست.',
	'It also needs these router packages: %s.': 'این بسته‌های روتر را هم لازم دارد: %s.',
	'This config needs these router packages, which are not installed: %s.': 'این کانفیگ به این بسته‌های روتر نیاز دارد که نصب نیستند: %s.',
	'Install %s': 'نصب %s',
	'Install router packages': 'نصب بسته‌های روتر',
	'Installed.': 'نصب شد.',
	'Another install is still running. Try again when it is done.': 'یک نصب دیگر هنوز در جریان است. وقتی تمام شد دوباره امتحان کنید.',
	'Port range': 'بازه پورت',
	'Such as 2090-2099, in place of the port. Empty for one port.': 'مثلاً 2090-2099، به‌جای پورت. خالی یعنی یک پورت.',
	'Multiplexing': 'مالتی‌پلکس',
	'Handshake': 'دست‌دادن',
	'Standard': 'معمولی',
	'No wait (0-RTT)': 'بدون انتظار (0-RTT)',
	'Load Balancing': 'متعادل‌سازی بار',
	'HAProxy, from App Update, spreads connections over the servers below and leaves out one that stops answering. Point a config at 127.0.0.1 and the port to use them.': 'HAProxy (از صفحه به‌روزرسانی) اتصال‌ها را بین سرورهای زیر پخش می‌کند و سروری را که جواب ندهد کنار می‌گذارد. برای استفاده، یک کانفیگ را روی 127.0.0.1 و همین پورت بگذارید.',
	'Enable Load Balancing': 'فعال‌سازی متعادل‌سازی بار',
	'Health Check Inter (s)': 'فاصله بررسی سلامت (ثانیه)',
	'Console Port': 'پورت صفحه وضعیت',
	'A page showing each server as up or down. Empty for none.': 'صفحه‌ای که وضعیت هر سرور را نشان می‌دهد. خالی یعنی ندارد.',
	'Console Username': 'نام کاربری صفحه وضعیت',
	'Console Password': 'رمز صفحه وضعیت',
	'Load balancing servers': 'سرورهای متعادل‌سازی بار',
	'Server address': 'آدرس سرور',
	'host:port': 'میزبان:پورت',
	'Weight': 'وزن',
	'Backup': 'پشتیبان',
	'Client key': 'کلید کلاینت',
	'Obfuscation parameter': 'پارامتر مبهم‌سازی',
	'Carry with shadowsocks-rust': 'اجرا با shadowsocks-rust',
	'Its own client, from App Update, in place of the core.': 'با کلاینت خودش (از صفحه به‌روزرسانی)، به‌جای هسته.',
	'Mihomo App Path': 'مسیر Mihomo',
	'Only SSR nodes need it.': 'فقط کانفیگ‌های SSR به آن نیاز دارند.',
	'shadowsocks-rust App Path': 'مسیر shadowsocks-rust',
	'Only Shadowsocks nodes set to use it need it.': 'فقط کانفیگ‌های Shadowsocks که روی آن تنظیم شده‌اند به آن نیاز دارند.',
	'Only with the sing-box engine: the tunnel is a network interface of the router.': 'فقط با هسته sing-box: تونل یک رابط شبکه روی روتر می‌شود.',
	'The router’s services are restarting. Try again in a few seconds.': 'سرویس‌های روتر در حال راه‌اندازی دوباره‌اند. چند ثانیه دیگر دوباره امتحان کنید.',
	'Core and connection': 'هسته و اتصال',
	'Send HWID': 'ارسال HWID',
	'Some providers count devices: this sends what the router is and a hash of its model and address when the list is read.': 'بعضی فروشنده‌ها تعداد دستگاه را می‌شمارند: هنگام دریافت فهرست، نوع روتر و یک هش از مدل و آدرس آن فرستاده می‌شود.',
	'%s core': 'هسته %s',
	'Outbound Interface': 'رابط خروجی',
	'The interface this subscription’s nodes go out by. Empty is the router’s usual way.': 'رابطی که کانفیگ‌های این اشتراک از آن بیرون می‌روند. خالی یعنی مسیر معمول روتر.',
	'Hysteria upload (Mbps)': 'آپلود Hysteria (مگابیت)',
	'Hysteria download (Mbps)': 'دانلود Hysteria (مگابیت)',
	'For this subscription’s Hysteria2 nodes that set none. Empty lets them find out.': 'برای کانفیگ‌های Hysteria2 این اشتراک که خودشان سرعتی تعیین نکرده‌اند. خالی یعنی خودشان پیدا کنند.',
	'Through the tunnel': 'از داخل تونل',
	'Hijacking ICMPv6 (IPv6 PING)': 'پاسخ به ping روی IPv6',
	'With IPv6 through the tunnel, the router answers pings to IPv6 addresses.': 'وقتی IPv6 از تونل می‌رود، روتر به ping آدرس‌های IPv6 جواب می‌دهد.',
	'Auto Switch': 'تعویض خودکار',
	'Backup nodes': 'کانفیگ‌های پشتیبان',
	'Used in turn when the node above fails; the one that answers fastest is chosen.': 'وقتی کانفیگ بالا از کار بیفتد به کار می‌روند؛ هر کدام سریع‌تر جواب دهد انتخاب می‌شود.',
	'How often to test (min)': 'فاصله تست (دقیقه)',
	'Timeout (s)': 'مهلت (ثانیه)',
	'Failures before switching': 'تعداد خطا پیش از تعویض',
	'Back to the main node': 'برگشت به کانفیگ اصلی',
	'Return to the node above as soon as it works again.': 'به محض اینکه کانفیگ بالا دوباره کار کند، به آن برمی‌گردد.',
	'The port the connection comes from. Such as 1000-2000,3000.': 'پورتی که اتصال از آن می‌آید. مثلاً 1000-2000,3000.',
	'Node HTTP Listen Port': 'پورت HTTP نود',
	'An HTTP proxy beside it, the same way out. Empty for none.': 'یک پراکسی HTTP کنار آن، با همان مسیر خروج. خالی یعنی ندارد.',
	'HTTP Listen Port': 'پورت HTTP',
	'Not the SOCKS port.': 'نباید همان پورت SOCKS باشد.',
	'Node address DNS': 'DNS آدرس نودها',
	'The resolver every node’s server name is looked up with, straight out - an IP address, since nothing can be looked up before the tunnel is up. Empty uses Direct DNS. Such as 1.1.1.1, tcp://8.8.8.8 or https://8.8.8.8/dns-query.': 'برای اتصال به کانفیگی که آدرس سرورش دامنه است، ابتدا باید IP آن پیدا شود. مثلا vpn.example.com باید به یک آدرس IP تبدیل شود. این گزینه مشخص می کند کدام DNS این کار را انجام دهد. اگر آدرس سرور از ابتدا IP باشد، این تبدیل لازم نیست. این گزینه DNS باز کردن سایت ها از داخل تونل را تغییر نمی دهد. خالی بگذارید تا از گزینه «DNS مستقیم» استفاده شود؛ معمولا نیازی به تغییر آن نیست. برای تعیین DNS جداگانه، مثلا 1.1.1.1 یا tcp://8.8.8.8 یا https://8.8.8.8/dns-query وارد کنید. آدرس این DNS باید با IP نوشته شود و درخواست به آن مستقیم و خارج از تونل ارسال می شود تا برقراری اتصال به خود تونل وابسته نباشد.',
	'An IP address, such as 1.1.1.1, tcp://8.8.8.8 or https://8.8.8.8/dns-query.': 'یک آدرس IP، مثلاً 1.1.1.1، tcp://8.8.8.8 یا https://8.8.8.8/dns-query.',
	'%d added; %d were already in the list.': '%d کانفیگ اضافه شد؛ %d تا از قبل در فهرست بودند.',
	'Enter share links, one per line. Subscription links are not supported!': 'لینک‌های کانفیگ را وارد کنید، هر خط یک لینک. لینک اشتراک پذیرفته نمی‌شود!',
	'Please enter the correct link.': 'لطفا لینک درست وارد کنید.',
	'None of those could be read as a node.': 'هیچ‌کدام از این‌ها به‌عنوان کانفیگ خوانده نشد.',
	'No node is selected.': 'هیچ کانفیگی انتخاب نشده است.',
	'Reassign Group': 'تغییر گروه',
	'The group for the %d nodes selected. Empty is the default group.': 'نام گروه برای این %d کانفیگ. خالی یعنی گروه پیش‌فرض.',
	'Letters, digits, space, dot, dash and underscore only.': 'فقط حروف (فارسی یا انگلیسی)، عدد، فاصله، نقطه، خط تیره و زیرخط.',
	'Select all': 'انتخاب همه',
	'DeSelect all': 'لغو انتخاب همه',
	'Delete select nodes': 'حذف کانفیگ‌های انتخاب‌شده',
	'Are you sure to delete select nodes?': 'کانفیگ‌های انتخاب‌شده حذف شوند؟',
	'Clear all nodes': 'حذف همه کانفیگ‌ها',
	'Are you sure to clear all nodes?': 'همه کانفیگ‌های دستی حذف شوند؟',
	'Group Name': 'نام گروه',
	'To Top': 'به بالا',
	'Are you sure set this node?': 'این کانفیگ به‌عنوان کانفیگ اصلی تنظیم شود؟',
	'This is now the node in Basic Settings.': 'این کانفیگ الان کانفیگ «تنظیمات پایه» است.',
	'Copy': 'کپی',
	'Sing-Box App Path': 'مسیر Sing-Box',
	'Hysteria App Path': 'مسیر برنامه Hysteria',
	'Empty means this program’s own copy in the folder above.': 'خالی یعنی نسخه خود این برنامه در پوشه بالا.',
	'To run a core from memory, give a path beginning with /tmp, save and apply, then press Install beside it above. It has to be installed again after every reboot.':
		'برای اجرای هسته از حافظه RAM، مسیری که با /tmp شروع می‌شود بدهید، ذخیره و اعمال کنید و بعد دکمه نصب کنار آن هسته را در بالا بزنید. بعد از هر راه‌اندازی دوباره روتر باید دوباره نصب شود.',
	'Rule status': 'وضعیت قوانین',
	'GeoIP Update URL': 'آدرس به‌روزرسانی GeoIP',
	'Geosite Update URL': 'آدرس به‌روزرسانی Geosite',
	'Location of Geo rule files': 'محل فایل‌های قوانین Geo',
	'This variable specifies a directory where geoip.dat and geosite.dat files are. The full files are about 17 MB and 8 MB; on a router short of flash, point this at USB storage or choose the lite files above.':
		'پوشه‌ای که فایل‌های geoip.dat و geosite.dat در آن هستند. فایل‌های کامل حدود 17 و 8 مگابایت‌اند؛ روی روتری که حافظه کمی دارد، اینجا را به حافظه USB ببرید یا فایل‌های lite را در بالا انتخاب کنید.',
	'Auto Update Mode': 'حالت به‌روزرسانی خودکار',
	'The files ticked below are downloaded again at this time, and the tunnel, if it is running, restarted to read them.':
		'فایل‌هایی که پایین تیک خورده‌اند در این زمان دوباره دانلود می‌شوند و اگر تونل روشن باشد، برای خواندن آن‌ها دوباره راه‌اندازی می‌شود.',
	'Update Time': 'زمان به‌روزرسانی',
	'Update Interval(hour)': 'فاصله به‌روزرسانی (ساعت)',
	'Updated by the button below and by the automatic update.': 'با دکمه پایین و با به‌روزرسانی خودکار به‌روز می‌شود.',
	'Rule version': 'نسخه قوانین',
	'Manually update': 'به‌روزرسانی دستی',
	'Tick GeoIP, Geosite or both first.': 'اول GeoIP یا Geosite یا هر دو را تیک بزنید.',
	'unknown file': 'فایل ناشناخته',
	'Not valid, please re-enter: %s': 'نادرست است، دوباره وارد کنید: %s',
	'Names that go through a node are answered with made-up addresses, and the node looks up the real one at the far end — for streaming services that unlock by DNS, or to save a lookup. Tick it for each rule below that should use it. The router itself can open those names only with Localhost Proxy on.':
		'اگر روشن باشد، برای سایت‌هایی که از فیلترشکن می‌روند یک آدرس موقت ساختگی داده می‌شود و آدرس واقعی در سمت سرور پیدا می‌شود؛ سایت‌ها سریع‌تر باز می‌شوند و بعضی سرویس‌های ویدیویی هم باز می‌شوند. در جدول پایین برای هر قانونی که می‌خواهید تیک FakeDNS را بزنید.',
	'FakeDNS uses synthetic IP addresses for this rule’s domains. Enable the main FakeDNS switch and select a node as the rule destination.':
		'FakeDNS: برای دامنه های این قانون، آدرس IP ساختگی استفاده می شود. کلید اصلی FakeDNS باید روشن باشد و مقصد قانون یک کانفیگ باشد.',
	'Preproxy connects to this rule’s destination node through the node selected here. If the destination node already has its own proxy chain, that chain is preserved.':
		'پیش پروکسی: کانفیگ مقصد این قانون از طریق کانفیگی که اینجا انتخاب می کنید وصل می شود. اگر کانفیگ مقصد زنجیره اتصال خودش را داشته باشد، همان زنجیره حفظ می شود.',
	'Everything the tunnel carries gets made-up addresses — the DNS tab’s FakeDNS. Like that one, it takes effect only with lookups sent straight into the tunnel.':
		'برای همه سایت‌هایی که از فیلترشکن می‌روند آدرس ساختگی داده می‌شود. فقط وقتی کار می‌کند که در برگه DNS، «روش پیدا کردن دامنه‌ها» روی «DNS از طریق هسته تونل» باشد.',
	'When the Default row goes to a node, it is reached through this node first.':
		'اگر ردیف پیش‌فرض به یک کانفیگ می‌رود، اتصال اول از این کانفیگ رد می‌شود.',
	'Delete the subscribed node': 'حذف کانفیگ‌ها',
	'Delete Nodes': 'حذف نودها',
	'Delete subscription': 'حذف اشتراک',
	'Not enough free space on the router: %s needed, %s free. Nothing was installed.': 'فضای خالی روتر کافی نیست: %s لازم است و %s خالی است. نصب انجام نشد.',
	'Not enough free space on the router: %s free. Nothing was installed.': 'فضای خالی روتر کافی نیست: فقط %s خالی است. نصب انجام نشد.',
	'Manual subscription': 'به‌روزرسانی',
	'Reading it now. The count will change when it is done.': 'در حال خواندن. پس از پایان، تعداد به‌روز می‌شود.',
	'Instagram Connection': 'اتصال اینستاگرام',
	'The main switch is in the Main tab below.': 'کلید اصلی در زبانه «اصلی» پایین همین صفحه است.',

	/* What the router says back about a subscription. */
	'download failed': 'دانلود نشد',
	'answer too short': 'پاسخ خیلی کوتاه بود',
	'no servers in that configuration': 'هیچ سروری در این فایل نبود',
	'nothing that looks like a server link': 'هیچ لینک کانفیگی در آن نبود',
	'the tunnel is not running, and this is read only through it': 'تونل روشن نیست و این اشتراک فقط از طریق تونل خوانده می‌شود',
	'unknown subscription': 'اشتراک ناشناخته',
	'Save and apply this subscription first': 'اول این اشتراک را ذخیره و اعمال کنید',
	'that server is not in the list any more': 'این کانفیگ دیگر در فهرست نیست',

	/* What the router says on the first page when something needs doing. */
	'No node on the list answered at all. The connection itself may be blocking them, or the list may be stale.':
		'هیچ کانفیگی در فهرست جواب نداد. ممکن است خود اینترنت جلوی آن‌ها را گرفته باشد یا فهرست قدیمی شده باشد.',
	'No node on the list can carry traffic, and neither can the one in use. The tunnel has been taken out of the way so that the network works without it. Add a node that works on the Configs page, or check the subscription.':
		'هیچ کانفیگی در فهرست، و نه کانفیگ در حال استفاده، ترافیک را عبور نمی‌دهد. تونل کنار گذاشته شد تا شبکه بدون آن کار کند. در صفحه «کانفیگ‌ها» یک کانفیگ سالم اضافه کنید، یا اشتراک را بررسی کنید.',
	'Nothing in the list could be read as a node': 'هیچ چیز در فهرست به‌عنوان کانفیگ خوانده نشد',
	'No enabled manual configs are available. Add or enable a config on the Configs page.': 'کانفیگ دستی فعالی وجود ندارد. در صفحه «کانفیگ‌ها» یک کانفیگ اضافه یا فعال کنید.',
	'No configs are available from the enabled subscriptions. Update them or select manual configs.': 'اشتراک‌های فعال کانفیگی در اختیار برنامه نگذاشته‌اند. آن‌ها را به‌روز کنید یا کانفیگ‌های دستی را انتخاب کنید.',
	'No enabled configs are available. Add or enable a manual config or a subscription.': 'هیچ کانفیگ فعالی وجود ندارد. یک کانفیگ دستی یا اشتراک اضافه یا فعال کنید.',
	'There is no node list yet: no subscription could be read and none has been saved before. Add one node by hand on the Node List page - a single share link is enough - or check the subscription address on Node Subscribe.':
		'فهرست کانفیگ خالی است. تنظیم منابع و فعال بودن کانفیگ‌های دستی یا اشتراک‌ها را بررسی کنید.',
	'There is no node list yet: no subscription could be read and none has been saved before. Add one node by hand on the Configs page - a single share link is enough - or check the subscription address on Node Subscribe.':
		'هنوز فهرست کانفیگی وجود ندارد: هیچ اشتراکی خوانده نشد و فهرست ذخیره‌شده‌ای هم نیست. در صفحه «کانفیگ‌ها» یک کانفیگ دستی اضافه کنید (یک لینک کافی است)، یا آدرس اشتراک را در صفحه «اشتراک کانفیگ‌ها» بررسی کنید.',
	'The node chosen in Basic Settings cannot be read. Choose another there, or set it back to Auto.':
		'کانفیگ انتخاب‌شده در «تنظیمات پایه» خوانده نمی‌شود. کانفیگ دیگری انتخاب کنید یا آن را روی خودکار بگذارید.',
	'The helper for this node\'s protocol would not start.': 'هسته کمکی پروتکل این کانفیگ اجرا نشد.',
	'The tunnel process started but never accepted connections. Check the system log for what it said.':
		'هسته تونل اجرا شد اما هیچ اتصالی نپذیرفت. پیام آن را در «گزارش‌ها» ببینید.',
	'Iran routing is switched on but geoip.dat and geosite.dat are not on the router yet - press Update beside them. Until then everything goes through the tunnel.':
		'مسیریابی ایران روشن است اما geoip.dat و geosite.dat هنوز روی روتر نیستند. در صفحه «به‌روزرسانی برنامه» دکمه به‌روزرسانی کنار آن‌ها را بزنید. تا آن موقع همه ترافیک از تونل می‌رود.',
	'The routing data on this router is not the pair this expects: the core refused geoip:ir and geosite:ir. Connected with the Iran split off. Press Update beside the routing data on the settings page to fetch the right files.':
		'داده‌های مسیریابی روی روتر درست نیستند: هسته geoip:ir و geosite:ir را نپذیرفت. اتصال بدون جداسازی ایران برقرار شد. در صفحه «به‌روزرسانی برنامه» داده‌های مسیریابی را به‌روز کنید.',
	'This router has neither nftables nor iptables available, so traffic cannot be redirected.':
		'روی این روتر نه nftables هست و نه iptables، پس ترافیک را نمی‌توان هدایت کرد.',
	'This kernel cannot do transparent proxying with nftables. Install kmod-nft-tproxy (the Dependencies button on the settings page will do it).':
		'کرنل این روتر با nftables پروکسی شفاف انجام نمی‌دهد. kmod-nft-tproxy را نصب کنید (دکمه نصب وابستگی‌ها در صفحه «به‌روزرسانی برنامه»).',
	'This kernel cannot do transparent proxying with iptables. Install iptables-mod-tproxy (the Dependencies button on the settings page will do it).':
		'کرنل این روتر با iptables پروکسی شفاف انجام نمی‌دهد. iptables-mod-tproxy را نصب کنید (دکمه نصب وابستگی‌ها در صفحه «به‌روزرسانی برنامه»).',
	'Could not find the directory dnsmasq reads its extra configuration from, so name lookups are being redirected straight into the tunnel instead. Local machine names will not resolve while connected.':
		'پوشه تنظیمات اضافه dnsmasq پیدا نشد، پس درخواست‌های دامنه مستقیم به تونل فرستاده می‌شوند. تا وقتی وصل هستید نام دستگاه‌های شبکه محلی پیدا نمی‌شوند.',
	'Could not download the package index. The router needs a working internet connection before dependencies can be installed.':
		'فهرست بسته‌ها دانلود نشد. برای نصب وابستگی‌ها روتر باید به اینترنت وصل باشد.',
	'This router has neither opkg nor apk, so nothing can be installed automatically.':
		'روی این روتر نه opkg هست و نه apk، پس چیزی به‌طور خودکار نصب نمی‌شود.',
	'Xray is the engine and cannot be removed - it can only be updated.': 'Xray هسته اصلی است و حذف نمی‌شود، فقط به‌روز می‌شود.',
	'The Xray download did not contain a program - the address or the release may have changed.':
		'فایل دانلودشده Xray برنامه‌ای در خود نداشت. شاید آدرس یا نسخه منتشرشده تغییر کرده باشد.',
	'unzip is needed to install Xray and is not on this router. Press Install dependencies on the settings page.':
		'برای نصب Xray برنامه unzip لازم است که روی این روتر نیست. در صفحه «به‌روزرسانی برنامه» وابستگی‌ها را نصب کنید.',
	'Could not reach GitHub to find out which sing-box is current. Connect the tunnel first, then try again.':
		'به گیت‌هاب دسترسی نبود تا آخرین نسخه sing-box پیدا شود. اول تونل را وصل کنید و دوباره امتحان کنید.',
	'No sing-box program inside the archive.': 'در فایل فشرده، برنامه sing-box نبود.',
	'The sing-box download could not be unpacked.': 'فایل دانلودشده sing-box باز نشد.',
	'sing-box publishes no build for this router\'s processor.': 'sing-box برای پردازنده این روتر نسخه‌ای منتشر نمی‌کند.',
	'hysteria publishes no build for this router\'s processor.': 'hysteria برای پردازنده این روتر نسخه‌ای منتشر نمی‌کند.',

	/* -------------------------------------------- the page of one node */
	'This config is not there any more.': 'این کانفیگ دیگر وجود ندارد.',
	'Back to configs': 'بازگشت به کانفیگ‌ها',
	'Node Config': 'ویرایش کانفیگ',
	'New Config': 'ایجاد کانفیگ جدید',
	'Add file': 'افزودن فایل',
	'MASQUE over': 'MASQUE روی',
	'When Xray carries WARP over MASQUE itself (Disguise Off): HTTP/2 goes over TCP 443, which gets through where UDP is blocked; HTTP/3 is QUIC over UDP 443, Cloudflare’s own default.':
		'وقتی خود Xray وارپ روی MASQUE را می‌برد (noize خاموش): HTTP/2 روی TCP 443 می‌رود و جایی که UDP بسته است رد می‌شود؛ HTTP/3 یعنی QUIC روی UDP 443، که پیش‌فرض خود کلودفلر است.',
	'HTTP/2 (TCP)': 'HTTP/2 (TCP)',
	'HTTP/3 (QUIC)': 'HTTP/3 (QUIC)',
	'OpenVPN did not connect. The Runtime Logs page says how far it got.': 'OpenVPN وصل نشد. صفحه‌ی «گزارش اجرا» می‌گوید تا کجا پیش رفت.',
	'OpenVPN is the official client, from the router’s own packages: every OpenVPN config is carried by it and by nothing else. Install, update and remove go through the package manager.':
		'هسته OpenVPN رسمی است و از پکیج‌های خود روتر نصب می‌شود. کانفیگ‌های OpenVPN فقط با آن اجرا می‌شوند.',
	'This router has neither opkg nor apk, so OpenVPN cannot be installed automatically.': 'این روتر نه opkg دارد نه apk، پس OpenVPN خودکار نصب نمی‌شود.',
	'OpenVPN profile': 'پروفایل OpenVPN',
	'The whole .ovpn profile. Choose the file and its contents are put in the box for you.':
		'کل پروفایل .ovpn. فایل را انتخاب کنید تا محتوایش خودبه‌خود در کادر قرار بگیرد.',
	'an .ovpn file': 'یک فایل .ovpn',
	'That is not an OpenVPN profile.': 'این پروفایل OpenVPN نیست.',
	'Local Address': 'آدرس محلی',
	'This side’s address in the tunnel, as the server gave it: 10.0.0.2/32, and an IPv6 one after a comma if there is one.':
		'آدرس این طرف در تونل، همان که سرور داده: مثل 10.0.0.2/32، و اگر آدرس IPv6 هم هست بعد از یک ویرگول.',
	'Peer Public Key': 'کلید عمومی سرور (Peer)',
	'Pre-shared Key': 'کلید مشترک (Pre-shared Key)',
	'Only if the server gave one.': 'فقط اگر سرور داده باشد.',
	'Three numbers, such as 12,34,56. Empty unless you were told otherwise.':
		'سه عدد، مثل 12,34,56. خالی بگذارید مگر اینکه گفته شده باشد.',
	'Keep Alive': 'Keep Alive',
	'Seconds between keep-alive packets. Empty sends none.':
		'فاصله‌ی بسته‌های keep-alive به ثانیه. خالی یعنی فرستاده نمی‌شود.',
	'From Share URL': 'از لینک اشتراک‌گذاری',
	'Build Share URL': 'ساخت لینک اشتراک‌گذاری',
	'Generate QRCode': 'ساخت QR کد',
	'Export Config File': 'خروجی فایل کانفیگ',
	'The link, or the whole file, takes the place of what this config has now. Press Save & Apply afterwards to keep it.':
		'این لینک، یا کل فایل، جای آنچه این کانفیگ الان دارد را می‌گیرد. برای ماندگار شدن، بعد از آن «ذخیره و اعمال» را بزنید.',
	'Import': 'وارد کردن',
	'Copied': 'کپی شد',
	'Select the text and copy it by hand.': 'متن را انتخاب کنید و خودتان کپی کنید.',
	'There is no link yet.': 'هنوز لینکی نیست.',
	'Some fields are not filled in correctly.': 'بعضی از فیلدها درست پر نشده‌اند.',
	'This config is too long for a QR code.': 'این کانفیگ برای QR کد بیش از حد طولانی است.',
	'Xray does not speak this protocol, so there is no Xray config file for it.':
		'Xray این پروتکل را پشتیبانی نمی‌کند، پس فایل کانفیگ Xray برای آن ساخته نمی‌شود.',
	'This config could not be read.': 'این کانفیگ خوانده نشد.',
	'Node Remarks': 'نام کانفیگ',
	'A share link, several of them one per line, a whole WireGuard .conf file or an OpenVPN .ovpn profile.':
		'یک لینک اشتراک‌گذاری، چند لینک هر کدام در یک خط، یک فایل کامل WireGuard ‏.conf یا یک پروفایل OpenVPN ‏.ovpn.',
	'Address (Support Domain Name)': 'آی پی یا دامنه سرور',
	'ID': 'شناسه (UUID)',
	'Username': 'نام کاربری',
	'Password': 'رمز عبور',
	'Encrypt Method (encryption)': 'روش رمزنگاری (encryption)',
	'flow': 'flow',
	'Encrypt Method': 'روش رمزنگاری',
	'Security': 'امنیت',
	'None': 'هیچ',
	'SNI Domain': 'دامنه SNI',
	'Finger Print': 'اثر انگشت (Fingerprint)',
	'Public Key': 'کلید عمومی',
	'Short Id': 'Short Id',
	'Spider X': 'Spider X',
	'ML-DSA-65 Verify (pqv)': 'ML-DSA-65 Verify (pqv)',
	'The post-quantum check of the REALITY server: its ML-DSA-65 public key. Empty connects without the check. sing-box has no such check.': 'بررسی پساکوانتومی سرور REALITY: کلید عمومی ML-DSA-65 آن. خالی یعنی اتصال بدون این بررسی. sing-box چنین بررسی‌ای ندارد.',
	'Not an ML-DSA-65 key: it has to be 2603 characters of base64url, and this is %d.': 'کلید ML-DSA-65 نیست: باید ۲۶۰۳ کاراکتر base64url باشد و این %d کاراکتر است.',
	'allowInsecure': 'allowInsecure (پذیرفتن گواهی نامعتبر)',
	'Obfuscation': 'مبهم‌سازی (obfs)',
	'Obfuscation password': 'رمز مبهم‌سازی',
	'Congestion control': 'کنترل ازدحام',
	'Transport': 'روش انتقال (Transport)',
	'Camouflage Type': 'نوع استتار',
	'Service Name': 'نام سرویس (serviceName)',
	'Transfer mode': 'حالت انتقال',
	'XHTTP Mode': 'حالت XHTTP',
	'XHTTP Extra': 'XHTTP Extra',
	'An XHttpObject in JSON format, used for sharing.': 'یک XHttpObject به شکل JSON، همان که در لینک می‌آید.',
	'Must be JSON text!': 'باید متن JSON باشد!',
	'mKCP Seed': 'Seed برای mKCP',
	'TLS Chain Fingerprint (SHA256)': 'اثر انگشت زنجیره TLS ‏(SHA256)',
	'Once set, connects only when the server’s chain fingerprint matches.':
		'اگر پر شود، فقط وقتی وصل می‌شود که اثر انگشت زنجیره گواهی سرور با آن یکی باشد.',
	'TLS Certificate Name (CertName)': 'نام گواهی TLS ‏(CertName)',
	'TLS is used to verify the leaf certificate name.': 'دامنه یا شناسه مورد انتظار در گواهی نهایی سرور برای بررسی TLS استفاده می شود؛ منظور نام فایل گواهی نیست.',
	'TLS Certificate (PEM)': 'گواهی TLS ‏(PEM)',
	'A certificate the server’s chain is checked against, in place of the usual ones.':
		'گواهی‌ای که زنجیره سرور به‌جای گواهی‌های معمول با آن سنجیده می‌شود.',
	'An ECH configuration, or a domain and the DNS that publishes it, such as cloudflare-ech.com+https://1.1.1.1/dns-query.':
		'یک پیکربندی ECH، یا یک دامنه و DNS‌ای که آن را منتشر می‌کند، مثل cloudflare-ech.com+https://1.1.1.1/dns-query.',
	'ECH DNS through TLS (echOutbound)':
		'دریافت کلید ECH از مسیر TLS (echOutbound)',
	'Fetches ECH keys with h2c through 1.1.1.1:443 using the Microsoft TLS preset. Requires Xray with echSockopt and fromMitM support. An explicit ECH query domain is preserved; otherwise SNI is used.':
		'کلید ECH را با h2c از مسیر 1.1.1.1:443 و تنظیم TLS مایکروسافت می‌گیرد. به Xray با پشتیبانی echSockopt و fromMitM نیاز دارد. دامنهٔ مشخص‌شده در فیلد ECH حفظ می‌شود؛ در غیر این صورت SNI استفاده می‌شود.',
	'Cipher Suites': 'مجموعه رمزها (Cipher Suites)',
	'Configures the list of supported cipher suites, separated by colons.': 'فهرست مجموعه رمزهای مجاز، جداشده با دونقطه.',
	'Xray’s finalmask for this node, as a JSON object. The fragment and noise of the Xray tab are still added, unless this has its own.':
		'finalmask مخصوص این نود در Xray، به شکل یک شی JSON. fragment و noise برگه Xray همچنان اضافه می‌شوند، مگر این‌که این‌جا خودش داشته باشد.',
	'TCP Fast Open': 'TCP Fast Open',
	'Need node support required': 'سرور هم باید پشتیبانی کند',
	'Enable Multipath TCP, need to be enabled in both server and client configuration.':
		'Multipath TCP را روشن می‌کند؛ باید هم در سرور و هم این‌جا روشن باشد.',
	'Domain DNS Resolve': 'DNS برای دامنه نود',
	'If the node address is a domain name, this DNS will be used for resolution.':
		'اگر آدرس نود دامنه باشد، با این DNS به IP تبدیل می‌شود.',
	'If is domain name, The requested domain name will be resolved to IP before connect.':
		'اگر مقصد دامنه باشد، پیش از اتصال به IP تبدیل می‌شود.',
	'Enable Happy Eyeballs': 'روشن کردن Happy Eyeballs',
	'Attempts IPv4 and IPv6 simultaneously; automatically uses the faster connection.':
		'IPv4 و IPv6 را هم‌زمان امتحان می‌کند و اتصال سریع‌تر را به کار می‌گیرد.',

	/* -------------------------------------------------- Server-Side */
	'Server-Side': 'سمت سرور',
	'The address in the link is the one this page was opened at, unless Address in the share link says otherwise. A phone away from home needs the router’s public address or domain.':
		'آدرس داخل لینک همان آدرسی است که این صفحه با آن باز شده، مگر این‌که «آدرس در لینک اشتراک» چیز دیگری بگوید. گوشی‌ای که بیرون از خانه است به آدرس عمومی روتر یا یک دامنه نیاز دارد.',
	'Server-Side is off.': 'سمت سرور خاموش است.',
	'Could not start: %s': 'اجرا نشد: %s',
	'No server is running. Add one below and press Save & Apply.': 'هیچ سروری در حال اجرا نیست. پایین یکی اضافه کنید و «ذخیره و اعمال» را بزنید.',
	'Running (%s), listening on %s.': 'در حال اجرا (%s)، روی پورت‌های %s.',
	'The router as a proxy server: phones and laptops away from home connect to it. A server that listens beyond the router has its port opened in the firewall while it runs.':
		'با روشن کردن این گزینه و زدن «ذخیره و اعمال»، سرورهایی که در جدول پایین فعال کرده اید اجرا می شوند. سپس دستگاه های دیگر می توانند با آدرس روتر، پورت و اطلاعات اتصال همان سرور به آن وصل شوند. این کلید برای ارایه اتصال به دستگاه های دیگر است و کانفیگ اصلی زیرگذر را روشن نمی کند. برای اتصال از بیرون خانه، روتر باید از اینترنت قابل دسترسی باشد؛ مثلا IP عمومی داشته باشد یا پورت لازم روی مودم به روتر منتقل شده باشد. زیرگذر هنگام اجرای سرور، پورت آن را در فایروال روتر باز می کند، مگر اینکه سرور فقط برای اتصال از خود روتر تنظیم شده باشد.',
	'Log level': 'سطح گزارش',
	'Users Manager': 'مدیریت کاربران',
	'Outbound': 'خروجی',
	'Listen Port': 'پورت شنود',
	'Bind Local': 'فقط روی خود روتر',
	'Listen on the router itself only; the port is not opened in the firewall.': 'فقط روی خود روتر گوش می‌دهد و پورت در فایروال باز نمی‌شود.',
	'ID / Password': 'شناسه / رمز',
	'One per user. VLESS and VMess take a UUID, Trojan a password.': 'برای هر کاربر یکی. VLESS و VMess شناسه UUID می‌گیرند و Trojan رمز.',
	'Auth': 'احراز هویت',
	'A 2022 Shadowsocks method needs a base64 key of its own length: 16 bytes for aes-128, 32 for the others.':
		'روش‌های ۲۰۲۲ شدوساکس کلید base64 با طول مشخص می‌خواهند: ۱۶ بایت برای aes-128 و ۳۲ بایت برای بقیه.',
	'salamander. Empty is no obfuscation.': 'salamander. خالی یعنی بدون مبهم‌سازی.',
	'Max upload Mbps': 'حداکثر آپلود (Mbps)',
	'Max download Mbps': 'حداکثر دانلود (Mbps)',
	'Address in the share link': 'آدرس در لینک اشتراک',
	'The router’s public address or a domain that points to it. Empty is the address this page was opened at.':
		'آدرس عمومی روتر یا دامنه‌ای که به آن اشاره می‌کند. خالی یعنی همان آدرسی که این صفحه با آن باز شده.',
	'REALITY needs no certificate and no domain, and is the one to choose for VLESS. It works with VLESS and Trojan.':
		'REALITY نه گواهی می‌خواهد نه دامنه، و برای VLESS بهترین انتخاب است. با VLESS و Trojan کار می‌کند.',
	'REALITY works with VLESS and Trojan only.': 'REALITY فقط با VLESS و Trojan کار می‌کند.',
	'Public key absolute path': 'مسیر کامل فایل گواهی',
	'The certificate, as a file on the router. Hysteria2 and TUIC always need one.': 'گواهی، به شکل فایلی روی روتر. Hysteria2 و TUIC همیشه به آن نیاز دارند.',
	'Private key absolute path': 'مسیر کامل فایل کلید خصوصی',
	'In the share link only: for a self-signed certificate the client cannot check.': 'فقط در لینک اشتراک: برای گواهی خودامضا که کلاینت نمی‌تواند بررسی‌اش کند.',
	'Private Key': 'کلید خصوصی',
	'A new key pair. Save & Apply to use it.': 'یک جفت کلید تازه ساخته شد. برای استفاده «ذخیره و اعمال» را بزنید.',
	'Generate': 'ساختن',
	'The other half of the pair, for the share link. Generate fills both.': 'نیمه دیگر جفت کلید، برای لینک اشتراک. «ساختن» هر دو را پر می‌کند.',
	'Handshake server': 'سرور دست‌دادن (dest)',
	'A real site the handshake is borrowed from, as host:port.': 'یک سایت واقعی که دست‌دادن از آن قرض گرفته می‌شود، به شکل host:port.',
	'Server names': 'نام‌های سرور (serverNames)',
	'The names a client may ask for. Empty is the handshake server’s.': 'دامنه های مجاز در SNI درخواست کلاینت. خالی یعنی دامنه سرور دست دادن.',
	'Where the traffic of whoever connects leaves from. Hysteria2 and TUIC servers can use the first three.':
		'ترافیک کسی که وصل می‌شود از کجا بیرون برود. سرورهای Hysteria2 و TUIC فقط سه گزینه اول را دارند.',
	'Through the Zirgozar tunnel': 'از داخل تونل زیرگذر',
	'Custom SOCKS server': 'سرور SOCKS دلخواه',
	'Accept LAN Access': 'اجازه دسترسی به شبکه محلی',
	'Lets whoever connects reach the devices on this network and the router itself. Off, the private ranges are refused.':
		'کسی که وصل می‌شود به دستگاه‌های این شبکه و خود روتر دسترسی دارد. خاموش باشد، آدرس‌های خصوصی بسته‌اند.',
	'Xray could not make a key pair.': 'Xray نتوانست جفت کلید بسازد.',

	/* ---------------------------------------------------------------- WARP */
	'WARP': 'وارپ',
	'WARP in WARP': 'وارپ در وارپ',
	'Psiphon behind WARP': 'سایفون پشت وارپ',
	'Exit country': 'کشور خروجی',
	'WARP+ licence': 'لایسنس WARP+',
	'A WARP+ licence is letters, digits and dashes.': 'لایسنس WARP+ فقط حرف، عدد و خط تیره است.',
	'WARP: Cloudflare’s own exit. WARP in WARP: a second WARP behind the first, for an exit address the first does not show. Psiphon behind WARP: an exit in the country chosen below.':
		'وارپ: خروجی خود کلودفلر. وارپ در وارپ: یک وارپ دوم پشت اولی، برای یک IP خروجی دیگر. سایفون پشت وارپ: خروجی از کشوری که پایین‌تر انتخاب می‌کنید.',
	'Endpoint': 'اندپوینت',
	'A WARP address and port, such as 162.159.192.1:2408. Empty lets warp-plus choose one.':
		'آدرس و پورت وارپ، مثل 162.159.192.1:2408. خالی بگذارید تا warp-plus خودش انتخاب کند.',
	'An address and a port, such as 162.159.192.1:2408.': 'یک آدرس و یک پورت، مثل 162.159.192.1:2408.',
	'Scan for an address': 'اسکن آدرس',
	'Try the WARP addresses and use one that answers from here. Most of them are blocked in Iran, so leave this on.':
		'آدرس‌های وارپ را امتحان می‌کند و یکی را که از اینجا جواب بدهد برمی‌دارد. بیشترشان در ایران بسته‌اند، پس روشن بماند.',
	'Scan: slowest answer (ms)': 'اسکن: کندترین جواب (م‌ثانیه)',
	'Addresses that answer more slowly than this are passed over.': 'آدرس‌هایی که دیرتر از این جواب بدهند کنار گذاشته می‌شوند.',
	'IP version': 'نسخه IP',
	'Which WARP addresses to use: IPv4 is the one most connections in Iran have.':
		'از کدام آدرس‌های وارپ استفاده شود. بیشتر اینترنت‌های ایران فقط IPv4 دارند.',
	'Both': 'هر دو',
	'IPv4 only': 'فقط IPv4',
	'IPv6 only': 'فقط IPv6',
	'Optional. A licence from the 1.1.1.1 app turns the account into WARP+. One licence works on five devices.':
		'اختیاری. لایسنسی از برنامه 1.1.1.1 اکانت را WARP+ می‌کند. هر لایسنس روی پنج دستگاه کار می‌کند.',
	'DNS inside WARP': 'DNS داخل وارپ',
	'Reserved': 'Reserved',
	'Three numbers, such as 12,34,56. Empty uses the account’s own, which is right unless you were told otherwise.':
		'سه عدد، مثل 12,34,56. خالی یعنی مقدار خود اکانت، که درست است مگر اینکه جای دیگری چیز دیگری گفته باشند.',
	'Three numbers with commas between them.': 'سه عدد با ویرگول بینشان.',
	'WARP account': 'اکانت وارپ',
	'warp-plus is not installed.': 'warp-plus نصب نیست.',
	'Free account': 'اکانت رایگان',
	'licence': 'لایسنس',
	'the second account is made on the first connection': 'اکانت دوم در اولین اتصال ساخته می‌شود',
	'WARP+ data left: %s': 'حجم باقی‌مانده WARP+: %s',
	'No account yet. warp-plus makes one the first time it connects, if Cloudflare answers from here; Register makes it now.':
		'هنوز اکانتی نیست. warp-plus در اولین اتصال خودش می‌سازد، اگر کلودفلر از اینجا جواب بدهد. «ثبت‌نام» همین الان می‌سازد.',
	'Registering… this can take a minute.': 'در حال ثبت‌نام… ممکن است یک دقیقه طول بکشد.',
	'A new account replaces this one, and a WARP+ licence on it has to be applied again. Go ahead?':
		'اکانت تازه جای این یکی را می‌گیرد و لایسنس WARP+ باید دوباره روی آن بنشیند. ادامه می‌دهید؟',
	'New account': 'اکانت تازه',
	'Register': 'ثبت‌نام',
	'Registering a WARP account': 'در حال ثبت‌نام اکانت وارپ',
	'Save and apply this config first': 'اول این کانفیگ را ذخیره و اعمال کنید',
	'Carry with warp-plus': 'اجرا با warp-plus',
	'warp-plus sends junk ahead of every WireGuard handshake, which gets it past a filter that drops WireGuard on sight. It needs warp-plus, from App Update. As a pre-proxy or a landing node, the config is still carried by Xray.':
		'warp-plus قبل از هر هندشیک وایرگارد چند بسته بی‌معنی می‌فرستد و همین وایرگارد را از فیلتری که آن را می‌شناسد و می‌بندد رد می‌کند. warp-plus را از صفحه «به‌روزرسانی» نصب کنید. وقتی این کانفیگ «کانفیگ پیش‌پروکسی» یا «کانفیگ فرود» باشد، همچنان Xray آن را اجرا می‌کند.',
	'warp-plus App Path': 'مسیر warp-plus',
	'Only WARP nodes need it. Empty means this program’s own copy in the folder above.':
		'فقط کانفیگ‌های وارپ لازمش دارند. خالی یعنی نسخه خود این برنامه در پوشه بالا.',
	'warp-plus is only needed for WARP nodes: Cloudflare WARP, WARP in WARP, Psiphon behind WARP, and WireGuard nodes set to be carried by it.':
		'وارپ‌پلاس فقط برای کانفیگ‌های از نوع وارپ شامل: وارپ کلودفلر، وارپ در وارپ، سایفون پشت وارپ، و کانفیگ‌های وایرگارد روی وارپ لازم است.',
	'A WARP node needs warp-plus. Install it on the App Update page.': 'کانفیگ وارپ به warp-plus نیاز دارد. از صفحه «به‌روزرسانی» نصبش کنید.',
	'WARP did not connect. The Runtime Logs page says how far it got. Without an account, press Register on the node\'s page while another node is connected; without an answer from WARP, turn Scan on or give another endpoint.':
		'وارپ وصل نشد. صفحه «گزارش‌ها» نشان می‌دهد تا کجا پیش رفت. اگر اکانت ندارد، وقتی کانفیگ دیگری وصل است در صفحه این کانفیگ «ثبت‌نام» را بزنید. اگر وارپ جواب نمی‌دهد، اسکن را روشن کنید یا اندپوینت دیگری بدهید.',
	'warp-plus publishes no build for this router\'s processor.': 'warp-plus برای پردازنده این روتر نسخه‌ای منتشر نکرده است.',
	'unzip is needed to install warp-plus and is not on this router. Press Install dependencies on the settings page.':
		'برای نصب warp-plus برنامه unzip لازم است و روی این روتر نیست. در صفحه تنظیمات «نصب پیش‌نیازها» را بزنید.',
	'The warp-plus download does not match its published checksum - nothing was installed.':
		'فایل دانلودشده warp-plus با چک‌سام منتشرشده‌اش نمی‌خواند؛ چیزی نصب نشد.',
	'The warp-plus download did not contain a program - the address or the release may have changed.':
		'در فایل دانلودشده warp-plus برنامه‌ای نبود؛ شاید آدرس یا نسخه منتشرشده عوض شده باشد.',
	'Cloudflare could not be reached to register a WARP account. Connect through another node first, with Localhost Proxy on, and press Register again.':
		'برای ثبت‌نام اکانت وارپ به کلودفلر دسترسی نبود. اول با یک کانفیگ دیگر وصل شوید، با «پروکسی خود روتر» روشن، و دوباره «ثبت‌نام» را بزنید.',
	'The WARP+ licence was not accepted, so the account is a free one. Check the licence, and that it is not already on five devices.':
		'لایسنس WARP+ قبول نشد و اکانت رایگان ماند. لایسنس را بررسی کنید و اینکه روی پنج دستگاه دیگر فعال نباشد.',
	'That node is not a WARP node.': 'این کانفیگ وارپ نیست.',
	'Where the tunnel comes out': 'محل خروج تونل',
	'This is the node in use.': 'این کانفیگ همین الان در حال استفاده است.',
	'WARP over MASQUE': 'وارپ با MASQUE',
	'MASQUE account': 'اکانت MASQUE',
	'WARP: Cloudflare’s own exit. WARP in WARP: a second WARP behind the first, for an exit address the first does not show. Psiphon behind WARP: an exit in the country chosen below. WARP over MASQUE: WARP reached over HTTP/3 on port 443 rather than WireGuard, for a connection that blocks WireGuard; it needs Vwarp.':
		'وارپ: خروجی خود کلودفلر. وارپ در وارپ: یک وارپ دوم پشت اولی، برای یک IP خروجی دیگر. سایفون پشت وارپ: خروجی از کشوری که پایین‌تر انتخاب می‌کنید. وارپ با MASQUE: وارپ به‌جای وایرگارد از HTTP/3 روی پورت ۴۴۳، برای اینترنتی که وایرگارد را می‌بندد؛ به Vwarp نیاز دارد.',
	'Disguise (noize)': 'پوشش (noize)',
	'Junk and padding sent around the first packets, so that a filter does not recognise WireGuard or MASQUE. Heavier gets past more and connects more slowly. Anything but Off needs Vwarp. WARP over MASQUE with Off is carried by Xray itself when it speaks MASQUE - patterniha’s 26.10.8 or later - and Vwarp is then only needed to register the account.':
		'بسته‌های بی‌معنی و پرکننده دور اولین بسته‌ها، تا فیلتر وایرگارد یا MASQUE را نشناسد. هرچه سنگین‌تر، از فیلترهای بیشتری رد می‌شود و دیرتر وصل می‌شود. هر گزینه‌ای جز «خاموش» به Vwarp نیاز دارد. WARP روی MASQUE با گزینه‌ی «خاموش» را، اگر Xray روی روتر MASQUE را بشناسد (Xray پترنیها 26.10.8 به بعد)، خود Xray اجرا می‌کند؛ آن‌وقت Vwarp فقط برای ثبت حساب لازم است.',
	'Off': 'خاموش',
	'Vwarp App Path': 'مسیر Vwarp',
	'Only WARP nodes over MASQUE or with noize need it. Empty means this program’s own copy in the folder above.':
		'فقط کانفیگ‌های وارپ با MASQUE یا با پوشش لازمش دارند. خالی یعنی نسخه خود این برنامه در پوشه بالا.',
	'Xray (patterniha)': 'Xray (پترنیها)',
	'Vwarp is warp-plus with WARP over MASQUE and noize; WARP nodes that use either need it. Xray (patterniha) is Xray that also carries VLESS and Trojan without TLS to public addresses - configs over Cloudflare’s plain-HTTP ports - which the official Xray refuses; installed beside it, it is used for those configs.':
		'وی‌وارپ همان وارپ‌پلاس است به‌همراه ماسک و پوشش یا نویز. کانفیگ‌های وارپی که از این دو استفاده می‌کنند لازمش دارند. هسته پترنی‌ها نسخه‌ای از ایکس‌ری است که وی‌لس و تروجان بدون TLS را رد نمی‌کند.',
	'This WARP node uses MASQUE or noize, which need Vwarp. Install it on the App Update page.':
		'این کانفیگ وارپ از MASQUE یا پوشش استفاده می‌کند که به Vwarp نیاز دارد. از صفحه «به‌روزرسانی» نصبش کنید.',
	'The Xray download does not match its published checksum - nothing was installed.':
		'فایل دانلودشده Xray با چک‌سام منتشرشده‌اش نمی‌خواند؛ چیزی نصب نشد.',

	'yes': 'بله',
	'no': 'خیر',
	/* Sing-Box/Xray Shunt Rule, on Rule Manage and the rule's own page. */
	'Back to Rule Manage': 'بازگشت به مدیریت قوانین',
	'This shunt rule is not there any more.': 'این قانون شانت دیگر وجود ندارد.',
	'Please note attention to the priority, the higher the order, the higher the priority.': 'به اولویت توجه کنید: هر قانون که بالاتر باشد، اولویت بیشتری دارد.',
	'Please enter a name of your choice.': 'لطفا یک نام دلخواه وارد کنید.',
	'This name already exists.': 'این نام از قبل وجود دارد.',
	'Where this rule sends what it matches is chosen in the Shunt Rule tab of Basic Settings.': 'اینکه این قانون ترافیک مطابق را به کجا بفرستد، در تب «قانون شانت» تنظیمات پایه انتخاب می‌شود.',
	'Plaintext: If this string matches any part of the targeting domain, this rule takes effet. Example: rule \'sina.com\' matches targeting domain \'sina.com\', \'sina.com.cn\' and \'www.sina.com\', but not \'sina.cn\'.': 'متن ساده: اگر این عبارت با هر بخشی از دامنه مقصد جور باشد، قانون اعمال می‌شود. مثال: قانون \'sina.com\' با \'sina.com\'، \'sina.com.cn\' و \'www.sina.com\' جور است، ولی با \'sina.cn\' نه.',
	'Regular expression: Begining with \'regexp:\', the rest is a regular expression. When the regexp matches targeting domain, this rule takes effect. Example: rule \'regexp:\\.goo.*\\.com$\' matches \'www.google.com\' and \'fonts.googleapis.com\', but not \'google.com\'.': 'عبارت باقاعده: با \'regexp:\' شروع می‌شود و بقیه‌اش یک عبارت باقاعده است. وقتی با دامنه مقصد جور باشد، قانون اعمال می‌شود. مثال: قانون \'regexp:\\.goo.*\\.com$\' با \'www.google.com\' و \'fonts.googleapis.com\' جور است، ولی با \'google.com\' نه.',
	'Subdomain (recommended): Begining with \'domain:\' and the rest is a domain. When the targeting domain is exactly the value, or is a subdomain of the value, this rule takes effect. Example: rule \'domain:v2ray.com\' matches \'www.v2ray.com\', \'v2ray.com\', but not \'xv2ray.com\'.': 'زیردامنه (پیشنهادی): با \'domain:\' شروع می‌شود و بقیه‌اش یک دامنه است. وقتی دامنه مقصد دقیقا همین یا زیردامنه آن باشد، قانون اعمال می‌شود. مثال: قانون \'domain:v2ray.com\' با \'www.v2ray.com\' و \'v2ray.com\' جور است، ولی با \'xv2ray.com\' نه.',
	'Full domain: Begining with \'full:\' and the rest is a domain. When the targeting domain is exactly the value, the rule takes effect. Example: rule \'domain:v2ray.com\' matches \'v2ray.com\', but not \'www.v2ray.com\'.': 'دامنه کامل: با \'full:\' شروع می‌شود و بقیه‌اش یک دامنه است. فقط وقتی دامنه مقصد دقیقا همین باشد، قانون اعمال می‌شود. مثال: قانون \'full:v2ray.com\' با \'v2ray.com\' جور است، ولی با \'www.v2ray.com\' نه.',
	'Pre-defined domain list: Begining with \'geosite:\' and the rest is a name, such as geosite:google or geosite:cn.': 'فهرست آماده دامنه‌ها: با \'geosite:\' شروع می‌شود و بقیه‌اش یک نام است، مثل geosite:google یا geosite:ir.',
	'Sing-Box rule-set: Begining with \'rule-set:remote:\' or \'rule-set:local:\'': 'rule-set سینگ‌باکس: با \'rule-set:remote:\' یا \'rule-set:local:\' شروع می‌شود',
	'Such as:': 'مثلا:',
	'Annotation: Begining with #': 'توضیح: با # شروع می‌شود',
	'Not valid domain name, please re-enter!': 'نام دامنه معتبر نیست، دوباره وارد کنید!',
	'IP: such as \'127.0.0.1\'.': 'IP: مثل \'127.0.0.1\'.',
	'CIDR: such as \'127.0.0.0/8\'.': 'CIDR: مثل \'127.0.0.0/8\'.',
	'GeoIP: such as \'geoip:cn\'. It begins with geoip: (lower case) and followed by two letter of country code.': 'GeoIP: مثل \'geoip:ir\'. با geoip: (حروف کوچک) شروع می‌شود و بعد از آن کد دوحرفی کشور می‌آید.',
	'Not valid IP format, please re-enter!': 'قالب IP معتبر نیست، دوباره وارد کنید!',
	'Invert match result.': 'نتیجه تطبیق برعکس می‌شود.',
	'Only support Sing-Box.': 'فقط با Sing-Box کار می‌کند.',
	'With Xray as the active core the rule is left out.': 'وقتی هسته فعال Xray باشد، این قانون کنار گذاشته می‌شود.',
};

/* LuCI's own words - the buttons and messages its form draws for us: Add,
   Edit, Delete, Save & Apply, an empty table. LuCI translates them through
   its own catalogue, which on a router whose LuCI is in English says them in
   English whatever this page's language is. On these pages, in Persian, they
   are said in Persian; the rest of LuCI is left as it was. Kept apart from
   the dictionary above because a word can mean two things - "Close" is
   خاموش on a chain setting and بستن on a window's button. */
var LUCI_FA = {
	'Add': 'افزودن',
	'Edit': 'ویرایش',
	'Delete': 'حذف',
	'Save': 'ذخیره',
	'Save & Apply': 'ذخیره و اعمال',
	'Apply unchecked': 'اعمال بدون بررسی',
	'Reset': 'بازنشانی',
	'Dismiss': 'بستن',
	'Close': 'بستن',
	'This section contains no values yet': 'این بخش هنوز تنظیم نشده است.',
	'Drag to reorder': 'برای جابه‌جایی بکشید',
	'Expand/Collapse': 'باز/بسته',
	'-- custom --': '-- دلخواه --',
	'-- Please choose --': '-- انتخاب کنید --',
	'unspecified': 'تعیین نشده',
	'Yes': 'بله',
	'No': 'خیر',
	'Enabled': 'فعال',
	'Disabled': 'غیرفعال',
	'Unsaved Changes': 'تغییرات ذخیره‌نشده',
	'Changes': 'تغییرات',
	'Revert': 'برگرداندن',
	'Apply': 'اعمال',
	'Configuration changes applied.': 'تغییرات اعمال شد.',
	'Configuration changes have been rolled back!': 'تغییرات برگردانده شد!',
	'Starting configuration apply…': 'در حال شروع اعمال تغییرات…',
	'Applying configuration changes… %ds': 'در حال اعمال تغییرات… %d ثانیه',
	'Waiting for configuration to get applied… %ds': 'در انتظار اعمال تغییرات… %d ثانیه',
	'There are no changes to apply': 'تغییری برای اعمال وجود ندارد',
	'Some fields are invalid, cannot save values!': 'بعضی فیلدها نامعتبرند؛ ذخیره ممکن نیست!',
	'non-empty value': 'مقدار نباید خالی باشد',
	'unique value': 'مقدار یکتا',
	'valid IP address': 'آدرس IP معتبر',
	'valid IPv4 address': 'آدرس IPv4 معتبر',
	'valid IPv6 address': 'آدرس IPv6 معتبر',
	'valid IP address or prefix': 'آدرس یا پیشوند IP معتبر',
	'valid IPv4 address or network': 'آدرس یا شبکه IPv4 معتبر',
	'valid IPv4 CIDR': 'CIDR نوع IPv4 معتبر',
	'valid IPv6 CIDR': 'CIDR نوع IPv6 معتبر',
	'valid IPv4 or IPv6 CIDR': 'CIDR نوع IPv4 یا IPv6 معتبر',
	'valid IPv4 network': 'شبکه IPv4 معتبر',
	'valid IPv6 network': 'شبکه IPv6 معتبر',
	'valid IPv4 address:port': 'آدرس IPv4 همراه پورت (آدرس:پورت) معتبر',
	'valid address:port': 'آدرس:پورت معتبر',
	'valid host:port': 'میزبان:پورت معتبر',
	'valid hostname': 'نام میزبان معتبر',
	'valid hostname or IP address': 'نام میزبان یا آدرس IP معتبر',
	'valid MAC address': 'آدرس MAC معتبر',
	'valid port value': 'شماره پورت معتبر',
	'valid port or port range (port1-port2)': 'پورت یا بازه پورت معتبر (پورت۱-پورت۲)',
	'valid UCI identifier': 'شناسه UCI معتبر',
	'valid integer value': 'عدد صحیح معتبر',
	'valid decimal value': 'عدد اعشاری معتبر',
	'positive integer value': 'عدد صحیح مثبت',
	'positive decimal value': 'عدد اعشاری مثبت',
	'hexadecimal encoded value': 'مقدار هگزادسیمال',
	'valid IP address range': 'بازه آدرس IP معتبر',
	'valid IPv4 address range': 'بازه آدرس IPv4 معتبر',
	'valid IPv6 address range': 'بازه آدرس IPv6 معتبر',
	'valid date (YYYY-MM-DD)': 'تاریخ معتبر (YYYY-MM-DD)',
	'valid time (HH:MM:SS)': 'زمان معتبر (HH:MM:SS)',
	'value with at least %d characters': 'مقداری دست‌کم %d نویسه',
	'value with at most %d characters': 'مقداری حداکثر %d نویسه',
	'value with %d characters': 'مقداری با %d نویسه',
	'value between %d and %d characters': 'مقداری بین %d و %d نویسه',
	'value between %f and %f': 'مقداری بین %f و %f',
	'value greater or equal to %f': 'مقداری بزرگ‌تر یا برابر %f',
	'value smaller or equal to %f': 'مقداری کوچک‌تر یا برابر %f',
	'One of the following: %s': 'یکی از این‌ها: %s',
	'Potential negation of: %s': 'نقیض: %s',
	'%s; %d tokens separated by %s': '%s؛ %d مورد جداشده با %s',
	'Expecting: %s': 'مقدار مورد انتظار: %s'
};

var patched = false;

/* LuCI's _() is one global function, which its form calls as it draws. It is
   wrapped once, and the wrapper only answers for LuCI_FA's words while this
   page is in Persian; anything else goes to LuCI's own as before. */
function patchLuci() {
	if (patched || typeof window._ !== 'function') return;
	var orig = window._;
	window._ = function(s, c) {
		if (LANG === 'fa' && c == null && Object.prototype.hasOwnProperty.call(LUCI_FA, s))
			return LUCI_FA[s];
		return orig.apply(this, arguments);
	};
	patched = true;
}

/* Our own words first, then LuCI's: a page that draws a button of its own
   with a word LuCI also uses - Save, Add - finds it there rather than coming
   out in English. */
/* In English a server on the list is a node; the
   strings say config, the word the Persian text uses. Where config means a
   file of settings, it stays. */
var CONFIG_KEPT = {
	'Use global config': true,
	'Keyword filter method inside the config': true,
	'Export Config File': true,
	'Node Config': true,
	'Socks Config': true,
	'Xray does not speak this protocol, so there is no Xray config file for it.': true,
	'Invalid L2TP config command.': true
};

function nodeWord(s) {
	if (typeof s !== 'string' || CONFIG_KEPT[s]) return s;
	/* Not inside a path or a name: /etc/config, zirgozar.config, config.json. */
	return s.replace(/(^|[^\w\/.-])([Cc])onfig(s?)(?![\w\/-]|\.\w)/g, function(w, before, c, plural) {
		return before + (c === 'C' ? 'Node' : 'node') + plural;
	});
}

function tr(s) {
	if (LANG !== 'fa') return nodeWord(s);
	var v = FA[s];
	if (v === undefined && typeof s === 'string') {
		var m = /^The installed Aether does not support (--[a-z0-9-]+)\.$/.exec(s);
		if (m) v = FA['The installed Aether does not support %s.'].replace('%s', m[1]);
		m = /^Aether has no supported build for ([A-Za-z0-9_-]+)\.$/.exec(s);
		if (m) v = FA['Aether has no supported build for %s.'].replace('%s', m[1]);
		m = /^(Not enough free memory (?:for|to open) the backup file): needs (.+), (.+) free\.$/.exec(s);
		if (m) v = FA[m[1] + ': needs %s, %s free.'].replace('%s', m[2]).replace('%s', m[3]);
		/* A core that downloaded and would not install: its name and the
		   reason are in the sentence, and the reason is said in Persian too
		   when it is one of the known ones. */
		m = /^The (\S+) that was downloaded could not be installed - (.+)\.$/.exec(s);
		if (m) {
			var why = FA[m[2]];
			if (why === undefined) {
				var r = /^it is built for this processor but would not start: (.*)$/.exec(m[2]);
				why = r ? 'برای همین پردازنده ساخته شده ولی اجرا نشد: ' + r[1] : m[2];
			}
			v = FA['The %s that was downloaded could not be installed - %s.'].replace('%s', m[1]).replace('%s', why);
		}
	}
	if (v === undefined && Object.prototype.hasOwnProperty.call(LUCI_FA, s))
		v = LUCI_FA[s];
	return (v === undefined) ? s : v;
}

/* The box everything a view returns has to go in.

   Persian is right to left, and a Persian sentence laid out inside a
   left-to-right box comes apart wherever a Latin word appears in it: the
   browser puts each right-to-left run where the surrounding direction wants
   it and only then reverses the letters within the run, so "…تنظیمات QUIC
   می‌باشد" arrives with its two halves swapped. Setting the direction on one
   element that contains the whole page fixes every string on it at once,
   including the ones LuCI itself draws inside the form.

   Anything that is a sequence rather than a sentence keeps dir="ltr" of its
   own - the fortnight of daily bars, for one. Mirroring those would put
   yesterday to the right of today without saying so. */
function page(children) {
	if (LANG !== 'fa') return E([], children);

	return E('div', { 'dir': 'rtl', 'class': 'zgz-rtl' }, [
		E('style', { 'type': 'text/css' },
			'.zgz-rtl{text-align:right}' +
			'.zgz-rtl [dir="ltr"]{text-align:left}' +
			/* The cross that puts the message away belongs in the corner the
			   text ends at, which is the other one now. */
			'.zgz-rtl #pwp-msg button{float:left}' +
			/* A number with a unit after it is one run and must not be split. */
			'.zgz-rtl .cbi-value-field input,.zgz-rtl .cbi-value-field textarea{' +
			'direction:ltr;text-align:left}'),
		E('div', {}, children)
	]);
}

return baseclass.extend({
	/* Called by each view once it knows what the setting says. Anything other
	   than "fa" is English, including a value nobody has set yet. */
	setLang: function(l) { LANG = (l === 'fa') ? 'fa' : 'en'; if (LANG === 'fa') patchLuci(); },
	get: function() { return LANG; },
	dir: function() { return LANG === 'fa' ? 'rtl' : 'ltr'; },
	page: page,
	tr: tr
});
