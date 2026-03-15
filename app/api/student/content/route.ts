import { NextRequest, NextResponse } from 'next/server';
import { generateDeviceId, verifySession } from '@/lib/session-manager';
import { prisma } from '@/lib/db';

function normalizeGradeText(value: string | null | undefined): string {
  return (value || '')
    .replace(/أ/g, 'ا')
    .replace(/إ/g, 'ا')
    .replace(/آ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[\s_-]+/g, ' ')
    .toLowerCase()
    .trim();
}

function detectGradeBucket(value: string | null | undefined): 'FIRST' | 'SECOND' | 'THIRD' | null {
  const text = normalizeGradeText(value);
  if (!text) return null;

  const hasGradeContext =
    text.includes('ثانوي') ||
    text.includes('الصف') ||
    text.includes('سنه') ||
    text.includes('سنة') ||
    text.includes('grade');

  if (!hasGradeContext) return null;

  if (
    text.includes('الاول الثانوي') ||
    text.includes('اول ثانوي') ||
    text.includes('اولي ثانوي') ||
    text.includes('اولى ثانوي') ||
    text.includes('1 ثانوي') ||
    text.includes('الصف الاول')
  ) {
    return 'FIRST';
  }

  if (
    text.includes('الثاني الثانوي') ||
    text.includes('ثاني ثانوي') ||
    text.includes('ثانيه ثانوي') ||
    text.includes('ثانية ثانوي') ||
    text.includes('2 ثانوي') ||
    text.includes('الصف الثاني')
  ) {
    return 'SECOND';
  }

  if (
    text.includes('الثالث الثانوي') ||
    text.includes('ثالث ثانوي') ||
    text.includes('ثالثه ثانوي') ||
    text.includes('ثالثة ثانوي') ||
    text.includes('3 ثانوي') ||
    text.includes('الصف الثالث')
  ) {
    return 'THIRD';
  }

  return null;
}

function normalizeCourseTargetGrade(value: string | null | undefined): 'ALL' | 'FIRST' | 'SECOND' | 'THIRD' {
  if (value === 'FIRST' || value === 'SECOND' || value === 'THIRD') return value;
  return 'ALL';
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';
    const deviceId = generateDeviceId({ userAgent, ipAddress });

    const sessionCheck = await verifySession(token, deviceId);
    if (!sessionCheck.valid || !sessionCheck.userId) {
      return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
    }

    if (sessionCheck.role !== 'STUDENT') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const [student, enrollments] = await Promise.all([
      prisma.user.findUnique({ where: { id: sessionCheck.userId }, select: { grade: true } }),
      prisma.enrollment.findMany({
      where: {
        userId: sessionCheck.userId,
        isActive: true,
      },
        select: { courseId: true },
        orderBy: { enrolledAt: 'desc' },
      }),
    ]);

    const studentGradeBucket = detectGradeBucket(student?.grade);

    const grantedLessons = await prisma.lessonGrant.findMany({
      where: { userId: sessionCheck.userId },
      include: {
        lesson: {
          include: {
            parts: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                provider: true,
                duration: true,
              },
            },
            files: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                fileUrl: true,
                fileType: true,
              },
            },
            video: {
              select: {
                id: true,
                title: true,
                provider: true,
                duration: true,
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
                    description: true,
                    thumbnail: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const purchasedLessons = await prisma.lessonPurchase.findMany({
      where: { userId: sessionCheck.userId },
      include: {
        lesson: {
          include: {
            parts: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                provider: true,
                duration: true,
              },
            },
            files: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                fileUrl: true,
                fileType: true,
              },
            },
            video: {
              select: {
                id: true,
                title: true,
                provider: true,
                duration: true,
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
                    description: true,
                    thumbnail: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const accessLessonIds = new Set<string>();
    grantedLessons.forEach((grant) => accessLessonIds.add(grant.lesson.id));
    purchasedLessons.forEach((purchase) => accessLessonIds.add(purchase.lesson.id));

    const enrolledCourseIds = new Set(enrollments.map((enrollment) => enrollment.courseId));

    const relatedCourseIds = new Set<string>();
    enrolledCourseIds.forEach((id) => relatedCourseIds.add(id));
    grantedLessons.forEach((grant) => relatedCourseIds.add(grant.lesson.module.course.id));
    purchasedLessons.forEach((purchase) => relatedCourseIds.add(purchase.lesson.module.course.id));

    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { isPublished: true },
          relatedCourseIds.size ? { id: { in: Array.from(relatedCourseIds) } } : undefined,
        ].filter(Boolean) as { isPublished?: boolean; id?: { in: string[] } }[],
      },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                parts: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    provider: true,
                    duration: true,
                  },
                },
                files: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    title: true,
                    fileUrl: true,
                    fileType: true,
                  },
                },
                video: {
                  select: {
                    id: true,
                    title: true,
                    provider: true,
                    duration: true,
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
              },
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    const transformedCourses = courses
      .filter((course) => {
        if (enrolledCourseIds.has(course.id)) return true;
        const courseTargetGrade = normalizeCourseTargetGrade((course as { targetGrade?: string }).targetGrade);
        if (courseTargetGrade === 'ALL') return true;
        if (!studentGradeBucket) return true;
        return courseTargetGrade === studentGradeBucket;
      })
      .map((course) => ({
      ...course,
      hasCourseAccess: enrolledCourseIds.has(course.id),
      modules: course.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => ({
          ...lesson,
          exam: lesson.exams?.[0] || null,
          hasAccess: lesson.isFree || lesson.price <= 0 || accessLessonIds.has(lesson.id) || enrolledCourseIds.has(course.id),
        })),
      })),
    }));

    return NextResponse.json({ success: true, courses: transformedCourses });
  } catch (error) {
    console.error('❌ خطأ في جلب محتوى الطالب:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
