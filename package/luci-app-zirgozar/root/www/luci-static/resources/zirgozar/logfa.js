/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 dreamboxone <https://t.me/routekernel1>
 * Part of Zirgozar - https://github.com/dreamboxone/zirgozar
 *
 * The runtime log in Persian. The router writes every line in English - the
 * scripts that write them run without knowing who will read them - and the
 * Log page says them again here, line by line, when the page is in Persian:
 * the date in the Solar Hijri calendar and the sentence in Persian, with the
 * names, addresses and numbers in it left exactly as they were. A line this
 * does not know is shown as it came.
 *
 * Each entry is the English sentence with {} wherever the router puts
 * something in, and the Persian with {1}, {2}... for those, in their order.
 * More particular sentences come before the general ones they would also
 * match.
 */

'use strict';
'require baseclass';

var T = [
	/* ------------------------------------------------------ start and stop */
	[ 'Start running...', 'شروع اجرا...' ],
	[ 'Running complete!', 'اجرا کامل شد!' ],
	[ 'Clearing and closing related programs complete.', 'پاک‌سازی و بستن برنامه‌های مرتبط کامل شد.' ],
	[ 'Main switch is off - not starting', 'کلید اصلی خاموش است - اجرا نمی‌شود' ],
	[ 'No node chosen yet - choosing one now', 'هنوز کانفیگی انتخاب نشده - الان یکی انتخاب می‌شود' ],
	[ 'The node chosen in Basic Settings cannot be read - keeping the last one', 'کانفیگ انتخاب‌شده در تنظیمات پایه خوانده نمی‌شود - همان قبلی نگه داشته شد' ],
	[ 'Node: {} [{} {}]', 'کانفیگ: {1} [{2} {3}]' ],
	[ 'Core: {} ({})', 'هسته: {1} ({2})' ],
	[ 'Pre-proxy: {}', 'پیش‌پروکسی: {1}' ],
	[ 'Fragment: {}, length {}, delay {}', 'فرگمنت: {1}، طول {2}، تأخیر {3}' ],
	[ 'Noise: on', 'نویز: روشن' ],
	[ 'Mux: concurrency {}', 'Mux: هم‌زمانی {1}' ],
	[ 'Bridge: {} through {}', 'پل: {1} از طریق {2}' ],
	[ 'WARP: {} - finding an address and connecting can take a minute', 'وارپ: {1} - پیدا کردن آدرس و وصل شدن ممکن است یک دقیقه طول بکشد' ],
	[ 'This node is not one Xray speaks - {} carries the tunnel by itself', 'Xray این کانفیگ را نمی‌شناسد - {1} به‌تنهایی تونل را می‌برد' ],
	[ 'sing-box could not run this tunnel ({}) - running Xray instead', 'sing-box نتوانست این تونل را اجرا کند ({1}) - به‌جایش Xray اجرا می‌شود' ],
	[ 'sing-box needs Geoview to read the routing data - installing it', 'sing-box برای خواندن داده‌های مسیریابی به Geoview نیاز دارد - در حال نصب آن' ],
	[ 'could not write {}', 'نوشتن {1} ممکن نشد' ],
	[ 'the core would not read the routing data - connected with the Iran split off', 'هسته داده‌های مسیریابی را نخواند - بدون تفکیک ایران وصل شد' ],
	[ 'no {} on this router can run the generated configuration', 'هیچ {1} روی این روتر نمی‌تواند کانفیگ ساخته‌شده را اجرا کند' ],
	[ 'the chosen server needs a core this router does not have', 'سرور انتخاب‌شده هسته‌ای لازم دارد که روی این روتر نیست' ],
	[ '{} did not connect within two minutes', '{1} در دو دقیقه وصل نشد' ],
	[ 'the bridge never started listening on {}', 'پل هیچ‌وقت روی {1} شروع به گوش دادن نکرد' ],
	[ 'the core is still starting - waiting for it', 'هسته هنوز در حال راه‌اندازی است - منتظر آن' ],
	[ '{} never started listening on {} - leaving the network untouched', '{1} هیچ‌وقت روی {2} شروع به گوش دادن نکرد - شبکه دست‌نخورده ماند' ],
	[ '{}[{}] transparent proxy, DNS[{}], firewall: {}', '{1}[{2}] پروکسی شفاف، DNS[{3}]، فایروال: {4}' ],
	[ 'Kill switch is on: devices have no way out by the uplink until the tunnel works', 'کلید قطع اضطراری روشن است: تا تونل کار نکند دستگاه‌ها از اینترنت اصلی راهی به بیرون ندارند' ],
	[ 'Kill switch stays in place: devices have no way out by the uplink until the tunnel is back', 'کلید قطع اضطراری سر جایش می‌ماند: تا تونل برنگردد دستگاه‌ها از اینترنت اصلی راهی به بیرون ندارند' ],
	[ 'listening now: {}', 'در حال گوش دادن: {1}' ],
	[ 'could not install the routing rules - leaving the network untouched', 'نصب قوانین مسیریابی ممکن نشد - شبکه دست‌نخورده ماند' ],
	[ 'the new settings were refused by the core - the tunnel is left as it was: {}', 'هسته تنظیمات جدید را رد کرد - تونل همان‌طور که بود ماند: {1}' ],
	[ 'Settings saved - restarting the core only', 'تنظیمات ذخیره شد - فقط هسته دوباره راه‌اندازی می‌شود' ],
	[ 'Settings saved - nothing the tunnel uses changed, so it was left running', 'تنظیمات ذخیره شد - چیزی که تونل استفاده می‌کند تغییر نکرد، پس در حال اجرا ماند' ],
	[ 'Settings saved - the firewall rules or DNS were updated, the core was left running', 'تنظیمات ذخیره شد - قوانین فایروال یا DNS به‌روز شد و هسته در حال اجرا ماند' ],

	/* ---------------------------------------------- sing-box's translation */
	[ 'sing-box: {}:{} is left out - Geoview, which reads it for sing-box, is not installed', 'sing-box: {1}:{2} کنار گذاشته شد - Geoview که آن را برای sing-box می‌خواند نصب نیست' ],
	[ 'sing-box: {}:{} is not in {}.dat - the entry is left out', 'sing-box: {1}:{2} در {3}.dat نیست - کنار گذاشته شد' ],
	[ 'sing-box: FakeDNS is built differently in sing-box and is not carried over', 'sing-box: FakeDNS در sing-box جور دیگری ساخته شده و منتقل نمی‌شود' ],
	[ 'sing-box: the certificate name to verify has no sing-box equivalent and is left off', 'sing-box: نام گواهی برای بررسی در sing-box معادلی ندارد و کنار گذاشته شد' ],
	[ 'sing-box: the certificate pin has no sing-box equivalent and is left off', 'sing-box: پین گواهی در sing-box معادلی ندارد و کنار گذاشته شد' ],
	[ 'sing-box: the post-quantum check of the REALITY server (pqv) has no sing-box equivalent - the node connects unverified', 'sing-box: بررسی پساکوانتومی سرور REALITY (pqv) در sing-box معادلی ندارد - کانفیگ بدون این بررسی وصل می‌شود' ],
	[ 'sing-box: {}: external geo files are not supported by sing-box - left out', 'sing-box: {1}: فایل‌های geo بیرونی را sing-box پشتیبانی نمی‌کند - کنار گذاشته شد' ],
	[ 'sing-box: {}: not a rule-set:local: or rule-set:remote: entry - left out', 'sing-box: {1}: ورودی rule-set:local: یا rule-set:remote: نیست - کنار گذاشته شد' ],
	[ 'sing-box: inbound {}: {} is not translated', 'sing-box: ورودی {1}: {2} ترجمه نمی‌شود' ],
	[ 'sing-box: outbound {}: a separate download connection (downloadSettings) is not supported by sing-box - it uses one connection', 'sing-box: خروجی {1}: اتصال جداگانه برای دانلود (downloadSettings) در sing-box نیست - از یک اتصال استفاده می‌شود' ],
	[ 'sing-box: outbound {}: mux.cool has no sing-box equivalent and is left off', 'sing-box: خروجی {1}: mux.cool در sing-box معادلی ندارد و کنار گذاشته شد' ],
	[ 'sing-box: outbound {}: {}', 'sing-box: خروجی {1}: {2}' ],

	/* ------------------------------------------------------------ the DNS */
	[ 'DNS[{}]: Direct DNS: {}, Remote DNS: {}', 'DNS[{1}]: DNS مستقیم: {2}، DNS راه دور: {3}' ],
	[ 'name lookups now go through the tunnel (via {})', 'جست‌وجوی نام‌ها حالا از تونل می‌رود (از طریق {1})' ],
	[ 'name lookups are back to normal', 'جست‌وجوی نام‌ها به حالت عادی برگشت' ],
	[ 'dnsmasq would not restart - name lookups may not be going through the tunnel', 'dnsmasq دوباره راه نیفتاد - ممکن است جست‌وجوی نام‌ها از تونل نرود' ],
	[ 'dns_mode is off - leaving name resolution alone', 'حالت DNS خاموش است - به جست‌وجوی نام‌ها دست زده نمی‌شود' ],
	[ 'no dnsmasq on this router - name lookups will be redirected straight to the tunnel', 'dnsmasq روی این روتر نیست - جست‌وجوی نام‌ها مستقیم به تونل فرستاده می‌شود' ],
	[ 'no dnsmasq conf-dir found', 'پوشه تنظیمات dnsmasq پیدا نشد' ],
	[ 'Remote DNS moved from 1.1.1.1 to 8.8.8.8, which nodes on Cloudflare Workers can reach', 'DNS راه دور از 1.1.1.1 به 8.8.8.8 منتقل شد که کانفیگ‌های روی Cloudflare Workers به آن می‌رسند' ],

	/* ------------------------------------------------- choosing a node */
	[ 'already busy - leaving it to the run in progress', 'کار دیگری در جریان است - به همان واگذار شد' ],
	[ 'confirmed faster replacement: {}ms to {}ms', 'جایگزین سریع‌تر تأیید شد: از {1} میلی‌ثانیه به {2} میلی‌ثانیه' ],
	[ 'Choosing a node...', 'در حال انتخاب کانفیگ...' ],
	[ 'no node can carry a request and the one in use cannot either - the Kill switch keeps devices off the uplink', 'هیچ کانفیگی درخواست را نمی‌برد و کانفیگ فعلی هم نه - کلید قطع اضطراری دستگاه‌ها را از اینترنت اصلی دور نگه می‌دارد' ],
	[ 'no node can carry a request and the one in use cannot either - taking the network back', 'هیچ کانفیگی درخواست را نمی‌برد و کانفیگ فعلی هم نه - شبکه به حالت عادی برگردانده شد' ],
	[ 'no candidates to sift', 'کانفیگی برای غربال نیست' ],
	[ 'no candidates', 'کانفیگی نیست' ],
	[ 'every node dials through the pre-proxy - the handshake pass is skipped', 'همه کانفیگ‌ها از پیش‌پروکسی وصل می‌شوند - مرحله هندشیک رد شد' ],
	[ 'reachable: {} of {} servers answered a handshake', 'در دسترس: {1} سرور از {2} به هندشیک جواب دادند' ],
	[ 'dropping {} - no core on this router can use it', '{1} کنار گذاشته شد - هیچ هسته‌ای روی این روتر نمی‌تواند از آن استفاده کند' ],
	[ 'no server in this batch can be used by any core on this router', 'هیچ سروری در این دسته را هیچ هسته‌ای روی این روتر نمی‌تواند استفاده کند' ],
	[ 'this batch is still refused after dropping the bad entries', 'این دسته بعد از کنار گذاشتن ورودی‌های خراب هم رد شد' ],
	[ 'the batch tester did not start - ports busy, or a bad entry', 'آزمایشگر دسته‌ای راه نیفتاد - پورت‌ها اشغال‌اند یا ورودی خرابی هست' ],
	[ 'the batch tester did not survive its own batch - these results mean little', 'آزمایشگر دسته‌ای وسط کار از کار افتاد - این نتایج چندان معتبر نیستند' ],
	[ 'batch {}: measuring {} servers', 'دسته {1}: اندازه‌گیری {2} سرور' ],
	[ 'found a server under {}ms in batch {} - stopping here', 'سروری زیر {1} میلی‌ثانیه در دسته {2} پیدا شد - همین‌جا متوقف شد' ],
	[ 'no server completed a test request', 'هیچ سروری درخواست آزمایشی را کامل نکرد' ],
	[ 'selected {} at {}ms ({} of {} measured servers answered)', '{1} با {2} میلی‌ثانیه انتخاب شد ({3} سرور از {4} سرور اندازه‌گیری‌شده جواب دادند)' ],
	[ 'chosen server is not in the list any more', 'سرور انتخاب‌شده دیگر در لیست نیست' ],
	[ 'the node chosen in Basic Settings is not there or cannot be read', 'کانفیگ انتخاب‌شده در تنظیمات پایه وجود ندارد یا خوانده نمی‌شود' ],
	[ 'using the node chosen in Basic Settings: {}', 'استفاده از کانفیگ انتخاب‌شده در تنظیمات پایه: {1}' ],
	[ 'moving to the next measured server down the list', 'رفتن به سرور اندازه‌گیری‌شده بعدی در لیست' ],
	[ '{} servers to choose from', '{1} سرور برای انتخاب' ],
	[ 'no usable servers in the list', 'سرور قابل استفاده‌ای در لیست نیست' ],

	/* ---------------------------------------------- keeping the tunnel up */
	[ 'the web interface is not registered with rpcd - reloading it', 'رابط وب در rpcd ثبت نیست - دوباره بارگذاری می‌شود' ],
	[ 'the tunnel is running but its rules are gone - putting them back', 'تونل در حال اجراست ولی قوانینش از بین رفته - دوباره گذاشته می‌شوند' ],
	[ 'the current node is repeatedly slow - checking alternatives', 'کانفیگ فعلی چند بار پشت سر هم کند بود - بررسی جایگزین‌ها' ],
	[ 'the tunnel carried nothing this time - waiting for the next health check', 'تونل این بار چیزی نبرد - منتظر بررسی سلامت بعدی' ],
	[ 'the tunnel is up but has carried nothing twice running - choosing again', 'تونل بالاست ولی دو بار پشت سر هم چیزی نبرد - انتخاب دوباره' ],
	[ 'the tunnel should be up and is not - repairing', 'تونل باید بالا باشد و نیست - در حال ترمیم' ],

	/* ------------------------------------------------------ subscriptions */
	[ "subscription '{}': reading {} [{}]", "اشتراک '{1}': در حال خواندن {2} [{3}]" ],
	[ "subscription '{}': unreachable, read from {} instead", "اشتراک '{1}': در دسترس نبود، به‌جایش از {2} خوانده شد" ],
	[ "subscription '{}': {} nodes", "اشتراک '{1}': {2} کانفیگ" ],
	[ "subscription '{}': the list changed - saved", "اشتراک '{1}': لیست تغییر کرد - ذخیره شد" ],
	[ "subscription '{}': its pre-proxy node is gone - its nodes are used without it", "اشتراک '{1}': کانفیگ پیش‌پروکسی‌اش حذف شده - کانفیگ‌هایش بدون آن استفاده می‌شوند" ],
	[ "subscription '{}': its landing node is gone or cannot be chained - its nodes are used without it", "اشتراک '{1}': کانفیگ مقصدش حذف شده یا قابل زنجیر شدن نیست - کانفیگ‌هایش بدون آن استفاده می‌شوند" ],
	[ "subscription '{}': the tunnel is not running, and this is read only through it", "اشتراک '{1}': تونل در حال اجرا نیست و این اشتراک فقط از داخل تونل خوانده می‌شود" ],
	[ "subscription '{}': download failed", "اشتراک '{1}': دانلود نشد" ],
	[ "subscription '{}': answer too short", "اشتراک '{1}': پاسخ خیلی کوتاه بود" ],
	[ "subscription '{}': no servers in that configuration", "اشتراک '{1}': سروری در آن کانفیگ نیست" ],
	[ "subscription '{}': nothing that looks like a server link", "اشتراک '{1}': چیزی شبیه لینک سرور در آن نیست" ],
	[ "subscription '{}': {}", "اشتراک '{1}': {2}" ],
	[ 'no subscription answered - keeping the list already on disk', 'هیچ اشتراکی جواب نداد - لیست قبلی نگه داشته شد' ],
	[ 'no subscription answered and nothing saved', 'هیچ اشتراکی جواب نداد و چیزی ذخیره نشد' ],
	[ "nodes of subscription '{}' deleted", "کانفیگ‌های اشتراک '{1}' حذف شدند" ],
	[ 'nodes of every subscription deleted', 'کانفیگ‌های همه اشتراک‌ها حذف شدند' ],
	[ 'nodes deleted: {}', 'کانفیگ‌های حذف‌شده: {1}' ],
	[ 'gave {} nodes and subscriptions names of their own', 'به {1} کانفیگ و اشتراک نام جداگانه داده شد' ],
	[ 'the chosen node of subscription {} is no longer on its list - using one of its nodes that works, {}', 'کانفیگ انتخاب‌شده اشتراک {1} دیگر در لیستش نیست - یکی از کانفیگ‌های سالمش استفاده می‌شود: {2}' ],
	[ 'the chosen node of subscription {} was found again by {}: {}', 'کانفیگ انتخاب‌شده اشتراک {1} با {2} دوباره پیدا شد: {3}' ],

	/* ------------------------------------------ the configuration written */
	[ 'geo files missing - routing everything through the tunnel', 'فایل‌های geo نیستند - همه چیز از تونل می‌رود' ],
	[ "OpenVPN cannot go through '{}': it is gone, or Xray cannot speak it - connecting directly", "OpenVPN نمی‌تواند از '{1}' برود: حذف شده یا Xray آن را نمی‌شناسد - مستقیم وصل می‌شود" ],
	[ "access control rule {}: node '{}' cannot be used - sending it through the tunnel's own node", "قانون کنترل دسترسی {1}: کانفیگ '{2}' قابل استفاده نیست - از کانفیگ خود تونل فرستاده می‌شود" ],
	[ 'access control rule {}: ipset sources only work with iptables - ignored', 'قانون کنترل دسترسی {1}: منبع‌های ipset فقط با iptables کار می‌کنند - نادیده گرفته شد' ],
	[ "SOCKS port {}: node '{}' cannot be used - it goes the tunnel's way instead", "پورت SOCKS {1}: کانفیگ '{2}' قابل استفاده نیست - به‌جایش از راه تونل می‌رود" ],
	[ "shunt rule {}: node '{}' cannot be used - it goes through the tunnel's node instead", "قانون عبور {1}: کانفیگ '{2}' قابل استفاده نیست - به‌جایش از کانفیگ تونل می‌رود" ],
	[ "shunt rule '{}' is inverted, which only sing-box can do - left out while Xray carries the tunnel", "قانون عبور '{1}' معکوس است که فقط sing-box از پسش برمی‌آید - تا وقتی Xray تونل را می‌برد کنار گذاشته شد" ],
	[ "balancing node '{}' has no usable Xray members", "کانفیگ توزیع بار '{1}' هیچ عضو قابل استفاده‌ای برای Xray ندارد" ],
	[ "the pre-proxy '{}' could not be read - it has been deleted, or Xray cannot speak it", "پیش‌پروکسی '{1}' خوانده نشد - حذف شده یا Xray آن را نمی‌شناسد" ],
	[ "WARP node '{}' has no MASQUE account yet - press Register on its page", "کانفیگ وارپ '{1}' هنوز حساب MASQUE ندارد - در صفحه‌اش «ثبت» را بزنید" ],
	[ "WARP node '{}' has no account yet - press Register on its page, or connect through it once", "کانفیگ وارپ '{1}' هنوز حساب ندارد - در صفحه‌اش «ثبت» را بزنید یا یک بار از طریق آن وصل شوید" ],
	[ "WARP node '{}': WARP in WARP and Psiphon run only as the tunnel's own node", "کانفیگ وارپ '{1}': وارپ در وارپ و سایفون فقط به‌عنوان کانفیگ خود تونل اجرا می‌شوند" ],
	[ "WARP node '{}': no Xray on this router speaks MASQUE - patterniha's 26.10.8 or later does", "کانفیگ وارپ '{1}': هیچ Xray روی این روتر MASQUE را نمی‌شناسد - نسخه 26.10.8 پترنیها یا جدیدتر می‌شناسد" ],

	/* ---------------------------------------------- what carries a node */
	[ 'OpenVPN: this OpenVPN has no {}, the cipher the profile names - a server that knows no other will refuse it', 'OpenVPN: این OpenVPN رمز {1} را که در پروفایل آمده ندارد - سروری که رمز دیگری نشناسد آن را رد می‌کند' ],
	[ 'no openvpn installed to carry the OpenVPN node', 'OpenVPN برای بردن کانفیگ OpenVPN نصب نیست' ],
	[ 'no warp-plus or Vwarp installed to carry the WARP node', 'warp-plus یا Vwarp برای بردن کانفیگ وارپ نصب نیست' ],
	[ 'no sing-box-lx installed to carry amneziawg', 'sing-box-lx برای بردن amneziawg نصب نیست' ],
	[ 'no core installed that can carry {}', 'هسته‌ای که {1} را ببرد نصب نیست' ],

	/* ------------------------------------------------------------- WARP */
	[ 'WARP: registering an account for {}', 'وارپ: ساختن حساب برای {1}' ],
	[ 'WARP: no account - {}', 'وارپ: حسابی ساخته نشد - {1}' ],
	[ 'WARP: the second account for WARP in WARP could not be made - warp-plus will try when it connects', 'وارپ: حساب دوم برای وارپ در وارپ ساخته نشد - warp-plus هنگام وصل شدن دوباره تلاش می‌کند' ],
	[ 'WARP: account ready ({})', 'وارپ: حساب آماده است ({1})' ],
	[ 'WARP: {} has no account yet - making it through the tunnel that is still up', 'وارپ: {1} هنوز حساب ندارد - از تونلی که هنوز بالاست ساخته می‌شود' ],
	[ 'WARP: the account of {} was deleted', 'وارپ: حساب {1} حذف شد' ],

	/* --------------------------------------------- downloads and installs */
	[ 'refusing download: needs {} in {}, {} free', 'دانلود انجام نشد: {1} در {2} لازم است، {3} خالی است' ],
	[ '{} was unreachable - took it from {} instead', '{1} در دسترس نبود - به‌جایش از {2} گرفته شد' ],
	[ 'download failed: {}', 'دانلود نشد: {1}' ],
	[ 'download truncated: {}', 'دانلود ناقص ماند: {1}' ],
	[ 'installing Xray {}', 'در حال نصب Xray {1}' ],
	[ 'Xray App Path set to {}', 'مسیر برنامه Xray روی {1} گذاشته شد' ],
	[ 'installed Aether {}', 'Aether {1} نصب شد' ],
	[ "installing patterniha's Xray", 'در حال نصب Xray پترنیها' ],
	[ '{}: SHA-256 {}, the release says {}', '{1}: SHA-256 برابر {2} است، ولی انتشار {3} را می‌گوید' ],
	[ '{} download from {} failed after {} tries', 'دانلود {1} از {2} بعد از {3} تلاش انجام نشد' ],
	[ '{}: the checksum file could not be read - installed on the size check alone', '{1}: فایل چک‌سام خوانده نشد - فقط با بررسی اندازه نصب شد' ],
	[ '{} downloaded but will not run here: {}', '{1} دانلود شد ولی اینجا اجرا نمی‌شود: {2}' ],
	[ 'OpenVPN {} installed ({})', 'OpenVPN {1} نصب شد ({2})' ],
	[ 'OpenVPN removed ({})', 'OpenVPN حذف شد ({1})' ],
	[ "OpenVPN: {}is not available for this firmware's kernel ({})", 'OpenVPN: {1}برای کرنل این فریم‌ور ({2}) وجود ندارد' ],
	[ '{} {} installed in {}', '{1} {2} در {3} نصب شد' ],
	[ 'update: no package for {} in the latest release', 'به‌روزرسانی: در آخرین انتشار بسته‌ای برای {1} نیست' ],
	[ 'update: downloading {}', 'به‌روزرسانی: در حال دانلود {1}' ],
	[ 'update: {} does not match SHA256SUMS', 'به‌روزرسانی: {1} با SHA256SUMS نمی‌خواند' ],
	[ 'update: installing with {}', 'به‌روزرسانی: در حال نصب با {1}' ],
	[ 'update: {} said: {}', 'به‌روزرسانی: {1} گفت: {2}' ],
	[ 'update: now version {}', 'به‌روزرسانی: نسخه فعلی {1}' ],
	[ 'a new release of this program is out: {}', 'نسخه جدید این برنامه منتشر شده: {1}' ],
	[ 'update: {} (not enough room)', 'به‌روزرسانی: {1} (جای کافی نیست)' ],
	[ 'update: {}', 'به‌روزرسانی: {1}' ],
	[ 'nothing missing', 'چیزی کم نیست' ],
	[ 'installing: {}', 'در حال نصب: {1}' ],
	[ 'could not install:{}', 'نصب نشد:{1}' ],
	[ 'dependencies installed', 'پیش‌نیازها نصب شدند' ],

	/* ------------------------------------------------- the routing data */
	[ 'no core available to check the geo files with - installing them unchecked', 'هسته‌ای برای بررسی فایل‌های geo نیست - بدون بررسی نصب می‌شوند' ],
	[ 'the downloaded geo data is not something the core can read: {}', 'هسته داده geo دانلودشده را نمی‌تواند بخواند: {1}' ],
	[ '{}: not enough free memory to keep the old copy for rollback', '{1}: حافظه کافی برای نگه داشتن نسخه قبلی جهت بازگشت نیست' ],
	[ '{}: no earlier copy to go back to', '{1}: نسخه قبلی برای بازگشت نیست' ],
	[ '{}: rolled back to the earlier copy - reconnect for it to take effect', '{1}: به نسخه قبلی برگشت - برای اعمال، دوباره وصل شوید' ],
	[ '{} updated ({})', '{1} به‌روز شد ({2})' ],
	[ 'routing data updated - reconnect for it to take effect', 'داده‌های مسیریابی به‌روز شد - برای اعمال، دوباره وصل شوید' ],
	[ 'routing data removed', 'داده‌های مسیریابی حذف شد' ],
	[ 'geoip: {} ({})', 'geoip: {1} ({2})' ],
	[ 'geosite: {} ({})', 'geosite: {1} ({2})' ],

	/* ------------------------------------------------ the router itself */
	[ 'rebind exceptions updated: {}', 'استثناهای rebind به‌روز شد: {1}' ],
	[ 'router clock set to Tehran time with the Iranian time servers', 'ساعت روتر با سرورهای زمان ایرانی روی وقت تهران تنظیم شد' ],
	[ 'schedule updated', 'زمان‌بندی به‌روز شد' ],
	[ 'Scheduled stop', 'توقف زمان‌بندی‌شده' ],
	[ 'Scheduled start', 'شروع زمان‌بندی‌شده' ],
	[ 'Scheduled restart', 'راه‌اندازی دوباره زمان‌بندی‌شده' ],
	[ 'Scheduled update of the routing data ({})', 'به‌روزرسانی زمان‌بندی‌شده داده‌های مسیریابی ({1})' ],
	[ 'Scheduled update of subscription {}', 'به‌روزرسانی زمان‌بندی‌شده اشتراک {1}' ],
	[ 'reset: the settings the package was installed with are not on this router', 'بازگشت به پیش‌فرض: تنظیمات زمان نصب بسته روی این روتر نیست' ],
	[ 'Back to the settings the program was installed with', 'برگشت به تنظیمات زمان نصب برنامه' ],
	[ 'Backup made', 'پشتیبان گرفته شد' ],
	[ 'Restoring the backup of {} (version {})', 'بازگرداندن پشتیبان {1} (نسخه {2})' ],

	/* ------------------------------------------------- the firewall rules */
	[ 'Kill switch: Geoview is not installed, so Iranian addresses cannot be let past it - install Geoview on the App Update page', 'کلید قطع اضطراری: Geoview نصب نیست، پس آدرس‌های ایرانی از آن رد نمی‌شوند - Geoview را از صفحه به‌روزرسانی نصب کنید' ],
	[ 'Kill switch: Geoview could not read the Iranian addresses out of geoip.dat', 'کلید قطع اضطراری: Geoview نتوانست آدرس‌های ایرانی را از geoip.dat بخواند' ],
	[ 'Kill switch: could not make the set of Iranian addresses - they stay closed with the rest', 'کلید قطع اضطراری: مجموعه آدرس‌های ایرانی ساخته نشد - آن‌ها هم با بقیه بسته می‌مانند' ],
	[ 'Kill switch: there is no ipset on this router, so Iranian addresses stay closed with the rest', 'کلید قطع اضطراری: ipset روی این روتر نیست، پس آدرس‌های ایرانی هم با بقیه بسته می‌مانند' ],
	[ 'Kill switch: could not load the nftables ruleset', 'کلید قطع اضطراری: قوانین nftables بارگذاری نشد' ],
	[ 'Kill switch: could not install the iptables rules', 'کلید قطع اضطراری: قوانین iptables نصب نشد' ],
	[ 'another transparent proxy is active - expect trouble', 'پروکسی شفاف دیگری فعال است - احتمال مشکل هست' ],
	[ "could not send the router's own traffic into the tunnel", 'ترافیک خود روتر به تونل فرستاده نشد' ],

	/* ---------------------------------------------------------- the server */
	[ "server {}: the config '{}' cannot be used as its way out - going out directly", "سرور {1}: کانفیگ '{2}' را نمی‌شود راه خروجش کرد - مستقیم خارج می‌شود" ],
	[ 'server {}: hysteria2 and tuic servers can leave directly, through the tunnel or through a SOCKS server - going out directly', 'سرور {1}: سرورهای hysteria2 و tuic فقط مستقیم، از تونل یا از یک سرور SOCKS خارج می‌شوند - مستقیم خارج می‌شود' ],
	[ 'Server-Side: Xray refused the server configuration ({})', 'سمت سرور: Xray کانفیگ سرور را رد کرد ({1})' ],
	[ 'Server-Side: Xray refused the server configuration', 'سمت سرور: Xray کانفیگ سرور را رد کرد' ],
	[ 'Server-Side: sing-box cannot run the hysteria2/tuic servers ({})', 'سمت سرور: sing-box نمی‌تواند سرورهای hysteria2/tuic را اجرا کند ({1})' ],
	[ 'Server-Side: sing-box cannot run the hysteria2/tuic servers', 'سمت سرور: sing-box نمی‌تواند سرورهای hysteria2/tuic را اجرا کند' ],
	[ 'Server-Side: listening on {}', 'سمت سرور: در حال گوش دادن روی {1}' ],

	/* ------------------------------------------------------- the traffic */
	[ 'clock is not set yet - not recording traffic', 'ساعت هنوز تنظیم نشده - ترافیک ثبت نمی‌شود' ],
	[ 'the core is not answering its stats interface', 'هسته به رابط آمارش جواب نمی‌دهد' ],
	[ "carrying today's recorded traffic forward across the restart", 'ترافیک ثبت‌شده امروز به بعد از راه‌اندازی دوباره منتقل شد' ],
	[ 'traffic history cleared', 'تاریخچه ترافیک پاک شد' ],

	/* Last: it would also match the particular ones above. */
	[ '{} removed', '{1} حذف شد' ]
];

/* Each template as a pattern, once. */
var RX = T.map(function(t) {
	var parts = t[0].split('{}').map(function(p) {
		return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	});
	return [ new RegExp('^' + parts.join('(.*?)') + '$'), t[1] ];
});

function sentence(s) {
	for (var i = 0; i < RX.length; i++) {
		var m = RX[i][0].exec(s);
		if (m) return RX[i][1].replace(/\{(\d+)\}/g, function(w, n) { return m[+n] != null ? m[+n] : ''; });
	}
	return s;
}

/* Gregorian to Solar Hijri - the usual arithmetic, exact for the years a log
   can be from. */
function jalali(gy, gm, gd) {
	var g_d_m = [ 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ];
	var gy2 = (gm > 2) ? (gy + 1) : gy;
	var days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
	           Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
	var jy = -1595 + (33 * Math.floor(days / 12053));
	days %= 12053;
	jy += 4 * Math.floor(days / 1461);
	days %= 1461;
	if (days > 365) {
		jy += Math.floor((days - 1) / 365);
		days = (days - 1) % 365;
	}
	var jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
	var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
	return jy + '/' + (jm < 10 ? '0' : '') + jm + '/' + (jd < 10 ? '0' : '') + jd;
}

/* One line of the runtime log: "2026-10-12 15:49:56: text", a step under it
   with "  - " before the text, or - before this program kept a file of its
   own - a line of the system log. */
function line(l) {
	var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2}): (  - )?(.*)$/.exec(l);
	if (m)
		return jalali(+m[1], +m[2], +m[3]) + ' ' + m[4] + ': ' + (m[5] || '') + sentence(m[6]);
	m = /^(.*\bzirgozar(?:\[\d+\])?: )(.*)$/.exec(l);
	if (m)
		return m[1] + sentence(m[2]);
	return sentence(l);
}

/* -------------------------------------------------------- the core's log

   The cores' own lines, as the system log has them: "Mon Oct 12 17:59:17
   2026 daemon.info xray[17714]: 2026/10/12 14:29:17.375071 from ... ". What
   the core says is its own and mostly stays as it said it; the date becomes
   one Solar Hijri date, the level a Persian word, and the line Xray writes
   for every connection - most of the log - a Persian sentence. */

var MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

var WAY = { proxy: 'تونل', direct: 'مستقیم', block: 'مسدود', 'dns-out': 'DNS', api: 'آمار' };

var LEVEL = { Debug: 'اشکال‌زدایی', Info: 'اطلاعات', Warning: 'هشدار', Error: 'خطا',
              DEBUG: 'اشکال‌زدایی', INFO: 'اطلاعات', WARN: 'هشدار', ERROR: 'خطا', FATAL: 'خطای مهلک' };

var CORE = [
	[ 'core: Xray {} started', 'هسته: Xray {1} شروع به کار کرد' ],
	[ 'infra/conf/serial: Reading config: &{Name:{} Format:json}', 'خواندن کانفیگ: {1}' ],
	[ 'A unified platform for anti-censorship.', 'یک بستر یکپارچه برای مقابله با سانسور.' ],
	[ 'infra/conf: The "{}" setting is deprecated and will be removed. {}', 'تنظیم «{1}» منسوخ شده و حذف خواهد شد. {2}' ],
	[ 'inbound/{}[{}]: inbound connection from {}', 'ورودی {2}: اتصال ورودی از {3}' ],
	[ 'inbound/{}[{}]: inbound packet connection from {}', 'ورودی {2}: اتصال بسته‌ای ورودی از {3}' ],
	[ 'inbound/{}[{}]: inbound connection to {}', 'ورودی {2}: اتصال ورودی به {3}' ],
	[ 'inbound/{}[{}]: inbound packet connection to {}', 'ورودی {2}: اتصال بسته‌ای ورودی به {3}' ],
	[ 'outbound/{}[{}]: outbound connection to {}', 'خروجی {2}: اتصال خروجی به {3}' ],
	[ 'outbound/{}[{}]: outbound packet connection to {}', 'خروجی {2}: اتصال بسته‌ای خروجی به {3}' ],
	[ 'connection: open connection to {} using outbound/{}[{}]: {}', 'اتصال: باز کردن اتصال به {1} از خروجی {3} ممکن نشد: {4}' ],
	[ 'sing-box started ({})', 'sing-box شروع به کار کرد ({1})' ]
];
var CORE_RX = CORE.map(function(t) {
	var parts = t[0].split('{}').map(function(p) {
		return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	});
	return [ new RegExp('^' + parts.join('(.*?)') + '$'), t[1] ];
});

function coreSentence(s) {
	/* Xray's line for each connection it takes. */
	var m = /^from (.+?) accepted (tcp|udp):(.+?) \[(.+?) -> (.+?)\]$/.exec(s);
	if (m)
		return 'اتصال ' + m[2].toUpperCase() + ' از ' + (m[1] == 'DNS' ? 'DNS' : m[1]) + ' به ' + m[3] +
			' [' + m[4] + ' ← ' + (WAY[m[5]] || m[5]) + ']';
	for (var i = 0; i < CORE_RX.length; i++) {
		var c = CORE_RX[i][0].exec(s);
		if (c) return CORE_RX[i][1].replace(/\{(\d+)\}/g, function(w, n) { return c[+n] != null ? c[+n] : ''; });
	}
	return s;
}

function coreLine(l) {
	l = l.replace(/\x1b\[[0-9;]*m/g, '');
	var m = /^\w{3} (\w{3}) +(\d+) (\d{2}:\d{2}:\d{2}) (\d{4}) [a-z]+\.[a-z]+ ([^\s:]+?)(?:\[\d+\])?: (.*)$/.exec(l);
	if (!m) return coreSentence(l);
	var date = MONTHS[m[1]] ? jalali(+m[4], MONTHS[m[1]], +m[2]) + ' ' + m[3] : m[1] + ' ' + m[2] + ' ' + m[3];
	var who = m[5], s = m[6];
	/* The core's own date after the system log's: Xray's in UTC, sing-box's
	   with its zone. One date is enough. */
	s = s.replace(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? /, '')
	     .replace(/^[+-]\d{4} \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} /, '');
	var level = '';
	var lv = /^\[(Debug|Info|Warning|Error)\] (.*)$/.exec(s) ||
	         /^(DEBUG|INFO|WARN|ERROR|FATAL)\s*(?:\[[^\]]*\]\s*)?(.*)$/.exec(s);
	if (lv) { level = '[' + LEVEL[lv[1]] + '] '; s = lv[2]; }
	return date + ' ' + who + ': ' + level + coreSentence(s);
}

return baseclass.extend({
	text: function(t) {
		return String(t || '').split('\n').map(line).join('\n');
	},
	core: function(t) {
		return String(t || '').split('\n').map(coreLine).join('\n');
	},
	line: line,
	sentence: sentence,
	jalali: jalali
});
