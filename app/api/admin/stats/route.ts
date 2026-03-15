/**
 * 📊 API: إحصائيات لوحة تحكم الأدمن
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // التحقق من صلاحيات الأدمن (يجب إضافة middleware للمصادقة)
    // const session = await getServerSession(authOptions);
    // if (session?.user?.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    // }

    // 1. إحصائيات الطلاب
    const [
      totalStudents,
      activeStudents,
      pendingVerification,
      suspendedStudents,
      activeCodes,
      pendingPaymentRequests,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'PENDING_VERIFICATION' } }),
      prisma.user.count({ where: { role: 'STUDENT', status: 'SUSPENDED' } }),
      prisma.code.count({ where: { status: 'ACTIVE' } }),
      prisma.payment.count({ where: { method: 'VODAFONE_CASH', status: 'PENDING' } }),
    ]);

    // 2. إحصائيات الكورسات
    const totalCourses = await prisma.course.count();

    // 3. إجمالي الإيرادات
    const revenueData = await prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });
    const totalRevenue = revenueData._sum.amount || 0;

    // 4. الطلاب المتصلون الآن (خلال آخر 5 دقائق)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineNow = await prisma.session.count({
      where: {
        isActive: true,
        lastActiveAt: { gte: fiveMinutesAgo },
      },
    });

    // 5. الطلاب غير النشطين منذ 7 أيام
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const inactiveSevenDays = await prisma.user.count({
      where: {
        role: 'STUDENT',
        status: 'ACTIVE',
        lastLoginAt: { lt: sevenDaysAgo },
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        pendingVerification,
        suspendedStudents,
        totalCourses,
        totalRevenue,
        activeCodes,
        pendingPaymentRequests,
        onlineNow,
        inactiveSevenDays,
      },
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الإحصائيات:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}
