import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

const submitSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOption: z.any(),
    })
  ),
});

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

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات الإجابات غير صالحة' }, { status: 400 });
    }

    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: parsed.data.attemptId,
        examId: params.examId,
        userId: sessionCheck.userId,
      },
      include: {
        exam: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'محاولة الامتحان غير موجودة' }, { status: 404 });
    }

    if (attempt.submittedAt) {
      return NextResponse.json({ error: 'تم تسليم هذه المحاولة بالفعل' }, { status: 400 });
    }

    await prisma.answer.deleteMany({ where: { attemptId: attempt.id } });

    let score = 0;

    for (const question of attempt.exam.questions) {
      const answer = parsed.data.answers.find((item) => item.questionId === question.id);
      const options = (question.options as { text: string; isCorrect: boolean }[]) || [];
      const correctOption = options.find((option) => option.isCorrect);

      const isCorrect = Boolean(
        answer && correctOption && String(answer.selectedOption).trim() === String(correctOption.text).trim()
      );

      const pointsEarned = isCorrect ? question.points : 0;
      score += pointsEarned;

      await prisma.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: question.id,
          selectedOption: answer?.selectedOption ?? null,
          isCorrect,
          pointsEarned,
        },
      });
    }

    const percentage = attempt.maxScore > 0 ? (score / attempt.maxScore) * 100 : 0;
    const passed = percentage >= attempt.exam.passingScore;

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        score,
        percentage,
        passed,
        submittedAt: new Date(),
      },
      select: {
        id: true,
        score: true,
        maxScore: true,
        percentage: true,
        passed: true,
        submittedAt: true,
      },
    });

    await prisma.notification.create({
      data: {
        userId: sessionCheck.userId,
        type: 'EXAM_RESULT',
        title: 'نتيجة الامتحان',
        message: passed
          ? `مبروك! نجحت بنسبة ${Math.round(percentage)}%`
          : `تم تسجيل نتيجتك بنسبة ${Math.round(percentage)}%`,
      },
    });

    return NextResponse.json({ success: true, result: updatedAttempt });
  } catch (error) {
    console.error('❌ خطأ في تسليم الامتحان:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
