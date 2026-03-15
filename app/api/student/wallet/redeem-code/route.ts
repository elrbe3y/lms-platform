import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateDeviceId, verifySession } from '@/lib/session-manager';
import { redeemCode } from '@/lib/code-system';
import { prisma } from '@/lib/db';

const redeemSchema = z.object({
  code: z.string().min(4),
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
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'الكود غير صالح' }, { status: 400 });
    }

    const result = await redeemCode({
      code: parsed.data.code,
      userId: sessionCheck.userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    const creditAmount = result.creditsUsed ?? 1;

    await prisma.payment.create({
      data: {
        userId: sessionCheck.userId,
        amount: creditAmount,
        method: 'CODE',
        status: 'COMPLETED',
        providerReference: parsed.data.code,
      },
    });

    await prisma.user.update({
      where: { id: sessionCheck.userId },
      data: { walletBalance: { increment: creditAmount } },
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      creditsRemaining: result.creditsRemaining,
      amountAdded: creditAmount,
    });
  } catch (error) {
    console.error('❌ خطأ في شحن الكود:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
