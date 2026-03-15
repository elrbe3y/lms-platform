/**
 * 📝 صفحة التسجيل - منصة محمد الربيعي
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    schoolName: '',
    grade: '',
    address: '',
  });
  const [nationalIdImage, setNationalIdImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // التحقق من البيانات
    if (formData.password !== formData.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (!nationalIdImage) {
      setError('يرجى رفع صورة البطاقة الشخصية');
      return;
    }

    setLoading(true);

    try {
      // رفع صورة البطاقة أولاً
      const imageFormData = new FormData();
      imageFormData.append('file', nationalIdImage);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: imageFormData,
      });
      const { url: imageUrl } = await uploadResponse.json();

      // إنشاء الحساب
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          nationalIdImage: imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل التسجيل');
      }

      // التوجيه لصفحة انتظار التفعيل
      router.push('/pending-verification');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12" dir="rtl">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            🎓 منصة محمد الربيعي التعليمية
          </h1>
          <p className="text-gray-600">إنشاء حساب جديد</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">
              ❌ {error}
            </div>
          )}

          {/* الاسم الكامل */}
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="form-input"
              placeholder="أحمد محمد علي"
            />
          </div>

          {/* البريد الإلكتروني */}
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="example@email.com"
            />
          </div>

          {/* رقم الواتساب */}
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              رقم الواتساب <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className="form-input"
              placeholder="01012345678"
              pattern="[0-9]{11}"
            />
          </div>

          {/* المدرسة */}
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              اسم المدرسة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="schoolName"
              required
              value={formData.schoolName}
              onChange={handleChange}
              className="form-input"
              placeholder="مدرسة النور الثانوية"
            />
          </div>

          {/* الصف الدراسي */}
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              الصف الدراسي <span className="text-red-500">*</span>
            </label>
            <select
              name="grade"
              required
              value={formData.grade}
              onChange={handleChange}
              className="form-input"
            >
              <option value="">اختر الصف</option>
              <option value="الأول الثانوي">الأول الثانوي</option>
              <option value="الثاني الثانوي">الثاني الثانوي</option>
              <option value="الثالث الثانوي">الثالث الثانوي</option>
            </select>
          </div>

          {/* العنوان */}
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              العنوان السكني <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="form-input"
              placeholder="المدينة - الحي - الشارع"
            />
          </div>

          {/* كلمة المرور */}
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              كلمة المرور <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="••••••••"
              minLength={8}
            />
          </div>

          {/* تأكيد كلمة المرور */}
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              تأكيد كلمة المرور <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="••••••••"
            />
          </div>

          {/* صورة البطاقة */}
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              صورة البطاقة الشخصية <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => setNationalIdImage(e.target.files?.[0] || null)}
              className="form-input"
            />
            <p className="mt-1 text-sm text-gray-500">
              سيتم مراجعتها من قبل الإدارة لتفعيل حسابك
            </p>
          </div>

          {/* زر الإرسال */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'جاري التسجيل...' : '📝 إنشاء الحساب'}
          </button>

          <p className="text-center text-gray-600">
            لديك حساب بالفعل؟{' '}
            <a href="/login" className="font-semibold text-blue-600 hover:underline">
              تسجيل الدخول
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
