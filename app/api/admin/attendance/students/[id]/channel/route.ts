import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureAttendanceTables, normalizeChannelType } from '@/lib/attendance-system';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureAttendanceTables();

    const body = await request.json();
    const channelType = normalizeChannelType(body?.channelType);

    const student = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO student_channels (user_id, channel_type, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET channel_type = EXCLUDED.channel_type, updated_at = NOW();
      `,
      params.id,
      channelType
    );

    return NextResponse.json({ success: true, channelType });
  } catch (error) {
    console.error('❌ خطأ في تحديث نوع الطالب:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
