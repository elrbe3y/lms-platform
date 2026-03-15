import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const updatedCourse = await prisma.course.update({
      where: { id: params.id },
      data: {
        title: typeof body.title === 'string' ? body.title.trim() : undefined,
        description:
          body.description === null || typeof body.description === 'string'
            ? body.description
            : undefined,
        price: typeof body.price === 'number' ? body.price : undefined,
        isPublished: typeof body.isPublished === 'boolean' ? body.isPublished : undefined,
        targetGrade:
          typeof body.targetGrade === 'string' && ['ALL', 'FIRST', 'SECOND', 'THIRD'].includes(body.targetGrade)
            ? body.targetGrade
            : undefined,
        isFeatured: typeof body.isFeatured === 'boolean' ? body.isFeatured : undefined,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        isPublished: true,
        targetGrade: true,
        isFeatured: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, course: updatedCourse });
  } catch (error) {
    console.error('❌ خطأ في تحديث الكورس:', error);
    return NextResponse.json({ error: 'فشل تحديث الكورس' }, { status: 500 });
  }
}
