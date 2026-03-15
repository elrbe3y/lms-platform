// reports.js
// عرض وتصفية وتصدير تقارير الحضور

let centersData = [];
let groupsData = [];

// تحويل الوقت من 24 ساعة إلى 12 ساعة
function convertTo12Hour(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'م' : 'ص';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minutes} ${period}`;
}

function isExamAbsentRow(row) {
  return !!(row && (row.examAbsent === true || row.examAbsent === 'true'));
}

function getAdjustedScores(row) {
  if (isExamAbsentRow(row)) {
    return { homework: 0, quiz: 0, total: 0 };
  }
  const homework = Number(row?.homework || 0);
  const quiz = Number(row?.quiz || 0);
  return { homework, quiz, total: homework + quiz };
}

// تحميل المراكز والمجموعات من API
async function loadCentersAndGroups() {
  try {
    const centersResponse = await fetch('http://localhost:3000/api/centers');
    centersData = await centersResponse.json();
    
    const groupsResponse = await fetch('http://localhost:3000/api/groups');
    groupsData = await groupsResponse.json();
    
    // تحديث قائمة المجموعات في الفلتر
    const filterGroup = document.getElementById('filterGroup');
    filterGroup.innerHTML = '<option value="all">الكل</option>';
    
    groupsData.forEach(group => {
      const center = centersData.find(c => c.id === group.center_id);
      const centerName = center ? center.name : 'غير معروف';
      const option = document.createElement('option');
      option.value = `${group.center_id}-${group.id}`;
      option.textContent = `${centerName} - ${group.name}`;
      filterGroup.appendChild(option);
    });
    
    // تحديث قائمة المجموعات في فلتر الغياب
    const absentGroupFilter = document.getElementById('absentGroupFilter');
    if (absentGroupFilter) {
      absentGroupFilter.innerHTML = '<option value="all">الكل</option>';
      groupsData.forEach(group => {
        const center = centersData.find(c => c.id === group.center_id);
        const centerName = center ? center.name : 'غير معروف';
        const option = document.createElement('option');
        option.value = `${group.center_id}-${group.id}`;
        option.textContent = `${centerName} - ${group.name}`;
        absentGroupFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading centers and groups:', error);
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  // تحميل المراكز والمجموعات
  await loadCentersAndGroups();
  
  const table = document.getElementById('attendanceTable').querySelector('tbody');
  const searchName = document.getElementById('searchName');
  const searchDateFrom = document.getElementById('searchDateFrom');
  const searchDateTo = document.getElementById('searchDateTo');
  const sortBy = document.getElementById('sortBy');
  const filterGrade = document.getElementById('filterGrade');
  const filterGroup = document.getElementById('filterGroup');
  const absentDate = document.getElementById('absentDate');
  const absentOnly = document.getElementById('absentOnly');
  const gradeSelect = document.getElementById('gradeSelect');
  const exportBtn = document.getElementById('exportReportBtn');
  const exportAbsentBtn = document.getElementById('exportAbsentBtn');
  const printBtn = document.getElementById('printReportBtn');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const reportTitle = document.getElementById('reportTitle');
  let allStudents = [];
  let allAttendance = [];

  function getGrade() {
    const urlGrade = new URLSearchParams(window.location.search).get('grade');
    if (urlGrade) {
      if (gradeSelect) gradeSelect.value = urlGrade;
      // إخفاء اختيار الصف إذا جاء من URL
      const gradeContainer = document.getElementById('gradeSelectContainer');
      if (gradeContainer) gradeContainer.style.display = 'none';
      return urlGrade;
    }
    return gradeSelect ? gradeSelect.value : '3';
  }

  function setTitle() {
    const grade = getGrade();
    const gradeNames = {
      '3': 'أولى ثانوي',
      '2': 'ثانية ثانوي',
      '1': 'ثالثة ثانوي'
    };
    reportTitle.textContent = `تقارير الحضور - ${gradeNames[grade]}`;
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

  function matchGroupFilterForStudent(student, groupFilterValue) {
    if (groupFilterValue === 'all') return true;
    if (!student) return false;

    const [centerId, groupId] = groupFilterValue.split('-').map(Number);
    let studentCenterId = student.center;
    let studentGroupId = student.group_name;

    if (student.center && isNaN(student.center)) {
      const centerObj = centersData.find(c => c.name === student.center);
      studentCenterId = centerObj ? centerObj.id : null;
    } else {
      studentCenterId = parseInt(student.center);
    }

    if (student.group_name && isNaN(student.group_name)) {
      const groupObj = groupsData.find(g => g.name === student.group_name);
      studentGroupId = groupObj ? groupObj.id : null;
    } else {
      studentGroupId = parseInt(student.group_name);
    }

    return studentCenterId === centerId && studentGroupId === groupId;
  }

  function toCsvValue(value) {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function exportRowsToCsv(rows, columns, filename) {
    const headerLine = columns.map(col => toCsvValue(col.header)).join(',');
    const lines = rows.map(row => columns.map(col => toCsvValue(row[col.key])).join(','));
    const csv = `\uFEFF${[headerLine, ...lines].join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function tryElectronExport(rows) {
    if (!window.electronAPI || typeof window.electronAPI.exportExcel !== 'function') return false;
    try {
      const result = await window.electronAPI.exportExcel(rows);
      return !!(result && result.success);
    } catch (error) {
      console.error('Export error:', error);
      return false;
    }
  }

  function loadData() {
    const grade = getGrade();
    allStudents = dataManager.getStudents(grade);
    allAttendance = dataManager.getAllAttendance().filter(a => {
      const student = dataManager.getStudentById(a.student_id);
      return student && student.grade == grade;
    });
    renderTable();
  }

  function renderTable() {
    const nameFilter = searchName.value.trim().toLowerCase();
    const dateFrom = searchDateFrom.value;
    const dateTo = searchDateTo.value;
    const sort = sortBy.value;
    const gradeFilter = filterGrade.value;
    const groupFilter = filterGroup.value;
    const isAbsentOnly = absentOnly && absentOnly.checked;

    let filteredAttendance = [];

    if (isAbsentOnly) {
      const sessionDate = absentDate ? absentDate.value : '';
      const absentGroupFilter = document.getElementById('absentGroupFilter');
      const absentGroupValue = absentGroupFilter ? absentGroupFilter.value : 'all';

      if (!sessionDate) {
        table.innerHTML = '<tr><td colspan="11" style="padding: 20px; color: #dc3545; font-weight: bold;">يرجى اختيار التاريخ</td></tr>';
        updateStatistics([]);
        return;
      }

      const grade = getGrade();
      const students = dataManager.getStudentsSync(grade);

      // جمع كل الطلاب الذين حضروا في هذا اليوم
      const attendedIds = new Set(
        allAttendance
          .filter(row => row.date === sessionDate)
          .map(row => String(row.student_id))
      );

      filteredAttendance = students
        .filter(student => {
          const matchName = nameFilter
            ? String(student.name || '').toLowerCase().includes(nameFilter)
            : true;
          const matchGroup = matchGroupFilterForStudent(student, absentGroupValue);
          return matchName && matchGroup;
        })
        .filter(student => !attendedIds.has(String(student.id)))
        .map(student => ({
          id: `absent_${student.id}_${sessionDate}`,
          student_id: student.id,
          name: student.name,
          date: sessionDate,
          time: '-',
          homework: 0,
          quiz: 0,
          status: 'absent'
        }));
    } else {
      filteredAttendance = allAttendance.filter(row => {
        const student = dataManager.getStudentById(row.student_id);
        const displayName = student ? student.name : row.name || '';
        const matchName = nameFilter ? displayName.toLowerCase().includes(nameFilter) : true;
        const matchDateFrom = dateFrom ? row.date >= dateFrom : true;
        const matchDateTo = dateTo ? row.date <= dateTo : true;

        const total = getAdjustedScores(row).total;
        let matchGrade = true;
        if (gradeFilter === 'excellent') matchGrade = total >= 18;
        else if (gradeFilter === 'verygood') matchGrade = total >= 14 && total < 18;
        else if (gradeFilter === 'good') matchGrade = total >= 10 && total < 14;
        else if (gradeFilter === 'weak') matchGrade = total < 10;

        const matchGroup = matchGroupFilterForStudent(student, groupFilter);

        return matchName && matchDateFrom && matchDateTo && matchGrade && matchGroup;
      });
    }

    // الترتيب
    filteredAttendance.sort((a, b) => {
      const totalA = getAdjustedScores(a).total;
      const totalB = getAdjustedScores(b).total;

      if (sort === 'date-desc') return b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
      if (sort === 'date-asc') return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
      if (sort === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sort === 'total-desc') return totalB - totalA;
      if (sort === 'total-asc') return totalA - totalB;
      return 0;
    });

    table.innerHTML = '';
    filteredAttendance.forEach((row, index) => {
      const student = dataManager.getStudentById(row.student_id);
      const studentName = student ? student.name : row.name;
      const studentPhone = student ? student.studentPhone || '' : '';
      const guardianPhone = student ? student.guardianPhone || '' : '';
      const adjustedScores = getAdjustedScores(row);
      const homework = adjustedScores.homework;
      const quiz = adjustedScores.quiz;
      const total = adjustedScores.total;
      const displayTime = convertTo12Hour(row.time);
      const isAbsent = row.status === 'absent';
      const isExamAbsent = isExamAbsentRow(row);
      
      // احصل على الدرجة النهائية المحفوظة أو استخدم 10 كافتراضي
      const examMaxScore = row.examMaxScore || 10;
      const totalMaxScore = examMaxScore * 2; // المجموع الكلي (واجب + كويز)
      const percentage = totalMaxScore > 0 ? (total / totalMaxScore) * 100 : 0;

      // تحديد التقدير بناءً على النسبة المئوية
      let grade = '';
      let gradeColor = '';
      if (isAbsent) { grade = 'غائب'; gradeColor = '#dc3545'; }
      else if (isExamAbsent) { grade = 'غائب عن الامتحان'; gradeColor = '#dc3545'; }
      else if (percentage >= 90) { grade = 'ممتاز'; gradeColor = '#28a745'; }
      else if (percentage >= 70) { grade = 'جيد جداً'; gradeColor = '#17a2b8'; }
      else if (percentage >= 50) { grade = 'جيد'; gradeColor = '#ffc107'; }
      else { grade = 'ضعيف'; gradeColor = '#dc3545'; }

      const editCell = isAbsent
        ? '<span style="color:#dc3545; font-weight:bold;">غائب</span>'
        : `<button onclick="editAttendanceGrades('${row.id}', '${studentName}', ${homework}, ${quiz})" class="main-btn" style="padding:5px 10px; font-size:12px;"><i class="fas fa-edit"></i> تعديل</button>`;

      // عرض الملاحظة إن وجدت
      const studentNote = row.studentNote || '';
      const noteDisplay = studentNote 
        ? `<span style="color:#333; font-size:11px; display:inline-block; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:#f0f4ff; padding:3px 6px; border-radius:4px; cursor:help;" title="${studentNote}">📝 ${studentNote}</span>`
        : '<span style="color:#ddd; font-size:10px;">-</span>';

      // عرض الدرجة النهائية إذا كانت مختلفة عن 10
      const maxScoreDisplay = examMaxScore !== 10 ? ` <span style="color:#999; font-size:11px;">/${examMaxScore * 2}</span>` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:bold; color:#667eea;">${index + 1}</td>
        <td>${row.student_id}</td>
        <td style="font-weight:600;">${studentName}</td>
        <td>${studentPhone}</td>
        <td>${guardianPhone}</td>
        <td>${row.date} ${displayTime}</td>
        <td style="color:${homework >= 7 ? 'green' : homework >= 5 ? 'orange' : 'red'}; font-weight:bold;">${homework.toFixed(1)}</td>
        <td style="color:${quiz >= 7 ? 'green' : quiz >= 5 ? 'orange' : 'red'}; font-weight:bold;">${quiz.toFixed(1)}</td>
        <td style="font-weight:bold; font-size:16px; color:${total >= 14 ? 'green' : total >= 10 ? 'orange' : 'red'}">${total.toFixed(1)}${maxScoreDisplay}</td>
        <td style="background:${gradeColor}; color:white; font-weight:bold; padding:5px; border-radius:5px;">${grade}</td>
        <td style="text-align:center;">${noteDisplay}</td>
        <td>${editCell}</td>
      `;
      table.appendChild(tr);
    });

    // حساب الإحصائيات المتقدمة
    updateStatistics(filteredAttendance);
  }

  function updateStatistics(filteredAttendance) {
    const totals = filteredAttendance.map(a => getAdjustedScores(a).total);
    const homeworks = filteredAttendance.map(a => getAdjustedScores(a).homework);
    const quizzes = filteredAttendance.map(a => getAdjustedScores(a).quiz);
    
    document.getElementById('totalRecords').textContent = filteredAttendance.length;
    document.getElementById('uniqueStudents').textContent = new Set(filteredAttendance.map(a => a.student_id)).size;
    
    const avgHw = filteredAttendance.length > 0 ? (homeworks.reduce((a,b) => a+b, 0) / filteredAttendance.length).toFixed(1) : 0;
    const avgQz = filteredAttendance.length > 0 ? (quizzes.reduce((a,b) => a+b, 0) / filteredAttendance.length).toFixed(1) : 0;
    
    document.getElementById('avgHomework').textContent = avgHw;
    document.getElementById('avgQuiz').textContent = avgQz;
    document.getElementById('maxTotal').textContent = totals.length > 0 ? Math.max(...totals).toFixed(1) : 0;
    document.getElementById('minTotal').textContent = totals.length > 0 ? Math.min(...totals).toFixed(1) : 0;
    
    // توزيع المستويات
    document.getElementById('excellentCount').textContent = totals.filter(t => t >= 18).length;
    document.getElementById('verygoodCount').textContent = totals.filter(t => t >= 14 && t < 18).length;
    document.getElementById('goodCount').textContent = totals.filter(t => t >= 10 && t < 14).length;
    document.getElementById('weakCount').textContent = totals.filter(t => t < 10).length;
  }

  searchName.oninput = renderTable;
  searchDateFrom.oninput = renderTable;
  searchDateTo.oninput = renderTable;
  sortBy.onchange = renderTable;
  filterGrade.onchange = renderTable;
  filterGroup.onchange = renderTable;
  if (absentDate) absentDate.oninput = renderTable;
  if (absentOnly) absentOnly.onchange = renderTable;

  if (gradeSelect) gradeSelect.onchange = loadData;

  // مسح الفلاتر
  clearFiltersBtn.onclick = function() {
    searchName.value = '';
    searchDateFrom.value = '';
    searchDateTo.value = '';
    sortBy.value = 'date-desc';
    filterGrade.value = 'all';
    filterGroup.value = 'all';
    renderTable();
  };

  // الطباعة
  printBtn.onclick = function() {
    window.print();
  };

  setTitle();
  loadData();

  if (exportBtn) exportBtn.onclick = async function() {
    const grade = getGrade();
    const data = allAttendance.map(a => {
      const student = dataManager.getStudentById(a.student_id);
      const adjustedScores = getAdjustedScores(a);
      return {
        id: a.student_id,
        name: a.name,
        studentPhone: student ? student.studentPhone : '',
        guardianPhone: student ? student.guardianPhone : '',
        date: a.date,
        time: a.time,
        homework: adjustedScores.homework,
        quiz: adjustedScores.quiz,
        total: adjustedScores.total
      };
    });
    const reportColumns = [
      { header: 'ID', key: 'id' },
      { header: 'الاسم', key: 'name' },
      { header: 'رقم الطالب', key: 'studentPhone' },
      { header: 'رقم ولي الأمر', key: 'guardianPhone' },
      { header: 'التاريخ', key: 'date' },
      { header: 'الوقت', key: 'time' },
      { header: 'درجة الواجب', key: 'homework' },
      { header: 'درجة الكويز', key: 'quiz' },
      { header: 'المجموع', key: 'total' }
    ];
    const didExport = await tryElectronExport(data);
    if (didExport) {
      alert('تم تصدير التقرير بنجاح');
      return;
    }
    exportRowsToCsv(data, reportColumns, `attendance-report-${grade}.csv`);
    alert('تم تصدير التقرير بصيغة CSV');
  };

  // تصدير الغياب
  if (exportAbsentBtn) exportAbsentBtn.onclick = async function() {
    const absentDate = document.getElementById('absentDate');
    const absentGroupFilter = document.getElementById('absentGroupFilter');
    
    const sessionDate = absentDate ? absentDate.value : '';
    const absentGroupValue = absentGroupFilter ? absentGroupFilter.value : 'all';

    if (!sessionDate) {
      alert('يرجى اختيار التاريخ أولاً');
      return;
    }

    const grade = getGrade();
    const students = dataManager.getStudentsSync(grade);

    // جمع كل الطلاب الذين حضروا في هذا اليوم
    const attendedIds = new Set(
      allAttendance
        .filter(row => row.date === sessionDate)
        .map(row => String(row.student_id))
    );

    const absentStudents = students
      .filter(student => {
        const matchGroup = matchGroupFilterForStudent(student, absentGroupValue);
        return matchGroup;
      })
      .filter(student => !attendedIds.has(String(student.id)))
      .map(student => ({
        id: student.id,
        name: student.name,
        studentPhone: student.studentPhone || '',
        guardianPhone: student.guardianPhone || '',
        date: sessionDate,
        time: '-',
        status: 'غائب'
      }));

    if (absentStudents.length === 0) {
      alert('لا يوجد طلاب غائبين في هذا اليوم');
      return;
    }

    const absentColumns = [
      { header: 'ID', key: 'id' },
      { header: 'الاسم', key: 'name' },
      { header: 'رقم الطالب', key: 'studentPhone' },
      { header: 'رقم ولي الأمر', key: 'guardianPhone' },
      { header: 'التاريخ', key: 'date' },
      { header: 'الحالة', key: 'status' }
    ];
    const didExport = await tryElectronExport(absentStudents);
    if (didExport) {
      alert(`تم تصدير ${absentStudents.length} طالب غائب بنجاح`);
      return;
    }
    exportRowsToCsv(absentStudents, absentColumns, `absent-report-${sessionDate}.csv`);
    alert(`تم تصدير ${absentStudents.length} طالب غائب بصيغة CSV`);
  };

  loadData();

  // Initialize modal listeners once
  const modal = document.getElementById('editModal');
  const editSaveBtn = document.getElementById('editSaveBtn');
  const editCancelBtn = document.getElementById('editCancelBtn');
  const examAbsentInput = document.getElementById('editExamAbsent');
  const homeworkInput = document.getElementById('editHomework');
  const quizInput = document.getElementById('editQuiz');
  let currentAttendanceId = null;

  function applyExamAbsentState(isAbsent) {
    if (!homeworkInput || !quizInput) return;
    if (isAbsent) {
      homeworkInput.value = 0;
      quizInput.value = 0;
      homeworkInput.disabled = true;
      quizInput.disabled = true;
      return;
    }
    homeworkInput.disabled = false;
    quizInput.disabled = false;
  }

  if (examAbsentInput) {
    examAbsentInput.addEventListener('change', () => {
      applyExamAbsentState(examAbsentInput.checked);
    });
  }

  editSaveBtn.addEventListener('click', async () => {
    if (!currentAttendanceId) return;
    let homework = parseFloat(homeworkInput ? homeworkInput.value : document.getElementById('editHomework').value) || 0;
    let quiz = parseFloat(quizInput ? quizInput.value : document.getElementById('editQuiz').value) || 0;
    const examAbsent = examAbsentInput ? examAbsentInput.checked : false;
    const examMaxScoreInput = document.getElementById('editExamMax');
    const studentNoteInput = document.getElementById('editStudentNote');
    const sendNoteCheckbox = document.getElementById('sendNoteCheckbox');
    const examMaxScore = parseFloat(examMaxScoreInput ? examMaxScoreInput.value : 10) || 10;
    const studentNote = studentNoteInput ? studentNoteInput.value.trim() : '';
    const sendNote = sendNoteCheckbox ? sendNoteCheckbox.checked : true;

    if (examAbsent) {
      homework = 0;
      quiz = 0;
    }

    try {
      // احصل على بيانات الطالب من السجل
      const attendance = allAttendance.find(a => a.id === currentAttendanceId);
      if (!attendance) {
        alert('لم يتم العثور على السجل');
        return;
      }

      const student = dataManager.getStudentById(attendance.student_id);
      if (!student) {
        alert('لم يتم العثور على بيانات الطالب');
        return;
      }

      // حدث الدرجات مع الدرجة النهائية والملاحظة
      dataManager.updateAttendanceGrades(currentAttendanceId, homework, quiz, examAbsent, examMaxScore, studentNote);

      // إرسال الدرجة عبر الواتساب (خلفية بدون تعطيل الواجهة)
      try {
        const totalScore = (homework + quiz).toFixed(1);
        const targetPhone = student.guardianPhone || student.studentPhone;
        const settings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
        const centerName = settings.centerName || '';
        
        // حساب التقدير بناءً على النسبة المئوية
        const totalMaxScore = examMaxScore * 2;
        const percentage = totalMaxScore > 0 ? (parseFloat(totalScore) / totalMaxScore) * 100 : 0;
        
        let gradeRating = '';
        if (examAbsent) {
          gradeRating = 'غائب عن الامتحان';
        } else if (percentage >= 90) {
          gradeRating = 'ممتاز';
        } else if (percentage >= 70) {
          gradeRating = 'جيد جداً';
        } else if (percentage >= 50) {
          gradeRating = 'جيد';
        } else {
          gradeRating = 'ضعيف';
        }
        
        // بناء الوقت بصيغة 12 ساعة
        const displayTime = attendance.time ? convertTo12Hour(attendance.time) : 'بدون وقت';
        
        // إعداد قيم الدرجات لإرسالها في الرسالة
        const homeworkDisplay = examAbsent ? 'غائب عن الامتحان' : Number(homework).toFixed(1);
        const quizDisplay = examAbsent ? 'غائب عن الامتحان' : Number(quiz).toFixed(1);
        const scoreDisplay = examAbsent ? 'غائب عن الامتحان' : totalScore;
        const maxScoreDisplay = examMaxScore !== 10 ? `/${examMaxScore * 2}` : '/20';
        
        // بناء الرسالة بالصيغة الموحدة
        let message = `السلام عليكم
ولي أمر الطالب: ${student.name || ''}
درجات اليوم:
- الواجب: ${homeworkDisplay}/${examMaxScore}
- الكويز: ${quizDisplay}/${examMaxScore}
- المجموع: ${scoreDisplay}${maxScoreDisplay}
التقدير: ${gradeRating}`;

        // إضافة الملاحظة إذا كانت موجودة وتم تفعيل إرسالها
        if (studentNote && studentNote.trim() !== '' && sendNote) {
          message += `\n📝 ملاحظة: ${studentNote}`;
        }

        message += `
الحضور: ${displayTime}
التاريخ: ${attendance.date || ''}`;
        
        console.log('📱 محاولة إرسال واتساب للطالب:', student.name);
        console.log('📞 الرقم:', targetPhone);
        console.log('📊 الدرجة:', examAbsent ? 'غائب عن الامتحان' : totalScore);
        
        if (targetPhone && window.electronAPI?.whatsapp?.sendGrade) {
          console.log('✅ بدء الإرسال...');
          
          // فحص حالة الواتساب أولاً
          const statusCheck = await window.electronAPI.whatsapp.status();
          const waStatus = statusCheck.status || statusCheck;
          
          if (!waStatus.isReady) {
            console.warn('⚠️ WhatsApp غير متصل. الحالة:', waStatus.state);
            showNotification('⚠️ الدرجة محفوظة لكن WhatsApp غير متصل. افتح صفحة "إدارة واتساب" للربط', 'warning');
          }
          
          window.electronAPI.whatsapp.sendGrade({
            phone: targetPhone,
            studentName: student.name,
            message: message
          }).then(result => {
            console.log('✅ نتيجة الإرسال:', result);
            if (result.success && waStatus.isReady) {
              showNotification('✅ تم إضافة الرسالة لطابور الإرسال', 'success');
            }
          }).catch((err) => {
            console.error('❌ خطأ في إرسال الواتساب:', err?.message || err);
          });
        } else {
          console.warn('⚠️ لا يمكن الإرسال:', {
            hasPhone: !!targetPhone,
            hasAPI: !!window.electronAPI?.whatsapp?.sendGrade
          });
        }
      } catch (err) {
        console.error('❌ خطأ في معالجة الواتساب:', err?.message || err);
      }
      
      alert('✅ تم تحديث الدرجات بنجاح');

      modal.style.display = 'none';
      loadData();
    } catch (error) {
      alert('خطأ في تحديث الدرجات: ' + error.message);
    }
  });

  editCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Grade editing function
  window.editAttendanceGrades = function(attendanceId, studentName, currentHomework, currentQuiz) {
    currentAttendanceId = attendanceId;
    const studentNameDisplay = document.getElementById('editStudentName');
    const attendance = allAttendance.find(a => a.id === attendanceId);
    const isExamAbsent = attendance ? isExamAbsentRow(attendance) : false;
    const examMaxScoreInput = document.getElementById('editExamMax');
    const studentNoteInput = document.getElementById('editStudentNote');
    const sendNoteCheckbox = document.getElementById('sendNoteCheckbox');

    // Set modal title and values
    studentNameDisplay.textContent = `تعديل درجات: ${studentName}`;
    if (homeworkInput) homeworkInput.value = isExamAbsent ? 0 : currentHomework;
    if (quizInput) quizInput.value = isExamAbsent ? 0 : currentQuiz;
    if (examAbsentInput) examAbsentInput.checked = isExamAbsent;
    
    // تحميل الدرجة النهائية المحفوظة أو استخدام 10 كافتراضي
    if (examMaxScoreInput) {
      examMaxScoreInput.value = attendance && attendance.examMaxScore ? attendance.examMaxScore : 10;
    }
    
    // تحميل الملاحظة المحفوظة إن وجدت
    if (studentNoteInput) {
      studentNoteInput.value = attendance && attendance.studentNote ? attendance.studentNote : '';
    }
    
    // تحديد checkbox إرسال الملاحظة (محدد افتراضياً)
    if (sendNoteCheckbox) {
      sendNoteCheckbox.checked = true;
    }
    
    applyExamAbsentState(isExamAbsent);

    // Show modal
    modal.style.display = 'flex';
  };
});