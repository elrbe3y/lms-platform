import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const student = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        parentPhone: true,
        governorate: true,
        schoolName: true,
        grade: true,
        address: true,
        status: true,
        walletBalance: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!student || student.status === null) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const [payments, purchases, accessLogs, grants] = await Promise.all([
      prisma.payment.findMany({
        where: { userId: params.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          createdAt: true,
          providerReference: true,
        },
      }),
      prisma.lessonPurchase.findMany({
        where: { userId: params.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          lesson: {
            select: {
              id: true,
              title: true,
              module: { select: { title: true, course: { select: { title: true } } } },
            },
          },
        },
      }),
      prisma.lessonAccessLog.findMany({
        where: { userId: params.id },
        orderBy: { openedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          openedAt: true,
          lesson: {
            select: {
              id: true,
              title: true,
              module: { select: { title: true, course: { select: { title: true } } } },
            },
          },
        },
      }),
      prisma.lessonGrant.findMany({
        where: { userId: params.id },
        select: {
          id: true,
          lessonId: true,
          lesson: {
            select: {
              id: true,
              title: true,
              module: { select: { title: true, course: { select: { title: true } } } },
            },
          },
        },
      }),
    ]);

    const purchasedLessonIds = new Set(purchases.map((p) => p.lesson.id));
    const grantedLessonIds = new Set(grants.map((g) => g.lessonId));

    return NextResponse.json({
      success: true,
      profile: {
        student,
        payments,
        purchases,
        accessLogs,
        grants,
        purchasedLessonIds: Array.from(purchasedLessonIds),
        grantedLessonIds: Array.from(grantedLessonIds),
      },
    });
  } catch (error) {
    console.error('❌ خطأ في جلب بروفايل الطالب:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
