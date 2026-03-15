// dashboard.js
// لوحة التحكم التحليلية مع الرسوم البيانية

let currentGrade = '3';
let centersData = [];
let groupsData = [];

// تحميل المراكز والمجموعات من API
async function loadCentersAndGroups() {
  try {
    const centersResponse = await fetch('http://localhost:3000/api/centers');
    centersData = await centersResponse.json();
    
    const groupsResponse = await fetch('http://localhost:3000/api/groups');
    groupsData = await groupsResponse.json();
  } catch (error) {
    console.error('Error loading centers and groups:', error);
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  // التحقق من وجود البيانات
  if (typeof dataManager === 'undefined') {
    alert('خطأ: لم يتم تحميل dataManager. تأكد من تحميل data.js أولاً.');
    return;
  }

  // التحقق من وجود Chart.js
  if (typeof Chart === 'undefined') {
    alert('خطأ: لم يتم تحميل Chart.js. تأكد من الاتصال بالإنترنت.');
    return;
  }

  // تحميل المراكز والمجموعات من API
  await loadCentersAndGroups();

  const gradeSelect = document.getElementById('gradeSelect');
  let charts = {};

  function getGrade() {
    return gradeSelect.value;
  }

  function calculateTotalSessions() {
    const allAttendance = dataManager.getAllAttendance();
    const uniqueDates = new Set();
    allAttendance.forEach(a => uniqueDates.add(a.date));
    return uniqueDates.size;
  }

  function updateStatistics() {
    const grade = getGrade();
    const students = dataManager.getStudentsSync(grade);
    const attendance = dataManager.getAllAttendance().filter(a => {
      const student = dataManager.getStudentById(a.student_id);
      return student && student.grade == grade;
    });
    const totalSessions = calculateTotalSessions();

    // عدد الطلاب
    document.getElementById('totalStudents').textContent = students.length;

    // سجلات الحضور
    document.getElementById('totalAttendance').textContent = attendance.length;

    // متوسط الحضور
    const avgAttendanceRate = students.length > 0 && totalSessions > 0
      ? ((attendance.length / (students.length * totalSessions)) * 100).toFixed(1)
      : 0;
    document.getElementById('avgAttendance').textContent = avgAttendanceRate + '%';
  }

  function createGroupsChart() {
    const grade = getGrade();
    const students = dataManager.getStudentsSync(grade);
    
    // تجميع الطلاب حسب المجموعات من API
    const groupCounts = {};
    const groupLabels = [];
    
    // تهيئة المجموعات من API
    groupsData.forEach(group => {
      const center = centersData.find(c => c.id === group.center_id);
      const centerName = center ? center.name : 'غير معروف';
      const key = `${centerName} - ${group.name}`;
      groupCounts[key] = 0;
      groupLabels.push(key);
    });
    
    // حساب عدد الطلاب في كل مجموعة
    students.forEach(s => {
      // البحث عن المركز والمجموعة
      let centerName, groupName;
      
      if (s.center && !isNaN(s.center)) {
        const centerObj = centersData.find(c => c.id === parseInt(s.center));
        centerName = centerObj ? centerObj.name : s.center;
      } else {
        centerName = s.center;
      }
      
      if (s.group_name && !isNaN(s.group_name)) {
        const groupObj = groupsData.find(g => g.id === parseInt(s.group_name));
        groupName = groupObj ? groupObj.name : s.group_name;
      } else {
        groupName = s.group_name;
      }
      
      const key = `${centerName} - ${groupName}`;
      if (groupCounts.hasOwnProperty(key)) {
        groupCounts[key]++;
      }
    });

    const ctx = document.getElementById('groupsChart');
    if (charts.groups) charts.groups.destroy();
    
    // توليد ألوان ديناميكية للمجموعات
    const colors = groupLabels.map((_, i) => {
      const hue = (i * 137.5) % 360;
      return `hsl(${hue}, 70%, 60%)`;
    });
    
    charts.groups = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: groupLabels,
        datasets: [{
          label: 'عدد الطلاب',
          data: groupLabels.map(g => groupCounts[g]),
          backgroundColor: colors,
          borderColor: colors.map(c => c),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `عدد الطلاب: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  function createCentersChart() {
    const grade = getGrade();
    const students = dataManager.getStudentsSync(grade);
    
    // ترتيب السناتر
    const centerCounts = {};
    const centerLabels = [];
    
    // تهيئة المراكز من API
    centersData.forEach(center => {
      centerCounts[center.name] = 0;
      centerLabels.push(center.name);
    });
    
    students.forEach(s => {
      let centerName;
      if (s.center && !isNaN(s.center)) {
        const centerObj = centersData.find(c => c.id === parseInt(s.center));
        centerName = centerObj ? centerObj.name : s.center;
      } else {
        centerName = s.center;
      }
      const center = centerName;
      if (centerCounts.hasOwnProperty(center)) {
        centerCounts[center]++;
      }
    });

    const ctx = document.getElementById('centersChart');
    if (charts.centers) charts.centers.destroy();
    
    // توليد ألوان ديناميكية للمراكز
    const colors = centerLabels.map((_, i) => {
      const hue = (i * 137.5) % 360;
      return `hsl(${hue}, 70%, 60%)`;
    });
    
    charts.centers = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: centerLabels,
        datasets: [{
          data: centerLabels.map(c => centerCounts[c]),
          backgroundColor: colors,
          borderWidth: 3,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 14,
                family: 'Cairo'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} طالب (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

function createAttendanceChart() {
    const grade = getGrade();
    const students = dataManager.getStudentsSync(grade);
    const totalSessions = calculateTotalSessions();
    
    const attendance = dataManager.getAllAttendance().filter(a => {
      const student = dataManager.getStudentById(a.student_id);
      return student && student.grade == grade;
    });

    const totalPossible = students.length * totalSessions;
    const totalPresent = attendance.length;
    const totalAbsent = Math.max(0, totalPossible - totalPresent);

    const ctx = document.getElementById('attendanceChart');
    if (charts.attendance) charts.attendance.destroy();
    
    charts.attendance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['الحضور', 'الغياب'],
        datasets: [{
          data: [totalPresent, totalAbsent],
          backgroundColor: ['#28a745', '#dc3545'],
          borderWidth: 3,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 14,
                family: 'Cairo'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  function createGradesChart() {
    const grade = getGrade();
    const exams = dataManager.getAllExams(grade);
    
    let excellent = 0, veryGood = 0, good = 0, acceptable = 0, weak = 0;
    
    exams.forEach(e => {
      const percentage = (e.score / e.max_score) * 100;
      if (percentage >= 85) excellent++;
      else if (percentage >= 75) veryGood++;
      else if (percentage >= 65) good++;
      else if (percentage >= 50) acceptable++;
      else weak++;
    });

    const ctx = document.getElementById('gradesChart');
    if (charts.grades) charts.grades.destroy();
    
    charts.grades = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['ممتاز (85%+)', 'جيد جداً (75%+)', 'جيد (65%+)', 'مقبول (50%+)', 'ضعيف (<50%)'],
        datasets: [{
          data: [excellent, veryGood, good, acceptable, weak],
          backgroundColor: ['#28a745', '#17a2b8', '#ffc107', '#fd7e14', '#dc3545'],
          borderWidth: 3,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 10,
              font: {
                size: 12,
                family: 'Cairo'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${context.parsed} طالب (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  function createTopStudentsChart() {
    const grade = getGrade();
    const students = dataManager.getStudentsSync(grade);
    const exams = dataManager.getAllExams(grade);
    
    // حساب متوسط كل طالب
    const studentAverages = students.map(student => {
      const studentExams = exams.filter(e => e.student_id === student.id);
      if (studentExams.length === 0) return { name: student.name, avg: 0 };

      const totalPercentage = studentExams.reduce((sum, exam) => {
        const pct = (exam.score / exam.max_score) * 100;
        return sum + pct;
      }, 0);
      const avg = totalPercentage / studentExams.length;
      return { name: student.name, avg: Number(avg.toFixed(1)) };
    });

    // اختيار أعلى 5 طلاب
    const topStudents = studentAverages
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    const ctx = document.getElementById('topStudentsChart');
    if (charts.topStudents) charts.topStudents.destroy();
    
    // ألوان متدرجة من الذهبي إلى البرونزي
    const colors = [
      '#FFD700', // ذهبي - الأول
      '#C0C0C0', // فضي - الثاني
      '#CD7F32', // برونزي - الثالث
      '#667eea', // بنفسجي - الرابع
      '#764ba2'  // بنفسجي غامق - الخامس
    ];
    
    charts.topStudents = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topStudents.map(s => s.name || 'بدون اسم'),
        datasets: [{
          label: 'متوسط الدرجات (%)',
          data: topStudents.map(s => s.avg),
          backgroundColor: topStudents.map((_, i) => colors[i] || '#667eea'),
          borderColor: topStudents.map((_, i) => colors[i] || '#667eea'),
          borderWidth: 2
        }]
      },
      options: {
        indexAxis: 'y', // رسم أفقي لسهولة القراءة
        responsive: true,
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `المتوسط: ${context.parsed.x}%`;
              }
            }
          }
        }
      }
    });
  }

  function refreshAll() {
    updateStatistics();
    createGroupsChart();
    createCentersChart();
    createAttendanceChart();
    createGradesChart();
    createTopStudentsChart();
  }

  // بدء التحميل الأولي
  refreshAll();

  // تحديث عند تغيير المرحلة
  gradeSelect.addEventListener('change', refreshAll);
});

