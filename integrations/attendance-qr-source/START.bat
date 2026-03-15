@echo off
chcp 65001 >nul
echo ═════════════════════════════════════════════
echo    تشغيل نظام تسجيل الحضور
echo ═════════════════════════════════════════════
echo.
echo ⏳ جاري تشغيل التطبيق...
echo.
npm run electron
echo.
echo ═════════════════════════════════════════════
echo    تم إغلاق التطبيق
echo ═════════════════════════════════════════════
echo.
echo 🧹 جاري تنظيف العمليات الخلفية...
timeout /t 2 >nul
powershell -Command "Get-Process chrome,node -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul
echo ✅ تم التنظيف الكامل
echo.
timeout /t 2
