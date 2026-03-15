// attendanceController.js
// Aggregated student profile data (attendance + marks)
const db = require('./db');

// Helpers
const runGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row || null);
  });
});

const runAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows || []);
  });
});

async function getStudentProfileData(studentId) {
  const safeId = Number(studentId);
  if (!safeId) throw new Error('studentId is required');

  // جلب بيانات الطالب
  const studentSql = `
    SELECT * FROM students WHERE id = ?;
  `;

  const studentRow = await runGet(studentSql, [safeId]);
  console.log('studentRow:', studentRow);
  if (!studentRow) return null;

  // جلب عدد سجلات الحضور
  const countSql = `
    SELECT COUNT(*) as total FROM attendance WHERE CAST(student_id AS INTEGER) = ?;
  `;
  const countRow = await runGet(countSql, [safeId]);
  console.log('countRow:', countRow);

  // جلب سجلات الحضور التفصيلية
  const sessionsSql = `
    SELECT
      id,
      date,
      time,
      homework,
      exam
    FROM attendance
    WHERE CAST(student_id AS INTEGER) = ?
    ORDER BY date DESC, time DESC;
  `;
  const sessions = await runAll(sessionsSql, [safeId]);
  console.log('sessions count:', sessions.length);
  console.log('sessions:', sessions);

  // حساب الإحصائيات
  let totalHomework = 0;
  let totalExam = 0;
  let homeworkCount = 0;
  let examCount = 0;
  let totalScore = 0;

  sessions.forEach(s => {
    if (s.homework !== null && s.homework !== undefined) {
      totalHomework += s.homework;
      homeworkCount++;
    }
    if (s.exam !== null && s.exam !== undefined) {
      totalExam += s.exam;
      examCount++;
    }
  });

  const stats = {
    totalSessions: Number(countRow?.total) || 0,
    presentCount: Number(countRow?.total) || 0,
    avgHomework: homeworkCount > 0 ? (totalHomework / homeworkCount) : 0,
    avgExam: examCount > 0 ? (totalExam / examCount) : 0,
    totalScore: (totalHomework + totalExam) / Math.max(homeworkCount + examCount, 1) || 0
  };

  const student = {
    id: studentRow.id,
    name: studentRow.name,
    studentPhone: studentRow.studentPhone,
    guardianPhone: studentRow.guardianPhone,
    center: studentRow.center,
    group_name: studentRow.group_name,
    grade: studentRow.grade,
    qr_code: studentRow.qr_code,
  };

  return { student, stats, sessions };
}

module.exports = {
  getStudentProfileData
};
