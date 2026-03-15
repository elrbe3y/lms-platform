import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const codes = await prisma.code.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        code: true,
        type: true,
        credits: true,
        status: true,
        createdAt: true,
        expiresAt: true,
      },
      take: 10000,
    });

    const header = ['code', 'type', 'credits', 'status', 'createdAt', 'expiresAt'];
    const rows = codes.map((code) => [
      code.code,
      code.type,
      String(code.credits),
      code.status,
      code.createdAt.toISOString(),
      code.expiresAt ? code.expiresAt.toISOString() : '',
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="codes-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('❌ خطأ في تصدير الأكواد:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
