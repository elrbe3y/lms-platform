import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

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

    const notifications = await prisma.notification.findMany({
      where: { userId: sessionCheck.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error('❌ خطأ في جلب الإشعارات:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
