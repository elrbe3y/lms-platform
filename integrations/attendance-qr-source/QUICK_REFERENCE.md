# ⚡ Quick Reference Card - Database API

## 🎯 Common Tasks

### Record Attendance (QR Scan)
```javascript
const student = await window.api.student.getByQRCode(qrCode);
await window.api.attendance.add({
  student_id: student.data.id,
  date: '2025-01-12',
  status: 'present',
  time_arrived: '10:30'
});
```

### Get Student Profile
```javascript
const profile = await window.api.student.profileSummary(studentId);
// Returns: name, code, attendance%, avg_score, total_paid, etc.
```

### Create Exam & Add Marks
```javascript
const exam = await window.api.exam.add({
  title: 'Midterm',
  max_score: 100,
  date: '2025-01-12',
  group_id: 5
});

await window.api.mark.addBulk({
  exam_id: exam.data.id,
  marks: [
    { student_id: 1, score: 85 },
    { student_id: 2, score: 92 },
    // ...
  ]
});
```

### Export Data to Excel
```javascript
const data = await window.api.export.attendance({
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  groupId: null  // omit for all groups
});
// data is array of objects ready for ExcelJS
```

### Get Attendance Report
```javascript
const records = await window.api.attendance.getByDateRange({
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  groupId: 5  // optional
});
```

### Record Payment
```javascript
await window.api.payment.add({
  student_id: 10,
  amount: 500,
  date: '2025-01-12',
  type: 'tuition',
  payment_method: 'cash',
  description: 'Monthly tuition'
});
```

---

## 🔧 Setup Quick Start

### 1. Install Package
```bash
npm install better-sqlite3
```

### 2. Add to main.js (top)
```javascript
const dbManager = require('./database');
```

### 3. Initialize in app.whenReady()
```javascript
const userData = app.getPath('userData');
dbManager.initialize(userData);
```

### 4. Close on quit
```javascript
app.on('quit', () => dbManager.close());
```

### 5. Add to preload.js
```javascript
contextBridge.exposeInMainWorld('api', {
  db: { /* ... */ },
  student: { /* ... */ },
  // ... see DATABASE_IPC_INTEGRATION.js
});
```

---

## 📊 Data Parameter Examples

### Add Student
```javascript
{
  name: "Ahmed Ali",
  phone: "966501234567",
  parent_phone: "966509876543",
  school: "King's School",
  code: "STU-001",
  qr_code: "QRCODE123",
  group_id: 5,
  notes: "Excellent student",
  photo: null  // base64 or path
}
```

### Add Attendance
```javascript
{
  student_id: 10,
  date: "2025-01-12",  // YYYY-MM-DD
  status: "present",   // present|absent|late|excused
  time_arrived: "10:30",
  homework_status: "done",  // done|incomplete|not_submitted|not_required
  session_notes: "Did homework"
}
```

### Add Exam
```javascript
{
  title: "Midterm Exam",
  max_score: 100,
  date: "2025-01-12",  // YYYY-MM-DD
  group_id: 5,
  description: "Chapters 1-5"
}
```

### Add Mark
```javascript
{
  exam_id: 3,
  student_id: 10,
  score: 85.5,
  notes: "Excellent work"
}
```

### Add Payment
```javascript
{
  student_id: 10,
  amount: 500,
  date: "2025-01-12",  // YYYY-MM-DD
  type: "tuition",  // tuition|material|other
  payment_method: "cash",  // cash|check|bank_transfer|etc
  description: "January tuition"
}
```

---

## 🔍 Query Examples

### Get by ID
```javascript
const student = await window.api.student.getById(10);
const group = await window.api.group.getById(5);
const exam = await window.api.exam.getAll();
```

### Get All with Filter
```javascript
const allStudents = await window.api.student.getAll();
const groupStudents = await window.api.student.getAll({ groupId: 5 });
```

### Search/Lookup
```javascript
const byCode = await window.api.student.getByCode("STU-001");
const byQR = await window.api.student.getByQRCode("QRCODE123");
```

### Date Range
```javascript
const jan = await window.api.attendance.getByDateRange({
  startDate: "2025-01-01",
  endDate: "2025-01-31",
  groupId: null
});
```

### Specific Date
```javascript
const today = await window.api.attendance.getByDate({
  date: "2025-01-12",
  groupId: 5  // optional
});
```

---

## 📈 Aggregation & Reporting

### Student Complete Profile
```javascript
const profile = await window.api.student.profileSummary(10);
// Contains:
// - name, code, phone, school
// - group_name, group_grade, center_name
// - attendance stats (present, absent, late, percentage)
// - exam stats (count, average, high, low)
// - total_paid
```

### Monthly Attendance Trend
```javascript
const monthly = await window.api.attendance.getMonthlyReport(10);
// Array of {month, present_count, absent_count, total_sessions, percentage}
```

### Group Statistics
```javascript
const groupStats = await window.api.group.statistics(5);
// Contains:
// - student_count
// - students_present_today
// - average_group_score
```

### Exam Results
```javascript
const results = await window.api.mark.getByExam(3);
// Array of {student_name, code, score, max_score, percentage, notes}
```

---

## 💾 Database Management

### Get Statistics
```javascript
const stats = await window.api.db.statistics();
// {totalStudents, totalGroups, totalAttendanceRecords, dbSize, lastAttendanceDate}
```

### Create Backup
```javascript
const result = await window.api.db.backup('/path/to/backup.db');
// {success: true, message: "Backup created successfully"}
```

### Optimize Database
```javascript
await window.api.db.vacuum();
// Reclaims space and optimizes queries
```

---

## 🔄 Bulk Operations

### Add Multiple Marks
```javascript
const marks = [
  { student_id: 1, score: 85, notes: '' },
  { student_id: 2, score: 92, notes: '' },
  { student_id: 3, score: 78, notes: '' }
];

const result = await window.api.mark.addBulk({
  exam_id: 5,
  marks: marks
});
// Returns: {success: true, count: 3}
```

---

## 📥 Export Options

### Export Students
```javascript
const data = await window.api.export.students();
// Array of student profiles with all stats
```

### Export Attendance
```javascript
const data = await window.api.export.attendance({
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  groupId: null
});
// Fields: Date, Student Name, Code, Group, Status, Time, Homework, Notes
```

### Export Exam Results
```javascript
const data = await window.api.export.examResults(5);
// Fields: Student Name, Code, Score, Max Score, Percentage, Notes
```

### Export Payments
```javascript
const data = await window.api.export.payments({
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});
// Fields: Date, Student, Code, Group, Type, Amount, Method, Description
```

### Export Any Table
```javascript
const data = await window.api.export.table({
  tableName: 'groups',
  filters: {}  // optional
});
```

---

## ⚠️ Error Handling

Always check success flag:
```javascript
const result = await window.api.student.add(data);

if (result.success) {
  console.log('Created:', result.id);
} else {
  console.error('Error:', result.error);
  // Display error to user
}
```

---

## 🚫 Common Mistakes

❌ **Don't forget date format (YYYY-MM-DD)**
```javascript
// Wrong
date: new Date()  // This is a Date object

// Correct
date: new Date().toISOString().split('T')[0]  // "2025-01-12"
```

❌ **Don't forget to check response.success**
```javascript
// Wrong
const student = await window.api.student.getById(1);
console.log(student.data.name);  // May be undefined!

// Correct
const result = await window.api.student.getById(1);
if (result.success && result.data) {
  console.log(result.data.name);
}
```

❌ **Don't use undefined group_id**
```javascript
// Wrong
await window.api.student.add({
  name: "Ahmed",
  group_id: null  // Will cause foreign key error
});

// Correct
// Either assign to existing group or create group first
const group = await window.api.group.getById(5);
if (group.success) {
  await window.api.student.add({
    name: "Ahmed",
    group_id: group.data.id
  });
}
```

---

## 🔐 Status & Type Enum Values

### Attendance Status
- `"present"` - Student attended
- `"absent"` - Student didn't attend
- `"late"` - Student arrived late
- `"excused"` - Excused absence

### Homework Status
- `"done"` - Homework completed
- `"incomplete"` - Incomplete homework
- `"not_submitted"` - No submission
- `"not_required"` - N/A for this session

### Payment Type
- `"tuition"` - Monthly/semester fees
- `"material"` - Books, supplies, etc.
- `"other"` - Other payments

---

## 💡 Pro Tips

1. **Use profileSummary for dashboards** - It's pre-computed and fast
2. **Export views for reporting** - They include all calculations
3. **Check for existence before updating** - Prevent constraint errors
4. **Use date ranges with pagination** - Avoid loading huge datasets
5. **Run vacuum() weekly** - Keeps database optimized
6. **Create backups daily** - Use `window.api.db.backup()`

---

## 📞 Getting Help

- **Setup issues?** → DATABASE_SETUP_CHECKLIST.md
- **API details?** → DATABASE_ARCHITECTURE.md
- **Code examples?** → IMPLEMENTATION_EXAMPLES.js
- **Error codes?** → DATABASE_ARCHITECTURE.md (Troubleshooting)
- **Schema help?** → DATABASE_MIGRATION_GUIDE.md (Diagrams)

---

## ✅ Quick Verification

Test your setup:
```javascript
// 1. Initialize
await window.api.db.initialize();

// 2. Add group
const g = await window.api.group.add({
  name: 'Test Group',
  grade: '1',
  day: 'Monday',
  time: '10:00',
  center_name: 'Test'
});

// 3. Add student
const s = await window.api.student.add({
  name: 'Test Student',
  code: 'TEST-001',
  group_id: g.data.id
});

// 4. Record attendance
await window.api.attendance.add({
  student_id: s.data.id,
  date: '2025-01-12',
  status: 'present'
});

// 5. Get profile
const profile = await window.api.student.profileSummary(s.data.id);
console.log('Success!', profile.data.name);
```

If all steps succeed, your database is working! ✅

---

**Keep this card handy while coding!** 📌
