'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

interface StudentProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  grade: string;
  schoolName: string;
  parentPhone?: string | null;
  governorate?: string | null;
}

export default function StudentProfilePage() {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', grade: '', parentPhone: '' });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/student/profile', { cache: 'no-store', credentials: 'include' });
        const data = await response.json();
        if (response.ok && data.success) {
          setStudent(data.user);
          setForm({
            fullName: data.user.fullName || '',
            grade: data.user.grade || '',
            parentPhone: data.user.parentPhone || '',
          });
        }
      } catch (error) {
        console.error('خطأ في تحميل الملف الشخصي:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const studentCode = useMemo(() => {
    if (!student?.id) return '------';
    const sum = student.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return String(100000 + (sum % 900000));
  }, [student?.id]);

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      alert('اسم الطالب مطلوب');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          grade: form.grade.trim(),
          parentPhone: form.parentPhone.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        alert(data.error || 'تعذر حفظ البيانات');
        return;
      }

      setStudent(data.user);
      setForm({
        fullName: data.user.fullName || '',
        grade: data.user.grade || '',
        parentPhone: data.user.parentPhone || '',
      });
      alert('تم حفظ بيانات الملف الشخصي');
    } catch (error) {
      console.error('خطأ في حفظ الملف الشخصي:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-10" dir="rtl">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-8 space-y-4">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-10" dir="rtl">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-10 text-center text-gray-600 shadow-sm">
          تعذر تحميل بيانات الملف الشخصي
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-3" dir="rtl">
      <section className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 md:px-8 md:py-4">
          <h1 className="text-xl font-bold text-gray-900">الملف الشخصي</h1>
          <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="خيارات">
            <DotsIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="p-3 md:p-5">
          <div className="mb-4 flex flex-col-reverse items-start justify-between gap-3 border-b border-gray-100 pb-5 md:flex-row md:items-center">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-indigo-700 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              <ExternalEditIcon className="h-3.5 w-3.5" />
              تعديل الصورة الشخصية
            </button>

            <div className="flex items-center gap-4 self-end md:self-auto">
              <div className="text-right">
                <div className="text-base font-bold text-gray-900 leading-tight">{student.fullName}</div>
                <div className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
                  {student.grade} {student.schoolName}
                </div>
              </div>
              <div className="h-14 w-14 rounded-md bg-gray-200 p-2">
                <UserAvatarIcon className="h-full w-full text-slate-400" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <ProfileRow icon={<HashIcon className="h-4 w-4" />} label="معرف الطالب" value={studentCode} readOnly />

            <ProfileInputRow
              icon={<UserIcon className="h-4 w-4" />}
              label="اسم الطالب"
              value={form.fullName}
              onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
            />

            <ProfileRow icon={<MailIcon className="h-4 w-4" />} label="البريد الإلكتروني" value={student.email} readOnly />

            <ProfileRow icon={<PhoneIcon className="h-4 w-4" />} label="رقم الهاتف" value={student.phone} readOnly />

            <ProfileInputRow
              icon={<PhoneIcon className="h-4 w-4" />}
              label="رقم هاتف ولي الأمر"
              value={form.parentPhone}
              onChange={(value) => setForm((prev) => ({ ...prev, parentPhone: value }))}
            />

            <ProfileInputRow
              icon={<GraduationIcon className="h-4 w-4" />}
              label="الصف الدراسي"
              value={form.grade}
              onChange={(value) => setForm((prev) => ({ ...prev, grade: value }))}
            />
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  readOnly,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-[66px] items-center justify-between rounded-xl bg-gray-100 px-4 md:h-[72px]">
      <div className="text-right">
        <div className="text-xs font-semibold text-gray-500">{label}</div>
        <div className="mt-1 text-sm font-bold text-gray-900 leading-tight">{value}</div>
      </div>

      <div className="flex items-center gap-3 text-gray-500">
        {readOnly ? null : <EditIcon className="h-5 w-5 text-gray-400" />}
        {icon}
      </div>
    </div>
  );
}

function ProfileInputRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl bg-gray-100 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-gray-500">
        <div className="text-xs font-semibold">{label}</div>
        <div className="flex items-center gap-3">{icon}</div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <EditIcon className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[24px] w-full bg-transparent px-0 py-0.5 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300"
        />
      </div>
    </div>
  );
}

function UserAvatarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.314 0-6 2.015-6 4.5V20h12v-1.5c0-2.485-2.686-4.5-6-4.5Z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.862 3.487a2.5 2.5 0 0 1 3.536 3.536L9.75 17.67l-4.31.774.774-4.31 10.648-10.647ZM15.45 4.9 7.59 12.76l-.4 2.229 2.23-.4 7.86-7.86-1.83-1.83Z" />
    </svg>
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

function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 9h14M4 15h14M10 3 8 21M16 3l-2 18" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.91.35 1.8.68 2.64a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.43-1.24a2 2 0 0 1 2.1-.45c.84.33 1.73.56 2.64.68A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function GraduationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m2 9 10-5 10 5-10 5-10-5Z" />
      <path d="M6 11v4a6 3 0 0 0 12 0v-4" />
    </svg>
  );
}

function ExternalEditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17h10a2 2 0 0 0 2-2V7" />
      <path d="M7 7h5" />
      <path d="M10 14 20 4" />
      <path d="M15 4h5v5" />
    </svg>
  );
}