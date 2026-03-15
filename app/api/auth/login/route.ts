import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/session-manager';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password format' }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        fullName: true,
        email: true,
        password: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status === 'PENDING_VERIFICATION') {
      return NextResponse.json(
        { error: 'Your account is pending admin verification' },
        { status: 403 }
      );
    }

    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      return NextResponse.json({ error: 'Your account is suspended' }, { status: 403 });
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
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
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
    console.error('Login error:', error);

    const message = error instanceof Error ? error.message : '';
    const dbUnavailable =
      message.includes('Environment variable not found: DATABASE_URL') ||
      message.includes("Can't reach database server") ||
      message.includes('P1001');

    if (dbUnavailable) {
      return NextResponse.json(
        {
          error:
            'Database is not configured or not running. Please set DATABASE_URL and start PostgreSQL.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
