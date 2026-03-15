import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'كلمة المرور الجديدة غير صالحة' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);

    await prisma.user.update({
      where: { id: params.id },
      data: { password: hashedPassword },
    });

    await prisma.session.updateMany({
      where: { userId: params.id, isActive: true },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور وتسجيل خروج الطالب من جميع الأجهزة' });
  } catch (error) {
    console.error('❌ خطأ في تغيير كلمة مرور الطالب:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
