// models/Student.js
// Student model and DB operations
const db = require('../db');

module.exports = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM students', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM students WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  },
  add: (name, studentPhone, guardianPhone, photo, qr_code, code, grade, center, group_name) => {
    return new Promise((resolve, reject) => {
      // إذا تم إرسال code مخصص، استخدمه كـ id
      if (code) {
        db.run('INSERT INTO students (id, name, phone, parent_phone, photo, qr_code, grade, center, group_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [code, name, studentPhone, guardianPhone, photo, qr_code, grade, center, group_name], function(err) {
            if (err) reject(err);
            else resolve(code);  // إرجاع الـ code المخصص
          }
        );
      } else {
        // استخدام AUTOINCREMENT العادي
        db.run('INSERT INTO students (name, phone, parent_phone, photo, qr_code, grade, center, group_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [name, studentPhone, guardianPhone, photo, qr_code, grade, center, group_name], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }
    });
  },
  update: (id, name, studentPhone, guardianPhone, photo, grade, center, group_name) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE students SET name = ?, phone = ?, parent_phone = ?, photo = ?, grade = ?, center = ?, group_name = ? WHERE id = ?',
        [name, studentPhone, guardianPhone, photo, grade, center, group_name, id], function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },
  remove: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  },
  getByQRCode: (qr_code) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM students WHERE qr_code = ?', [qr_code], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }
};
