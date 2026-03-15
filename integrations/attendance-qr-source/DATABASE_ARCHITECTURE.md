# 🗄️ CENTRALIZED DATABASE SYSTEM - Complete Documentation

## Overview

This document provides complete instructions for implementing a production-ready, centralized database system for your Electron attendance app using `better-sqlite3`.

---

## 📋 Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Database Architecture](#database-architecture)
3. [Integration Guide](#integration-guide)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Performance Optimization](#performance-optimization)
7. [Troubleshooting](#troubleshooting)

---

## Installation & Setup

### Step 1: Install better-sqlite3

First, ensure `better-sqlite3` is installed. Update your `package.json`:

```json
{
  "dependencies": {
    "better-sqlite3": "^9.2.2"
  }
}
```

Then run:
```bash
npm install better-sqlite3
```

### Step 2: Copy the Database Module

The `database.js` file has been created in your project root. It contains:
- Database initialization with WAL mode
- Complete schema with 6 interconnected tables
- 3 pre-built SQL views for complex queries
- Optimized indexing strategy
- Export functions for Excel integration

### Step 3: Update main.js

Replace the old `db.js` reference with the new `database.js` manager:

**At the top of main.js, add:**
```javascript
const dbManager = require('./database');
```

**In app.whenReady(), add database initialization:**
```javascript
app.whenReady().then(() => {
  // Initialize database
  const userData = app.getPath('userData');
  dbManager.initialize(userData);
  
  // ... rest of your code
});
```

**When app quits, close the database:**
```javascript
app.on('quit', () => {
  dbManager.close();
});
```

### Step 4: Add IPC Handlers

Copy all IPC handlers from `DATABASE_IPC_INTEGRATION.js` into your `main.js` file.

The handlers cover:
- Database initialization & statistics
- Group management (CRUD)
- Student management (CRUD + profiles)
- Attendance tracking
- Exams & marks
- Payment tracking
- Excel export functionality

### Step 5: Update preload.js

Add this bridge to expose database APIs to the renderer:

```javascript
const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  db: {
    initialize: () => ipcRenderer.invoke('db:initialize'),
    statistics: () => ipcRenderer.invoke('db:getStatistics'),
    backup: (path) => ipcRenderer.invoke('db:backup', path),
    vacuum: () => ipcRenderer.invoke('db:vacuum'),
  },
  
  group: {
    add: (data) => ipcRenderer.invoke('group:add', data),
    getAll: () => ipcRenderer.invoke('group:getAll'),
    getById: (id) => ipcRenderer.invoke('group:getById', id),
    update: (data) => ipcRenderer.invoke('group:update', data),
    delete: (id) => ipcRenderer.invoke('group:delete', id),
    statistics: (id) => ipcRenderer.invoke('group:statistics', id),
  },
  
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
  
  attendance: {
    add: (data) => ipcRenderer.invoke('attendance:add', data),
    getByDateRange: (data) => ipcRenderer.invoke('attendance:getByDateRange', data),
    getByStudent: (data) => ipcRenderer.invoke('attendance:getByStudent', data),
    getByDate: (data) => ipcRenderer.invoke('attendance:getByDate', data),
    getMonthlyReport: (id) => ipcRenderer.invoke('attendance:getMonthlyReport', id),
  },
  
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
  
  payment: {
    add: (data) => ipcRenderer.invoke('payment:add', data),
    getByStudent: (id) => ipcRenderer.invoke('payment:getByStudent', id),
    getByDateRange: (data) => ipcRenderer.invoke('payment:getByDateRange', data),
  },
  
  export: {
    students: (filter) => ipcRenderer.invoke('export:studentsToJSON', filter),
    attendance: (data) => ipcRenderer.invoke('export:attendanceToJSON', data),
    examResults: (id) => ipcRenderer.invoke('export:examResultsToJSON', id),
    payments: (data) => ipcRenderer.invoke('export:paymentsToJSON', data),
    table: (data) => ipcRenderer.invoke('export:table', data),
  }
});
```

---

## Database Architecture

### Physical Storage

- **Location**: `{userData}/databases/database.db`
  - Windows: `C:\Users\{Username}\AppData\Roaming\{AppName}\databases\database.db`
  - macOS: `~/Library/Application Support/{AppName}/databases/database.db`
  - Linux: `~/.config/{AppName}/databases/database.db`

- **Mode**: WAL (Write-Ahead Logging) for:
  - Maximum concurrent read/write performance
  - Safer crash recovery
  - Better concurrency handling

### Schema Overview

#### 1. **groups** table
Central hub for grouping students by class/session.

```
├── id (Primary Key)
├── name (UNIQUE) - Group identifier
├── grade - Academic level
├── day - Day of week
├── time - Session time
├── center_name - Physical location
└── timestamps (created_at, updated_at)
```

#### 2. **students** table
Student records with group association.

```
├── id (Primary Key)
├── name
├── phone & parent_phone
├── school
├── code & qr_code (UNIQUE) - For scanning
├── group_id (Foreign Key → groups)
├── notes
├── photo (base64 or path)
└── timestamps
```

#### 3. **attendance** table
Daily attendance tracking.

```
├── id (Primary Key)
├── student_id (Foreign Key → students)
├── date (with UNIQUE constraint on student_id + date)
├── status (present/absent/late/excused)
├── time_arrived
├── homework_status (done/incomplete/not_submitted/not_required)
├── session_notes
└── created_at
```

#### 4. **exams** table
Exam definitions and scheduling.

```
├── id (Primary Key)
├── title
├── max_score (default: 100)
├── date
├── group_id (Foreign Key → groups)
├── description
└── timestamps
```

#### 5. **marks** table
Individual exam scores.

```
├── id (Primary Key)
├── exam_id (Foreign Key → exams)
├── student_id (Foreign Key → students)
├── score
├── notes
└── UNIQUE(exam_id, student_id)
```

#### 6. **payments** table
Financial records.

```
├── id (Primary Key)
├── student_id (Foreign Key → students)
├── amount
├── date
├── type (tuition/material/other)
├── description
├── payment_method (cash/check/bank_transfer)
└── created_at
```

### SQL Views

#### 1. **student_profile_summary**
Complete student profile with aggregated statistics.

**Fields returned:**
- Student info (id, name, code, phone, school, join_date)
- Group details (group_id, group_name, grade, day, time, center)
- Attendance stats (total_present, total_absent, total_late, total_excused, attendance_percentage)
- Exam stats (exam_count, average_exam_score, highest_score, lowest_score)
- Payment info (total_paid)

**Usage:**
```sql
SELECT * FROM student_profile_summary WHERE id = 5;
```

#### 2. **monthly_attendance_summary**
Monthly attendance breakdown for reporting.

#### 3. **group_statistics**
Group-level aggregations for dashboard.

---

## Integration Guide

### Quick Start Example

**In your renderer process (e.g., scan.html):**

```javascript
// Add a new attendance record via QR scan
async function recordAttendance(studentQRCode) {
  try {
    // Find student by QR code
    const studentResult = await window.api.student.getByQRCode(studentQRCode);
    
    if (!studentResult.success || !studentResult.data) {
      console.error('Student not found');
      return;
    }
    
    const student = studentResult.data;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Add attendance record
    const result = await window.api.attendance.add({
      student_id: student.id,
      date: today,
      status: 'present',
      time_arrived: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      homework_status: 'not_required',
      session_notes: null
    });
    
    if (result.success) {
      console.log(`✓ Attendance recorded for ${student.name}`);
    }
  } catch (error) {
    console.error('Error recording attendance:', error);
  }
}
```

### Getting Student Profile

```javascript
async function showStudentProfile(studentId) {
  try {
    const result = await window.api.student.profileSummary(studentId);
    
    if (result.success) {
      const profile = result.data;
      console.log(`
        Name: ${profile.name}
        Code: ${profile.code}
        Group: ${profile.group_name} (${profile.group_grade})
        
        Attendance: ${profile.attendance_percentage}%
        Total Sessions: ${profile.total_sessions}
        Present: ${profile.total_present}
        Absent: ${profile.total_absent}
        
        Exams Taken: ${profile.exam_count}
        Average Score: ${profile.average_exam_score}
      `);
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  }
}
```

### Bulk Exam Mark Entry

```javascript
async function submitExamMarks(examId, marksArray) {
  try {
    // marksArray format: [{ student_id: 1, score: 85, notes: '' }, ...]
    const result = await window.api.mark.addBulk({
      exam_id: examId,
      marks: marksArray
    });
    
    if (result.success) {
      console.log(`${result.count} marks recorded successfully`);
    }
  } catch (error) {
    console.error('Error submitting marks:', error);
  }
}
```

### Exporting Data for Excel

```javascript
async function exportAttendanceReport(startDate, endDate, groupId = null) {
  try {
    const result = await window.api.export.attendance({
      startDate,
      endDate,
      groupId
    });
    
    if (result.success) {
      // result.data is array of objects ready for Excel
      // Each object has keys: Date, Student Name, Code, Group, Status, etc.
      return result.data;
    }
  } catch (error) {
    console.error('Error exporting:', error);
  }
}
```

---

## API Reference

### Database Management

#### `db:initialize`
Initialize database connection.

**Returns:** `{ success: boolean, message?: string, error?: string }`

#### `db:getStatistics`
Get database statistics (total records, file size, etc.).

**Returns:** `{ success: boolean, data?: { totalStudents, totalGroups, ... }, error?: string }`

#### `db:backup(path)`
Create database backup.

**Parameters:**
- `path` (string): Full path for backup file

**Returns:** `{ success: boolean, message?: string, error?: string }`

#### `db:vacuum`
Optimize database file size.

**Returns:** `{ success: boolean, message?: string, error?: string }`

---

### Group Management

#### `group:add(data)`
Create new group.

**Parameters:**
```javascript
{
  name: string (required, unique),
  grade: string,
  day: string,
  time: string (HH:MM),
  center_name: string
}
```

#### `group:getAll()`
Retrieve all groups.

**Returns:** `{ success: boolean, data: Group[], error?: string }`

#### `group:getById(groupId)`
Get specific group.

#### `group:update(data)`
Update group details.

#### `group:delete(groupId)`
Delete group (cascades to students if configured).

#### `group:statistics(groupId)`
Get group statistics (student count, attendance, etc.).

---

### Student Management

#### `student:add(data)`
Create new student.

**Parameters:**
```javascript
{
  name: string,
  phone: string,
  parent_phone: string,
  school: string,
  code: string (unique),
  qr_code: string (unique),
  group_id: number,
  notes: string,
  photo: string (base64 or path)
}
```

#### `student:getAll(filter?)`
Get all students, optionally filtered by group.

**Parameters:**
```javascript
{ groupId?: number }
```

#### `student:getById(studentId)`
Get specific student by ID.

#### `student:getByCode(code)`
Find student by student code (fast lookup).

#### `student:getByQRCode(qrCode)`
Find student by QR code (for scanner).

#### `student:update(data)`
Update student information.

#### `student:delete(studentId)`
Remove student (cascades to all related records).

#### `student:profileSummary(studentId)`
Get comprehensive student profile with stats.

**Returns:** Includes attendance %, average exam score, total paid, etc.

#### `student:allProfiles(filter?)`
Get all student profiles.

---

### Attendance Management

#### `attendance:add(data)`
Record attendance.

**Parameters:**
```javascript
{
  student_id: number,
  date: string (YYYY-MM-DD),
  status: 'present' | 'absent' | 'late' | 'excused',
  time_arrived: string (HH:MM),
  homework_status: 'done' | 'incomplete' | 'not_submitted' | 'not_required',
  session_notes: string
}
```

#### `attendance:getByDateRange(data)`
Get attendance records for date range.

**Parameters:**
```javascript
{
  startDate: string (YYYY-MM-DD),
  endDate: string (YYYY-MM-DD),
  groupId?: number
}
```

#### `attendance:getByStudent(data)`
Get student's recent attendance records.

**Parameters:**
```javascript
{ studentId: number, limit?: number = 30 }
```

#### `attendance:getByDate(data)`
Get all attendance for specific date.

**Parameters:**
```javascript
{
  date: string (YYYY-MM-DD),
  groupId?: number
}
```

#### `attendance:getMonthlyReport(studentId)`
Get monthly attendance summary for trend analysis.

---

### Exams & Marks

#### `exam:add(data)`
Create new exam.

**Parameters:**
```javascript
{
  title: string,
  max_score: number = 100,
  date: string (YYYY-MM-DD),
  group_id: number,
  description: string
}
```

#### `exam:getByGroup(groupId)`
Get all exams for a group.

#### `exam:getAll()`
Get all exams.

#### `exam:delete(examId)`
Delete exam and associated marks.

#### `mark:add(data)`
Add single exam mark.

**Parameters:**
```javascript
{
  exam_id: number,
  student_id: number,
  score: number,
  notes: string
}
```

#### `mark:addBulk(data)`
Add multiple marks at once (transaction).

**Parameters:**
```javascript
{
  exam_id: number,
  marks: [
    { student_id: number, score: number, notes?: string },
    // ...
  ]
}
```

#### `mark:getByExam(examId)`
Get all marks for an exam with student details.

---

### Payments

#### `payment:add(data)`
Record payment.

**Parameters:**
```javascript
{
  student_id: number,
  amount: number,
  date: string (YYYY-MM-DD),
  type: 'tuition' | 'material' | 'other',
  description: string,
  payment_method: string
}
```

#### `payment:getByStudent(studentId)`
Get payment history for student.

#### `payment:getByDateRange(data)`
Get payments for date range.

**Parameters:**
```javascript
{
  startDate: string (YYYY-MM-DD),
  endDate: string (YYYY-MM-DD)
}
```

---

### Exports for Excel

#### `export:students(filter?)`
Export student profiles.

**Returns:** Array of objects with flattened student data.

#### `export:attendance(data)`
Export attendance records.

#### `export:examResults(examId)`
Export exam results.

#### `export:payments(data)`
Export payment records.

#### `export:table(data)`
Generic table export.

**Parameters:**
```javascript
{
  tableName: string,
  filters?: { [column]: value }
}
```

---

## Usage Examples

### Example 1: Daily Attendance Dashboard

```javascript
async function loadTodaysAttendance() {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const result = await window.api.attendance.getByDate({
      date: today,
      groupId: currentGroupId
    });
    
    if (result.success) {
      const records = result.data;
      
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      
      console.log(`Today: ${present} present, ${absent} absent, ${late} late`);
    }
  } catch (error) {
    console.error('Error loading attendance:', error);
  }
}
```

### Example 2: Student Progress Report

```javascript
async function generateProgressReport(studentId) {
  try {
    const profileResult = await window.api.student.profileSummary(studentId);
    const monthlyResult = await window.api.attendance.getMonthlyReport(studentId);
    
    if (profileResult.success && monthlyResult.success) {
      const profile = profileResult.data;
      const monthly = monthlyResult.data;
      
      const report = {
        name: profile.name,
        group: profile.group_name,
        currentAttendance: profile.attendance_percentage,
        monthlyBreakdown: monthly,
        averageScore: profile.average_exam_score,
        totalPaid: profile.total_paid
      };
      
      return report;
    }
  } catch (error) {
    console.error('Error generating report:', error);
  }
}
```

### Example 3: Payment Reconciliation

```javascript
async function reconcilePayments(startDate, endDate) {
  try {
    const result = await window.api.payment.getByDateRange({
      startDate,
      endDate
    });
    
    if (result.success) {
      const payments = result.data;
      
      const byType = {
        tuition: 0,
        material: 0,
        other: 0
      };
      
      let total = 0;
      
      payments.forEach(p => {
        byType[p.type] += p.amount;
        total += p.amount;
      });
      
      console.log('Payment Summary:', {
        total,
        byType,
        recordCount: payments.length
      });
    }
  } catch (error) {
    console.error('Error reconciling payments:', error);
  }
}
```

---

## Performance Optimization

### WAL Mode Benefits

✅ **Enabled by default** in database.js

- Allows concurrent reads while writing
- Faster transaction commits
- Safer crash recovery
- Optimal for Electron apps

### Indexing Strategy

All critical columns are indexed:

```
students.code → Fast student lookup
students.qr_code → QR scanner performance
students.group_id → Group filtering
attendance.date → Date range queries
attendance.student_id → Attendance by student
marks.exam_id → Exam results retrieval
marks.student_id → Student scores
payments.student_id → Payment history
```

### Query Optimization Tips

1. **Use views for complex queries:**
   ```javascript
   // Instead of building complex joins manually
   const profile = dbManager.getStudentProfileSummary(studentId);
   ```

2. **Filter early:**
   ```javascript
   // Get filtered data from DB, not in renderer
   const groupStudents = await window.api.student.getAll({ groupId: 5 });
   ```

3. **Limit result sets:**
   ```javascript
   // Get recent records, not entire history
   const recent = await window.api.attendance.getByStudent({
     studentId: 10,
     limit: 30
   });
   ```

### Database Maintenance

**Periodic optimization:**
```javascript
// Weekly maintenance
setInterval(() => {
  window.api.db.vacuum(); // Reclaims space
}, 7 * 24 * 60 * 60 * 1000);

// Daily backup
setInterval(() => {
  const backupPath = path.join(
    app.getPath('userData'),
    `backup_${new Date().toISOString().split('T')[0]}.db`
  );
  window.api.db.backup(backupPath);
}, 24 * 60 * 60 * 1000);
```

---

## Troubleshooting

### Error: "SQLITE_READONLY: attempt to write a readonly database"

**Cause:** Database locked by another process or file permissions issue

**Solution:**
```javascript
// Check if database is properly initialized
const result = await window.api.db.initialize();
console.log(result);

// Ensure userData directory is writable
// On Windows: Check folder properties → Security
// On macOS/Linux: Check chmod permissions
```

### Error: "UNIQUE constraint failed"

**Cause:** Attempting to insert duplicate unique value

**Solution:**
```javascript
// Always check for existing records first
const existing = await window.api.student.getByCode(studentCode);
if (existing.data) {
  // Update instead of insert
  await window.api.student.update({ ...existing.data, ...newData });
} else {
  // Safe to insert
  await window.api.student.add(newData);
}
```

### Error: "FOREIGN KEY constraint failed"

**Cause:** Referenced record doesn't exist

**Solution:**
```javascript
// Ensure group exists before adding student
const groupResult = await window.api.group.getById(groupId);
if (groupResult.data) {
  // Safe to use this group_id
  await window.api.student.add({ ...studentData, group_id: groupId });
}
```

### Slow Queries

**Diagnosis:**
```javascript
// Check database statistics
const stats = await window.api.db.statistics();
console.log('DB Size:', stats.dbSize, 'MB');
console.log('Total Records:', stats.totalStudents + stats.totalAttendanceRecords);
```

**Solutions:**
1. Optimize with vacuum: `await window.api.db.vacuum()`
2. Check if indexes are being used
3. Use views for complex aggregations
4. Limit date ranges in queries

### Database Corruption

**Recovery:**
```javascript
// Create backup of corrupted database
const backupPath = path.join(app.getPath('userData'), 'corrupted_backup.db');
await window.api.db.backup(backupPath);

// Reinitialize fresh database
await window.api.db.initialize();
```

---

## Summary

You now have a **production-ready, centralized database system** with:

✅ Complete schema with 6 normalized tables
✅ Foreign key relationships and data integrity
✅ 3 SQL views for complex queries
✅ Optimized indexing for performance
✅ WAL mode enabled for concurrent access
✅ Comprehensive API with 40+ IPC handlers
✅ Built-in Excel export functionality
✅ Database backup and maintenance tools

**Next Steps:**
1. Install `better-sqlite3`
2. Update your `main.js` with the initialization code
3. Add IPC handlers from `DATABASE_IPC_INTEGRATION.js`
4. Update `preload.js` with the API bridge
5. Start using `window.api.*` in your renderer processes

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API reference
3. Examine the usage examples
4. Check console for detailed error messages

Good luck with your attendance system! 🚀
