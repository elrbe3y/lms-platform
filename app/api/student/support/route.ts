import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

const supportSchema = z.object({
  name: z.string().trim().min(2, 'الاسم مطلوب'),
  phone: z.string().trim().optional(),
  issue: z.string().trim().min(10, 'يرجى كتابة تفاصيل أكثر عن المشكلة'),
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';
    const deviceId = generateDeviceId({ userAgent, ipAddress });
    const sessionCheck = await verifySession(token, deviceId);

    if (!sessionCheck.valid || !sessionCheck.userId || sessionCheck.role !== 'STUDENT') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = supportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'بيانات غير صحيحة' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({
      where: { id: sessionCheck.userId },
      select: { id: true, fullName: true, phone: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const normalizedPhone = parsed.data.phone?.trim() || student.phone;
    const supportMessage = [
      `طلب دعم جديد من الطالب: ${student.fullName}`,
      `الاسم المدخل: ${parsed.data.name}`,
      normalizedPhone ? `الهاتف: ${normalizedPhone}` : null,
      `الوصف: ${parsed.data.issue}`,
    ]
      .filter(Boolean)
      .join('\n');

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'BROADCAST',
          title: 'طلب دعم فني جديد',
          message: supportMessage,
        })),
      });
    }

    await prisma.notification.create({
      data: {
        userId: student.id,
        type: 'ACCOUNT_STATUS',
        title: 'تم استلام طلب الدعم',
        message: 'استلمنا طلبك وسيقوم فريق الدعم بالرد عليك في أقرب وقت.',
      },
    });

    return NextResponse.json({ success: true, message: 'تم إرسال طلب الدعم بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في إرسال طلب الدعم:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
