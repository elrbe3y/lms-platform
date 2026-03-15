import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status')?.trim();

    const codes = await prisma.code.findMany({
      where: {
        ...(status ? { status: status as 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED' } : {}),
      },
      include: {
        usages: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
            lesson: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { usedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return NextResponse.json({ success: true, codes });
  } catch (error) {
    console.error('❌ خطأ في جلب الأكواد:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
