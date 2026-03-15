import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    // التحقق من صلاحية الجلسة (يمكن إضافة تحقق أكثر تعقيداً هنا)
    return Response.json(
      { verified: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('خطأ في التحقق:', error);
    return Response.json(
      { error: 'خطأ في المصادقة' },
      { status: 500 }
    );
  }
}
