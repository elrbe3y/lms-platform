# 🎓 منصة محمد الربيعي التعليمية

## نظام إدارة تعلم متقدم (LMS) بمستوى أمان "حصن سيبراني"

---

## 📋 نظرة عامة

منصة تعليمية متكاملة مصممة خصيصاً للمدرس **محمد الربيعي** لإدارة المحتوى التعليمي، الطلاب، والمدفوعات بكفاءة عالية وأمان فائق.

### ✨ الميزات الرئيسية

#### 🔐 1. نظام الأمان المتقدم
- **جهاز واحد فقط**: منع تسجيل الدخول المتزامن من أجهزة متعددة
- **التحقق اليدوي**: يجب على الأدمن تفعيل كل حساب يدوياً بعد مراجعة البطاقة الشخصية
- **تعليق فوري**: إمكانية إيقاف أي حساب بضغطة زر واحدة

#### 🎥 2. حماية الفيديوهات (الحصن السيبراني)
- **Signed URLs**: روابط مشفرة ومؤقتة لا يمكن مشاركتها
- **HLS Streaming**: بث متقدم عبر `.m3u8`
- **العلامة المائية الديناميكية**: عرض بيانات الطالب (رقم الواتساب + البريد) تتحرك عشوائياً على الفيديو
- **منع أدوات المطورين**: تعطيل F12 والنقر الأيمن
- **كشف التسجيل**: إيقاف الفيديو عند تغيير النافذة

#### 👑 3. لوحة تحكم الأدمن
- **إحصائيات حية**: عدد الطلاب، المتصلين الآن، غير النشطين
- **تتبع النشاط**: من شاهد أي درس ومتى
- **إدارة الطلاب**: تفعيل/تعليق/حظر بنقرة واحدة
- **نظام البث (Broadcast)**: إرسال إشعارات لكل الطلاب

#### 🎟️ 4. نظام الأكواد الشاملة
- **توليد دفعات**: إنشاء مئات الأكواد بضغطة زر
- **أكواد مرنة**: فتح درس واحد أو كورس كامل
- **سجل كامل**: معرفة من استخدم أي كود ومتى
- **تواريخ انتهاء اختيارية**

#### 📝 5. نظام الامتحانات الذكي
- **تصحيح آلي**: حساب الدرجات فوراً
- **أسئلة متعددة الأنواع**: MCQ، صح/خطأ، مع دعم الصور
- **قفل التقدم**: منع الطالب من الدرس التالي حتى يجتاز الامتحان

#### 💳 6. المدفوعات التلقائية
- **تكامل Fawry & Paymob**
- **تفعيل فوري**: فتح الكورس آلياً عند نجاح الدفع
- **سجل كامل للإيرادات**

---

## 🏗️ البنية التقنية

### Stack

```
Frontend:  Next.js 14 (App Router) + TypeScript + Tailwind CSS
Backend:   Next.js API Routes
Database:  PostgreSQL + Prisma ORM
Cache:     Redis (للجلسات)
CDN:       Bunny.net (للفيديوهات)
```

### هيكل المشروع

```
d:/LMS/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── video/
│   │   └── codes/
│   ├── register/
│   ├── dashboard/
│   └── globals.css
├── components/
│   ├── admin/
│   │   └── AdminDashboard.tsx
│   └── video/
│       ├── SecureVideoPlayer.tsx
│       └── DynamicWatermark.tsx
├── lib/
│   ├── db.ts
│   ├── video-security.ts
│   ├── session-manager.ts
│   └── code-system.ts
├── prisma/
│   └── schema.prisma
├── middleware.ts
├── package.json
└── README.md
```

---

## 🚀 التثبيت والتشغيل

### المتطلبات
- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14
- **Redis** (اختياري للإنتاج)

### خطوات التثبيت

1. **نسخ المشروع**
```bash
cd d:/LMS
```

2. **تثبيت الحزم**
```bash
npm install
```

3. **إعداد قاعدة البيانات**
```bash
# نسخ ملف البيئة
copy .env.example .env

# تعديل DATABASE_URL في .env
# مثال: postgresql://user:password@localhost:5432/lms_db

# تطبيق Schema
npm run db:push

# (اختياري) فتح Prisma Studio لإدارة البيانات
npm run db:studio
```

4. **تشغيل التطبيق**
```bash
# وضع التطوير
npm run dev

# الوصول: http://localhost:3000
```

---

## 🔑 المتغيرات البيئية الأساسية

```env
# قاعدة البيانات
DATABASE_URL="postgresql://user:pass@localhost:5432/lms_db"

# JWT
JWT_SECRET="your-secret-key-here"
VIDEO_SIGNING_SECRET="another-secret-key"

# Bunny.net
BUNNY_STREAM_API_KEY="your-api-key"
BUNNY_STREAM_LIBRARY_ID="12345"

# الدفع
FAWRY_MERCHANT_CODE="your-code"
PAYMOB_API_KEY="your-key"
```

---

## 📊 قاعدة البيانات

### الجداول الرئيسية

| الجدول | الوصف |
|--------|-------|
| `User` | الطلاب والأدمن |
| `Session` | جلسات تسجيل الدخول (جهاز واحد) |
| `Course` | الكورسات |
| `Module` | الوحدات داخل الكورس |
| `Lesson` | الدروس |
| `Video` | الفيديوهات مع الحماية |
| `Exam` | الامتحانات |
| `Question` & `Answer` | الأسئلة والإجابات |
| `Code` & `CodeUsage` | نظام الأكواد |
| `Payment` | المدفوعات |
| `LessonProgress` | تتبع تقدم الطالب |
| `Notification` | الإشعارات |

---

## 🛡️ الأمان

### طبقات الحماية

1. **Session Management**: الجهاز الواحد فقط
2. **Video Protection**: Signed URLs + Watermark + DRM
3. **Admin Verification**: التفعيل اليدوي
4. **Rate Limiting**: منع الهجمات
5. **HTTPS Only**: تشفير كامل
6. **Input Validation**: Zod للتحقق من البيانات

---

## 📖 API Routes

### للطلاب
- `POST /api/auth/register` - التسجيل
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/codes/redeem` - استخدام كود
- `GET /api/video/stream` - بث الفيديو

### للأدمن
- `GET /api/admin/stats` - الإحصائيات
- `POST /api/admin/students/activate` - تفعيل طالب
- `POST /api/admin/students/suspend` - تعليق طالب
- `POST /api/admin/codes/generate` - توليد أكواد

---

## 🎨 Tailwind CSS Classes المخصصة

```css
.form-input    - حقول الإدخال
.btn-primary   - الأزرار الأساسية
.btn-danger    - أزرار الحذف
.card          - البطاقات
.no-select     - منع التحديد
```

---

## 🔄 سير العمل

### للطالب
1. التسجيل + رفع البطاقة الشخصية
2. انتظار تفعيل الأدمن
3. تسجيل الدخول (جهاز واحد)
4. شحن كود أو شراء كورس
5. مشاهدة الدروس + حل الامتحانات

### للأدمن
1. تسجيل الدخول
2. مراجعة الطلاب الجدد + تفعيل
3. توليد أكواد
4. متابعة النشاط والإحصائيات
5. إرسال إشعارات

---

## 📦 Build للإنتاج

```bash
# بناء المشروع
npm run build

# تشغيل الإنتاج
npm start
```

---

## 🤝 الدعم

للاستفسارات أو المساعدة، تواصل مع فريق التطوير.

---

## 📜 الترخيص

© 2024 منصة محمد الربيعي التعليمية. جميع الحقوق محفوظة.

---

### 🎯 المصمم لـ:
**محمد الربيعي** - مدرس فيزياء الثانوية العامة

Built with ❤️ using Next.js 14 + TypeScript + Prisma
