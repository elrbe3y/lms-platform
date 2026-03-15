import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json({ error: 'معرف الطالب مطلوب' }, { status: 400 });
    }

    const updatedStudent = await prisma.user.update({
      where: { id: studentId },
      data: { status: 'BANNED' },
    });

    await prisma.session.updateMany({
      where: { userId: studentId, isActive: true },
      data: { isActive: false },
    });

    await prisma.notification.create({
      data: {
        userId: studentId,
        type: 'ACCOUNT_STATUS',
        title: 'تم حظر الحساب',
        message: 'تم حظر حسابك من المنصة. يرجى التواصل مع الإدارة.',
      },
    });

    return NextResponse.json({ success: true, message: 'تم حظر الطالب بنجاح', student: updatedStudent });
  } catch (error) {
    console.error('❌ خطأ في حظر الطالب:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
