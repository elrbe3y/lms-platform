import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status')?.trim();

    const payments = await prisma.payment.findMany({
      where: {
        ...(status ? { status: status as 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error('❌ خطأ في جلب المدفوعات:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
