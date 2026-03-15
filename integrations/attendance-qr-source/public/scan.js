// scan.js
// تسجيل الحضور عبر QR مع تصفية حسب الصف

window.addEventListener('DOMContentLoaded', () => {
  console.log('scan.js loaded');
  const resultDiv = document.getElementById('result');
  const manualBtn = document.getElementById('manualAttendanceBtn');
  const manualInput = document.getElementById('manualIdInput');
  const gradeSelect = document.getElementById('gradeSelect');
  const pageTitle = document.getElementById('pageTitle');
  // const html5Qr = new Html5Qrcode('reader'); // معطل مؤقتاً

  console.log('Elements:', resultDiv, manualBtn, manualInput, gradeSelect);

  // الحصول على الصف من URL أو من الاختيار
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

  // تحديث العنوان حسب الصف
  function updateTitle() {
    const grade = getGrade();
    const gradeNames = {
      '3': 'أولى ثانوي',
      '2': 'ثانية ثانوي',
      '1': 'ثالثة ثانوي'
    };
    pageTitle.textContent = `تسجيل الحضور - ${gradeNames[grade]}`;
  }

  // تحديث العنوان عند التحميل
  updateTitle();

  // تحديث العنوان عند تغيير الصف
  if (gradeSelect) {
    gradeSelect.addEventListener('change', updateTitle);
  }

  function showStudentInfo(data, isSuccess = true) {
    const message = isSuccess ?
      `تم تسجيل الحضور للطالب: <b>${data.name}</b><br>رقم الطالب: ${data.studentPhone || ''}<br>رقم ولي الأمر: ${data.guardianPhone || ''}` :
      'الطالب غير موجود!';
    
    if (isSuccess) {
      notify.success(message.replace(/<br>/g, '\n').replace(/<\/?b>/g, ''));
    } else {
      notify.error(message);
    }
    
    // تشغيل الصوت
    const soundId = isSuccess ? 'successSound' : 'errorSound';
    const sound = document.getElementById(soundId);
    if (sound) sound.play().catch(e => console.log('Sound play failed:', e));
  }

  // دالة للحصول على المجموعة المتوقعة بناءً على اليوم الحالي
  function getExpectedGroupForToday() {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const today = days[new Date().getDay()];
    return today;
  }

  function registerAttendance(student, homework = 0, quiz = 0) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5);
    const sessionId = `${date}_${time.split(':')[0]}`;
    
    // تسجيل فوري بدون فحوصات
    try {
      dataManager.recordAttendance(student.id, student.name, date, time, homework, quiz, sessionId)
        .then(() => {
          console.log('✅ تم تسجيل الحضور');
        })
        .catch(err => {
          console.error('خطأ في تسجيل الحضور:', err);
        });
    } catch (error) {
      console.error('خطأ في معالجة الحضور:', error);
    }
    
    showStudentInfo({...student, homework, quiz}, true);
    
    // إعادة focus فوراً
    requestAnimationFrame(() => manualInput.focus());
  }

  function manualRegister() {
    const inputValue = manualInput.value.trim();
    
    if (!inputValue) {
      notify.error('يرجى إدخال ID أو رقم الهاتف');
      const errorSound = document.getElementById('errorSound');
      if (errorSound) errorSound.play().catch(e => console.log('Sound play failed:', e));
      manualInput.focus();
      return;
    }
    
    // Clear immediately before processing
    manualInput.value = '';
    
    try {
      // الحصول على الصف الحالي
      const currentGrade = getGrade();
      
      // الحصول على طلاب الصف المحدد فقط من localStorage بشكل فوري
      const allStudents = dataManager.getStudentsSync(currentGrade);
      console.log(`📋 عدد طلاب الصف ${currentGrade}: ${allStudents.length}`);
      
      if (!Array.isArray(allStudents) || allStudents.length === 0) {
        console.error('خطأ: لا توجد بيانات طلاب لهذا الصف', allStudents);
        notify.error('لا توجد بيانات طلاب لهذا الصف! تأكد من إضافة الطلاب أولاً');
        requestAnimationFrame(() => manualInput.focus());
        return;
      }
      
      const student = allStudents.find(s => 
        String(s.id) === inputValue || 
        String(s.studentPhone) === inputValue || 
        String(s.guardianPhone) === inputValue
      );
      
      if (student) {
        registerAttendance(student, 0, 0);
      } else {
        notify.error('الطالب غير موجود! تأكد من ID أو رقم الهاتف');
        const errorSound = document.getElementById('errorSound');
        if (errorSound) errorSound.play().catch(e => console.log('Sound play failed:', e));
        showStudentInfo(null, false);
        requestAnimationFrame(() => manualInput.focus());
      }
    } catch (error) {
      console.error('Registration error:', error);
      notify.error('حدث خطأ أثناء التسجيل: ' + error.message);
      requestAnimationFrame(() => manualInput.focus());
    }
  }

  manualBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    manualRegister();
  });

  manualInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      manualRegister();
    }
  });

  // Prevent focus loss on any click inside the app
  document.body.addEventListener('click', (e) => {
    if (!manualInput.contains(e.target) && !manualBtn.contains(e.target)) {
      // Delay refocus slightly to allow other operations
      setTimeout(() => manualInput.focus(), 50);
    }
  });

  // focus على input عند التحميل
  manualInput.focus();

  // html5Qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, onScanSuccess);
});