// constants/translations.ts
// ─────────────────────────────────────────────────────────────
// ElectraGuard — App Translations
// Languages: English, Urdu (Roman), Urdu (Script), Arabic
// ─────────────────────────────────────────────────────────────

export type Language = 'en' | 'ur_roman' | 'ur' | 'ar';
export type Theme    = 'light' | 'dark' | 'system';

export interface Translations {
  // ── General ──
  appName:          string;
  loading:          string;
  save:             string;
  cancel:           string;
  close:            string;
  confirm:          string;
  retry:            string;
  ok:               string;
  error:            string;
  success:          string;

  // ── Auth ──
  login:            string;
  logout:           string;
  logoutConfirm:    string;
  logoutMessage:    string;
  register:         string;
  email:            string;
  password:         string;
  continueBtn:      string;

  // ── Profile ──
  profile:          string;
  profileInfo:      string;
  fullName:         string;
  consumerId:       string;
  cnicNumber:       string;
  mobileNumber:     string;
  role:             string;
  registeredOn:     string;
  consumer:         string;

  // ── Sections ──
  account:          string;
  preferences:      string;
  security:         string;
  about:            string;

  // ── Menu Items ──
  notifications:    string;
  notificationsBar: string; 
  notificationsSub: string;
  systemSettings:   string;
  changePassword:   string;
  twoFactor:        string;
  twoFactorSub:     string;
  appVersion:       string;
  privacyPolicy:    string;
  phone:            string;

  // ── System Settings ──
  settingsTitle:    string;
  appLanguage:      string;
  appTheme:         string;
  dataSync:         string;
  dataSyncSub:      string;
  cacheInfo:        string;
  cacheInfoSub:     string;
  themeLight:       string;
  themeDark:        string;
  themeSystem:      string;

  // ── Change Password ──
  changePassTitle:  string;
  changePassSub:    string;
  oldPassword:      string;
  newPassword:      string;
  confirmPassword:  string;
  forgotPassword:   string;
  incorrectPass:    string;
  passMismatch:     string;
  passShort:        string;
  passUpdated:      string;

  // ── Report Screen ──
  reportTheft:      string;
  reportSub:        string;
  reportingAs:      string;
  submitReport:      string;
  issueType:        string;
  description:      string;
  meterLocation:    string;
  urgencyLevel:     string;
  uploadPhoto:      string;
  uploadOptional:   string;
  submitBtn:        string;
  myCases:          string;
  noCases:          string;
  resolution:       string;

  // ── Support Screen ──
  helpSupport:      string;
  helpSub:          string;
  liveChat:         string;
  helpline:         string;
  knowledgeBase:    string;
  faqs:             string;
  askAI:            string;

  // ── Notifications ──
  notifTitle:       string;
  notifSub:         string;
  notifBody:        string;

  // ── Privacy Policy ──
  privacyTitle:     string;
  lastUpdated:      string;
}

// ─────────────────────────────────────────────────────────────
// ENGLISH
// ─────────────────────────────────────────────────────────────
export const en: Translations = {
  appName:          'ElectraGuard',
  loading:          'Loading...',
  save:             'Save',
  cancel:           'Cancel',
  close:            'Close',
  confirm:          'Confirm',
  retry:            'Retry',
  ok:               'OK',
  error:            'Error',
  success:          'Success',

  login:            'Login',
  logout:           'Logout',
  logoutConfirm:    'Logout',
  logoutMessage:    'Are you sure you want to logout?',
  register:         'Register',
  email:            'Email',
  password:         'Password',
  continueBtn:      'Continue',

  profile:          'Profile',
  profileInfo:      'Profile Information',
  fullName:         'Full Name',
  consumerId:       'Consumer ID',
  cnicNumber:       'CNIC Number',
  mobileNumber:     'Mobile Number',
  role:             'Role',
  registeredOn:     'Registered On',
  consumer:         'Consumer',

  account:          'Account',
  preferences:      'Preferences',
  security:         'Security',
  about:            'About',

  notifications:    'Notifications',
  notificationsBar: 'Push notifications enabled',
  notificationsSub: 'Push notifications enabled',
  systemSettings:   'System Settings',
  changePassword:   'Change Password',
  twoFactor:        'Two-Factor Authentication',
  twoFactorSub:     'Coming soon',
  appVersion:       'App Version',
  privacyPolicy:    'Privacy Policy',
  phone:            'Phone',

  settingsTitle:    'System Settings',
  appLanguage:      'App Language',
  appTheme:         'App Theme',
  dataSync:         'Data Sync',
  dataSyncSub:      'Auto',
  cacheInfo:        'Cache',
  cacheInfoSub:     'Cleared on logout',
  themeLight:       'Light',
  themeDark:        'Dark',
  themeSystem:      'System',

  changePassTitle:  'Change Password',
  changePassSub:    'Enter your old password to continue.',
  oldPassword:      'Old password',
  newPassword:      'New password',
  confirmPassword:  'Confirm new password',
  forgotPassword:   'Forgot Password?',
  incorrectPass:    'Old password is wrong.',
  passMismatch:     'New passwords do not match.',
  passShort:        'New password must be at least 6 characters.',
  passUpdated:      'Password updated successfully!',

  reportTheft:      'Report Theft',
  reportSub:        'Submit meter issues, billing concerns, or unusual activity',
  reportingAs:      'Reporting as',
  submitReport:      'Submit New Report',
  issueType:        'Issue Type',
  description:      'Description',
  meterLocation:    'Meter Location',
  urgencyLevel:     'Urgency Level',
  uploadPhoto:      'Upload Photo',
  uploadOptional:   'Upload Photo (Optional)',
  submitBtn:        'Submit Report',
  myCases:          'My Submitted Cases',
  noCases:          'No cases submitted yet',
  resolution:       'Resolution',

  helpSupport:      'Help & Support',
  helpSub:          'Get answers to your questions and learn about energy conservation',
  liveChat:         'Live Chat',
  helpline:         'Helpline',
  knowledgeBase:    'Knowledge Base',
  faqs:             'Frequently Asked Questions',
  askAI:            'Ask AI Assistant',

  notifTitle:       'Notifications',
  notifSub:         'Push Notifications',
  notifBody:        'You will receive push notifications from admin for alerts, consumption updates, and theft detection results.',

  privacyTitle:     'Privacy Policy',
  lastUpdated:      'Last updated: April 2026 • ElectraGuard v1.0.0',
};

// ─────────────────────────────────────────────────────────────
// URDU — ROMAN SCRIPT
// ─────────────────────────────────────────────────────────────
export const ur_roman: Translations = {
  appName:          'ElectraGuard',
  loading:          'Load ho raha hai...',
  save:             'Save karein',
  cancel:           'Mansookh karein',
  close:            'Band karein',
  confirm:          'Tassdeq karein',
  retry:            'Dobara koshish',
  ok:               'Theek hai',
  error:            'Ghalti',
  success:          'Kamyabi',

  login:            'Login karein',
  logout:           'Logout karein',
  logoutConfirm:    'Logout',
  logoutMessage:    'Kya aap waqai logout karna chahte hain?',
  register:         'Register karein',
  email:            'Email',
  password:         'Password',
  continueBtn:      'Agay barein',

  profile:          'Profile',
  profileInfo:      'Profile ki Maloomat',
  fullName:         'Poora Naam',
  consumerId:       'Consumer ID',
  cnicNumber:       'CNIC Number',
  mobileNumber:     'Mobile Number',
  role:             'Kirdar',
  registeredOn:     'Registration ki Tarikh',
  consumer:         'Consumer',

  account:          'Account',
  preferences:      'Tarjeehaat',
  security:         'Tahafuz',
  about:            'Baray mein',

  notifications:    'Notifications',
  notificationsBar: 'Push notifications on hain',
  notificationsSub: 'Push notifications on hain',
  systemSettings:   'System Settings',
  changePassword:   'Password Tabdeel karein',
  twoFactor:        'Do Qadam Tasdeq',
  twoFactorSub:     'Jald aane wala hai',
  appVersion:       'App Version',
  privacyPolicy:    'Privacy Policy',
  phone:            'Phone',

  settingsTitle:    'System Settings',
  appLanguage:      'App ki Zaban',
  appTheme:         'App ki Theme',
  dataSync:         'Data Sync',
  dataSyncSub:      'Khudkar',
  cacheInfo:        'Cache',
  cacheInfoSub:     'Logout par saaf ho jata hai',
  themeLight:       'Roshan',
  themeDark:        'Andheray',
  themeSystem:      'System',

  changePassTitle:  'Password Tabdeel karein',
  changePassSub:    'Jaari rakhne ke liye purana password darj karein.',
  oldPassword:      'Purana password',
  newPassword:      'Naya password',
  confirmPassword:  'Naya password dobara likhein',
  forgotPassword:   'Password bhool gaye?',
  incorrectPass:    'Purana password galat hai.',
  passMismatch:     'Naye passwords match nahi karte.',
  passShort:        'Naya password kam az kam 6 characters ka hona chahiye.',
  passUpdated:      'Password kamyabi se update ho gaya!',

  reportTheft:      'Chori Report karein',
  reportSub:        'Meter ki masail, billing ki shikayat ya ghair mamuli harkat submit karein',
  reportingAs:      'Report kar rahe hain bataur',
  submitReport:      'Nayi Report Submit karein',
  issueType:        'Maslay ki Qisam',
  description:      'Tafseelaat',
  meterLocation:    'Meter ki Jagah',
  urgencyLevel:     'Jaldi ka Darja',
  uploadPhoto:      'Tasweer Upload karein',
  uploadOptional:   'Tasweer Upload karein (Ikhtiyari)',
  submitBtn:        'Report Submit karein',
  myCases:          'Meri Submit ki gayi Cases',
  noCases:          'Abhi tak koi case submit nahi hua',
  resolution:       'Hal',

  helpSupport:      'Madad aur Sahara',
  helpSub:          'Apne sawalon ke jawab payen aur energy bachat ke baray mein janein',
  liveChat:         'Live Chat',
  helpline:         'Helpline',
  knowledgeBase:    'Knowledge Base',
  faqs:             'Aam Puche Jane Wale Sawal',
  askAI:            'AI Assistant se Poochein',

  notifTitle:       'Notifications',
  notifSub:         'Push Notifications',
  notifBody:        'Admin ki taraf se alerts, consumption updates, aur chori detection results ke liye push notifications milein ge.',

  privacyTitle:     'Privacy Policy',
  lastUpdated:      'Aakhri update: April 2026 • ElectraGuard v1.0.0',
};

// ─────────────────────────────────────────────────────────────
// URDU — NASTALIQ SCRIPT (RTL)
// ─────────────────────────────────────────────────────────────
export const ur: Translations = {
  appName:          'الیکٹراگارڈ',
  loading:          'لوڈ ہو رہا ہے...',
  save:             'محفوظ کریں',
  cancel:           'منسوخ کریں',
  close:            'بند کریں',
  confirm:          'تصدیق کریں',
  retry:            'دوبارہ کوشش کریں',
  ok:               'ٹھیک ہے',
  error:            'غلطی',
  success:          'کامیابی',

  login:            'لاگ ان کریں',
  logout:           'لاگ آؤٹ کریں',
  logoutConfirm:    'لاگ آؤٹ',
  logoutMessage:    'کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟',
  register:         'رجسٹر کریں',
  email:            'ای میل',
  password:         'پاس ورڈ',
  continueBtn:      'آگے بڑھیں',

  profile:          'پروفائل',
  profileInfo:      'پروفائل کی معلومات',
  fullName:         'پورا نام',
  consumerId:       'کنزیومر آئی ڈی',
  cnicNumber:       'شناختی کارڈ نمبر',
  mobileNumber:     'موبائل نمبر',
  role:             'کردار',
  registeredOn:     'رجسٹریشن کی تاریخ',
  consumer:         'صارف',

  account:          'اکاؤنٹ',
  preferences:      'ترجیحات',
  security:         'تحفظ',
  about:            'کے بارے میں',

  notifications:    'اطلاعات',
  notificationsBar: 'پش اطلاعات فعال ہیں',
  notificationsSub: 'پش اطلاعات فعال ہیں',
  systemSettings:   'سسٹم کی ترتیبات',
  changePassword:   'پاس ورڈ تبدیل کریں',
  twoFactor:        'دو مرحلہ تصدیق',
  twoFactorSub:     'جلد آنے والا ہے',
  appVersion:       'ایپ ورژن',
  privacyPolicy:    'رازداری کی پالیسی',
  phone:            'فون',

  settingsTitle:    'سسٹم کی ترتیبات',
  appLanguage:      'ایپ کی زبان',
  appTheme:         'ایپ کا تھیم',
  dataSync:         'ڈیٹا سنک',
  dataSyncSub:      'خودکار',
  cacheInfo:        'کیشے',
  cacheInfoSub:     'لاگ آؤٹ پر صاف ہو جاتا ہے',
  themeLight:       'روشن',
  themeDark:        'تاریک',
  themeSystem:      'سسٹم',

  changePassTitle:  'پاس ورڈ تبدیل کریں',
  changePassSub:    'جاری رکھنے کے لیے پرانا پاس ورڈ درج کریں۔',
  oldPassword:      'پرانا پاس ورڈ',
  newPassword:      'نیا پاس ورڈ',
  confirmPassword:  'نیا پاس ورڈ دوبارہ لکھیں',
  forgotPassword:   'پاس ورڈ بھول گئے؟',
  incorrectPass:    'پرانا پاس ورڈ غلط ہے۔',
  passMismatch:     'نئے پاس ورڈ میل نہیں کھاتے۔',
  passShort:        'نیا پاس ورڈ کم از کم ۶ حروف کا ہونا چاہیے۔',
  passUpdated:      'پاس ورڈ کامیابی سے اپ ڈیٹ ہو گیا!',

  reportTheft:      'چوری رپورٹ کریں',
  reportSub:        'میٹر کے مسائل، بلنگ کی شکایت یا غیر معمولی سرگرمی جمع کریں',
  reportingAs:      'بطور رپورٹ کر رہے ہیں',
  submitReport:      'نئی رپورٹ جمع کریں',
  issueType:        'مسئلے کی قسم',
  description:      'تفصیلات',
  meterLocation:    'میٹر کی جگہ',
  urgencyLevel:     'فوری درجہ',
  uploadPhoto:      'تصویر اپلوڈ کریں',
  uploadOptional:   'تصویر اپلوڈ کریں (اختیاری)',
  submitBtn:        'رپورٹ جمع کریں',
  myCases:          'میری جمع کردہ کیسز',
  noCases:          'ابھی تک کوئی کیس جمع نہیں ہوا',
  resolution:       'حل',

  helpSupport:      'مدد اور سہارا',
  helpSub:          'اپنے سوالوں کے جواب پائیں اور توانائی کی بچت کے بارے میں جانیں',
  liveChat:         'لائیو چیٹ',
  helpline:         'ہیلپ لائن',
  knowledgeBase:    'علمی بنیاد',
  faqs:             'اکثر پوچھے جانے والے سوالات',
  askAI:            'AI اسسٹنٹ سے پوچھیں',

  notifTitle:       'اطلاعات',
  notifSub:         'پش اطلاعات',
  notifBody:        'ایڈمن کی طرف سے الرٹس، استعمال کی تازہ کاری، اور چوری کی نشاندہی کے نتائج کے لیے پش اطلاعات ملیں گی۔',

  privacyTitle:     'رازداری کی پالیسی',
  lastUpdated:      'آخری اپ ڈیٹ: اپریل ۲۰۲۶ • الیکٹراگارڈ v1.0.0',
};

// ─────────────────────────────────────────────────────────────
// ARABIC (RTL)
// ─────────────────────────────────────────────────────────────
export const ar: Translations = {
  appName:          'إليكترا غارد',
  loading:          'جارٍ التحميل...',
  save:             'حفظ',
  cancel:           'إلغاء',
  close:            'إغلاق',
  confirm:          'تأكيد',
  retry:            'إعادة المحاولة',
  ok:               'حسناً',
  error:            'خطأ',
  success:          'نجاح',

  login:            'تسجيل الدخول',
  logout:           'تسجيل الخروج',
  logoutConfirm:    'تسجيل الخروج',
  logoutMessage:    'هل أنت متأكد من تسجيل الخروج؟',
  register:         'التسجيل',
  email:            'البريد الإلكتروني',
  password:         'كلمة المرور',
  continueBtn:      'متابعة',

  profile:          'الملف الشخصي',
  profileInfo:      'معلومات الملف الشخصي',
  fullName:         'الاسم الكامل',
  consumerId:       'رقم المستهلك',
  cnicNumber:       'رقم الهوية الوطنية',
  mobileNumber:     'رقم الهاتف المحمول',
  role:             'الدور',
  registeredOn:     'تاريخ التسجيل',
  consumer:         'مستهلك',

  account:          'الحساب',
  preferences:      'التفضيلات',
  security:         'الأمان',
  about:            'حول',

  notifications:    'الإشعارات',
  notificationsBar: 'الإشعارات الفورية مفعّلة',
  notificationsSub: 'الإشعارات الفورية مفعّلة',
  systemSettings:   'إعدادات النظام',
  changePassword:   'تغيير كلمة المرور',
  twoFactor:        'المصادقة الثنائية',
  twoFactorSub:     'قريباً',
  appVersion:       'إصدار التطبيق',
  privacyPolicy:    'سياسة الخصوصية',
  phone:            'الهاتف',

  settingsTitle:    'إعدادات النظام',
  appLanguage:      'لغة التطبيق',
  appTheme:         'مظهر التطبيق',
  dataSync:         'مزامنة البيانات',
  dataSyncSub:      'تلقائي',
  cacheInfo:        'ذاكرة التخزين المؤقت',
  cacheInfoSub:     'يُمسح عند تسجيل الخروج',
  themeLight:       'فاتح',
  themeDark:        'داكن',
  themeSystem:      'النظام',

  changePassTitle:  'تغيير كلمة المرور',
  changePassSub:    'أدخل كلمة المرور القديمة للمتابعة.',
  oldPassword:      'كلمة المرور القديمة',
  newPassword:      'كلمة المرور الجديدة',
  confirmPassword:  'تأكيد كلمة المرور الجديدة',
  forgotPassword:   'نسيت كلمة المرور؟',
  incorrectPass:    'كلمة المرور القديمة غلط.',
  passMismatch:     'كلمتا المرور الجديدتان غير متطابقتين.',
  passShort:        'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.',
  passUpdated:      'تم تحديث كلمة المرور بنجاح!',

  reportTheft:      'الإبلاغ عن السرقة',
  reportSub:        'أرسل مشاكل العداد أو شكاوى الفواتير أو النشاط غير المعتاد',
  reportingAs:      'الإبلاغ بوصفك',
  submitReport:      'إرسال تقرير جديد',
  issueType:        'نوع المشكلة',
  description:      'الوصف',
  meterLocation:    'موقع العداد',
  urgencyLevel:     'مستوى الإلحاح',
  uploadPhoto:      'رفع صورة',
  uploadOptional:   'رفع صورة (اختياري)',
  submitBtn:        'إرسال التقرير',
  myCases:          'حالاتي المُرسَلة',
  noCases:          'لا توجد حالات مُرسَلة بعد',
  resolution:       'الحل',

  helpSupport:      'المساعدة والدعم',
  helpSub:          'احصل على إجابات لأسئلتك وتعرّف على ترشيد استهلاك الطاقة',
  liveChat:         'الدردشة المباشرة',
  helpline:         'خط المساعدة',
  knowledgeBase:    'قاعدة المعرفة',
  faqs:             'الأسئلة المتكررة',
  askAI:            'اسأل المساعد الذكي',

  notifTitle:       'الإشعارات',
  notifSub:         'الإشعارات الفورية',
  notifBody:        'ستتلقى إشعارات فورية من المسؤول للتنبيهات وتحديثات الاستهلاك ونتائج كشف السرقة.',

  privacyTitle:     'سياسة الخصوصية',
  lastUpdated:      'آخر تحديث: أبريل 2026 • إليكترا غارد v1.0.0',
};

// ─────────────────────────────────────────────────────────────
// LANGUAGE MAP
// ─────────────────────────────────────────────────────────────
export const translationsMap: Record<Language, Translations> = {
  en,
  ur_roman,
  ur,
  ar,
};

export const languageLabels: Record<Language, string> = {
  en:       'English',
  ur_roman: 'اردو (Roman)',
  ur:       'اردو',
  ar:       'العربية',
};

export const rtlLanguages: Language[] = ['ur', 'ar'];

export const isRTL = (lang: Language) => rtlLanguages.includes(lang);