const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// تحديد مسارات الملفات
// بنستخدم app.getPath('userData') عشان نضمن إننا بنكتب في مكان مسموح بيه في الويندوز
const DB_FILENAME = 'database.db';
const DB_SOURCE = path.join(__dirname, DB_FILENAME);
const BACKUP_DIR = path.join(app.getPath('userData'), 'Backups');

function performAutoBackup() {
    try {
        // 1. التأكد من وجود ملف قاعدة البيانات
        if (!fs.existsSync(DB_SOURCE)) {
            console.log('⚠️ قاعدة البيانات غير موجودة لعمل نسخة احتياطية.');
            return;
        }

        // 2. إنشاء مجلد النسخ الاحتياطي لو مش موجود
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        // 3. تجهيز اسم الملف بالتاريخ (backup_2025-12-31_14-30-00.db)
        const date = new Date();
        const timestamp = date.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
        const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}.db`);

        // 4. عملية النسخ
        fs.copyFileSync(DB_SOURCE, backupFile);
        console.log(`✅ تم عمل نسخة احتياطية بنجاح: ${backupFile}`);

        // 5. تنظيف النسخ القديمة (الاحتفاظ بآخر 7 فقط)
        cleanOldBackups(7);

    } catch (err) {
        console.error('❌ فشل النسخ الاحتياطي:', err.message);
    }
}

function cleanOldBackups(limit) {
    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) return;

        // فلتر الملفات اللي بتبدأ بـ backup_ وتنتهي بـ .db
        const backups = files
            .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
            .map(f => ({
                name: f,
                path: path.join(BACKUP_DIR, f),
                time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() // وقت التعديل
            }))
            .sort((a, b) => a.time - b.time); // ترتيب من الأقدم للأحدث

        // لو العدد أكبر من المسموح، امسح القديم
        if (backups.length > limit) {
            const toDelete = backups.slice(0, backups.length - limit);
            toDelete.forEach(file => {
                fs.unlinkSync(file.path);
                console.log(`🗑️ تم حذف نسخة قديمة: ${file.name}`);
            });
        }
    });
}

module.exports = { performAutoBackup };