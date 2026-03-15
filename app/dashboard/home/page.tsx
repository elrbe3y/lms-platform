'use client';

import { useEffect, useState } from 'react';

interface StudentStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalLessons: number;
  completedLessons: number;
  averageScore: number;
}

export default function DashboardHomePage() {
  const [stats, setStats] = useState<StudentStats>({
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    totalLessons: 0,
    completedLessons: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch('/api/student/dashboard/stats', { cache: 'no-store', credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'فشل تحميل الإحصائيات');
        }

        setStats(data.stats);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشل تحميل الإحصائيات');
      } finally {
        setLoading(false);
      }
    }

    void loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">جاري تحميل الإحصائيات...</p>
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
    <div className="p-8" dir="rtl">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 inline-flex items-center gap-3">
          <HelloIcon className="h-9 w-9 text-blue-700" />
          أهلاً بك مجدداً!
        </h1>
        <p className="text-gray-600 mt-2">إليك ملخص تقدمك التعليمي</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Courses Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">إجمالي الدورات</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCourses}</p>
            </div>
            <BookIcon className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        {/* Completed Courses Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">الدورات المكتملة</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedCourses}</p>
            </div>
            <CheckIcon className="h-10 w-10 text-green-500" />
          </div>
        </div>

        {/* In Progress Courses Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">الدورات الجارية</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.inProgressCourses}</p>
            </div>
            <ClockIcon className="h-10 w-10 text-yellow-500" />
          </div>
        </div>

        {/* Total Lessons Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">إجمالي الدروس</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalLessons}</p>
            </div>
            <VideoIcon className="h-10 w-10 text-purple-500" />
          </div>
        </div>

        {/* Completed Lessons Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">الدروس المكتملة</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.completedLessons}</p>
            </div>
            <TargetIcon className="h-10 w-10 text-indigo-500" />
          </div>
        </div>

        {/* Average Score Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">متوسط النقاط</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.averageScore}%</p>
            </div>
            <StarIcon className="h-10 w-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 inline-flex items-center gap-2">
          <ChartIcon className="h-6 w-6 text-blue-700" />
          تقدمك
        </h2>

        {/* Overall Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 font-semibold">إجمالي التقدم</span>
            <span className="text-gray-600">
              {stats.totalLessons > 0
                ? Math.round((stats.completedLessons / stats.totalLessons) * 100)
                : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${
                  stats.totalLessons > 0
                    ? Math.round((stats.completedLessons / stats.totalLessons) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Motivation Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-gray-700">
            ممتاز! أنت تحقق تقدماً جيداً. استمر على هذا النحو.
          </p>
        </div>
      </div>
    </div>
  );
}

function HelloIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /><circle cx="12" cy="12" r="9" /></svg>;
}

function BookIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5h16" /><path d="M6 4h10a3 3 0 0 1 3 3v12H9a3 3 0 0 0-3 3z" /><path d="M6 4a2 2 0 0 0-2 2v13.5a2 2 0 0 0 2 2" /></svg>;
}

function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>;
}

function ClockIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
}

function VideoIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="14" height="12" rx="2" /><path d="M17 10l4-2v8l-4-2z" /></svg>;
}

function TargetIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="2" /></svg>;
}

function StarIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3z" /></svg>;
}

function ChartIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14v4" /><path d="M12 10v8" /><path d="M17 6v12" /></svg>;
}
