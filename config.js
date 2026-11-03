// إعدادات هذه النسخة من النظام. كل مسجد له نسخته وقاعدة بياناته الخاصة.
window.APP_CONFIG = {
  orgName: "مجمع الحلقات",                  // اسم المجمع كما يظهر في الموقع
  tagline: "لتحفيظ القرآن الكريم",          // السطر تحت الاسم (مثلاً: لتحفيظ القرآن الكريم · حي ...)
  est: "",                                   // سنة التأسيس، مثل: تأسس عام 1426هـ (اتركه فارغًا لإخفائه)
  siteUrl: location.origin,
  supabaseUrl: "https://vtpjmvrebcheupoydclg.supabase.co",
  supabaseKey: "sb_publishable_Xglo4NXVwd7kgsfbL57-1w_DnhS-mpx",
  dbSchema: "public"
};
// الهوية والألوان (الاسم والشعار والثيم) تُحمَّل قبل باقي الملفات
document.write('<script src="brand.js"><\/script>');
