'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type CourseTargetGrade = 'ALL' | 'FIRST' | 'SECOND' | 'THIRD';

interface LessonOption {
  id: string;
  label: string;
}

interface CourseOption {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  price: number;
  targetGrade: CourseTargetGrade;
}

interface LessonApiItem {
  id: string;
  title?: string;
  module?: {
    title?: string;
    course?: {
      title?: string;
    };
  };
}

interface LessonDetailsApiItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  isFree: boolean;
  module: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
      description: string | null;
      thumbnail: string | null;
      price: number;
      targetGrade: CourseTargetGrade;
    };
  };
  parts: Array<{ sectionTitle: string; title: string; videoUrl: string }>;
  files: Array<{ sectionTitle: string; title: string; fileUrl: string; fileType: string | null }>;
  exams: Array<{ title: string; description: string | null; passingScore: number; timeLimit: number | null }>;
}

interface CourseFormState {
  title: string;
  description: string;
  thumbnail: string;
  targetGrade: CourseTargetGrade;
  price: string;
  isFree: boolean;
}

interface LessonFormState {
  courseTitle: string;
  courseDescription: string;
  courseThumbnail: string;
  courseTargetGrade: CourseTargetGrade;
  coursePrice: string;
  courseIsFree: boolean;
  moduleTitle: string;
  lessonTitle: string;
  lessonDescription: string;
  lessonPrice: string;
  sections: LessonSection[];
}

interface LessonSection {
  id: string;
  title: string;
  videos: Array<{ id: string; title: string; videoUrl: string }>;
  files: Array<{ id: string; title: string; fileUrl: string; fileType: string }>;
  exams: Array<{ id: string; title: string; passingScore: string; timeLimit: string }>;
}

interface ExamFormState {
  lessonId: string;
  title: string;
  description: string;
  passingScore: string;
  timeLimit: string;
  maxAttempts: string;
  shuffleQuestions: boolean;
  preventBackNavigation: boolean;
  blockNextLesson: boolean;
  questions: Array<{
    questionText: string;
    questionImage: string;
    points: string;
    options: [string, string, string, string];
    correctIndex: number;
  }>;
}

function newVideoItem() {
  return { id: crypto.randomUUID(), title: '', videoUrl: '' };
}

function newFileItem() {
  return { id: crypto.randomUUID(), title: '', fileUrl: '', fileType: 'PDF' };
}

function newExamItem() {
  return { id: crypto.randomUUID(), title: '', passingScore: '50', timeLimit: '' };
}

function newSectionItem() {
  return {
    id: crypto.randomUUID(),
    title: '',
    videos: [newVideoItem()],
    files: [newFileItem()],
    exams: [newExamItem()],
  };
}

function newQuestionItem() {
  return {
    questionText: '',
    questionImage: '',
    points: '1',
    options: ['', '', '', ''] as [string, string, string, string],
    correctIndex: 0,
  };
}

export default function AdminContentPage() {
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [lessonOptions, setLessonOptions] = useState<LessonOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [loadingEditLesson, setLoadingEditLesson] = useState(false);

  const [courseForm, setCourseForm] = useState<CourseFormState>({
    title: '',
    description: '',
    thumbnail: '',
    targetGrade: 'ALL',
    price: '',
    isFree: false,
  });

  const [lessonForm, setLessonForm] = useState<LessonFormState>({
    courseTitle: '',
    courseDescription: '',
    courseThumbnail: '',
    courseTargetGrade: 'ALL',
    coursePrice: '',
    courseIsFree: false,
    moduleTitle: '',
    lessonTitle: '',
    lessonDescription: '',
    lessonPrice: '',
    sections: [newSectionItem()],
  });

  const [examForm, setExamForm] = useState<ExamFormState>({
    lessonId: '',
    title: '',
    description: '',
    passingScore: '50',
    timeLimit: '',
    maxAttempts: '3',
    shuffleQuestions: false,
    preventBackNavigation: false,
    blockNextLesson: true,
    questions: [newQuestionItem()],
  });

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState<number | null>(null);
  const [busy, setBusy] = useState<string>('');

  function clearEditQueryParam() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('editLessonId');
    window.history.replaceState({}, '', url.toString());
  }

  const loadLessons = useCallback(async () => {
    setLoadingLessons(true);
    try {
      const response = await fetch('/api/admin/lessons', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) return;

      const lessons = (data.lessons || []) as LessonApiItem[];
      const options: LessonOption[] = lessons.map((lesson) => ({
        id: lesson.id,
        label: `${lesson.module?.course?.title || '-'} / ${lesson.module?.title || '-'} / ${lesson.title || '-'}`,
      }));

      setLessonOptions(options);
      setExamForm((prev) => (prev.lessonId || options.length === 0 ? prev : { ...prev, lessonId: options[0].id }));
    } finally {
      setLoadingLessons(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const response = await fetch('/api/admin/courses', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) return;

      const options: CourseOption[] = (data.courses || []).map((course: {
        id: string;
        title: string;
        description: string | null;
        thumbnail: string | null;
        price: number;
        targetGrade: CourseTargetGrade;
      }) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        price: course.price,
        targetGrade: course.targetGrade || 'ALL',
      }));

      setAvailableCourses(options);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const loadLessonForEdit = useCallback(async (lessonId: string) => {
    setLoadingEditLesson(true);
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.error || 'تعذر تحميل بيانات الحصة للتعديل');
        return;
      }

      const lesson = data.lesson as LessonDetailsApiItem;
      const sectionsMap = new Map<string, LessonSection>();

      const ensureSection = (title: string) => {
        const normalizedTitle = title.trim() || 'القسم 1';
        if (!sectionsMap.has(normalizedTitle)) {
          sectionsMap.set(normalizedTitle, {
            id: crypto.randomUUID(),
            title: normalizedTitle,
            videos: [],
            files: [],
            exams: [],
          });
        }
        return sectionsMap.get(normalizedTitle)!;
      };

      for (const part of lesson.parts || []) {
        const section = ensureSection(part.sectionTitle || 'القسم 1');
        section.videos.push({
          id: crypto.randomUUID(),
          title: part.title || '',
          videoUrl: part.videoUrl || '',
        });
      }

      for (const file of lesson.files || []) {
        const section = ensureSection(file.sectionTitle || 'القسم 1');
        section.files.push({
          id: crypto.randomUUID(),
          title: file.title || '',
          fileUrl: file.fileUrl || '',
          fileType: file.fileType || 'PDF',
        });
      }

      for (const exam of lesson.exams || []) {
        const sectionName = exam.description?.startsWith('قسم:')
          ? exam.description.replace(/^قسم:\s*/, '').trim()
          : 'قسم الامتحانات';
        const section = ensureSection(sectionName || 'قسم الامتحانات');
        section.exams.push({
          id: crypto.randomUUID(),
          title: exam.title || '',
          passingScore: String(exam.passingScore ?? 50),
          timeLimit: exam.timeLimit ? String(exam.timeLimit) : '',
        });
      }

      const sections = Array.from(sectionsMap.values());

      setEditingLessonId(lesson.id);
      setSelectedCourseId(lesson.module.course.id);
      setLessonForm({
        courseTitle: lesson.module.course.title || '',
        courseDescription: lesson.module.course.description || '',
        courseThumbnail: lesson.module.course.thumbnail || '',
        courseTargetGrade: lesson.module.course.targetGrade || 'ALL',
        coursePrice: String(lesson.module.course.price ?? 0),
        courseIsFree: (lesson.module.course.price ?? 0) <= 0,
        moduleTitle: lesson.module.title || '',
        lessonTitle: lesson.title || '',
        lessonDescription: lesson.description || '',
        lessonPrice: String(lesson.price ?? 0),
        sections: sections.length > 0 ? sections : [newSectionItem()],
      });
    } finally {
      setLoadingEditLesson(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const editLessonId = new URL(window.location.href).searchParams.get('editLessonId');
    if (!editLessonId) return;
    if (editingLessonId === editLessonId) return;
    void loadLessonForEdit(editLessonId);
  }, [editingLessonId, loadLessonForEdit]);

  async function uploadResource(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload/resource', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل رفع الملف');
    }

    return data.url as string;
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل رفع الصورة');
    }

    return data.url as string;
  }

  async function createCourse() {
    if (!courseForm.title.trim()) {
      alert('اسم الكورس مطلوب');
      return;
    }

    setBusy('course');
    try {
      const response = await fetch('/api/admin/courses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: courseForm.title.trim(),
          description: courseForm.description.trim() || undefined,
          thumbnail: courseForm.thumbnail || undefined,
          targetGrade: courseForm.targetGrade,
          price: courseForm.price ? Number(courseForm.price) : 0,
          isFree: courseForm.isFree,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'فشل إنشاء الكورس');
        return;
      }

      alert(data.message || 'تم حفظ الكورس');
      setSelectedCourseId(data.course?.id || '');
      setLessonForm((prev) => ({
        ...prev,
        courseTitle: courseForm.title,
        courseDescription: courseForm.description,
        courseThumbnail: courseForm.thumbnail,
        courseTargetGrade: courseForm.targetGrade,
        coursePrice: courseForm.price,
        courseIsFree: courseForm.isFree,
      }));
      await loadCourses();
    } finally {
      setBusy('');
    }
  }

  async function createLesson() {
    if (!selectedCourseId) {
      alert('اختر الكورس أولاً من القائمة.');
      return;
    }

    if (!lessonForm.courseTitle.trim() || !lessonForm.moduleTitle.trim() || !lessonForm.lessonTitle.trim()) {
      alert('أكمل اسم الكورس + اسم الوحدة + عنوان الحصة');
      return;
    }

    setBusy('lesson');
    try {
      const sections = lessonForm.sections
        .map((section, sectionIndex) => ({
          title: section.title.trim() || `القسم ${sectionIndex + 1}`,
          videos: section.videos
            .map((video) => ({ title: video.title.trim(), videoUrl: video.videoUrl.trim() }))
            .filter((video) => video.title && video.videoUrl),
          files: section.files
            .map((file) => ({ title: file.title.trim(), fileUrl: file.fileUrl.trim(), fileType: file.fileType || 'PDF' }))
            .filter((file) => file.title && file.fileUrl),
          exams: section.exams
            .map((exam) => ({
              title: exam.title.trim(),
              passingScore: Number(exam.passingScore || '50'),
              timeLimit: exam.timeLimit ? Number(exam.timeLimit) : undefined,
            }))
            .filter((exam) => exam.title.length > 0),
        }))
        .filter((section) => section.videos.length > 0 || section.files.length > 0 || section.exams.length > 0 || section.title.length > 0);

      if (sections.length === 0) {
        alert('أضف قسم واحد على الأقل يحتوي محتوى (فيديو/ملف/امتحان).');
        return;
      }

      const payload = {
        courseId: selectedCourseId,
        courseTitle: lessonForm.courseTitle.trim(),
        moduleTitle: lessonForm.moduleTitle.trim(),
        lessonTitle: lessonForm.lessonTitle.trim(),
        lessonDescription: lessonForm.lessonDescription.trim() || undefined,
        lessonPrice: lessonForm.lessonPrice ? Number(lessonForm.lessonPrice) : 0,
        lessonIsFree: !lessonForm.lessonPrice || Number(lessonForm.lessonPrice) <= 0,
        sections,
      };

      const response = await fetch(editingLessonId ? `/api/admin/lessons/${editingLessonId}` : '/api/admin/lessons/create', {
        method: editingLessonId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'فشل إنشاء الحصة');
        return;
      }

      alert(editingLessonId ? 'تم تحديث الحصة بالتفصيل بنجاح' : 'تم إنشاء الحصة وإضافة الفيديوهات/الملفات بنجاح');
      setLessonForm((prev) => ({
        ...prev,
        moduleTitle: '',
        lessonTitle: '',
        lessonDescription: '',
        lessonPrice: '',
        sections: [newSectionItem()],
      }));
      setEditingLessonId(null);
      clearEditQueryParam();
      await loadLessons();
    } finally {
      setBusy('');
    }
  }

  async function saveExam() {
    if (!examForm.lessonId || !examForm.title.trim()) {
      alert('اختر الحصة وأدخل اسم الامتحان');
      return;
    }

    const questions = examForm.questions
      .map((question) => ({
        questionText: question.questionText.trim(),
        questionImage: question.questionImage.trim() || undefined,
        type: 'MULTIPLE_CHOICE' as const,
        points: Number(question.points || '1'),
        options: question.options.map((text, index) => ({ text: text.trim(), isCorrect: index === question.correctIndex })),
      }))
      .filter((question) => question.questionText.length > 0);

    const hasInvalidQuestion = questions.some((question) => question.options.some((option) => option.text.length === 0));
    if (questions.length === 0 || hasInvalidQuestion) {
      alert('كل سؤال يجب أن يحتوي نص سؤال و4 اختيارات مكتملة.');
      return;
    }

    setBusy('exam');
    try {
      const response = await fetch(`/api/admin/lessons/${examForm.lessonId}/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: examForm.title,
          description: examForm.description,
          timeLimit: examForm.timeLimit ? Number(examForm.timeLimit) : undefined,
          passingScore: Number(examForm.passingScore || '50'),
          maxAttempts: Number(examForm.maxAttempts || '3'),
          shuffleQuestions: examForm.shuffleQuestions,
          preventBackNavigation: examForm.preventBackNavigation,
          blockNextLesson: examForm.blockNextLesson,
          questions,
        }),
      });

      const data = await response.json();
      alert(response.ok ? data.message || 'تم حفظ الامتحان' : data.error || 'فشل حفظ الامتحان');
    } finally {
      setBusy('');
    }
  }

  const lessonCountHint = useMemo(() => {
    if (loadingLessons) return 'جاري تحميل الحصص...';
    return `عدد الحصص الحالية: ${lessonOptions.length}`;
  }, [loadingLessons, lessonOptions.length]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6" dir="rtl">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة المحتوى (النموذج الجديد)</h1>
            <p className="mt-1 text-sm text-gray-600">تم حذف الفورمات القديمة بالكامل واستبدالها بفورمات مرتبطة بقاعدة البيانات.</p>
          </div>
          <Link href="/admin" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            الرجوع للوحة الأدمن
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">1) فورم إضافة كورس</h2>

          <input
            className="w-full rounded border px-3 py-2"
            placeholder="اسم الكورس"
            value={courseForm.title}
            onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
          />

          <textarea
            className="w-full rounded border px-3 py-2"
            placeholder="الوصف"
            value={courseForm.description}
            onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div className="rounded border border-dashed border-gray-300 p-3">
            <label className="mb-2 block text-sm font-semibold text-gray-700">صورة الغلاف</label>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded border px-3 py-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingCover(true);
                void uploadResource(file)
                  .then((url) => {
                    setCourseForm((prev) => ({ ...prev, thumbnail: url }));
                  })
                  .catch((error) => {
                    alert(error instanceof Error ? error.message : 'فشل رفع الغلاف');
                  })
                  .finally(() => setUploadingCover(false));
              }}
            />
            {uploadingCover ? <p className="mt-1 text-xs text-blue-700">جاري رفع الغلاف...</p> : null}
            {courseForm.thumbnail ? <p className="mt-1 break-all text-xs text-emerald-700">{courseForm.thumbnail}</p> : null}
          </div>

          <select
            className="w-full rounded border px-3 py-2"
            value={courseForm.targetGrade}
            onChange={(e) => setCourseForm((prev) => ({ ...prev, targetGrade: e.target.value as CourseTargetGrade }))}
          >
            <option value="ALL">كل الصفوف</option>
            <option value="FIRST">الصف الأول الثانوي</option>
            <option value="SECOND">الصف الثاني الثانوي</option>
            <option value="THIRD">الصف الثالث الثانوي</option>
          </select>

          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            placeholder="سعر الكورس"
            value={courseForm.price}
            disabled={courseForm.isFree}
            onChange={(e) => setCourseForm((prev) => ({ ...prev, price: e.target.value }))}
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={courseForm.isFree}
              onChange={(e) =>
                setCourseForm((prev) => ({
                  ...prev,
                  isFree: e.target.checked,
                  price: e.target.checked ? '0' : prev.price,
                }))
              }
            />
            كورس مجاني
          </label>

          <button
            onClick={() => void createCourse()}
            disabled={busy === 'course'}
            className="w-full rounded bg-indigo-600 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy === 'course' ? 'جارٍ الحفظ...' : 'حفظ الكورس'}
          </button>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              {editingLessonId ? '2) تعديل الحصة داخل الكورس (تفصيلي)' : '2) فورم إضافة حصة داخل الكورس'}
            </h2>
            {editingLessonId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingLessonId(null);
                  clearEditQueryParam();
                  setLessonForm((prev) => ({
                    ...prev,
                    moduleTitle: '',
                    lessonTitle: '',
                    lessonDescription: '',
                    lessonPrice: '',
                    sections: [newSectionItem()],
                  }));
                }}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                إلغاء وضع التعديل
              </button>
            ) : null}
          </div>
          <p className="text-xs text-gray-500">{lessonCountHint}</p>
          {loadingEditLesson ? <p className="text-xs text-blue-700">جاري تحميل بيانات الحصة...</p> : null}

          <select
            className="w-full rounded border px-3 py-2"
            value={selectedCourseId}
            onChange={(e) => {
              const nextCourseId = e.target.value;
              setSelectedCourseId(nextCourseId);

              const selectedCourse = availableCourses.find((course) => course.id === nextCourseId);
              if (!selectedCourse) {
                setLessonForm((prev) => ({
                  ...prev,
                  courseTitle: '',
                  courseDescription: '',
                  courseThumbnail: '',
                  courseTargetGrade: 'ALL',
                  coursePrice: '',
                  courseIsFree: false,
                }));
                return;
              }

              setLessonForm((prev) => ({
                ...prev,
                courseTitle: selectedCourse.title,
                courseDescription: selectedCourse.description || '',
                courseThumbnail: selectedCourse.thumbnail || '',
                courseTargetGrade: selectedCourse.targetGrade,
                coursePrice: String(selectedCourse.price ?? 0),
                courseIsFree: (selectedCourse.price ?? 0) <= 0,
              }));
            }}
          >
            <option value="">{loadingCourses ? 'جاري تحميل الكورسات...' : 'اختر الكورس المتاح'}</option>
            {availableCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded border bg-gray-50 px-3 py-2"
            placeholder="اسم الكورس"
            value={lessonForm.courseTitle}
            readOnly
          />

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            بيانات الكورس (الوصف/الغلاف/السعر/المجانية) تُدار من فورم إنشاء الكورس فقط.
          </div>

          <input
            className="w-full rounded border px-3 py-2"
            placeholder="اسم الوحدة"
            value={lessonForm.moduleTitle}
            onChange={(e) => setLessonForm((prev) => ({ ...prev, moduleTitle: e.target.value }))}
          />

          <input
            className="w-full rounded border px-3 py-2"
            placeholder="عنوان الحصة"
            value={lessonForm.lessonTitle}
            onChange={(e) => setLessonForm((prev) => ({ ...prev, lessonTitle: e.target.value }))}
          />

          <textarea
            className="w-full rounded border px-3 py-2"
            placeholder="وصف الحصة"
            value={lessonForm.lessonDescription}
            onChange={(e) => setLessonForm((prev) => ({ ...prev, lessonDescription: e.target.value }))}
          />

          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            placeholder="سعر الحصة"
            value={lessonForm.lessonPrice}
            onChange={(e) => setLessonForm((prev) => ({ ...prev, lessonPrice: e.target.value }))}
          />

          <div className="rounded-lg border border-gray-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">أقسام الحصة</h3>
              <button
                type="button"
                onClick={() => setLessonForm((prev) => ({ ...prev, sections: [...prev.sections, newSectionItem()] }))}
                className="rounded bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                + إضافة قسم جديد
              </button>
            </div>

            <div className="space-y-4">
              {lessonForm.sections.map((section, sectionIndex) => (
                <div key={section.id} className="space-y-3 rounded-lg border border-gray-100 p-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                    <input
                      className="rounded border px-3 py-2"
                      placeholder={`اسم القسم ${sectionIndex + 1}`}
                      value={section.title}
                      onChange={(e) =>
                        setLessonForm((prev) => ({
                          ...prev,
                          sections: prev.sections.map((item) =>
                            item.id === section.id ? { ...item, title: e.target.value } : item
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      disabled={lessonForm.sections.length === 1}
                      onClick={() =>
                        setLessonForm((prev) => ({
                          ...prev,
                          sections: prev.sections.filter((item) => item.id !== section.id),
                        }))
                      }
                      className="rounded bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      حذف القسم
                    </button>
                  </div>

                  <div className="rounded-md border border-blue-100 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-blue-800">فيديوهات القسم</h4>
                      <button
                        type="button"
                        onClick={() =>
                          setLessonForm((prev) => ({
                            ...prev,
                            sections: prev.sections.map((item) =>
                              item.id === section.id ? { ...item, videos: [...item.videos, newVideoItem()] } : item
                            ),
                          }))
                        }
                        className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        + فيديو
                      </button>
                    </div>

                    <div className="space-y-2">
                      {section.videos.map((video, videoIndex) => (
                        <div key={video.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_2fr_auto]">
                          <input
                            className="rounded border px-3 py-2"
                            placeholder={`عنوان الفيديو ${videoIndex + 1}`}
                            value={video.title}
                            onChange={(e) =>
                              setLessonForm((prev) => ({
                                ...prev,
                                sections: prev.sections.map((item) => {
                                  if (item.id !== section.id) return item;
                                  return {
                                    ...item,
                                    videos: item.videos.map((entry) =>
                                      entry.id === video.id ? { ...entry, title: e.target.value } : entry
                                    ),
                                  };
                                }),
                              }))
                            }
                          />
                          <input
                            className="rounded border px-3 py-2"
                            placeholder="رابط الفيديو"
                            value={video.videoUrl}
                            onChange={(e) =>
                              setLessonForm((prev) => ({
                                ...prev,
                                sections: prev.sections.map((item) => {
                                  if (item.id !== section.id) return item;
                                  return {
                                    ...item,
                                    videos: item.videos.map((entry) =>
                                      entry.id === video.id ? { ...entry, videoUrl: e.target.value } : entry
                                    ),
                                  };
                                }),
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setLessonForm((prev) => ({
                                ...prev,
                                sections: prev.sections.map((item) => {
                                  if (item.id !== section.id) return item;
                                  return {
                                    ...item,
                                    videos: item.videos.filter((entry) => entry.id !== video.id),
                                  };
                                }),
                              }))
                            }
                            className="rounded bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-emerald-100 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-emerald-800">ملفات القسم (PDF)</h4>
                      <button
                        type="button"
                        onClick={() =>
                          setLessonForm((prev) => ({
                            ...prev,
                            sections: prev.sections.map((item) =>
                              item.id === section.id ? { ...item, files: [...item.files, newFileItem()] } : item
                            ),
                          }))
                        }
                        className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        + ملف PDF
                      </button>
                    </div>

                    <div className="space-y-2">
                      {section.files.map((file, fileIndex) => (
                        <div key={file.id} className="space-y-2 rounded border border-gray-100 p-2">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                            <input
                              className="rounded border px-3 py-2"
                              placeholder={`اسم الملف ${fileIndex + 1}`}
                              value={file.title}
                              onChange={(e) =>
                                setLessonForm((prev) => ({
                                  ...prev,
                                  sections: prev.sections.map((item) => {
                                    if (item.id !== section.id) return item;
                                    return {
                                      ...item,
                                      files: item.files.map((entry) =>
                                        entry.id === file.id ? { ...entry, title: e.target.value } : entry
                                      ),
                                    };
                                  }),
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setLessonForm((prev) => ({
                                  ...prev,
                                  sections: prev.sections.map((item) => {
                                    if (item.id !== section.id) return item;
                                    return { ...item, files: item.files.filter((entry) => entry.id !== file.id) };
                                  }),
                                }))
                              }
                              className="rounded bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            >
                              حذف
                            </button>
                          </div>

                          <input
                            type="file"
                            accept="application/pdf"
                            className="w-full rounded border px-3 py-2"
                            onChange={(e) => {
                              const selectedFile = e.target.files?.[0];
                              if (!selectedFile) return;
                              setUploadingFileId(file.id);
                              void uploadResource(selectedFile)
                                .then((url) => {
                                  setLessonForm((prev) => ({
                                    ...prev,
                                    sections: prev.sections.map((item) => {
                                      if (item.id !== section.id) return item;
                                      return {
                                        ...item,
                                        files: item.files.map((entry) =>
                                          entry.id === file.id ? { ...entry, fileUrl: url, fileType: 'PDF' } : entry
                                        ),
                                      };
                                    }),
                                  }));
                                })
                                .catch((error) => {
                                  alert(error instanceof Error ? error.message : 'فشل رفع ملف PDF');
                                })
                                .finally(() => setUploadingFileId(null));
                            }}
                          />
                          {uploadingFileId === file.id ? <p className="text-xs text-blue-700">جاري رفع الملف...</p> : null}
                          {file.fileUrl ? <p className="break-all text-xs text-emerald-700">{file.fileUrl}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-violet-100 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-violet-800">امتحانات القسم</h4>
                      <button
                        type="button"
                        onClick={() =>
                          setLessonForm((prev) => ({
                            ...prev,
                            sections: prev.sections.map((item) =>
                              item.id === section.id ? { ...item, exams: [...item.exams, newExamItem()] } : item
                            ),
                          }))
                        }
                        className="rounded bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                      >
                        + امتحان
                      </button>
                    </div>

                    <div className="space-y-2">
                      {section.exams.map((exam, examIndex) => (
                        <div key={exam.id} className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
                          <input
                            className="rounded border px-3 py-2"
                            placeholder={`اسم الامتحان ${examIndex + 1}`}
                            value={exam.title}
                            onChange={(e) =>
                              setLessonForm((prev) => ({
                                ...prev,
                                sections: prev.sections.map((item) => {
                                  if (item.id !== section.id) return item;
                                  return {
                                    ...item,
                                    exams: item.exams.map((entry) =>
                                      entry.id === exam.id ? { ...entry, title: e.target.value } : entry
                                    ),
                                  };
                                }),
                              }))
                            }
                          />
                          <input
                            type="number"
                            className="rounded border px-3 py-2"
                            placeholder="درجة النجاح"
                            value={exam.passingScore}
                            onChange={(e) =>
                              setLessonForm((prev) => ({
                                ...prev,
                                sections: prev.sections.map((item) => {
                                  if (item.id !== section.id) return item;
                                  return {
                                    ...item,
                                    exams: item.exams.map((entry) =>
                                      entry.id === exam.id ? { ...entry, passingScore: e.target.value } : entry
                                    ),
                                  };
                                }),
                              }))
                            }
                          />
                          <input
                            type="number"
                            className="rounded border px-3 py-2"
                            placeholder="المدة بالدقائق"
                            value={exam.timeLimit}
                            onChange={(e) =>
                              setLessonForm((prev) => ({
                                ...prev,
                                sections: prev.sections.map((item) => {
                                  if (item.id !== section.id) return item;
                                  return {
                                    ...item,
                                    exams: item.exams.map((entry) =>
                                      entry.id === exam.id ? { ...entry, timeLimit: e.target.value } : entry
                                    ),
                                  };
                                }),
                              }))
                            }
                          />
                          <button
                            type="button"
                            disabled={section.exams.length === 1}
                            onClick={() =>
                              setLessonForm((prev) => ({
                                ...prev,
                                sections: prev.sections.map((item) => {
                                  if (item.id !== section.id) return item;
                                  return { ...item, exams: item.exams.filter((entry) => entry.id !== exam.id) };
                                }),
                              }))
                            }
                            className="rounded bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-violet-700">الامتحان المضاف هنا يتم إنشاؤه مبدئيًا، وتقدر تكمل أسئلته من فورم 3.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => void createLesson()}
            disabled={busy === 'lesson'}
            className="w-full rounded bg-purple-600 py-2 font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
          >
            {busy === 'lesson' ? 'جارٍ الحفظ...' : editingLessonId ? 'حفظ تعديلات الحصة' : 'إنشاء الحصة'}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">3) فورم إنشاء امتحان (Quiz Builder)</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            className="w-full rounded border px-3 py-2"
            value={examForm.lessonId}
            onChange={(e) => setExamForm((prev) => ({ ...prev, lessonId: e.target.value }))}
          >
            {lessonOptions.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.label}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded border px-3 py-2"
            placeholder="اسم الامتحان"
            value={examForm.title}
            onChange={(e) => setExamForm((prev) => ({ ...prev, title: e.target.value }))}
          />

          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            placeholder="مدة التايمر بالدقائق"
            value={examForm.timeLimit}
            onChange={(e) => setExamForm((prev) => ({ ...prev, timeLimit: e.target.value }))}
          />
        </div>

        <textarea
          className="mt-3 w-full rounded border px-3 py-2"
          placeholder="وصف الامتحان"
          value={examForm.description}
          onChange={(e) => setExamForm((prev) => ({ ...prev, description: e.target.value }))}
        />

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            placeholder="درجة النجاح"
            value={examForm.passingScore}
            onChange={(e) => setExamForm((prev) => ({ ...prev, passingScore: e.target.value }))}
          />
          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            placeholder="عدد المحاولات"
            value={examForm.maxAttempts}
            onChange={(e) => setExamForm((prev) => ({ ...prev, maxAttempts: e.target.value }))}
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={examForm.shuffleQuestions}
                onChange={(e) => setExamForm((prev) => ({ ...prev, shuffleQuestions: e.target.checked }))}
              />
              ترتيب عشوائي
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={examForm.preventBackNavigation}
                onChange={(e) => setExamForm((prev) => ({ ...prev, preventBackNavigation: e.target.checked }))}
              />
              منع الرجوع
            </label>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {examForm.questions.map((question, qIndex) => (
            <div key={qIndex} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">سؤال {qIndex + 1}</h3>
                <button
                  type="button"
                  disabled={examForm.questions.length === 1}
                  onClick={() =>
                    setExamForm((prev) => ({
                      ...prev,
                      questions: prev.questions.filter((_, idx) => idx !== qIndex),
                    }))
                  }
                  className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  حذف السؤال
                </button>
              </div>

              <textarea
                className="mb-2 w-full rounded border px-3 py-2"
                placeholder="نص السؤال"
                value={question.questionText}
                onChange={(e) =>
                  setExamForm((prev) => ({
                    ...prev,
                    questions: prev.questions.map((item, idx) =>
                      idx === qIndex ? { ...item, questionText: e.target.value } : item
                    ),
                  }))
                }
              />

              <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                <input
                  className="rounded border px-3 py-2"
                  placeholder="رابط صورة السؤال (اختياري)"
                  value={question.questionImage}
                  onChange={(e) =>
                    setExamForm((prev) => ({
                      ...prev,
                      questions: prev.questions.map((item, idx) =>
                        idx === qIndex ? { ...item, questionImage: e.target.value } : item
                      ),
                    }))
                  }
                />
                <input
                  type="file"
                  accept="image/*"
                  className="rounded border px-3 py-2"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingQuestionImage(qIndex);
                    void uploadImage(file)
                      .then((url) => {
                        setExamForm((prev) => ({
                          ...prev,
                          questions: prev.questions.map((item, idx) =>
                            idx === qIndex ? { ...item, questionImage: url } : item
                          ),
                        }));
                      })
                      .catch((error) => {
                        alert(error instanceof Error ? error.message : 'فشل رفع صورة السؤال');
                      })
                      .finally(() => setUploadingQuestionImage(null));
                  }}
                />
              </div>
              {uploadingQuestionImage === qIndex ? <p className="mb-2 text-xs text-blue-700">جاري رفع الصورة...</p> : null}

              <div className="mb-2">
                <input
                  type="number"
                  className="w-full rounded border px-3 py-2"
                  placeholder="الدرجة"
                  value={question.points}
                  onChange={(e) =>
                    setExamForm((prev) => ({
                      ...prev,
                      questions: prev.questions.map((item, idx) =>
                        idx === qIndex ? { ...item, points: e.target.value } : item
                      ),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={question.correctIndex === optionIndex}
                      onChange={() =>
                        setExamForm((prev) => ({
                          ...prev,
                          questions: prev.questions.map((item, idx) =>
                            idx === qIndex ? { ...item, correctIndex: optionIndex } : item
                          ),
                        }))
                      }
                    />
                    <input
                      className="flex-1 rounded border px-3 py-2"
                      placeholder={`الخيار ${['أ', 'ب', 'ج', 'د'][optionIndex]}`}
                      value={option}
                      onChange={(e) =>
                        setExamForm((prev) => ({
                          ...prev,
                          questions: prev.questions.map((item, idx) => {
                            if (idx !== qIndex) return item;
                            const nextOptions = [...item.options] as [string, string, string, string];
                            nextOptions[optionIndex] = e.target.value;
                            return { ...item, options: nextOptions };
                          }),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setExamForm((prev) => ({
                ...prev,
                questions: [...prev.questions, newQuestionItem()],
              }))
            }
            className="rounded border border-dashed border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            + إضافة سؤال
          </button>

          <button
            onClick={() => void saveExam()}
            disabled={busy === 'exam'}
            className="rounded bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {busy === 'exam' ? 'جارٍ الحفظ...' : 'حفظ الامتحان'}
          </button>
        </div>
      </div>
    </div>
  );
}
