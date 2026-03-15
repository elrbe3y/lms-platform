import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

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
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';
    const deviceId = generateDeviceId({ userAgent, ipAddress });
    const sessionCheck = await verifySession(token, deviceId);

    if (!sessionCheck.valid || !sessionCheck.userId || sessionCheck.role !== 'STUDENT') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // جلب الحصص المثبتة من الأدمن ثم تجميعها على مستوى الكورس
    const pinnedParts = await prisma.lessonPart.findMany({
      select: {
        id: true,
        title: true,
        videoUrl: true,
        streamingUrl: true,
        lesson: {
          select: {
            id: true,
            title: true,
            module: {
              select: {
                title: true,
                course: { select: { id: true, title: true, thumbnail: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    const courseMap = new Map<
      string,
      {
        id: string;
        title: string;
        thumbnail: string | null;
        featuredPartsCount: number;
      }
    >();

    for (const part of pinnedParts) {
      const course = part.lesson.module.course;
      const existing = courseMap.get(course.id);

      if (!existing) {
        courseMap.set(course.id, {
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail,
          featuredPartsCount: 1,
        });
      } else {
        existing.featuredPartsCount += 1;
      }
    }

    const pinnedFeaturedCourses = Array.from(courseMap.values());

    const [student, publishedCourses, enrollments] = await Promise.all([
      prisma.user.findUnique({ where: { id: sessionCheck.userId }, select: { grade: true } }),
      prisma.course.findMany({
        where: { isPublished: true },
        select: { id: true, title: true, thumbnail: true, price: true, targetGrade: true },
        orderBy: [{ featuredOrder: 'asc' }, { createdAt: 'desc' }],
        take: 50,
      }),
      prisma.enrollment.findMany({
        where: { userId: sessionCheck.userId, isActive: true },
        select: { courseId: true },
      }),
    ]);

    const publishedMap = new Map(
      publishedCourses.map((course) => [
        course.id,
        {
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail,
          price: course.price,
          targetGrade: course.targetGrade,
          featuredPartsCount: 0,
        },
      ])
    );

    const mergedCourses = [
      ...pinnedFeaturedCourses.map((course) => ({
        ...course,
        price: publishedMap.get(course.id)?.price ?? 0,
        targetGrade: publishedMap.get(course.id)?.targetGrade || 'ALL',
      })),
      ...publishedCourses
        .filter((course) => !courseMap.has(course.id))
        .map((course) => ({
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail,
          featuredPartsCount: 0,
          price: course.price,
          targetGrade: course.targetGrade,
        })),
    ];

    const enrolledSet = new Set(enrollments.map((enrollment) => enrollment.courseId));
    const studentGradeBucket = detectGradeBucket(student?.grade);

    const coursesWithAccess = mergedCourses.map((course) => ({
      ...course,
      hasCourseAccess: enrolledSet.has(course.id),
    }));

    const gradeFilteredCourses = coursesWithAccess
      .filter((course) => {
        if (course.hasCourseAccess) return true;
        const courseTargetGrade = normalizeCourseTargetGrade((course as { targetGrade?: string }).targetGrade);
        if (courseTargetGrade === 'ALL') return true;
        if (!studentGradeBucket) return true;
        return courseTargetGrade === studentGradeBucket;
      });

    const featuredWithAccess = (gradeFilteredCourses.length > 0 ? gradeFilteredCourses : coursesWithAccess).slice(0, 8);

    // جلب لوحة الشرف (الطلاب المميزين)
    const honorBoard = await prisma.honorBoardEntry.findMany({
      where: { isActive: true },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        student: {
          select: {
            fullName: true,
            grade: true,
            schoolName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ success: true, featuredCourses: featuredWithAccess, honorBoard });
  } catch (error) {
    console.error('❌ خطأ في جلب المحتوى المميز:', error);
    return NextResponse.json({ success: true, featuredCourses: [], honorBoard: [] });
  }
}
