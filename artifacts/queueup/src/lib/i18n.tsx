import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'fa';

const languageStorageKey = 'queueup:language';

const persian: Record<string, string> = {
  'Switch to Persian': 'تغییر زبان به فارسی',
  'Switch to English': 'تغییر زبان به انگلیسی',
  'Open link': 'باز کردن لینک',
  'Loading your queue': 'صف شما در حال بارگذاری است',
  'Finding this queue': 'در حال پیدا کردن صف',
  'Finding your ticket': 'در حال پیدا کردن نوبت شما',
  'Opening owner dashboard': 'در حال باز کردن پنل مدیریت',
  'Connecting to live display': 'در حال اتصال به نمایشگر زنده',
  "We couldn't complete that": 'انجام این کار ممکن نشد',
  Retry: 'تلاش دوباره',
  'Something went wrong. Please try again.': 'مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
  'Something went wrong': 'مشکلی پیش آمد',
  'This part of the app hit an error. The rest of the app is still running.':
    'در بخشی از برنامه خطایی رخ داد؛ سایر بخش‌ها همچنان در دسترس هستند.',
  'How it works': 'نحوه کار',
  Features: 'امکانات',
  'Manage queue': 'مدیریت صف',
  'For businesses': 'برای کسب‌وکارها',
  'Create a queue': 'ساخت صف',
  'A calmer way to run the line': 'مدیریت آرام‌تر صف انتظار',
  'Good service.': 'خدمات بهتر.',
  'No waiting room.': 'بدون انتظار در سالن.',
  'Let customers take a number from anywhere. Keep your team focused on the person in front of you.':
    'مشتریان از هر جایی نوبت بگیرند و تیم شما روی مشتری حاضر تمرکز کند.',
  'Set up your queue': 'راه‌اندازی صف',
  'No customer accounts. No hardware to buy.': 'بدون حساب کاربری مشتری و بدون خرید تجهیزات.',
  'Private by design': 'حریم خصوصی از ابتدا',
  'Live updates': 'به‌روزرسانی زنده',
  'Queue preview': 'پیش‌نمایش صف',
  'Illustrative example': 'نمونه نمایشی',
  SAMPLE: 'نمونه',
  'Now serving': 'در حال خدمت‌رسانی',
  'In line': 'در صف',
  'UP NEXT': 'نوبت بعد',
  'Ticket A–09': 'نوبت A–09',
  '~12 min': 'حدود ۱۲ دقیقه',
  'Ready for the next customer?': 'برای مشتری بعدی آماده‌اید؟',
  'One tap keeps everyone moving.': 'با یک لمس، صف روان پیش می‌رود.',
  'Your turn is coming up': 'نوبت شما نزدیک است',
  'Ticket A–09 · about 12 min': 'نوبت A–09 · حدود ۱۲ دقیقه',
  'Made for the everyday rush': 'برای شلوغی‌های روزمره',
  'The line moves.': 'صف پیش می‌رود.',
  'Your day stays yours.': 'روز شما در اختیار خودتان می‌ماند.',
  'A ticket, not an account': 'نوبت، بدون ساخت حساب',
  'Customers join in seconds with a name and a link. Nothing to install.':
    'مشتری فقط با واردکردن نام و بازکردن لینک، در چند ثانیه وارد صف می‌شود؛ نیازی به نصب نیست.',
  'Know when it’s close': 'از نزدیک‌شدن نوبت باخبر شوید',
  "Know when it's close": 'از نزدیک‌شدن نوبت باخبر شوید',
  'A live ticket page shows their place and a practical wait estimate.':
    'صفحه زنده نوبت، جایگاه و زمان تقریبی انتظار را نشان می‌دهد.',
  'One clear display': 'نمایشگر ساده و روشن',
  'Put the current number on a screen. Names stay private, always.':
    'شماره نوبت فعلی را روی نمایشگر نشان دهید؛ نام‌ها همیشه محرمانه می‌مانند.',
  'HOW IT WORKS': 'نحوه کار',
  'Four steps. A much shorter wait.': 'چهار قدم برای انتظار کوتاه‌تر.',
  'Set up your service once, then let every customer follow the same clear process.':
    'یک‌بار خدمات را تنظیم کنید تا همه مشتریان روندی روشن و یکسان را دنبال کنند.',
  'Choose your business type, service pace, capacity, and owner access code.':
    'نوع کسب‌وکار، زمان خدمت‌رسانی، ظرفیت صف و رمز مدیریت را انتخاب کنید.',
  'Share your link': 'لینک را به‌اشتراک بگذارید',
  'Put the booking link on your site, social page, or at the front desk.':
    'لینک نوبت‌گیری را در وب‌سایت، شبکه اجتماعی یا پذیرش قرار دهید.',
  'Customers join': 'مشتریان وارد صف می‌شوند',
  'Customers enter a name and receive a private ticket from any browser.':
    'مشتریان نامشان را وارد می‌کنند و از هر مرورگری نوبتی خصوصی می‌گیرند.',
  'Serve and update': 'خدمت‌رسانی و به‌روزرسانی',
  'Call the next ticket, manage service, and keep your display current.':
    'نوبت بعدی را صدا بزنید، خدمت‌رسانی را مدیریت و نمایشگر را به‌روز نگه دارید.',
  'MADE FOR SERVICE BUSINESSES': 'برای کسب‌وکارهای خدماتی',
  'A calmer way to welcome people.': 'راهی آرام‌تر برای پذیرایی از مشتریان.',
  Barbershops: 'آرایشگاه مردانه',
  'Medical clinics': 'درمانگاه',
  'Beauty salons': 'سالن زیبایی',
  Restaurants: 'رستوران',
  'Car washes': 'کارواش',
  'Repair shops': 'تعمیرگاه',
  'QUEUEUP FEATURES': 'امکانات کیواپ',
  'The useful details, handled.': 'جزئیات مهم، به‌سادگی مدیریت می‌شوند.',
  'Online ticket generation': 'صدور آنلاین نوبت',
  'Give each customer a numbered place without an account or app.':
    'بدون نیاز به حساب یا اپلیکیشن، برای هر مشتری نوبتی شماره‌دار صادر کنید.',
  'Live queue tracking': 'پیگیری زنده صف',
  'Ticket positions and current service status refresh automatically.':
    'جایگاه نوبت و وضعیت خدمت‌رسانی خودکار به‌روز می‌شوند.',
  'Smart wait estimates': 'تخمین هوشمند انتظار',
  'Use service duration and current progress to estimate the wait.':
    'زمان انتظار بر اساس مدت خدمت و روند فعلی صف تخمین زده می‌شود.',
  'Business dashboard': 'پنل مدیریت کسب‌وکار',
  'Call, serve, complete, skip, and recall tickets in one place.':
    'نوبت‌ها را از یک‌جا صدا بزنید، خدمت‌رسانی را شروع یا تمام کنید، رد کنید یا دوباره فراخوانی کنید.',
  'Flexible queue controls': 'کنترل انعطاف‌پذیر صف',
  'Pause new bookings while continuing to serve existing customers.':
    'نوبت‌گیری جدید را متوقف کنید و هم‌زمان به مشتریان فعلی خدمت‌رسانی کنید.',
  'Public display screen': 'نمایشگر عمومی صف',
  'Show current and upcoming ticket numbers without customer names.':
    'شماره نوبت فعلی و بعدی را بدون نمایش نام مشتری نشان دهید.',
  'Start small. Stay in control.': 'ساده شروع کنید و کنترل را در دست داشته باشید.',
  'Your queue, ready before the next customer walks in.':
    'صف شما پیش از رسیدن مشتری بعدی آماده است.',
  'Create your queue': 'صف خود را بسازید',
  'QueueUp · A little more room in your day.': 'کیواپ · روزی خلوت‌تر و منظم‌تر.',
  'For the people keeping things moving': 'برای کسانی که کارها را پیش می‌برند',
  'A better line starts here.': 'صفی بهتر از اینجا شروع می‌شود.',
  'Set up the queue once. Then focus on your customers while QueueUp handles the numbers.':
    'صف را یک‌بار راه‌اندازی کنید و روی مشتریان تمرکز کنید؛ کیواپ نوبت‌ها را مدیریت می‌کند.',
  'Choose your pace': 'زمان خدمت‌رسانی را تعیین کنید',
  'Set a useful service-time estimate and queue limit.':
    'زمان تقریبی هر خدمت و ظرفیت صف را مشخص کنید.',
  'Share one simple link': 'یک لینک ساده به‌اشتراک بگذارید',
  'Customers reserve a spot without making an account.':
    'مشتریان بدون ساخت حساب، جای خود را در صف رزرو می‌کنند.',
  'Run your day': 'روز کاری را مدیریت کنید',
  'Call tickets and show a live number on any screen.':
    'نوبت‌ها را صدا بزنید و شماره زنده را روی هر نمایشگری نشان دهید.',
  'Your access code is never saved in this browser.':
    'رمز مدیریت شما در این مرورگر ذخیره نمی‌شود.',
  'BUSINESS SETUP': 'راه‌اندازی کسب‌وکار',
  'A few details now. You can adjust them later.':
    'چند مورد را وارد کنید؛ بعداً می‌توانید آن‌ها را تغییر دهید.',
  'Business name': 'نام کسب‌وکار',
  'e.g. Northside Studio': 'مثلاً: آرایشگاه سپهر',
  'What kind of business?': 'نوع کسب‌وکار چیست؟',
  'Minutes per customer': 'دقیقه برای هر مشتری',
  'Queue capacity': 'ظرفیت صف',
  people: 'نفر',
  'Owner access code': 'رمز دسترسی مدیر',
  '6–128 characters': '۶ تا ۱۲۸ نویسه',
  'Choose a private access code': 'یک رمز خصوصی انتخاب کنید',
  'Confirm access code': 'تکرار رمز دسترسی',
  'Enter the same code again': 'همان رمز را دوباره وارد کنید',
  "You'll use this to sign in to your owner dashboard. Keep it somewhere safe.":
    'برای ورود به پنل مدیریت از این رمز استفاده می‌کنید؛ آن را در جای امنی نگه دارید.',
  'Setting up your queue…': 'در حال راه‌اندازی صف…',
  'Create queue': 'ساخت صف',
  'By continuing, you create an owner-managed public queue page and a privacy-safe display.':
    'با ادامه، یک صفحه عمومی نوبت‌گیری و نمایشگری امن از نظر حریم خصوصی می‌سازید که در اختیار مدیر است.',
  'Back to QueueUp': 'بازگشت به کیواپ',
  'The access codes do not match.': 'رمزها با هم مطابقت ندارند.',
  'QueueUp home': 'صفحه اصلی کیواپ',
  'OWNER ACCESS': 'دسترسی مدیر',
  'Pick up where your queue is.': 'مدیریت صف را ادامه دهید.',
  'Enter the business slug or the owner dashboard link you saved when setting up.':
    'شناسه کسب‌وکار یا لینک پنل مدیریتی را که هنگام راه‌اندازی ذخیره کرده‌اید وارد کنید.',
  'Business slug or dashboard link': 'شناسه کسب‌وکار یا لینک پنل مدیریت',
  'e.g. northside-studio-a1b2c3d4e5': 'مثلاً: cafe-123abc',
  Continue: 'ادامه',
  'Enter the business slug or its owner dashboard link.':
    'شناسه کسب‌وکار یا لینک پنل مدیریتی آن را وارد کنید.',
  'Private ticket': 'نوبت خصوصی',
  'VIRTUAL QUEUE': 'صف مجازی',
  'Take your place in line from here. We’ll keep your ticket updated while you get on with your day.':
    'از همین‌جا جای خود را در صف بگیرید. هنگام رسیدگی به کارهایتان، وضعیت نوبت را برایتان به‌روز نگه می‌داریم.',
  "Take your place in line from here. We'll keep your ticket updated while you get on with your day.":
    'از همین‌جا جای خود را در صف بگیرید. هنگام رسیدگی به کارهایتان، وضعیت نوبت را برایتان به‌روز نگه می‌داریم.',
  'People waiting': 'افراد در انتظار',
  'Typical service': 'زمان معمول خدمت',
  min: 'دقیقه',
  'Your ticket is private to this browser. No account or phone number needed.':
    'نوبت شما در این مرورگر خصوصی است؛ نیازی به حساب کاربری یا شماره تلفن نیست.',
  'The queue is taking a pause': 'صف موقتاً متوقف شده است',
  "New tickets aren't available right now. Check back soon.":
    'در حال حاضر نوبت جدید صادر نمی‌شود. کمی بعد دوباره بررسی کنید.',
  'The queue is full for now': 'ظرفیت صف فعلاً تکمیل است',
  'There are no open spots at the moment. Please check again in a little while.':
    'در حال حاضر جای خالی وجود ندارد. لطفاً کمی بعد دوباره بررسی کنید.',
  'spots available': 'جای خالی',
  'Join the queue': 'ورود به صف',
  "Just your name. We'll make you a ticket.": 'فقط نامتان را وارد کنید تا نوبت صادر شود.',
  'Your name': 'نام شما',
  'Name for your ticket': 'نام روی نوبت',
  'Saving your place…': 'در حال ثبت جایگاه شما…',
  'Get my ticket': 'دریافت نوبت',
  'By joining, you agree to be called by your ticket number.':
    'با ورود به صف، می‌پذیرید که با شماره نوبتتان فراخوانی شوید.',
  'Powered by QueueUp': 'با پشتیبانی کیواپ',
  'About QueueUp': 'درباره کیواپ',
  'We could not find that queue.': 'این صف پیدا نشد.',
  "We couldn't load the saved ticket. Your private ticket access may have expired.":
    'نوبت ذخیره‌شده بارگذاری نشد؛ ممکن است دسترسی خصوصی آن منقضی شده باشد.',
  'Start over': 'از نو شروع کنید',
  'LIVE TICKET': 'نوبت زنده',
  'You are in line. We’ll keep this page up to date.':
    'شما در صف هستید. این صفحه را به‌روز نگه می‌داریم.',
  'It’s your turn. Please head to the counter.': 'نوبت شماست؛ لطفاً به پیشخوان مراجعه کنید.',
  'You’re being served now.': 'در حال حاضر در حال خدمت‌رسانی به شما هستیم.',
  'Your visit is complete. Thanks for stopping by.': 'خدمت شما انجام شد؛ از حضورتان سپاسگزاریم.',
  'This ticket was skipped. Please speak with the business team.':
    'این نوبت رد شده است؛ لطفاً با کارکنان کسب‌وکار صحبت کنید.',
  'Your place is saved.': 'جایگاه شما در صف ثبت شد.',
  "here's the latest on your visit.": 'آخرین وضعیت نوبت شما:',
  'YOUR TICKET': 'نوبت شما',
  'Visit complete': 'خدمت انجام شد',
  'Ticket skipped': 'نوبت رد شد',
  'Ahead of you': 'افراد پیش از شما',
  'current ticket': 'نوبت فعلی',
  'Called': 'فراخوانی‌شده',
  'Serving': 'در حال خدمت‌رسانی',
  'Completed': 'انجام‌شده',
  'Skipped': 'ردشده',
  customers: 'مشتری',
  'Active queue': 'صف فعال',
  tickets: 'نوبت',
  'Estimated wait': 'زمان تقریبی انتظار',
  'estimate, may change': 'تخمینی است و ممکن است تغییر کند',
  'Updates automatically every few seconds': 'هر چند ثانیه خودکار به‌روز می‌شود',
  'Clear this ticket': 'حذف این نوبت',
  'The queue is paused. Your ticket is safe and will update when service resumes.':
    'صف موقتاً متوقف است. نوبت شما محفوظ می‌ماند و با شروع دوباره به‌روز می‌شود.',
  'Your ticket is private. Only you can see this name and ticket status.':
    'نوبت شما خصوصی است؛ فقط شما نام و وضعیت نوبت را می‌بینید.',
  'Queue details': 'جزئیات صف',
  "That page didn't load": 'بارگذاری صفحه انجام نشد',
  'Try again': 'تلاش دوباره',
  'OWNER DASHBOARD · LIVE': 'پنل مدیریت · زنده',
  'Sign in to call customers, update your queue, and keep the day moving.':
    'برای فراخوانی مشتریان، به‌روزرسانی صف و پیش‌بردن کارها وارد شوید.',
  'Your access code stays in this form only. QueueUp never stores it on this device.':
    'رمز شما فقط در این فرم باقی می‌ماند و کیواپ آن را در این دستگاه ذخیره نمی‌کند.',
  'Owner sign in': 'ورود مدیر',
  'Enter the access code you chose when you set up this business.':
    'رمزی را که هنگام راه‌اندازی کسب‌وکار انتخاب کردید وارد کنید.',
  'Access code': 'رمز دسترسی',
  'Your owner access code': 'رمز دسترسی مدیر',
  'That access code did not work.': 'رمز دسترسی درست نیست.',
  'The access code is incorrect': 'رمز دسترسی نادرست است.',
  'Sign in to access this owner dashboard.': 'برای دسترسی به پنل مدیریت وارد شوید.',
  'Signing in…': 'در حال ورود…',
  'Open dashboard': 'باز کردن پنل مدیریت',
  'Check sign-in again': 'بررسی دوباره ورود',
  'Business name must be between 2 and 100 characters': 'نام کسب‌وکار باید بین ۲ تا ۱۰۰ نویسه باشد.',
  'Business not found': 'کسب‌وکار پیدا نشد.',
  'Customer name is required': 'واردکردن نام مشتری الزامی است.',
  'This queue is paused right now': 'این صف در حال حاضر متوقف است.',
  'This browser already has an active ticket for this queue':
    'این مرورگر از قبل یک نوبت فعال در این صف دارد.',
  'This queue has reached its capacity': 'ظرفیت این صف تکمیل شده است.',
  'Ticket not found': 'نوبت پیدا نشد.',
  'Ticket access token is invalid': 'کد دسترسی نوبت معتبر نیست.',
  'There are no customers waiting': 'مشتری‌ای در صف انتظار نیست.',
  'There is no current customer': 'مشتری فعالی وجود ندارد.',
  'Only a called customer can start service': 'فقط مشتری فراخوانی‌شده می‌تواند خدمت بگیرد.',
  'Only a serving customer can be completed': 'فقط خدمت مشتریِ در حال رسیدگی را می‌توان تمام کرد.',
  'Only an active ticket can be skipped': 'فقط نوبت فعال را می‌توان رد کرد.',
  'Skip this ticket? The customer will leave the active queue.':
    'این نوبت رد شود؟ مشتری از صف فعال خارج خواهد شد.',
  'Service started.': 'خدمت‌رسانی آغاز شد.',
  'Service completed.': 'خدمت‌رسانی تمام شد.',
  'Ticket skipped.': 'نوبت رد شد.',
  'Queue updated.': 'صف به‌روز شد.',
  'Current ticket recalled.': 'نوبت فعلی دوباره فراخوانی شد.',
  'Next customer called.': 'مشتری بعدی فراخوانی شد.',
  'Business settings saved.': 'تنظیمات کسب‌وکار ذخیره شد.',
  'Bookings have resumed.': 'نوبت‌گیری دوباره فعال شد.',
  'New bookings are paused.': 'نوبت‌گیری جدید متوقف شد.',
  'Booking page': 'صفحه نوبت‌گیری',
  'TV display': 'نمایشگر',
  'Sign out': 'خروج',
  "Good day, let's keep it moving.": 'روز بخیر، صف را روان نگه داریم.',
  'Your queue refreshes automatically every few seconds.':
    'صف شما هر چند ثانیه خودکار به‌روز می‌شود.',
  'Bookings paused': 'نوبت‌گیری متوقف است',
  'Taking customers': 'پذیرش مشتری فعال است',
  'Resume queue': 'فعال‌کردن صف',
  'Pause queue': 'توقف صف',
  'YOUR QUEUE IS READY': 'صف شما آماده است',
  'Save these links to share the queue and return to your owner dashboard.':
    'این لینک‌ها را برای اشتراک‌گذاری صف و بازگشت به پنل مدیریت ذخیره کنید.',
  'Dismiss setup confirmation': 'بستن تأیید راه‌اندازی',
  'Customer booking': 'نوبت‌گیری مشتری',
  'Public link for customers': 'لینک عمومی مشتریان',
  'Owner dashboard': 'پنل مدیریت',
  'Private link for business management': 'لینک خصوصی مدیریت کسب‌وکار',
  'Ticket numbers only': 'فقط شماره نوبت‌ها',
  Waiting: 'در انتظار',
  'Being served': 'در حال خدمت‌رسانی',
  'Completed tickets': 'نوبت‌های انجام‌شده',
  'Average wait': 'میانگین انتظار',
  'in the queue': 'در صف',
  'right now': 'اکنون',
  'all time': 'از ابتدا',
  'recent customers': 'مشتریان اخیر',
  'Your queue': 'صف شما',
  Live: 'زنده',
  'Tickets stay in order. Names are only visible here.':
    'ترتیب نوبت‌ها حفظ می‌شود؛ نام‌ها فقط در اینجا نمایش داده می‌شوند.',
  Refresh: 'به‌روزرسانی',
  'NOW SERVING': 'در حال خدمت‌رسانی',
  'CALLED TO COUNTER': 'فراخوانی به پیشخوان',
  'Start service': 'شروع خدمت',
  Complete: 'پایان خدمت',
  Recall: 'فراخوانی دوباره',
  Skip: 'رد کردن',
  'READY WHEN YOU ARE': 'هر وقت آماده‌اید',
  'Your queue,': 'صف شما،',
  'your rhythm.': 'با ریتم خودتان.',
  'is next': 'نفر بعد است',
  'joined at': 'ورود در',
  'No one is waiting right now': 'در حال حاضر کسی در صف نیست',
  'joined ·': 'ورود ·',
  'Your queue is clear.': 'صف شما خالی است.',
  'Call next': 'فراخوانی نفر بعد',
  Ticket: 'نوبت',
  Customer: 'مشتری',
  Joined: 'زمان ورود',
  Status: 'وضعیت',
  Action: 'اقدام',
  'No tickets yet': 'هنوز نوبتی ثبت نشده است',
  'Share your booking link to welcome your first customer.':
    'لینک نوبت‌گیری را به‌اشتراک بگذارید تا اولین مشتری وارد صف شود.',
  Start: 'شروع',
  'recent ticket': 'نوبت اخیر',
  'recent tickets': 'نوبت اخیر',
  'Refreshes every 3 seconds': 'هر ۳ ثانیه به‌روز می‌شود',
  'QUICK LINKS': 'لینک‌های سریع',
  'Share the right screen': 'لینک مناسب را به‌اشتراک بگذارید',
  'Let customers reserve a spot': 'رزرو نوبت برای مشتریان',
  'Private business management link': 'لینک خصوصی مدیریت کسب‌وکار',
  'Public TV display': 'نمایشگر عمومی',
  'Shows ticket numbers, never names': 'نمایش شماره نوبت، بدون نام',
  Copied: 'کپی شد',
  'Copy link': 'کپی لینک',
  'Queue settings': 'تنظیمات صف',
  'Business details and service pace': 'اطلاعات کسب‌وکار و زمان خدمت',
  'QUEUE STATUS': 'وضعیت صف',
  'Customer reservations': 'نوبت‌گیری مشتریان',
  Paused: 'متوقف',
  Open: 'فعال',
  'Existing tickets remain active. Resume whenever you are ready.':
    'نوبت‌های ثبت‌شده فعال می‌مانند. هر زمان آماده بودید صف را دوباره فعال کنید.',
  'Up to': 'حداکثر',
  'people can join the queue.': 'نفر می‌توانند وارد صف شوند.',
  Category: 'دسته‌بندی',
  'Minutes per service': 'دقیقه برای هر خدمت',
  'Saving changes…': 'در حال ذخیره تغییرات…',
  'Save settings': 'ذخیره تنظیمات',
  'LIVE QUEUE DISPLAY': 'نمایش زنده صف',
  NEXT: 'نوبت بعد',
  LIVE: 'زنده',
  'Queue paused': 'صف متوقف است',
  'Please come to the counter': 'لطفاً به پیشخوان مراجعه کنید',
  'Please be ready': 'لطفاً آماده باشید',
  waiting: 'در انتظار',
  AFTER: 'بعد از',
  'No one is waiting': 'کسی در صف انتظار نیست',
  'The next ticket will appear here.': 'نوبت بعدی اینجا نمایش داده می‌شود.',
  'QueueUp · Ticket numbers only': 'کیواپ · فقط شماره نوبت‌ها',
  'Updates automatically': 'به‌روزرسانی خودکار',
  '404 Page Not Found': '۴۰۴ · صفحه پیدا نشد',
  'Did you forget to add the page to the router?': 'این صفحه در مسیرهای برنامه ثبت نشده است.',
  Barbershop: 'آرایشگاه مردانه',
  'Beauty Salon': 'سالن زیبایی',
  'Medical Clinic': 'درمانگاه',
  Restaurant: 'رستوران',
  'Car Wash': 'کارواش',
  'Repair Shop': 'تعمیرگاه',
  Other: 'سایر',
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  try {
    const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
    if (requestedLanguage === 'fa' || requestedLanguage === 'en') return requestedLanguage;
    return window.localStorage.getItem(languageStorageKey) === 'fa' ? 'fa' : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    const url = new URL(window.location.href);
    url.searchParams.delete('lang');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);
  const value = useMemo(() => ({ language, setLanguage }), [language]);

  useEffect(() => {
    document.documentElement.lang = language === 'fa' ? 'fa' : 'en';
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    try {
      window.localStorage.setItem(languageStorageKey, language);
    } catch {
      // The current selection still applies for this session when storage is unavailable.
    }
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export function useT() {
  const { language } = useLanguage();
  return (text: string) => translateText(text, language);
}

export function translateText(text: string, language: Language) {
  return language === 'fa' ? persian[text] || text : text;
}

export function formatNumber(value: number, language: Language) {
  return new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en-US').format(value);
}
