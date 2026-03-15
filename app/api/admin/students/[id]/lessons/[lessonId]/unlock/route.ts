import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
) {
  try {
    const existing = await prisma.lessonGrant.findUnique({
      where: {
        userId_lessonId: {
          userId: params.id,
          lessonId: params.lessonId,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.lessonGrant.create({
        data: {
          userId: params.id,
          lessonId: params.lessonId,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'تم فتح الحصة للطالب' });
  } catch (error) {
    console.error('❌ خطأ في فتح الحصة:', error);
    return NextResponse.json({ error: 'فشل فتح الحصة' }, { status: 500 });
  }
}
