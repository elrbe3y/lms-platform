// preload.js
console.log('Preload script loaded');
const { contextBridge, ipcRenderer } = require('electron');
console.log('Electron APIs loaded');

console.log('Exposing electronAPI');
contextBridge.exposeInMainWorld('electronAPI', {
  // Student operations
  addStudent: (data) => ipcRenderer.invoke('student:add', data),
  getAllStudents: () => ipcRenderer.invoke('student:getAll'),
  getStudentById: (id) => ipcRenderer.invoke('student:getById', id),
  updateStudent: (data) => ipcRenderer.invoke('student:update', data),
  removeStudent: (id) => ipcRenderer.invoke('student:remove', id),
  generateQR: (qr_code) => ipcRenderer.invoke('student:generateQR', qr_code),

  // Attendance operations
  scanAttendance: (qr_code) => ipcRenderer.invoke('attendance:scan', qr_code),
  getAllAttendance: () => ipcRenderer.invoke('attendance:getAll'),
  getAttendanceByStudent: (student_id) => ipcRenderer.invoke('attendance:getByStudent', student_id),
  getAttendanceByDate: (date) => ipcRenderer.invoke('attendance:getByDate', date),
  countAttendanceByStudent: (student_id) => ipcRenderer.invoke('attendance:countByStudent', student_id),
  getStudentProfileData: (student_id) => ipcRenderer.invoke('student:get-profile-data', student_id),
  
  // Attendance operations
  markPresent: (data) => ipcRenderer.invoke('attendance:markPresent', data),
  notifyGrades: (data) => ipcRenderer.invoke('attendance:notifyGrades', data),
  notifyAbsence: (data) => ipcRenderer.invoke('attendance:notifyAbsence', data),
  sendDailyReport: (data) => ipcRenderer.invoke('attendance:sendDailyReport', data),

  // Report operations
  exportExcel: (data) => ipcRenderer.invoke('report:exportExcel', data),

  // Exam operations
  sendExamResult: (data) => ipcRenderer.invoke('send-exam-result', data),

  // WhatsApp operations
  whatsapp: {
    init: () => ipcRenderer.invoke('whatsapp:init'),
    status: () => ipcRenderer.invoke('whatsapp:status'),
    sendGrade: (payload) => ipcRenderer.invoke('whatsapp:sendGrade', payload),
    reset: () => ipcRenderer.invoke('whatsapp:reset'),
    restart: () => ipcRenderer.invoke('whatsapp:restart')
  },
  
  // WhatsApp Broadcast operations
  getWhatsAppStatus: () => ipcRenderer.invoke('whatsapp:getStatus'),
  sendWhatsAppMessage: (phone, message) => ipcRenderer.invoke('whatsapp:sendMessage', { phone, message })
});
console.log('electronAPI exposed');