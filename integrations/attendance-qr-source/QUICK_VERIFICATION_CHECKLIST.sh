#!/bin/bash
# QUICK_VERIFICATION_CHECKLIST.sh
# Run this to verify all components are properly installed and configured

echo "================================"
echo "✅ QUICK VERIFICATION CHECKLIST"
echo "================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} File exists: $1"
        return 0
    else
        echo -e "${RED}❌${NC} File missing: $1"
        return 1
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} Found in $1: $2"
        return 0
    else
        echo -e "${RED}❌${NC} Not found in $1: $2"
        return 1
    fi
}

echo "1️⃣ CHECKING CORE FILES"
echo "──────────────────────"
check_file "attendanceController.js"
check_file "attendanceWhatsApp.js"
check_file "whatsappManager.js"
check_file "main.js"
check_file "preload.js"
check_file "public/student-profile.html"
check_file "public/student-profile.js"
check_file "public/whatsapp-connect.html"
echo ""

echo "2️⃣ CHECKING MAIN.JS IPC HANDLERS"
echo "────────────────────────────────"
check_content "main.js" "student:get-profile-data"
check_content "main.js" "attendance:notifyGrades"
check_content "main.js" "whatsapp:initialize"
check_content "main.js" "whatsapp:sendMessage"
echo ""

echo "3️⃣ CHECKING PRELOAD.JS API EXPOSURE"
echo "──────────────────────────────────"
check_content "preload.js" "getStudentProfileData"
check_content "preload.js" "notifyGrades"
check_content "preload.js" "whatsapp:"
echo ""

echo "4️⃣ CHECKING PACKAGE.JSON DEPENDENCIES"
echo "───────────────────────────────────"
check_content "package.json" "whatsapp-web.js"
check_content "package.json" "qrcode"
check_content "package.json" "sqlite3"
check_content "package.json" "electron"
echo ""

echo "5️⃣ CHECKING ATTENDANCECONTROLLER.JS"
echo "────────────────────────────────────"
check_content "attendanceController.js" "getStudentProfileData"
check_content "attendanceController.js" "SELECT"
check_content "attendanceController.js" "avgHomework"
echo ""

echo "6️⃣ CHECKING WHATSAPPMANAGER.JS"
echo "──────────────────────────────"
check_content "whatsappManager.js" "whatsapp-web.js"
check_content "whatsappManager.js" "initialize"
check_content "whatsappManager.js" "sendMessage"
check_content "whatsappManager.js" "LocalAuth"
echo ""

echo "7️⃣ CHECKING ATTENDANCEWHATSAPP.JS"
echo "─────────────────────────────────"
check_content "attendanceWhatsApp.js" "notifyGrades"
check_content "attendanceWhatsApp.js" "formatStudentGradesMessage"
check_content "attendanceWhatsApp.js" "formatGuardianGradesMessage"
echo ""

echo "8️⃣ CHECKING DATABASE CONNECTIVITY"
echo "──────────────────────────────────"
if [ -f "database.db" ] || [ -f "attendance.db" ]; then
    echo -e "${GREEN}✅${NC} Database file found"
else
    echo -e "${YELLOW}⚠️${NC} Database file not found (may be created on first run)"
fi
echo ""

echo "================================"
echo "VERIFICATION SUMMARY"
echo "================================"
echo ""
echo "✨ If all items show ${GREEN}✅${NC}, your system is ready!"
echo ""
echo "📝 Next steps:"
echo "  1. Start the app: npm run electron"
echo "  2. Test student profile: Dashboard → Students → Click student"
echo "  3. Test WhatsApp: Settings → ربط واتساب"
echo "  4. Test notifications: Record grades and verify messages"
echo ""
echo "📖 See IMPLEMENTATION_VERIFICATION_GUIDE.md for detailed testing"
echo ""
