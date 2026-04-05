import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/session-manager';

const devLoginSchema = z.object({
  role: z.enum(['ADMIN', 'STUDENT']),
});

export async function POST(request: Request) {
  try {
    if (process.env.ENABLE_DEV_QUICK_LOGIN !== 'true') {
      return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = devLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { role } = parsed.data;

    let user = await prisma.user.findFirst({
      where: {
        role,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!user && role === 'STUDENT') {
      const createdStudent = await prisma.user.create({
        data: {
          fullName: 'طالب تجريبي',
          email: `demo.student.${Date.now()}@example.com`,
          phone: `01${Date.now().toString().slice(-9)}`,
          password: await bcrypt.hash('demo123456', 10),
          schoolName: 'مدرسة تجريبية',
          grade: 'THIRD',
          address: 'القاهرة',
          role: 'STUDENT',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      });

      user = createdStudent;
    }

    if (!user) {
      return NextResponse.json(
        { error: role === 'ADMIN' ? 'No active admin found' : 'No active student found' },
        { status: 404 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'Server misconfiguration: JWT_SECRET is missing' },
        { status: 503 }
      );
    }

    const token = jwt.sign({ sub: user.id, role: user.role, jti: randomUUID() }, jwtSecret, {
      expiresIn: '7d',
    });

    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for') || '';
    const ipAddress = forwardedFor.split(',')[0]?.trim() || '127.0.0.1';

    const sessionResult = await createSession({
      userId: user.id,
      deviceInfo: {
        userAgent,
        ipAddress,
      },
      jwtToken: token,
      expiresIn: 60 * 60 * 24 * 7,
    });

    if (!sessionResult.success) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      user,
      redirectTo: user.role === 'ADMIN' ? '/admin' : '/dashboard',
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Dev login error:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
