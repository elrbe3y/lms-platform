# Build Attendance System App
# يشغل هذا السكريبت بصلاحيات Administrator لبناء التطبيق

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  بناء نظام إدارة الحضور" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# التحقق من أن PowerShell يعمل بصلاحيات Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  يجب تشغيل هذا السكريبت بصلاحيات Administrator" -ForegroundColor Yellow
    Write-Host "إعادة تشغيل بصلاحيات عالية..." -ForegroundColor Yellow
    
    # إعادة تشغيل بصلاحيات Administrator
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "✅ صلاحيات Administrator مفعّلة" -Fore Green
Write-Host ""

# الانتقال لمجلد المشروع
$projectPath = Split-Path -Parent $PSCommandPath
Set-Location $projectPath

Write-Host "📁 مجلد المشروع: $projectPath" -ForegroundColor Blue
Write-Host ""

# تعطيل code signing
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
$env:WIN_CSC_LINK = ''
Write-Host "🔓 تم تعطيل التوقيع الرقمي" -ForegroundColor Green
Write-Host ""

# بناء النسخة غير المضغوطة أولاً (أسرع وأبسط)
Write-Host "🔨 بناء النسخة غير المضغوطة (Unpacked)..." -ForegroundColor Cyan
npx electron-builder --win --x64 --dir

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم بناء النسخة Unpacked بنجاح!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 الموقع: D:\AttendanceSystem-Build\win-unpacked\" -ForegroundColor Yellow
    Write-Host ""
    
    # محاولة بناء Portable
    Write-Host "🔨 بناء النسخة المحمولة (Portable)..." -ForegroundColor Cyan
    npx electron-builder --win portable --config.npmRebuild=false
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ تم بناء النسخة Portable بنجاح!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  فشل بناء Portable، لكن النسخة Unpacked جاهزة" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ فشل البناء" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "تم الانتهاء" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "اضغط أي زر للإغلاق..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
