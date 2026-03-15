# ⚡ دليل البدء السريع
## منصة محمد الربيعي التعليمية - خلال 10 دقائق

---

## 📋 المتطلبات

تأكد من تثبيت:
- ✅ [Node.js](https://nodejs.org/) (v18 أو أحدث)
- ✅ [PostgreSQL](https://www.postgresql.org/) (v14 أو أحدث)
- ✅ [Git](https://git-scm.com/)

---

## 🚀 التثبيت خطوة بخطوة

### 1️⃣ الانتقال للمشروع
```bash
cd d:/LMS
```

### 2️⃣ تثبيت الحزم
```bash
npm install
```
⏱️ **الوقت:** ~2-3 دقائق

---

### 3️⃣ إعداد قاعدة البيانات

#### أ) إنشاء قاعدة بيانات PostgreSQL
```sql
-- افتح psql أو pgAdmin
CREATE DATABASE mohamed_rabiei_lms;
CREATE USER lms_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mohamed_rabiei_lms TO lms_user;
```

#### ب) إعداد ملف البيئة
```bash
# نسخ الملف المثالي
copy .env.example .env
```

افتح `.env` وعدّل:
```env
DATABASE_URL="postgresql://lms_user:your_password@localhost:5432/mohamed_rabiei_lms"
JWT_SECRET="اكتب-نص-عشوائي-طويل-هنا"
VIDEO_SIGNING_SECRET="نص-آخر-عشوائي-مختلف"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### ج) تطبيق Schema على قاعدة البيانات
```bash
npm run db:push
```
✅ يجب أن ترى: `Your database is now in sync with your schema.`

---

### 4️⃣ إضافة بيانات تجريبية (اختياري)
```bash
npm run db:seed
```

✅ سيتم إنشاء:
- حساب الأدمن: `admin@mohamed-rabiei.com` / `admin123456`
- طالب تجريبي: `student@example.com` / `student123`
- كورس "فيزياء الثالث الثانوي"
- أكواد تجريبية

---

### 5️⃣ تشغيل المشروع
```bash
npm run dev
```

✅ افتح المتصفح: [http://localhost:3000](http://localhost:3000)

---

## 🎯 الخطوات الأولى

### للأدمن:
1. اذهب إلى: `http://localhost:3000/admin`
2. سجل دخول:
   - **البريد**: admin@mohamed-rabiei.com
   - **كلمة المرور**: admin123456
3. غيّر كلمة المرور فوراً!

### للطلاب:
1. اذهب إلى: `http://localhost:3000/register`
2. أنشئ حساب جديد
3. انتظر تفعيل الأدمن

---

## 🛠️ أوامر مفيدة

```bash
# تشغيل وضع التطوير
npm run dev

# بناء للإنتاج
npm run build

# تشغيل الإنتاج
npm start

# فتح Prisma Studio (إدارة قاعدة البيانات بصرياً)
npm run db:studio

# إنشاء migration جديد
npm run db:migrate

# إعادة ضبط قاعدة البيانات (حذف كل شيء!)
npx prisma migrate reset
```

---

## 🔍 فحص التثبيت

### ✅ قائمة التحقق:

- [ ] الخادم يعمل على `http://localhost:3000`
- [ ] تظهر الصفحة الرئيسية بدون أخطاء
- [ ] يمكن فتح `/register` و `/login`
- [ ] قاعدة البيانات متصلة (لا توجد أخطاء في Console)
- [ ] Prisma Studio يفتح: `http://localhost:5555`

---

## 🐛 حل المشاكل الشائعة

### ❌ خطأ: "Cannot connect to database"
**الحل:**
```bash
# 1. تأكد من تشغيل PostgreSQL
# Windows:
services.msc  # ابحث عن postgresql وابدأ الخدمة

# 2. تحقق من DATABASE_URL في .env
# 3. جرّب:
psql -U lms_user -d mohamed_rabiei_lms
```

---

### ❌ خطأ: "Module not found"
**الحل:**
```bash
# احذف node_modules وأعد التثبيت
rmdir /s /q node_modules
del package-lock.json
npm install
```

---

### ❌ خطأ: "Port 3000 already in use"
**الحل:**
```bash
# استخدم بورت آخر:
$env:PORT=3001; npm run dev

# أو أوقف العملية القديمة:
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

---

### ❌ خطأ Prisma: "Migration not applied"
**الحل:**
```bash
# أعد ضبط قاعدة البيانات:
npx prisma migrate reset
npm run db:push
npm run db:seed
```

---

## 📚 الخطوات التالية

بعد التثبيت الناجح:

1. 📖 اقرأ [README.md](README.md) للتفاصيل الكاملة
2. 👑 راجع [ADMIN_GUIDE.md](ADMIN_GUIDE.md) لإدارة المنصة
3. 🔒 اطّلع على [SECURITY.md](SECURITY.md) لفهم الأمان
4. 🎨 عدّل التصميم في `app/globals.css`
5. 🚀 جهّز للإنتاج (راجع قسم "Deployment" في README)

---

## 🎓 إنشاء أول كورس

### خطوات سريعة:
```bash
# 1. سجل دخول كأدمن
# 2. اذهب إلى "المحتوى" > "الكورسات"
# 3. اضغط "➕ إضافة كورس"
# 4. املأ البيانات:
#    - العنوان: "فيزياء الصف الأول الثانوي"
#    - السعر: 300
# 5. أضف وحدة > أضف درس > ارفع فيديو
# 6. انشر الكورس
```

---

## 💡 نصائح للبداية

### للتطوير:
- استخدم **Prisma Studio** لإدارة البيانات بصرياً
- افتح **DevTools** (F12) لمراقبة الأخطاء
- راجع ملف `middleware.ts` لفهم حماية المسارات

### للتصميم:
- الألوان في `tailwind.config.ts`
- الخطوط في `app/globals.css`
- المكونات في `components/`

### للأمان:
- **لا تنشر `.env`** على GitHub أبداً!
- غيّر `JWT_SECRET` في الإنتاج
- استخدم HTTPS في الإنتاج

---

## 📞 المساعدة

إذا واجهت مشكلة:
1. راجع [الأسئلة الشائعة](ADMIN_GUIDE.md#الأسئلة-الشائعة)
2. ابحث في ملف `README.md`
3. افحص ملف `logs/` إن وُجد
4. تواصل مع فريق التطوير

---

## 🎉 تهانينا!

أنت الآن جاهز لبناء منصة تعليمية قوية وآمنة! 🚀

---

**الوقت الإجمالي للإعداد:** ~10 دقائق  
**آخر تحديث:** فبراير 2024

---

© 2024 منصة محمد الربيعي التعليمية
