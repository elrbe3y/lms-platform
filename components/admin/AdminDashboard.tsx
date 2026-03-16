'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from './ui/AdminShell';
import { CodesTab } from './tabs/CodesTab';
import { ContentTab } from './tabs/ContentTab';
import { CoursesTab } from './tabs/CoursesTab';
import { AttendanceTab } from './tabs/AttendanceTab';
import { FeaturedContentTab } from './tabs/FeaturedContentTab';
import { HonorBoardTab } from './tabs/HonorBoardTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { StudentsTab } from './tabs/StudentsTab';
import type {
  CodeGenerateFormState,
  CodeRow,
  Course,
  CreateLessonFormState,
  DashboardStats,
  ExamFormState,
  Lesson,
  LessonAccessLogRow,
  LessonFileInput,
  LessonFileFormState,
  LessonOption,
  LessonPartFormState,
  LessonVideoInput,
  Module,
  PaymentRow,
  Student,
  StudentProfileData,
  VideoFormState,
} from './types';

type TabKey = 'overview' | 'students' | 'attendance' | 'content' | 'featured' | 'honor-board' | 'codes' | 'payments' | 'courses';

const statusLabels: Record<Student['status'], string> = {
  PENDING_VERIFICATION: 'في انتظار التفعيل',
  ACTIVE: 'نشط',
  SUSPENDED: 'معلق',
  BANNED: 'محظور',
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceSummary, setAttendanceSummary] = useState({
    total: 0,
    purchased: 0,
    notPurchased: 0,
    lessonPurchases: 0,
    coursePurchases: 0,
  });
  const [attendanceCourseId, setAttendanceCourseId] = useState('');
  const [attendanceLessonId, setAttendanceLessonId] = useState('');
  const [attendanceNotPurchasedOnly, setAttendanceNotPurchasedOnly] = useState(false);
  const [attendanceStudents, setAttendanceStudents] = useState<
    Array<{
      id: string;
      fullName: string;
      phone: string;
      grade: string;
      status: string;
      hasPurchase: boolean;
      purchaseType: 'NONE' | 'LESSON' | 'COURSE';
      purchasedAt: string | null;
      amount: number;
      purchasedLessonsCount: number;
    }>
  >([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [grantStudentId, setGrantStudentId] = useState('');
  const [grantLessonId, setGrantLessonId] = useState('');
  const [selectedMonitorLessonId, setSelectedMonitorLessonId] = useState('');
  const [lessonAccessLogs, setLessonAccessLogs] = useState<LessonAccessLogRow[]>([]);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<StudentProfileData | null>(null);
  const [loadingStudentProfile, setLoadingStudentProfile] = useState(false);

  const [videoForm, setVideoForm] = useState<VideoFormState>({
    lessonId: '',
    title: '',
    provider: 'YOUTUBE',
    videoUrl: '',
    streamingUrl: '',
    duration: '',
    pdfUrl: '',
    enableWatermark: true,
  });

  const [examForm, setExamForm] = useState<ExamFormState>({
    lessonId: '',
    title: '',
    description: '',
    passingScore: '50',
    timeLimit: '',
    maxAttempts: '3',
    shuffleQuestions: false,
    blockNextLesson: true,
    preventBackNavigation: false,
    questions: [
      {
        questionText: '',
        questionImage: '',
        type: 'MULTIPLE_CHOICE',
        points: '1',
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
      },
    ],
  });

  const [createLessonForm, setCreateLessonForm] = useState<CreateLessonFormState>({
    courseTitle: '',
    courseDescription: '',
    courseThumbnail: '',
    coursePrice: '',
    courseIsFree: false,
    courseTargetGrade: 'ALL',
    moduleTitle: '',
    lessonTitle: '',
    lessonDescription: '',
    lessonPrice: '',
  });

  const [lessonPartForm, setLessonPartForm] = useState<LessonPartFormState>({
    lessonId: '',
    sectionTitle: 'المحتوى الرئيسي',
    title: '',
    order: '',
    description: '',
    provider: 'YOUTUBE',
    videoUrl: '',
    streamingUrl: '',
    duration: '',
  });

  const [lessonFileForm, setLessonFileForm] = useState<LessonFileFormState>({
    lessonId: '',
    sectionTitle: 'المحتوى الرئيسي',
    title: '',
    order: '',
    fileUrl: '',
    fileType: '',
  });

  const [codeForm, setCodeForm] = useState<CodeGenerateFormState>({
    quantity: '100',
    type: 'COURSE_ACCESS',
    credits: '1',
    expiresInDays: '',
  });

  const loadLessons = useCallback(async () => {
    const response = await fetch('/api/admin/lessons', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok && data.success) {
      setLessons(data.lessons);
      if (!videoForm.lessonId && data.lessons.length > 0) {
        const firstLesson = data.lessons[0].id;
        setVideoForm((prev) => ({ ...prev, lessonId: firstLesson }));
        setExamForm((prev) => ({ ...prev, lessonId: firstLesson }));
        setLessonPartForm((prev) => ({ ...prev, lessonId: firstLesson }));
        setLessonFileForm((prev) => ({ ...prev, lessonId: firstLesson }));
        setGrantLessonId(firstLesson);
        setSelectedMonitorLessonId(firstLesson);
      }
    }
  }, [videoForm.lessonId]);

  useEffect(() => {
    void loadStats();
    void loadStudents();
    void loadLessons();
  }, [loadLessons]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadStudents(studentSearch);
    }, 250);

    return () => clearTimeout(timeout);
  }, [studentSearch]);

  useEffect(() => {
    if (tab === 'codes') {
      void loadCodes();
    }
    if (tab === 'payments') {
      void loadPayments();
    }
    if (tab === 'attendance') {
      if (!courses.length) {
        void loadCourses();
      }
      void loadAttendanceStudents();
    }
    if (tab === 'courses') {
      void loadCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, courses.length]);

  useEffect(() => {
    if (tab !== 'attendance') return;
    const timeout = setTimeout(() => {
      void loadAttendanceStudents(attendanceSearch);
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceSearch, attendanceCourseId, attendanceLessonId, attendanceNotPurchasedOnly, tab]);

  async function loadStats() {
    const response = await fetch('/api/admin/stats', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok && data.success) {
      setStats(data.stats);
    }
  }

  async function loadStudents(searchValue = '') {
    setLoadingStudents(true);
    try {
      const query = searchValue.trim() ? `?search=${encodeURIComponent(searchValue.trim())}` : '';
      const response = await fetch(`/api/admin/students${query}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.success) {
        setStudents(data.students);
      }
    } finally {
      setLoadingStudents(false);
    }
  }

  async function loadCodes() {
    setLoadingCodes(true);
    try {
      const response = await fetch('/api/admin/codes', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.success) {
        setCodes(data.codes || []);
      }
    } finally {
      setLoadingCodes(false);
    }
  }

  async function loadPayments() {
    setLoadingPayments(true);
    try {
      const response = await fetch('/api/admin/payments?status=PENDING', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.success) {
        setPayments(data.payments || []);
      }
    } finally {
      setLoadingPayments(false);
    }
  }

  async function loadCourses() {
    setLoadingCourses(true);
    try {
      const response = await fetch('/api/admin/courses', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.success) {
        setCourses(data.courses || []);
      }
    } finally {
      setLoadingCourses(false);
    }
  }

  async function loadAttendanceStudents(searchValue = '') {
    setLoadingAttendance(true);
    try {
      const params = new URLSearchParams();
      if (searchValue.trim()) {
        params.set('search', searchValue.trim());
      }
      if (attendanceCourseId) {
        params.set('courseId', attendanceCourseId);
      }
      if (attendanceLessonId) {
        params.set('lessonId', attendanceLessonId);
      }
      if (attendanceNotPurchasedOnly) {
        params.set('notPurchasedOnly', 'true');
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/admin/attendance/students${query}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.success) {
        setAttendanceStudents(data.students || []);
        setAttendanceSummary(
          data.summary || {
            total: 0,
            purchased: 0,
            notPurchased: 0,
            lessonPurchases: 0,
            coursePurchases: 0,
          }
        );
      }
    } finally {
      setLoadingAttendance(false);
    }
  }

  async function activateStudent(studentId: string) {
    const response = await fetch('/api/admin/students/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });

    if (response.ok) {
      await Promise.all([loadStudents(), loadStats()]);
    }
  }

  async function suspendStudent(studentId: string) {
    const response = await fetch('/api/admin/students/suspend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });

    if (response.ok) {
      await Promise.all([loadStudents(), loadStats()]);
    }
  }

  async function banStudent(studentId: string) {
    const response = await fetch('/api/admin/students/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });

    if (response.ok) {
      await Promise.all([loadStudents(studentSearch), loadStats()]);
    }
  }

  async function resetStudentPassword(studentId: string, passwordValue: string) {
    if (!passwordValue.trim() || passwordValue.trim().length < 6) {
      alert('أدخل كلمة مرور جديدة 6 أحرف على الأقل.');
      return;
    }

    const response = await fetch(`/api/admin/students/${studentId}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: passwordValue.trim() }),
    });

    const data = await response.json();
    alert(response.ok ? data.message : data.error || 'فشل تغيير كلمة المرور');
  }

  async function grantLessonToStudent() {
    if (!grantStudentId || !grantLessonId) {
      alert('اختر الطالب والحصة أولاً.');
      return;
    }

    const response = await fetch('/api/admin/students/grant-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: grantStudentId, lessonId: grantLessonId }),
    });

    const data = await response.json();
    alert(response.ok ? data.message : data.error || 'فشل التفعيل اليدوي');
  }

  async function loadLessonAccess() {
    if (!selectedMonitorLessonId) return;

    const response = await fetch(`/api/admin/lessons/${selectedMonitorLessonId}/access`, { cache: 'no-store' });
    const data = await response.json();
    if (response.ok && data.success) {
      setLessonAccessLogs(data.logs || []);
    }
  }

  async function generateCodes() {
    const quantity = Number(codeForm.quantity || '0');
    if (!quantity || quantity < 1) {
      alert('أدخل عدد أكواد صحيح.');
      return;
    }

    const response = await fetch('/api/admin/codes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity,
        credits: Number(codeForm.credits || '1'),
        expiresInDays: codeForm.expiresInDays ? Number(codeForm.expiresInDays) : undefined,
      }),
    });

    const data = await response.json();
    alert(response.ok ? data.message : data.error || 'فشل توليد الأكواد');
    if (response.ok) {
      await loadCodes();
    }
  }

  async function approvePayment(paymentId: string) {
    const response = await fetch(`/api/admin/payments/${paymentId}/approve`, {
      method: 'POST',
    });

    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'فشل اعتماد الدفع');
      return;
    }

    await loadPayments();
    await loadStats();
  }

  async function deleteStudent(studentId: string) {
    if (!confirm('سيتم حذف الطالب نهائياً. هل أنت متأكد؟')) return;

    const response = await fetch(`/api/admin/students/${studentId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await Promise.all([loadStudents(), loadStats()]);
    }
  }

  async function deleteLesson(lessonId: string) {
    if (!confirm('سيتم حذف الحصة نهائياً. هل أنت متأكد؟')) return;

    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('تم حذف الحصة بنجاح');
        setEditingLesson(null);
        await loadCourses();
      } else {
        const data = await response.json();
        alert(data.error || 'فشل حذف الحصة');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  }

  async function saveCourseEdits() {
    if (!editingCourse) return;

    try {
      const response = await fetch(`/api/admin/courses/${editingCourse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingCourse.title,
          description: editingCourse.description,
          isFeatured: editingCourse.isFeatured,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'فشل تحديث الكورس');
        return;
      }

      setEditingCourse(null);
      await loadCourses();
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  }

  async function saveModuleEdits() {
    if (!editingModule) return;

    try {
      const response = await fetch(`/api/admin/modules/${editingModule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingModule.title,
          description: editingModule.description,
          order: editingModule.order,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'فشل تحديث الوحدة');
        return;
      }

      setEditingModule(null);
      await loadCourses();
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  }

  async function saveLessonEdits() {
    if (!editingLesson) return;

    const isFree = editingLesson.isFree ?? false;
    const price = isFree ? 0 : Number(editingLesson.price ?? 0);

    try {
      const response = await fetch(`/api/admin/lessons/${editingLesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingLesson.title,
          description: editingLesson.description,
          price,
          isFree,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'فشل تحديث الحصة');
        return;
      }

      setEditingLesson(null);
      await loadCourses();
      await loadLessons();
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
  }

  async function saveStudentEdits() {
    if (!editingStudent) return;
    setSavingStudent(true);

    try {
      const response = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editingStudent.fullName,
          email: editingStudent.email,
          phone: editingStudent.phone,
          parentPhone: editingStudent.parentPhone,
          governorate: editingStudent.governorate,
          schoolName: editingStudent.schoolName,
          grade: editingStudent.grade,
          address: editingStudent.address,
          nationalIdImage: editingStudent.nationalIdImage,
          status: editingStudent.status,
        }),
      });

      if (response.ok) {
        setEditingStudent(null);
        await Promise.all([loadStudents(), loadStats()]);
      }
    } finally {
      setSavingStudent(false);
    }
  }

  async function openStudentProfile(studentId: string) {
    setLoadingStudentProfile(true);
    try {
      const response = await fetch(`/api/admin/students/${studentId}/profile`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'فشل تحميل بروفايل الطالب');
        return;
      }

      setSelectedStudentProfile(data.profile);
    } catch {
      alert('تعذر الاتصال بالخادم');
    } finally {
      setLoadingStudentProfile(false);
    }
  }

  async function unlockLessonForStudent(studentId: string, lessonId: string) {
    const response = await fetch(`/api/admin/students/${studentId}/lessons/${lessonId}/unlock`, {
      method: 'POST',
    });

    const data = await response.json();
    alert(response.ok ? data.message : data.error || 'فشل فتح الحصة');
    if (response.ok) {
      await openStudentProfile(studentId);
    }
  }

  async function lockLessonForStudent(studentId: string, lessonId: string) {
    const response = await fetch(`/api/admin/students/${studentId}/lessons/${lessonId}/lock`, {
      method: 'POST',
    });

    const data = await response.json();
    alert(response.ok ? data.message : data.error || 'فشل قفل الحصة');
    if (response.ok) {
      await openStudentProfile(studentId);
    }
  }

  async function submitVideo() {
    if (!videoForm.lessonId) return;

    try {
      const response = await fetch(`/api/admin/lessons/${videoForm.lessonId}/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoForm.title,
          provider: videoForm.provider,
          videoUrl: videoForm.videoUrl,
          streamingUrl: videoForm.streamingUrl || null,
          duration: videoForm.duration ? Number(videoForm.duration) : undefined,
          pdfUrl: videoForm.pdfUrl || null,
          enableWatermark: videoForm.enableWatermark,
        }),
      });

      const data = await response.json();
      alert(response.ok ? data.message : data.error || 'فشل حفظ الفيديو');
    } catch {
      alert('تعذر الاتصال بالخادم. تأكد أن السيرفر يعمل ثم أعد المحاولة.');
    }
  }

  async function submitExam() {
    if (!examForm.lessonId) return;

    const normalizedQuestions = examForm.questions
      .map((question) => ({
        questionText: question.questionText.trim(),
        questionImage: question.questionImage.trim() || undefined,
        type: question.type,
        points: Number(question.points || '1'),
        options: question.options.map((option) => ({
          text: option.text.trim(),
          isCorrect: option.isCorrect,
        })),
      }))
      .filter((question) => question.questionText.length > 0);

    if (normalizedQuestions.length === 0) {
      alert('أضف سؤالاً واحداً على الأقل.');
      return;
    }

    const hasQuestionWithoutCorrect = normalizedQuestions.some(
      (question) => !question.options.some((option) => option.isCorrect)
    );

    if (hasQuestionWithoutCorrect) {
      alert('كل سؤال يجب أن يحتوي على إجابة صحيحة واحدة على الأقل.');
      return;
    }

    const hasEmptyOption = normalizedQuestions.some((question) =>
      question.options.some((option) => option.text.length === 0)
    );

    if (hasEmptyOption) {
      alert('لا يمكن ترك خيار بدون نص.');
      return;
    }

    const response = await fetch(`/api/admin/lessons/${examForm.lessonId}/exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: examForm.title,
        description: examForm.description,
        passingScore: Number(examForm.passingScore),
        timeLimit: examForm.timeLimit ? Number(examForm.timeLimit) : undefined,
        maxAttempts: Number(examForm.maxAttempts),
        shuffleQuestions: examForm.shuffleQuestions,
        blockNextLesson: examForm.blockNextLesson,
        preventBackNavigation: examForm.preventBackNavigation,
        questions: normalizedQuestions,
      }),
    });

    const data = await response.json();
    alert(response.ok ? data.message : data.error || 'فشل حفظ الامتحان');
  }

  function addQuestion() {
    setExamForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionText: '',
          questionImage: '',
          type: 'MULTIPLE_CHOICE',
          points: '1',
          options: [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ],
        },
      ],
    }));
  }

  function removeQuestion(questionIndex: number) {
    setExamForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, index) => index !== questionIndex),
    }));
  }

  function updateQuestionField(
    questionIndex: number,
    field: 'questionText' | 'questionImage' | 'type' | 'points',
    value: string
  ) {
    setExamForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) =>
        index === questionIndex ? { ...question, [field]: value } : question
      ),
    }));
  }

  async function uploadQuestionImage(questionIndex: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'فشل رفع الصورة');
      return;
    }

    updateQuestionField(questionIndex, 'questionImage', data.url);
  }

  function updateOptionText(questionIndex: number, optionIndex: number, value: string) {
    setExamForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, idx) =>
                idx === optionIndex ? { ...option, text: value } : option
              ),
            }
          : question
      ),
    }));
  }

  function setCorrectOption(questionIndex: number, optionIndex: number) {
    setExamForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, idx) => ({
                ...option,
                isCorrect: idx === optionIndex,
              })),
            }
          : question
      ),
    }));
  }

  async function createLesson(payloadOverrides?: { videos?: LessonVideoInput[]; files?: LessonFileInput[] }) {
    try {
      const response = await fetch('/api/admin/lessons/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createLessonForm,
          videos: payloadOverrides?.videos || [],
          files: payloadOverrides?.files || [],
          coursePrice: createLessonForm.coursePrice ? Number(createLessonForm.coursePrice) : undefined,
          lessonPrice: createLessonForm.lessonPrice ? Number(createLessonForm.lessonPrice) : 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'فشل إنشاء الدرس');
        return;
      }

      alert('تم إنشاء الدرس بنجاح');
      setCreateLessonForm({
        courseTitle: '',
        courseDescription: '',
        courseThumbnail: '',
        coursePrice: '',
        courseIsFree: false,
        courseTargetGrade: 'ALL',
        moduleTitle: '',
        lessonTitle: '',
        lessonDescription: '',
        lessonPrice: '',
      });
      await loadLessons();
    } catch {
      alert('تعذر الاتصال بالخادم. تأكد أن السيرفر يعمل ثم أعد المحاولة.');
    }
  }

  async function createLessonPart() {
    if (!lessonPartForm.lessonId) return;

    try {
      const response = await fetch(`/api/admin/lessons/${lessonPartForm.lessonId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle: lessonPartForm.sectionTitle,
          title: lessonPartForm.title,
          order: lessonPartForm.order ? Number(lessonPartForm.order) : undefined,
          description: lessonPartForm.description || undefined,
          provider: lessonPartForm.provider,
          videoUrl: lessonPartForm.videoUrl,
          streamingUrl: lessonPartForm.streamingUrl || null,
          duration: lessonPartForm.duration ? Number(lessonPartForm.duration) : null,
        }),
      });

      const data = await response.json();
      alert(response.ok ? 'تمت إضافة جزء الحصة' : data.error || 'فشل إضافة جزء الحصة');
      if (response.ok) {
        setLessonPartForm((prev) => ({
          ...prev,
          title: '',
          order: '',
          description: '',
          videoUrl: '',
          streamingUrl: '',
          duration: '',
        }));
        await loadLessons();
      }
    } catch {
      alert('تعذر الاتصال بالخادم. تأكد أن السيرفر يعمل ثم أعد المحاولة.');
    }
  }

  async function createLessonFile() {
    if (!lessonFileForm.lessonId) return;

    try {
      const response = await fetch(`/api/admin/lessons/${lessonFileForm.lessonId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle: lessonFileForm.sectionTitle,
          title: lessonFileForm.title,
          order: lessonFileForm.order ? Number(lessonFileForm.order) : undefined,
          fileUrl: lessonFileForm.fileUrl,
          fileType: lessonFileForm.fileType || null,
        }),
      });

      const data = await response.json();
      alert(response.ok ? 'تمت إضافة ملف الحصة' : data.error || 'فشل إضافة الملف');
      if (response.ok) {
        setLessonFileForm((prev) => ({ ...prev, title: '', order: '', fileUrl: '', fileType: '' }));
        await loadLessons();
      }
    } catch {
      alert('تعذر الاتصال بالخادم. تأكد أن السيرفر يعمل ثم أعد المحاولة.');
    }
  }

  async function renameLessonSection(lessonId: string, oldTitle: string, newTitle: string) {
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldTitle, newTitle }),
      });

      const data = await response.json();
      alert(response.ok ? data.message || 'تم تعديل عنوان القسم' : data.error || 'فشل تعديل عنوان القسم');
      if (response.ok) {
        await loadLessons();
      }
    } catch {
      alert('تعذر الاتصال بالخادم. تأكد أن السيرفر يعمل ثم أعد المحاولة.');
    }
  }

  async function deleteLessonSection(lessonId: string, sectionTitle: string) {
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}/sections`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionTitle }),
      });

      const data = await response.json();
      alert(response.ok ? data.message || 'تم حذف القسم' : data.error || 'فشل حذف القسم');
      if (response.ok) {
        await loadLessons();
      }
    } catch {
      alert('تعذر الاتصال بالخادم. تأكد أن السيرفر يعمل ثم أعد المحاولة.');
    }
  }

  async function moveLessonSection(lessonId: string, sectionTitle: string, direction: 'UP' | 'DOWN') {
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionTitle, direction }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        await loadLessons();
      } else {
        alert(data.message || 'لا يمكن تحريك القسم');
      }
    } catch {
      alert('تعذر الاتصال بالخادم. تأكد أن السيرفر يعمل ثم أعد المحاولة.');
    }
  }

  const lessonOptions = useMemo<LessonOption[]>(
    () =>
      lessons.map((lesson) => ({
        id: lesson.id,
        label: `${lesson.module.course.title} / ${lesson.module.title} / ${lesson.title}`,
      })),
    [lessons]
  );

  const sectionLabels: Record<TabKey, string> = {
    overview: 'نظرة عامة',
    students: 'الطلاب',
    attendance: 'مشتريات الحصص',
    content: 'المحتوى',
    featured: 'الفيديوهات المثبتة',
    'honor-board': 'لوحة الشرف',
    codes: 'الأكواد',
    payments: 'المدفوعات',
    courses: 'الكورسات والحصص',
  };

  const shellKpis = stats
    ? [
        { label: 'إجمالي الطلاب', value: stats.totalStudents },
        { label: 'طلاب نشطون', value: stats.activeStudents, valueClassName: 'text-emerald-700' },
        { label: 'طلبات معلقة', value: stats.pendingPaymentRequests, valueClassName: 'text-amber-700' },
        { label: 'الأكواد النشطة', value: stats.activeCodes, valueClassName: 'text-indigo-700' },
        { label: 'إجمالي الإيراد', value: stats.totalRevenue, valueClassName: 'text-blue-700' },
      ]
    : [];

  const navItems: Array<{ key: TabKey; label: string; icon: JSX.Element }> = [
    { key: 'overview', label: 'نظرة عامة', icon: <ChartIcon className="h-4 w-4" /> },
    { key: 'students', label: 'إدارة الطلاب', icon: <UsersIcon className="h-4 w-4" /> },
    { key: 'attendance', label: 'مشتريات الحصص', icon: <ClockIcon className="h-4 w-4" /> },
    { key: 'featured', label: 'الفيديوهات المثبتة', icon: <PlayIcon className="h-4 w-4" /> },
    { key: 'honor-board', label: 'لوحة الشرف', icon: <TrophyIcon className="h-4 w-4" /> },
    { key: 'codes', label: 'الأكواد', icon: <CodeIcon className="h-4 w-4" /> },
    { key: 'payments', label: 'المدفوعات', icon: <WalletIcon className="h-4 w-4" /> },
    { key: 'courses', label: 'الكورسات والحصص', icon: <BookIcon className="h-4 w-4" /> },
  ];

  const previewLessonId = lessonPartForm.lessonId || lessonFileForm.lessonId;
  const previewLessonLabel = lessonOptions.find((option) => option.id === previewLessonId)?.label || null;

  const contentSectionPreview = useMemo(() => {
    if (!previewLessonId) return [] as Array<{ title: string; partCount: number; fileCount: number; minOrder: number }>;

    const lesson = lessons.find((item) => item.id === previewLessonId);
    if (!lesson) return [];

    const sectionMap = new Map<string, { title: string; partCount: number; fileCount: number; minOrder: number }>();

    for (const part of lesson.parts || []) {
      const sectionTitle = (part.sectionTitle || 'المحتوى الرئيسي').trim() || 'المحتوى الرئيسي';
      if (!sectionMap.has(sectionTitle)) {
        sectionMap.set(sectionTitle, { title: sectionTitle, partCount: 0, fileCount: 0, minOrder: part.order ?? 0 });
      }
      const section = sectionMap.get(sectionTitle);
      if (section) {
        section.partCount += 1;
        section.minOrder = Math.min(section.minOrder, part.order ?? 0);
      }
    }

    for (const file of lesson.files || []) {
      const sectionTitle = (file.sectionTitle || 'المحتوى الرئيسي').trim() || 'المحتوى الرئيسي';
      if (!sectionMap.has(sectionTitle)) {
        sectionMap.set(sectionTitle, { title: sectionTitle, partCount: 0, fileCount: 0, minOrder: file.order ?? 0 });
      }
      const section = sectionMap.get(sectionTitle);
      if (section) {
        section.fileCount += 1;
        section.minOrder = Math.min(section.minOrder, file.order ?? 0);
      }
    }

    return Array.from(sectionMap.values()).sort((a, b) => a.minOrder - b.minOrder);
  }, [lessons, previewLessonId]);

  return (
    <>
    <AdminShell
      title={
        <span className="flex items-center gap-3">
          <ShieldIcon className="h-8 w-8 text-blue-700" />
          <span>مركز قيادة منصة محمد الربيعي</span>
          <Link
            href="/admin/content"
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            إدارة المحتوى الكاملة
          </Link>
        </span>
      }
      subtitle="لوحة تحكم شاملة لإدارة الطلاب والمحتوى والمدفوعات"
      currentSectionLabel={sectionLabels[tab]}
      kpis={shellKpis}
      navItems={navItems}
      activeTab={tab}
      onTabChange={setTab}
    >

      {tab === 'overview' && stats && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="إجمالي الطلاب" value={stats.totalStudents} />
          <StatCard title="المبيعات" value={stats.totalRevenue} />
          <StatCard title="الأكواد النشطة" value={stats.activeCodes} />
          <StatCard title="طلبات معلقة" value={stats.pendingPaymentRequests} />
        </div>
      )}

      {tab === 'students' && (
        <StudentsTab
          students={students}
          loadingStudents={loadingStudents}
          studentSearch={studentSearch}
          setStudentSearch={setStudentSearch}
          grantStudentId={grantStudentId}
          setGrantStudentId={setGrantStudentId}
          grantLessonId={grantLessonId}
          setGrantLessonId={setGrantLessonId}
          lessonOptions={lessonOptions}
          grantLessonToStudent={grantLessonToStudent}
          openStudentProfile={openStudentProfile}
          loadingStudentProfile={loadingStudentProfile}
          setEditingStudent={(student) => setEditingStudent(student)}
          activateStudent={activateStudent}
          suspendStudent={suspendStudent}
          banStudent={banStudent}
          resetStudentPassword={resetStudentPassword}
          deleteStudent={deleteStudent}
          statusLabels={statusLabels}
        />
      )}

      {tab === 'attendance' && (
        <AttendanceTab
          students={attendanceStudents}
          loading={loadingAttendance}
          search={attendanceSearch}
          setSearch={setAttendanceSearch}
          summary={attendanceSummary}
          courses={courses}
          selectedCourseId={attendanceCourseId}
          setSelectedCourseId={setAttendanceCourseId}
          selectedLessonId={attendanceLessonId}
          setSelectedLessonId={setAttendanceLessonId}
          onlyNotPurchased={attendanceNotPurchasedOnly}
          setOnlyNotPurchased={setAttendanceNotPurchasedOnly}
        />
      )}

      {tab === 'content' && (
        <ContentTab
          lessonOptions={lessonOptions}
          createLessonForm={createLessonForm}
          setCreateLessonForm={setCreateLessonForm}
          createLesson={createLesson}
          videoForm={videoForm}
          setVideoForm={setVideoForm}
          submitVideo={submitVideo}
          examForm={examForm}
          setExamForm={setExamForm}
          removeQuestion={removeQuestion}
          updateQuestionField={updateQuestionField}
          uploadQuestionImage={uploadQuestionImage}
          setCorrectOption={setCorrectOption}
          updateOptionText={updateOptionText}
          addQuestion={addQuestion}
          submitExam={submitExam}
          lessonPartForm={lessonPartForm}
          setLessonPartForm={setLessonPartForm}
          createLessonPart={createLessonPart}
          lessonFileForm={lessonFileForm}
          setLessonFileForm={setLessonFileForm}
          createLessonFile={createLessonFile}
          previewLessonId={previewLessonId}
          previewLessonLabel={previewLessonLabel}
          contentSectionPreview={contentSectionPreview}
          moveLessonSection={moveLessonSection}
          renameLessonSection={renameLessonSection}
          deleteLessonSection={deleteLessonSection}
          selectedMonitorLessonId={selectedMonitorLessonId}
          setSelectedMonitorLessonId={setSelectedMonitorLessonId}
          loadLessonAccess={loadLessonAccess}
          lessonAccessLogs={lessonAccessLogs}
        />
      )}

      {tab === 'featured' && (
        <FeaturedContentTab
          lessons={lessons}
        />
      )}

      {tab === 'honor-board' && (
        <HonorBoardTab
          students={students}
          loadingStudents={loadingStudents}
        />
      )}

      {tab === 'codes' && (
        <CodesTab
          codeForm={codeForm}
          onQuantityChange={(value) => setCodeForm((prev) => ({ ...prev, quantity: value }))}
          onCreditsChange={(value) => setCodeForm((prev) => ({ ...prev, credits: value }))}
          onExpiresInDaysChange={(value) => setCodeForm((prev) => ({ ...prev, expiresInDays: value }))}
          generateCodes={generateCodes}
          codes={codes}
          loadingCodes={loadingCodes}
        />
      )}

      {tab === 'payments' && (
        <PaymentsTab
          payments={payments}
          loadingPayments={loadingPayments}
          approvePayment={approvePayment}
        />
      )}

      {tab === 'courses' && (
        <CoursesTab
          loadingCourses={loadingCourses}
          courses={courses}
          setEditingCourse={setEditingCourse}
          setEditingModule={setEditingModule}
          setEditingLesson={setEditingLesson}
          deleteLesson={deleteLesson}
        />
      )}

    </AdminShell>

      {selectedStudentProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">بروفايل الطالب: {selectedStudentProfile.student.fullName}</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedStudentProfile.student.email} - {selectedStudentProfile.student.phone}</p>
              </div>
              <button
                onClick={() => setSelectedStudentProfile(null)}
                className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
              >
                إغلاق
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
              <div className="rounded border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-xs text-emerald-700">رصيد المحفظة</div>
                <div className="mt-1 text-2xl font-bold text-emerald-800">{selectedStudentProfile.student.walletBalance.toLocaleString('ar-EG')} ج.م</div>
              </div>
              <div className="rounded border border-blue-200 bg-blue-50 p-4">
                <div className="text-xs text-blue-700">إجمالي الحصص المفتوحة</div>
                <div className="mt-1 text-2xl font-bold text-blue-800">{selectedStudentProfile.accessLogs.length}</div>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs text-amber-700">إجمالي الحصص المشتراة</div>
                <div className="mt-1 text-2xl font-bold text-amber-800">{selectedStudentProfile.purchases.length}</div>
              </div>
            </div>

            <div className="mb-6 rounded border p-4">
              <h4 className="mb-3 font-bold text-gray-900">البيانات الأساسية</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                <div>الاسم: {selectedStudentProfile.student.fullName}</div>
                <div>الهاتف: {selectedStudentProfile.student.phone}</div>
                <div>هاتف ولي الأمر: {selectedStudentProfile.student.parentPhone || 'غير مسجل'}</div>
                <div>المحافظة: {selectedStudentProfile.student.governorate || 'غير مسجل'}</div>
                <div>المدرسة: {selectedStudentProfile.student.schoolName}</div>
                <div>الصف: {selectedStudentProfile.student.grade}</div>
                <div>الحالة: {statusLabels[selectedStudentProfile.student.status]}</div>
                <div>آخر دخول: {selectedStudentProfile.student.lastLoginAt ? new Date(selectedStudentProfile.student.lastLoginAt).toLocaleString('ar-EG') : 'لم يسجل بعد'}</div>
              </div>
            </div>

            <div className="mb-6 rounded border p-4">
              <h4 className="mb-3 font-bold text-gray-900">المعاملات المالية</h4>
              {selectedStudentProfile.payments.length === 0 ? (
                <p className="text-sm text-gray-500">لا توجد معاملات.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {selectedStudentProfile.payments.map((payment) => (
                    <div key={payment.id} className="rounded border border-gray-200 p-2 text-sm">
                      <div className="font-semibold">{payment.amount} ج.م - {payment.method}</div>
                      <div className="text-gray-600">{payment.status} - {new Date(payment.createdAt).toLocaleString('ar-EG')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6 rounded border p-4">
              <h4 className="mb-3 font-bold text-gray-900">الحصص التي فتحها الطالب</h4>
              {selectedStudentProfile.accessLogs.length === 0 ? (
                <p className="text-sm text-gray-500">لا توجد سجلات فتح حصص.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {selectedStudentProfile.accessLogs.map((log) => (
                    <div key={log.id} className="rounded border border-gray-200 p-2 text-sm flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{log.lesson.module.course.title} / {log.lesson.module.title} / {log.lesson.title}</div>
                        <div className="text-gray-600">{new Date(log.openedAt).toLocaleString('ar-EG')}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => void unlockLessonForStudent(selectedStudentProfile.student.id, log.lesson.id)}
                          className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700"
                        >
                          فتح
                        </button>
                        <button
                          onClick={() => void lockLessonForStudent(selectedStudentProfile.student.id, log.lesson.id)}
                          className="rounded bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-700"
                        >
                          قفل
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded border p-4">
              <h4 className="mb-3 font-bold text-gray-900">الحصص المشتراة</h4>
              {selectedStudentProfile.purchases.length === 0 ? (
                <p className="text-sm text-gray-500">لا توجد حصص مشتراة.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {selectedStudentProfile.purchases.map((purchase) => (
                    <div key={purchase.id} className="rounded border border-gray-200 p-2 text-sm flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{purchase.lesson.module.course.title} / {purchase.lesson.module.title} / {purchase.lesson.title}</div>
                        <div className="text-gray-600">{purchase.amount} ج.م - {new Date(purchase.createdAt).toLocaleString('ar-EG')}</div>
                      </div>
                      <button
                        onClick={() => void lockLessonForStudent(selectedStudentProfile.student.id, purchase.lesson.id)}
                        className="rounded bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-700"
                      >
                        قفل الحصة
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-xl font-bold text-gray-900">تعديل بيانات الطالب</h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="rounded border px-3 py-2"
                value={editingStudent.fullName}
                onChange={(e) => setEditingStudent((prev) => (prev ? { ...prev, fullName: e.target.value } : prev))}
              />
              <input
                className="rounded border px-3 py-2"
                value={editingStudent.email}
                onChange={(e) => setEditingStudent((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
              />
              <input
                className="rounded border px-3 py-2"
                value={editingStudent.phone}
                onChange={(e) => setEditingStudent((prev) => (prev ? { ...prev, phone: e.target.value } : prev))}
              />
              <input
                className="rounded border px-3 py-2"
                placeholder="هاتف ولي الأمر"
                value={editingStudent.parentPhone ?? ''}
                onChange={(e) =>
                  setEditingStudent((prev) =>
                    prev ? { ...prev, parentPhone: e.target.value || null } : prev
                  )
                }
              />
              <input
                className="rounded border px-3 py-2"
                placeholder="المحافظة"
                value={editingStudent.governorate ?? ''}
                onChange={(e) =>
                  setEditingStudent((prev) =>
                    prev ? { ...prev, governorate: e.target.value || null } : prev
                  )
                }
              />
              <input
                className="rounded border px-3 py-2"
                value={editingStudent.schoolName}
                onChange={(e) => setEditingStudent((prev) => (prev ? { ...prev, schoolName: e.target.value } : prev))}
              />
              <input
                className="rounded border px-3 py-2"
                value={editingStudent.grade}
                onChange={(e) => setEditingStudent((prev) => (prev ? { ...prev, grade: e.target.value } : prev))}
              />
              <select
                className="rounded border px-3 py-2"
                value={editingStudent.status}
                onChange={(e) =>
                  setEditingStudent((prev) =>
                    prev ? { ...prev, status: e.target.value as Student['status'] } : prev
                  )
                }
              >
                <option value="PENDING_VERIFICATION">في انتظار التفعيل</option>
                <option value="ACTIVE">نشط</option>
                <option value="SUSPENDED">معلق</option>
                <option value="BANNED">محظور</option>
              </select>
            </div>

            <textarea
              className="mt-3 w-full rounded border px-3 py-2"
              value={editingStudent.address}
              onChange={(e) => setEditingStudent((prev) => (prev ? { ...prev, address: e.target.value } : prev))}
            />

            <input
              className="mt-3 w-full rounded border px-3 py-2"
              placeholder="رابط صورة البطاقة"
              value={editingStudent.nationalIdImage ?? ''}
              onChange={(e) =>
                setEditingStudent((prev) => (prev ? { ...prev, nationalIdImage: e.target.value || null } : prev))
              }
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
                onClick={() => setEditingStudent(null)}
                disabled={savingStudent}
              >
                إلغاء
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={() => void saveStudentEdits()}
                disabled={savingStudent}
              >
                {savingStudent ? 'جاري الحفظ...' : 'حفظ التعديل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-xl font-bold text-gray-900">تعديل الكورس: {editingCourse.title}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={editingCourse.title}
                  onChange={(e) =>
                    setEditingCourse((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  className="w-full rounded border px-3 py-2"
                  rows={3}
                  value={editingCourse.description ?? ''}
                  onChange={(e) =>
                    setEditingCourse((prev) =>
                      prev ? { ...prev, description: e.target.value || null } : prev
                    )
                  }
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingCourse.isFeatured}
                  onChange={(e) =>
                    setEditingCourse((prev) =>
                      prev ? { ...prev, isFeatured: e.target.checked } : prev
                    )
                  }
                />
                <span className="text-sm text-gray-700">عرض على الصفحة الرئيسية</span>
              </label>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setEditingCourse(null)}
                className="rounded bg-gray-300 px-6 py-2 font-semibold text-gray-900 hover:bg-gray-400"
              >
                إلغاء
              </button>
              <button
                onClick={() => void saveCourseEdits()}
                className="rounded bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-xl font-bold text-gray-900">تعديل الوحدة: {editingModule.title}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={editingModule.title}
                  onChange={(e) =>
                    setEditingModule((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
                <input
                  type="number"
                  className="w-full rounded border px-3 py-2"
                  value={editingModule.order}
                  onChange={(e) =>
                    setEditingModule((prev) =>
                      prev ? { ...prev, order: parseInt(e.target.value) || 0 } : prev
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  className="w-full rounded border px-3 py-2"
                  rows={3}
                  value={editingModule.description ?? ''}
                  onChange={(e) =>
                    setEditingModule((prev) =>
                      prev ? { ...prev, description: e.target.value || null } : prev
                    )
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setEditingModule(null)}
                className="rounded bg-gray-300 px-6 py-2 font-semibold text-gray-900 hover:bg-gray-400"
              >
                إلغاء
              </button>
              <button
                onClick={() => void saveModuleEdits()}
                className="rounded bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-xl font-bold text-gray-900">تعديل الحصة: {editingLesson.title}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={editingLesson.title}
                  onChange={(e) =>
                    setEditingLesson((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  className="w-full rounded border px-3 py-2"
                  rows={3}
                  value={editingLesson.description ?? ''}
                  onChange={(e) =>
                    setEditingLesson((prev) =>
                      prev ? { ...prev, description: e.target.value || null } : prev
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر (ج.م)</label>
                <input
                  type="number"
                  className="w-full rounded border px-3 py-2"
                  value={editingLesson.price ?? 0}
                  onChange={(e) =>
                    setEditingLesson((prev) =>
                      prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : prev
                    )
                  }
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingLesson.isFree ?? false}
                  onChange={(e) =>
                    setEditingLesson((prev) =>
                      prev ? { ...prev, isFree: e.target.checked } : prev
                    )
                  }
                />
                <span className="text-sm text-gray-700">مجاني</span>
              </label>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setEditingLesson(null)}
                className="rounded bg-gray-300 px-6 py-2 font-semibold text-gray-900 hover:bg-gray-400"
              >
                إلغاء
              </button>
              <button
                onClick={() => void saveLessonEdits()}
                className="rounded bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-3xl font-bold text-blue-700">{value}</div>
    </div>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="7" r="4" />
      <path d="M17 11a4 4 0 1 0-3-7" />
      <path d="M3 21a6 6 0 0 1 12 0" />
      <path d="M15 21a5 5 0 0 1 6 0" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 18l6-6-6-6" />
      <path d="M8 6l-6 6 6 6" />
      <path d="M10 20l4-16" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" />
      <path d="M6 9a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2" />
      <path d="M9 14h6" />
      <path d="M9 9v4a3 3 0 0 0 6 0V9" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7h18a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3z" />
      <path d="M21 10h-4a2 2 0 0 0 0 4h4" />
      <path d="M3 7V5a2 2 0 0 1 2-2h12" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l8 4v5c0 5-3.5 9.5-8 9.5S4 17 4 12V7l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5h16m-11-8l-1.5-3h8l-1.5 3m-2-5h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
      <path d="M6 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
    </svg>
  );
}
