import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
) {
  try {
    await prisma.$transaction([
      prisma.lessonGrant.deleteMany({
        where: {
          userId: params.id,
          lessonId: params.lessonId,
        },
      }),
      prisma.lessonPurchase.deleteMany({
        where: {
          userId: params.id,
          lessonId: params.lessonId,
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'تم قفل الحصة عن الطالب' });
  } catch (error) {
    console.error('❌ خطأ في قفل الحصة:', error);
    return NextResponse.json({ error: 'فشل قفل الحصة' }, { status: 500 });
  }
}
