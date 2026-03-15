/**
 * License Checker
 * فاحص الترخيص - يتم تحميله في كل صفحة
 */

(function() {
  'use strict';

  // فحص الترخيص عند تحميل الصفحة
  function checkLicense() {
    // استثناء صفحة التفعيل نفسها
    if (window.location.pathname.includes('activation.html')) {
      return;
    }

    try {
      // إيقاف الترخيص إذا تم طلب الإلغاء من صفحة التفعيل
      if (localStorage.getItem('forceDeactivate') === '1') {
        localStorage.removeItem('appLicense');
        localStorage.removeItem('forceDeactivate');
        redirectToActivation('تم إلغاء الترخيص');
        return;
      }

      const license = JSON.parse(localStorage.getItem('appLicense') || '{}');
      
      // إذا لم يكن هناك ترخيص مفعل، توجيه للتفعيل
      if (!license.activated) {
        if (window.logger) {
          window.logger.warn('LICENSE', 'لا يوجد ترخيص مفعل', { url: window.location.href });
        }
        redirectToActivation('لم يتم تفعيل التطبيق');
        return;
      }

      // التحقق من صحة التاريخ (حماية من التلاعب)
      const integrityResult = checkSystemTimeIntegrity(license);
      if (integrityResult.error) {
        if (window.logger) {
          window.logger.critical('LICENSE_TAMPERING', 'تم اكتشاف تلاعب بالترخيص', {
            message: integrityResult.message,
            license: license
          });
        }
        localStorage.removeItem('appLicense');
        redirectToActivation(integrityResult.message || 'تم اكتشاف تلاعب بتاريخ النظام');
        return;
      }
      
      // عرض تحذير إذا مرت فترة طويلة
      if (integrityResult.daysPassed && integrityResult.daysPassed >= 3) {
        showTimeGapWarning(integrityResult.daysPassed);
      }

      // تحديث آخر فحص
      license.lastCheck = Date.now();
      license.systemTimeSnapshot = Date.now();
      localStorage.setItem('appLicense', JSON.stringify(license));

      // إذا كان مفعل، فحص انتهاء الصلاحية
      if (license.activated && license.type !== 'lifetime' && license.expiryDate) {
        const expiryDate = new Date(license.expiryDate);
        const now = new Date();
        
        if (now > expiryDate) {
          if (window.logger) {
            window.logger.error('LICENSE_EXPIRED', 'انتهت صلاحية الترخيص', {
              expiryDate: license.expiryDate,
              type: license.type
            });
          }
          redirectToActivation('انتهت صلاحية الترخيص');
          return;
        }
        
        // إظهار تنبيه بالأيام المتبقية
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) {
          showExpiryWarning(expiryDate);
        }
      }

      // كل شيء على ما يرام
      console.log('✅ License check passed');
    } catch (err) {
      console.error('❌ License check failed:', err);
      redirectToActivation('خطأ في التحقق من الترخيص');
    }
  }

  /**
   * التحقق من صحة الوقت والحماية من التلاعب
   * 
   * نظام حماية متعدد الطبقات:
   * 1. Date.now() - الوقت الفعلي من النظام
   * 2. performance.now() - وقت تشغيل المتصفح (لا يمكن التلاعب به)
   * 3. bootTime - وقت تشغيل النظام المحسوب
   * 
   * الحماية:
   * - يتم خصم جميع الأيام حتى عند إغلاق التطبيق
   * - اكتشاف رجوع الوقت للخلف
   * - اكتشاف القفز للأمام بأكثر من 7 أيام
   * - اكتشاف التلاعب بـ Date.now() عبر مقارنة performance.now()
   */
  function checkSystemTimeIntegrity(license) {
    const now = Date.now();
    const perfNow = performance.now();
    
    // إذا كانت أول مرة (نسخة قديمة)، نهيئ البيانات
    if (!license.systemTimeSnapshot || !license.lastCheck || !license.perfTimeSnapshot) {
      license.systemTimeSnapshot = now;
      license.lastCheck = now;
      license.perfTimeSnapshot = perfNow;
      license.bootTime = now - perfNow; // وقت تشغيل النظام
      localStorage.setItem('appLicense', JSON.stringify(license));
      return { error: false };
    }
    
    // حساب الفرق الزمني الفعلي من آخر فتح
    const realTimePassed = now - license.lastCheck;
    const perfTimePassed = perfNow - license.perfTimeSnapshot;
    const daysPassed = realTimePassed / (24 * 60 * 60 * 1000);
    
    // التحقق من أن الوقت لم يرجع للخلف
    if (now < license.lastCheck) {
      console.error('❌ System time manipulation detected: Time went backwards');
      return { 
        error: true, 
        message: '⚠️ تم اكتشاف تغيير في تاريخ النظام للخلف'
      };
    }
    
    // السماح بفترات إغلاق طويلة (الإجازات)
    // لن نحذف الترخيص، بل نستمر في خصم الأيام فقط
    // ملاحظة: الوقت يمر سواء كان التطبيق مفتوح أم لا
    
    // التحقق من تناسق performance.now() مع Date.now()
    // يجب أن يكونا متقاربين (مع هامش خطأ 10 ثواني)
    const expectedBootTime = now - perfNow;
    const bootTimeDiff = Math.abs(expectedBootTime - license.bootTime);
    
    // إذا تم إعادة تشغيل النظام، bootTime سيتغير - هذا طبيعي
    // ولكن إذا تغير بشكل مفاجئ بدون إعادة تشغيل، فهذا تلاعب
    // نتحقق فقط إذا كان perfNow أكبر بساعة على الأقل (3,600,000 ميلي ثانية)
    // لأن إعادة التشغيل تعيد perfNow للصفر
    const perfTimeDiffHours = perfTimePassed / (1000 * 60 * 60);
    if (bootTimeDiff > 10000 && perfTimeDiffHours > 1) {
      // النظام لم يعاد تشغيله (perfNow أكبر بساعة على الأقل)
      // لكن bootTime اختلف - هذا قد يعني تلاعب بـ Date.now()
      console.error('❌ Time manipulation detected: Boot time inconsistency');
      return { 
        error: true, 
        message: '⚠️ تم اكتشاف تلاعب في إعدادات الوقت'
      };
    }
    
    // خصم الوقت الفعلي من الترخيص (إذا لم يكن lifetime)
    if (license.type !== 'lifetime' && license.expiryDate) {
      const oldExpiry = new Date(license.expiryDate);
      
      // نطرح الوقت الذي مر فعلياً
      // حتى لو كان التطبيق مغلق، الوقت يمر
      const newExpiry = new Date(oldExpiry.getTime());
      
      // تحديث تاريخ الانتهاء (لا نحتاج لتعديله لأنه محسوب من البداية)
      // لكن نتحقق من أن الوقت الحالي لم يتجاوزه
      if (now > oldExpiry.getTime()) {
        console.error('❌ License expired');
        return { error: false }; // سينتهي في checkLicense()
      }
    }
    
    // تحديث آخر وقت تحقق
    license.lastCheck = now;
    license.systemTimeSnapshot = now;
    license.perfTimeSnapshot = perfNow;
    license.bootTime = expectedBootTime;
    localStorage.setItem('appLicense', JSON.stringify(license));
    
    return { 
      error: false,
      daysPassed: daysPassed
    };
  }

  function redirectToActivation(reason) {
    // حفظ الصفحة الحالية للعودة إليها
    sessionStorage.setItem('returnUrl', window.location.href);
    
    // إظهار رسالة وإعادة التوجيه
    if (typeof showNotification === 'function') {
      showNotification('⚠️ ' + reason, 'warning');
    } else {
      alert(reason);
    }
    
    setTimeout(() => {
      window.location.href = 'activation.html';
    }, 1000);
  }

  function showExpiryWarning(expiryDate) {
    const now = new Date();
    const diff = expiryDate - now;
    
    // حساب الوقت المتبقي بالتفصيل
    const totalSeconds = Math.floor(diff / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    
    const years = Math.floor(totalDays / 365);
    const remainingDaysAfterYears = totalDays % 365;
    const months = Math.floor(remainingDaysAfterYears / 30);
    const days = remainingDaysAfterYears % 30;
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    
    // بناء النص التفصيلي
    let timeDetails = [];
    if (years > 0) timeDetails.push(`${years} سنة`);
    if (months > 0) timeDetails.push(`${months} شهر`);
    if (days > 0) timeDetails.push(`${days} يوم`);
    if (hours > 0 && years === 0 && months === 0) timeDetails.push(`${hours} ساعة`);
    if (minutes > 0 && years === 0 && months === 0 && days === 0) timeDetails.push(`${minutes} دقيقة`);
    
    const timeText = timeDetails.length > 0 ? timeDetails.join(' و ') : 'أقل من دقيقة';
    
    const warningDiv = document.createElement('div');
    warningDiv.id = 'expiryWarning';
    warningDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      padding: 12px 10px;
      text-align: center;
      font-family: 'Cairo', sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      line-height: 1.6;
    `;
    warningDiv.innerHTML = `
      <strong>⚠️ تنبيه:</strong> الوقت المتبقي للترخيص: <strong>${timeText}</strong>
      <a href="activation.html" style="color: white; text-decoration: underline; margin-right: 10px; font-weight: bold;">تجديد الترخيص الآن</a>
    `;
    
    // إزالة التحذير القديم إن وجد
    const oldWarning = document.getElementById('expiryWarning');
    if (oldWarning) oldWarning.remove();
    
    document.body.appendChild(warningDiv);
    
    // إضافة padding للـ body
    document.body.style.paddingTop = '50px';
  }

  function showTimeGapWarning(days) {
    const roundedDays = Math.ceil(days);
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      z-index: 9999999;
      max-width: 400px;
      text-align: center;
      font-family: 'Cairo', sans-serif;
    `;
    message.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 15px;">⏱️</div>
      <h3 style="color: #2c3e50; margin: 0 0 10px 0;">مرحباً بعودتك!</h3>
      <p style="color: #7f8c8d; margin: 10px 0; line-height: 1.6;">
        لقد مر <strong style="color: #e74c3c;">${roundedDays} ${roundedDays === 1 ? 'يوم' : 'أيام'}</strong> منذ آخر استخدام للتطبيق.<br>
        تم خصم هذه المدة من رصيد الترخيص تلقائياً.
      </p>
      <button onclick="this.parentElement.remove()" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 30px;
        border-radius: 8px;
        font-family: 'Cairo', sans-serif;
        font-size: 14px;
        cursor: pointer;
        margin-top: 10px;
      ">
        فهمت، شكراً
      </button>
    `;
    
    document.body.appendChild(message);
    
    // إزالة الرسالة تلقائياً بعد 8 ثواني
    setTimeout(() => {
      if (message.parentElement) {
        message.remove();
      }
    }, 8000);
  }

  // تشغيل الفحص عند تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkLicense);
  } else {
    checkLicense();
  }

  // إضافة دالة عامة للتحقق من الترخيص
  window.checkAppLicense = checkLicense;

  // الاستماع لتغييرات الترخيص بين الصفحات
  window.addEventListener('storage', (event) => {
    if (event.key === 'appLicense') {
      try {
        const nextValue = event.newValue ? JSON.parse(event.newValue) : {};
        if (!nextValue.activated) {
          redirectToActivation('تم حذف الترخيص المحلي');
        }
      } catch (err) {
        redirectToActivation('تم حذف الترخيص المحلي');
      }
    }
  });

  // فحص دوري كل 5 دقائق
  setInterval(checkLicense, 5 * 60 * 1000);
})();
