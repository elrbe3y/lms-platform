import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

const topupSchema = z.object({
  amount: z.number().positive(),
  transferImageUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = topupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات الطلب غير صالحة' }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: sessionCheck.userId,
        amount: parsed.data.amount,
        method: 'VODAFONE_CASH',
        status: 'PENDING',
        transferImageUrl: parsed.data.transferImageUrl ?? null,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    await prisma.notification.create({
      data: {
        userId: sessionCheck.userId,
        type: 'ACCOUNT_STATUS',
        title: 'تم استلام طلب الشحن',
        message: 'تم إرسال طلب شحن المحفظة بنجاح وسيتم مراجعته من الإدارة.',
      },
    });

    return NextResponse.json({ success: true, payment, message: 'تم إرسال طلب الشحن بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في طلب شحن المحفظة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
