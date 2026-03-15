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

    const [user, payments, purchases] = await Promise.all([
      prisma.user.findUnique({
        where: { id: sessionCheck.userId },
        select: { walletBalance: true },
      }),
      prisma.payment.findMany({
        where: { userId: sessionCheck.userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.lessonPurchase.findMany({
        where: { userId: sessionCheck.userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          lesson: { select: { title: true } },
        },
      }),
    ]);

    const completedCredits = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    const completedDebits = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const balance = user?.walletBalance ?? 0;

    const creditTransactions = payments.map((payment) => ({
      id: payment.id,
      type: payment.status === 'COMPLETED' ? 'credit' : 'pending',
      description: `شحن رصيد عبر ${payment.method}`,
      amount: payment.amount,
      date: payment.createdAt,
      status: payment.status,
    }));

    const debitTransactions = purchases.map((purchase) => ({
      id: purchase.id,
      type: 'debit',
      description: `شراء حصة: ${purchase.lesson.title}`,
      amount: purchase.amount,
      date: purchase.createdAt,
      status: 'COMPLETED',
    }));

    const transactions = [...creditTransactions, ...debitTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({
      success: true,
      wallet: {
        balance,
        totalEarned: completedCredits,
        totalSpent: completedDebits,
        transactions,
      },
    });
  } catch (error) {
    console.error('❌ خطأ في جلب المحفظة:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
