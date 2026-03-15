import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';
import { z } from 'zod';

const profileSchema = z.object({
  fullName: z.string().min(2).optional(),
  grade: z.string().optional(),
  parentPhone: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';
    const deviceId = generateDeviceId({ userAgent, ipAddress });
    const sessionCheck = await verifySession(token, deviceId);

    if (!sessionCheck.valid || !sessionCheck.userId || sessionCheck.role !== 'STUDENT') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionCheck.userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        parentPhone: true,
        email: true,
        grade: true,
        schoolName: true,
        governorate: true,
        walletBalance: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('❌ خطأ في جلب الملف الشخصي:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';
    const deviceId = generateDeviceId({ userAgent, ipAddress });
    const sessionCheck = await verifySession(token, deviceId);

    if (!sessionCheck.valid || !sessionCheck.userId || sessionCheck.role !== 'STUDENT') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
    }

    const updateData: Record<string, string> = {};
    if (parsed.data.fullName) updateData.fullName = parsed.data.fullName;
    if (parsed.data.grade) updateData.grade = parsed.data.grade;
    if (parsed.data.parentPhone !== undefined) updateData.parentPhone = parsed.data.parentPhone;

    const updatedUser = await prisma.user.update({
      where: { id: sessionCheck.userId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        phone: true,
        parentPhone: true,
        email: true,
        grade: true,
        schoolName: true,
        governorate: true,
        walletBalance: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('❌ خطأ في تحديث الملف الشخصي:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
