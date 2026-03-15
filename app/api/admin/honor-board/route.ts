import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';
import { z } from 'zod';

const honorBoardSchema = z.object({
  studentId: z.string(),
  reason: z.string().min(1),
});

export async function GET() {
  try {
    const entries = await prisma.honorBoardEntry.findMany({
      where: { isActive: true },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            fullName: true,
            grade: true,
            schoolName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ success: true, entries });
  } catch {
    return NextResponse.json({ success: true, entries: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';
    const deviceId = generateDeviceId({ userAgent, ipAddress });
    const sessionCheck = await verifySession(token, deviceId);

    if (!sessionCheck.valid || sessionCheck.role !== 'ADMIN') {
      return NextResponse.json({ error: 'الوصول مرفوض' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = honorBoardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
    }

    // تحقق من وجود الطالب
    const student = await prisma.user.findUnique({
      where: { id: parsed.data.studentId },
      select: { id: true, fullName: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    // تحقق من عدم تكرار الطالب
    const existingEntry = await prisma.honorBoardEntry.findFirst({
      where: { studentId: parsed.data.studentId, isActive: true },
    });

    if (existingEntry) {
      return NextResponse.json({ error: 'هذا الطالب موجود بالفعل في لوحة الشرف' }, { status: 400 });
    }

    const entry = await prisma.honorBoardEntry.create({
      data: {
        studentId: parsed.data.studentId,
        reason: parsed.data.reason,
      },
      select: {
        id: true,
        reason: true,
        student: { select: { id: true, fullName: true, grade: true } },
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('❌ خطأ في إضافة طالب للوحة الشرف:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';
    const deviceId = generateDeviceId({ userAgent, ipAddress });
    const sessionCheck = await verifySession(token, deviceId);

    if (!sessionCheck.valid || sessionCheck.role !== 'ADMIN') {
      return NextResponse.json({ error: 'الوصول مرفوض' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');

    if (!entryId) {
      return NextResponse.json({ error: 'معرف غير صحيح' }, { status: 400 });
    }

    await prisma.honorBoardEntry.update({
      where: { id: entryId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'تم حذف الطالب من لوحة الشرف' });
  } catch (error) {
    console.error('❌ خطأ في حذف الطالب من لوحة الشرف:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
