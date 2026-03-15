export default function PendingVerificationPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
      <div className="max-w-xl w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">تم إنشاء الحساب بنجاح</h1>
        <p className="text-gray-600 mb-3">
          حسابك الآن في انتظار التفعيل اليدوي من الإدارة بعد مراجعة صورة البطاقة.
        </p>
        <p className="text-gray-600 mb-8">سيتم تفعيل حسابك قريباً ويمكنك بعدها تسجيل الدخول.</p>
        <a
          href="/login"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700"
        >
          الذهاب إلى تسجيل الدخول
        </a>
      </div>
    </div>
  );
}
