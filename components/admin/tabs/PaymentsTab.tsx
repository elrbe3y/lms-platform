import type { PaymentRow } from '../types';

interface PaymentsTabProps {
  payments: PaymentRow[];
  loadingPayments: boolean;
  approvePayment: (paymentId: string) => Promise<void>;
}

export function PaymentsTab({ payments, loadingPayments, approvePayment }: PaymentsTabProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md">
      <div className="border-b border-gray-100 p-4 font-semibold text-gray-800">طلبات الشحن المعلقة</div>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-xs text-gray-700">الطالب</th>
              <th className="px-4 py-3 text-xs text-gray-700">الهاتف</th>
              <th className="px-4 py-3 text-xs text-gray-700">المبلغ</th>
              <th className="px-4 py-3 text-xs text-gray-700">وسيلة الدفع</th>
              <th className="px-4 py-3 text-xs text-gray-700">صورة التحويل</th>
              <th className="px-4 py-3 text-xs text-gray-700">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{payment.user.fullName}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{payment.user.phone}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{payment.amount}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{payment.method}</td>
                <td className="px-4 py-3 text-sm">
                  {payment.transferImageUrl ? (
                    <a
                      href={payment.transferImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      عرض
                    </a>
                  ) : (
                    <span className="text-gray-400">غير متاحة</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => void approvePayment(payment.id)}
                    className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                  >
                    اعتماد
                  </button>
                </td>
              </tr>
            ))}
            {!loadingPayments && payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                  لا توجد طلبات معلقة.
                </td>
              </tr>
            )}
            {loadingPayments && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                  جاري تحميل الطلبات...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
