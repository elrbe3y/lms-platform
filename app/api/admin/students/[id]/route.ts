import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const updateStudentSchema = z.object({
  fullName: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional(),
  parentPhone: z.string().min(10).max(20).optional().nullable(),
  governorate: z.string().min(2).optional().nullable(),
  schoolName: z.string().min(2).optional(),
  grade: z.string().min(2).optional(),
  address: z.string().min(3).optional(),
  nationalIdImage: z.string().optional().nullable(),
  status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });

    if (!existing || existing.role !== 'STUDENT') {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        parentPhone: true,
        governorate: true,
        schoolName: true,
        grade: true,
        address: true,
        status: true,
        nationalIdImage: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error('❌ خطأ في تعديل الطالب:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });

    if (!existing || existing.role !== 'STUDENT') {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ خطأ في حذف الطالب:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
