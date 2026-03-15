/**
 * ✅ API: تفعيل حساب طالب
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

    // تحديث حالة الطالب إلى "نشط"
    const updatedStudent = await prisma.user.update({
      where: { id: studentId },
      data: { status: 'ACTIVE' },
    });

    // إرسال إشعار للطالب
    await prisma.notification.create({
      data: {
        userId: studentId,
        type: 'ACCOUNT_STATUS',
        title: '🎉 تم تفعيل حسابك',
        message: 'مرحباً بك في منصة محمد الربيعي التعليمية! يمكنك الآن البدء في التعلم.',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم تفعيل الحساب بنجاح',
      student: updatedStudent,
    });
  } catch (error) {
    console.error('❌ خطأ في تفعيل الحساب:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}
