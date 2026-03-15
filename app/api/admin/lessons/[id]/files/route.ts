import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const fileSchema = z.object({
  sectionTitle: z.string().min(2).optional(),
  title: z.string().min(2),
  fileUrl: z.string().url(),
  fileType: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const files = await prisma.lessonFile.findMany({
      where: { lessonId: params.id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('❌ خطأ في جلب ملفات الحصة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = fileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات الملف غير صالحة' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!lesson) {
      return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
    }

    const currentMax = await prisma.lessonFile.aggregate({
      where: { lessonId: params.id },
      _max: { order: true },
    });

    const created = await prisma.lessonFile.create({
      data: {
        lessonId: params.id,
        sectionTitle: parsed.data.sectionTitle?.trim() || 'المحتوى الرئيسي',
        title: parsed.data.title,
        fileUrl: parsed.data.fileUrl,
        fileType: parsed.data.fileType ?? null,
        order: parsed.data.order ?? (currentMax._max.order ?? 0) + 1,
      },
    });

    return NextResponse.json({ success: true, file: created });
  } catch (error) {
    console.error('❌ خطأ في إضافة ملف الحصة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
