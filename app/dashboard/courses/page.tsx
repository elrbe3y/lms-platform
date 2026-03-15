'use client';

import { useEffect, useState } from 'react';
import { CourseCard } from '@/components/student/CourseCard';

interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  isFree: boolean;
  price?: number;
  hasAccess?: boolean;
  parts?: { id: string; title: string; duration: number | null; provider: string }[];
  files?: { id: string; title: string; fileUrl: string; fileType: string | null }[];
  video: { id: string; title: string; provider: string; duration: number | null } | null;
  exam: { id: string; title: string; passingScore: number } | null;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  price?: number;
  hasCourseAccess?: boolean;
  modules: Module[];
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'free'>('all');

  async function purchaseCourse(courseId: string) {
    try {
      const response = await fetch(`/api/student/courses/${courseId}/purchase`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'تعذر شراء الكورس');
      }

      if (typeof data.balance === 'number') {
        setWalletBalance(data.balance);
      }

      const refreshed = await fetch('/api/student/content', { cache: 'no-store', credentials: 'include' });
      const refreshedData = await refreshed.json();
      if (refreshed.ok && refreshedData.success) {
        setCourses(refreshedData.courses || []);
      }

      alert('تم شراء الكورس بنجاح.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'تعذر شراء الكورس حالياً.');
    }
  }

  useEffect(() => {
    async function loadContent() {
      try {
        const [contentResponse, walletResponse] = await Promise.all([
          fetch('/api/student/content', { cache: 'no-store', credentials: 'include' }),
          fetch('/api/student/wallet', { cache: 'no-store', credentials: 'include' }),
        ]);

        const data = await contentResponse.json();

        if (!contentResponse.ok) {
          throw new Error(data.error || 'فشل تحميل المحتوى');
        }

        if (walletResponse.ok) {
          const walletData = await walletResponse.json();
          setWalletBalance(walletData.wallet?.balance ?? null);
        }

        setCourses(data.courses || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشل تحميل المحتوى');
      } finally {
        setLoading(false);
      }
    }

    void loadContent();
  }, []);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const lessons = course.modules.flatMap((module) => module.lessons);
    const hasFreeLesson = lessons.some((lesson) => lesson.isFree || (lesson.price ?? 0) <= 0);
    const hasAccessLesson = lessons.some((lesson) => lesson.hasAccess || lesson.isFree || (lesson.price ?? 0) <= 0);

    if (filterMode === 'free') return matchesSearch && hasFreeLesson;
    if (filterMode === 'available') return matchesSearch && hasAccessLesson;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-semibold">جاري تحميل الدورات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 p-8" dir="rtl">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-red-700 max-w-md text-center">
          <p className="font-semibold mb-2 inline-flex items-center gap-2"><AlertIcon className="h-5 w-5" /> حدث خطأ</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 inline-flex items-center gap-3">
          <BookIcon className="h-9 w-9 text-blue-700" />
          جميع الدورات التعليمية
        </h1>
        <p className="text-gray-600">اختر الدورة التي تريد التعرف عليها</p>
        {walletBalance !== null && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <WalletIcon className="h-4 w-4" />
            <span>رصيد المحفظة:</span>
            <span>{walletBalance.toLocaleString('ar-EG')} ج.م</span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            كل الدورات
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('available')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filterMode === 'available'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            المتاحة لك
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('free')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filterMode === 'free'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            المجانية
          </button>
        </div>

        <div className="relative w-full max-w-lg">
          <input
            type="text"
            placeholder="ابحث عن دورة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 pr-12 rounded-full border-2 border-gray-300 shadow-md focus:outline-none focus:border-blue-500 transition-colors"
          />
          <SearchIcon className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Empty State */}
      {filteredCourses.length === 0 ? (
        <div className="rounded-lg bg-white p-8 shadow-md text-center border border-gray-200 max-w-2xl mx-auto">
          <p className="text-gray-500 text-lg mb-2">
            {searchQuery ? 'لم يتم العثور على دورات' : 'لا توجد دورات متاحة'}
          </p>
          <p className="text-gray-400 text-sm">
            {searchQuery ? 'حاول البحث بكلمة أخرى' : 'تواصل مع الأدمن للحصول على الوصول'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 mb-8">
            {filteredCourses.map((course) => {
              const totalLessons = course.modules.reduce((count, mod) => count + mod.lessons.length, 0);
              const videosCount = course.modules.reduce(
                (count, mod) => count + mod.lessons.filter((les) => les.video).length,
                0
              );
              const examsCount = course.modules.reduce(
                (count, mod) => count + mod.lessons.filter((les) => les.exam).length,
                0
              );

              return (
                <CourseCard
                  key={course.id}
                  title={course.title}
                  description={course.description}
                  thumbnail={course.thumbnail}
                  topBadgeText={`${totalLessons} محاضرة`}
                  stats={[
                    { label: 'محاضرات', value: course.modules.length },
                    { label: 'فيديوهات', value: videosCount },
                    { label: 'امتحانات', value: examsCount },
                  ]}
                  footerHint={
                    course.hasCourseAccess ? (
                      <span className="text-xs text-gray-600">الكورس متاح لك الآن</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-700">
                          السعر: {(course.price ?? 0).toLocaleString('ar-EG')} ج.م
                        </span>
                        <button
                          type="button"
                          onClick={() => void purchaseCourse(course.id)}
                          className="rounded-full bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-700"
                        >
                          شراء الكورس
                        </button>
                      </div>
                    )
                  }
                  actionHref={`/dashboard/courses/${course.id}`}
                  actionLabel={course.hasCourseAccess ? 'دخول للكورس' : 'عرض المحتويات'}
                />
              );
            })}
          </div>

          {/* Results Counter */}
          <div className="text-center text-gray-600 text-sm">
            عدد الدورات: <span className="font-semibold">{filteredCourses.length}</span>
          </div>
        </>
      )}
    </div>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5h16" />
      <path d="M6 4h10a3 3 0 0 1 3 3v12H9a3 3 0 0 0-3 3z" />
      <path d="M6 4a2 2 0 0 0-2 2v13.5a2 2 0 0 0 2 2" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
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

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  );
}
