import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';
    const deviceId = generateDeviceId({ userAgent, ipAddress });

    const sessionCheck = await verifySession(token, deviceId);
    if (!sessionCheck.valid || !sessionCheck.userId || sessionCheck.role !== 'STUDENT') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        isFree: true,
        price: true,
        module: { select: { courseId: true } },
      },
    });
    if (!lesson) {
      return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
    }

    if (!lesson.isFree && lesson.price > 0) {
      const [grant, purchase, enrollment] = await Promise.all([
        prisma.lessonGrant.findFirst({
          where: { userId: sessionCheck.userId, lessonId: params.id },
          select: { id: true },
        }),
        prisma.lessonPurchase.findFirst({
          where: { userId: sessionCheck.userId, lessonId: params.id },
          select: { id: true },
        }),
        prisma.enrollment.findFirst({
          where: { userId: sessionCheck.userId, courseId: lesson.module.courseId, isActive: true },
          select: { id: true },
        }),
      ]);

      if (!grant && !purchase && !enrollment) {
        return NextResponse.json({ error: 'الحصة غير مفعلة' }, { status: 403 });
      }
    }

    await prisma.lessonAccessLog.create({
      data: {
        userId: sessionCheck.userId,
        lessonId: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ خطأ في تسجيل فتح الحصة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
