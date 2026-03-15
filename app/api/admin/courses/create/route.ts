import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const createCourseSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  thumbnail: z
    .string()
    .trim()
    .refine((value) => value.startsWith('/') || /^https?:\/\//i.test(value), {
      message: 'invalid_thumbnail',
    })
    .optional()
    .nullable(),
  price: z.number().min(0).optional(),
  isFree: z.boolean().optional(),
  targetGrade: z.enum(['ALL', 'FIRST', 'SECOND', 'THIRD']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createCourseSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const issuePath = firstIssue?.path?.[0];

      let message = 'بيانات الكورس غير صالحة';
      if (issuePath === 'title') {
        message = 'اسم الكورس مطلوب ويجب أن يكون حرفين على الأقل';
      } else if (issuePath === 'thumbnail') {
        message = 'رابط الغلاف غير صحيح. استخدم رابطًا يبدأ بـ / أو http/https';
      } else if (issuePath === 'price') {
        message = 'سعر الكورس يجب أن يكون رقمًا أكبر من أو يساوي 0';
      } else if (issuePath === 'targetGrade') {
        message = 'الصف الدراسي المختار غير صحيح';
      }

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const title = parsed.data.title.trim();
    if (!title) {
      return NextResponse.json({ error: 'اسم الكورس مطلوب' }, { status: 400 });
    }

    const coursePrice = parsed.data.price ?? 0;
    const isFree = parsed.data.isFree ?? false;
    if (coursePrice === 0 && !isFree) {
      return NextResponse.json({ error: 'لا يمكن حفظ سعر 0 إلا عند اختيار كورس مجاني.' }, { status: 400 });
    }

    const existingCourse = await prisma.course.findFirst({
      where: { title },
      select: { id: true },
    });

    const course = existingCourse
      ? await prisma.course.update({
          where: { id: existingCourse.id },
          data: {
            description: parsed.data.description?.trim() || null,
            thumbnail: parsed.data.thumbnail || null,
            price: coursePrice,
            targetGrade: parsed.data.targetGrade ?? 'ALL',
            isPublished: true,
          },
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            price: true,
            targetGrade: true,
          },
        })
      : await prisma.course.create({
          data: {
            title,
            description: parsed.data.description?.trim() || null,
            thumbnail: parsed.data.thumbnail || null,
            price: coursePrice,
            targetGrade: parsed.data.targetGrade ?? 'ALL',
            isPublished: true,
          },
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            price: true,
            targetGrade: true,
          },
        });

    return NextResponse.json({
      success: true,
      message: existingCourse ? 'تم تحديث الكورس الموجود' : 'تم إنشاء الكورس بنجاح',
      course,
    });
  } catch (error) {
    console.error('❌ خطأ في إنشاء الكورس:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
