// db.js
// إعداد وربط قاعدة بيانات SQLite لمشروع إدارة حضور الطلاب
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// استخدام مسار آمن في userData
const dataPath = app ? path.join(app.getPath('userData'), 'databases') : path.join(__dirname, 'data');

// التأكد من وجود المجلد
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

const dbPath = path.join(dataPath, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully at:', dbPath);
  }
});

// جدول الطلاب: id، name، studentPhone، guardianPhone، photo، qr_code، center، group_name، grade
db.run(`CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  studentPhone TEXT,
  guardianPhone TEXT,
  photo TEXT,
  qr_code TEXT UNIQUE,
  center TEXT,
  group_name TEXT,
  grade TEXT
);`);

// جداول الطلاب حسب الصف
db.run(`CREATE TABLE IF NOT EXISTS students_1st (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  studentPhone TEXT,
  guardianPhone TEXT,
  photoPath TEXT,
  qrCodePath TEXT
);`);

db.run(`CREATE TABLE IF NOT EXISTS students_2nd (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  studentPhone TEXT,
  guardianPhone TEXT,
  photoPath TEXT,
  qrCodePath TEXT
);`);

db.run(`CREATE TABLE IF NOT EXISTS students_3rd (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  studentPhone TEXT,
  guardianPhone TEXT,
  photoPath TEXT,
  qrCodePath TEXT
);`);

// جدول الحضور
db.run(`CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  FOREIGN KEY(student_id) REFERENCES students(id)
);`);

// جدول المراكز
db.run(`CREATE TABLE IF NOT EXISTS centers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`);

// جدول المجاميع
db.run(`CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  center_id INTEGER NOT NULL,
  grade TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(center_id) REFERENCES centers(id),
  UNIQUE(center_id, name)
);`);

module.exports = db;