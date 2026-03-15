'use client';

import { useEffect, useState } from 'react';

interface Transaction {
  id: string;
  type: 'credit' | 'pending';
  description: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
}

interface WalletData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: Transaction[];
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redeemCodeValue, setRedeemCodeValue] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [transferImageUrl, setTransferImageUrl] = useState('');

  useEffect(() => {
    async function loadWallet() {
      try {
        const response = await fetch('/api/student/wallet', { cache: 'no-store', credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'فشل تحميل المحفظة');
        }

        setWallet(data.wallet);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشل تحميل المحفظة');
      } finally {
        setLoading(false);
      }
    }

    void loadWallet();
  }, []);

  async function redeemCode() {
    if (!redeemCodeValue.trim()) return;

    const response = await fetch('/api/student/wallet/redeem-code', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: redeemCodeValue.trim() }),
    });

    const data = await response.json();
    alert(response.ok ? data.message : data.error || 'فشل شحن الكود');
    if (response.ok) {
      setRedeemCodeValue('');
      const refreshed = await fetch('/api/student/wallet', { cache: 'no-store', credentials: 'include' });
      const refreshedData = await refreshed.json();
      if (refreshed.ok) {
        setWallet(refreshedData.wallet);
      }
    }
  }

  async function requestTopup() {
    const amount = Number(topupAmount || '0');
    if (!amount || amount <= 0) {
      alert('أدخل مبلغ صحيح.');
      return;
    }

    const response = await fetch('/api/student/wallet/topup-request', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        transferImageUrl: transferImageUrl || undefined,
      }),
    });

    const data = await response.json();
    alert(response.ok ? data.message : data.error || 'فشل إرسال الطلب');
    if (response.ok) {
      setTopupAmount('');
      setTransferImageUrl('');
      const refreshed = await fetch('/api/student/wallet', { cache: 'no-store', credentials: 'include' });
      const refreshedData = await refreshed.json();
      if (refreshed.ok) {
        setWallet(refreshedData.wallet);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-semibold">جاري تحميل المحفظة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8" dir="rtl">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-red-700">{error}</div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8" dir="rtl">
        <div className="text-center">
          <p className="text-gray-600 text-lg">لم نتمكن من تحميل بيانات المحفظة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 inline-flex items-center gap-3">
          <WalletIcon className="h-9 w-9 text-blue-700" />
          المحفظة
        </h1>
        <p className="text-gray-600">إدارة رصيدك والمعاملات المالية</p>
      </div>

      {/* Balance Card */}
      <div className="mb-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div>
            <p className="text-blue-100 text-lg font-semibold mb-2">الرصيد الحالي</p>
            <h2 className="text-5xl font-bold">{wallet.balance.toLocaleString('ar-EG')} ج.م</h2>
            <p className="text-blue-100 text-sm mt-2">جنيه مصري</p>
          </div>
          <div className="mt-6 md:mt-0"><MoneyIcon className="h-16 w-16 text-blue-100" /></div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Total Earned */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">إجمالي الأرصدة المضافة</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {wallet.totalEarned.toLocaleString('ar-EG')} ج.م
              </p>
            </div>
            <TrendUpIcon className="h-10 w-10 text-green-500" />
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">إجمالي المنفق</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {wallet.totalSpent.toLocaleString('ar-EG')} ج.م
              </p>
            </div>
            <TrendDownIcon className="h-10 w-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">شحن عبر كود</h3>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="أدخل الكود"
            value={redeemCodeValue}
            onChange={(e) => setRedeemCodeValue(e.target.value)}
          />
          <button
            onClick={() => void redeemCode()}
            className="w-full rounded bg-blue-600 py-2 text-white font-semibold hover:bg-blue-700"
          >
            شحن الكود
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">طلب شحن يدوي (فودافون كاش)</h3>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="المبلغ"
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="رابط صورة التحويل (اختياري)"
            value={transferImageUrl}
            onChange={(e) => setTransferImageUrl(e.target.value)}
          />
          <button
            onClick={() => void requestTopup()}
            className="w-full rounded bg-emerald-600 py-2 text-white font-semibold hover:bg-emerald-700"
          >
            إرسال طلب الشحن
          </button>
        </div>
      </div>

      {/* Transactions History */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
            <ReceiptIcon className="h-6 w-6 text-blue-700" />
            سجل المعاملات
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الوصف</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">النوع</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المبلغ</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {wallet.transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        transaction.type === 'credit'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {transaction.type === 'credit' ? 'تم الشحن' : 'قيد المراجعة'}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-4 text-sm font-bold ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {transaction.type === 'credit' ? '+' : ''}
                    {transaction.amount.toLocaleString('ar-EG')} ج.م
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(transaction.date).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wallet Tips */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-4 inline-flex items-center gap-2">
          <InfoIcon className="h-5 w-5" />
          نصائح مهمة
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li>• استخدم رصيدك للاشتراك في الدورات والحصول على المواد التعليمية</li>
          <li>• يمكنك طلب إضافة رصيد من خلال الزر أعلاه</li>
          <li>• تحقق من سجل المعاملات بانتظام</li>
          <li>• الرصيد لا ينتهي صلاحيته ويبقى معك دائماً</li>
        </ul>
      </div>
    </div>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3z" /><path d="M21 10h-4a2 2 0 0 0 0 4h4" /><path d="M3 7V5a2 2 0 0 1 2-2h12" /></svg>;
}

function MoneyIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01" /><path d="M18 12h.01" /></svg>;
}

function TrendUpIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>;
}

function TrendDownIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l6 6 4-4 8 8" /><path d="M14 17h7v-7" /></svg>;
}

function ReceiptIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12a1 1 0 0 1 1 1v16l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z" /><path d="M9 8h6" /><path d="M9 12h6" /></svg>;
}

function InfoIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 10v6" /><path d="M12 7h.01" /></svg>;
}
