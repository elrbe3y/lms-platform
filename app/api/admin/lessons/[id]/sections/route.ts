import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const renameSchema = z.object({
  oldTitle: z.string().min(1),
  newTitle: z.string().min(2),
});

const deleteSchema = z.object({
  sectionTitle: z.string().min(1),
});

const reorderSchema = z.object({
  sectionTitle: z.string().min(1),
  direction: z.enum(['UP', 'DOWN']),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = renameSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات تعديل القسم غير صالحة' }, { status: 400 });
    }

    const oldTitle = parsed.data.oldTitle.trim();
    const newTitle = parsed.data.newTitle.trim();

    if (!oldTitle || !newTitle) {
      return NextResponse.json({ error: 'عنوان القسم غير صالح' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!lesson) {
      return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
    }

    const [partsResult, filesResult] = await prisma.$transaction([
      prisma.lessonPart.updateMany({
        where: { lessonId: params.id, sectionTitle: oldTitle },
        data: { sectionTitle: newTitle },
      }),
      prisma.lessonFile.updateMany({
        where: { lessonId: params.id, sectionTitle: oldTitle },
        data: { sectionTitle: newTitle },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'تم تعديل عنوان القسم',
      updatedParts: partsResult.count,
      updatedFiles: filesResult.count,
    });
  } catch (error) {
    console.error('❌ خطأ في تعديل عنوان القسم:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات حذف القسم غير صالحة' }, { status: 400 });
    }

    const sectionTitle = parsed.data.sectionTitle.trim();
    if (!sectionTitle) {
      return NextResponse.json({ error: 'عنوان القسم غير صالح' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!lesson) {
      return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
    }

    const [deletedParts, deletedFiles] = await prisma.$transaction([
      prisma.lessonPart.deleteMany({ where: { lessonId: params.id, sectionTitle } }),
      prisma.lessonFile.deleteMany({ where: { lessonId: params.id, sectionTitle } }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'تم حذف القسم ومحتوياته',
      deletedParts: deletedParts.count,
      deletedFiles: deletedFiles.count,
    });
  } catch (error) {
    console.error('❌ خطأ في حذف القسم:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات ترتيب القسم غير صالحة' }, { status: 400 });
    }

    const sectionTitle = parsed.data.sectionTitle.trim();
    const direction = parsed.data.direction;

    const lesson = await prisma.lesson.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!lesson) {
      return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
    }

    const [parts, files] = await Promise.all([
      prisma.lessonPart.findMany({
        where: { lessonId: params.id },
        select: { id: true, sectionTitle: true, order: true },
      }),
      prisma.lessonFile.findMany({
        where: { lessonId: params.id },
        select: { id: true, sectionTitle: true, order: true },
      }),
    ]);

    const sectionMap = new Map<string, { title: string; minOrder: number; items: { type: 'PART' | 'FILE'; id: string; order: number }[] }>();

    for (const part of parts) {
      const title = (part.sectionTitle || 'المحتوى الرئيسي').trim() || 'المحتوى الرئيسي';
      if (!sectionMap.has(title)) {
        sectionMap.set(title, { title, minOrder: part.order, items: [] });
      }
      const section = sectionMap.get(title);
      if (section) {
        section.minOrder = Math.min(section.minOrder, part.order);
        section.items.push({ type: 'PART', id: part.id, order: part.order });
      }
    }

    for (const file of files) {
      const title = (file.sectionTitle || 'المحتوى الرئيسي').trim() || 'المحتوى الرئيسي';
      if (!sectionMap.has(title)) {
        sectionMap.set(title, { title, minOrder: file.order, items: [] });
      }
      const section = sectionMap.get(title);
      if (section) {
        section.minOrder = Math.min(section.minOrder, file.order);
        section.items.push({ type: 'FILE', id: file.id, order: file.order });
      }
    }

    const sortedSections = Array.from(sectionMap.values()).sort((a, b) => a.minOrder - b.minOrder);
    const currentIndex = sortedSections.findIndex((section) => section.title === sectionTitle);

    if (currentIndex === -1) {
      return NextResponse.json({ error: 'القسم غير موجود' }, { status: 404 });
    }

    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedSections.length) {
      return NextResponse.json({ success: true, message: 'القسم في الحد النهائي ولا يمكن نقله أكثر' });
    }

    const currentSection = sortedSections[currentIndex];
    const targetSection = sortedSections[targetIndex];

    const currentItems = [...currentSection.items].sort((a, b) => a.order - b.order);
    const targetItems = [...targetSection.items].sort((a, b) => a.order - b.order);

    const updates: ReturnType<typeof prisma.lessonPart.update>[] = [];
    const fileUpdates: ReturnType<typeof prisma.lessonFile.update>[] = [];

    currentItems.forEach((item, index) => {
      const newOrder = targetSection.minOrder + index;
      if (item.type === 'PART') {
        updates.push(prisma.lessonPart.update({ where: { id: item.id }, data: { order: newOrder } }));
      } else {
        fileUpdates.push(prisma.lessonFile.update({ where: { id: item.id }, data: { order: newOrder } }));
      }
    });

    targetItems.forEach((item, index) => {
      const newOrder = currentSection.minOrder + index;
      if (item.type === 'PART') {
        updates.push(prisma.lessonPart.update({ where: { id: item.id }, data: { order: newOrder } }));
      } else {
        fileUpdates.push(prisma.lessonFile.update({ where: { id: item.id }, data: { order: newOrder } }));
      }
    });

    await prisma.$transaction([...updates, ...fileUpdates]);

    return NextResponse.json({ success: true, message: 'تم تحديث ترتيب القسم بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في تحريك القسم:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
