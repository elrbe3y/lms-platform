import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';
    const deviceId = generateDeviceId({ userAgent, ipAddress });
    const sessionCheck = await verifySession(token, deviceId);

    if (!sessionCheck.valid || !sessionCheck.userId || sessionCheck.role !== 'STUDENT') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: params.examId },
      select: {
        id: true,
        maxAttempts: true,
        questions: { select: { points: true } },
        lesson: {
          select: {
            id: true,
            isFree: true,
            price: true,
            module: { select: { courseId: true } },
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'الامتحان غير موجود' }, { status: 404 });
    }

    const canAccessFree = exam.lesson.isFree || exam.lesson.price <= 0;
    if (!canAccessFree) {
      const [grant, purchase, enrollment] = await Promise.all([
        prisma.lessonGrant.findFirst({
          where: { userId: sessionCheck.userId, lessonId: exam.lesson.id },
          select: { id: true },
        }),
        prisma.lessonPurchase.findFirst({
          where: { userId: sessionCheck.userId, lessonId: exam.lesson.id },
          select: { id: true },
        }),
        prisma.enrollment.findFirst({
          where: { userId: sessionCheck.userId, courseId: exam.lesson.module.courseId, isActive: true },
          select: { id: true },
        }),
      ]);

      if (!grant && !purchase && !enrollment) {
        return NextResponse.json({ error: 'الامتحان متاح بعد شراء الحصة أو الكورس' }, { status: 403 });
      }
    }

    const previousAttempts = await prisma.examAttempt.count({
      where: { examId: exam.id, userId: sessionCheck.userId },
    });

    if (previousAttempts >= exam.maxAttempts) {
      return NextResponse.json({ error: 'تم استنفاد عدد المحاولات المسموح به' }, { status: 400 });
    }

    const maxScore = exam.questions.reduce((sum, question) => sum + question.points, 0);

    const attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        userId: sessionCheck.userId,
        score: 0,
        maxScore,
        percentage: 0,
        passed: false,
      },
      select: {
        id: true,
        startedAt: true,
      },
    });

    return NextResponse.json({ success: true, attempt });
  } catch (error) {
    console.error('❌ خطأ في بدء الامتحان:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
