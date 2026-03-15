import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    const updatedFile = await prisma.lessonFile.update({
      where: { id: params.id },
      data: {
        title: typeof body.title === 'string' ? body.title.trim() : undefined,
        sectionTitle: typeof body.sectionTitle === 'string' ? body.sectionTitle.trim() : undefined,
        order: typeof body.order === 'number' ? body.order : undefined,
      },
      select: {
        id: true,
        title: true,
        sectionTitle: true,
        order: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, file: updatedFile });
  } catch (error) {
    console.error('❌ خطأ في تحديث ملف الحصة:', error);
    return NextResponse.json({ error: 'فشل تحديث ملف الحصة' }, { status: 500 });
  }
}
