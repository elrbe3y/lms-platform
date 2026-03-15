import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const grantSchema = z.object({
  studentId: z.string().min(1),
  lessonId: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = grantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({
      where: { id: parsed.data.studentId },
      select: { id: true, role: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: parsed.data.lessonId },
      select: { id: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
    }

    const grant = await prisma.lessonGrant.upsert({
      where: {
        userId_lessonId: {
          userId: parsed.data.studentId,
          lessonId: parsed.data.lessonId,
        },
      },
      update: {
        notes: parsed.data.notes,
      },
      create: {
        userId: parsed.data.studentId,
        lessonId: parsed.data.lessonId,
        notes: parsed.data.notes,
      },
    });

    return NextResponse.json({ success: true, grant, message: 'تم تفعيل الحصة للطالب بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في التفعيل اليدوي للحصة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
