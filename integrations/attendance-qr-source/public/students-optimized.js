/**
 * ✅ OPTIMIZED students.js - محسّن للأداء والأمان
 * مع معالجة أخطاء أفضل و Validation و منع XSS
 */

// ====== CACHE SYSTEM ======
const studentsCache = {
  data: [],
  lastUpdate: null,
  isLoading: false,
  
  async get(forceRefresh = false) {
    const now = Date.now();
    // Cache لمدة دقيقة واحدة
    if (!forceRefresh && this.data.length > 0 && now - this.lastUpdate < 60000) {
      console.log('📦 استخدام Cache للطلاب');
      return this.data;
    }
    return this.refresh();
  },
  
  async refresh() {
    if (this.isLoading) return this.data;
    this.isLoading = true;
    
    try {
      if (window.electronAPI && typeof window.electronAPI.getAllStudents === 'function') {
        this.data = await Promise.race([
          window.electronAPI.getAllStudents(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        this.lastUpdate = Date.now();
        console.log('✅ تم تحديث Cache من الـ DB');
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث Cache:', error);
      if (error.message === 'Timeout') {
        alert('⏱️ انتهت مهلة انتظار تحميل الطلاب. تحقق من الاتصال.');
      }
    } finally {
      this.isLoading = false;
    }
    
    return this.data;
  },
  
  invalidate() {
    this.data = [];
    this.lastUpdate = null;
  }
};

// ====== VALIDATION SYSTEM ======
const validator = {
  rules: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[\u0600-\u06FF\s\-\.]+$/,  // عربي فقط مع بعض الرموز
      message: 'الاسم يجب أن يكون عربي (2-100 حرف)'
    },
    phone: {
      required: false,
      pattern: /^(\d{10,15})?$/,
      message: 'رقم الهاتف يجب أن يكون 10-15 رقم'
    },
    guardian_phone: {
      required: true,
      pattern: /^\d{10,15}$/,
      message: 'رقم ولي الأمر مطلوب (10-15 رقم)'
    }
  },
  
  validate(field, value) {
    if (!this.rules[field]) return { valid: true };
    
    const rule = this.rules[field];
    
    if (rule.required && !value) {
      return { valid: false, message: `${field} مطلوب` };
    }
    
    if (value && rule.minLength && value.length < rule.minLength) {
      return { valid: false, message: `${field} يجب أن يكون ${rule.minLength} حروف على الأقل` };
    }
    
    if (value && rule.maxLength && value.length > rule.maxLength) {
      return { valid: false, message: `${field} لا يمكن أن يتجاوز ${rule.maxLength} حرف` };
    }
    
    if (value && rule.pattern && !rule.pattern.test(value)) {
      return { valid: false, message: rule.message };
    }
    
    return { valid: true };
  },
  
  validateForm(formData) {
    const errors = {};
    
    for (const [field, value] of Object.entries(formData)) {
      const result = this.validate(field, value);
      if (!result.valid) {
        errors[field] = result.message;
      }
    }
    
    return { 
      valid: Object.keys(errors).length === 0, 
      errors 
    };
  }
};

// ====== SAFE DOM MANIPULATION ======
const SafeDOM = {
  setText(element, text) {
    if (element) element.textContent = text;  // آمن من XSS
  },
  
  setAttr(element, attr, value) {
    if (element) {
      if (attr.startsWith('on')) {
        console.warn('⚠️ محاولة تعيين event handler مباشرة - غير آمن');
        return;
      }
      element.setAttribute(attr, value);
    }
  },
  
  createTableRow(student, callbacks) {
    const tr = document.createElement('tr');
    tr.dataset.studentId = student.id;
    
    const cells = [
      { text: student.id, class: 'id-cell' },
      { text: student.name, class: 'name-cell' },
      { text: student.center || 'الشروق', class: 'center-cell badge badge-primary' },
      { text: student.group_name || student.group || 'الاثنين', class: 'group-cell badge badge-success' },
      { text: student.phone || '--', class: 'phone-cell' },
      { text: student.parent_phone || '--', class: 'parent-phone-cell' }
    ];
    
    // إضافة الخلايا النصية بشكل آمن
    cells.forEach(cell => {
      const td = document.createElement('td');
      td.className = cell.class;
      SafeDOM.setText(td, cell.text);
      tr.appendChild(td);
    });
    
    // زر الملف الشخصي
    const profileBtn = document.createElement('button');
    profileBtn.type = 'button';
    profileBtn.className = 'btn-icon';
    profileBtn.style.background = '#667eea';
    profileBtn.title = 'بروفايل الطالب';
    profileBtn.innerHTML = '<i class="fas fa-user"></i>';
    profileBtn.addEventListener('click', () => {
      window.location.href = `student-profile.html?id=${student.id}`;
    });
    const profileTd = document.createElement('td');
    profileTd.appendChild(profileBtn);
    tr.appendChild(profileTd);
    
    // زر التعديل
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-icon btn-edit';
    editBtn.title = 'تعديل';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.addEventListener('click', () => callbacks.edit(student));
    const editTd = document.createElement('td');
    editTd.appendChild(editBtn);
    tr.appendChild(editTd);
    
    // زر الحذف
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-icon btn-delete';
    deleteBtn.title = 'حذف';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener('click', () => callbacks.delete(student.id));
    const deleteTd = document.createElement('td');
    deleteTd.appendChild(deleteBtn);
    tr.appendChild(deleteTd);
    
    return tr;
  }
};

// ====== UI UTILITIES ======
const UIHelpers = {
  setLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.style.opacity = isLoading ? '0.6' : '1';
    button.textContent = isLoading ? '⏳ جاري المعالجة...' : button.dataset.originalText || 'حفظ';
  },
  
  showFormErrors(errors) {
    // إزالة الأخطاء السابقة
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    
    // عرض الأخطاء الجديدة
    for (const [field, message] of Object.entries(errors)) {
      const input = document.getElementById(`student${field.charAt(0).toUpperCase() + field.slice(1)}`);
      if (input) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'color: #dc3545; font-size: 12px; margin-top: 5px;';
        SafeDOM.setText(errorDiv, message);
        input.parentElement.appendChild(errorDiv);
      }
    }
  },
  
  resetFormErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.remove());
  }
};

// ====== MAIN FUNCTIONS ======

function editStudentRow(student) {
  console.log('✏️ تعديل الطالب:', student.id);
  
  document.getElementById('studentId').value = student.id;
  document.getElementById('studentCustomId').value = student.id;
  document.getElementById('studentCustomId').readOnly = true;
  document.getElementById('studentName').value = student.name || '';
  document.getElementById('studentPhone').value = student.phone || '';
  document.getElementById('guardianPhone').value = student.parent_phone || '';
  
  UIHelpers.resetFormErrors();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteStudentRow(studentId) {
  if (!studentId) return;
  
  const confirmed = confirm('هل أنت متأكد من حذف هذا الطالب؟\nلا يمكن التراجع عن هذه العملية.');
  if (!confirmed) return;
  
  try {
    if (!window.electronAPI || typeof window.electronAPI.removeStudent !== 'function') {
      notify.error('❌ API غير متاح');
      return;
    }
    
    const res = await window.electronAPI.removeStudent(Number(studentId));
    
    if (res && res.success) {
      notify.success('✅ تم حذف الطالب بنجاح');
      studentsCache.invalidate();  // تحديث Cache
      await loadStudents();  // إعادة تحميل الجدول
    } else {
      notify.error(`❌ ${(res && res.error) || 'حدث خطأ'}`);
    }
  } catch (error) {
    console.error('❌ خطأ في الحذف:', error);
    notify.error(`❌ خطأ: ${error.message}`);
  }
}

async function loadStudents() {
  try {
    console.log('📥 جاري تحميل الطلاب...');
    const students = await studentsCache.get();
    
    const table = document.getElementById('studentsTable').querySelector('tbody');
    if (!table) {
      console.error('❌ جدول الطلاب غير موجود');
      return;
    }
    
    table.innerHTML = '';  // تنظيف الجدول
    
    if (!students || students.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 9;
      SafeDOM.setText(td, 'لا توجد طلاب في النظام');
      td.style.cssText = 'text-align: center; padding: 20px; color: #999;';
      tr.appendChild(td);
      table.appendChild(tr);
      return;
    }
    
    // إضافة الصفوف بشكل آمن
    students.forEach(student => {
      const row = SafeDOM.createTableRow(student, {
        edit: (s) => editStudentRow(s),
        delete: (id) => deleteStudentRow(id)
      });
      table.appendChild(row);
    });
    
    console.log(`✅ تم تحميل ${students.length} طالب`);
  } catch (error) {
    console.error('❌ خطأ في تحميل الطلاب:', error);
    notify.error(`❌ خطأ في تحميل البيانات: ${error.message}`);
  }
}

function updateGroupOptions() {
  const centerSelect = document.getElementById('studentCenter');
  const groupSelect = document.getElementById('studentGroup');
  const center = centerSelect.value;
  
  groupSelect.innerHTML = '';
  
  if (center === 'الشروق') {
    groupSelect.innerHTML = `
      <option value="الاثنين">الاثنين</option>
      <option value="الأربعاء">الأربعاء</option>
    `;
  } else if (center === 'بدر') {
    groupSelect.innerHTML = `
      <option value="الأحد">الأحد</option>
      <option value="الثلاثاء">الثلاثاء</option>
    `;
  }
}

// ====== INITIALIZATION ======

document.addEventListener('DOMContentLoaded', async function() {
  const form = document.getElementById('studentForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  if (submitBtn) {
    submitBtn.dataset.originalText = submitBtn.textContent;
  }
  
  updateGroupOptions();
  document.getElementById('studentCenter')?.addEventListener('change', updateGroupOptions);
  
  // تحميل الطلاب عند فتح الصفحة
  await loadStudents();
  
  // معالجة إرسال النموذج
  form.onsubmit = async function(e) {
    e.preventDefault();
    
    // جمع البيانات
    const formData = {
      name: document.getElementById('studentName').value.trim(),
      phone: document.getElementById('studentPhone').value.trim(),
      guardian_phone: document.getElementById('guardianPhone').value.trim()
    };
    
    // التحقق من الصحة
    UIHelpers.resetFormErrors();
    const validation = validator.validateForm(formData);
    
    if (!validation.valid) {
      UIHelpers.showFormErrors(validation.errors);
      notify.error('❌ يوجد أخطاء في البيانات المدخلة');
      return;
    }
    
    // تعطيل الزر أثناء المعالجة
    UIHelpers.setLoading(submitBtn, true);
    
    try {
      const id = document.getElementById('studentId').value;
      
      if (id) {
        // تعديل
        const res = await window.electronAPI.updateStudent({
          id: Number(id),
          name: formData.name,
          phone: formData.phone,
          parent_phone: formData.guardian_phone,
          school: '',
          code: document.getElementById('studentCustomId').value,
          group_id: null,
          notes: '',
          photo: ''
        });
        
        if (res && res.success) {
          notify.success('✅ تم تحديث الطالب بنجاح');
          form.reset();
          studentsCache.invalidate();
          await loadStudents();
        } else {
          notify.error(`❌ ${(res && res.error) || 'فشل التحديث'}`);
        }
      } else {
        // إضافة
        const res = await window.electronAPI.addStudent({
          name: formData.name,
          studentPhone: formData.phone,
          guardianPhone: formData.guardian_phone,
          photo: '',
          qr_code: null
        });
        
        if (res && res.success) {
          notify.success('✅ تم إضافة الطالب بنجاح');
          form.reset();
          studentsCache.invalidate();
          await loadStudents();
        } else {
          notify.error(`❌ ${(res && res.error) || 'فشلت الإضافة'}`);
        }
      }
    } catch (error) {
      console.error('❌ خطأ:', error);
      notify.error(`❌ خطأ في المعالجة: ${error.message}`);
    } finally {
      UIHelpers.setLoading(submitBtn, false);
    }
  };
});

console.log('✅ students.js محسّن تم تحميله');
