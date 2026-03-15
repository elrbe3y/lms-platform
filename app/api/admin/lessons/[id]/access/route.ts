import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = request.nextUrl.searchParams.get('studentId')?.trim();

    const logs = await prisma.lessonAccessLog.findMany({
      where: {
        lessonId: params.id,
        ...(studentId ? { userId: studentId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            status: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
      take: 200,
    });

    const summary = await prisma.lessonAccessLog.groupBy({
      by: ['userId'],
      where: { lessonId: params.id },
      _count: { _all: true },
      _max: { openedAt: true },
    });

    return NextResponse.json({ success: true, logs, summary });
  } catch (error) {
    console.error('❌ خطأ في جلب تتبع فتح الحصة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
