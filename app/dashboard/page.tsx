'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CourseCard } from '@/components/student/CourseCard';

interface FeaturedCourse {
  id: string;
  title: string;
  thumbnail?: string | null;
  featuredPartsCount: number;
  price?: number;
  hasCourseAccess?: boolean;
}

interface HonorBoardStudent {
  id: string;
  studentId: string;
  reason: string;
  createdAt: string;
  student: {
    fullName: string;
    grade: string;
    schoolName: string;
  };
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface StudentSummary {
  walletBalance: number;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [honorBoard, setHonorBoard] = useState<HonorBoardStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(null);
  const [balancePulse, setBalancePulse] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const honorBoardScrollRef = useRef<HTMLDivElement | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const quickMenuRef = useRef<HTMLDivElement | null>(null);

  const scrollHonorBoard = (direction: 'prev' | 'next') => {
    const container = honorBoardScrollRef.current;
    if (!container) return;

    const delta = 280;
    container.scrollBy({
      left: direction === 'next' ? -delta : delta,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    async function loadContent() {
      try {
        const response = await fetch('/api/student/featured-content', { cache: 'no-store', credentials: 'include' });
        const data = await response.json();

        if (data.success) {
          setFeaturedCourses(data.featuredCourses || []);
          setHonorBoard(data.honorBoard || []);
        }
      } catch (e) {
        console.error('خطأ في تحميل المحتوى:', e);
      } finally {
        setLoading(false);
      }
    }

    async function loadNotifications() {
      try {
        const response = await fetch('/api/student/notifications', { cache: 'no-store', credentials: 'include' });
        const data = await response.json();
        if (response.ok && data.success) {
          setNotifications(data.notifications || []);
        }
      } catch {
        // تجاهل الأخطاء
      }
    }

    async function loadStudentSummary() {
      try {
        const response = await fetch('/api/student/profile', { cache: 'no-store', credentials: 'include' });
        const data = await response.json();
        if (response.ok && data.success && data.user) {
          setStudentSummary({ walletBalance: Number(data.user.walletBalance || 0) });
        }
      } catch {
        setStudentSummary(null);
      }
    }

    void loadContent();
    void loadNotifications();
    void loadStudentSummary();
  }, []);

  useEffect(() => {
    if (studentSummary?.walletBalance === undefined) return;
    setBalancePulse(true);
    const timer = setTimeout(() => setBalancePulse(false), 800);
    return () => clearTimeout(timer);
  }, [studentSummary?.walletBalance]);

  useEffect(() => {
    if (!showNotifications && !showQuickMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (quickMenuRef.current && !quickMenuRef.current.contains(target)) {
        setShowQuickMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowQuickMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showNotifications, showQuickMenu]);

  const handleLogout = () => {
    localStorage.removeItem('session');
    router.push('/login');
  };

  const purchaseFeaturedCourse = async (courseId: string) => {
    try {
      const response = await fetch(`/api/student/courses/${courseId}/purchase`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'تعذر شراء الكورس');
      }

      const [featuredResponse, profileResponse] = await Promise.all([
        fetch('/api/student/featured-content', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/student/profile', { cache: 'no-store', credentials: 'include' }),
      ]);

      if (featuredResponse.ok) {
        const featuredData = await featuredResponse.json();
        if (featuredData.success) {
          setFeaturedCourses(featuredData.featuredCourses || []);
        }
      }

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.success && profileData.user) {
          setStudentSummary({ walletBalance: Number(profileData.user.walletBalance || 0) });
        }
      }

      alert('تم شراء الكورس بنجاح.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'تعذر شراء الكورس حالياً.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-semibold">جاري تحميل المحتوى...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-4 md:p-6" dir="rtl">
      <div className="mb-5 flex items-center justify-between border-b border-gray-300 px-2 pb-3">
        <h1 className="text-2xl font-bold text-gray-900">الصفحة الرئيسية</h1>
        <div className="relative" ref={quickMenuRef}>
          <button
            type="button"
            onClick={() => setShowQuickMenu((prev) => !prev)}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-200"
            aria-label="المزيد"
          >
            <DotsIcon className="h-5 w-5" />
          </button>

          {showQuickMenu && (
            <div className="absolute left-0 z-30 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              <Link
                href="/dashboard/profile"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <span>الملف الشخصي</span>
                <UserAvatarIcon className="h-4 w-4" />
              </Link>

              <a
                href="mailto:support@example.com"
                onClick={() => setShowQuickMenu(false)}
                className="mt-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <span>الدعم الفني</span>
                <SupportIcon className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <span>تسجيل الخروج</span>
                <LogoutIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative mb-8 overflow-visible rounded-xl bg-gradient-to-r from-blue-700 to-blue-900 px-5 py-5 text-white">
        <div className="absolute left-3 top-3" ref={notificationsMenuRef}>
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative rounded-full p-2 text-white hover:bg-white/10"
            aria-label="الإشعارات"
          >
            <BellIcon className="h-6 w-6" />
            {notifications.length > 0 ? (
              <span className="absolute -left-1 -top-1 min-w-5 rounded-full border border-blue-900 bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            ) : null}
          </button>

          {showNotifications && (
            <div className="absolute left-0 z-20 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-3 text-gray-900 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold">الإشعارات</h3>
                <span className="text-xs text-gray-500">{notifications.length}</span>
              </div>
              {notifications.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">لا توجد إشعارات حالياً.</div>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {notifications.slice(0, 8).map((note) => (
                    <div key={note.id} className="rounded-lg border border-gray-200 p-2">
                      <div className="text-sm font-semibold text-gray-900">{note.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-gray-600">{note.message}</div>
                      <div className="mt-1 text-[11px] text-gray-400">{new Date(note.createdAt).toLocaleString('ar-EG')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-6">
          <div className="text-right">
            <h2 className="text-3xl font-black leading-tight md:text-4xl">أهلاً بيك</h2>
            <p className="mt-1 text-lg font-bold md:text-2xl">جاهز لمغامرتنا النهاردة؟</p>
            <Link
              href="/dashboard/wallet"
              className="mt-4 inline-block rounded-lg bg-white px-4 py-1.5 text-sm font-bold text-blue-800 hover:bg-gray-100"
            >
              شحن المحفظة
            </Link>
          </div>
          <div
            className={`self-end rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white transition-transform ${
              balancePulse ? 'scale-[1.03]' : 'scale-100'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <WalletBadgeIcon className="h-4 w-4" />
              الرصيد: {Number(studentSummary?.walletBalance || 0).toLocaleString('ar-EG')} جنيه
            </span>
          </div>
        </div>
      </div>

      {/* Honor Board Section */}
      <div className="mb-8">
        <h2 className="mb-5 text-2xl font-black text-gray-900 md:text-3xl">
          لوحة الشرف
        </h2>
        {honorBoard.length > 0 ? (
          <div className="relative rounded-none bg-transparent px-1 py-2 md:px-2">
            <button
              type="button"
              onClick={() => scrollHonorBoard('prev')}
              className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 text-gray-500 hover:text-gray-700"
              aria-label="السابق"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => scrollHonorBoard('next')}
              className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 text-gray-500 hover:text-gray-700"
              aria-label="التالي"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>

            <div
              ref={honorBoardScrollRef}
              className="flex items-start gap-6 overflow-x-auto px-6 py-1 scroll-smooth md:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {honorBoard.map((entry) => (
                <div key={entry.id} className="w-[165px] shrink-0 text-center md:w-[175px]">
                  <div className="relative mx-auto mb-3 h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center md:h-24 md:w-24">
                    <UserAvatarIcon className="h-10 w-10 text-slate-400 md:h-12 md:w-12" />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-indigo-800 px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {entry.reason?.slice(0, 12) || '15/15'}
                    </div>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-gray-900 leading-tight md:text-base" style={{ fontFamily: 'inherit' }}>
                    {entry.student.fullName}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-gray-500 md:text-sm">{entry.student.schoolName}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            لا توجد عناصر حالياً في لوحة الشرف.
          </div>
        )}
      </div>

      {/* Featured Courses Section */}
      <div className="mb-8">
        {featuredCourses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((course) => (
              <CourseCard
                key={course.id}
                title={course.title}
                thumbnail={course.thumbnail}
                topBadgeText={`${course.featuredPartsCount} محاضرة`}
                stats={[
                  { label: 'محاضرات', value: course.featuredPartsCount },
                  { label: 'مميز', value: course.featuredPartsCount },
                  { label: 'امتحانات', value: 0 },
                ]}
                footerHint={
                  course.hasCourseAccess ? (
                    <span className="text-xs text-gray-600">الكورس متاح لك الآن</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-700">
                        السعر: {Number(course.price || 0).toLocaleString('ar-EG')} ج.م
                      </span>
                      <button
                        type="button"
                        onClick={() => void purchaseFeaturedCourse(course.id)}
                        className="rounded-full bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-700"
                      >
                        شراء الكورس
                      </button>
                    </div>
                  )
                }
                actionHref={`/dashboard/courses/${course.id}`}
                actionLabel={course.hasCourseAccess ? 'دخول للكورس' : 'عرض المحتويات'}
                fallbackIcon={<PlayIcon className="h-14 w-14 text-white/85" />}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            لا توجد كورسات مثبتة حالياً، راجع تبويب &quot;الفيديوهات المثبتة&quot; من الأدمن.
          </div>
        )}
      </div>

    </div>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
}

function WalletBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7h18a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3z" />
      <path d="M21 10h-4a2 2 0 0 0 0 4h4" />
      <path d="M3 7V5a2 2 0 0 1 2-2h12" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </svg>
  );
}

function UserAvatarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.314 0-6 2.015-6 4.5V20h12v-1.5c0-2.485-2.686-4.5-6-4.5Z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
