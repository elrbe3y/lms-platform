import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, status: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'طلب الدفع غير موجود' }, { status: 404 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'الطلب ليس قيد الانتظار' }, { status: 400 });
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'COMPLETED', reviewedAt: new Date() },
    });

    await prisma.user.update({
      where: { id: payment.userId },
      data: { walletBalance: { increment: updated.amount } },
    });

    await prisma.notification.create({
      data: {
        userId: payment.userId,
        type: 'PAYMENT_SUCCESS',
        title: 'تم قبول طلب الشحن',
        message: 'تم قبول طلب شحن المحفظة وإضافة الرصيد بنجاح.',
      },
    });

    return NextResponse.json({ success: true, payment: updated });
  } catch (error) {
    console.error('❌ خطأ في اعتماد الدفع:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
