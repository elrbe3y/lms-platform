import { NextResponse } from 'next/server';
import { generateDeviceId, verifySession } from '@/lib/session-manager';

interface VerifySessionRequest {
  token?: string;
  userAgent?: string;
  ipAddress?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifySessionRequest;
    const token = body.token;

    if (!token) {
      return NextResponse.json({ valid: false, message: 'Missing token' }, { status: 400 });
    }

    const deviceId = generateDeviceId({
      userAgent: body.userAgent || '',
      ipAddress: body.ipAddress || '',
    });

    const result = await verifySession(token, deviceId);
    return NextResponse.json(result, { status: result.valid ? 200 : 401 });
  } catch (error) {
    console.error('Session verify error:', error);
    return NextResponse.json({ valid: false, message: 'Failed to verify session' }, { status: 500 });
  }
}
