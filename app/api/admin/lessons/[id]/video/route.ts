import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const videoSchema = z.object({
  title: z.string().min(2),
  provider: z.enum(['YOUTUBE', 'BUNNY_NET', 'CUSTOM']),
  videoUrl: z.string().url(),
  streamingUrl: z.string().url().optional().nullable(),
  duration: z.number().int().positive().optional(),
  enableWatermark: z.boolean().default(true),
  pdfUrl: z.string().url().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: { id: true, videoId: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'الدرس غير موجود' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = videoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات الفيديو غير صالحة' }, { status: 400 });
    }

    const payload = parsed.data;

    if (lesson.videoId) {
      await prisma.video.update({
        where: { id: lesson.videoId },
        data: {
          title: payload.title,
          provider: payload.provider,
          videoUrl: payload.videoUrl,
          streamingUrl: payload.streamingUrl ?? null,
          duration: payload.duration,
          enableWatermark: payload.enableWatermark,
        },
      });
    } else {
      const createdVideo = await prisma.video.create({
        data: {
          title: payload.title,
          provider: payload.provider,
          videoUrl: payload.videoUrl,
          streamingUrl: payload.streamingUrl ?? null,
          duration: payload.duration,
          enableWatermark: payload.enableWatermark,
        },
      });

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { videoId: createdVideo.id },
      });
    }

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        pdfUrl: payload.pdfUrl ?? null,
      },
    });

    return NextResponse.json({ success: true, message: 'تم حفظ الفيديو بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في حفظ الفيديو:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
