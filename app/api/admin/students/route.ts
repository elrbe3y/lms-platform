import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search')?.trim();

    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        ...(search
          ? {
              OR: [
                { phone: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
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
        createdAt: true,
        lastLoginAt: true,
        nationalIdImage: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error('❌ خطأ في جلب الطلاب:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
