/**
 * DataManager - إدارة البيانات
 * يدعم كل من SQLite (عبر API) و localStorage (احتياطي)
 */

class DataManager {
  constructor() {
    this.studentCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
    this.lastCacheTime = 0;
  }

  // ===== STUDENTS =====

  async getAllStudents() {
    try {
      // حاول من Electron API أولاً
      if (window.electronAPI && window.electronAPI.getAllStudents) {
        const students = await window.electronAPI.getAllStudents();
        if (students && students.length > 0) {
          console.log(`✅ Loaded ${students.length} students from API`);
          return students;
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch from API:', err.message);
    }
    
    // احتياطي: localStorage
    const all = JSON.parse(localStorage.getItem('students') || '[]');
    console.log(`📦 Loaded ${all.length} students from localStorage`);
    return all || [];
  }

  async getStudents(grade) {
    try {
      const students = await this.getAllStudents();
      if (grade) {
        return students.filter(s => String(s.grade) === String(grade));
      }
      return students;
    } catch (err) {
      console.error('❌ Error filtering students:', err);
      return [];
    }
  }

  // دالة للحصول على الطلاب بشكل فوري من localStorage (بدون انتظار)
  getStudentsSync(grade = null) {
    try {
      const all = JSON.parse(localStorage.getItem('students') || '[]');
      if (grade) {
        return all.filter(s => String(s.grade) === String(grade));
      }
      return all || [];
    } catch (err) {
      console.error('❌ Error getting students sync:', err);
      return [];
    }
  }

  // دالة للحصول على جميع الطلاب بشكل فوري من localStorage (بدون انتظار)
  getAllStudentsSync() {
    try {
      const all = JSON.parse(localStorage.getItem('students') || '[]');
      return all || [];
    } catch (err) {
      console.error('❌ Error getting all students sync:', err);
      return [];
    }
  }

  // دالة للحصول على طالب ببيانات كاملة (بمختار ومجموعة بأسمها)
  getStudentWithDetails(id) {
    try {
      const student = this.getStudentByIdSync(id);
      if (!student) return null;
      
      return {
        ...student,
        centerName: this.getCenterName(student.center),
        groupName: this.getGroupName(student.group_name)
      };
    } catch (err) {
      console.error('❌ خطأ في الحصول على بيانات الطالب:', err);
      return null;
    }
  }

  // دوال مساعدة
  getCenterName(centerId) {
    if (!centerId) return '';
    // بحث بسيط - معظم الأحيان ID هو رقم
    return String(centerId);
  }

  getGroupName(groupId) {
    if (!groupId) return '';
    return String(groupId);
  }

  // دالة للحصول على طالب بشكل مباشر (بدون async)
  getStudentByIdSync(id) {
    try {
      if (!id) return null;
      const students = JSON.parse(localStorage.getItem('students') || '[]');
      return students.find(s => String(s.id) === String(id)) || null;
    } catch (err) {
      console.error('❌ خطأ في جلب الطالب:', err);
      return null;
    }
  }

  // دالة للحصول على طالب بواسطة ID (compatible مع جميع الاستدعاءات)
  getStudentById(id) {
    return this.getStudentByIdSync(id);
  }

  async addStudent(id, name, studentPhone, guardianPhone, photo, grade, center, group_name) {
    try {
      // تسجيل الحدث
      if (window.logger) {
        window.logger.info('DATA_ADD_STUDENT', 'إضافة طالب جديد', {
          id, name, grade, center, group_name
        });
      }
      
      if (!name || !name.trim()) {
        throw new Error('اسم الطالب مطلوب');
      }

      const student = { 
        code: id || Date.now().toString(),
        id: id || Date.now().toString(),
        name, 
        studentPhone, 
        guardianPhone, 
        photo: photo || '', 
        grade,
        center,
        group_name,
        qr_code: `${grade}_${id || Date.now()}`
      };

      // حاول من API
      if (window.electronAPI && window.electronAPI.addStudent) {
        try {
          const result = await window.electronAPI.addStudent(student);
          if (result.success || result.data) {
            console.log('✅ Student added to database');
            return student;
          }
        } catch (err) {
          console.warn('⚠️ API add failed:', err.message);
        }
      }

      // احتياطي: localStorage
      const students = JSON.parse(localStorage.getItem('students') || '[]');
      if (students.find(s => s.id == student.id)) {
        throw new Error('معرّف الطالب موجود بالفعل');
      }
      students.push(student);
      localStorage.setItem('students', JSON.stringify(students));
      console.log('✅ Student added to localStorage');
      
      return student;
    } catch (err) {
      console.error('❌ Error adding student:', err);
      throw err;
    }
  }

  async updateStudent(id, name, studentPhone, guardianPhone, photo, grade, center, group_name) {
    try {
      // تسجيل الحدث
      if (window.logger) {
        window.logger.info('DATA_UPDATE_STUDENT', 'تحديث بيانات طالب', {
          id, name, grade, center, group_name
        });
      }
      
      if (!id) throw new Error('معرّف الطالب مطلوب');
      if (!name || !name.trim()) throw new Error('اسم الطالب مطلوب');

      // حاول من API
      if (window.electronAPI && window.electronAPI.updateStudent) {
        try {
          const result = await window.electronAPI.updateStudent({
            id, name, studentPhone, guardianPhone, photo, grade, center, group_name
          });
          if (result.success) {
            console.log('✅ Student updated in database');
            return true;
          }
        } catch (err) {
          console.warn('⚠️ API update failed:', err.message);
        }
      }

      // احتياطي: localStorage
      const students = JSON.parse(localStorage.getItem('students') || '[]');
      const index = students.findIndex(s => String(s.id) === String(id));
      if (index === -1) throw new Error('الطالب غير موجود');

      students[index] = { 
        ...students[index],
        name, 
        studentPhone, 
        guardianPhone, 
        photo: photo || '',
        grade,
        center,
        group_name
      };
      
      localStorage.setItem('students', JSON.stringify(students));
      console.log('✅ Student updated in localStorage');
      return true;
    } catch (err) {
      console.error('❌ Error updating student:', err);
      throw err;
    }
  }

  async removeStudent(id) {
    try {
      if (!id) throw new Error('معرّف الطالب مطلوب');

      // حاول من API
      if (window.electronAPI && window.electronAPI.removeStudent) {
        try {
          const result = await window.electronAPI.removeStudent(id);
          if (result.success) {
            console.log('✅ Student removed from database');
            return true;
          }
        } catch (err) {
          console.warn('⚠️ API remove failed:', err.message);
        }
      }

      // احتياطي: localStorage
      const students = JSON.parse(localStorage.getItem('students') || '[]');
      const filtered = students.filter(s => String(s.id) !== String(id));
      
      if (filtered.length === students.length) {
        throw new Error('الطالب غير موجود');
      }

      localStorage.setItem('students', JSON.stringify(filtered));
      console.log('✅ Student removed from localStorage');
      return true;
    } catch (err) {
      console.error('❌ Error removing student:', err);
      throw err;
    }
  }

  // ===== ATTENDANCE =====

  async recordAttendance(student_id, name, date, time, homework = 0, quiz = 0, session_id = null) {
    try {
      // تسجيل الحدث
      if (window.logger) {
        window.logger.info('DATA_RECORD_ATTENDANCE', 'تسجيل حضور', {
          student_id, name, date, time, homework, quiz
        });
      }
      
      const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
      const record = {
        id: Date.now().toString(),
        student_id: String(student_id),
        name,
        date,
        time: time || new Date().toLocaleTimeString('ar-EG'),
        homework: parseFloat(homework) || 0,
        quiz: parseFloat(quiz) || 0,
        session_id: session_id || `${date}_${time.split(':')[0]}`
      };
      
      attendance.push(record);
      localStorage.setItem('attendance', JSON.stringify(attendance));
      return record;
    } catch (err) {
      console.error('❌ Error recording attendance:', err);
      throw err;
    }
  }

  getAttendanceByStudent(student_id) {
    try {
      const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
      return attendance.filter(a => String(a.student_id) === String(student_id));
    } catch (err) {
      console.error('❌ Error fetching attendance:', err);
      return [];
    }
  }

  getAttendanceByDate(date) {
    try {
      const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
      return attendance.filter(a => a.date === date);
    } catch (err) {
      console.error('❌ Error fetching attendance:', err);
      return [];
    }
  }

  getAllAttendance() {
    try {
      return JSON.parse(localStorage.getItem('attendance') || '[]');
    } catch (err) {
      console.error('❌ Error fetching attendance:', err);
      return [];
    }
  }

  updateAttendanceGrades(attendanceId, homework, quiz, examAbsent, examMaxScore, studentNote) {
    try {
      if (!attendanceId) throw new Error('معرّف الحضور مطلوب');

      const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
      const index = attendance.findIndex(a => String(a.id) === String(attendanceId));
      if (index === -1) throw new Error('سجل الحضور غير موجود');

      const hw = Number.isFinite(Number(homework)) ? Number(homework) : 0;
      const qz = Number.isFinite(Number(quiz)) ? Number(quiz) : 0;
      const examAbsentValue = examAbsent === undefined ? attendance[index].examAbsent : !!examAbsent;
      const maxScore = Number.isFinite(Number(examMaxScore)) && Number(examMaxScore) > 0 ? Number(examMaxScore) : 10;
      const note = studentNote !== undefined ? String(studentNote).trim() : (attendance[index].studentNote || '');

      attendance[index] = {
        ...attendance[index],
        homework: hw,
        quiz: qz,
        examAbsent: examAbsentValue,
        examMaxScore: maxScore,
        studentNote: note
      };

      localStorage.setItem('attendance', JSON.stringify(attendance));
      console.log('✅ تم تحديث درجات الحضور:', {
        homework: hw,
        quiz: qz,
        examMaxScore: maxScore,
        studentNote: note ? note.substring(0, 20) + '...' : 'لا توجد'
      });
      return attendance[index];
    } catch (err) {
      console.error('❌ Error updating attendance grades:', err);
      throw err;
    }
  }

  // ===== STATS =====

  getStudentStats(student_id) {
    try {
      const attendance = this.getAttendanceByStudent(student_id);
      const presentSessions = attendance.filter(a => !a.status || a.status === 'present');
      
      // حساب المتوسطات والنسب المئوية
      let totalHomework = 0;
      let totalQuiz = 0;
      let totalMaxHomework = 0;
      let totalMaxQuiz = 0;
      let totalMaxScore = 0;
      
      presentSessions.forEach(session => {
        const hw = Number(session.homework) || 0;
        const qz = Number(session.quiz) || 0;
        const maxScore = Number(session.examMaxScore) || 10;
        totalHomework += hw;
        totalQuiz += qz;
        totalMaxHomework += maxScore;
        totalMaxQuiz += maxScore;
        totalMaxScore += maxScore * 2;
      });
      
      const avgHomework = presentSessions.length > 0 ? totalHomework / presentSessions.length : 0;
      const avgExam = presentSessions.length > 0 ? totalQuiz / presentSessions.length : 0;
      const totalScore = totalHomework + totalQuiz;
      const homeworkPercent = totalMaxHomework > 0 ? (totalHomework / totalMaxHomework) * 100 : 0;
      const quizPercent = totalMaxQuiz > 0 ? (totalQuiz / totalMaxQuiz) * 100 : 0;
      const totalPercent = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
      
      return {
        student_id,
        sessions: attendance.length,
        present: presentSessions.length,
        presentCount: presentSessions.length,
        absent: attendance.filter(a => a.status === 'absent').length,
        avgHomework: avgHomework,
        avgExam: avgExam,
        totalScore: totalScore,
        homeworkPercent: homeworkPercent,
        quizPercent: quizPercent,
        totalPercent: totalPercent
      };
    } catch (err) {
      console.error('❌ Error getting stats:', err);
      return { student_id, sessions: 0, present: 0, presentCount: 0, absent: 0, avgHomework: 0, avgExam: 0, totalScore: 0, homeworkPercent: 0, quizPercent: 0, totalPercent: 0 };
    }
  }

  getStudentAttendance(student_id) {
    return this.getAttendanceByStudent(student_id);
  }

  // دالة للحصول على جميع الامتحانات
  getAllExams(grade = null) {
    try {
      const exams = JSON.parse(localStorage.getItem('exams') || '[]');
      if (grade) {
        return exams.filter(e => String(e.grade) === String(grade));
      }
      return exams || [];
    } catch (err) {
      console.error('❌ خطأ في جلب الامتحانات:', err);
      return [];
    }
  }

  clearCache() {
    this.studentCache.clear();
    console.log('🧹 Cache cleared');
  }

  // Export all data for backup (async version to fetch from API)
  async exportData() {
    try {
      const students = JSON.parse(localStorage.getItem('students') || '[]');
      const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
      const exams = JSON.parse(localStorage.getItem('exams') || '[]');
      const settings = JSON.parse(localStorage.getItem('settings') || '{}');
      
      // جلب السناتر والمجاميع من API
      let centers = [];
      let groups = [];
      
      try {
        // محاولة جلب السناتر من API
        const centersResponse = await fetch('http://localhost:3000/api/centers');
        if (centersResponse.ok) {
          centers = await centersResponse.json();
          console.log('✅ تم جلب السناتر من API:', centers.length);
        }
      } catch (apiError) {
        console.warn('⚠️ فشل جلب السناتر من API، محاولة من localStorage:', apiError.message);
        centers = JSON.parse(localStorage.getItem('centers') || '[]');
      }
      
      try {
        // محاولة جلب المجاميع من API
        const groupsResponse = await fetch('http://localhost:3000/api/groups');
        if (groupsResponse.ok) {
          groups = await groupsResponse.json();
          console.log('✅ تم جلب المجاميع من API:', groups.length);
        }
      } catch (apiError) {
        console.warn('⚠️ فشل جلب المجاميع من API، محاولة من localStorage:', apiError.message);
        groups = JSON.parse(localStorage.getItem('groups') || '[]');
      }
      
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          students,
          attendance,
          exams,
          settings,
          centers,
          groups
        }
      };
      
      console.log('✅ تم تصدير البيانات:', {
        students: students.length,
        attendance: attendance.length,
        exams: exams.length,
        centers: centers.length,
        groups: groups.length
      });
      
      return backup;
    } catch (error) {
      console.error('❌ خطأ في تصدير البيانات:', error);
      throw error;
    }
  }

  // Import data from backup (async version to save to API)
  async importData(backup) {
    try {
      if (!backup || !backup.data) {
        throw new Error('ملف النسخة الاحتياطية غير صالح');
      }

      const { students, attendance, exams, settings, centers, groups } = backup.data;
      
      // Save all data to localStorage
      if (students) localStorage.setItem('students', JSON.stringify(students));
      if (attendance) localStorage.setItem('attendance', JSON.stringify(attendance));
      if (exams) localStorage.setItem('exams', JSON.stringify(exams));
      if (settings) localStorage.setItem('settings', JSON.stringify(settings));
      if (centers) localStorage.setItem('centers', JSON.stringify(centers));
      if (groups) localStorage.setItem('groups', JSON.stringify(groups));
      
      // استيراد السناتر إلى قاعدة البيانات عبر API
      if (centers && centers.length > 0) {
        try {
          console.log('🔄 جاري استيراد السناتر إلى قاعدة البيانات...');
          for (const center of centers) {
            try {
              const response = await fetch('http://localhost:3000/api/centers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: center.name,
                  description: center.description || ''
                })
              });
              if (!response.ok) {
                const error = await response.json();
                // تجاهل الأخطاء المتعلقة بالتكرار
                if (!error.error?.includes('موجود')) {
                  console.warn('⚠️ تحذير في استيراد سنتر:', center.name, error);
                }
              }
            } catch (err) {
              console.warn('⚠️ فشل استيراد سنتر:', center.name, err.message);
            }
          }
          console.log('✅ تم استيراد السناتر');
        } catch (apiError) {
          console.warn('⚠️ فشل الاتصال بـ API لاستيراد السناتر:', apiError.message);
        }
      }
      
      // استيراد المجاميع إلى قاعدة البيانات عبر API
      if (groups && groups.length > 0) {
        try {
          console.log('🔄 جاري استيراد المجاميع إلى قاعدة البيانات...');
          for (const group of groups) {
            try {
              const response = await fetch('http://localhost:3000/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: group.name,
                  center_id: group.center_id,
                  grade: group.grade || null,
                  description: group.description || ''
                })
              });
              if (!response.ok) {
                const error = await response.json();
                // تجاهل الأخطاء المتعلقة بالتكرار
                if (!error.error?.includes('موجود')) {
                  console.warn('⚠️ تحذير في استيراد مجموعة:', group.name, error);
                }
              }
            } catch (err) {
              console.warn('⚠️ فشل استيراد مجموعة:', group.name, err.message);
            }
          }
          console.log('✅ تم استيراد المجاميع');
        } catch (apiError) {
          console.warn('⚠️ فشل الاتصال بـ API لاستيراد المجاميع:', apiError.message);
        }
      }
      
      console.log('✅ تم استيراد البيانات بنجاح:', {
        students: students?.length || 0,
        attendance: attendance?.length || 0,
        exams: exams?.length || 0,
        centers: centers?.length || 0,
        groups: groups?.length || 0
      });
      
      this.clearCache();
      
      return true;
    } catch (error) {
      console.error('❌ خطأ في استيراد البيانات:', error);
      throw error;
    }
  }
}

const dataManager = new DataManager();
