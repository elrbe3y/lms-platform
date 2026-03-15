'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CourseCard } from '@/components/student/CourseCard';

interface MyCourse {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  enrolledAt: string;
  progress: number; // نسبة التقدم 0-100
  status: 'completed' | 'in-progress' | 'not-started';
  source: 'PURCHASED' | 'GRANTED' | 'OPENED' | 'ENROLLED';
  lessons: {
    total: number;
    completed: number;
  };
  nextLesson?: {
    id: string;
    title: string;
  };
}

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await fetch('/api/student/my-courses', { cache: 'no-store', credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'فشل تحميل الكورسات');
        }

        setCourses(data.courses || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشل تحميل الكورسات');
      } finally {
        setLoading(false);
      }
    }

    void loadCourses();
  }, []);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    return course.status === filter;
  });

  const getStatusBadge = (status: MyCourse['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
            <CheckCircleIcon className="h-3.5 w-3.5" /> مكتملة
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
            <ProgressIcon className="h-3.5 w-3.5" /> قيد التقدم
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
            <CircleIcon className="h-3.5 w-3.5" /> لم تبدأ
          </span>
        );
    }
  };

  const getSourceBadge = (source: MyCourse['source']) => {
    switch (source) {
      case 'PURCHASED':
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">شراء حصة</span>;
      case 'GRANTED':
        return <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-[11px] font-semibold text-purple-800">تفعيل يدوي</span>;
      case 'OPENED':
        return <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-semibold text-cyan-800">فتح حصة مجانية</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">تسجيل مباشر</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-semibold">جاري تحميل كورساتك...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8" dir="rtl">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 inline-flex items-center gap-3">
          <GraduationIcon className="h-9 w-9 text-blue-700" />
          كورساتي
        </h1>
        <p className="text-gray-600">متابعة تقدمك في الدورات المشترك بها</p>
      </div>

      {/* Filter + Search */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            جميع الدورات ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('in-progress')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === 'in-progress'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            قيد التقدم ({courses.filter((c) => c.status === 'in-progress').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            مكتملة ({courses.filter((c) => c.status === 'completed').length})
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

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg mb-2">لا توجد دورات في هذه الفئة</p>
          <Link
            href="/dashboard/courses"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ابدأ دورة جديدة
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              title={course.title}
              description={course.description}
              thumbnail={course.thumbnail}
              topBadgeText={`${course.lessons.total} محاضرة`}
              tagText="كورساتي"
              extraBadges={
                <>
                  {getSourceBadge(course.source)}
                  {getStatusBadge(course.status)}
                </>
              }
              stats={[
                { label: 'مكتمل', value: course.lessons.completed },
                { label: 'إجمالي', value: course.lessons.total },
                { label: 'تقدم', value: `${course.progress}%` },
              ]}
              footerHint={
                course.nextLesson ? (
                  <div>
                    <p className="text-xs text-gray-600">الدرس التالي</p>
                    <p className="font-semibold text-gray-900 text-sm line-clamp-1">{course.nextLesson.title}</p>
                  </div>
                ) : (
                  <div className="text-xs text-green-600 font-semibold inline-flex items-center gap-1">
                    <CheckCircleIcon className="h-4 w-4" /> اكتملت الدروس
                  </div>
                )
              }
              actionHref={course.nextLesson ? `/dashboard/lessons/${course.nextLesson.id}` : `/dashboard/courses/${course.id}`}
              actionLabel="إكمال الدراسة"
              fallbackIcon={<GraduationIcon className="h-14 w-14 text-white" />}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GraduationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10l-10-5L2 10l10 5 10-5z" />
      <path d="M6 12v5a6 3 0 0 0 12 0v-5" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
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
