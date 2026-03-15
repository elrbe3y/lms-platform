import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        order: true,
        isPublished: true,
        targetGrade: true,
        modules: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                price: true,
                isFree: true,
                parts: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    sectionTitle: true,
                    title: true,
                    order: true,
                    provider: true,
                    videoUrl: true,
                    duration: true,
                  },
                },
                files: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    sectionTitle: true,
                    title: true,
                    order: true,
                    fileType: true,
                    fileUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, courses });
  } catch (error) {
    console.error('❌ خطأ في جلب شجرة المحتوى:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
