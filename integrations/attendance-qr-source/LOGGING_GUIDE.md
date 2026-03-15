# نظام التسجيل (Logging System)

## نظرة عامة
نظام تسجيل متقدم يتتبع جميع الأحداث، الأخطاء، والتفاعلات في التطبيق لتسهيل اكتشاف المشاكل والأخطاء.

## الميزات الرئيسية

### 1. التسجيل التلقائي
- ✅ **جميع الأخطاء JavaScript** - يتم تسجيل أي خطأ يحدث تلقائياً
- ✅ **أخطاء Promise** - تسجيل الأخطاء غير المعالجة
- ✅ **نقرات المستخدم** - تسجيل جميع النقرات على الأزرار والروابط
- ✅ **التنقل بين الصفحات** - تسجيل كل تغيير في الصفحة
- ✅ **عمليات قاعدة البيانات** - إضافة، تحديث، حذف الطلاب
- ✅ **أحداث الترخيص** - تفعيل، انتهاء، حذف التراخيص

### 2. مستويات التسجيل
- **DEBUG** 🔍 - معلومات تفصيلية للتطوير
- **INFO** ℹ️ - معلومات عامة عن سير العمل
- **WARN** ⚠️ - تحذيرات لا تمنع عمل التطبيق
- **ERROR** ❌ - أخطاء تحتاج معالجة
- **CRITICAL** 🔥 - أخطاء حرجة تؤثر على التطبيق

### 3. حفظ السجلات
- يتم الحفظ تلقائياً في `localStorage`
- نسخة احتياطية في `sessionStorage`
- حفظ دوري كل 30 ثانية
- الحد الأقصى: 10,000 سجل

## كيفية الاستخدام

### الوصول إلى صفحة السجلات
1. اضغط **Ctrl+Shift+L** في الصفحة الرئيسية
2. سيظهر زر "السجلات" في شريط الأدوات العلوي
3. اضغط على الزر للذهاب إلى صفحة عرض السجلات

أو مباشرة: `logs.html`

### استخدام Logger في الكود

#### التسجيل البسيط
```javascript
// معلومات عامة
window.logger.info('CATEGORY', 'رسالة الحدث', { data: 'value' });

// تحذير
window.logger.warn('CATEGORY', 'رسالة تحذير', { details: 'info' });

// خطأ
window.logger.error('CATEGORY', 'رسالة خطأ', { error: errorObject });

// حرج
window.logger.critical('CATEGORY', 'خطأ حرج', { criticalData: 'data' });
```

#### أمثلة من التطبيق
```javascript
// تسجيل إضافة طالب
window.logger.info('DATA_ADD_STUDENT', 'إضافة طالب جديد', {
  id: studentId,
  name: studentName,
  grade: grade
});

// تسجيل خطأ
window.logger.error('FORM_VALIDATION', 'فشل التحقق من البيانات', {
  field: 'name',
  error: 'الحقل فارغ'
});

// تسجيل حدث ترخيص
window.logger.info('LICENSE_ACTIVATED', 'تم تفعيل الترخيص', {
  type: licenseType,
  expiryDate: expiryDate
});
```

### فلترة السجلات
في صفحة السجلات (`logs.html`):
- **البحث** - ابحث في الرسائل والبيانات
- **المستوى** - فلتر حسب DEBUG, INFO, WARN, ERROR, CRITICAL
- **الفئة** - فلتر حسب فئة الحدث (DATA, LICENSE, USER_INTERACTION, إلخ)

### تصدير السجلات
- **JSON** - تصدير كامل للسجلات بصيغة JSON
- **CSV** - تصدير للاستخدام في Excel

### مسح السجلات
- زر "مسح الكل" في صفحة السجلات
- يحذف جميع السجلات من localStorage

## الفئات المستخدمة

| الفئة | الوصف |
|------|-------|
| `SYSTEM` | أحداث النظام العامة |
| `USER_INTERACTION` | تفاعلات المستخدم |
| `BUTTON_CLICK` | نقرات الأزرار |
| `NAVIGATION` | التنقل بين الصفحات |
| `DATA_ADD_STUDENT` | إضافة طالب |
| `DATA_UPDATE_STUDENT` | تحديث بيانات طالب |
| `DATA_DELETE_STUDENT` | حذف طالب |
| `DATA_RECORD_ATTENDANCE` | تسجيل حضور |
| `LICENSE` | أحداث الترخيص العامة |
| `LICENSE_ACTIVATED` | تفعيل ترخيص |
| `LICENSE_EXPIRED` | انتهاء ترخيص |
| `LICENSE_CLEARED` | حذف ترخيص |
| `LICENSE_TAMPERING` | محاولة تلاعب بالترخيص |
| `JS_ERROR` | أخطاء JavaScript |
| `PROMISE_ERROR` | أخطاء Promise |
| `CONSOLE_ERROR` | رسائل console.error |
| `LOGGER` | أحداث Logger نفسه |
| `DEVELOPER_MODE` | وضع المطور |
| `LOGS_VIEWER` | أحداث صفحة عرض السجلات |

## هيكل السجل

كل سجل يحتوي على:
```javascript
{
  id: 1,                                    // معرف فريد
  timestamp: "2026-02-11T10:30:00.000Z",   // التوقيت
  sessionId: "SESSION_123...",              // معرف الجلسة
  level: "INFO",                            // المستوى
  category: "DATA_ADD_STUDENT",             // الفئة
  message: "إضافة طالب جديد",                // الرسالة
  data: { id: "123", name: "أحمد" },        // البيانات الإضافية
  url: "http://localhost/students.html",    // الصفحة
  userAgent: "Mozilla/5.0 ..."              // معلومات المتصفح
}
```

## نصائح للمطورين

### 1. استخدم المستوى المناسب
- `DEBUG` للمعلومات التفصيلية أثناء التطوير فقط
- `INFO` للأحداث العادية
- `WARN` للتحذيرات
- `ERROR` للأخطاء القابلة للمعالجة
- `CRITICAL` للأخطاء الخطيرة

### 2. أضف بيانات كافية
```javascript
// ❌ سيء
logger.error('ERROR', 'حدث خطأ');

// ✅ جيد
logger.error('FORM_SUBMISSION', 'فشل حفظ النموذج', {
  form: 'studentForm',
  field: 'name',
  value: inputValue,
  error: error.message,
  stack: error.stack
});
```

### 3. استخدم فئات واضحة
- استخدم أسماء فئات وصفية ومتسقة
- اتبع نمط `MODULE_ACTION` (مثل `DATA_ADD_STUDENT`)

### 4. تجنب البيانات الحساسة
```javascript
// ❌ لا تسجل كلمات المرور أو بيانات حساسة
logger.info('LOGIN', 'محاولة تسجيل دخول', {
  password: userPassword  // خطأ!
});

// ✅ سجل معلومات آمنة فقط
logger.info('LOGIN', 'محاولة تسجيل دخول', {
  username: username,
  timestamp: Date.now()
});
```

## الأداء

- تأثير ضئيل جداً على الأداء
- التسجيل غير متزامن قدر الإمكان
- حفظ دوري يمنع فقدان السجلات
- تنظيف تلقائي للسجلات القديمة

## دعم المتصفحات

- ✅ Chrome/Edge (مستحسن)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ⚠️ IE11 (دعم محدود)

## استكشاف الأخطاء

### السجلات لا تظهر
1. تحقق من أن `logger.js` محمل في الصفحة
2. افتح Console وتحقق من وجود أخطاء
3. تحقق من أن localStorage ممكّن

### زر السجلات لا يظهر
اضغط **Ctrl+Shift+L** في الصفحة الرئيسية

### السجلات تختفي
- تحقق من الحد الأقصى للسجلات (10,000)
- تحقق من مساحة localStorage المتاحة

## الخلاصة

نظام التسجيل يوفر:
- 📊 رؤية كاملة لما يحدث في التطبيق
- 🐛 اكتشاف سريع للأخطاء والمشاكل
- 📈 تتبع سلوك المستخدمين
- 🔍 تحليل الأداء
- 🛡️ مراقبة أمنية

---
**آخر تحديث:** فبراير 2026
**الإصدار:** 1.0
