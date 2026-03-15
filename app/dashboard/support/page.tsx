'use client';

import { useState, type FormEvent } from 'react';

export default function SupportPage() {
  const [form, setForm] = useState({ name: '', phone: '', issue: '' });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSent(false);

    if (!form.name.trim() || !form.issue.trim()) {
      setError('يرجى إدخال الاسم ووصف المشكلة.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/student/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          issue: form.issue.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'تعذر إرسال الطلب. حاول مرة أخرى.');
        return;
      }

      setSent(true);
      setForm({ name: '', phone: '', issue: '' });
    } catch {
      setError('تعذر إرسال الطلب. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6" dir="rtl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">الدعم الفني</h1>
        <p className="mt-2 text-sm text-gray-600">
          اكتب مشكلتك وسيتواصل معك فريق الدعم في أسرع وقت.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">الاسم</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="اكتب اسمك"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">رقم الهاتف</label>
            <input
              className="form-input"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="01000000000"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">وصف المشكلة</label>
            <textarea
              className="form-input min-h-[120px]"
              value={form.issue}
              onChange={(event) => setForm((prev) => ({ ...prev, issue: event.target.value }))}
              placeholder="اكتب تفاصيل المشكلة"
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>

          {error ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          ) : null}

          {sent ? (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              تم إرسال الطلب بنجاح.
            </div>
          ) : null}
        </form>

        <div className="mt-6 space-y-2 text-sm text-gray-700">
          <p>البريد: support@example.com</p>
          <p>واتساب: 01000000000</p>
          <p>ساعات العمل: يوميا من 9 صباحا الى 9 مساء</p>
        </div>
      </div>
    </div>
  );
}
