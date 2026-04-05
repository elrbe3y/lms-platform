'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quickLoadingRole, setQuickLoadingRole] = useState<'ADMIN' | 'STUDENT' | null>(null);
  const showQuickLogin = process.env.NEXT_PUBLIC_ENABLE_DEV_QUICK_LOGIN === 'true';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      router.push(data.redirectTo || '/');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(role: 'ADMIN' | 'STUDENT') {
    setError('');
    setQuickLoadingRole(role);

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
        throw new Error(data.error || 'فشل تسجيل الدخول التجريبي');
      }

      router.push(data.redirectTo || (role === 'ADMIN' ? '/admin' : '/dashboard'));
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'فشل تسجيل الدخول التجريبي');
    } finally {
      setQuickLoadingRole(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 text-center">تسجيل الدخول</h1>
        <p className="text-gray-600 mb-6 text-center">ادخل بريدك الإلكتروني وكلمة المرور</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>

          {showQuickLogin ? (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-amber-700">وضع تجريبي مؤقت:</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={quickLoadingRole !== null}
                  onClick={() => void handleQuickLogin('ADMIN')}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                >
                  {quickLoadingRole === 'ADMIN' ? 'جاري الدخول...' : 'دخول أدمن تجريبي'}
                </button>
                <button
                  type="button"
                  disabled={quickLoadingRole !== null}
                  onClick={() => void handleQuickLogin('STUDENT')}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {quickLoadingRole === 'STUDENT' ? 'جاري الدخول...' : 'دخول طالب تجريبي'}
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
