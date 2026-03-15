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

    const [purchasedLessons, grantedLessons, openedLessons] = await Promise.all([
      prisma.lessonPurchase.findMany({
        where: { userId },
        select: {
          lesson: { select: { module: { select: { courseId: true } } } },
        },
      }),
      prisma.lessonGrant.findMany({
        where: { userId },
        select: {
          lesson: { select: { module: { select: { courseId: true } } } },
        },
      }),
      prisma.lessonAccessLog.findMany({
        where: { userId },
        select: {
          lesson: { select: { module: { select: { courseId: true } } } },
        },
      }),
    ]);

    const relatedCourseIds = new Set<string>();
    purchasedLessons.forEach((row) => relatedCourseIds.add(row.lesson.module.courseId));
    grantedLessons.forEach((row) => relatedCourseIds.add(row.lesson.module.courseId));
    openedLessons.forEach((row) => relatedCourseIds.add(row.lesson.module.courseId));

    const purchasedCourseIds = new Set(purchasedLessons.map((row) => row.lesson.module.courseId));
    const grantedCourseIds = new Set(grantedLessons.map((row) => row.lesson.module.courseId));
    const openedCourseIds = new Set(openedLessons.map((row) => row.lesson.module.courseId));

    if (relatedCourseIds.size > 0) {
      await Promise.all(
        Array.from(relatedCourseIds).map((courseId) =>
          prisma.enrollment.upsert({
            where: { userId_courseId: { userId, courseId } },
            update: { isActive: true, expiresAt: null },
            create: { userId, courseId, isActive: true },
          })
        )
      );
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId, isActive: true },
      select: {
        enrolledAt: true,
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            modules: {
              select: {
                id: true,
                title: true,
                lessons: {
                  select: { id: true, title: true },
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const courseRows = [] as {
      id: string;
      title: string;
      description: string | null;
      thumbnail: string | null;
      enrolledAt: Date;
      progress: number;
      status: 'completed' | 'in-progress' | 'not-started';
      source: 'PURCHASED' | 'GRANTED' | 'OPENED' | 'ENROLLED';
      lessons: { total: number; completed: number };
      nextLesson?: { id: string; title: string };
    }[];

    for (const enrollment of enrollments) {
      const lessonList = enrollment.course.modules.flatMap((m) => m.lessons);
      const lessonIds = lessonList.map((lesson) => lesson.id);
      const completedSet = new Set(
        (
          await prisma.lessonProgress.findMany({
            where: { userId, lessonId: { in: lessonIds }, isCompleted: true },
            select: { lessonId: true },
          })
        ).map((item) => item.lessonId)
      );

      const completed = completedSet.size;
      const total = lessonIds.length;
      const progress = total ? Math.round((completed / total) * 100) : 0;

      const nextLesson = lessonList.find((lesson) => !completedSet.has(lesson.id));
      const source: 'PURCHASED' | 'GRANTED' | 'OPENED' | 'ENROLLED' = purchasedCourseIds.has(enrollment.course.id)
        ? 'PURCHASED'
        : grantedCourseIds.has(enrollment.course.id)
          ? 'GRANTED'
          : openedCourseIds.has(enrollment.course.id)
            ? 'OPENED'
            : 'ENROLLED';

      courseRows.push({
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        thumbnail: enrollment.course.thumbnail ?? null,
        enrolledAt: enrollment.enrolledAt,
        progress,
        status: total === 0 ? 'not-started' : progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started',
        source,
        lessons: { total, completed },
        nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : undefined,
      });
    }

    return NextResponse.json({ success: true, courses: courseRows });
  } catch (error) {
    console.error('❌ خطأ في جلب كورسات الطالب:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
