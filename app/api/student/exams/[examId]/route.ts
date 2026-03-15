import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

export async function GET(
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
      include: {
        lesson: {
          select: {
            id: true,
            isFree: true,
            price: true,
            module: { select: { courseId: true } },
          },
        },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            questionText: true,
            questionImage: true,
            type: true,
            order: true,
            points: true,
            options: true,
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

    const sanitizedQuestions = exam.questions.map((question) => ({
      ...question,
      options: Array.isArray(question.options)
        ? (question.options as { text: string; isCorrect: boolean }[]).map((option) => ({ text: option.text }))
        : [],
    }));

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        timeLimit: exam.timeLimit,
        maxAttempts: exam.maxAttempts,
        shuffleQuestions: exam.shuffleQuestions,
        preventBackNavigation: exam.preventBackNavigation,
        questions: exam.shuffleQuestions
          ? [...sanitizedQuestions].sort(() => Math.random() - 0.5)
          : sanitizedQuestions,
      },
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الامتحان:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
