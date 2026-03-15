interface PurchaseRow {
  id: string;
  fullName: string;
  phone: string;
  grade: string;
  status: string;
  hasPurchase: boolean;
  purchaseType: 'NONE' | 'LESSON' | 'COURSE';
  purchasedAt: string | null;
  amount: number;
  purchasedLessonsCount: number;
}

interface AttendanceTabProps {
  students: PurchaseRow[];
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  summary: { total: number; purchased: number; notPurchased: number; lessonPurchases: number; coursePurchases: number };
  courses: Array<{ id: string; title: string; modules: Array<{ lessons: Array<{ id: string; title: string }> }> }>;
  selectedCourseId: string;
  setSelectedCourseId: (value: string) => void;
  selectedLessonId: string;
  setSelectedLessonId: (value: string) => void;
  onlyNotPurchased: boolean;
  setOnlyNotPurchased: (value: boolean) => void;
}

export function AttendanceTab({
  students,
  loading,
  search,
  setSearch,
  summary,
  courses,
  selectedCourseId,
  setSelectedCourseId,
  selectedLessonId,
  setSelectedLessonId,
  onlyNotPurchased,
  setOnlyNotPurchased,
}: AttendanceTabProps) {
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const courseLessons = selectedCourse ? selectedCourse.modules.flatMap((module) => module.lessons || []) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h3 className="text-xl font-bold text-gray-900">عمليات شراء الحصص</h3>
        <p className="mt-1 text-sm text-gray-600">متابعة مشتريات الطلاب للحصص مع فلاتر الكورس والحصة وحالة عدم الشراء</p>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="إجمالي الطلاب" value={summary.total} color="text-gray-800" />
          <StatCard label="اشترى" value={summary.purchased} color="text-emerald-700" />
          <StatCard label="لم يشترِ" value={summary.notPurchased} color="text-red-700" />
          <StatCard label="شراء حصص" value={summary.lessonPurchases} color="text-amber-700" />
          <StatCard label="شراء كورسات" value={summary.coursePurchases} color="text-blue-700" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            className="w-full rounded border px-3 py-2"
            value={selectedCourseId}
            onChange={(event) => {
              const nextCourseId = event.target.value;
              setSelectedCourseId(nextCourseId);
              setSelectedLessonId('');
            }}
          >
            <option value="">كل الكورسات</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          <select
            className="w-full rounded border px-3 py-2"
            value={selectedLessonId}
            onChange={(event) => setSelectedLessonId(event.target.value)}
            disabled={!selectedCourseId}
          >
            <option value="">{selectedCourseId ? 'كل حصص الكورس' : 'اختر كورس أولاً'}</option>
            {courseLessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded border px-3 py-2"
            placeholder="ابحث بالاسم أو رقم الهاتف"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={onlyNotPurchased}
              onChange={(event) => setOnlyNotPurchased(event.target.checked)}
            />
            إظهار اللي مشتروش فقط
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs text-gray-700">الطالب</th>
                <th className="px-4 py-3 text-xs text-gray-700">الهاتف</th>
                <th className="px-4 py-3 text-xs text-gray-700">الصف</th>
                <th className="px-4 py-3 text-xs text-gray-700">حالة الشراء</th>
                <th className="px-4 py-3 text-xs text-gray-700">نوع الشراء</th>
                <th className="px-4 py-3 text-xs text-gray-700">عدد الحصص المشتراة</th>
                <th className="px-4 py-3 text-xs text-gray-700">المبلغ</th>
                <th className="px-4 py-3 text-xs text-gray-700">آخر عملية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{student.fullName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{student.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{student.grade}</td>
                  <td className="px-4 py-3 text-sm">
                    {student.hasPurchase ? (
                      <span
                        className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
                      >
                        اشترى
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">لم يشترِ</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {student.purchaseType === 'COURSE'
                      ? 'شراء كورس'
                      : student.purchaseType === 'LESSON'
                        ? 'شراء حصة'
                        : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{student.purchasedLessonsCount.toLocaleString('ar-EG')}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {student.amount > 0 ? `${student.amount.toLocaleString('ar-EG')} ج.م` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {student.purchasedAt ? new Date(student.purchasedAt).toLocaleString('ar-EG') : '-'}
                  </td>
                </tr>
              ))}
              {!loading && students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                    لا توجد نتائج مطابقة للفلاتر الحالية.
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                    جاري تحميل عمليات الشراء...
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs text-gray-600">{label}</div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{value.toLocaleString('ar-EG')}</div>
    </div>
  );
}
