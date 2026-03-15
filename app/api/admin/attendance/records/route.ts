import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureAttendanceTables, normalizeAttendanceStatus } from '@/lib/attendance-system';

export async function GET() {
  try {
    await ensureAttendanceTables();

    const summaryRows = await prisma.$queryRawUnsafe<{ status: string; count: number }[]>(
      `SELECT status, COUNT(*)::int as count FROM attendance_records WHERE attendance_date = CURRENT_DATE GROUP BY status`
    );

    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };

    for (const row of summaryRows) {
      if (row.status in summary) {
        summary[row.status as keyof typeof summary] = Number(row.count || 0);
      }
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('❌ خطأ في جلب ملخص الحضور:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAttendanceTables();

    const body = await request.json();
    const studentId = String(body?.studentId || '').trim();
    const status = normalizeAttendanceStatus(body?.status);
    const source = body?.source === 'QR' ? 'QR' : 'MANUAL';
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';

    if (!studentId) {
      return NextResponse.json({ error: 'معرف الطالب مطلوب' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO attendance_records (id, user_id, attendance_date, status, source, notes, checkin_at)
      VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, NOW())
      ON CONFLICT (user_id, attendance_date)
      DO UPDATE SET status = EXCLUDED.status, source = EXCLUDED.source, notes = EXCLUDED.notes, checkin_at = NOW();
      `,
      randomUUID(),
      studentId,
      status,
      source,
      notes || null
    );

    return NextResponse.json({ success: true, message: 'تم تسجيل الحضور بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في تسجيل الحضور:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
