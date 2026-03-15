import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

export async function GET(request: NextRequest) {
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

    const attempts = await prisma.examAttempt.findMany({
      where: { userId: sessionCheck.userId },
      include: {
        exam: {
          include: {
            lesson: {
              include: {
                module: {
                  include: {
                    course: { select: { title: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const results = attempts.map((attempt, index) => ({
      id: attempt.id,
      examTitle: attempt.exam.title,
      courseName: attempt.exam.lesson.module.course.title,
      date: attempt.submittedAt ?? attempt.startedAt,
      score: Math.round(attempt.score),
      totalScore: Math.round(attempt.maxScore),
      passingScore: attempt.exam.passingScore,
      status: attempt.passed ? 'passed' : 'failed',
      attempt: index + 1,
      duration: attempt.submittedAt
        ? Math.max(Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000), 0)
        : 0,
    }));

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('❌ خطأ في جلب نتائج الامتحانات:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
