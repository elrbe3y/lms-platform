import type { Lesson } from '../types';

interface FeaturedContentTabProps {
  lessons: Lesson[];
}

interface PinnedPartItem {
  id: string;
  title: string;
  lessonTitle: string;
  lessonId: string;
  isPinned?: boolean;
}

export function FeaturedContentTab({
  lessons,
}: FeaturedContentTabProps) {
  // جمع جميع الأجزاء من جميع الدروس
  const allParts: PinnedPartItem[] = lessons
    .filter((lesson) => lesson.parts && Array.isArray(lesson.parts))
    .flatMap((lesson) =>
      (lesson.parts || []).map((part) => {
        const partObj = part as Record<string, unknown>;
        return {
          id: part.id,
          title: part.title,
          lessonTitle: lesson.title,
          lessonId: lesson.id,
          isPinned: (partObj.isPinned as boolean | undefined),
        };
      })
    );

  // الأجزاء المثبتة
  const pinnedParts = allParts.filter((p) => p.isPinned);

  const handleTogglePin = async (partId: string, currentState: boolean) => {
    try {
      const response = await fetch('/api/admin/videos/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partId, isPinned: !currentState }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(currentState ? 'تم إلغاء التثبيت' : 'تم التثبيت');
        window.location.reload();
      } else {
        alert(data.error || 'حدث خطأ');
      }
    } catch {
      alert('خطأ في الاتصال');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">🎥 الفيديوهات المثبتة في الصفحة الرئيسية</h3>

        {pinnedParts.length > 0 ? (
          <div className="space-y-3">
            {pinnedParts.map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-900">{part.title}</p>
                  <p className="text-sm text-gray-600">{part.lessonTitle}</p>
                </div>
                <button
                  onClick={() => handleTogglePin(part.id, true)}
                  className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 font-semibold transition-colors"
                >
                  ✓ مثبت
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">لا توجد فيديوهات مثبتة حالياً</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">📌 اختر فيديوهات لتثبيتها</h3>

        <div className="space-y-2">
          {allParts
            .filter((p) => !p.isPinned)
            .slice(0, 20)
            .map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">{part.title}</p>
                  <p className="text-sm text-gray-600">{part.lessonTitle}</p>
                </div>
                <button
                  onClick={() => handleTogglePin(part.id, false)}
                  className="px-3 py-1 rounded bg-gray-300 text-gray-700 text-sm hover:bg-gray-400 font-semibold transition-colors"
                >
                  + ثبت الفيديو
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
