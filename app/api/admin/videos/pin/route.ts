import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';
import { z } from 'zod';

const togglePinSchema = z.object({
  partId: z.string(),
  isPinned: z.boolean(),
});

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
    const parsed = togglePinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
    }

    // Use raw query to update with new fields not yet in Prisma types
    await prisma.$executeRawUnsafe(
      `UPDATE "LessonPart" SET "isPinned" = $1, "pinnedAt" = $2 WHERE "id" = $3`,
      parsed.data.isPinned,
      parsed.data.isPinned ? new Date() : null,
      parsed.data.partId
    );

    const part = await prisma.lessonPart.findUnique({
      where: { id: parsed.data.partId },
      select: { id: true, title: true },
    });

    return NextResponse.json({ success: true, part });
  } catch (error) {
    console.error('❌ خطأ في تثبيت الفيديو:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
