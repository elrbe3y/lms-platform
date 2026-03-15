import Link from 'next/link';

interface ContentTabProps {
  [key: string]: unknown;
}

export function ContentTab(_props: ContentTabProps) {
  void _props;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="text-xl font-bold text-amber-900">تم حذف الفورمات القديمة</h3>
        <p className="mt-2 text-sm text-amber-800">
          إدارة المحتوى أصبحت متاحة فقط من خلال النموذج الجديد الموحّد.
        </p>
        <div className="mt-4">
          <Link
            href="/admin/content"
            className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
          >
            فتح صفحة إدارة المحتوى الجديدة
          </Link>
        </div>
      </div>
    </div>
  );
}
