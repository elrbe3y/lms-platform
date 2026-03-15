import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search')?.trim();
    const courseId = request.nextUrl.searchParams.get('courseId')?.trim();
    const lessonId = request.nextUrl.searchParams.get('lessonId')?.trim();
    const notPurchasedOnly = request.nextUrl.searchParams.get('notPurchasedOnly') === 'true';

    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        grade: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const studentIds = students.map((student) => student.id);

    if (!studentIds.length) {
      return NextResponse.json({
        success: true,
        students: [],
        summary: { total: 0, purchased: 0, notPurchased: 0, lessonPurchases: 0, coursePurchases: 0 },
      });
    }

    const explicitLesson = lessonId
      ? await prisma.lesson.findUnique({
          where: { id: lessonId },
          select: { id: true, module: { select: { courseId: true } } },
        })
      : null;

    const resolvedCourseId = courseId || explicitLesson?.module.courseId || '';
    const scopedLessonIds = explicitLesson
      ? [explicitLesson.id]
      : resolvedCourseId
        ? (
            await prisma.lesson.findMany({
              where: { module: { courseId: resolvedCourseId } },
              select: { id: true },
            })
          ).map((lesson) => lesson.id)
        : [];

    const lessonPurchaseWhere =
      scopedLessonIds.length > 0
        ? {
            userId: { in: studentIds },
            lessonId: { in: scopedLessonIds },
          }
        : {
            userId: { in: studentIds },
          };

    const enrollmentWhere = resolvedCourseId
      ? {
          userId: { in: studentIds },
          courseId: resolvedCourseId,
          isActive: true,
        }
      : {
          userId: { in: studentIds },
          isActive: true,
        };

    const [lessonPurchases, enrollments] = await Promise.all([
      prisma.lessonPurchase.findMany({
        where: lessonPurchaseWhere,
        select: {
          userId: true,
          amount: true,
          createdAt: true,
        },
      }),
      prisma.enrollment.findMany({
        where: enrollmentWhere,
        select: {
          userId: true,
          enrolledAt: true,
          course: {
            select: {
              price: true,
            },
          },
        },
      }),
    ]);

    const lessonMap = new Map<string, { count: number; amount: number; latest: Date | null }>();
    for (const purchase of lessonPurchases) {
      const current = lessonMap.get(purchase.userId) || { count: 0, amount: 0, latest: null };
      const nextLatest = !current.latest || purchase.createdAt > current.latest ? purchase.createdAt : current.latest;
      lessonMap.set(purchase.userId, {
        count: current.count + 1,
        amount: current.amount + (purchase.amount || 0),
        latest: nextLatest,
      });
    }

    const enrollmentMap = new Map<string, { amount: number; latest: Date }>();
    for (const enrollment of enrollments) {
      const current = enrollmentMap.get(enrollment.userId);
      if (!current || enrollment.enrolledAt > current.latest) {
        enrollmentMap.set(enrollment.userId, {
          amount: enrollment.course?.price || 0,
          latest: enrollment.enrolledAt,
        });
      }
    }

    const rows = students
      .map((student) => {
        const lessonData = lessonMap.get(student.id) || { count: 0, amount: 0, latest: null };
        const enrollmentData = enrollmentMap.get(student.id);
        const hasCoursePurchase = Boolean(enrollmentData);
        const hasLessonPurchase = lessonData.count > 0;
        const hasPurchase = hasCoursePurchase || hasLessonPurchase;

        const purchaseType: 'NONE' | 'LESSON' | 'COURSE' = hasCoursePurchase
          ? 'COURSE'
          : hasLessonPurchase
            ? 'LESSON'
            : 'NONE';

        const purchasedAt = hasCoursePurchase
          ? enrollmentData?.latest || null
          : hasLessonPurchase
            ? lessonData.latest
            : null;

        const amount = hasCoursePurchase ? enrollmentData?.amount || 0 : lessonData.amount;

        return {
          ...student,
          hasPurchase,
          purchaseType,
          purchasedAt,
          amount,
          purchasedLessonsCount: lessonData.count,
        };
      })
      .filter((student) => (notPurchasedOnly ? !student.hasPurchase : true));

    const purchased = rows.filter((student) => student.hasPurchase).length;
    const notPurchased = rows.length - purchased;
    const lessonPurchasesCount = rows.filter((student) => student.purchaseType === 'LESSON').length;
    const coursePurchasesCount = rows.filter((student) => student.purchaseType === 'COURSE').length;

    return NextResponse.json({
      success: true,
      students: rows,
      summary: {
        total: rows.length,
        purchased,
        notPurchased,
        lessonPurchases: lessonPurchasesCount,
        coursePurchases: coursePurchasesCount,
      },
    });
  } catch (error) {
    console.error('❌ خطأ في جلب بيانات مشتريات الحصص:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
