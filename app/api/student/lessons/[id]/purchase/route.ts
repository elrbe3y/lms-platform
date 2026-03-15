import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        price: true,
        isFree: true,
        module: { select: { courseId: true } },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
    }

    if (lesson.isFree || lesson.price <= 0) {
      return NextResponse.json({ error: 'الحصة مجانية بالفعل' }, { status: 400 });
    }

    const [grant, purchase] = await Promise.all([
      prisma.lessonGrant.findFirst({
        where: { userId: sessionCheck.userId, lessonId: params.id },
        select: { id: true },
      }),
      prisma.lessonPurchase.findFirst({
        where: { userId: sessionCheck.userId, lessonId: params.id },
        select: { id: true },
      }),
    ]);

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: sessionCheck.userId, courseId: lesson.module.courseId, isActive: true },
      select: { id: true },
    });

    if (enrollment) {
      return NextResponse.json({ error: 'لديك بالفعل وصول كامل للكورس وكل حصصه' }, { status: 400 });
    }

    if (grant || purchase) {
      return NextResponse.json({ error: 'الحصة مفعلة بالفعل' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionCheck.userId },
      select: { walletBalance: true },
    });

    const balance = user?.walletBalance ?? 0;
    if (balance < lesson.price) {
      return NextResponse.json({ error: 'الرصيد غير كاف' }, { status: 400 });
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: sessionCheck.userId },
        data: { walletBalance: { decrement: lesson.price } },
        select: { walletBalance: true },
      }),
      prisma.lessonPurchase.create({
        data: {
          userId: sessionCheck.userId,
          lessonId: params.id,
          amount: lesson.price,
        },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId: sessionCheck.userId,
        type: 'PAYMENT_SUCCESS',
        title: 'تم شراء الحصة',
        message: `تم شراء حصة ${lesson.title} بنجاح.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم شراء الحصة بنجاح',
      balance: updatedUser.walletBalance,
    });
  } catch (error) {
    console.error('❌ خطأ في شراء الحصة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
