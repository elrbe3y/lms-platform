'use client';

import { useEffect, useState } from 'react';

interface ExamResult {
  id: string;
  examTitle: string;
  courseName: string;
  date: string;
  score: number;
  totalScore: number;
  passingScore: number;
  status: 'passed' | 'failed';
  attempt: number;
  duration: number; // بالدقائق
}

export default function ExamResultsPage() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');

  useEffect(() => {
    async function loadResults() {
      try {
        const response = await fetch('/api/student/exam-results', { cache: 'no-store', credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'فشل تحميل النتائج');
        }

        setResults(data.results || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشل تحميل النتائج');
      } finally {
        setLoading(false);
      }
    }

    void loadResults();
  }, []);

  const filteredResults = results.filter((result) => {
    if (filter === 'all') return true;
    return result.status === filter;
  });

  const stats = {
    totalExams: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    averageScore:
      results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
        : 0,
  };

  const getScoreColor = (score: number, passingScore: number) => {
    if (score >= passingScore + 20) return 'text-green-600';
    if (score >= passingScore) return 'text-green-500';
    return 'text-red-600';
  };

  const getStatusBadge = (status: ExamResult['status']) => {
    if (status === 'passed') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
          <CheckIcon className="h-3.5 w-3.5" /> نجحت
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
        <CloseIcon className="h-3.5 w-3.5" /> راسبة
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-semibold">جاري تحميل النتائج...</p>
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

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 inline-flex items-center gap-3">
          <ChartIcon className="h-9 w-9 text-blue-700" />
          نتائج امتحاناتي
        </h1>
        <p className="text-gray-600">مراجعة أدائك في جميع الامتحانات</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Exams */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">إجمالي الامتحانات</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalExams}</p>
            </div>
            <ListIcon className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        {/* Passed */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">امتحانات ناجحة</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.passed}</p>
            </div>
            <CheckIcon className="h-10 w-10 text-green-500" />
          </div>
        </div>

        {/* Failed */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">امتحانات راسبة</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed}</p>
            </div>
            <CloseIcon className="h-10 w-10 text-red-500" />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">متوسط النقاط</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.averageScore}%</p>
            </div>
            <StarIcon className="h-10 w-10 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="mb-8 flex gap-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
          }`}
        >
          الكل ({results.length})
        </button>
        <button
          onClick={() => setFilter('passed')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'passed'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
          }`}
        >
          ناجحة ({stats.passed})
        </button>
        <button
          onClick={() => setFilter('failed')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'failed'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
          }`}
        >
          راسبة ({stats.failed})
        </button>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {filteredResults.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-lg">لا توجد امتحانات في هذه الفئة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الامتحان</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الدورة</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">التاريخ</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">النقاط</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المحاولة</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredResults.map((result) => (
                  <tr
                    key={result.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{result.examTitle}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{result.courseName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(result.date).toLocaleDateString('ar-EG')}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${getScoreColor(result.score, result.passingScore)}`}>
                      {result.score}/{result.totalScore}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">المحاولة {result.attempt}</td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(result.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Score Distribution */}
      {results.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 inline-flex items-center gap-2">
            <TrendIcon className="h-6 w-6 text-blue-700" />
            توزيع النقاط
          </h2>
          <div className="space-y-4">
            {filteredResults.map((result) => (
              <div key={result.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">{result.examTitle}</span>
                  <span className={`font-bold ${getScoreColor(result.score, result.passingScore)}`}>
                    {result.score}/{result.totalScore}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      result.status === 'passed'
                        ? 'bg-gradient-to-r from-green-400 to-green-600'
                        : 'bg-gradient-to-r from-red-400 to-red-600'
                    }`}
                    style={{ width: `${(result.score / result.totalScore) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14v4" /><path d="M12 10v8" /><path d="M17 6v12" /></svg>;
}

function ListIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h6" /></svg>;
}

function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>;
}

function CloseIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6" /><path d="M15 9l-6 6" /></svg>;
}

function StarIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3z" /></svg>;
}

function TrendIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>;
}
