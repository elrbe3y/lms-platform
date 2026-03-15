// student-profile.js
// عرض بروفايل الطالب مع بيانات قاعدة البيانات عبر IPC

// متغيرات عامة
let currentStudent = null;

// تحويل الوقت من 24 ساعة إلى 12 ساعة
function convertTo12Hour(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'م' : 'ص';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minutes} ${period}`;
}

function compareSessionDesc(a, b) {
  const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
  if (dateCompare !== 0) return dateCompare;
  return String(b.time || '').localeCompare(String(a.time || ''));
}

// العودة إلى صفحة الطلاب مع الصف المختار
function goBackToStudents() {
  const savedGrade = localStorage.getItem('selectedGrade') || '1';
  window.location.href = `students.html?grade=${savedGrade}`;
}

// Dark mode
function toggleDarkMode() {
  const body = document.getElementById('body-main');
  const isDark = body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDark);
  updateDarkModeButton();
}

function updateDarkModeButton() {
  const btn = document.getElementById('darkModeToggle');
  if (document.getElementById('body-main').classList.contains('dark-mode')) {
    btn.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    btn.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

// زر الإضافة (اختياري حالياً)
function addTestAttendanceForCurrentStudent() {
  alert('استخدم صفحة تسجيل الحضور لإضافة حصة جديدة لهذا الطالب.');
}

function renderStudentInfo(student) {
  currentStudent = student;
  document.getElementById('studentName').textContent = student.name || 'طالب';
  document.getElementById('studentIdDisplay').textContent = student.id ?? '-';
  document.getElementById('studentGrade').textContent = student.grade ? `الصف: ${student.grade}` : 'الصف: -';
  document.getElementById('studentCenter').textContent = `سنتر ${student.center || '-'}`;
  document.getElementById('studentGroup').textContent = `مجموعة ${student.group_name || '-'}`;
  document.getElementById('studentPhone').textContent = student.studentPhone || 'غير محدد';
  document.getElementById('guardianPhone').textContent = student.guardianPhone || 'غير محدد';
}

function renderStats(stats) {
  const present = stats.presentCount || 0;
  const homeworkPercent = Number(stats.homeworkPercent || 0);
  const quizPercent = Number(stats.quizPercent || 0);
  const totalPercent = Number(stats.totalPercent || 0);

  document.getElementById('totalSessions').textContent = present;
  document.getElementById('avgHomework').textContent = `${homeworkPercent.toFixed(1)}%`;
  document.getElementById('avgQuiz').textContent = `${quizPercent.toFixed(1)}%`;
  document.getElementById('totalScore').textContent = `${totalPercent.toFixed(1)}%`;
  
  // رسم البيانات البيانية
  renderProgressChart(stats);
}

// رسم مخطط تقدم الطالب
function renderProgressChart(stats) {
  const container = document.getElementById('progressContainer');
  const avgHomework = Number(stats.homeworkPercent || 0);
  const avgQuiz = Number(stats.quizPercent || 0);
  const totalScore = Number(stats.totalPercent || 0);
  
  const getColor = (value) => {
    if (value >= 90) return '#28a745';
    if (value >= 70) return '#17a2b8';
    if (value >= 50) return '#ffc107';
    return '#dc3545';
  };
  
  const getStatus = (value) => {
    if (value >= 90) return 'ممتاز';
    if (value >= 70) return 'جيد جداً';
    if (value >= 50) return 'جيد';
    return 'ضعيف';
  };
  
  container.innerHTML = `
    <div style="background: white; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <div style="font-size: 3em; font-weight: bold; color: ${getColor(avgHomework)}; margin-bottom: 10px;">
        ${avgHomework.toFixed(1)}%
      </div>
      <div style="color: #666; font-size: 0.9em; margin-bottom: 8px;">نسبة الواجب</div>
      <div style="background: ${getColor(avgHomework)}; color: white; padding: 5px 10px; border-radius: 5px; font-size: 0.85em; font-weight: bold;">
        ${getStatus(avgHomework)}
      </div>
    </div>
    
    <div style="background: white; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <div style="font-size: 3em; font-weight: bold; color: ${getColor(avgQuiz)}; margin-bottom: 10px;">
        ${avgQuiz.toFixed(1)}%
      </div>
      <div style="color: #666; font-size: 0.9em; margin-bottom: 8px;">نسبة الاختبار</div>
      <div style="background: ${getColor(avgQuiz)}; color: white; padding: 5px 10px; border-radius: 5px; font-size: 0.85em; font-weight: bold;">
        ${getStatus(avgQuiz)}
      </div>
    </div>
    
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 15px; text-align: center; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <div style="font-size: 3em; font-weight: bold; margin-bottom: 10px;">
        ${totalScore.toFixed(1)}%
      </div>
      <div style="color: rgba(255,255,255,0.9); font-size: 0.9em; margin-bottom: 8px;">النسبة الكلية</div>
      <div style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px; font-size: 0.85em; font-weight: bold;">
        من 100
      </div>
    </div>
  `;
}

function renderAttendanceTable(sessions) {
  const tbody = document.getElementById('attendanceBody');
  const noAttendance = document.getElementById('noAttendance');

  if (!sessions || sessions.length === 0) {
    tbody.innerHTML = '';
    noAttendance.style.display = 'block';
    return;
  }

  noAttendance.style.display = 'none';
  const sortedSessions = [...sessions].sort(compareSessionDesc);
  const rows = sortedSessions.map((row, index) => {
    const homeworkVal = Number(row.homework || 0);
    const quizVal = Number(row.quiz || 0);
    const homework = homeworkVal.toFixed(1);
    const quiz = quizVal.toFixed(1);
    const examMaxScore = Number(row.examMaxScore) || 10;
    const total = homeworkVal + quizVal;
    const totalMaxScore = examMaxScore * 2;
    const percentage = totalMaxScore > 0 ? (total / totalMaxScore) * 100 : 0;
    const homeworkColor = homeworkVal >= 7 ? '#28a745' : homeworkVal >= 5 ? '#ffc107' : '#dc3545';
    const quizColor = quizVal >= 7 ? '#28a745' : quizVal >= 5 ? '#ffc107' : '#dc3545';
    const totalColor = percentage >= 70 ? 'green' : percentage >= 50 ? 'orange' : '#dc3545';
    const bg = index % 2 === 0 ? '#f8f9fa' : 'white';
    
    let grade = '';
    let gradeColor = '';
    if (percentage >= 90) { grade = 'ممتاز'; gradeColor = '#28a745'; }
    else if (percentage >= 70) { grade = 'جيد جداً'; gradeColor = '#17a2b8'; }
    else if (percentage >= 50) { grade = 'جيد'; gradeColor = '#ffc107'; }
    else { grade = 'ضعيف'; gradeColor = '#dc3545'; }
    
    // عرض الملاحظة
    const studentNote = row.studentNote || '';
    const noteDisplay = studentNote 
      ? `<span style="color:#333; font-size:11px; display:inline-block; max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:#f0f4ff; padding:3px 6px; border-radius:4px;" title="${studentNote}">📝 ${studentNote}</span>`
      : '<span style="color:#ddd; font-size:10px;">-</span>';
    
    const maxScoreDisplay = examMaxScore !== 10 ? ` <span style="color:#999; font-size:11px;">/${examMaxScore * 2}</span>` : '';
    
    return `
      <tr style="border-bottom: 1px solid #eee; background: ${bg};">
        <td style="padding: 15px; text-align: center;">
          <i class="fas fa-calendar-day" style="color: #667eea; margin-left: 5px;"></i>
          ${row.date || '-'}
        </td>
        <td style="padding: 15px; text-align: center;">
          <i class="fas fa-clock" style="color: #11998e; margin-left: 5px;"></i>
          ${row.time ? convertTo12Hour(row.time) : '-'}
        </td>
        <td style="padding: 15px; text-align: center;">
          <span style="background: ${homeworkColor}; color: white; padding: 5px 12px; border-radius: 20px; font-weight: bold;">
            ${homework}
          </span>
        </td>
        <td style="padding: 15px; text-align: center;">
          <span style="background: ${quizColor}; color: white; padding: 5px 12px; border-radius: 20px; font-weight: bold;">
            ${quiz}
          </span>
        </td>
        <td style="padding: 15px; text-align: center; font-weight: bold; color: ${totalColor};">
          ${total.toFixed(1)}${maxScoreDisplay}
        </td>
        <td style="padding: 15px; text-align: center;">
          <span style="background:${gradeColor}; color:white; font-weight:bold; padding:5px 10px; border-radius:5px; font-size:12px;">${grade}</span>
        </td>
        <td style="padding: 15px; text-align: center;">
          ${noteDisplay}
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;
}

function normalizeHour(timeValue) {
  if (!timeValue) return '';
  const parts = String(timeValue).split(':');
  const hour = parts[0] ? parts[0].padStart(2, '0') : '';
  return hour;
}

function getSessionKeyFromRow(row) {
  if (row.session_id) return String(row.session_id);
  const hour = normalizeHour(row.time);
  return `${row.date}_${hour}`;
}

function buildAbsentSessions(student, sessions) {
  const allAttendance = dataManager.getAllAttendance();
  const gradeStudents = dataManager.getStudentsSync(student.grade);
  const gradeStudentIds = new Set(gradeStudents.map(s => String(s.id)));

  const gradeAttendance = allAttendance.filter(a => gradeStudentIds.has(String(a.student_id)));
  const allSessionsMap = new Map();
  gradeAttendance.forEach(row => {
    const key = getSessionKeyFromRow(row);
    if (!allSessionsMap.has(key)) {
      allSessionsMap.set(key, { date: row.date, time: row.time });
    }
  });

  const studentSessionKeys = new Set(sessions.map(row => getSessionKeyFromRow(row)));
  const absentSessions = [];

  allSessionsMap.forEach((value, key) => {
    if (!studentSessionKeys.has(key)) {
      absentSessions.push(value);
    }
  });

  return absentSessions.sort((a, b) => {
    return compareSessionDesc(a, b);
  });
}

function renderAbsentTable(absentSessions) {
  const tbody = document.getElementById('absentBody');
  const noAbsent = document.getElementById('noAbsent');

  if (!absentSessions || absentSessions.length === 0) {
    tbody.innerHTML = '';
    noAbsent.style.display = 'block';
    return;
  }

  noAbsent.style.display = 'none';
  const rows = absentSessions.map((row, index) => {
    const bg = index % 2 === 0 ? '#fdf2f2' : 'white';
    return `
      <tr style="border-bottom: 1px solid #f0c0c0; background: ${bg};">
        <td style="padding: 15px; text-align: center;">
          <i class="fas fa-calendar-day" style="color: #dc3545; margin-left: 5px;"></i>
          ${row.date || '-'}
        </td>
        <td style="padding: 15px; text-align: center;">
          <i class="fas fa-clock" style="color: #c44569; margin-left: 5px;"></i>
          ${row.time ? convertTo12Hour(row.time) : '-'}
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;
}

async function loadProfile() {
  try {
    // Dark mode restore
    if (localStorage.getItem('darkMode') === 'true') {
      document.getElementById('body-main').classList.add('dark-mode');
    }
    updateDarkModeButton();

    const params = new URLSearchParams(window.location.search);
    const studentId = params.get('id');

    if (!studentId) {
      document.getElementById('studentName').textContent = 'خطأ: لا يوجد معرف طالب';
      return;
    }

    // استخدام dataManager مباشرة
    if (typeof dataManager === 'undefined') {
      document.getElementById('studentName').textContent = 'خطأ: نظام البيانات غير جاهز';
      return;
    }

    const student = dataManager.getStudentById(studentId);
    
    if (!student) {
      document.getElementById('studentName').textContent = 'تعذر تحميل بيانات الطالب';
      console.error('Student not found:', studentId);
      return;
    }

    const stats = dataManager.getStudentStats(studentId);
    const sessions = dataManager.getStudentAttendance(studentId);
    const absentSessions = buildAbsentSessions(student, sessions);
    
    renderStudentInfo(student);
    renderStats(stats);
    renderAttendanceTable(sessions);
    renderAbsentTable(absentSessions);
  } catch (error) {
    console.error('Error loading profile:', error);
    alert('حدث خطأ في تحميل البيانات: ' + error.message);
  }
}

window.addEventListener('DOMContentLoaded', loadProfile);
