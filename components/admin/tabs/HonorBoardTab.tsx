import { useState } from 'react';
import type { Student } from '../types';

interface HonorBoardTabProps {
  students: Student[];
  loadingStudents: boolean;
}

interface HonorBoardEntry {
  id: string;
  studentId: string;
  reason: string;
  student: {
    fullName: string;
    grade: string;
    schoolName: string;
  };
}

export function HonorBoardTab({ students, loadingStudents }: HonorBoardTabProps) {
  const [honorBoard, setHonorBoard] = useState<HonorBoardEntry[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const loadHonorBoard = async () => {
    try {
      const response = await fetch('/api/admin/honor-board', { cache: 'no-store' });
      const data = await response.json();
      if (data.success) {
        setHonorBoard(data.entries || []);
      }
    } catch {
      alert('خطأ في تحميل لوحة الشرف');
    }
  };

  const handleAddStudent = async () => {
    if (!selectedStudentId || !reason.trim()) {
      alert('اختر طالب واكتب السبب');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/honor-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId, reason: reason.trim() }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('تم إضافة الطالب بنجاح');
        setSelectedStudentId('');
        setReason('');
        await loadHonorBoard();
      } else {
        alert(data.error || 'فشل الإضافة');
      }
    } catch {
      alert('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (entryId: string) => {
    if (!confirm('هل تريد إزالة هذا الطالب من لوحة الشرف؟')) return;

    try {
      const response = await fetch(`/api/admin/honor-board?id=${entryId}`, { method: 'DELETE' });
      if (response.ok) {
        alert('تم الحذف بنجاح');
        await loadHonorBoard();
      } else {
        alert('فشل الحذف');
      }
    } catch {
      alert('خطأ في الاتصال');
    }
  };

  // Load on component mount
  if (honorBoard.length === 0 && !loadingStudents) {
    void loadHonorBoard();
  }

  return (
    <div className="space-y-6">
      {/* Form to add student */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">➕ إضافة طالب لوحة الشرف</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">اختر الطالب:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={loadingStudents}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- اختر طالب --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">السبب:</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: أفضل طالب في الرياضيات"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleAddStudent}
            disabled={loading || loadingStudents}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition-colors"
          >
            {loading ? 'جاري الإضافة...' : '✓ أضف للوحة الشرف'}
          </button>
        </div>
      </div>

      {/* Honor Board List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">🏆 لوحة الشرف الحالية</h3>

        {honorBoard.length > 0 ? (
          <div className="space-y-3">
            {honorBoard.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{entry.student.fullName}</p>
                    <p className="text-xs text-gray-600">
                      {entry.student.grade} - {entry.student.schoolName}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{entry.reason}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveStudent(entry.id)}
                  className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700 font-semibold transition-colors"
                >
                  ✕ حذف
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">لا توجد طلاب في لوحة الشرف حالياً</p>
        )}
      </div>
    </div>
  );
}
