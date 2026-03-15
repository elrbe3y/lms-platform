'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

type Lesson = {
  id: string;
  title: string;
  description?: string | null;
  isFree: boolean;
  price?: number;
  hasAccess?: boolean;
  parts?: { id: string; title: string }[];
  files?: { id: string; title: string; fileUrl: string; fileType: string | null }[];
  exam?: { id: string; title: string; passingScore: number } | null;
  exams?: { id: string; title: string; passingScore: number }[];
};

type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  modules: Module[];
};

export default function CourseDetailsPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const courseId = String(params?.courseId || '');

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchaseTarget, setPurchaseTarget] = useState<{ lessonId: string; title: string; price: number } | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [topupAmount, setTopupAmount] = useState('');

  useEffect(() => {
    if (!courseId) return;

    async function loadCourse() {
      try {
        const response = await fetch('/api/student/content', { cache: 'no-store', credentials: 'include' });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'تعذر تحميل الكورس');
        }

        const selectedCourse = (data.courses || []).find((item: Course) => item.id === courseId) || null;
        if (!selectedCourse) {
          throw new Error('الكورس غير متاح لحسابك حالياً.');
        }

        setCourse(selectedCourse);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'تعذر تحميل الكورس');
      } finally {
        setLoading(false);
      }
    }

    void loadCourse();
  }, [courseId]);

  async function openLesson(lessonId: string) {
    try {
      const response = await fetch(`/api/student/lessons/${lessonId}/open`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'تعذر فتح الحصة');
      }

      router.push(`/dashboard/lessons/${lessonId}`);
    } catch {
      alert('تعذر فتح الحصة حالياً.');
    }
  }

  async function purchaseLesson(lessonId: string) {
    try {
      const response = await fetch(`/api/student/lessons/${lessonId}/purchase`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'تعذر شراء الحصة');
      }

      alert('تم شراء الحصة بنجاح.');
      setPurchaseTarget(null);
      setRedeemCode('');
      setTopupAmount('');
      await openLesson(lessonId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر شراء الحصة حالياً.');
    }
  }

  async function redeemAndPurchase() {
    if (!purchaseTarget) return;
    if (!redeemCode.trim()) {
      alert('أدخل كود التفعيل أولاً.');
      return;
    }

    const redeemResponse = await fetch('/api/student/wallet/redeem-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code: redeemCode.trim() }),
    });

    const redeemData = await redeemResponse.json();
    if (!redeemResponse.ok) {
      alert(redeemData.error || 'فشل تفعيل الكود');
      return;
    }

    alert(redeemData.message || 'تم شحن الرصيد بالكود.');
    await purchaseLesson(purchaseTarget.lessonId);
  }

  async function submitTopupRequest() {
    if (!purchaseTarget) return;

    const amount = Number(topupAmount || purchaseTarget.price || 0);
    if (!amount || amount <= 0) {
      alert('أدخل قيمة شحن صحيحة.');
      return;
    }

    const response = await fetch('/api/student/wallet/topup-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ amount }),
    });

    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'فشل إرسال طلب الشحن');
      return;
    }

    alert(data.message || 'تم إرسال طلب الشحن بنجاح.');
  }

  const totalLessons = useMemo(
    () => (course ? course.modules.reduce((count, mod) => count + mod.lessons.length, 0) : 0),
    [course]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8" dir="rtl">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-3 text-sm font-semibold text-gray-600">جاري تحميل الكورس...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
        <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-bold">{error || 'الكورس غير متاح'}</p>
          <Link href="/dashboard/courses" className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            الرجوع للكورسات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="relative h-64 w-full bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 md:h-72">
            {course.thumbnail ? (
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
            <div className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-blue-800">
              {totalLessons.toLocaleString('ar-EG')} محاضرة
            </div>
            <div className="absolute bottom-4 right-4 left-4 text-white">
              <div className="mb-2 inline-flex rounded-md bg-blue-100/90 px-3 py-1 text-xs font-bold text-blue-800">
                اللغة العربية - الصف الثالث الثانوي
              </div>
              <h1 className="text-2xl font-black leading-tight md:text-3xl">{course.title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-white/90">
                {course.description || 'كورس كامل منظم إلى محاضرات وأقسام متعددة.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold text-gray-600">اختر المحاضرة وابدأ مباشرة من نفس الصفحة</div>
            <Link
              href="/dashboard/courses"
              className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              كل الكورسات
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {course.modules.map((module, moduleIndex) => (
            <section key={module.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
                <h2 className="text-base font-black text-gray-900 md:text-lg">المحاضرة {moduleIndex + 1}: {module.title}</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                  {module.lessons.length.toLocaleString('ar-EG')} درس
                </span>
              </div>

              <div className="space-y-3">
                {module.lessons.map((lesson) => (
                  <article key={lesson.id} className="rounded-xl border border-blue-100 bg-gray-50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 md:text-base">{lesson.title}</h3>
                        <p className="mt-1 text-xs text-gray-600">
                          {lesson.parts?.length || 0} أجزاء فيديو • {lesson.files?.length || 0} ملفات
                        </p>
                        <p className="mt-1 text-xs font-semibold text-blue-700">
                          {lesson.isFree || (lesson.price ?? 0) <= 0 ? 'مجاني' : `${lesson.price} جنيه`}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {lesson.hasAccess || lesson.isFree || (lesson.price ?? 0) <= 0 ? (
                          <button
                            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700"
                            onClick={() => void openLesson(lesson.id)}
                          >
                            دخول الحصة
                          </button>
                        ) : (
                          <button
                            className="rounded-full bg-amber-600 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-amber-700"
                            onClick={() =>
                              setPurchaseTarget({
                                lessonId: lesson.id,
                                title: lesson.title,
                                price: Number(lesson.price || 0),
                              })
                            }
                          >
                            شراء الحصة
                          </button>
                        )}

                        {(lesson.exams && lesson.exams.length > 0 ? lesson.exams : lesson.exam ? [lesson.exam] : []).map((exam) =>
                          lesson.hasAccess || lesson.isFree || (lesson.price ?? 0) <= 0 ? (
                            <Link
                              key={exam.id}
                              href={`/dashboard/exams/${exam.id}`}
                              className="rounded-full border border-emerald-300 px-4 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50"
                            >
                              امتحان: {exam.title}
                            </Link>
                          ) : (
                            <span
                              key={exam.id}
                              className="rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-xs font-extrabold text-gray-600"
                            >
                              الامتحان متاح بعد الشراء
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {purchaseTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">شراء الحصة: {purchaseTarget.title}</h3>
            <p className="mt-1 text-sm text-gray-600">السعر: {purchaseTarget.price.toLocaleString('ar-EG')} ج.م</p>

            <div className="mt-4 space-y-3">
              <button
                onClick={() => void purchaseLesson(purchaseTarget.lessonId)}
                className="w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                الدفع من الرصيد مباشرة
              </button>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 text-sm font-semibold text-gray-800">التفعيل المباشر بالكود</div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded border px-3 py-2 text-sm"
                    placeholder="أدخل كود التفعيل"
                    value={redeemCode}
                    onChange={(event) => setRedeemCode(event.target.value)}
                  />
                  <button
                    onClick={() => void redeemAndPurchase()}
                    className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    تفعيل
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 text-sm font-semibold text-gray-800">طلب شحن يدوي</div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 rounded border px-3 py-2 text-sm"
                    placeholder="قيمة الشحن"
                    value={topupAmount}
                    onChange={(event) => setTopupAmount(event.target.value)}
                  />
                  <button
                    onClick={() => void submitTopupRequest()}
                    className="rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                  >
                    إرسال
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setPurchaseTarget(null);
                setRedeemCode('');
                setTopupAmount('');
              }}
              className="mt-4 w-full rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              إغلاق
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
