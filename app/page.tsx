/**
 * 🏠 الصفحة الرئيسية - منصة محمد الربيعي التعليمية
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<'ADMIN' | 'STUDENT' | null>(null);

  async function handleQuickLogin(role: 'ADMIN' | 'STUDENT') {
    setLoadingRole(role);

    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل الدخول التجريبي');
      }

      router.push(data.redirectTo || (role === 'ADMIN' ? '/admin' : '/dashboard'));
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'فشل الدخول التجريبي');
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-900" dir="rtl">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-6xl font-bold text-white">
            🎓 منصة محمد الربيعي التعليمية
          </h1>
          <p className="mb-8 text-2xl text-blue-100">
            رحلتك نحو التفوق في الفيزياء - الثانوية العامة
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleQuickLogin('ADMIN')}
              disabled={loadingRole !== null}
              className="rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-lg transition-all hover:bg-blue-50 hover:scale-105 disabled:opacity-60"
            >
              {loadingRole === 'ADMIN' ? 'جاري الدخول...' : 'دخول الأدمن مباشرة'}
            </button>
            <button
              type="button"
              onClick={() => void handleQuickLogin('STUDENT')}
              disabled={loadingRole !== null}
              className="rounded-lg border-2 border-white px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-white hover:text-blue-600 disabled:opacity-60"
            >
              {loadingRole === 'STUDENT' ? 'جاري الدخول...' : 'دخول الطالب مباشرة'}
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="🎥"
            title="فيديوهات تعليمية متقدمة"
            description="شروحات مفصلة بجودة عالية مع حماية كاملة ضد التسريب"
          />
          <FeatureCard
            icon="📚"
            title="ملخصات وملفات PDF"
            description="مواد تعليمية مُنظمة ومُحدثة لكل درس"
          />
          <FeatureCard
            icon="✍️"
            title="امتحانات تفاعلية"
            description="اختبارات ذاتية مع تصحيح فوري ودرجات تلقائية"
          />
          <FeatureCard
            icon="📊"
            title="تتبع التقدم"
            description="راقب تقدمك ونسبة إكمالك لكل كورس"
          />
          <FeatureCard
            icon="💳"
            title="دفع آمن ومرن"
            description="دفع عبر Fawry/Paymob أو باستخدام الأكواد"
          />
          <FeatureCard
            icon="🔒"
            title="أمان متقدم"
            description="حماية حسابك وبياناتك بأعلى معايير الأمان"
          />
        </div>

        {/* Stats Section */}
        <div className="mt-16 rounded-xl bg-white/10 p-8 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-3">
            <StatBox number="1000+" label="طالب مسجل" />
            <StatBox number="50+" label="درس تعليمي" />
            <StatBox number="98%" label="نسبة الرضا" />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-white/80">
          <p className="mb-2 text-lg">
            © 2024 منصة محمد الربيعي التعليمية
          </p>
          <p className="text-sm">
            جميع الحقوق محفوظة | بُني بـ ❤️ باستخدام Next.js 14
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-lg transition-all hover:scale-105">
      <div className="mb-4 text-5xl">{icon}</div>
      <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StatBox({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="mb-2 text-4xl font-bold text-white">{number}</div>
      <div className="text-blue-100">{label}</div>
    </div>
  );
}
