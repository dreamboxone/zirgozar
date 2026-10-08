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
	/* -------------------------------------------------------- how long ago */
	'just now': 'همین الان',
	'%d min ago': '%d دقیقه پیش',
	'%d h ago': '%d ساعت پیش',
	'%d days ago': '%d روز پیش',

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
	'in use': 'در حال استفاده',
	'Use': 'استفاده',
	'This is the node the tunnel is using at the moment. Press Disconnect, or Choose again, before deleting it.':
		'این همان کانفیگی است که تونل الان از آن استفاده می‌کند. قبل از حذفش «قطع» یا «انتخاب دوباره» را بزنید.',
	'Connecting through %s…': 'در حال اتصال از راه %s…',
	'Nothing read yet. Read the subscriptions on Node Subscribe, or turn on the main switch in Basic Settings.':
		'هنوز چیزی خوانده نشده. اشتراک‌ها را در صفحه «اشتراک کانفیگ‌ها» بخوانید، یا کلید اصلی را در «تنظیمات پایه» روشن کنید.',
	'Where nodes come from, and which ones to add by hand. Changes take effect the next time the list is read.':
		'کانفیگ‌ها از کجا می‌آیند، و کدام‌ها را دستی اضافه می‌کنید. تغییرات از دفعه بعدی که لیست خوانده شود اعمال می‌شوند.',
	'Which nodes to use': 'از کدام کانفیگ‌ها استفاده شود',
	'Nodes to use': 'کانفیگ‌های مورد استفاده',
	'This decides who may be measured, not who wins: whichever node answers fastest is the one used, wherever it came from. A node added by hand joins the list rather than replacing it. To insist on one node, press “Use” beside it below.':
		'تعیین می‌کند کدام کانفیگ‌ها آزمایش شوند؛ از بین آن‌ها هر کدام سریع‌تر باشد استفاده می‌شود. برای استفاده از یک کانفیگ مشخص، کنارش در پایین صفحه «استفاده» را بزنید.',
	'All configs': 'همه کانفیگ‌ها',
	'Only manually added configs': 'فقط کانفیگ‌های دستی',
	'Only the subscriptions': 'فقط اشتراک‌ها',
	'Subscriptions': 'اشتراک‌ها',
	'Fetched every fifteen minutes. Xray, sing-box, Hysteria, Clash and WireGuard files are accepted, as are a plain list of links and a single base64 block.':
		'هر پانزده دقیقه یک بار خوانده می‌شود. فایل‌های Xray، sing-box، Hysteria، Clash و وایرگارد پذیرفته می‌شوند، و همین‌طور لیست ساده‌ای از لینک‌ها یا یک بلوک base64.',
	'Name': 'نام',
	'Address': 'آدرس',
	'Must start with http:// or https://': 'باید با ‎http://‎ یا ‎https://‎ شروع شود',
	'On': 'فعال',
	'Nodes added manually': 'ورود دستی کانفیگ‌ها',
	'One share link per entry — vless, vmess, trojan, shadowsocks, socks, hysteria2, tuic or wireguard. A whole WireGuard .conf file can be pasted in as it stands. These are tried before the subscription list. The three test columns each measure something different; press one to run it.':
		'هر ردیف یک لینک کانفیگ است: vless، vmess، trojan، shadowsocks، socks، hysteria2، tuic یا wireguard. فایل .conf وایرگارد را هم می‌شود کامل چسباند. این کانفیگ‌ها قبل از کانفیگ‌های اشتراک آزمایش می‌شوند. برای اجرای هر آزمایش روی ستون آن بزنید.',
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
	'Choose again': 'انتخاب دوباره',
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
		'بررسی اینکه از %d کانفیگ کدام‌ها اصلا جواب می‌دهند — تا اینجا %d',
	'Measuring the %d that answered, best first — %d done':
		'اندازه‌گیری %d کانفیگی که جواب دادند، بهترین اول — %d انجام شد',
	'%d of %d nodes answered, but none completed a request':
		'%d کانفیگ از %d جواب دادند، ولی هیچ‌کدام یک درخواست را کامل نکرد',
	'No node on the list answered at all': 'هیچ کانفیگی در لیست جواب نداد',

	/* ------------------------------------------------------------- the log */
	'Log': 'لاگ',
	'The last few hundred lines this program wrote to the system log, newest at the bottom. It refreshes every five seconds. Nothing here is stored by this package — it is the router’s own log, and it is emptied when the router restarts.':
		'چند صد خط آخری که این برنامه در لاگ سیستم نوشته، تازه‌ترین در پایین. هر پنج ثانیه تازه می‌شود. هیچ‌کدام از این‌ها را خود پکیج ذخیره نمی‌کند — لاگ خود روتر است و با ریستارت روتر پاک می‌شود.',
	/* The lines themselves are never translated: they are the router's own
	   log, written in English with paths and numbers in them, and a Persian
	   rendering of half of them would be a worse thing to read than either. */
	'Nothing has been logged yet.': 'هنوز چیزی در لاگ نوشته نشده.',
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
		'استفاده از بیت‌تورنت موجب انسداد سرور فیلترشکن و قطع دائمی کانفیگ شما می‌گردد.',

	'Network': 'شبکه',
	'Name lookups': 'روش پیدا کردن دامنه‌ها',
	'“Through dnsmasq” keeps local machine names and DHCP names working and moves only the outside lookups into the tunnel. “Straight into the tunnel” resolves outside names and loses the ones on your own network.':
		'تعیین می‌کند درخواست‌های DNS دستگاه‌ها چطور به فیلترشکن برسند. «از راه dnsmasq»: نام دستگاه‌های داخل شبکه (مثل پرینتر) کار می‌کند و فقط سایت‌های اینترنتی از فیلترشکن پرسیده می‌شوند. «مستقیم داخل تونل»: همه درخواست‌ها به فیلترشکن می‌روند و نام دستگاه‌های داخل شبکه دیگر پیدا نمی‌شود.',
	'Through dnsmasq (recommended)': 'از راه dnsmasq (پیشنهادی)',
	'Straight into the tunnel': 'مستقیم داخل تونل',
	'Leave alone': 'دست نزن',
	'Force DNS through the router': 'اجبار DNS از راه روتر',
	'Some devices ignore the router and ask 8.8.8.8 or 1.1.1.1 themselves. Those questions leave without the tunnel, so the answer is whatever the censor wants it to be, and the device then connects to it — looking perfectly healthy while doing so. This drags such queries back to the router. Leave it on unless a device on your network genuinely has to reach a DNS server of its own.':
		'بعضی دستگاه‌ها DNS روتر را نادیده می‌گیرند و مستقیم از 8.8.8.8 یا 1.1.1.1 می‌پرسند. این درخواست‌ها بدون فیلترشکن می‌روند و جواب فیلترشده می‌گیرند، پس سایت باز نمی‌شود. این گزینه آن‌ها را به روتر برمی‌گرداند تا جواب درست بگیرند. روشن بماند.',
	'IPv6': 'IPv6',
	'Almost no node on a free list carries IPv6, and a client that prefers it leaves without the tunnel while looking perfectly fine. Refusing it makes the client fall back to IPv4, which is tunnelled.':
		'تقریبا هیچ کانفیگ رایگانی IPv6 ندارد و دستگاهی که از IPv6 استفاده کند بدون فیلترشکن بیرون می‌رود. با رد کردن IPv6، دستگاه‌ها از IPv4 استفاده می‌کنند که از فیلترشکن می‌رود.',
	'Refuse it while connected (recommended)': 'تا وقتی وصل است رد شود (پیشنهادی)',
	'Leave it alone': 'دست نزن',
	'Refuse QUIC': 'رد کردن QUIC',
	'Makes browsers fall back to TCP. Automatic refuses it while the node in use goes through a CDN (WebSocket, XHTTP, gRPC) - a Cloudflare Worker cannot carry UDP at all - and lets it through otherwise, where QUIC is faster.':
		'مرورگرها را به TCP برمی‌گرداند. حالت خودکار وقتی کانفیگ فعلی از CDN رد می‌شود (WebSocket، XHTTP، gRPC) QUIC را می‌بندد، چون ورکر کلودفلر اصلاً UDP را جابه‌جا نمی‌کند. در بقیهٔ حالت‌ها QUIC باز می‌ماند چون سریع‌تر است.',
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
		'انتخاب در دو مرحله است: اول یک آزمایش سریع روی کانفیگ‌ها، بعد آزمایش واقعی روی آن‌هایی که جواب داده‌اند، هر بار %d کانفیگ (حداکثر %d دسته) و بهترین‌ها اول. با پیدا شدن اولین کانفیگ سریع‌تر از %d میلی‌ثانیه کار تمام می‌شود؛ برای همین اتصال چند ثانیه طول می‌کشد، نه یک دقیقه. وایرگارد پورت TCP ندارد و مرحله اول را رد می‌کند؛ hysteria2 و tuic و OpenVPN در انتخاب خودکار شرکت نمی‌کنند.',
	'First pass': 'مرحله اول',
	'A TCP handshake to the node’s real port is the right test. A ping is quicker and wrong often enough to matter: a node behind a CDN answers pings at the edge whatever state it is in, and plenty of working nodes drop ICMP entirely.':
		'روش آزمایش سریع. «هندشیک TCP» اتصال به پورت واقعی کانفیگ است و دقیق‌تر است. «پینگ» سریع‌تر است ولی اشتباه زیاد دارد: کانفیگ‌های پشت CDN همیشه جواب می‌دهند و خیلی از کانفیگ‌های سالم به پینگ جواب نمی‌دهند.',
	'TCP handshake (recommended)': 'هندشیک TCP (پیشنهادی)',
	'Ping, then handshake': 'پینگ، بعد هندشیک',
	'Good enough (ms)': 'به‌قدر کافی خوب (میلی‌ثانیه)',
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
		'آمار مصرف هر چند دقیقه روی حافظه دائمی روتر ذخیره شود. با قطع برق، آماری که هنوز ذخیره نشده از دست می‌رود.',

	'Does this router have what it needs?': 'آیا این روتر آنچه لازم دارد را دارد؟',
	'Router requirements': 'پیش‌نیازهای روتر',
	'Everything is ready': 'همه چیز آماده است',
	'Details': 'جزئیات',
	'Restore defaults': 'بازگشت به حالت پیش‌فرض',
	'Tick and save to delete every config and subscription and put every setting back as it was when the program was installed. The routing data, the downloaded cores and the traffic history are kept. There is no undo.':
		'کانفیگ‌ها و اشتراک‌ها حذف می‌شوند و تنظیمات به حالت زمان نصب برمی‌گردند. داده‌های مسیریابی، هسته‌های دانلودشده و تاریخچه مصرف حفظ می‌شوند. این کار برگشت‌پذیر نیست.',
	'Every config, every subscription and every setting will be deleted when you save. Continue?':
		'با ذخیره کردن، همه کانفیگ‌ها، اشتراک‌ها و تنظیمات پاک می‌شوند. ادامه می‌دهید؟',
	'%s (pre-release)': '%s (پیش‌انتشار)',
	'Install this version': 'نصب این نسخه',
	'Downloading Xray %s.': 'در حال دانلود Xray %s.',
	'Show the address': 'نمایش آدرس',
	'Hide the address': 'پنهان کردن آدرس',
	'Hide details': 'بستن جزئیات',
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
	'the router can fetch over HTTPS': 'روتر می‌تواند از HTTPS دانلود کند',
	'certificates are missing or the connection is blocked — nothing can be downloaded':
		'گواهی‌ها نیستند یا اتصال مسدود است — هیچ چیزی دانلود نمی‌شود',
	'Firewall in use': 'فایروال در حال استفاده',
	'none found': 'چیزی پیدا نشد',
	'Packages': 'پکیج‌ها',
	'%d missing': '%d مورد کم است',
	'everything needed is installed': 'هرچه لازم بود نصب است',
	'Install them': 'نصبشان کن',
	'Installing. This needs a working connection and may take a minute.':
		'در حال نصب. به یک اتصال سالم نیاز دارد و ممکن است یک دقیقه طول بکشد.',

	'Addresses (geoip.dat)': 'آدرس‌ها (geoip.dat)',
	'Names (geosite.dat)': 'نام‌ها (geosite.dat)',
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
	'Remove both': 'حذف هر دو',
	'Routing data removed.': 'داده مسیریابی حذف شد.',
	'The full files are about 17 MB and 8 MB. If they will not fit, the same project publishes geoip-lite.dat (38 KB) and geosite-lite.dat (2 MB), which carry the Iranian categories and nothing else — put those addresses in the boxes above. A download that will not fit is refused rather than half written.':
		'فایل‌های کامل حدود ۱۷ و ۸ مگابایت هستند. اگر جا نمی‌شوند، همان پروژه ‎geoip-lite.dat‎ (۳۸ کیلوبایت) و ‎geosite-lite.dat‎ (۲ مگابایت) را هم منتشر می‌کند که فقط دسته‌های ایرانی را دارند — آدرس آن‌ها را در کادرهای بالا بگذارید. دانلودی که جا نشود رد می‌شود، نه اینکه نصفه نوشته شود.',

	'Cores': 'هسته‌ها',
	'installed': 'نصب‌شده',
	'not installed': 'نصب نشده',
	'no build for this router': 'برای پردازنده این روتر نسخه‌ای منتشر نشده',
	'latest is %s': 'آخرین نسخه %s است',
	'Update to %s': 'به‌روزرسانی به %s',
	'Install': 'نصب',
	'Downloading %s.': 'در حال دانلود %s.',
	'Remove': 'حذف',
	'%s removed.': '%s حذف شد.',
	'Check for new versions': 'بررسی نسخه‌های جدید',
	'Checking the latest version. It will be shown in a moment.':
		'آخرین نسخه در حال بررسی است و تا لحظاتی دیگر نمایش داده می‌شود.',
	'(installed by another package — left alone)':
		'(توسط پکیج دیگری نصب شده — دست‌نخورده مانده)',
	'Xray carries the traffic. sing-box and hysteria are only needed for nodes that speak hysteria2 or tuic, which Xray does not — one of them is then run as a local helper for that one node, and everything else works exactly as before.':
		'ترافیک را Xray می‌برد. sing-box و hysteria فقط برای کانفیگ‌های hysteria2 و tuic لازم‌اند که Xray پشتیبانی نمی‌کند؛ در آن صورت فقط برای همان کانفیگ کنار Xray اجرا می‌شوند.',

	'Traffic history': 'تاریخچه مصرف',
	'Forget all recorded traffic': 'حذف تاریخچه مصرف',
	'Traffic history cleared.': 'تاریخچه مصرف پاک شد.',

	/* --------------------------------------------------- the traffic rules */
	'Traffic Rules': 'قوانین ترافیکی',
	'Sites with a rebind weakness': 'سایت‌های دارای ضعف امنیتی Rebind Attack',
	'Some sites answer with a private address — Iranian banks and government services among them, which resolve to 10.x addresses inside the country. The router’s DNS protection against rebind attacks refuses those answers, and the site simply does not open. Every name listed here is excused from that protection, together with everything under it.':
		'بعضی سایت‌های ایرانی، مثل بانک‌ها و سرویس‌های دولتی، آدرس داخلی (10.x) دارند. روتر برای امنیت این جواب‌ها را رد می‌کند و سایت باز نمی‌شود. سایت‌هایی که اینجا بنویسید، با زیردامنه‌هایشان، از این محدودیت معاف می‌شوند.',
	'Domains': 'دامنه‌ها',
	'That does not look like a domain name': 'این شبیه یک نام دامنه نیست',
	'Direct addresses': 'IPهای مستقیم',
	'These addresses always go straight out, never through the tunnel. One address or one range per entry.':
		'این آدرس‌ها همیشه مستقیم می‌روند و هیچ‌وقت از تونل رد نمی‌شوند. در هر ردیف یک آدرس یا یک رنج.',
	'Addresses': 'آدرس‌ها',
	'Sing-Box-LX App Path': 'مسیر برنامه Sing-Box-LX',
	'The sing-box build that speaks xhttp. Empty means this program’s own copy in the folder above.': 'نسخه‌ای از sing-box که xhttp را می‌فهمد. خالی یعنی نسخه خود این برنامه در پوشه بالا.',
	'Active core': 'هسته فعال',
	'Auto measures the nodes and uses the fastest. A node chosen here - added by hand or from a subscription - is used as it is, and nothing is measured. A subscription’s node is found again each time its list is read, as PassWall2 does.': 'خودکار کانفیگ‌ها را می‌سنجد و سریع‌ترین را برمی‌دارد. کانفیگی که اینجا انتخاب شود - دستی یا از اشتراک - همان‌طور استفاده می‌شود و سنجیده نمی‌شود. کانفیگ اشتراک هر بار که فهرستش دوباره خوانده می‌شود، مثل پسوال۲ دوباره پیدا می‌شود.',
	'Nodes to use was set to manually added configs only, so the subscriptions could not be used. It is now set to all configs.': 'گزینه «کانفیگ‌هایی که استفاده شوند» روی «فقط کانفیگ‌های دستی» بود و اشتراک‌ها استفاده نمی‌شدند. حالا روی «همه کانفیگ‌ها» گذاشته شد.',
	'Traffic statistics': 'آمار ترافیک',
	'Shows the tunnel traffic.': 'ترافیک فیلترشکن را نشان می‌دهد.',
	'AmneziaWG needs sing-box-lx, the build that has it. Install it on the App Update page.': 'AmneziaWG به sing-box-lx نیاز دارد، همان نسخه‌ای که آن را دارد. از صفحه «به‌روزرسانی» نصبش کنید.',
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
		'خودکار: Xray، و برای کانفیگی که Xray اجرا نمی‌کند sing-box. Xray (patterniha): اول هستهٔ پترنیها، و QUIC مثل PattN بسته می‌شود. با sing-box یا sing-box-lx همه کانفیگ‌ها با آن اجرا می‌شوند؛ اگر راه نیفتد، Xray جایش را می‌گیرد. کانفیگ OpenVPN همیشه با خود OpenVPN اجرا می‌شود، کنار هر هسته‌ای که اینجا انتخاب شده باشد؛ آن را از صفحه‌ی «به‌روزرسانی» نصب کنید.',
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
	'Dark': 'تیره',
	'Display mode': 'حالت نمایش',
	'Status': 'وضعیت',
	'Complete tunnel management on your router': 'مدیریت کامل فیلترشکن در روتر شما',
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
	'Touch Check': 'برای بررسی بزنید',
	'Google Connection': 'اتصال گوگل',
	'GitHub Connection': 'اتصال گیت‌هاب',

	/* ------------------------------------------------ the settings tabs */
	'Node selection': 'انتخاب کانفیگ',
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
	'An address, or an address and the server’s own IP after a comma so its name is never itself a lookup.':
		'آدرس DoH را وارد کنید. می‌توانید بعد از آن یک کاما و IP همان سرور را بنویسید تا برای پیدا کردن خود سرور DNS نیازی به درخواست نباشد.',
	'DoH request address': 'آدرس درخواست DoH',
	'Format must be:': 'قالب باید این باشد:',
	'Remote DNS EDNS Client Subnet': 'EDNS Client Subnet برای DNS راه دور',
	'Tells the DNS server where the client is, so that a CDN can answer with an edge near it. It cannot be a private address, and the server has to support EDNS Client Subnet (RFC 7871).':
		'یک IP عمومی از شهر یا کشورتان وارد کنید تا سرور DNS نزدیک‌ترین سرور سایت‌ها را به شما بدهد. IP خصوصی قبول نیست. اگر مطمئن نیستید خالی بگذارید.',
	'Remote DNS Outbound': 'مسیر DNS راه دور',
	'Remote': 'از تونل',
	'Direct': 'مستقیم',
	'Answers with a made-up address and lets the tunnel find the real one at the far end, which saves a lookup on every new site. Only takes effect with “Straight into the tunnel” above: with dnsmasq in front, the router’s own lookups would be made up too, and nothing the router fetches for itself would work.':
		'به جای آدرس واقعی یک آدرس موقت ساختگی داده می‌شود و آدرس واقعی در سمت سرور پیدا می‌شود؛ سایت‌های تازه کمی سریع‌تر باز می‌شوند. فقط با «مستقیم داخل تونل» کار می‌کند.',
	'Remote Query Strategy': 'روش درخواست DNS راه دور',
	'Domain Override': 'جایگزینی دامنه',
	'One per line: a name, a space, and the address it should resolve to.':
		'هر خط یک نام، یک فاصله، و آدرسی که برای آن نام برگردانده شود؛ مثل: example.com 1.2.3.4',
	'DNS Redirect': 'تغییر مسیر DNS',

	'Preproxy': 'پیش‌پروکسی',
	'Every node the tunnel may choose dials out through this node first — PassWall2’s pre-proxy. For a node that cannot be reached from here directly, or to hide which nodes are being used. With it on, the first-pass handshake is skipped, because no node is reached directly.':
		'هر کانفیگی که تونل انتخاب کند، اول از داخل این نود رد می‌شود. برای نودی که از اینجا مستقیم در دسترس نیست، یا برای پنهان کردن اینکه از کدام نودها استفاده می‌شود. وقتی روشن است، هندشیک مرحله اول انجام نمی‌شود، چون به هیچ نودی مستقیم وصل نمی‌شویم.',
	'Preproxy Node': 'کانفیگ پیش‌پروکسی',
	'Nodes added by hand on the Configs page.': 'کانفیگ‌هایی که در صفحه کانفیگ‌ها دستی اضافه شده‌اند.',
	'Fragment': 'فرگمنت',
	'TCP fragments, which can deceive the censorship system in some cases, such as bypassing SNI blacklists.':
		'اولین بسته‌های اتصال تکه‌تکه فرستاده می‌شوند تا فیلترینگ نتواند نام سایت (SNI) را تشخیص دهد. برای وقتی که کانفیگ‌ها به خاطر فیلتر SNI وصل نمی‌شوند.',
	'Fragment Packets': 'بسته‌های فرگمنت',
	'“tlshello” splits the TLS client hello. “1-3” splits at the TCP layer, the first one to three writes the client makes.':
		'tlshello: فقط پیام شروع TLS تکه می‌شود (پیشنهادی). 1-3: یک تا سه بسته اول TCP تکه می‌شوند.',
	'Fragment Length': 'طول فرگمنت',
	'Fragmented packet length (byte)': 'طول هر تکه (بایت)',
	'Fragment Delay': 'تاخیر فرگمنت',
	'Fragmentation interval (ms)': 'فاصله بین تکه‌ها (میلی‌ثانیه)',
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
	'Enable Node Log': 'لاگ کانفیگ فعال باشد',
	'What the core itself says, shown on the Log page beside this program’s own runtime log.':
		'چیزهایی که خود هسته می‌گوید، که در صفحه لاگ کنار لاگ خود برنامه نشان داده می‌شود.',
	'Log Level': 'سطح لاگ',
	'Traffic: written every (Min)': 'ترافیک: ذخیره هر (دقیقه)',
	'Xray Noise Packets': 'بسته‌های نویز Xray',
	'To send noise packets, select "Noise" in Xray Settings.':
		'برای فرستادن بسته‌های نویز، «نویز» را در زبانه Xray روشن کنید.',
	'Type': 'نوع',
	'Packet | Rand Length': 'بسته | طول تصادفی',
	'Delay (ms)': 'تاخیر (میلی‌ثانیه)',

	/* -------------------------------------------------------- App Update */
	'App Update': 'به‌روزرسانی',
	'%s is available': 'نسخه %s آماده است',
	'It is the latest version': 'آخرین نسخه است',
	'Check update': 'بررسی به‌روزرسانی',
	'Force update': 'به‌روزرسانی اجباری',
	'The update button downloads the new version from GitHub and installs it. The settings are kept.':
		'دکمه به‌روزرسانی نسخه جدید را از گیت‌هاب دانلود و نصب می‌کند. تنظیمات حفظ می‌شوند.',
	'Downloading and installing the new version. This takes a minute or two; the page reloads by itself when it is done.':
		'در حال دانلود و نصب نسخه جدید. یکی دو دقیقه طول می‌کشد؛ وقتی تمام شد صفحه خودش دوباره بارگذاری می‌شود.',
	'Updated to %s.': 'به نسخه %s به‌روز شد.',
	'This router does not say what processor it has.': 'این روتر نوع پردازنده‌اش را اعلام نمی‌کند.',
	'No package manager found on this router.': 'روی این روتر مدیر پکیج پیدا نشد.',
	'GitHub could not be reached.': 'به گیت‌هاب دسترسی نیست.',
	'The latest release has no package for this router.': 'آخرین انتشار پکیجی برای این روتر ندارد.',
	'The latest release is incomplete.': 'آخرین انتشار ناقص است.',
	'Download failed.': 'دانلود ناموفق بود.',
	'A downloaded file does not match the release\'s checksum - nothing was installed.':
		'فایل دانلودشده با چک‌سام انتشار جور نیست - چیزی نصب نشد.',
	'The package manager refused the new version. The Log page has the details.':
		'مدیر پکیج نسخه جدید را نپذیرفت. جزئیات در صفحه لاگ است.',
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
	'Folder for downloaded cores': 'پوشه هسته‌های دانلودشده',
	'Point this at USB storage on a router short of flash. A core another package installed is used where it is and never moved.':
		'روی روتری که حافظه‌اش کم است، این را روی حافظه USB بگذارید. هسته‌ای که پکیج دیگری نصب کرده همان‌جا که هست استفاده می‌شود و جابه‌جا نمی‌شود.',
	'Xray App Path': 'مسیر Xray',
	'Empty means: whichever Xray on this router accepts the configuration, preferring one already installed.':
		'خالی یعنی برنامه خودش Xray مناسب را پیدا می‌کند، و اگر Xray از قبل نصب باشد همان را استفاده می‌کند.',

	/* ------------------------------------------------------ Runtime Logs */
	'Runtime Logs': 'لاگ‌های اجرا',
	'The node log is switched off in Settings → Log.': 'لاگ کانفیگ در تنظیمات پایه، برگه لاگ، خاموش است.',
	'The core has not said anything yet.': 'هسته هنوز چیزی نگفته.',
	'What Zirgozar does is shown here, refreshed every 5 seconds. It is emptied when the router reboots.':
		'اقدامات برنامه زیرگذر در این بخش نمایش داده می‌شود که هر 5 ثانیه به‌روز می‌شود. پس از ریبوت روتر پاک می‌شود.',
	'Clear logs': 'پاک کردن لاگ‌ها',
	'Node log': 'لاگ کانفیگ',
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
	'The tunnel on or off - the same switch as on the Status page. It holds across a reboot.':
		'روشن یا خاموش بودن تونل — همان کلید صفحه وضعیت. بعد از ریستارت هم همان‌طور می‌ماند.',
	'Auto measures the nodes and uses the fastest. A node added by hand is used as it is, and nothing is measured.':
		'خودکار: همه کانفیگ‌ها آزمایش می‌شوند و سریع‌ترین انتخاب می‌شود. اگر یک کانفیگ دستی انتخاب کنید، همیشه از همان استفاده می‌شود و آزمایشی انجام نمی‌شود.',
	'Auto (fastest)': 'خودکار (سریع‌ترین)',
	'Localhost Proxy': 'پروکسی خود روتر',
	'When selected, the router’s own traffic goes through the tunnel as well — its downloads, its clock, its package manager, and so the routing data and the cores from GitHub. While a node is being measured or a subscription read it goes direct, so the router can always repair its own tunnel. On by default, as in PassWall2.':
		'اگر روشن باشد، اینترنت خود روتر هم از فیلترشکن می‌رود؛ مثل دانلود هسته‌ها، فایل‌های مسیریابی و پکیج‌ها از گیت‌هاب. هنگام آزمایش کانفیگ‌ها و خواندن اشتراک، روتر موقتا مستقیم وصل می‌شود تا اگر تونل قطع شد بتواند خودش را درست کند.',
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
		'پیام‌های هسته Xray ثبت شوند و در صفحه «لاگ‌های اجرا»، بخش «لاگ کانفیگ» نمایش داده شوند.',
	'Waiting for the router…': 'در انتظار پاسخ روتر…',

	/* ----------------------------------------------------------- units */
	'TB': 'ترابایت',
	'GB': 'گیگابایت',
	'MB': 'مگابایت',
	'KB': 'کیلوبایت',
	'B': 'بایت',
	'ms': 'میلی‌ثانیه',

	/* ------------------------------------------------- Other Settings */
	'Other Settings': 'تنظیمات دیگر',
	'Delay Settings': 'تنظیمات تاخیر',
	'Open and close Daemon': 'بررسی و ترمیم خودکار',
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
	'TPROXY carries TCP and UDP on one port. REDIRECT sends TCP to a port of its own, for a kernel whose TPROXY misbehaves with TCP; UDP is always TPROXY.':
		'TPROXY روش پیشنهادی است و TCP و UDP را با هم می‌برد. REDIRECT فقط برای روترهایی است که TPROXY آن‌ها با TCP مشکل دارد.',
	'Hijacking ICMP (PING)': 'پاسخ به پینگ (ICMP)',
	'A tunnel carries no ICMP, so a ping to a tunnelled address never comes back. With this on, the router answers it.':
		'فیلترشکن پینگ را عبور نمی‌دهد، پس پینگ گرفتن از سایت‌ها جواب نمی‌دهد. اگر روشن باشد، خود روتر به این پینگ‌ها جواب می‌دهد (عدد پینگ واقعی نیست).',
	'Direct IP List': 'لیست IPهای مستقیم',
	'These had been joined ip addresses will connect directly (not entering the core).':
		'این آدرس‌ها مستقیم وصل می‌شوند و وارد هسته نمی‌شوند.',
	'Xray Settings': 'تنظیمات Xray',
	'Override the connection destination address': 'جایگزینی آدرس مقصد اتصال',
	'Override the connection destination address with the sniffed domain. Otherwise the sniffed domain is used for routing only.':
		'اگر روشن باشد، سرور به جای آدرسی که دستگاه داده، به نام سایت وصل می‌شود؛ حتی اگر دستگاه آدرس فیلترشده گرفته باشد سایت باز می‌شود. اگر خاموش باشد، نام سایت فقط برای مسیریابی استفاده می‌شود.',
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
	'Shunt Rule': 'قانون عبور',
	'Shunt Rule Group': 'گروه قانون عبور',
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
		'هنوز قانون عبوری وجود ندارد. با دکمه پایین یکی اضافه کنید.',
	'AsIs: only the name is used for routing. IPIfNonMatch: when no rule matches the name, it is resolved to addresses and all the rules are tried again. IPOnDemand: whenever an address rule is met, the name is resolved at once. Auto chooses IPIfNonMatch when a rule or the Iran split has addresses in it, and AsIs otherwise.':
		'اگر برای سایتی بر اساس نامش قانونی پیدا نشود چه کار شود. AsIs: فقط نام بررسی می‌شود (سریع‌تر). IPIfNonMatch: اگر هیچ قانونی با نام جور نشد، IP سایت پیدا می‌شود و قانون‌های IP هم بررسی می‌شوند. IPOnDemand: برای هر قانون IP، آدرس سایت فورا پیدا می‌شود. خودکار: اگر قانونی با IP دارید IPIfNonMatch، وگرنه AsIs.',
	'Which traffic each rule is about. Where it goes — a node, direct, or blocked — is chosen in the Shunt Rule tab of Basic Settings. The rules steer the tunnel’s own traffic, in this order, ahead of the Iran split; a device with a node of its own on the Access Control page keeps it.':
		'هر قانون مشخص می‌کند درباره کدام ترافیک است. اینکه آن ترافیک کجا برود (یک کانفیگ، مستقیم یا مسدود) در زبانه «قانون عبور» صفحه «تنظیمات پایه» انتخاب می‌شود. قانون‌ها به همین ترتیب و پیش از جداسازی ایران روی ترافیک تونل اعمال می‌شوند. دستگاهی که در «کنترل دسترسی» کانفیگ جداگانه دارد، همان را نگه می‌دارد.',
	'A device’s address, a range such as 192.168.1.0/24, or geoip:private.':
		'آدرس یک دستگاه، یک محدوده مثل 192.168.1.0/24، یا geoip:private.',
	'Such as 443, 80,443 or 1000-2000.': 'مثل 443 یا 80,443 یا 1000-2000.',
	'One a line. domain:example.com is that name and everything under it; full: that name only; regexp: a regular expression; keyword: or a plain word anywhere in the name; geosite: a list from the routing data. A line starting with # is a comment.':
		'هر خط یک مورد. domain:example.com یعنی این سایت و همه زیردامنه‌هایش. full:example.com فقط خود این نام. keyword:google یا فقط google یعنی هر سایتی که این کلمه در نامش باشد. geosite:google یعنی فهرست آماده سایت‌های گوگل. regexp: یک الگوی پیشرفته. خطی که با # شروع شود نادیده گرفته می‌شود.',
	'One a line: an address, a range such as 10.0.0.0/8, or geoip: and a country code from the routing data. A line starting with # is a comment.':
		'هر خط یک مورد: یک IP، یک محدوده مثل 10.0.0.0/8، یا فهرست IP یک کشور یا سرویس مثل geoip:ir یا geoip:telegram. خطی که با # شروع شود نادیده گرفته می‌شود.',
	'Rule Manage': 'مدیریت قوانین',
	'FakeDNS Main switch': 'کلید اصلی FakeDNS',
	'Close window': 'بستن',
	'Add': 'افزودن',
	'Default Preproxy': 'پیش‌پراکسی پیش‌فرض',
	'Geoview': 'موقعیت‌یاب',
	'Geoview App Path': 'مسیر برنامه Geoview',
	'Only the Geoview page needs it. Empty means this program’s own copy in the folder above.':
		'فقط صفحه «موقعیت‌یاب» به آن نیاز دارد. خالی یعنی نسخه خود این برنامه در پوشه بالا.',
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
		'داده‌های مسیریابی روی روتر را با Geoview جست‌وجو می‌کند: یک دامنه یا آدرس در کدام فهرست‌هاست، و یک فهرست مثل geosite:ir چه چیزهایی دارد. برای نوشتن قانون‌های عبور مفید است.',
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
	'Chained proxy works only with Xray nodes; a hysteria2 or tuic node of this subscription is left out of a landing chain. Only support a layer of proxy.':
		'زنجیره فقط برای کانفیگ‌های Xray است و فقط یک لایه دارد. کانفیگ‌های hysteria2 و tuic این اشتراک در حالت «کانفیگ فرود» استفاده نمی‌شوند.',
	'Every node of this subscription is reached through the one chosen here.':
		'همه کانفیگ‌های این اشتراک از طریق کانفیگی که اینجا انتخاب می‌شود وصل می‌شوند.',
	'Traffic goes through a node of this subscription first and leaves from the one chosen here.':
		'ترافیک اول از یک کانفیگ این اشتراک عبور می‌کند و از کانفیگی که اینجا انتخاب می‌شود خارج می‌شود.',
	'Add the node via the link': 'افزودن با لینک',
	'Enter share links, one per line. Subscription links are not supported!': 'لینک‌های کانفیگ را وارد کنید، هر خط یک لینک. لینک اشتراک پذیرفته نمی‌شود!',
	'Please enter the correct link.': 'لطفا لینک درست وارد کنید.',
	'None of those could be read as a node.': 'هیچ‌کدام از این‌ها به‌عنوان کانفیگ خوانده نشد.',
	'No node is selected.': 'هیچ کانفیگی انتخاب نشده است.',
	'Reassign Group': 'تغییر گروه',
	'The group for the %d nodes selected. Empty is the default group.': 'گروه برای %d کانفیگ انتخاب‌شده. خالی یعنی گروه پیش‌فرض.',
	'Letters, digits, space, dot, dash and underscore only.': 'فقط حروف، عدد، فاصله، نقطه، خط تیره و زیرخط.',
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
	'Sing-Box App Path': 'مسیر برنامه Sing-Box',
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
	'Rollback': 'بازگشت به نسخه قبل',
	'Put back. Reconnect for it to take effect.': 'نسخه قبلی برگردانده شد. برای اعمال، تونل را دوباره راه‌اندازی کنید.',
	'That file could not be put back.': 'آن فایل برگردانده نشد.',
	'unknown file': 'فایل ناشناخته',
	'Not valid, please re-enter: %s': 'نادرست است، دوباره وارد کنید: %s',
	'Names that go through a node are answered with made-up addresses, and the node looks up the real one at the far end — for streaming services that unlock by DNS, or to save a lookup. Tick it for each rule below that should use it. The router itself can open those names only with Localhost Proxy on.':
		'اگر روشن باشد، برای سایت‌هایی که از فیلترشکن می‌روند یک آدرس موقت ساختگی داده می‌شود و آدرس واقعی در سمت سرور پیدا می‌شود؛ سایت‌ها سریع‌تر باز می‌شوند و بعضی سرویس‌های ویدیویی هم باز می‌شوند. در جدول پایین برای هر قانونی که می‌خواهید تیک FakeDNS را بزنید.',
	'FakeDNS works with its main switch on, for a rule whose names go through a node. Preproxy: the rule’s hand-added node is reached through this node first — only for a rule that goes to a hand-added node, and one layer only: a node with a chain of its own keeps it.':
		'FakeDNS: فقط وقتی کار می‌کند که «کلید اصلی FakeDNS» روشن باشد و قانون به یک کانفیگ برود. پیش‌پروکسی: اگر قانون به یک کانفیگ دستی می‌رود، اتصال اول از این کانفیگ رد می‌شود (دو لایه).',
	'Everything the tunnel carries gets made-up addresses — the DNS tab’s FakeDNS. Like that one, it takes effect only with lookups sent straight into the tunnel.':
		'برای همه سایت‌هایی که از فیلترشکن می‌روند آدرس ساختگی داده می‌شود. فقط وقتی کار می‌کند که در برگه DNS، «روش پیدا کردن دامنه‌ها» روی «مستقیم داخل تونل» باشد.',
	'When the Default row goes to a hand-added node, it is reached through this node first.':
		'اگر ردیف پیش‌فرض به یک کانفیگ دستی می‌رود، اتصال اول از این کانفیگ رد می‌شود.',
	'Delete the subscribed node': 'حذف',
	'Manual subscription': 'به‌روزرسانی',
	'Reading it now. The count will change when it is done.': 'در حال خواندن. پس از پایان، تعداد به‌روز می‌شود.',
	'Cloudflare Connection': 'اتصال کلادفلر',
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
	'There is no node list yet: no subscription could be read and none has been saved before. Add one node by hand on the Configs page - a single share link is enough - or check the subscription address on Node Subscribe.':
		'هنوز فهرست کانفیگی وجود ندارد: هیچ اشتراکی خوانده نشد و فهرست ذخیره‌شده‌ای هم نیست. در صفحه «کانفیگ‌ها» یک کانفیگ دستی اضافه کنید (یک لینک کافی است)، یا آدرس اشتراک را در صفحه «اشتراک کانفیگ‌ها» بررسی کنید.',
	'The node chosen in Basic Settings cannot be read. Choose another there, or set it back to Auto.':
		'کانفیگ انتخاب‌شده در «تنظیمات پایه» خوانده نمی‌شود. کانفیگ دیگری انتخاب کنید یا آن را روی خودکار بگذارید.',
	'The helper for this node\'s protocol would not start.': 'هسته کمکی پروتکل این کانفیگ اجرا نشد.',
	'The tunnel process started but never accepted connections. Check the system log for what it said.':
		'هسته تونل اجرا شد اما هیچ اتصالی نپذیرفت. پیام آن را در «گزارش‌های اجرا» ببینید.',
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
	'OpenVPN did not connect. The Runtime Logs page says how far it got.': 'OpenVPN وصل نشد. صفحه‌ی «گزارش اجرا» می‌گوید تا کجا پیش رفت.',
	'OpenVPN is the official client, from the router’s own packages: every OpenVPN config is carried by it and by nothing else. Install, update and remove go through the package manager.':
		'OpenVPN کلاینت رسمی است و از بسته‌های خود روتر نصب می‌شود: هر کانفیگ OpenVPN فقط با آن اجرا می‌شود. نصب، به‌روزرسانی و حذفش با مدیر بسته‌ی روتر انجام می‌شود.',
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
	'Address (Support Domain Name)': 'آدرس (دامنه هم قبول است)',
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
	'TLS is used to verify the leaf certificate name.': 'نام گواهی سرور با این نام سنجیده می‌شود.',
	'TLS Certificate (PEM)': 'گواهی TLS ‏(PEM)',
	'A certificate the server’s chain is checked against, in place of the usual ones.':
		'گواهی‌ای که زنجیره سرور به‌جای گواهی‌های معمول با آن سنجیده می‌شود.',
	'An ECH configuration, or a domain and the DNS that publishes it, such as cloudflare-ech.com+https://1.1.1.1/dns-query.':
		'یک پیکربندی ECH، یا یک دامنه و DNS‌ای که آن را منتشر می‌کند، مثل cloudflare-ech.com+https://1.1.1.1/dns-query.',
	'Cipher Suites': 'مجموعه رمزها (Cipher Suites)',
	'Configures the list of supported cipher suites, separated by colons.': 'فهرست مجموعه رمزهای مجاز، جداشده با دونقطه.',
	'Xray’s finalmask for this node, as a JSON object. The fragment and noise of the Xray tab are still added, unless this has its own.':
		'finalmask مخصوص این نود در Xray، به شکل یک شیء JSON. fragment و noise برگه Xray همچنان اضافه می‌شوند، مگر این‌که این‌جا خودش داشته باشد.',
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
		'روتر به‌عنوان سرور پروکسی: گوشی و لپ‌تاپ بیرون از خانه به آن وصل می‌شوند. پورت سرورهایی که فقط روی خود روتر نیستند، تا وقتی اجرا می‌شوند در فایروال باز می‌شود.',
	'Log level': 'سطح لاگ',
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
	'The names a client may ask for. Empty is the handshake server’s.': 'نام‌هایی که کلاینت می‌تواند بخواهد. خالی یعنی نام سرور دست‌دادن.',
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
	'Add WARP': 'افزودن وارپ',
	'Exit country': 'کشور خروجی',
	'Cloudflare WARP, carried by warp-plus. It makes a free account by itself and looks for a WARP address that answers from here. Everything else is on the config’s own page.':
		'وارپ کلودفلر، با warp-plus. خودش یک اکانت رایگان می‌سازد و دنبال آدرسی از وارپ می‌گردد که از اینجا جواب بدهد. بقیه تنظیمات در صفحه خود کانفیگ است.',
	'WARP+ licence (optional)': 'لایسنس WARP+ (اختیاری)',
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
	'Scan: slowest answer (ms)': 'اسکن: کندترین جواب (میلی‌ثانیه)',
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
	'warp-plus is not installed. Install it on the App Update page.': 'warp-plus نصب نیست. از صفحه «به‌روزرسانی» نصبش کنید.',
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
	'warp-plus App Path': 'مسیر برنامه warp-plus',
	'Only WARP nodes need it. Empty means this program’s own copy in the folder above.':
		'فقط کانفیگ‌های وارپ لازمش دارند. خالی یعنی نسخه خود این برنامه در پوشه بالا.',
	'warp-plus is only needed for WARP nodes: Cloudflare WARP, WARP in WARP, Psiphon behind WARP, and WireGuard nodes set to be carried by it.':
		'warp-plus فقط برای کانفیگ‌های وارپ لازم است: وارپ کلودفلر، وارپ در وارپ، سایفون پشت وارپ، و کانفیگ‌های وایرگارد که روی «اجرا با warp-plus» گذاشته شده‌اند.',
	'A WARP node needs warp-plus. Install it on the App Update page.': 'کانفیگ وارپ به warp-plus نیاز دارد. از صفحه «به‌روزرسانی» نصبش کنید.',
	'WARP did not connect. The Runtime Logs page says how far it got. Without an account, press Register on the node\'s page while another node is connected; without an answer from WARP, turn Scan on or give another endpoint.':
		'وارپ وصل نشد. صفحه «لاگ‌های اجرا» نشان می‌دهد تا کجا پیش رفت. اگر اکانت ندارد، وقتی کانفیگ دیگری وصل است در صفحه این کانفیگ «ثبت‌نام» را بزنید. اگر وارپ جواب نمی‌دهد، اسکن را روشن کنید یا اندپوینت دیگری بدهید.',
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
	'Vwarp App Path': 'مسیر برنامه Vwarp',
	'Only WARP nodes over MASQUE or with noize need it. Empty means this program’s own copy in the folder above.':
		'فقط کانفیگ‌های وارپ با MASQUE یا با پوشش لازمش دارند. خالی یعنی نسخه خود این برنامه در پوشه بالا.',
	'Xray (patterniha)': 'Xray (پترنیها)',
	'Vwarp is warp-plus with WARP over MASQUE and noize; WARP nodes that use either need it. Xray (patterniha) is Xray that also carries VLESS and Trojan without TLS to public addresses - configs over Cloudflare’s plain-HTTP ports - which the official Xray refuses; installed beside it, it is used for those configs.':
		'Vwarp همان warp-plus است به‌علاوه MASQUE و پوشش (noize)؛ کانفیگ‌های وارپی که از این دو استفاده می‌کنند لازمش دارند. Xray (پترنیها) نسخه‌ای از Xray است که VLESS و Trojan بدون TLS را هم به آدرس عمومی وصل می‌کند - کانفیگ‌هایی که از پورت‌های HTTP ساده کلودفلر می‌روند - و Xray رسمی آن‌ها را رد می‌کند. کنار Xray رسمی نصب می‌شود و برای همین کانفیگ‌ها به کار می‌رود.',
	'This WARP node uses MASQUE or noize, which need Vwarp. Install it on the App Update page.':
		'این کانفیگ وارپ از MASQUE یا پوشش استفاده می‌کند که به Vwarp نیاز دارد. از صفحه «به‌روزرسانی» نصبش کنید.',
	'The Xray download does not match its published checksum - nothing was installed.':
		'فایل دانلودشده Xray با چک‌سام منتشرشده‌اش نمی‌خواند؛ چیزی نصب نشد.',

	'yes': 'بله',
	'no': 'خیر'
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
function tr(s) {
	if (LANG !== 'fa') return s;
	var v = FA[s];
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
