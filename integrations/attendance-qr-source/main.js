// main.js
// Electron main process
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const config = require('./config');
const attendanceController = require('./attendanceController');
const whatsappEngine = require('./whatsapp-engine');

// Start Node.js server - attempt using require
console.log('Initializing server module...');
try {
  require('./server');
  console.log('✅ Server module loaded');
} catch (err) {
  console.error('Error loading server module:', err.message);
}

// App runs without licensing system

// Global reference to main window
let mainWindow = null;

// License system removed - app runs without license

function createWindow(startPage = 'index.html') {
  console.log('Creating window with page:', startPage);
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      cache: false  // تعطيل cache لتجنب المشاكل
    }
  });
  
  // Store reference to main window
  mainWindow = win;
  
  // إخفاء القائمة العلوية تماماً
  Menu.setApplicationMenu(null);
  
  console.log('Preload path:', path.join(__dirname, 'preload.js'));
  win.loadFile(`public/${startPage}`);
  console.log('Window created and file loaded');
  
  // تعطيل cache تماماً
  win.webContents.session.clearCache();
  
  // معالج إغلاق النافذة
  win.on('closed', () => {
    console.log('🔴 النافذة أُغلقت');
    mainWindow = null;
  });
  
  return win;
}

app.whenReady().then(() => {
  // بدء محرك الواتساب في الخلفية (اختياري - لا يؤثر على التطبيق إذا فشل)
  whatsappEngine.initialize()
    .then((result) => {
      if (result.success === false) {
        console.warn('⚠️  WhatsApp engine initialized but disabled:', result.message);
      } else {
        console.log('✅ WhatsApp engine initialized');
      }
    })
    .catch((err) => {
      console.warn('⚠️  WhatsApp init warning (app still works):', err.message);
      // Don't crash - WhatsApp is optional
    });

  // Load main page
  createWindow('index.html');
  
  // تعيين الأيقونة على قائمة المهام (Windows)
  if (process.platform === 'win32') {
    app.setAppUserModelId('Attendance System');
  }
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow('index.html');
    }
  });
});

// معالج إغلاق جميع النوافذ
app.on('window-all-closed', async function () {
  console.log('🚪 جميع النوافذ مغلقة');
  
  // تنظيف WhatsApp Engine
  try {
    await whatsappEngine.cleanup();
  } catch (err) {
    console.error('خطأ في تنظيف WhatsApp:', err);
  }
  
  // إنهاء التطبيق بالكامل
  app.quit();
});

// معالج قبل الإغلاق
app.on('before-quit', async (event) => {
  console.log('🛑 جاري إغلاق التطبيق...');
  
  // إيقاف أي عمليات WhatsApp مفتوحة
  try {
    await whatsappEngine.cleanup();
  } catch (err) {
    console.error('خطأ في التنظيف النهائي:', err);
  }
});

// معالج إنهاء التطبيق
app.on('will-quit', () => {
  console.log('👋 التطبيق سيُغلق الآن');
});

// IPC handlers for DB actions will be added here
// ...existing code...
// استيراد النماذج
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');

// إضافة طالب جديد
ipcMain.handle('student:add', async (event, { code, name, studentPhone, guardianPhone, photo, qr_code: qrOverride, grade, center, group_name }) => {
  try {
    // توليد QR Code نصي فريد (مثلاً UUID أو timestamp)
    const qr_code = qrOverride || `${name}_${Date.now()}`;
    
    // تحويل code إلى رقم إذا تم إرساله
    const customCode = code ? Number(code) : null;
    
    const id = await Student.add(name, studentPhone, guardianPhone, photo, qr_code, customCode, grade, center, group_name);
    return { success: true, qr_code, id };
  } catch (err) {
    console.error('Error adding student:', err);
    return { success: false, error: err.message };
  }
});

// جلب كل الطلاب
ipcMain.handle('student:getAll', async () => {
  try {
    const rows = await Student.getAll();
    return rows;
  } catch (err) {
    console.error('Error fetching students:', err);
    return [];
  }
});

// جلب طالب محدد بالمعرف
ipcMain.handle('student:getById', async (event, id) => {
  try {
    const row = await Student.getById(id);
    return row;
  } catch (err) {
    console.error('Error fetching student by id:', err);
    throw err;
  }
});

// تعديل طالب
ipcMain.handle('student:update', async (event, { id, name, studentPhone, guardianPhone, photo, grade, center, group_name }) => {
  try {
    await Student.update(id, name, studentPhone, guardianPhone, photo, grade, center, group_name);
    return { success: true };
  } catch (err) {
    console.error('Error updating student:', err);
    return { success: false, error: err.message };
  }
});

// حذف طالب
ipcMain.handle('student:remove', async (event, id) => {
  try {
    await Student.remove(id);
    return { success: true };
  } catch (err) {
    console.error('Error removing student:', err);
    return { success: false, error: err.message };
  }
});

// توليد صورة QR Code
ipcMain.handle('student:generateQR', async (event, qr_code) => {
  const dataUrl = await QRCode.toDataURL(qr_code);
  return dataUrl;
});

// تسجيل حضور عبر QR
ipcMain.handle('attendance:scan', async (event, qr_code) => {
  try {
    const student = await Student.getByQRCode(qr_code);
    if (!student) return { success: false, message: 'الطالب غير موجود!' };
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5);
    await Attendance.record(student.id, student.name, date, time);
    return { success: true, message: `تم تسجيل حضور ${student.name}` };
  } catch (err) {
    console.error('Error scanning attendance:', err);
    return { success: false, error: err.message };
  }
});

// جلب كل الحضور
ipcMain.handle('attendance:getAll', async () => {
  try {
    return await Attendance.getAll();
  } catch (err) {
    console.error('Error fetching attendance:', err);
    return [];
  }
});

// جلب حضور طالب
ipcMain.handle('attendance:getByStudent', async (event, student_id) => {
  try {
    return await Attendance.getByStudent(student_id);
  } catch (err) {
    console.error('Error fetching attendance by student:', err);
    return [];
  }
});

// جلب حضور حسب التاريخ
ipcMain.handle('attendance:getByDate', async (event, date) => {
  try {
    return await Attendance.getByDate(date);
  } catch (err) {
    console.error('Error fetching attendance by date:', err);
    return [];
  }
});

// Student profile aggregated data
ipcMain.handle('student:get-profile-data', async (event, studentId) => {
  try {
    return await attendanceController.getStudentProfileData(studentId);
  } catch (err) {
    console.error('Error fetching student profile data:', err);
    return { error: err.message };
  }
});

// عدد مرات الحضور لطالب
ipcMain.handle('attendance:countByStudent', async (event, student_id) => {
  try {
    return await Attendance.countByStudent(student_id);
  } catch (err) {
    console.error('Error counting attendance:', err);
    return 0;
  }
});

// ========================================
// WhatsApp IPC Handlers
// ========================================

ipcMain.handle('whatsapp:init', async () => {
  try {
    console.log('🔄 Initializing WhatsApp...');
    if (!whatsappEngine) {
      throw new Error('WhatsApp engine غير متاح');
    }
    await whatsappEngine.initialize();
    const status = whatsappEngine.getStatus();
    console.log('✅ WhatsApp initialized, status:', status);
    return { success: true, status };
  } catch (error) {
    console.error('❌ WhatsApp init error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('whatsapp:status', async () => {
  try {
    if (!whatsappEngine) {
      throw new Error('WhatsApp engine غير متاح');
    }
    const status = whatsappEngine.getStatus();
    console.log('📊 Sending status:', status);
    return { success: true, status };
  } catch (error) {
    console.error('❌ WhatsApp status error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('whatsapp:sendGrade', async (event, payload) => {
  try {
    const { phone, studentName, score, message } = payload;
    
    if (!phone) throw new Error('رقم ولي الأمر غير متوفر');
    if (!studentName && !message) throw new Error('اسم الطالب أو الرسالة غير متوفرة');
    
    const result = await whatsappEngine.enqueueMessage({ phone, studentName, score, message });
    return { success: true, ...result };
  } catch (error) {
    console.error('WhatsApp sendGrade error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('whatsapp:reset', async () => {
  try {
    await whatsappEngine.hardReset();
    return { success: true };
  } catch (error) {
    console.error('WhatsApp reset error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('whatsapp:restart', async () => {
  try {
    await whatsappEngine.restart();
    const status = whatsappEngine.getStatus();
    return { success: true, status };
  } catch (error) {
    console.error('WhatsApp restart error:', error);
    return { success: false, error: error.message };
  }
});

// ========================================
// تصدير تقرير Excel
ipcMain.handle('report:exportExcel', async (event, data) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Attendance');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 15 },
    { header: 'الاسم', key: 'name', width: 30 },
    { header: 'رقم الطالب', key: 'studentPhone', width: 15 },
    { header: 'رقم ولي الأمر', key: 'guardianPhone', width: 15 },
    { header: 'التاريخ', key: 'date', width: 15 },
    { header: 'الوقت', key: 'time', width: 10 },
    { header: 'درجة الواجب', key: 'homework', width: 15 },
    { header: 'درجة الكويز', key: 'quiz', width: 15 },
    { header: 'المجموع', key: 'total', width: 15 }
  ];
  data.forEach(row => sheet.addRow(row));
  const { filePath } = await dialog.showSaveDialog({
    title: 'حفظ تقرير الحضور',
    defaultPath: 'attendance-report.xlsx',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  });
  if (filePath) {
    await workbook.xlsx.writeFile(filePath);
    return { success: true };
  }
  return { success: false };
});

// License system removed - app runs without license requirement

  // إعادة تشغيل التطبيق
  ipcMain.handle('app:relaunch', async () => {
    app.relaunch();
    app.exit();
  });

// ========================================
// ========================================
// AUTO BACKUP SYSTEM
// ========================================

const archiver = require('archiver');

// DevTools disabled for production

// Function to create automatic backup
function createAutoBackup() {
  try {
    const backupDir = path.join(app.getPath('documents'), 'AttendanceBackups');
    
    // Create backup directory if not exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `backup_${timestamp}.zip`;
    const backupPath = path.join(backupDir, backupFileName);

    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✅ Auto backup created: ${backupFileName} (${archive.pointer()} bytes)`);
      
      // Keep only last 30 backups
      cleanOldBackups(backupDir, 30);
    });

    archive.on('error', (err) => {
      console.error('❌ Backup error:', err);
    });

    archive.pipe(output);
    
    // Add database
    const dbPath = path.join(__dirname, 'attendance.db');
    if (fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'attendance.db' });
    }

    // Add uploads folder
    const uploadsPath = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsPath)) {
      archive.directory(uploadsPath, 'uploads');
    }

    archive.finalize();
  } catch (error) {
    console.error('❌ Auto backup failed:', error);
  }
}

// Clean old backups (keep only last N backups)
function cleanOldBackups(backupDir, keepCount) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup_') && file.endsWith('.zip'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Delete old backups
    files.slice(keepCount).forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`🗑️ Deleted old backup: ${file.name}`);
    });
  } catch (error) {
    console.error('Error cleaning old backups:', error);
  }
}

// Schedule daily backups at 2 AM
function scheduleDailyBackup() {
  const now = new Date();
  const scheduled = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    2, 0, 0 // 2:00 AM
  );

  const timeUntilBackup = scheduled.getTime() - now.getTime();

  setTimeout(() => {
    createAutoBackup();
    // Schedule next backup (every 24 hours)
    setInterval(createAutoBackup, 24 * 60 * 60 * 1000);
  }, timeUntilBackup);

  console.log(`📅 Daily backup scheduled for: ${scheduled.toLocaleString('ar-EG')}`);
}

// Start auto backup on app ready
app.whenReady().then(() => {
  scheduleDailyBackup();
  console.log('✅ Auto backup system initialized');
});

// ========================================
// WHATSAPP BROADCAST IPC HANDLERS
// ========================================

// Get WhatsApp status
ipcMain.handle('whatsapp:getStatus', async () => {
  try {
    return whatsappEngine.getStatus();
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    return { state: 'error', isReady: false, error: error.message };
  }
});

// Send WhatsApp message
ipcMain.handle('whatsapp:sendMessage', async (event, { phone, message }) => {
  try {
    await whatsappEngine.sendMessage(phone, message);
    return { success: true };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, message: error.message };
  }
});