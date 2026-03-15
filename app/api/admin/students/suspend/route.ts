/**
 * 🚫 API: تعليق حساب طالب
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json(
        { error: 'معرف الطالب مطلوب' },
        { status: 400 }
      );
    }

    // 1. تحديث حالة الطالب
    const updatedStudent = await prisma.user.update({
      where: { id: studentId },
      data: { status: 'SUSPENDED' },
    });

    // 2. إنهاء جميع جلساته النشطة
    await prisma.session.updateMany({
      where: { userId: studentId, isActive: true },
      data: { isActive: false },
    });

    // 3. إرسال إشعار للطالب
    await prisma.notification.create({
      data: {
        userId: studentId,
        type: 'ACCOUNT_STATUS',
        title: 'تم تعليق حسابك',
        message: 'تم تعليق حسابك من قبل الإدارة. يرجى التواصل معنا لمعرفة المزيد.',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم تعليق الحساب بنجاح',
      student: updatedStudent,
    });
  } catch (error) {
    console.error('❌ خطأ في تعليق الحساب:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}
