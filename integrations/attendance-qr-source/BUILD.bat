@echo off
:: Build Script for Attendance System
:: سكريبت بناء نظام إدارة الحضور

echo =====================================
echo   بناء نظام إدارة الحضور
echo =====================================
echo.

cd /d "%~dp0"

:: تعطيل code signing
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=

echo ✅ تم تعطيل التوقيع الرقمي
echo.

echo 🔨 بناء التطبيق...
echo.

call npx electron-builder --win --x64 --dir --config.npmRebuild=false

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ تم البناء بنجاح!
    echo.
    echo 📍 الموقع: D:\AttendanceSystem-Build\win-unpacked\
    echo.
    echo يمكنك نسخ المجلد win-unpacked إلى أي جهاز
    echo.
) else (
    echo.
    echo ❌ فشل البناء
    echo.
)

echo.
echo اضغط أي زر للإغلاق...
pause >nul
