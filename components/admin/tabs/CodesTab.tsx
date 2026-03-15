import type { CodeGenerateFormState, CodeRow } from '../types';

interface CodesTabProps {
  codeForm: CodeGenerateFormState;
  onQuantityChange: (value: string) => void;
  onCreditsChange: (value: string) => void;
  onExpiresInDaysChange: (value: string) => void;
  generateCodes: () => Promise<void>;
  codes: CodeRow[];
  loadingCodes: boolean;
}

export function CodesTab({
  codeForm,
  onQuantityChange,
  onCreditsChange,
  onExpiresInDaysChange,
  generateCodes,
  codes,
  loadingCodes,
}: CodesTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
        <h3 className="text-xl font-bold text-gray-900">توليد الأكواد</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded border px-3 py-2"
            placeholder="عدد الأكواد"
            value={codeForm.quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="قيمة الكود (ج.م)"
            value={codeForm.credits}
            onChange={(e) => onCreditsChange(e.target.value)}
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="مدة الصلاحية بالأيام"
            value={codeForm.expiresInDays}
            onChange={(e) => onExpiresInDaysChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => void generateCodes()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            توليد الأكواد
          </button>
          <a
            href="/api/admin/codes/export"
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            تصدير الأكواد (CSV)
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <div className="border-b border-gray-100 p-4 font-semibold text-gray-800">سجل الأكواد</div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs text-gray-700">الكود</th>
                <th className="px-4 py-3 text-xs text-gray-700">النوع</th>
                <th className="px-4 py-3 text-xs text-gray-700">الرصيد</th>
                <th className="px-4 py-3 text-xs text-gray-700">الحالة</th>
                <th className="px-4 py-3 text-xs text-gray-700">آخر استخدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {codes.map((code) => {
                const lastUsage = code.usages?.[0];
                return (
                  <tr key={code.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{code.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      رصيد مالي
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{code.credits}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{code.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {lastUsage
                        ? `${lastUsage.user?.fullName ?? 'غير معروف'} - ${new Date(lastUsage.usedAt).toLocaleString('ar-EG')}`
                        : 'لم يُستخدم بعد'}
                    </td>
                  </tr>
                );
              })}
              {!loadingCodes && codes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                    لا توجد أكواد حالياً.
                  </td>
                </tr>
              )}
              {loadingCodes && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                    جاري تحميل الأكواد...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
