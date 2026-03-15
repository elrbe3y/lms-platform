// models/Attendance.js
// Attendance model and DB operations
const dbManager = require('../database');

// دالة مساعدة للحصول على الـ db
function getDB() {
  if (!dbManager.db) {
    throw new Error('Database not initialized');
  }
  return dbManager.db;
}

module.exports = {
  record(student_id, name, date, time) {
    try {
      const db = getDB();
      const stmt = db.prepare('INSERT INTO attendance (student_id, name, date, time) VALUES (?, ?, ?, ?)');
      const info = stmt.run(student_id, name, date, time);
      return info.lastInsertRowid;
    } catch (err) {
      console.error('Error recording attendance:', err.message);
      throw err;
    }
  },
  
  getByStudent(student_id) {
    try {
      const db = getDB();
      const rows = db.prepare('SELECT * FROM attendance WHERE student_id = ?').all(student_id);
      return rows || [];
    } catch (err) {
      console.error('Error getting attendance by student:', err.message);
      return [];
    }
  },
  
  getAll() {
    try {
      const db = getDB();
      const rows = db.prepare('SELECT * FROM attendance').all();
      return rows || [];
    } catch (err) {
      console.error('Error getting all attendance:', err.message);
      return [];
    }
  },
  
  getByDate(date) {
    try {
      const db = getDB();
      const rows = db.prepare('SELECT * FROM attendance WHERE date = ?').all(date);
      return rows || [];
    } catch (err) {
      console.error('Error getting attendance by date:', err.message);
      return [];
    }
  },
  
  countByStudent(student_id) {
    try {
      const db = getDB();
      const row = db.prepare('SELECT COUNT(*) as count FROM attendance WHERE student_id = ?').get(student_id);
      return (row && row.count) || 0;
    } catch (err) {
      console.error('Error counting attendance:', err.message);
      return 0;
    }
  }
};
