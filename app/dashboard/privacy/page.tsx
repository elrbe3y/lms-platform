'use client';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6" dir="rtl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">سياسة الخصوصية</h1>
        <p className="mt-3 text-sm text-gray-600">
          نحن نحافظ على خصوصيتك، ولا نشارك بياناتك مع جهات خارجية بدون موافقتك.
        </p>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-gray-700">
          <li>استخدام البيانات لتحسين التجربة التعليمية فقط.</li>
          <li>تأمين بيانات الحساب والمحتوى.</li>
          <li>إمكانية تحديث بياناتك في أي وقت.</li>
        </ul>
      </div>
    </div>
  );
}
