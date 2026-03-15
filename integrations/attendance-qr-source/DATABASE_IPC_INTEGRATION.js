/**
 * ============================================================================
 * IPC HANDLERS FOR DATABASE INTEGRATION
 * ============================================================================
 * Add these code snippets to your main.js file
 * Place them in the appropriate section after existing IPC handlers
 * ============================================================================
 */

// =====================================================================
// AT THE TOP OF main.js - ADD THESE IMPORTS
// =====================================================================

const dbManager = require('./database');

// Initialize database when app is ready
app.whenReady().then(() => {
  // Initialize database with userData path
  const userData = app.getPath('userData');
  dbManager.initialize(userData);
  
  // Rest of your existing code...
});

// Close database when app quits
app.on('quit', () => {
  dbManager.close();
});

// =====================================================================
// DATABASE INITIALIZATION IPC HANDLER
// =====================================================================

ipcMain.handle('db:initialize', async (event) => {
  try {
    const userData = app.getPath('userData');
    const db = dbManager.initialize(userData);
    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:getStatistics', async (event) => {
  try {
    const stats = dbManager.getStatistics();
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting statistics:', error);
    return { success: false, error: error.message };
  }
});

// =====================================================================
// GROUP MANAGEMENT IPC HANDLERS
// =====================================================================

ipcMain.handle('group:add', async (event, { name, grade, day, time, center_name }) => {
  try {
    const stmt = dbManager.db.prepare(`
      INSERT INTO groups (name, grade, day, time, center_name)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, grade, day, time, center_name);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding group:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:getAll', async (event) => {
  try {
    const stmt = dbManager.db.prepare('SELECT * FROM groups ORDER BY name ASC;');
    const groups = stmt.all();
    return { success: true, data: groups };
  } catch (error) {
    console.error('Error fetching groups:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:getById', async (event, groupId) => {
  try {
    const stmt = dbManager.db.prepare('SELECT * FROM groups WHERE id = ?;');
    const group = stmt.get(groupId);
    return { success: true, data: group };
  } catch (error) {
    console.error('Error fetching group:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:update', async (event, { id, name, grade, day, time, center_name }) => {
  try {
    const stmt = dbManager.db.prepare(`
      UPDATE groups 
      SET name = ?, grade = ?, day = ?, time = ?, center_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, grade, day, time, center_name, id);
    return { success: true };
  } catch (error) {
    console.error('Error updating group:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:delete', async (event, groupId) => {
  try {
    const stmt = dbManager.db.prepare('DELETE FROM groups WHERE id = ?;');
    stmt.run(groupId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting group:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:statistics', async (event, groupId) => {
  try {
    const stats = dbManager.getGroupStatistics(groupId);
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting group statistics:', error);
    return { success: false, error: error.message };
  }
});

// =====================================================================
// STUDENT MANAGEMENT IPC HANDLERS
// =====================================================================

ipcMain.handle('student:add', async (event, { name, phone, parent_phone, school, code, qr_code, group_id, notes, photo }) => {
  try {
    const stmt = dbManager.db.prepare(`
      INSERT INTO students (name, phone, parent_phone, school, code, qr_code, group_id, notes, photo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, phone, parent_phone, school, code, qr_code, group_id, notes, photo);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding student:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('student:getAll', async (event, { groupId } = {}) => {
  try {
    let query = 'SELECT * FROM students ORDER BY name ASC;';
    let stmt;
    
    if (groupId) {
      stmt = dbManager.db.prepare('SELECT * FROM students WHERE group_id = ? ORDER BY name ASC;');
      return { success: true, data: stmt.all(groupId) };
    } else {
      stmt = dbManager.db.prepare(query);
      return { success: true, data: stmt.all() };
    }
  } catch (error) {
    console.error('Error fetching students:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('student:getById', async (event, studentId) => {
  try {
    const stmt = dbManager.db.prepare('SELECT * FROM students WHERE id = ?;');
    const student = stmt.get(studentId);
    return { success: true, data: student };
  } catch (error) {
    console.error('Error fetching student:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('student:getByCode', async (event, code) => {
  try {
    const stmt = dbManager.db.prepare('SELECT * FROM students WHERE code = ?;');
    const student = stmt.get(code);
    return { success: true, data: student };
  } catch (error) {
    console.error('Error fetching student by code:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('student:getByQRCode', async (event, qrCode) => {
  try {
    const stmt = dbManager.db.prepare('SELECT * FROM students WHERE qr_code = ?;');
    const student = stmt.get(qrCode);
    return { success: true, data: student };
  } catch (error) {
    console.error('Error fetching student by QR code:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('student:update', async (event, { id, name, phone, parent_phone, school, code, group_id, notes, photo }) => {
  try {
    // Get current student code to check if trying to change it
    const currentStudent = dbManager.db.prepare('SELECT code FROM students WHERE id = ?').get(id);
    
    if (!currentStudent) {
      return { success: false, error: 'الطالب غير موجود' };
    }
    
    // Check if trying to modify the code (ID)
    if (code && code !== currentStudent.code) {
      return { success: false, error: 'لا يمكن تعديل رقم الطالب (ID) بعد إنشاؤه' };
    }
    
    const stmt = dbManager.db.prepare(`
      UPDATE students 
      SET name = ?, phone = ?, parent_phone = ?, school = ?, group_id = ?, notes = ?, photo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, phone, parent_phone, school, group_id, notes, photo, id);
    return { success: true, message: 'تم تحديث بيانات الطالب بنجاح' };
  } catch (error) {
    console.error('Error updating student:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('student:delete', async (event, studentId) => {
  try {
    const stmt = dbManager.db.prepare('DELETE FROM students WHERE id = ?;');
    stmt.run(studentId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting student:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('student:profileSummary', async (event, studentId) => {
  try {
    const profile = dbManager.getStudentProfileSummary(studentId);
    return { success: true, data: profile };
  } catch (error) {
    console.error('Error getting student profile:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('student:allProfiles', async (event, { groupId } = {}) => {
  try {
    const profiles = dbManager.getAllStudentProfiles(groupId);
    return { success: true, data: profiles };
  } catch (error) {
    console.error('Error getting student profiles:', error);
    return { success: false, error: error.message };
  }
});

// =====================================================================
// ATTENDANCE MANAGEMENT IPC HANDLERS
// =====================================================================

ipcMain.handle('attendance:add', async (event, { student_id, date, status, time_arrived, homework_status, session_notes }) => {
  try {
    const result = dbManager.addAttendance(student_id, date, status, time_arrived, homework_status, session_notes);
    return result;
  } catch (error) {
    console.error('Error adding attendance:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('attendance:getByDateRange', async (event, { startDate, endDate, groupId }) => {
  try {
    const records = dbManager.getAttendanceByDateRange(startDate, endDate, groupId);
    return { success: true, data: records };
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('attendance:getByStudent', async (event, { studentId, limit = 30 }) => {
  try {
    const stmt = dbManager.db.prepare(`
      SELECT * FROM attendance 
      WHERE student_id = ? 
      ORDER BY date DESC 
      LIMIT ?;
    `);
    const records = stmt.all(studentId, limit);
    return { success: true, data: records };
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('attendance:getByDate', async (event, { date, groupId }) => {
  try {
    let query = `
      SELECT 
        a.id, a.student_id, a.date, a.status, a.time_arrived, a.homework_status, a.session_notes,
        s.name, s.code, g.name as group_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE a.date = ?
    `;
    
    if (groupId) {
      query += ` AND s.group_id = ${groupId}`;
    }
    
    query += ' ORDER BY s.name ASC;';
    
    const stmt = dbManager.db.prepare(query);
    const records = stmt.all(date);
    return { success: true, data: records };
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('attendance:getMonthlyReport', async (event, studentId) => {
  try {
    const summary = dbManager.getMonthlyAttendanceSummary(studentId);
    return { success: true, data: summary };
  } catch (error) {
    console.error('Error getting monthly summary:', error);
    return { success: false, error: error.message };
  }
});

// =====================================================================
// EXAMS & MARKS MANAGEMENT IPC HANDLERS
// =====================================================================

ipcMain.handle('exam:add', async (event, { title, max_score, date, group_id, description }) => {
  try {
    const result = dbManager.addExam(title, max_score, date, group_id, description);
    return result;
  } catch (error) {
    console.error('Error adding exam:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('exam:getByGroup', async (event, groupId) => {
  try {
    const exams = dbManager.getExamsByGroup(groupId);
    return { success: true, data: exams };
  } catch (error) {
    console.error('Error fetching exams:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('exam:getAll', async (event) => {
  try {
    const stmt = dbManager.db.prepare('SELECT * FROM exams ORDER BY date DESC;');
    const exams = stmt.all();
    return { success: true, data: exams };
  } catch (error) {
    console.error('Error fetching all exams:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('exam:delete', async (event, examId) => {
  try {
    const stmt = dbManager.db.prepare('DELETE FROM exams WHERE id = ?;');
    stmt.run(examId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting exam:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mark:add', async (event, { exam_id, student_id, score, notes }) => {
  try {
    const result = dbManager.addMark(exam_id, student_id, score, notes);
    return result;
  } catch (error) {
    console.error('Error adding mark:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mark:addBulk', async (event, { exam_id, marks }) => {
  try {
    const stmt = dbManager.db.prepare(`
      INSERT INTO marks (exam_id, student_id, score, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(exam_id, student_id) DO UPDATE SET
        score = excluded.score,
        notes = excluded.notes
    `);
    
    const insertMany = dbManager.db.transaction((marks) => {
      for (const mark of marks) {
        stmt.run(exam_id, mark.student_id, mark.score, mark.notes || null);
      }
    });
    
    insertMany(marks);
    return { success: true, count: marks.length };
  } catch (error) {
    console.error('Error adding bulk marks:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mark:getByExam', async (event, examId) => {
  try {
    const results = dbManager.getExamResults(examId);
    return { success: true, data: results };
  } catch (error) {
    console.error('Error fetching exam results:', error);
    return { success: false, error: error.message };
  }
});

// =====================================================================
// PAYMENTS MANAGEMENT IPC HANDLERS
// =====================================================================

ipcMain.handle('payment:add', async (event, { student_id, amount, date, type, description, payment_method }) => {
  try {
    const result = dbManager.addPayment(student_id, amount, date, type, description, payment_method);
    return result;
  } catch (error) {
    console.error('Error adding payment:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payment:getByStudent', async (event, studentId) => {
  try {
    const stmt = dbManager.db.prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY date DESC;');
    const payments = stmt.all(studentId);
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error fetching student payments:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payment:getByDateRange', async (event, { startDate, endDate }) => {
  try {
    const stmt = dbManager.db.prepare(`
      SELECT 
        p.*, 
        s.name, 
        s.code,
        g.name as group_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE p.date BETWEEN ? AND ?
      ORDER BY p.date DESC;
    `);
    const payments = stmt.all(startDate, endDate);
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error fetching payments by date range:', error);
    return { success: false, error: error.message };
  }
});

// =====================================================================
// EXPORT HANDLERS FOR EXCEL INTEGRATION
// =====================================================================

ipcMain.handle('export:studentsToJSON', async (event, { groupId } = {}) => {
  try {
    const data = dbManager.exportStudentsForExcel(groupId);
    return { success: true, data };
  } catch (error) {
    console.error('Error exporting students:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export:attendanceToJSON', async (event, { startDate, endDate, groupId }) => {
  try {
    const data = dbManager.exportAttendanceForExcel(startDate, endDate, groupId);
    return { success: true, data };
  } catch (error) {
    console.error('Error exporting attendance:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export:examResultsToJSON', async (event, examId) => {
  try {
    const data = dbManager.exportExamResultsForExcel(examId);
    return { success: true, data };
  } catch (error) {
    console.error('Error exporting exam results:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export:paymentsToJSON', async (event, { startDate, endDate }) => {
  try {
    const data = dbManager.exportPaymentsForExcel(startDate, endDate);
    return { success: true, data };
  } catch (error) {
    console.error('Error exporting payments:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export:table', async (event, { tableName, filters }) => {
  try {
    const data = dbManager.exportTable(tableName, filters);
    return { success: true, data };
  } catch (error) {
    console.error('Error exporting table:', error);
    return { success: false, error: error.message };
  }
});

// =====================================================================
// DATABASE MAINTENANCE HANDLERS
// =====================================================================

ipcMain.handle('db:vacuum', async (event) => {
  try {
    dbManager.vacuum();
    return { success: true, message: 'Database optimized' };
  } catch (error) {
    console.error('Error vacuuming database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:backup', async (event, backupPath) => {
  try {
    const success = dbManager.backup(backupPath);
    if (success) {
      return { success: true, message: 'Backup created successfully' };
    } else {
      return { success: false, error: 'Failed to create backup' };
    }
  } catch (error) {
    console.error('Error backing up database:', error);
    return { success: false, error: error.message };
  }
});

// =====================================================================
// RENDERER PRELOAD BRIDGE (for preload.js)
// =====================================================================
/*
Add these to your preload.js to expose database functions to the renderer:

const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Database
  db: {
    initialize: () => ipcRenderer.invoke('db:initialize'),
    statistics: () => ipcRenderer.invoke('db:getStatistics'),
    backup: (path) => ipcRenderer.invoke('db:backup', path),
    vacuum: () => ipcRenderer.invoke('db:vacuum'),
  },
  
  // Groups
  group: {
    add: (data) => ipcRenderer.invoke('group:add', data),
    getAll: () => ipcRenderer.invoke('group:getAll'),
    getById: (id) => ipcRenderer.invoke('group:getById', id),
    update: (data) => ipcRenderer.invoke('group:update', data),
    delete: (id) => ipcRenderer.invoke('group:delete', id),
    statistics: (id) => ipcRenderer.invoke('group:statistics', id),
  },
  
  // Students
  student: {
    add: (data) => ipcRenderer.invoke('student:add', data),
    getAll: (filter) => ipcRenderer.invoke('student:getAll', filter),
    getById: (id) => ipcRenderer.invoke('student:getById', id),
    getByCode: (code) => ipcRenderer.invoke('student:getByCode', code),
    getByQRCode: (qr) => ipcRenderer.invoke('student:getByQRCode', qr),
    update: (data) => ipcRenderer.invoke('student:update', data),
    delete: (id) => ipcRenderer.invoke('student:delete', id),
    profileSummary: (id) => ipcRenderer.invoke('student:profileSummary', id),
    allProfiles: (filter) => ipcRenderer.invoke('student:allProfiles', filter),
  },
  
  // Attendance
  attendance: {
    add: (data) => ipcRenderer.invoke('attendance:add', data),
    getByDateRange: (data) => ipcRenderer.invoke('attendance:getByDateRange', data),
    getByStudent: (data) => ipcRenderer.invoke('attendance:getByStudent', data),
    getByDate: (data) => ipcRenderer.invoke('attendance:getByDate', data),
    getMonthlyReport: (id) => ipcRenderer.invoke('attendance:getMonthlyReport', id),
  },
  
  // Exams & Marks
  exam: {
    add: (data) => ipcRenderer.invoke('exam:add', data),
    getByGroup: (id) => ipcRenderer.invoke('exam:getByGroup', id),
    getAll: () => ipcRenderer.invoke('exam:getAll'),
    delete: (id) => ipcRenderer.invoke('exam:delete', id),
  },
  
  mark: {
    add: (data) => ipcRenderer.invoke('mark:add', data),
    addBulk: (data) => ipcRenderer.invoke('mark:addBulk', data),
    getByExam: (id) => ipcRenderer.invoke('mark:getByExam', id),
  },
  
  // Payments
  payment: {
    add: (data) => ipcRenderer.invoke('payment:add', data),
    getByStudent: (id) => ipcRenderer.invoke('payment:getByStudent', id),
    getByDateRange: (data) => ipcRenderer.invoke('payment:getByDateRange', data),
  },
  
  // Exports
  export: {
    students: (filter) => ipcRenderer.invoke('export:studentsToJSON', filter),
    attendance: (data) => ipcRenderer.invoke('export:attendanceToJSON', data),
    examResults: (id) => ipcRenderer.invoke('export:examResultsToJSON', id),
    payments: (data) => ipcRenderer.invoke('export:paymentsToJSON', data),
    table: (data) => ipcRenderer.invoke('export:table', data),
  }
});
*/
