'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
      <div className="rounded-lg bg-white px-6 py-4 text-sm text-gray-600 shadow-md">
        جاري تحويلك إلى الصفحة الرئيسية...
      </div>
    </div>
  );
}
