import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const registerSchema = z
  .object({
    fullName: z.string().min(3),
    email: z.string().email(),
    phone: z.string().min(10).max(20),
    parentPhone: z.string().min(10).max(20).optional(),
    governorate: z.string().min(2).optional(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8).optional(),
    schoolName: z.string().min(2),
    grade: z.string().min(2),
    address: z.string().min(5),
    nationalIdImage: z.string().min(1),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || 'Invalid registration data';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const data = parsed.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
      },
      select: { id: true, email: true, phone: true },
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      if (existingUser.phone === data.phone) {
        return NextResponse.json({ error: 'Phone already registered' }, { status: 409 });
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        parentPhone: data.parentPhone,
        governorate: data.governorate,
        password: hashedPassword,
        schoolName: data.schoolName,
        grade: data.grade,
        address: data.address,
        nationalIdImage: data.nationalIdImage,
        role: 'STUDENT',
        status: 'PENDING_VERIFICATION',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully. Awaiting admin verification.',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);

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

    return NextResponse.json({ error: 'Failed to register account' }, { status: 500 });
  }
}
