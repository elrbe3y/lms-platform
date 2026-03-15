'use client';

import { useEffect, useState } from 'react';

type AboutStats = {
  activeStudents: number;
  educationalSessions: number;
  interactiveExams: number;
};

export default function AboutPage() {
  const [stats, setStats] = useState<AboutStats>({
    activeStudents: 0,
    educationalSessions: 0,
    interactiveExams: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const response = await fetch('/api/student/about-stats', { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        if (!cancelled && data?.success && data?.stats) {
          setStats({
            activeStudents: Number(data.stats.activeStudents) || 0,
            educationalSessions: Number(data.stats.educationalSessions) || 0,
            interactiveExams: Number(data.stats.interactiveExams) || 0,
          });
        }
      } catch {
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCount = (value: number) => {
    const localized = value.toLocaleString('ar-EG');
    return value > 0 ? `+${localized}` : localized;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6" dir="rtl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">عن المنصة</h1>
        <p className="mt-3 text-sm text-gray-600">
          منصة محمد الربيعي التعليمية تقدم محتوى منظم ومتابعة دقيقة للطلاب مع تجربة تعلم مريحة.
        </p>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <div className="text-xl font-bold text-gray-900">{formatCount(stats.activeStudents)}</div>
            <div className="text-xs text-gray-600">طالب نشط</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <div className="text-xl font-bold text-gray-900">{formatCount(stats.educationalSessions)}</div>
            <div className="text-xs text-gray-600">حصة تعليمية</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <div className="text-xl font-bold text-gray-900">{formatCount(stats.interactiveExams)}</div>
            <div className="text-xs text-gray-600">امتحان تفاعلي</div>
          </div>
        </div>

        <div className="mt-6 space-y-2 text-sm text-gray-700">
          <p>هدفنا: تبسيط التعلم ورفع مستوى الأداء.</p>
          <p>تجربة تعلم شاملة تشمل الدروس، الامتحانات، والمتابعة المالية.</p>
          <p>تحديثات مستمرة للمحتوى ليتوافق مع المنهج.</p>
        </div>
      </div>
    </div>
  );
}
