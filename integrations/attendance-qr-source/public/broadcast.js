// Broadcast Messages Script
let selectedRecipients = new Set();
let studentsData = [];
let recipientCounts = { students: 0, parents: 0, both: 0 };
let selectedGrade = 'all';
let selectedGroup = 'all';
let selectedStudentIds = new Set(); // IDs of students selected for sending

function normalizeStudent(raw) {
  return {
    ...raw,
    name: raw.name || '',
    phone: raw.phone || raw.studentPhone || '',
    parentPhone: raw.parentPhone || raw.guardianPhone || raw.parent_phone || '',
    group_name: raw.group_name || raw.groupName || '',
    grade: raw.grade ?? raw.group_grade ?? raw.groupGrade ?? raw.group_id ?? raw.groupId ?? raw.grade
  };
}

// Message Templates
const templates = {
  welcome: `السلام عليكم ورحمة الله وبركاته 🌟

نرحب بكم في العام الدراسي الجديد، ونتمنى لكم عاماً مليئاً بالنجاح والتفوق.

نحن سعداء بانضمامكم إلينا، ونتطلع إلى رحلة تعليمية ممتعة ومثمرة معاً.

مع أطيب التمنيات،
أ/محمد الربيعي 📚`,

  exam: `السلام عليكم ورحمة الله 📝

نود إعلامكم بموعد الامتحان القادم:
📅 التاريخ: [أدخل التاريخ]
⏰ الوقت: [أدخل الوقت]
📍 المكان: [أدخل المكان]
📚 المادة: [أدخل المادة]

يرجى الاستعداد الجيد والحضور في الموعد المحدد.

بالتوفيق للجميع! 🍀
أ/محمد الربيعي`,

  homework: `السلام عليكم ورحمة الله 📚

تذكير بالواجب المنزلي المطلوب:

📖 المادة: [أدخل المادة]
📝 الواجب: [اكتب تفاصيل الواجب]
📅 موعد التسليم: [أدخل التاريخ]

يرجى إنجاز الواجب وتسليمه في الموعد المحدد.

مع خالص التقدير،
أ/محمد الربيعي ✨`,

  absence: `السلام عليكم ورحمة الله ⚠️

نود إعلامكم بأن الطالب/ة [اسم الطالب] تغيب/ت اليوم عن الحصة.

📅 التاريخ: [التاريخ]
🕐 الحصة: [رقم الحصة]

في حال كان الغياب بعذر، يرجى إبلاغنا.

شكراً لتعاونكم،
أ/محمد الربيعي`,

  achievement: `السلام عليكم ورحمة الله 🏆

تهانينا الحارة! 🎉

يسعدنا أن نبلغكم بأن الطالب/ة [اسم الطالب] قد حقق/ت أداءً متميزاً:

⭐ [اذكر الإنجاز]
📊 الدرجة: [الدرجة]

نفخر بهذا الإنجاز ونتمنى المزيد من التفوق!

مع التقدير،
أ/محمد الربيعي 🌟`,

  meeting: `السلام عليكم ورحمة الله 📅

ندعوكم لحضور اجتماع أولياء الأمور:

📍 المكان: [مكان الاجتماع]
📅 التاريخ: [تاريخ الاجتماع]
⏰ الوقت: [وقت الاجتماع]
📋 جدول الأعمال: [الموضوعات]

حضوركم مهم لنا. نأمل تأكيد الحضور.

بانتظاركم،
أ/محمد الربيعي`,

  holiday: `السلام عليكم ورحمة الله 🏖️

نود إعلامكم بموعد الإجازة القادمة:

📅 من تاريخ: [تاريخ البداية]
📅 إلى تاريخ: [تاريخ النهاية]
🔄 العودة: [تاريخ العودة]

نتمنى لكم إجازة سعيدة وممتعة! 🌴

أ/محمد الربيعي`,

  custom: ``
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  if (window.portConfig && typeof window.portConfig.initialize === 'function') {
    await window.portConfig.initialize();
  }
  await loadStudents();
  populateGroupFilter();
  updateCounts();
  renderStudentsList();
  checkWhatsAppStatus();
  setInterval(checkWhatsAppStatus, 5000);
  
  // Add message text listener
  const messageText = document.getElementById('messageText');
  messageText.addEventListener('input', () => {
    updateCharCount();
    updateSendButton();
  });
});

// Load students data
async function loadStudents() {
  try {
    const merged = new Map();

    if (typeof dataManager !== 'undefined' && dataManager.getAllStudents) {
      const managerStudents = await dataManager.getAllStudents();
      (managerStudents || []).forEach(student => {
        const normalized = normalizeStudent(student);
        const key = `${normalized.id || ''}|${normalized.grade || ''}`;
        merged.set(key, normalized);
      });
    }

    if (window.electronAPI && window.electronAPI.getAllStudents) {
      const apiStudents = await window.electronAPI.getAllStudents();
      (apiStudents || []).forEach(student => {
        const normalized = normalizeStudent(student);
        const key = `${normalized.id || ''}|${normalized.grade || ''}`;
        merged.set(key, normalized);
      });
    }

    const localStudents = JSON.parse(localStorage.getItem('students') || '[]');
    (localStudents || []).forEach(student => {
      const normalized = normalizeStudent(student);
      const key = `${normalized.id || ''}|${normalized.grade || ''}`;
      merged.set(key, normalized);
    });

    const response = window.portConfig
      ? await window.portConfig.fetch('/api/students')
      : await fetch('http://localhost:3000/api/students');
    const apiStudents = await response.json();
    (apiStudents || []).forEach(student => {
      const normalized = normalizeStudent(student);
      const key = `${normalized.id || ''}|${normalized.grade || ''}`;
      merged.set(key, normalized);
    });

    studentsData = Array.from(merged.values());
    console.log('Loaded students (merged):', studentsData);
  } catch (error) {
    console.error('Error loading students:', error);
    showNotification('خطأ في تحميل بيانات الطلاب', 'error');
  }
}

// Populate group filter with unique groups
function populateGroupFilter() {
  const groupFilter = document.getElementById('groupFilter');
  
  // Load groups from API only (no fallback)
  const groupsFetch = window.portConfig
    ? window.portConfig.fetch('/api/groups')
    : fetch('http://localhost:3000/api/groups');
  groupsFetch
    .then(response => response.json())
    .then(groups => {
      groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.name;
        option.textContent = group.name + (group.grade ? ` (الصف ${getGradeName(group.grade)})` : '');
        groupFilter.appendChild(option);
      });
    })
    .catch(error => {
      console.error('Error loading groups:', error);
      const uniqueGroups = new Set(
        (studentsData || [])
          .map(student => (student.group_name || '').trim())
          .filter(Boolean)
      );
      uniqueGroups.forEach(groupName => {
        const option = document.createElement('option');
        option.value = groupName;
        option.textContent = groupName;
        groupFilter.appendChild(option);
      });
    });
}

function getGradeName(grade) {
  const grades = { '1': 'الأول', '2': 'الثاني', '3': 'الثالث' };
  return grades[grade] || grade;
}

// Get filtered students
function getFilteredStudents() {
  return studentsData.filter(student => {
    // Filter by grade
    if (selectedGrade !== 'all') {
      if (selectedGrade === 'null') {
        if (student.grade !== null && student.grade !== '') return false;
      } else {
        if (student.grade != selectedGrade) return false;
      }
    }
    
    // Filter by group
    if (selectedGroup !== 'all') {
      if (student.group_name !== selectedGroup) return false;
    }
    
    return true;
  });
}

// Update counts based on filters
function updateCounts() {
  // Get grade and group selections
  const gradeFilter = document.getElementById('gradeFilter');
  const groupFilter = document.getElementById('groupFilter');
  
  if (gradeFilter) selectedGrade = gradeFilter.value;
  if (groupFilter) selectedGroup = groupFilter.value;
  
  const filteredStudents = getFilteredStudents();
  
  // Count students with valid phone numbers
  let studentsWithPhone = 0;
  let parentsWithPhone = 0;
  
  filteredStudents.forEach(student => {
    // Only count non-empty and non-null phone numbers
    if (student.phone && student.phone.trim() !== '') {
      studentsWithPhone++;
    }
    if (student.parentPhone && student.parentPhone.trim() !== '') {
      parentsWithPhone++;
    }
  });
  
  recipientCounts.students = studentsWithPhone;
  recipientCounts.parents = parentsWithPhone;
  recipientCounts.both = studentsWithPhone + parentsWithPhone;
  
  document.getElementById('studentsCount').textContent = studentsWithPhone;
  document.getElementById('parentsCount').textContent = parentsWithPhone;
  document.getElementById('bothCount').textContent = studentsWithPhone + parentsWithPhone;
  document.getElementById('filteredCount').textContent = filteredStudents.length;
  
  updateSelectedRecipientsText();
  updateSendButton();
  renderStudentsList();
}

// Update recipient counts (legacy function - now calls updateCounts)
function updateRecipientCounts() {
  updateCounts();
}

// Toggle recipient selection
function toggleRecipient(type) {
  const card = document.querySelector(`[data-type="${type}"]`);
  
  // Clear other selections
  document.querySelectorAll('.recipient-card').forEach(c => c.classList.remove('active'));
  selectedRecipients.clear();
  
  // Activate selected
  card.classList.add('active');
  selectedRecipients.add(type);
  
  updateSelectedRecipientsText();
  updateSendButton();
  renderStudentsList();
}

// Update selected recipients text
function updateSelectedRecipientsText() {
  const text = document.getElementById('selectedRecipientsText');
  if (selectedRecipients.size === 0) {
    text.textContent = 'لم يتم اختيار أحد';
    text.style.color = '#666';
    return;
  }
  
  const type = Array.from(selectedRecipients)[0];
  const count = recipientCounts[type];
  
  const labels = {
    students: `${count} طالب`,
    parents: `${count} ولي أمر`,
    both: `${count} مستلم (طلاب + أولياء أمور)`
  };
  
  text.textContent = labels[type];
  text.style.color = '#25D366';
}

// Use template
function useTemplate(templateName) {
  const messageText = document.getElementById('messageText');
  messageText.value = templates[templateName];
  updateCharCount();
  updateSendButton();
  messageText.focus();
  
  // Scroll to message editor
  messageText.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  showNotification('تم تحميل القالب بنجاح', 'success');
}

// Update character count
function updateCharCount() {
  const messageText = document.getElementById('messageText');
  document.getElementById('charCount').textContent = messageText.value.length;
}

// Update send button state
function updateSendButton() {
  const sendBtn = document.getElementById('sendBtn');
  const messageText = document.getElementById('messageText').value.trim();
  const hasRecipients = selectedRecipients.size > 0;
  const hasMessage = messageText.length > 0;
  
  sendBtn.disabled = !hasRecipients || !hasMessage;
}

// Preview message
function previewMessage() {
  const messageText = document.getElementById('messageText').value.trim();
  
  if (!messageText) {
    showNotification('الرجاء كتابة رسالة أولاً', 'error');
    return;
  }
  
  document.getElementById('previewText').textContent = messageText;
  
  const type = Array.from(selectedRecipients)[0];
  const recipients = type ? 
    (type === 'students' ? `${recipientCounts.students} طالب` :
     type === 'parents' ? `${recipientCounts.parents} ولي أمر` :
     `${recipientCounts.both} مستلم`) : 'لم يتم اختيار المستلمين';
  
  document.getElementById('previewRecipients').textContent = recipients;
  document.getElementById('previewModal').style.display = 'flex';
}

// Close preview
function closePreview(event) {
  if (!event || event.target.id === 'previewModal') {
    document.getElementById('previewModal').style.display = 'none';
  }
}

// Check WhatsApp status
async function checkWhatsAppStatus() {
  try {
    const status = await window.electronAPI.getWhatsAppStatus();
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const queueInfo = document.getElementById('queueInfo');
    
    if (status.isReady) {
      statusText.textContent = '✅ WhatsApp متصل وجاهز';
      statusIcon.style.color = '#25D366';
    } else if (status.state === 'qr') {
      statusText.textContent = '📱 يرجى مسح رمز QR';
      statusIcon.style.color = '#ff9800';
    } else {
      statusText.textContent = '⏳ جاري الاتصال...';
      statusIcon.style.color = '#999';
    }
    
    queueInfo.querySelector('div:first-child').textContent = status.queueLength || 0;
    
  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
  }
}

// Send broadcast
async function sendBroadcast() {
  const messageText = document.getElementById('messageText').value.trim();
  const recipientType = Array.from(selectedRecipients)[0];
  
  if (!messageText || !recipientType) {
    showNotification('الرجاء اختيار المستلمين وكتابة الرسالة', 'error');
    return;
  }
  
  // Check WhatsApp status
  const status = await window.electronAPI.getWhatsAppStatus();
  if (!status.isReady) {
    showNotification('WhatsApp غير متصل. يرجى الانتظار حتى يصبح جاهزاً', 'error');
    return;
  }
  
  // Get filtered students
  const filteredStudents = getFilteredStudents();
  
  // Only include students that are checked in the list
  const selectedStudents = filteredStudents.filter(s => selectedStudentIds.has(s.id));
  
  if (selectedStudents.length === 0) {
    showNotification('الرجاء تحديد طلاب من القائمة أدناه', 'error');
    return;
  }
  
  // Prepare recipients list with valid phone numbers only
  const recipients = [];
  
  selectedStudents.forEach(student => {
    if (recipientType === 'students' || recipientType === 'both') {
      // Only add if phone exists and is not empty
      if (student.phone && student.phone.trim() !== '') {
        recipients.push({
          phone: student.phone,
          name: student.name,
          type: 'طالب'
        });
      }
    }
    
    if (recipientType === 'parents' || recipientType === 'both') {
      // Only add if parent phone exists and is not empty
      if (student.parentPhone && student.parentPhone.trim() !== '') {
        recipients.push({
          phone: student.parentPhone,
          name: `ولي أمر ${student.name}`,
          type: 'ولي أمر'
        });
      }
    }
  });
  
  if (recipients.length === 0) {
    showNotification('لا توجد أرقام هواتف صالحة للإرسال', 'error');
    return;
  }
  
  // Confirm before sending
  const confirmMsg = `هل أنت متأكد من إرسال الرسالة إلى ${recipients.length} مستلم؟`;
  if (!confirm(confirmMsg)) return;
  
  // Disable send button
  document.getElementById('sendBtn').disabled = true;
  
  // Show progress section
  const progressSection = document.getElementById('progressSection');
  progressSection.style.display = 'block';
  progressSection.scrollIntoView({ behavior: 'smooth' });
  
  // Reset counters
  let success = 0;
  let failed = 0;
  const total = recipients.length;
  
  document.getElementById('totalCount').textContent = total;
  document.getElementById('successCount').textContent = '0';
  document.getElementById('failCount').textContent = '0';
  
  // Send messages with delay
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    
    try {
      // Personalize message
      const personalizedMessage = messageText
        .replace(/\[اسم الطالب\]/g, recipient.name)
        .replace(/\[الاسم\]/g, recipient.name);
      
      const result = await window.electronAPI.sendWhatsAppMessage(
        recipient.phone,
        personalizedMessage
      );
      
      if (result.success) {
        success++;
      } else {
        failed++;
        console.error(`Failed to send to ${recipient.name}:`, result.message);
      }
      
    } catch (error) {
      failed++;
      console.error(`Error sending to ${recipient.name}:`, error);
    }
    
    // Update progress
    const progress = Math.round(((i + 1) / total) * 100);
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressBar').textContent = progress + '%';
    document.getElementById('successCount').textContent = success;
    document.getElementById('failCount').textContent = failed;
    
    // Add delay between messages (3 seconds)
    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Re-enable send button
  document.getElementById('sendBtn').disabled = false;
  
  // Show completion message
  showNotification(
    `تم إرسال ${success} رسالة بنجاح، فشل ${failed} رسالة`,
    failed === 0 ? 'success' : 'warning'
  );
}

// Render students list with checkboxes
function renderStudentsList() {
  const filteredStudents = getFilteredStudents();
  const studentsList = document.getElementById('studentsList');
  const recipientType = Array.from(selectedRecipients)[0];
  
  if (!filteredStudents || filteredStudents.length === 0) {
    studentsList.innerHTML = `
      <div style="text-align: center; color: #999; padding: 40px;">
        <i class="fas fa-users" style="font-size: 3em; opacity: 0.3;"></i>
        <p>لا توجد طلاب مطابقين للفلاتر المختارة</p>
      </div>
    `;
    return;
  }
  
  // Initialize all students as selected
  if (selectedStudentIds.size === 0) {
    filteredStudents.forEach(student => {
      if (student.id) selectedStudentIds.add(student.id);
    });
  }
  
  let html = '';
  filteredStudents.forEach(student => {
    const studentId = student.id;
    const isChecked = selectedStudentIds.has(studentId);
    
    // Determine what will be sent
    let recipientInfo = '';
    const hasStudentPhone = student.phone && student.phone.trim() !== '';
    const hasParentPhone = student.parentPhone && student.parentPhone.trim() !== '';
    
    if (recipientType === 'students' && hasStudentPhone) {
      recipientInfo = `<span style="color: #667eea;">📱 ${student.phone}</span>`;
    } else if (recipientType === 'parents' && hasParentPhone) {
      recipientInfo = `<span style="color: #25D366;">👨‍👩‍👦 ${student.parentPhone}</span>`;
    } else if (recipientType === 'both') {
      const phones = [];
      if (hasStudentPhone) phones.push(`📱 ${student.phone}`);
      if (hasParentPhone) phones.push(`👨‍👩‍👦 ${student.parentPhone}`);
      recipientInfo = phones.length > 0 
        ? `<span style="color: #667eea;">${phones.join(' + ')}</span>`
        : '<span style="color: #999;">لا يوجد رقم</span>';
    } else {
      recipientInfo = '<span style="color: #999;">لا يوجد رقم</span>';
    }
    
    const gradeName = student.grade == '1' ? 'ثالثة ثانوي' : student.grade == '2' ? 'ثانية ثانوي' : student.grade == '3' ? 'أولى ثانوي' : `صف ${student.grade}`;
    
    html += `
      <div class="student-item" style="display: flex; align-items: center; padding: 12px; margin-bottom: 8px; background: white; border-radius: 8px; border: 2px solid ${isChecked ? '#25D366' : '#e0e0e0'}; transition: all 0.3s;">
        <input 
          type="checkbox" 
          id="student_${studentId}" 
          ${isChecked ? 'checked' : ''}
          onchange="toggleStudentSelection('${studentId}')"
          style="width: 20px; height: 20px; margin-left: 15px; cursor: pointer; accent-color: #25D366;"
        />
        <label for="student_${studentId}" style="flex: 1; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 1.1em; color: #333;">${student.name}</strong>
            <div style="margin-top: 5px; font-size: 0.9em; color: #666;">
              ${gradeName} ${student.group_name ? `• ${student.group_name}` : ''}
            </div>
          </div>
          <div style="text-align: left; font-size: 0.9em;">
            ${recipientInfo}
          </div>
        </label>
      </div>
    `;
  });
  
  studentsList.innerHTML = html;
  updateSelectedCounters();
}

// Toggle student selection
function toggleStudentSelection(studentId) {
  if (selectedStudentIds.has(studentId)) {
    selectedStudentIds.delete(studentId);
  } else {
    selectedStudentIds.add(studentId);
  }
  updateSelectedCounters();
  updateSendButton();
}

// Toggle all students
function toggleAllStudents() {
  const filteredStudents = getFilteredStudents();
  const allSelected = filteredStudents.every(s => selectedStudentIds.has(s.id));
  
  if (allSelected) {
    // Unselect all
    filteredStudents.forEach(s => selectedStudentIds.delete(s.id));
  } else {
    // Select all
    filteredStudents.forEach(s => {
      if (s.id) selectedStudentIds.add(s.id);
    });
  }
  
  renderStudentsList();
}

// Filter students list based on search
function filterStudentsList() {
  const searchTerm = document.getElementById('studentSearchInput').value.toLowerCase().trim();
  const studentItems = document.querySelectorAll('.student-item');
  
  studentItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// Update selected counters
function updateSelectedCounters() {
  const filteredStudents = getFilteredStudents();
  const selectedCount = filteredStudents.filter(s => selectedStudentIds.has(s.id)).length;
  
  document.getElementById('selectedStudentsCount').textContent = selectedCount;
  
  const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id));
  document.getElementById('toggleAllText').textContent = allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل';
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    animation: slideIn 0.3s;
    max-width: 400px;
  `;
  
  const colors = {
    success: '#25D366',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#667eea'
  };
  
  notification.style.background = colors[type] || colors.info;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
