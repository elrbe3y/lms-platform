import type { LessonOption, Student } from '../types';

interface StudentsTabProps {
  students: Student[];
  loadingStudents: boolean;
  studentSearch: string;
  setStudentSearch: (value: string) => void;
  grantStudentId: string;
  setGrantStudentId: (value: string) => void;
  grantLessonId: string;
  setGrantLessonId: (value: string) => void;
  lessonOptions: LessonOption[];
  grantLessonToStudent: () => Promise<void>;
  openStudentProfile: (studentId: string) => Promise<void>;
  loadingStudentProfile: boolean;
  setEditingStudent: (student: Student) => void;
  activateStudent: (studentId: string) => Promise<void>;
  suspendStudent: (studentId: string) => Promise<void>;
  banStudent: (studentId: string) => Promise<void>;
  resetStudentPassword: (studentId: string, newPassword: string) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  statusLabels: Record<Student['status'], string>;
}

export function StudentsTab({
  students,
  loadingStudents,
  studentSearch,
  setStudentSearch,
  grantStudentId,
  setGrantStudentId,
  grantLessonId,
  setGrantLessonId,
  lessonOptions,
  grantLessonToStudent,
  openStudentProfile,
  loadingStudentProfile,
  setEditingStudent,
  activateStudent,
  suspendStudent,
  banStudent,
  resetStudentPassword,
  deleteStudent,
  statusLabels,
}: StudentsTabProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md">
      <div className="space-y-3 border-b border-gray-100 p-4">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="ابحث بالاسم أو رقم الطالب"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <select
            className="rounded border px-3 py-2"
            value={grantStudentId}
            onChange={(e) => setGrantStudentId(e.target.value)}
          >
            <option value="">اختر الطالب للتفعيل اليدوي</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName} - {student.phone}
              </option>
            ))}
          </select>

          <select
            className="rounded border px-3 py-2"
            value={grantLessonId}
            onChange={(e) => setGrantLessonId(e.target.value)}
          >
            <option value="">اختر الحصة</option>
            {lessonOptions.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => void grantLessonToStudent()}
            className="rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
          >
            تفعيل يدوي للحصة
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-xs text-gray-700">الاسم</th>
              <th className="px-4 py-3 text-xs text-gray-700">البريد / الهاتف</th>
              <th className="px-4 py-3 text-xs text-gray-700">هاتف ولي الأمر / المحافظة</th>
              <th className="px-4 py-3 text-xs text-gray-700">المدرسة / الصف</th>
              <th className="px-4 py-3 text-xs text-gray-700">العنوان</th>
              <th className="px-4 py-3 text-xs text-gray-700">تواريخ الحساب</th>
              <th className="px-4 py-3 text-xs text-gray-700">البطاقة</th>
              <th className="px-4 py-3 text-xs text-gray-700">الحالة</th>
              <th className="px-4 py-3 text-xs text-gray-700">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.fullName}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div>{student.email}</div>
                  <div className="text-gray-500">{student.phone}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div>{student.parentPhone || 'غير مسجل'}</div>
                  <div className="text-gray-500">{student.governorate || 'غير مسجل'}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div>{student.schoolName}</div>
                  <div className="text-gray-500">{student.grade}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{student.address}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div>إنشاء: {new Date(student.createdAt).toLocaleDateString('ar-EG')}</div>
                  <div className="text-gray-500">
                    آخر دخول: {student.lastLoginAt ? new Date(student.lastLoginAt).toLocaleString('ar-EG') : 'لم يسجل بعد'}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {student.nationalIdImage ? (
                    <a className="text-blue-600 hover:underline" href={student.nationalIdImage} target="_blank" rel="noreferrer">
                      عرض
                    </a>
                  ) : (
                    <span className="text-gray-400">غير متوفرة</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                    {statusLabels[student.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void openStudentProfile(student.id)}
                      className="rounded bg-sky-600 px-3 py-1 text-white hover:bg-sky-700"
                    >
                      {loadingStudentProfile ? 'جاري التحميل...' : 'بروفايل'}
                    </button>

                    <button
                      onClick={() => setEditingStudent({ ...student })}
                      className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
                    >
                      تعديل
                    </button>

                    {student.status === 'PENDING_VERIFICATION' && (
                      <button
                        onClick={() => void activateStudent(student.id)}
                        className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                      >
                        تفعيل
                      </button>
                    )}

                    {student.status === 'ACTIVE' && (
                      <button
                        onClick={() => void suspendStudent(student.id)}
                        className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                      >
                        تعليق
                      </button>
                    )}

                    <button
                      onClick={() => void banStudent(student.id)}
                      className="rounded bg-rose-700 px-3 py-1 text-white hover:bg-rose-800"
                    >
                      حظر
                    </button>

                    <button
                      onClick={() => {
                        const pwd = prompt('أدخل كلمة مرور جديدة للطالب (6 أحرف على الأقل):');
                        if (!pwd) return;
                        void resetStudentPassword(student.id, pwd);
                      }}
                      className="rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-700"
                    >
                      تغيير كلمة المرور
                    </button>

                    <button
                      onClick={() => void deleteStudent(student.id)}
                      className="rounded bg-gray-800 px-3 py-1 text-white hover:bg-black"
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loadingStudents && <div className="p-4 text-gray-500">جاري تحميل الطلاب...</div>}
      {!loadingStudents && students.length === 0 && <div className="p-4 text-gray-500">لا يوجد طلاب حاليًا.</div>}
    </div>
  );
}
