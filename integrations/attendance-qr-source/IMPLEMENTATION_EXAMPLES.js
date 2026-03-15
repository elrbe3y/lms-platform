/**
 * ============================================================================
 * IMPLEMENTATION EXAMPLES & BEST PRACTICES
 * ============================================================================
 * Copy and adapt these code samples for your specific use cases
 * ============================================================================
 */

// =====================================================================
// EXAMPLE 1: QR CODE SCANNER & ATTENDANCE
// =====================================================================

// In your scan.html renderer process:

class AttendanceScanner {
  constructor() {
    this.isProcessing = false;
  }

  async handleQRScan(qrCode) {
    if (this.isProcessing) return; // Prevent double scanning
    this.isProcessing = true;

    try {
      // Step 1: Find student by QR code
      const studentResult = await window.api.student.getByQRCode(qrCode);
      
      if (!studentResult.success || !studentResult.data) {
        this.showError('Student not found');
        this.isProcessing = false;
        return;
      }

      const student = studentResult.data;

      // Step 2: Check if already scanned today
      const today = new Date().toISOString().split('T')[0];
      const todayResult = await window.api.attendance.getByDate({
        date: today
      });

      if (todayResult.success) {
        const alreadyScanned = todayResult.data.find(
          r => r.student_id === student.id
        );

        if (alreadyScanned) {
          this.showWarning(`${student.name} already scanned today`);
          this.isProcessing = false;
          return;
        }
      }

      // Step 3: Record attendance
      const now = new Date();
      const timeArrived = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const attendanceResult = await window.api.attendance.add({
        student_id: student.id,
        date: today,
        status: 'present',
        time_arrived: timeArrived,
        homework_status: 'not_required',
        session_notes: null
      });

      if (attendanceResult.success) {
        // Step 4: Update UI with success
        this.showSuccess(`✓ ${student.name} recorded`);
        this.updateDashboard(today);
      }

    } catch (error) {
      console.error('Scanner error:', error);
      this.showError('System error during scan');
    } finally {
      this.isProcessing = false;
    }
  }

  async updateDashboard(date) {
    const result = await window.api.attendance.getByDate({ date });
    
    if (result.success) {
      const records = result.data;
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      
      document.getElementById('present-count').textContent = present;
      document.getElementById('absent-count').textContent = absent;
    }
  }

  showSuccess(message) {
    console.log(`✓ ${message}`);
    // Update UI: green toast, beep sound, etc.
  }

  showWarning(message) {
    console.warn(`⚠ ${message}`);
    // Update UI: yellow toast, warning sound, etc.
  }

  showError(message) {
    console.error(`✗ ${message}`);
    // Update UI: red toast, error sound, etc.
  }
}

// Usage in scan.html
const scanner = new AttendanceScanner();

// When QR code is detected:
document.addEventListener('qr-detected', (event) => {
  scanner.handleQRScan(event.detail.qrCode);
});


// =====================================================================
// EXAMPLE 2: STUDENT PROFILE PAGE
// =====================================================================

class StudentProfileView {
  constructor(studentId) {
    this.studentId = studentId;
  }

  async loadProfile() {
    try {
      // Parallel fetch for performance
      const [profileResult, monthlyResult, paymentsResult] = await Promise.all([
        window.api.student.profileSummary(this.studentId),
        window.api.attendance.getMonthlyReport(this.studentId),
        window.api.payment.getByStudent(this.studentId)
      ]);

      if (!profileResult.success) throw new Error('Failed to load profile');

      const profile = profileResult.data;
      const monthly = monthlyResult.data || [];
      const payments = paymentsResult.data || [];

      this.renderProfile(profile, monthly, payments);

    } catch (error) {
      console.error('Error loading profile:', error);
      this.showError('Failed to load student profile');
    }
  }

  renderProfile(profile, monthly, payments) {
    // Student Info Section
    document.getElementById('student-name').textContent = profile.name;
    document.getElementById('student-code').textContent = profile.code;
    document.getElementById('student-school').textContent = profile.school || 'N/A';
    document.getElementById('student-group').textContent = profile.group_name;
    document.getElementById('join-date').textContent = new Date(
      profile.join_date
    ).toLocaleDateString('en-US');

    // Attendance Statistics
    const attendanceDiv = document.getElementById('attendance-stats');
    attendanceDiv.innerHTML = `
      <div class="stat-card">
        <h3>Attendance</h3>
        <div class="progress-bar">
          <div class="progress" style="width: ${profile.attendance_percentage}%"></div>
        </div>
        <p>${profile.attendance_percentage}%</p>
        <small>
          Present: ${profile.total_present} | 
          Absent: ${profile.total_absent} | 
          Late: ${profile.total_late}
        </small>
      </div>
    `;

    // Exam Performance
    const examsDiv = document.getElementById('exam-stats');
    examsDiv.innerHTML = `
      <div class="stat-card">
        <h3>Exam Performance</h3>
        <p class="score">${profile.average_exam_score || 'N/A'}</p>
        <small>
          Average: ${profile.average_exam_score?.toFixed(2) || 'N/A'} / 100<br>
          Exams Taken: ${profile.exam_count}
        </small>
      </div>
    `;

    // Monthly Trend Chart
    if (monthly.length > 0) {
      this.renderMonthlyChart(monthly);
    }

    // Payment History
    this.renderPaymentHistory(payments);

    // Payment Summary
    document.getElementById('total-paid').textContent = 
      `$${profile.total_paid?.toFixed(2) || '0.00'}`;
  }

  renderMonthlyChart(monthlyData) {
    // Example using Chart.js or similar
    const ctx = document.getElementById('attendance-chart').getContext('2d');
    
    const chartData = {
      labels: monthlyData.map(m => m.month),
      datasets: [{
        label: 'Present',
        data: monthlyData.map(m => m.present_count),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)'
      }, {
        label: 'Absent',
        data: monthlyData.map(m => m.absent_count),
        borderColor: '#F44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)'
      }]
    };

    new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  renderPaymentHistory(payments) {
    const tbody = document.getElementById('payments-table-body');
    tbody.innerHTML = '';

    if (payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No payments recorded</td></tr>';
      return;
    }

    payments.forEach(payment => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${payment.date}</td>
        <td>${payment.type}</td>
        <td>$${payment.amount.toFixed(2)}</td>
        <td>${payment.payment_method}</td>
      `;
    });
  }

  showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-message').style.display = 'block';
  }
}

// Usage:
document.addEventListener('DOMContentLoaded', () => {
  const studentId = new URLSearchParams(window.location.search).get('id');
  if (studentId) {
    const profile = new StudentProfileView(parseInt(studentId));
    profile.loadProfile();
  }
});


// =====================================================================
// EXAMPLE 3: STUDENT DIRECTORY WITH FILTERING
// =====================================================================

class StudentDirectory {
  constructor() {
    this.allStudents = [];
    this.currentGroup = null;
  }

  async loadStudents(groupId = null) {
    try {
      const result = await window.api.student.allProfiles({ groupId });
      
      if (result.success) {
        this.allStudents = result.data;
        this.renderStudentList(this.allStudents);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  }

  renderStudentList(students) {
    const tbody = document.getElementById('students-table').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';

    students.forEach(student => {
      const row = tbody.insertRow();
      
      // Determine attendance color
      const attendanceClass = student.attendance_percentage >= 80 
        ? 'good' 
        : student.attendance_percentage >= 60 
        ? 'fair' 
        : 'poor';

      row.innerHTML = `
        <td>${student.name}</td>
        <td>${student.code}</td>
        <td>${student.group_name}</td>
        <td>
          <span class="attendance-badge ${attendanceClass}">
            ${student.attendance_percentage}%
          </span>
        </td>
        <td>${student.average_exam_score?.toFixed(1) || 'N/A'}</td>
        <td>
          <button onclick="viewStudent(${student.id})" class="btn-small">View</button>
          <button onclick="editStudent(${student.id})" class="btn-small">Edit</button>
        </td>
      `;
    });
  }

  filterByGroup(groupId) {
    const filtered = groupId 
      ? this.allStudents.filter(s => s.group_id === groupId)
      : this.allStudents;
    
    this.renderStudentList(filtered);
  }

  searchStudents(query) {
    const searchTerm = query.toLowerCase();
    const filtered = this.allStudents.filter(s =>
      s.name.toLowerCase().includes(searchTerm) ||
      s.code.toLowerCase().includes(searchTerm) ||
      s.phone.includes(searchTerm)
    );
    
    this.renderStudentList(filtered);
  }

  sortBy(field) {
    const sorted = [...this.allStudents].sort((a, b) => {
      if (a[field] < b[field]) return -1;
      if (a[field] > b[field]) return 1;
      return 0;
    });
    
    this.renderStudentList(sorted);
  }
}

// Usage
const directory = new StudentDirectory();

document.getElementById('group-filter').addEventListener('change', (e) => {
  directory.filterByGroup(parseInt(e.target.value) || null);
});

document.getElementById('search-input').addEventListener('input', (e) => {
  directory.searchStudents(e.target.value);
});


// =====================================================================
// EXAMPLE 4: EXAM CREATION & MARKING
// =====================================================================

class ExamManager {
  async createExam(title, maxScore, date, groupId) {
    try {
      const result = await window.api.exam.add({
        title,
        max_score: maxScore,
        date,
        group_id: groupId,
        description: `Exam for ${date}`
      });

      if (result.success) {
        return result.id;
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  }

  async getExamStudents(examId) {
    try {
      const result = await window.api.mark.getByExam(examId);
      if (result.success) {
        return result.data;
      }
    } catch (error) {
      console.error('Error fetching exam results:', error);
      return [];
    }
  }

  async submitMarks(examId, marksData) {
    try {
      // marksData: [{ student_id: 1, score: 85 }, ...]
      const result = await window.api.mark.addBulk({
        exam_id: examId,
        marks: marksData
      });

      if (result.success) {
        return result.count;
      }
    } catch (error) {
      console.error('Error submitting marks:', error);
      throw error;
    }
  }

  async getExamStatistics(examId) {
    try {
      const results = await this.getExamStudents(examId);
      
      if (results.length === 0) return null;

      const scores = results.map(r => r.score);
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      const maxScore = results[0].max_score;
      
      return {
        total: scores.length,
        average: average.toFixed(2),
        highest: Math.max(...scores),
        lowest: Math.min(...scores),
        passed: scores.filter(s => s >= (maxScore * 0.5)).length,
        percentage: ((average / maxScore) * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Error calculating statistics:', error);
      return null;
    }
  }
}

// Usage in exam.html
const examManager = new ExamManager();

document.getElementById('exam-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('exam-title').value;
  const maxScore = parseFloat(document.getElementById('max-score').value);
  const date = document.getElementById('exam-date').value;
  const groupId = parseInt(document.getElementById('group-id').value);

  try {
    const examId = await examManager.createExam(title, maxScore, date, groupId);
    console.log('Exam created:', examId);
    
    // Redirect to marking page
    window.location.href = `exam-marking.html?exam=${examId}`;
  } catch (error) {
    console.error('Failed to create exam:', error);
  }
});


// =====================================================================
// EXAMPLE 5: ATTENDANCE REPORTS & EXPORT
// =====================================================================

class AttendanceReporter {
  async generateMonthlyReport(groupId, month, year) {
    try {
      // Get all students in group
      const studentsResult = await window.api.student.getAll({ groupId });
      if (!studentsResult.success) throw new Error('Failed to fetch students');

      const students = studentsResult.data;

      // Build report data
      const reportData = await Promise.all(
        students.map(async (student) => {
          const profileResult = await window.api.student.profileSummary(
            student.id
          );
          return profileResult.data;
        })
      );

      return reportData;

    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  async exportToExcel(groupId, startDate, endDate) {
    try {
      // Fetch attendance data
      const attendanceResult = await window.api.export.attendance({
        startDate,
        endDate,
        groupId
      });

      if (!attendanceResult.success) {
        throw new Error('Failed to export attendance');
      }

      // Use ExcelJS to create file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance');

      // Add headers
      const headers = Object.keys(attendanceResult.data[0]);
      worksheet.addRow(headers);

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };

      // Add data rows
      attendanceResult.data.forEach(record => {
        worksheet.addRow(Object.values(record));
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const length = cell.value ? cell.value.toString().length : 10;
          if (length > maxLength) maxLength = length;
        });
        column.width = maxLength + 2;
      });

      // Save file
      const fileName = `Attendance_${startDate}_to_${endDate}.xlsx`;
      await workbook.xlsx.writeFile(fileName);

      console.log(`Report exported: ${fileName}`);
      return fileName;

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }
}

// Usage
const reporter = new AttendanceReporter();

document.getElementById('export-btn').addEventListener('click', async () => {
  const groupId = parseInt(document.getElementById('group-select').value);
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;

  try {
    const fileName = await reporter.exportToExcel(groupId, startDate, endDate);
    alert(`Report exported: ${fileName}`);
  } catch (error) {
    alert(`Export failed: ${error.message}`);
  }
});


// =====================================================================
// EXAMPLE 6: PAYMENT TRACKING
// =====================================================================

class PaymentManager {
  async recordPayment(studentId, amount, date, type = 'tuition') {
    try {
      const result = await window.api.payment.add({
        student_id: studentId,
        amount,
        date,
        type,
        description: `${type} payment for ${date}`,
        payment_method: 'cash'
      });

      if (result.success) {
        return result.id;
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  async getStudentBalance(studentId, tuitionPerMonth = 100) {
    try {
      const profileResult = await window.api.student.profileSummary(studentId);
      
      if (!profileResult.success) throw new Error('Student not found');

      const student = profileResult.data;

      // Calculate expected amount based on months enrolled
      const joinDate = new Date(student.join_date);
      const today = new Date();
      const monthsEnrolled = Math.ceil(
        (today - joinDate) / (1000 * 60 * 60 * 24 * 30)
      );
      const expectedAmount = monthsEnrolled * tuitionPerMonth;

      // Calculate balance
      const totalPaid = student.total_paid || 0;
      const balance = expectedAmount - totalPaid;

      return {
        studentName: student.name,
        monthsEnrolled,
        expectedAmount,
        totalPaid,
        balance,
        statusColor: balance > 0 ? 'danger' : 'success',
        status: balance > 0 ? `Due: $${balance}` : 'Paid'
      };

    } catch (error) {
      console.error('Error calculating balance:', error);
      throw error;
    }
  }

  async generatePaymentReport(startDate, endDate) {
    try {
      const paymentsResult = await window.api.payment.getByDateRange({
        startDate,
        endDate
      });

      if (!paymentsResult.success) throw new Error('Failed to fetch payments');

      const payments = paymentsResult.data;

      // Aggregate by type
      const summary = {
        total: 0,
        byType: {},
        byMethod: {},
        recordCount: payments.length
      };

      payments.forEach(p => {
        summary.total += p.amount;
        
        if (!summary.byType[p.type]) {
          summary.byType[p.type] = 0;
        }
        summary.byType[p.type] += p.amount;

        if (!summary.byMethod[p.payment_method]) {
          summary.byMethod[p.payment_method] = 0;
        }
        summary.byMethod[p.payment_method] += p.amount;
      });

      return { summary, details: payments };

    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
}

// Usage
const paymentMgr = new PaymentManager();

// Check student balance
document.getElementById('check-balance-btn').addEventListener('click', async () => {
  const studentId = parseInt(document.getElementById('student-id').value);
  
  try {
    const balance = await paymentMgr.getStudentBalance(studentId);
    
    const statusEl = document.getElementById('balance-status');
    statusEl.textContent = balance.status;
    statusEl.className = `status-${balance.statusColor}`;
    
    document.getElementById('balance-amount').textContent = 
      `$${Math.abs(balance.balance).toFixed(2)}`;
      
  } catch (error) {
    console.error('Error checking balance:', error);
  }
});


// =====================================================================
// EXAMPLE 7: DATABASE BACKUP UTILITY
// =====================================================================

class BackupManager {
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const backupFileName = `backup_${timestamp}.db`;
      const backupPath = path.join(
        // In renderer, you might need a preload bridge to access path
        // Alternatively, handle this in main process
        `${document.body.getAttribute('data-app-path')}/backups/${backupFileName}`
      );

      const result = await window.api.db.backup(backupPath);
      
      if (result.success) {
        console.log('Backup created:', backupPath);
        return backupPath;
      }
    } catch (error) {
      console.error('Backup error:', error);
      throw error;
    }
  }

  async scheduleAutoBackup(intervalMinutes = 60) {
    setInterval(() => {
      this.createBackup()
        .then(() => console.log('Auto-backup completed'))
        .catch(err => console.error('Auto-backup failed:', err));
    }, intervalMinutes * 60 * 1000);
  }

  async getDatabaseStatistics() {
    try {
      const result = await window.api.db.statistics();
      
      if (result.success) {
        return {
          students: result.data.totalStudents,
          groups: result.data.totalGroups,
          attendance: result.data.totalAttendanceRecords,
          exams: result.data.totalExams,
          fileSize: `${result.data.dbSize} MB`,
          lastSync: result.data.lastAttendanceDate
        };
      }
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }
}

// Usage
const backup = new BackupManager();

// Auto-backup every hour
backup.scheduleAutoBackup(60);

// Manual backup button
document.getElementById('backup-btn').addEventListener('click', async () => {
  try {
    const path = await backup.createBackup();
    alert(`Backup created: ${path}`);
  } catch (error) {
    alert(`Backup failed: ${error.message}`);
  }
});

// Display statistics
document.getElementById('stats-btn').addEventListener('click', async () => {
  const stats = await backup.getDatabaseStatistics();
  if (stats) {
    console.table(stats);
  }
});

// =====================================================================
// END OF EXAMPLES
// =====================================================================
