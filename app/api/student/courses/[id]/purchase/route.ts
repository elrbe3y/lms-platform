import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, price: true, isPublished: true },
    });

    if (!course || !course.isPublished) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { userId: sessionCheck.userId, courseId: course.id, isActive: true },
      select: { id: true },
    });

    if (existingEnrollment) {
      return NextResponse.json({ error: 'الكورس مشترك بالفعل' }, { status: 400 });
    }

    if (course.price <= 0) {
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: sessionCheck.userId, courseId: course.id } },
        update: { isActive: true, expiresAt: null },
        create: { userId: sessionCheck.userId, courseId: course.id, isActive: true },
      });

      return NextResponse.json({ success: true, message: 'تم تفعيل الكورس المجاني بنجاح' });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionCheck.userId },
      select: { walletBalance: true },
    });

    const balance = user?.walletBalance ?? 0;
    if (balance < course.price) {
      return NextResponse.json({ error: 'الرصيد غير كاف' }, { status: 400 });
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: sessionCheck.userId },
        data: { walletBalance: { decrement: course.price } },
        select: { walletBalance: true },
      }),
      prisma.enrollment.upsert({
        where: { userId_courseId: { userId: sessionCheck.userId, courseId: course.id } },
        update: { isActive: true, expiresAt: null },
        create: { userId: sessionCheck.userId, courseId: course.id, isActive: true },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId: sessionCheck.userId,
        type: 'PAYMENT_SUCCESS',
        title: 'تم شراء الكورس',
        message: `تم شراء كورس ${course.title} بنجاح.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم شراء الكورس بنجاح',
      balance: updatedUser.walletBalance,
    });
  } catch (error) {
    console.error('❌ خطأ في شراء الكورس:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
