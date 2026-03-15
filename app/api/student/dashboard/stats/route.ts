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

    const userId = sessionCheck.userId;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId, isActive: true },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    const lessonIds = enrollments.flatMap((e) =>
      e.course.modules.flatMap((m) => m.lessons.map((l) => l.id))
    );

    const totalLessons = lessonIds.length;
    const completedProgressRows = lessonIds.length
      ? await prisma.lessonProgress.findMany({
          where: { userId, lessonId: { in: lessonIds }, isCompleted: true },
          select: { lessonId: true },
        })
      : [];
    const completedSet = new Set(completedProgressRows.map((row) => row.lessonId));
    const completedLessons = completedSet.size;

    const attempts = await prisma.examAttempt.findMany({ where: { userId } });
    const averageScore = attempts.length
      ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
      : 0;

    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter((e) => {
      const ids = e.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
      return ids.length > 0 && ids.every((id) => completedSet.has(id));
    }).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalCourses,
        completedCourses,
        inProgressCourses: Math.max(totalCourses - completedCourses, 0),
        totalLessons,
        completedLessons,
        averageScore,
      },
    });
  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات الطالب:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
