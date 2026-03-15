import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

export async function GET(
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
      include: {
        parts: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            sectionTitle: true,
            title: true,
            description: true,
            provider: true,
            duration: true,
            videoUrl: true,
            streamingUrl: true,
          },
        },
        files: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            sectionTitle: true,
            title: true,
            fileUrl: true,
            fileType: true,
          },
        },
        exams: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            passingScore: true,
          },
        },
        module: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
    }

    const canAccessFree = lesson.isFree || lesson.price <= 0;

    if (!canAccessFree) {
      const [grant, purchase, enrollment] = await Promise.all([
        prisma.lessonGrant.findFirst({
          where: { userId: sessionCheck.userId, lessonId: lesson.id },
          select: { id: true },
        }),
        prisma.lessonPurchase.findFirst({
          where: { userId: sessionCheck.userId, lessonId: lesson.id },
          select: { id: true },
        }),
        prisma.enrollment.findFirst({
          where: { userId: sessionCheck.userId, courseId: lesson.module.course.id, isActive: true },
          select: { id: true },
        }),
      ]);

      if (!grant && !purchase && !enrollment) {
        return NextResponse.json({ error: 'الحصة غير مفعلة' }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, lesson: { ...lesson, exam: lesson.exams?.[0] || null } });
  } catch (error) {
    console.error('❌ خطأ في جلب بيانات الحصة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
