import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const partSchema = z.object({
  sectionTitle: z.string().min(2).optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  provider: z.enum(['YOUTUBE', 'BUNNY_NET', 'CUSTOM']),
  videoUrl: z.string().url(),
  streamingUrl: z.string().url().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const parts = await prisma.lessonPart.findMany({
      where: { lessonId: params.id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, parts });
  } catch (error) {
    console.error('❌ خطأ في جلب أجزاء الحصة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = partSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات جزء الحصة غير صالحة' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!lesson) {
      return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
    }

    const currentMax = await prisma.lessonPart.aggregate({
      where: { lessonId: params.id },
      _max: { order: true },
    });

    const created = await prisma.lessonPart.create({
      data: {
        lessonId: params.id,
        sectionTitle: parsed.data.sectionTitle?.trim() || 'المحتوى الرئيسي',
        title: parsed.data.title,
        description: parsed.data.description,
        provider: parsed.data.provider,
        videoUrl: parsed.data.videoUrl,
        streamingUrl: parsed.data.streamingUrl ?? null,
        duration: parsed.data.duration ?? null,
        order: parsed.data.order ?? (currentMax._max.order ?? 0) + 1,
      },
    });

    return NextResponse.json({ success: true, part: created });
  } catch (error) {
    console.error('❌ خطأ في إضافة جزء الحصة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
