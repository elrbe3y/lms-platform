import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const updatedModule = await prisma.module.update({
      where: { id: params.id },
      data: {
        title: typeof body.title === 'string' ? body.title.trim() : undefined,
        description:
          body.description === null || typeof body.description === 'string'
            ? body.description
            : undefined,
        order: typeof body.order === 'number' ? body.order : undefined,
      },
      select: {
        id: true,
        title: true,
        description: true,
        order: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, module: updatedModule });
  } catch (error) {
    console.error('❌ خطأ في تحديث الوحدة:', error);
    return NextResponse.json({ error: 'فشل تحديث الوحدة' }, { status: 500 });
  }
}
