// students.js
// إدارة الطلاب (إضافة/تعديل/حذف/عرض)

// Global variables
let form, idInput, customIdInput, nameInput, studentPhoneInput, guardianPhoneInput;
let centerSelect, groupSelect, gradeSelect, originalGradeInput, table, exportBtn, resultDiv;

// تخزين المراكز والمجموعات
let centersData = [];
let groupsData = [];

// تحميل المراكز من API
async function loadCenters() {
  try {
    const response = await fetch('http://localhost:3000/api/centers');
    centersData = await response.json();
    console.log('✅ Centers loaded:', centersData.length, centersData);
    
    const centerSelect = document.getElementById('studentCenter');
    centerSelect.innerHTML = '<option value="">اختر السنتر</option>';
    
    centersData.forEach(center => {
      const option = document.createElement('option');
      option.value = center.id;
      option.textContent = center.name;
      centerSelect.appendChild(option);
    });
  } catch (error) {
    console.error('❌ Error loading centers:', error);
  }
}

// تحميل جميع المجموعات من API
async function loadAllGroups() {
  try {
    const response = await fetch('http://localhost:3000/api/groups');
    groupsData = await response.json();
    console.log('✅ Groups loaded:', groupsData.length, groupsData);
  } catch (error) {
    console.error('❌ Error loading groups:', error);
  }
}

// دالة تحديث خيارات المجموعة حسب السنتر والصف
function updateGroupOptions() {
  const centerSelect = document.getElementById('studentCenter');
  const groupSelect = document.getElementById('studentGroup');
  const centerId = parseInt(centerSelect.value);
  
  // مسح الخيارات الحالية
  groupSelect.innerHTML = '<option value="">اختر المجموعة</option>';
  
  if (!centerId) {
    return;
  }
  
  // الحصول على الصف الحالي
  const currentGrade = getGrade();
  
  // تصفية المجموعات حسب المركز المختار والصف
  const centerGroups = groupsData.filter(group => {
    // يجب أن تكون المجموعة تابعة للمركز المختار
    if (group.center_id !== centerId) return false;
    
    // إذا كانت المجموعة بدون صف محدد (null)، تظهر في جميع الصفوف
    if (!group.grade || group.grade === '' || group.grade === 'null') return true;
    
    // إذا كان للمجموعة صف محدد، يجب أن يطابق الصف الحالي
    return group.grade === currentGrade;
  });
  
  centerGroups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    groupSelect.appendChild(option);
  });
}

function getGrade() {
  const urlGrade = new URLSearchParams(window.location.search).get('grade');
  if (urlGrade) {
    if (gradeSelect) gradeSelect.value = urlGrade;
    const container = document.getElementById('gradeSelectContainer');
    if (container) container.style.display = 'none';
    return urlGrade;
  }
  return gradeSelect ? gradeSelect.value : '3';
}

// دالة مساعدة للتعديل
function editStudentById(id, name, phone, guardian, center, group, grade) {
  editStudent(id, name, phone, guardian, center, group, grade);
}

function editStudent(id, name, studentPhone, guardianPhone, center, group, grade) {
  idInput.value = id;
  customIdInput.value = id;
  customIdInput.readOnly = true;
  nameInput.value = name;
  studentPhoneInput.value = studentPhone;
  guardianPhoneInput.value = guardianPhone;
  
  // حفظ الصف الأصلي للطالب
  if (originalGradeInput) {
    originalGradeInput.value = grade || getGrade();
  }
  
  // تعيين المركز (إما ID أو بالبحث عن الاسم)
  if (center && !isNaN(center)) {
    centerSelect.value = center;
  } else if (center) {
    const centerObj = centersData.find(c => c.name === center);
    centerSelect.value = centerObj ? centerObj.id : '';
  }
  
  // تحديث المجموعات حسب المركز
  updateGroupOptions();
  
  // تعيين المجموعة
  setTimeout(() => {
    if (group && !isNaN(group)) {
      groupSelect.value = group;
    } else if (group) {
      const groupObj = groupsData.find(g => g.name === group);
      groupSelect.value = groupObj ? groupObj.id : '';
    }
  }, 100);
}

async function deleteStudent(id) {
  if (!confirm('هل أنت متأكد من الحذف؟')) return;
  
  try {
    // تسجيل الحدث
    if (window.logger) {
      const student = await dataManager.getStudentById(id);
      window.logger.warn('DATA_DELETE_STUDENT', 'حذف طالب', {
        id, 
        name: student ? student.name : 'غير معروف'
      });
    }
    
    console.log('Deleting student with ID:', id);
    await dataManager.removeStudent(id);
    console.log('Student deleted successfully');
    notify.success('✅ تم حذف الطالب بنجاح');
    await loadStudents();
  } catch (error) {
    console.error('Delete error:', error);
    if (window.logger) {
      window.logger.error('DATA_DELETE_ERROR', 'فشل حذف الطالب', { 
        id, 
        error: error.message 
      });
    }
    notify.error('فشل حذف الطالب: ' + error.message);
  }
}

function resetForm() {
  idInput.value = '';
  originalGradeInput.value = '';
  customIdInput.value = '';
  customIdInput.readOnly = false;
  nameInput.value = '';
  studentPhoneInput.value = '';
  guardianPhoneInput.value = '';
}

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function exportToExcel(data, filename) {
  // تصدير CSV لضمان العمل في المتصفح بدون أخطاء
  const columns = [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Student Phone', key: 'studentPhone' },
    { header: 'Guardian Phone', key: 'guardianPhone' }
  ];
  const headerLine = columns.map(col => toCsvValue(col.header)).join(',');
  const lines = data.map(row => columns.map(col => toCsvValue(row[col.key])).join(','));
  const csv = `\uFEFF${[headerLine, ...lines].join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace('.xlsx', '.csv');
  a.click();
  URL.revokeObjectURL(url);
}

async function loadStudents() {
  const grade = getGrade();
  if (gradeSelect) gradeSelect.value = grade;
  
  try {
    console.log(`🔄 يتم تحميل الطلاب للصف: ${grade}`);
    
    // تحديث البيانات من server ثم عرض النتائج
    const students = await dataManager.getStudents(grade);
    console.log(`✅ تم تحميل ${students.length} طالب للصف ${grade}:`, students);
    
    // حفظ جميع الطلاب للفلترة
    window.allStudents = students;
    window.filteredStudents = [...students];
    
    // تنظيف الجدول بالكامل (يزيل الـ event listeners تلقائياً)
    table.innerHTML = '';
    
    if (students.length === 0) {
      table.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">لا توجد طلاب في هذا الصف</td></tr>';
      updateFilterStats();
      return;
    }
    
    students.forEach((stu, index) => {
      // الحصول على اسم المركز (إما ID أو اسم)
      let centerName = stu.center;
      if (stu.center && !isNaN(stu.center)) {
        const centerObj = centersData.find(c => c.id == stu.center);
        centerName = centerObj ? centerObj.name : stu.center;
      }
      
      // الحصول على اسم المجموعة (إما ID أو اسم)
      let groupName = stu.group_name;
      if (stu.group_name && !isNaN(stu.group_name)) {
        const groupObj = groupsData.find(g => g.id == stu.group_name);
        groupName = groupObj ? groupObj.name : stu.group_name;
      }
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${stu.id}</td>
        <td>${stu.name}</td>
        <td><span style="background:#667eea; color:white; padding:3px 8px; border-radius:5px; font-size:11px;">${centerName || 'غير محدد'}</span></td>
        <td><span style="background:#28a745; color:white; padding:3px 8px; border-radius:5px; font-size:11px;">${groupName || 'غير محدد'}</span></td>
        <td>${stu.studentPhone || ''}</td>
        <td>${stu.guardianPhone || ''}</td>
        <td>
          <a href="student-profile.html?id=${stu.id}" class="btn-icon" style="background:#667eea;" title="بروفايل الطالب"><i class="fas fa-user"></i></a>
        </td>
        <td>
          <button class="btn-icon btn-edit" data-id="${stu.id}" data-name="${stu.name.replace(/"/g, '&quot;')}" data-student-phone="${stu.studentPhone || ''}" data-guardian-phone="${stu.guardianPhone || ''}" data-center="${stu.center || ''}" data-group="${stu.group_name || ''}" title="تعديل"><i class="fas fa-edit"></i></button>
        </td>
        <td>
          <button class="btn-icon btn-delete" data-id="${stu.id}" title="حذف"><i class="fas fa-trash"></i></button>
        </td>
      `;
      
      // إضافة event listeners
      const editBtn = tr.querySelector('.btn-edit');
      const deleteBtn = tr.querySelector('.btn-delete');
      
      editBtn.addEventListener('click', async () => {
        // جلب بيانات الطالب الكاملة من قاعدة البيانات
        const student = await dataManager.getStudentById(editBtn.dataset.id);
        if (student) {
          editStudent(
            student.id,
            student.name,
            student.studentPhone || '',
            student.guardianPhone || '',
            student.center || '',
            student.group_name || '',
            student.grade || getGrade()
          );
        }
      });
      
      deleteBtn.addEventListener('click', async () => {
        await deleteStudent(deleteBtn.dataset.id);
      });
      
      table.appendChild(tr);
    });
    
    // تحديث إحصائيات الفلترة
    if (typeof updateFilterStats === 'function') {
      updateFilterStats();
    }
    
    // تحميل خيارات الفلاتر
    if (typeof loadFilterOptions === 'function') {
      await loadFilterOptions();
    }
  } catch (err) {
    console.error('❌ Error loading students:', err);
  }
}

function editStudent(id, name, studentPhone, guardianPhone, center, group, grade) {
  idInput.value = id;
  customIdInput.value = id;
  customIdInput.readOnly = true;
  nameInput.value = name;
  studentPhoneInput.value = studentPhone;
  guardianPhoneInput.value = guardianPhone;
  
  // حفظ الصف الأصلي للطالب
  if (originalGradeInput) {
    originalGradeInput.value = grade || getGrade();
  }
  
  // تعيين المركز (إما ID أو بالبحث عن الاسم)
  if (center && !isNaN(center)) {
    centerSelect.value = center;
  } else if (center) {
    const centerObj = centersData.find(c => c.name === center);
    centerSelect.value = centerObj ? centerObj.id : '';
  }
  
  // تحديث المجموعات حسب المركز
  updateGroupOptions();
  
  // تعيين المجموعة
  setTimeout(() => {
    if (group && !isNaN(group)) {
      groupSelect.value = group;
    } else if (group) {
      const groupObj = groupsData.find(g => g.name === group);
      groupSelect.value = groupObj ? groupObj.id : '';
    }
  }, 100);
}

document.addEventListener('DOMContentLoaded', async function() {
  // Initialize global variables
  form = document.getElementById('studentForm');
  idInput = document.getElementById('studentId');
  originalGradeInput = document.getElementById('studentOriginalGrade');
  customIdInput = document.getElementById('studentCustomId');
  nameInput = document.getElementById('studentName');
  studentPhoneInput = document.getElementById('studentPhone');
  guardianPhoneInput = document.getElementById('guardianPhone');
  centerSelect = document.getElementById('studentCenter');
  groupSelect = document.getElementById('studentGroup');
  gradeSelect = document.getElementById('gradeSelect');
  table = document.getElementById('studentsTable').querySelector('tbody');
  exportBtn = document.getElementById('exportStudentsBtn');
  resultDiv = document.getElementById('result');

  // تحميل المراكز والمجموعات من API قبل عرض الجدول
  await loadCenters();
  await loadAllGroups();

  // دالة مساعدة للتعديل
  window.editStudentById = function(id, name, phone, guardian, center, group, grade) {
    editStudent(id, name, phone, guardian, center, group, grade);
  };

  form.onsubmit = async function(e) {
    e.preventDefault();
    const id = idInput.value;
    const customId = customIdInput.value.trim();
    const name = nameInput.value;
    const studentPhone = studentPhoneInput.value;
    const guardianPhone = guardianPhoneInput.value;
    const center = centerSelect.value;
    const group = groupSelect.value;
    
    // التحقق من الحقول المطلوبة
    if (!name || !name.trim()) {
      notify.error('❌ الرجاء إدخال اسم الطالب');
      nameInput.focus();
      return;
    }
    
    // التحقق من المركز والمجموعة
    if (!center) {
      notify.error('❌ الرجاء اختيار السنتر/المركز');
      centerSelect.focus();
      return;
    }
    
    if (!group) {
      notify.error('❌ الرجاء اختيار المجموعة');
      groupSelect.focus();
      return;
    }
    
    // عند التعديل، استخدم الصف الأصلي المحفوظ، وعند الإضافة استخدم الصف الحالي
    const grade = id && originalGradeInput && originalGradeInput.value 
      ? originalGradeInput.value 
      : getGrade();

    console.log('📝 بيانات النموذج:', { id, customId, name, studentPhone, guardianPhone, center, group, grade });

    try {
      if (id) {
        // تعديل
        console.log('🔄 تحديث الطالب:', { id, name });
        await dataManager.updateStudent(id, name, studentPhone, guardianPhone, '', grade, center, group);
        notify.success(`✅ تم تحديث الطالب: ${name}`);
        console.log('✅ تم التحديث بنجاح');
        resetForm();
        await loadStudents();
      } else {
        // إضافة جديد
        const newId = customId || Date.now().toString();
        console.log('➕ إضافة طالب جديد:', { newId, name, grade });
        const student = await dataManager.addStudent(newId, name, studentPhone, guardianPhone, '', grade, center, group);
        console.log('✅ تم إضافة الطالب:', student);
        notify.success(`✅ تم إضافة الطالب: ${student.name}`);
        resetForm();
        await loadStudents();
      }
    } catch (error) {
      console.error('❌ خطأ عند الحفظ:', error);
      notify.error(error.message || 'خطأ في الحفظ');
    }
  };

  window.resetForm = function() {
    idInput.value = '';
    originalGradeInput.value = '';
    customIdInput.value = '';
    customIdInput.readOnly = false;
    nameInput.value = '';
    studentPhoneInput.value = '';
    guardianPhoneInput.value = '';
    centerSelect.value = '';
    groupSelect.value = '';
  };

  exportBtn.onclick = async function() {
    const grade = getGrade();
    const students = await dataManager.getStudents(grade);
    exportToExcel(students, `students_grade_${grade}.xlsx`);
  };

  if (gradeSelect) gradeSelect.onchange = loadStudents;
  await loadStudents();
});

// تحميل خيارات الفلاتر (السناتر والمجموعات)
async function loadFilterOptions() {
  const filterCenter = document.getElementById('filterCenter');
  const filterGroup = document.getElementById('filterGroup');
  
  if (!filterCenter || !filterGroup) return;
  
  try {
    // تحميل السناتر من المتغير العام
    filterCenter.innerHTML = '<option value="">جميع السناتر</option>';
    centersData.forEach(center => {
      const option = document.createElement('option');
      option.value = center.id;
      option.textContent = center.name;
      filterCenter.appendChild(option);
    });
    
    // تحميل المجموعات من المتغير العام
    filterGroup.innerHTML = '<option value="">جميع المجموعات</option>';
    groupsData.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      filterGroup.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading filter options:', error);
  }
}

// دالة الفلترة الرئيسية
function filterStudents() {
  const searchInput = document.getElementById('searchInput');
  const filterCenter = document.getElementById('filterCenter');
  const filterGroup = document.getElementById('filterGroup');
  
  if (!searchInput || !filterCenter || !filterGroup) return;
  if (!window.allStudents) return;
  
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedCenter = filterCenter.value;
  const selectedGroup = filterGroup.value;
  
  // فلترة الطلاب
  window.filteredStudents = window.allStudents.filter(student => {
    // فلترة البحث
    const matchesSearch = !searchTerm || 
      student.name.toLowerCase().includes(searchTerm) ||
      student.id.toString().includes(searchTerm) ||
      (student.studentPhone && student.studentPhone.includes(searchTerm)) ||
      (student.guardianPhone && student.guardianPhone.includes(searchTerm));
    
    // فلترة السنتر
    const matchesCenter = !selectedCenter || 
      student.center == selectedCenter;
    
    // فلترة المجموعة
    const matchesGroup = !selectedGroup || 
      student.group_name == selectedGroup;
    
    return matchesSearch && matchesCenter && matchesGroup;
  });
  
  // إعادة عرض الطلاب المفلترين
  displayFilteredStudents();
  updateFilterStats();
}

// عرض الطلاب المفلترين
function displayFilteredStudents() {
  const table = document.querySelector('#studentsTable tbody');
  if (!table) return;
  if (!window.filteredStudents) return;
  
  table.innerHTML = '';
  
  if (window.filteredStudents.length === 0) {
    table.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#e74c3c;">لا توجد نتائج تطابق البحث</td></tr>';
    return;
  }
  
  window.filteredStudents.forEach((stu) => {
    // الحصول على اسم المركز
    let centerName = stu.center;
    if (stu.center && !isNaN(stu.center)) {
      const centerObj = centersData.find(c => c.id == stu.center);
      centerName = centerObj ? centerObj.name : stu.center;
    }
    
    // الحصول على اسم المجموعة
    let groupName = stu.group_name;
    if (stu.group_name && !isNaN(stu.group_name)) {
      const groupObj = groupsData.find(g => g.id == stu.group_name);
      groupName = groupObj ? groupObj.name : stu.group_name;
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${stu.id}</td>
      <td>${stu.name}</td>
      <td><span style="background:#667eea; color:white; padding:3px 8px; border-radius:5px; font-size:11px;">${centerName || 'غير محدد'}</span></td>
      <td><span style="background:#28a745; color:white; padding:3px 8px; border-radius:5px; font-size:11px;">${groupName || 'غير محدد'}</span></td>
      <td>${stu.studentPhone || ''}</td>
      <td>${stu.guardianPhone || ''}</td>
      <td>
        <a href="student-profile.html?id=${stu.id}" class="btn-icon" style="background:#667eea;" title="بروفايل الطالب"><i class="fas fa-user"></i></a>
      </td>
      <td>
        <button class="btn-icon btn-edit" data-id="${stu.id}" title="تعديل"><i class="fas fa-edit"></i></button>
      </td>
      <td>
        <button class="btn-icon btn-delete" data-id="${stu.id}" title="حذف"><i class="fas fa-trash"></i></button>
      </td>
    `;
    
    // إضافة event listeners
    const editBtn = tr.querySelector('.btn-edit');
    const deleteBtn = tr.querySelector('.btn-delete');
    
    editBtn.addEventListener('click', async () => {
      const student = await dataManager.getStudentById(editBtn.dataset.id);
      if (student) {
        editStudent(
          student.id,
          student.name,
          student.studentPhone || '',
          student.guardianPhone || '',
          student.center || '',
          student.group_name || ''
        );
      }
    });
    
    deleteBtn.addEventListener('click', async () => {
      if (confirm(`هل أنت متأكد من حذف الطالب: ${stu.name}؟`)) {
        try {
          await dataManager.deleteStudent(deleteBtn.dataset.id);
          showNotification('تم حذف الطالب بنجاح', 'success');
          await loadStudents();
        } catch (error) {
          showNotification('خطأ في حذف الطالب: ' + error.message, 'error');
        }
      }
    });
    
    table.appendChild(tr);
  });
}

// تحديث إحصائيات الفلترة
function updateFilterStats() {
  const filterStatsText = document.getElementById('filterStatsText');
  if (!filterStatsText) return;
  
  const total = window.allStudents ? window.allStudents.length : 0;
  const filtered = window.filteredStudents ? window.filteredStudents.length : 0;
  
  if (filtered === total) {
    filterStatsText.textContent = `إجمالي الطلاب: ${total}`;
  } else {
    filterStatsText.innerHTML = `عرض <strong>${filtered}</strong> من أصل <strong>${total}</strong> طالب`;
  }
}

// إعادة تعيين الفلاتر
function clearFilters() {
  const searchInput = document.getElementById('searchInput');
  const filterCenter = document.getElementById('filterCenter');
  const filterGroup = document.getElementById('filterGroup');
  
  if (searchInput) searchInput.value = '';
  if (filterCenter) filterCenter.value = '';
  if (filterGroup) filterGroup.value = '';
  
  if (window.allStudents) {
    window.filteredStudents = [...window.allStudents];
    displayFilteredStudents();
    updateFilterStats();
  }
}

// دالة مساعدة لإضافة سجل حضور اختبار
window.addTestAttendance = async function(studentId) {
  const student = await dataManager.getStudentById(studentId);
  if (!student) {
    alert('الطالب غير موجود');
    return;
  }
  
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  const sessionId = `${date}_${time.split(':')[0]}`;
  
  try {
    await dataManager.recordAttendance(studentId, student.name, date, time, 8.5, 7.5, sessionId);
    alert(`تم إضافة سجل حضور للطالب: ${student.name}`);
  } catch (error) {
    alert('خطأ: ' + error.message);
  }
};
