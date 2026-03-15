# دليل بناء تطبيق نظام إدارة الحضور

## المشكلة الحالية
هناك مشكلة في صلاحيات Windows منعت البناء الكامل. المشكلة في خاصية "Symbolic Links" التي يحتاجها electron-builder.

## الحل السريع ✅

### الخيار 1: تفعيل Developer Mode (الأسهل)
1. افتح **Settings** (إعدادات Windows)
2. اذهب إلى **Privacy & Security** → **For developers**
3. فعّل **Developer Mode**
4. أعد تشغيل PowerShell
5. شغّل الأمر:
```powershell
cd "d:\تسجيل حضورqr"
npm run build-all
```

### الخيار 2: تشغيل PowerShell كـ Administrator
1. أغلق VS Code
2. انقر بزر الماوس الأيمن على **PowerShell** أو **Windows Terminal**
3. اختر **Run as Administrator**
4. شغّل الأوامر:
```powershell
cd "d:\تسجيل حضورqr"
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run build-all
```

### الخيار 3: استخدام النسخة الحالية من التطبيق (بدون بناء)
التطبيق يعمل حالياً وجاهز! يمكنك:
1. نسخ مجلد المشروع بالكامل لأي جهاز
2. تشغيله عبر:
```cmd
npm run electron
```

## ما تم إعداده

✅ package.json محدّث بإعدادات البناء
✅ ملف LICENSE.txt للمثبت
✅ إعدادات electron-builder جاهزة
✅ المجلد النهائي: `D:\AttendanceSystem-Build`

## بعد نجاح البناء

سيتم إنشاء الملفات التالية في `D:\AttendanceSystem-Build\`:
- `win-unpacked\` - مجلد التطبيق الكامل (يمكن نسخه مباشرة)
- `نظام إدارة الحضور-Setup-1.0.0.exe` - المثبت (إذا نجح NSIS)
- `نظام إدارة الحضور-Portable-1.0.0.exe` - النسخة المحمولة (إذا نجح)

## البديل: نشر التطبيق كما هو

يمكنك نشر التطبيق بنسخ هذا المجلد:
```
d:\تسجيل حضورqr
```

### متطلبات التشغيل على أي جهاز:
1. Node.js version 16 أو أحدث
2. تشغيل `npm install` في المجلد
3. تشغيل `npm run electron`

أو استخدم `node-v24.8.0-win-x64.msi` المثبت مسبقاً على الجهاز.

## الملفات المهمة

- `package.json` - إعدادات البناء والتبعيات
- `main.js` - ملف Electron الرئيسي
- `LICENSE.txt` - ترخيص التطبيق
- `BUILD_INSTRUCTIONS.md` - تعليمات مفصلة
- `build-app.ps1` - سكريبت البناء التلقائي
- `BUILD.bat` - سكريبت بديل

## استكشاف الأخطاء

### إذا ظهرت رسالة "symbolic links"
- فعّل Developer Mode في Windows
- أو شغّل PowerShell كـ Administrator

### إذا فشل البناء بسبب sqlite3
- تم حلها! تم حذف sqlite3 واستخدام better-sqlite3

### إذا احتجت مساعدة
اتصل عبر واتساب: +201080455031

## الخطوات القادمة

بعد تفعيل Developer Mode أو تشغيل PowerShell كـ Admin:

```powershell
cd "d:\تسجيل حضورqr"
npm run build-all
```

سيتم إنشاء التطبيق في: **D:\AttendanceSystem-Build**
