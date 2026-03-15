// exams.js
// إدارة درجات الامتحانات

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('examForm');
  const studentSelect = document.getElementById('studentSelect');
  const examType = document.getElementById('examType');
  const subject = document.getElementById('subject');
  const score = document.getElementById('score');
  const maxScore = document.getElementById('maxScore');
  const examDate = document.getElementById('examDate');
  const notes = document.getElementById('notes');
  const gradeSelect = document.getElementById('gradeSelect');
  const searchName = document.getElementById('searchName');
  const filterExamType = document.getElementById('filterExamType');
  const filterSubject = document.getElementById('filterSubject');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const table = document.getElementById('examsTable').querySelector('tbody');
  const examsTitle = document.getElementById('examsTitle');

  // تعيين التاريخ الحالي
  examDate.valueAsDate = new Date();

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
    examsTitle.textContent = `إدخال درجات الامتحانات - ${gradeNames[grade]}`;
  }

  function loadStudents() {
    const grade = getGrade();
    const students = dataManager.getStudents(grade);
    studentSelect.innerHTML = '<option value="">-- اختر طالب --</option>';
    students.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.name} (${student.id})`;
      studentSelect.appendChild(option);
    });
  }

  function getGradeText(percentage) {
    if (percentage >= 85) return { text: 'ممتاز', color: '#28a745' };
    if (percentage >= 75) return { text: 'جيد جداً', color: '#17a2b8' };
    if (percentage >= 65) return { text: 'جيد', color: '#ffc107' };
    if (percentage >= 50) return { text: 'مقبول', color: '#fd7e14' };
    return { text: 'ضعيف', color: '#dc3545' };
  }

  function renderTable() {
    const grade = getGrade();
    const nameFilter = searchName.value.trim().toLowerCase();
    const examTypeFilter = filterExamType.value;
    const subjectFilter = filterSubject.value;

    let exams = dataManager.getAllExams(grade);

    // الفلترة
    exams = exams.filter(exam => {
      const matchName = nameFilter ? exam.student_name.toLowerCase().includes(nameFilter) : true;
      const matchExamType = examTypeFilter !== 'all' ? exam.exam_type === examTypeFilter : true;
      const matchSubject = subjectFilter !== 'all' ? exam.subject === subjectFilter : true;
      return matchName && matchExamType && matchSubject;
    });

    // الترتيب حسب التاريخ (الأحدث أولاً)
    exams.sort((a, b) => b.date.localeCompare(a.date));

    table.innerHTML = '';
    exams.forEach((exam, index) => {
      const percentage = ((exam.score / exam.max_score) * 100).toFixed(1);
      const gradeInfo = getGradeText(percentage);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td><b>${exam.student_name}</b></td>
        <td><span style="background:#667eea; color:white; padding:4px 10px; border-radius:5px;">${exam.exam_type}</span></td>
        <td><span style="background:#6c757d; color:white; padding:4px 10px; border-radius:5px;">${exam.subject}</span></td>
        <td style="font-size:18px; font-weight:bold; color:#2c3e50;">${exam.score}/${exam.max_score}</td>
        <td><span style="background:${gradeInfo.color}; color:white; padding:5px 10px; border-radius:5px; font-weight:bold;">${percentage}%</span></td>
        <td><span style="color:${gradeInfo.color}; font-weight:bold;">${gradeInfo.text}</span></td>
        <td>${exam.date}</td>
        <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis;">${exam.notes || '-'}</td>
        <td><button class="main-btn" style="background:#ffc107; padding:5px 10px;" onclick="editExam(${exam.id})"><i class="fas fa-edit"></i></button></td>
        <td><button class="main-btn" style="background:#dc3545; padding:5px 10px;" onclick="deleteExam(${exam.id})"><i class="fas fa-trash"></i></button></td>
      `;
      table.appendChild(row);
    });
  }

  // إضافة درجة جديدة
  form.onsubmit = async function(e) {
    e.preventDefault();
    
    const studentId = studentSelect.value;
    if (!studentId) {
      alert('يرجى اختيار طالب');
      return;
    }

    const student = dataManager.getStudentById(studentId);
    const grade = getGrade();

    try {
      dataManager.addExam(
        studentId,
        student.name,
        examType.value,
        subject.value,
        score.value,
        maxScore.value,
        examDate.value,
        notes.value,
        grade
      );

      alert('✅ تم حفظ الدرجة بنجاح');
      
      form.reset();
      examDate.valueAsDate = new Date();
      renderTable();
    } catch (error) {
      alert('❌ حدث خطأ: ' + error.message);
    }
  };

  // تعديل الدرجة
  window.editExam = function(examId) {
    const exams = dataManager.getAllExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    const modal = document.getElementById('editModal');
    const editExamInfo = document.getElementById('editExamInfo');
    const editScore = document.getElementById('editScore');
    const editNotes = document.getElementById('editNotes');
    const editSaveBtn = document.getElementById('editSaveBtn');
    const editCancelBtn = document.getElementById('editCancelBtn');

    editExamInfo.textContent = `${exam.student_name} - ${exam.exam_type} - ${exam.subject}`;
    editScore.value = exam.score;
    editScore.max = exam.max_score;
    editNotes.value = exam.notes || '';

    modal.style.display = 'block';

    editSaveBtn.onclick = function() {
      const newScore = editScore.value;
      const newNotes = editNotes.value;

      if (!newScore || newScore < 0 || newScore > exam.max_score) {
        alert('يرجى إدخال درجة صحيحة');
        return;
      }

      dataManager.updateExam(examId, newScore, newNotes);
      alert('✅ تم تحديث الدرجة بنجاح');
      modal.style.display = 'none';
      renderTable();
    };

    editCancelBtn.onclick = function() {
      modal.style.display = 'none';
    };

    modal.onclick = function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    };
  };

  // حذف الدرجة
  window.deleteExam = function(examId) {
    if (!confirm('هل أنت متأكد من حذف هذه الدرجة؟')) return;
    
    dataManager.removeExam(examId);
    alert('✅ تم حذف الدرجة');
    renderTable();
  };

  // Event listeners
  gradeSelect.onchange = function() {
    setTitle();
    loadStudents();
    renderTable();
  };
  searchName.oninput = renderTable;
  filterExamType.onchange = renderTable;
  filterSubject.onchange = renderTable;

  clearFiltersBtn.onclick = function() {
    searchName.value = '';
    filterExamType.value = 'all';
    filterSubject.value = 'all';
    renderTable();
  };

  setTitle();
  loadStudents();
  renderTable();
});
