const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const net = require('net');
const db = require('./db');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');

const app = express();
let PORT = 3000;

// ========================================
// CHECK IF PORT IS AVAILABLE
// ========================================
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// ========================================
// FIND AVAILABLE PORT
// ========================================
async function findAvailablePort(startPort = 3000) {
  for (let port = startPort; port < startPort + 100; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error('لم يتم العثور على منفذ متاح');
}

// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// SERVE PORT NUMBER TO FRONTEND
// ========================================
app.get('/api/config/port', (req, res) => {
  res.json({ port: PORT });
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// إعداد التخزين للصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// توليد id عشوائي
function generateId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// توليد QR كـ base64
app.get('/api/students/:id/qr', (req, res) => {
  const { id } = req.params;
  QRCode.toDataURL(id, (err, url) => {
    if (err) return res.status(500).send('خطأ في توليد QR');
    
    const base64Data = url.replace(/^data:image\/png;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': imgBuffer.length
    });
    res.end(imgBuffer);
  });
});

// إضافة طالب جديد
app.post('/students', upload.single('photo'), (req, res) => {
  const { name, studentPhone, guardianPhone, grade } = req.body;
  const photoPath = req.file ? req.file.path : null;
  const id = generateId();
  const table = grade === '2' ? 'students_2nd' : grade === '3' ? 'students_3rd' : 'students_1st';

  db.run(`INSERT INTO ${table} (id, name, studentPhone, guardianPhone, photoPath, qrCodePath) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, studentPhone, guardianPhone, photoPath, null], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    const qrCodePath = `uploads/qr_${id}.png`;
    QRCode.toFile(qrCodePath, id, (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.run(`UPDATE ${table} SET qrCodePath = ? WHERE id = ?`, [qrCodePath, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, name, studentPhone, guardianPhone, photoPath, qrCodePath });
      });
    });
  });
});

// تعديل بيانات طالب
app.put('/students/:id', upload.single('photo'), (req, res) => {
  const { name, studentPhone, guardianPhone, grade } = req.body;
  const { id } = req.params;
  const photoPath = req.file ? req.file.path : req.body.photoPath;
  const table = grade === '2' ? 'students_2nd' : grade === '3' ? 'students_3rd' : 'students_1st';

  db.run(`UPDATE ${table} SET name = ?, studentPhone = ?, guardianPhone = ?, photoPath = ? WHERE id = ?`,
    [name, studentPhone, guardianPhone, photoPath, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// حذف طالب
app.delete('/students/:id', (req, res) => {
  const { id } = req.params;
  const grade = req.query.grade === '2' ? 'students_2nd' : req.query.grade === '3' ? 'students_3rd' : 'students_1st';
  db.run(`DELETE FROM ${grade} WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// جلب جميع الطلاب من جميع الصفوف
app.get('/api/students', (req, res) => {
  // First try to get from old students table
  db.all(`SELECT id, name, studentPhone as phone, guardianPhone as parentPhone, grade, group_name, center FROM students`, [], (err, oldStudents) => {
    if (!err && oldStudents && oldStudents.length > 0) {
      // Use old table if it has data
      res.json(oldStudents);
      return;
    }
    
    console.log('Trying new tables...');
    // Otherwise, try new tables
    const allStudents = [];
    const tables = ['students_1st', 'students_2nd', 'students_3rd'];
    let completed = 0;
    
    tables.forEach((table, index) => {
      const grade = index + 1;
      db.all(`SELECT id, name, studentPhone as phone, guardianPhone as parentPhone FROM ${table}`, [], (err, rows) => {
        if (!err && rows) {
          rows.forEach(row => {
            allStudents.push({
              ...row,
              grade: grade
            });
          });
        }
        
        completed++;
        if (completed === tables.length) {
          console.log('Sending all students data:', allStudents.length);
          res.json(allStudents);
        }
      });
    });
  });
});

// جلب الطلاب الغائبين في آخر 7 أيام
app.get('/api/absent-students', (req, res) => {
  try {
    const grade = req.query.grade || '1';
    
    // تحديد اسم جدول الطلاب حسب الصف
    let studentTable = 'students_1st';
    if (grade === '2') {
      studentTable = 'students_2nd';
    } else if (grade === '3') {
      studentTable = 'students_3rd';
    }
    
    console.log(`[API] Fetching students from ${studentTable}`);
    
    // محاولة جلب الطلاب بطريقة آمنة
    db.all(`SELECT * FROM ${studentTable}`, (err, students) => {
      try {
        // في حالة الخطأ، نرجع مصفوفة فارغة
        if (err) {
          console.error(`[API] Error fetching from ${studentTable}:`, err.message);
          return res.status(200).json([]);
        }
        
        // إذا لم تكن هناك بيانات
        if (!students || students.length === 0) {
          console.log(`[API] No students found in ${studentTable}`);
          return res.status(200).json([]);
        }
        
        console.log(`[API] Found ${students.length} students in ${studentTable}`);
        
        // تحويل البيانات برفق
        const result = students.map(s => {
          try {
            return {
              id: s.id || '',
              name: s.name || '',
              phone: s.studentPhone || s.phone || '',
              parentPhone: s.guardianPhone || s.parentPhone || '',
              grade: grade,
              lastAttendanceDate: 'لم يحضر'
            };
          } catch (mapErr) {
            console.error('Error mapping student:', mapErr);
            return {
              id: '',
              name: 'خطأ',
              phone: '',
              parentPhone: '',
              grade: grade,
              lastAttendanceDate: 'لم يحضر'
            };
          }
        });
        
        res.status(200).json(result);
      } catch (innerErr) {
        console.error('[API] Inner error:', innerErr.message);
        res.status(200).json([]);
      }
    });
  } catch (err) {
    console.error('[API] Outer error:', err.message);
    res.status(200).json([]);
  }
});

// ===== DEBUG ENDPOINT =====
app.get('/api/db-check', (req, res) => {
  const tables = ['students_1st', 'students_2nd', 'students_3rd', 'students', 'attendance'];
  const results = {};
  let completed = 0;
  
  tables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
      if (err) {
        results[table] = { status: 'error', message: err.message };
      } else {
        results[table] = { status: 'ok', count: row?.count || 0 };
      }
      completed++;
      if (completed === tables.length) {
        res.json(results);
      }
    });
  });
});

// جلب كل الطلاب حسب الصف
app.get('/students', (req, res) => {
  const grade = req.query.grade === '2' ? 'students_2nd' : req.query.grade === '3' ? 'students_3rd' : 'students_1st';
  db.all(`SELECT * FROM ${grade}`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// تسجيل حضور
app.post('/attendance', (req, res) => {
  const { studentId, grade } = req.body;
  const table = grade === '2' ? 'attendance_2nd' : grade === '3' ? 'attendance_3rd' : 'attendance_1st';
  const dateTime = new Date().toISOString();

  db.run(`INSERT INTO ${table} (studentId, dateTime) VALUES (?, ?)`, [studentId, dateTime], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// جلب الحضور
app.get('/attendance', (req, res) => {
  const grade = req.query.grade === '2' ? 2 : req.query.grade === '3' ? 3 : 1;
  const studentsTable = grade === 2 ? 'students_2nd' : grade === 3 ? 'students_3rd' : 'students_1st';
  const attendanceTable = grade === 2 ? 'attendance_2nd' : grade === 3 ? 'attendance_3rd' : 'attendance_1st';

  db.all(`SELECT a.id, s.name, s.id as studentId, s.studentPhone, s.guardianPhone, a.dateTime FROM ${attendanceTable} a JOIN ${studentsTable} s ON a.studentId = s.id`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ========================================
// Groups API
// ========================================

// Get all groups
app.get('/api/groups', (req, res) => {
  db.all(`SELECT * FROM groups ORDER BY name`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Add new group
app.post('/api/groups', (req, res) => {
  const { name, center_id, grade, description } = req.body;
  
  if (!name || name.trim() === '' || !center_id) {
    return res.status(400).json({ error: 'اسم المجموعة والمركز مطلوبان' });
  }
  
  db.run(`INSERT INTO groups (name, center_id, grade, description) VALUES (?, ?, ?, ?)`,
    [name, center_id, grade || null, description || ''], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'هذه المجموعة موجودة بالفعل في هذا المركز' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, name, center_id, grade, description });
  });
});

// Update group
app.put('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  const { name, center_id, grade, description } = req.body;
  
  if (!name || name.trim() === '' || !center_id) {
    return res.status(400).json({ error: 'اسم المجموعة والمركز مطلوبان' });
  }
  
  db.run(`UPDATE groups SET name = ?, center_id = ?, grade = ?, description = ? WHERE id = ?`,
    [name, center_id, grade || null, description || '', id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'هذه المجموعة موجودة بالفعل في هذا المركز' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Delete group
app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  
  db.run(`DELETE FROM groups WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ========================================
// Centers API
// ========================================

// Get all centers
app.get('/api/centers', (req, res) => {
  db.all(`SELECT * FROM centers ORDER BY name`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get center with its groups
app.get('/api/centers/:id/groups', (req, res) => {
  const { id } = req.params;
  db.all(`SELECT * FROM groups WHERE center_id = ? ORDER BY name`, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Add new center
app.post('/api/centers', (req, res) => {
  const { name, description } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'اسم المركز مطلوب' });
  }
  
  db.run(`INSERT INTO centers (name, description) VALUES (?, ?)`,
    [name, description || ''], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'اسم المركز موجود بالفعل' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, name, description });
  });
});

// Update center
app.put('/api/centers/:id', (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'اسم المركز مطلوب' });
  }
  
  db.run(`UPDATE centers SET name = ?, description = ? WHERE id = ?`,
    [name, description || '', id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'اسم المركز موجود بالفعل' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Delete center
app.delete('/api/centers/:id', (req, res) => {
  const { id } = req.params;
  
  // Delete groups first
  db.run(`DELETE FROM groups WHERE center_id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run(`DELETE FROM centers WHERE id = ?`, [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// تصدير تقرير Excel
app.get('/attendance/export', async (req, res) => {
  const grade = req.query.grade === '2' ? 2 : req.query.grade === '3' ? 3 : 1;
  const studentsTable = grade === 2 ? 'students_2nd' : grade === 3 ? 'students_3rd' : 'students_1st';
  const attendanceTable = grade === 2 ? 'attendance_2nd' : grade === 3 ? 'attendance_3rd' : 'attendance_1st';

  db.all(`SELECT a.id, s.name, s.id as studentId, s.studentPhone, s.guardianPhone, a.dateTime FROM ${attendanceTable} a JOIN ${studentsTable} s ON a.studentId = s.id`, [], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');
    sheet.columns = [
      { header: 'ID', key: 'studentId', width: 15 },
      { header: 'اسم الطالب', key: 'name', width: 30 },
      { header: 'رقم الطالب', key: 'studentPhone', width: 18 },
      { header: 'رقم ولي الأمر', key: 'guardianPhone', width: 18 },
      { header: 'التاريخ والوقت', key: 'dateTime', width: 25 }
          ];

    rows.forEach(row => sheet.addRow(row));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  });
});

// ========================================
// ERROR HANDLER - معالج الأخطاء العام
// ========================================
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  console.error('[STACK]', err.stack);
  res.status(500).json({ 
    error: 'Server error', 
    message: err.message 
  });
});

// ========================================
// START SERVER WITH PORT MANAGEMENT
// ========================================
(async () => {
  try {
    const available = await isPortAvailable(PORT);
    if (!available) {
      console.log(`⚠️  المنفذ ${PORT} مشغول، جاري البحث عن منفذ متاح...`);
      PORT = await findAvailablePort(PORT);
      console.log(`✅ تم استخدام المنفذ الجديد: ${PORT}`);
    }
    
    app.listen(PORT, () => {
      console.log(`✅ السيرفر شغال على http://localhost:${PORT}`);
      console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ خطأ في بدء السيرفر:', error.message);
    process.exit(1);
  }
})();