'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface LessonDetails {
  id: string;
  title: string;
  description: string | null;
  isFree: boolean;
  price: number;
  module: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
    };
  };
  parts: {
    id: string;
    order: number;
    sectionTitle: string;
    title: string;
    description: string | null;
    provider: string;
    duration: number | null;
    videoUrl: string;
    streamingUrl: string | null;
  }[];
  files: {
    id: string;
    order: number;
    sectionTitle: string;
    title: string;
    fileUrl: string;
    fileType: string | null;
  }[];
  exam?: {
    id: string;
    title: string;
    passingScore: number;
  } | null;
  exams?: {
    id: string;
    title: string;
    passingScore: number;
  }[];
}

function getEmbedUrl(url: string) {
  if (!url) return null;

  if (url.includes('youtube.com/watch?v=')) {
    const id = new URL(url).searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }

  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }

  return url;
}

export default function LessonPage({ params }: { params: { lessonId: string } }) {
  const [lesson, setLesson] = useState<LessonDetails | null>(null);
  const [activePartId, setActivePartId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadLesson() {
      try {
        const response = await fetch(`/api/student/lessons/${params.lessonId}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'فشل تحميل بيانات الحصة');
        }

        setLesson(data.lesson);

        await fetch(`/api/student/lessons/${params.lessonId}/open`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشل تحميل بيانات الحصة');
      } finally {
        setLoading(false);
      }
    }

    void loadLesson();
  }, [params.lessonId]);

  useEffect(() => {
    if (!lesson || lesson.parts.length === 0) return;
    if (activePartId) return;
    setActivePartId(lesson.parts[0].id);
  }, [activePartId, lesson]);

  const activePart = useMemo(() => {
    if (!lesson) return null;
    if (activePartId) {
      return lesson.parts.find((part) => part.id === activePartId) ?? null;
    }
    return lesson.parts[0] ?? null;
  }, [activePartId, lesson]);

  const videoUrl = useMemo(() => {
    if (!lesson) return null;
    if (!activePart) return null;
    return getEmbedUrl(activePart.streamingUrl || activePart.videoUrl);
  }, [activePart, lesson]);

  const contentSections = useMemo(() => {
    if (!lesson) return [] as Array<{
      title: string;
      parts: LessonDetails['parts'];
      files: LessonDetails['files'];
      minOrder: number;
    }>;

    const sectionMap = new Map<string, { title: string; parts: LessonDetails['parts']; files: LessonDetails['files']; minOrder: number }>();

    for (const part of lesson.parts) {
      const title = (part.sectionTitle || 'المحتوى الرئيسي').trim() || 'المحتوى الرئيسي';
      if (!sectionMap.has(title)) {
        sectionMap.set(title, { title, parts: [], files: [], minOrder: part.order });
      }
      const section = sectionMap.get(title);
      if (section) {
        section.parts.push(part);
        section.minOrder = Math.min(section.minOrder, part.order);
      }
    }

    for (const file of lesson.files) {
      const title = (file.sectionTitle || 'المحتوى الرئيسي').trim() || 'المحتوى الرئيسي';
      if (!sectionMap.has(title)) {
        sectionMap.set(title, { title, parts: [], files: [], minOrder: file.order });
      }
      const section = sectionMap.get(title);
      if (section) {
        section.files.push(file);
        section.minOrder = Math.min(section.minOrder, file.order);
      }
    }

    return Array.from(sectionMap.values())
      .map((section) => ({
        ...section,
        parts: [...section.parts].sort((a, b) => a.order - b.order),
        files: [...section.files].sort((a, b) => a.order - b.order),
      }))
      .sort((a, b) => a.minOrder - b.minOrder);
  }, [lesson]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">جاري تحميل الحصة...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
        <div className="rounded-xl border border-red-200 bg-white p-6 text-red-700 text-center shadow-sm">
          <p className="font-semibold mb-2">تعذر فتح الحصة</p>
          <p>{error || 'الحصة غير متاحة حالياً'}</p>
          <Link href="/dashboard/courses" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            العودة إلى الكورسات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-7 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-gray-500">{lesson.module.course.title} / {lesson.module.title}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{lesson.title}</h1>
            </div>
            <div className="rounded-full bg-amber-100 text-amber-700 px-4 py-2 text-sm font-semibold self-start">
              {lesson.isFree || lesson.price <= 0 ? 'الحصة مجانية' : `سعر الحصة: ${lesson.price} جنيه`}
            </div>
          </div>

          {lesson.description ? <p className="mt-3 text-gray-600 leading-7">{lesson.description}</p> : null}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm">
          {videoUrl ? (
            <div className="aspect-video w-full">
              <iframe
                src={videoUrl}
                title={activePart?.title || lesson.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video w-full flex items-center justify-center text-gray-300 bg-gray-900">
              لا يوجد فيديو مرفوع لهذه الحصة بعد
            </div>
          )}
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-7 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">محتوى الحصة</h2>
          {contentSections.length > 0 ? (
            <div className="space-y-3">
              {contentSections.map((section) => {
                const isOpen = expandedSection === section.title;
                return (
                  <div key={section.title} className="rounded-xl border border-gray-200 bg-gray-50">
                    <button
                      onClick={() => setExpandedSection((prev) => (prev === section.title ? null : section.title))}
                      className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-right"
                    >
                      <span className="font-semibold text-gray-900">{section.title}</span>
                      <svg
                        className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {isOpen ? (
                      <div className="space-y-3 border-t border-gray-200 px-4 py-3">
                        {section.parts.map((part, index) => (
                          <div key={part.id} className={`rounded-lg border p-3 ${activePartId === part.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                            <div className="flex items-center justify-between gap-4">
                              <p className="font-semibold text-gray-900">{index + 1}. {part.title}</p>
                              <span className="text-xs text-gray-500">{part.duration ? `${part.duration} دقيقة` : 'بدون مدة'}</span>
                            </div>
                            {part.description ? <p className="mt-1 text-sm text-gray-600">{part.description}</p> : null}
                            <div className="mt-2 flex justify-end">
                              <button
                                onClick={() => setActivePartId(part.id)}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                              >
                                فتح الفيديو
                              </button>
                            </div>
                          </div>
                        ))}

                        {section.files.map((file) => (
                          <a
                            key={file.id}
                            href={file.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg border border-gray-200 bg-white p-3 hover:border-blue-400 transition-colors"
                          >
                            <p className="font-semibold text-gray-900">{file.title}</p>
                            <p className="text-xs text-gray-500">{file.fileType || 'ملف'}</p>
                          </a>
                        ))}

                        {section.parts.length === 0 && section.files.length === 0 ? (
                          <p className="text-sm text-gray-500">لا يوجد محتوى داخل هذا القسم.</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">لا توجد أقسام مضافة حالياً.</p>
          )}
        </section>

        {(lesson.exams && lesson.exams.length > 0) || lesson.exam ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 md:p-7 shadow-sm">
            <h2 className="text-xl font-bold text-emerald-700 mb-2">اختبار الحصة</h2>
            <div className="space-y-2">
              {(lesson.exams && lesson.exams.length > 0 ? lesson.exams : lesson.exam ? [lesson.exam] : []).map((exam) => (
                <div key={exam.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                  <p className="text-sm font-semibold text-emerald-900">{exam.title}</p>
                  <Link
                    href={`/dashboard/exams/${exam.id}`}
                    className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                  >
                    بدء الامتحان
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
