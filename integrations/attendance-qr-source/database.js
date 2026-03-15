/**
 * ============================================================================
 * CENTRALIZED DATABASE SYSTEM - database.js
 * ============================================================================
 * Senior Database Architecture for Electron Attendance System
 * Uses better-sqlite3 for synchronous, high-performance operations
 * 
 * Features:
 * - WAL mode enabled for maximum speed
 * - Automatic schema initialization
 * - Foreign key constraints enabled
 * - Optimized indexing for fast queries
 * - Student Profile Summary View
 * - JSON export functionality for Excel integration
 * ============================================================================
 */

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the database connection and create/migrate schema
   * @param {string} dataPath - Path to userData directory from app.getPath('userData')
   */
  initialize(dataPath) {
    if (this.initialized) {
      console.log('Database already initialized');
      return this.db;
    }

    // Ensure userData directory exists
    const dbDirectory = dataPath || path.join(app.getPath('userData'), 'databases');
    const dbPath = path.join(dbDirectory, 'database.db');

    console.log(`Initializing database at: ${dbPath}`);

    // Open or create database
    this.db = new Database(dbPath);

    // Enable foreign keys and WAL mode
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache

    console.log('Database connection established');
    console.log('WAL mode:', this.db.pragma('journal_mode', { simple: true }));
    console.log('Foreign keys:', this.db.pragma('foreign_keys', { simple: true }));

    // Create schema
    this.createSchema();

    // Create views and indexes
    this.createViews();
    this.createIndexes();

    this.initialized = true;
    return this.db;
  }

  /**
   * Create all required tables with proper relationships
   */
  createSchema() {
    console.log('Creating schema...');

    // 1. GROUPS TABLE
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        grade TEXT DEFAULT 'Unknown',
        day TEXT DEFAULT 'Saturday',
        time TEXT DEFAULT '10:00',
        center_name TEXT DEFAULT 'Main Center',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. STUDENTS TABLE
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        parent_phone TEXT,
        school TEXT,
        code TEXT UNIQUE,
        qr_code TEXT UNIQUE,
        group_id INTEGER,
        notes TEXT,
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        photo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
      );
    `);

    // 3. ATTENDANCE TABLE
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        date DATE NOT NULL,
        status TEXT CHECK(status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
        time_arrived TEXT,
        homework_status TEXT CHECK(homework_status IN ('done', 'incomplete', 'not_submitted', 'not_required')) DEFAULT 'not_required',
        session_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE(student_id, date)
      );
    `);

    // 4. EXAMS TABLE
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        max_score REAL DEFAULT 100,
        date DATE NOT NULL,
        group_id INTEGER NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      );
    `);

    // 5. MARKS TABLE
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        score REAL NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE(exam_id, student_id)
      );
    `);

    // 6. PAYMENTS TABLE
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        date DATE NOT NULL,
        type TEXT CHECK(type IN ('tuition', 'material', 'other')) DEFAULT 'tuition',
        description TEXT,
        payment_method TEXT DEFAULT 'cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );
    `);

    console.log('Schema created successfully');
  }

  /**
   * Create views for complex queries and aggregations
   */
  createViews() {
    console.log('Creating views...');

    // STUDENT PROFILE SUMMARY VIEW
    // Aggregates: attendance stats, exam scores, and group details
    this.db.exec(`
      DROP VIEW IF EXISTS student_profile_summary;
    `);

    this.db.exec(`
      CREATE VIEW student_profile_summary AS
      SELECT 
        s.id,
        s.name,
        s.code,
        s.phone,
        s.parent_phone,
        s.school,
        s.join_date,
        g.id as group_id,
        g.name as group_name,
        g.grade as group_grade,
        g.day as group_day,
        g.time as group_time,
        g.center_name,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as total_present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as total_absent,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as total_late,
        COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as total_excused,
        COUNT(a.id) as total_sessions,
        ROUND(
          (COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0) / 
          NULLIF(COUNT(a.id), 0), 
          2
        ) as attendance_percentage,
        COUNT(DISTINCT m.exam_id) as exam_count,
        ROUND(AVG(m.score), 2) as average_exam_score,
        MAX(m.score) as highest_exam_score,
        MIN(m.score) as lowest_exam_score,
        ROUND(SUM(p.amount), 2) as total_paid
      FROM students s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN attendance a ON s.id = a.student_id
      LEFT JOIN marks m ON s.id = m.student_id
      LEFT JOIN payments p ON s.id = p.student_id
      GROUP BY s.id, s.name, s.code, s.phone, s.parent_phone, s.school, s.join_date,
               g.id, g.name, g.grade, g.day, g.time, g.center_name;
    `);

    // MONTHLY ATTENDANCE SUMMARY
    this.db.exec(`
      DROP VIEW IF EXISTS monthly_attendance_summary;
    `);

    this.db.exec(`
      CREATE VIEW monthly_attendance_summary AS
      SELECT 
        s.id,
        s.name,
        s.code,
        strftime('%Y-%m', a.date) as month,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
        COUNT(a.id) as total_sessions,
        ROUND(
          (COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0) / 
          NULLIF(COUNT(a.id), 0), 
          2
        ) as monthly_percentage
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
      GROUP BY s.id, s.name, s.code, strftime('%Y-%m', a.date);
    `);

    // GROUP STATISTICS VIEW
    this.db.exec(`
      DROP VIEW IF EXISTS group_statistics;
    `);

    this.db.exec(`
      CREATE VIEW group_statistics AS
      SELECT 
        g.id,
        g.name,
        g.grade,
        g.day,
        g.time,
        g.center_name,
        COUNT(DISTINCT s.id) as student_count,
        COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.student_id END) as students_present_today,
        ROUND(AVG(m.score), 2) as average_group_score
      FROM groups g
      LEFT JOIN students s ON g.id = s.group_id
      LEFT JOIN attendance a ON s.id = a.student_id AND DATE(a.date) = DATE('now')
      LEFT JOIN marks m ON s.id = m.student_id
      GROUP BY g.id, g.name, g.grade, g.day, g.time, g.center_name;
    `);

    console.log('Views created successfully');
  }

  /**
   * Create indexes for optimal query performance
   */
  createIndexes() {
    console.log('Creating indexes...');

    const indexes = [
      // Student indexes
      'CREATE INDEX IF NOT EXISTS idx_students_code ON students(code);',
      'CREATE INDEX IF NOT EXISTS idx_students_qr_code ON students(qr_code);',
      'CREATE INDEX IF NOT EXISTS idx_students_group_id ON students(group_id);',
      'CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);',

      // Attendance indexes
      'CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);',
      'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);',
      'CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);',
      'CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);',

      // Exams indexes
      'CREATE INDEX IF NOT EXISTS idx_exams_group_id ON exams(group_id);',
      'CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(date);',

      // Marks indexes
      'CREATE INDEX IF NOT EXISTS idx_marks_exam_id ON marks(exam_id);',
      'CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);',
      'CREATE INDEX IF NOT EXISTS idx_marks_exam_student ON marks(exam_id, student_id);',

      // Payments indexes
      'CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);',
      'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);',
      'CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);',

      // Groups indexes
      'CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);',
    ];

    indexes.forEach(index => {
      try {
        this.db.exec(index);
      } catch (error) {
        console.warn(`Warning creating index: ${error.message}`);
      }
    });

    console.log('Indexes created successfully');
  }

  // =====================================================================
  // QUERY METHODS
  // =====================================================================

  /**
   * Get student profile summary with all aggregated data
   * @param {number} studentId
   * @returns {object} Student profile with stats
   */
  getStudentProfileSummary(studentId) {
    const stmt = this.db.prepare(`
      SELECT * FROM student_profile_summary WHERE id = ?;
    `);
    return stmt.get(studentId);
  }

  /**
   * Get all students with profiles
   * @param {number} groupId - Optional filter by group
   * @returns {array} Array of student profiles
   */
  getAllStudentProfiles(groupId = null) {
    let query = 'SELECT * FROM student_profile_summary';
    if (groupId) {
      query += ` WHERE group_id = ${groupId}`;
    }
    query += ' ORDER BY name ASC;';
    return this.db.prepare(query).all();
  }

  /**
   * Get monthly attendance summary for reporting
   * @param {number} studentId
   * @returns {array} Monthly attendance data
   */
  getMonthlyAttendanceSummary(studentId) {
    const stmt = this.db.prepare(`
      SELECT * FROM monthly_attendance_summary 
      WHERE id = ? 
      ORDER BY month DESC;
    `);
    return stmt.all(studentId);
  }

  /**
   * Get group statistics including attendance and scores
   * @param {number} groupId
   * @returns {object} Group statistics
   */
  getGroupStatistics(groupId) {
    const stmt = this.db.prepare(`
      SELECT * FROM group_statistics WHERE id = ?;
    `);
    return stmt.get(groupId);
  }

  /**
   * Add attendance record
   * @param {number} studentId
   * @param {string} date - YYYY-MM-DD format
   * @param {string} status - 'present', 'absent', 'late', 'excused'
   * @param {string} timeArrived - HH:MM format
   * @param {string} homeworkStatus - 'done', 'incomplete', 'not_submitted', 'not_required'
   * @param {string} notes
   * @returns {object} { success, id, error? }
   */
  addAttendance(studentId, date, status = 'present', timeArrived = null, homeworkStatus = 'not_required', notes = null) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO attendance (student_id, date, status, time_arrived, homework_status, session_notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, date) DO UPDATE SET
          status = excluded.status,
          time_arrived = excluded.time_arrived,
          homework_status = excluded.homework_status,
          session_notes = excluded.session_notes,
          created_at = CURRENT_TIMESTAMP
      `);
      const result = stmt.run(studentId, date, status, timeArrived, homeworkStatus, notes);
      
      // Get student code to return instead of ID
      const student = this.db.prepare('SELECT code FROM students WHERE id = ?').get(studentId);
      const code = student ? student.code : null;
      
      return { success: true, id: result.lastInsertRowid, code: code };
    } catch (error) {
      console.error('Error adding attendance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add exam
   * @param {string} title
   * @param {number} maxScore
   * @param {string} date - YYYY-MM-DD format
   * @param {number} groupId
   * @param {string} description
   * @returns {object} { success, id, error? }
   */
  addExam(title, maxScore = 100, date, groupId, description = null) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO exams (title, max_score, date, group_id, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(title, maxScore, date, groupId, description);
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding exam:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add exam mark
   * @param {number} examId
   * @param {number} studentId
   * @param {number} score
   * @param {string} notes
   * @returns {object} { success, id, error? }
   */
  addMark(examId, studentId, score, notes = null) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO marks (exam_id, student_id, score, notes)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(exam_id, student_id) DO UPDATE SET
          score = excluded.score,
          notes = excluded.notes
      `);
      const result = stmt.run(examId, studentId, score, notes);
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding mark:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add payment record
   * @param {number} studentId
   * @param {number} amount
   * @param {string} date - YYYY-MM-DD format
   * @param {string} type - 'tuition', 'material', 'other'
   * @param {string} description
   * @param {string} paymentMethod - 'cash', 'check', 'bank_transfer', etc.
   * @returns {object} { success, id, error? }
   */
  addPayment(studentId, amount, date, type = 'tuition', description = null, paymentMethod = 'cash') {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO payments (student_id, amount, date, type, description, payment_method)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(studentId, amount, date, type, description, paymentMethod);
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get attendance records for date range
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @param {number} groupId - Optional filter
   * @returns {array} Attendance records
   */
  getAttendanceByDateRange(startDate, endDate, groupId = null) {
    let query = `
      SELECT 
        a.id,
        a.student_id,
        s.name,
        s.code,
        g.name as group_name,
        a.date,
        a.status,
        a.time_arrived,
        a.homework_status,
        a.session_notes
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE a.date BETWEEN ? AND ?
    `;
    
    if (groupId) {
      query += ` AND s.group_id = ${groupId}`;
    }
    
    query += ' ORDER BY a.date DESC, s.name ASC;';
    
    const stmt = this.db.prepare(query);
    return stmt.all(startDate, endDate);
  }

  /**
   * Get exam results with student names
   * @param {number} examId
   * @returns {array} Exam marks with student details
   */
  getExamResults(examId) {
    const stmt = this.db.prepare(`
      SELECT 
        m.id,
        m.exam_id,
        m.student_id,
        s.name,
        s.code,
        m.score,
        m.notes,
        e.max_score,
        ROUND((m.score / e.max_score) * 100, 2) as percentage
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN exams e ON m.exam_id = e.id
      WHERE m.exam_id = ?
      ORDER BY m.score DESC, s.name ASC;
    `);
    return stmt.all(examId);
  }

  /**
   * Get all exams for a group
   * @param {number} groupId
   * @returns {array} Exams
   */
  getExamsByGroup(groupId) {
    const stmt = this.db.prepare(`
      SELECT * FROM exams 
      WHERE group_id = ? 
      ORDER BY date DESC;
    `);
    return stmt.all(groupId);
  }

  // =====================================================================
  // EXPORT FUNCTIONS
  // =====================================================================

  /**
   * Export any table or query result to JSON for Excel integration
   * Handles large datasets efficiently
   * @param {string} query - SQL SELECT query
   * @param {array} params - Query parameters
   * @returns {array} Array of objects
   */
  exportToJSON(query, params = []) {
    try {
      const stmt = this.db.prepare(query);
      const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
      return rows || [];
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      return [];
    }
  }

  /**
   * Export students table with profile summaries for Excel
   * @param {number} groupId - Optional filter by group
   * @returns {array} Students data ready for Excel
   */
  exportStudentsForExcel(groupId = null) {
    const profiles = this.getAllStudentProfiles(groupId);
    return profiles.map(student => ({
      'Student ID': student.id,
      'Name': student.name,
      'Code': student.code,
      'Phone': student.phone,
      'Parent Phone': student.parent_phone,
      'School': student.school,
      'Group': student.group_name,
      'Center': student.center_name,
      'Join Date': student.join_date,
      'Total Sessions': student.total_sessions,
      'Present': student.total_present,
      'Absent': student.total_absent,
      'Late': student.total_late,
      'Attendance %': student.attendance_percentage,
      'Exams Taken': student.exam_count,
      'Average Score': student.average_exam_score,
      'Total Paid': student.total_paid
    }));
  }

  /**
   * Export attendance records for Excel reporting
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @param {number} groupId - Optional filter
   * @returns {array} Attendance data ready for Excel
   */
  exportAttendanceForExcel(startDate, endDate, groupId = null) {
    const records = this.getAttendanceByDateRange(startDate, endDate, groupId);
    return records.map(record => ({
      'Date': record.date,
      'Student Name': record.name,
      'Student Code': record.code,
      'Group': record.group_name,
      'Status': record.status,
      'Time Arrived': record.time_arrived,
      'Homework': record.homework_status,
      'Notes': record.session_notes
    }));
  }

  /**
   * Export exam results for Excel reporting
   * @param {number} examId
   * @returns {array} Exam results ready for Excel
   */
  exportExamResultsForExcel(examId) {
    const results = this.getExamResults(examId);
    return results.map(result => ({
      'Student Name': result.name,
      'Student Code': result.code,
      'Score': result.score,
      'Max Score': result.max_score,
      'Percentage': result.percentage,
      'Notes': result.notes
    }));
  }

  /**
   * Export payment records for accounting
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @returns {array} Payment data ready for Excel
   */
  exportPaymentsForExcel(startDate, endDate) {
    const stmt = this.db.prepare(`
      SELECT 
        p.id,
        s.name,
        s.code,
        p.amount,
        p.date,
        p.type,
        p.description,
        p.payment_method,
        g.name as group_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE p.date BETWEEN ? AND ?
      ORDER BY p.date DESC;
    `);
    
    const records = stmt.all(startDate, endDate);
    return records.map(record => ({
      'Date': record.date,
      'Student Name': record.name,
      'Student Code': record.code,
      'Group': record.group_name,
      'Type': record.type,
      'Amount': record.amount,
      'Payment Method': record.payment_method,
      'Description': record.description
    }));
  }

  /**
   * Generic table export - converts any table to Excel-ready array
   * @param {string} tableName
   * @param {object} filters - Optional WHERE conditions
   * @returns {array} Table data
   */
  exportTable(tableName, filters = {}) {
    let query = `SELECT * FROM ${tableName}`;
    const params = [];

    if (Object.keys(filters).length > 0) {
      const conditions = Object.keys(filters).map((key, idx) => {
        params.push(filters[key]);
        return `${key} = ?`;
      });
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ';';
    return this.exportToJSON(query, params);
  }

  // =====================================================================
  // UTILITY METHODS
  // =====================================================================

  /**
   * Get database statistics
   * @returns {object} Database stats
   */
  getStatistics() {
    const stats = {
      totalStudents: this.db.prepare('SELECT COUNT(*) as count FROM students;').get().count,
      totalGroups: this.db.prepare('SELECT COUNT(*) as count FROM groups;').get().count,
      totalAttendanceRecords: this.db.prepare('SELECT COUNT(*) as count FROM attendance;').get().count,
      totalExams: this.db.prepare('SELECT COUNT(*) as count FROM exams;').get().count,
      totalMarks: this.db.prepare('SELECT COUNT(*) as count FROM marks;').get().count,
      totalPayments: this.db.prepare('SELECT SUM(amount) as total FROM payments;').get().total || 0,
      lastAttendanceDate: this.db.prepare('SELECT MAX(date) as date FROM attendance;').get().date,
      dbSize: this.getDBFileSize()
    };
    return stats;
  }

  /**
   * Get database file size in MB
   * @returns {number} Size in MB
   */
  getDBFileSize() {
    try {
      const fs = require('fs');
      const dbPath = this.db.name;
      const stats = fs.statSync(dbPath);
      return (stats.size / 1024 / 1024).toFixed(2);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Vacuum database to optimize storage
   */
  vacuum() {
    try {
      this.db.exec('VACUUM;');
      console.log('Database vacuumed successfully');
    } catch (error) {
      console.error('Error vacuuming database:', error);
    }
  }

  /**
   * Backup database
   * @param {string} backupPath - Full path for backup file
   * @returns {boolean} Success status
   */
  backup(backupPath) {
    try {
      const fs = require('fs');
      const dbPath = this.db.name;
      
      // Close WAL files
      this.db.pragma('optimize');
      
      // Copy main database file
      fs.copyFileSync(dbPath, backupPath);
      
      console.log(`Database backed up to: ${backupPath}`);
      return true;
    } catch (error) {
      console.error('Error backing up database:', error);
      return false;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('Database connection closed');
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;
