import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnail: true,
                price: true,
                targetGrade: true,
              },
            },
          },
        },
        parts: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            sectionTitle: true,
            title: true,
            provider: true,
            videoUrl: true,
            order: true,
          },
        },
        files: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            sectionTitle: true,
            title: true,
            fileUrl: true,
            fileType: true,
            order: true,
          },
        },
        exams: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            passingScore: true,
            timeLimit: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    console.error('Error loading lesson details:', error);
    return NextResponse.json({ error: 'فشل تحميل تفاصيل الحصة' }, { status: 500 });
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const request = _request;
    const body = await request.json();

    const isDetailedUpdate = Array.isArray(body.sections);

    if (isDetailedUpdate) {
      if (!body.courseId || typeof body.moduleTitle !== 'string' || typeof body.lessonTitle !== 'string') {
        return NextResponse.json({ error: 'بيانات التعديل التفصيلي غير مكتملة' }, { status: 400 });
      }

      const course = await prisma.course.findUnique({
        where: { id: String(body.courseId) },
        select: { id: true },
      });

      if (!course) {
        return NextResponse.json({ error: 'الكورس المحدد غير موجود' }, { status: 404 });
      }

      const moduleTitle = String(body.moduleTitle).trim();
      const lessonTitle = String(body.lessonTitle).trim();

      if (!moduleTitle || !lessonTitle) {
        return NextResponse.json({ error: 'اسم الوحدة وعنوان الحصة مطلوبان' }, { status: 400 });
      }

      const existingModule = await prisma.module.findFirst({
        where: { courseId: course.id, title: moduleTitle },
        select: { id: true },
      });

      let targetModuleId = existingModule?.id;

      if (!targetModuleId) {
        const maxModuleOrder = await prisma.module.aggregate({
          where: { courseId: course.id },
          _max: { order: true },
        });

        const createdModule = await prisma.module.create({
          data: {
            courseId: course.id,
            title: moduleTitle,
            order: (maxModuleOrder._max.order ?? 0) + 1,
          },
          select: { id: true },
        });

        targetModuleId = createdModule.id;
      }

      const nextPrice = typeof body.lessonPrice === 'number' ? body.lessonPrice : 0;
      const nextIsFree = typeof body.lessonIsFree === 'boolean' ? body.lessonIsFree : nextPrice <= 0;

      await prisma.lesson.update({
        where: { id: params.id },
        data: {
          moduleId: targetModuleId,
          title: lessonTitle,
          description:
            body.lessonDescription === null || typeof body.lessonDescription === 'string'
              ? body.lessonDescription
              : undefined,
          price: nextPrice,
          isFree: nextIsFree,
        },
      });

      const sections = (body.sections as Array<{
        title?: string;
        videos?: Array<{ title?: string; videoUrl?: string }>;
        files?: Array<{ title?: string; fileUrl?: string; fileType?: string }>;
        exams?: Array<{ title?: string; passingScore?: number; timeLimit?: number }>;
      }>).map((section, sectionIndex) => ({
        title: (section.title || '').trim() || `القسم ${sectionIndex + 1}`,
        videos: (section.videos || []).filter((video) => (video.title || '').trim() && (video.videoUrl || '').trim()),
        files: (section.files || []).filter((file) => (file.title || '').trim() && (file.fileUrl || '').trim()),
        exams: (section.exams || []).filter((exam) => (exam.title || '').trim()),
      }));

      const videos = sections.flatMap((section) =>
        section.videos.map((video) => ({
          sectionTitle: section.title,
          title: (video.title || '').trim(),
          videoUrl: (video.videoUrl || '').trim(),
        }))
      );

      const files = sections.flatMap((section) =>
        section.files.map((file) => ({
          sectionTitle: section.title,
          title: (file.title || '').trim(),
          fileUrl: (file.fileUrl || '').trim(),
          fileType: (file.fileType || 'PDF').trim(),
        }))
      );

      const exams = sections.flatMap((section) =>
        section.exams.map((exam) => ({
          sectionTitle: section.title,
          title: (exam.title || '').trim(),
          passingScore: typeof exam.passingScore === 'number' ? exam.passingScore : 50,
          timeLimit: typeof exam.timeLimit === 'number' ? exam.timeLimit : null,
        }))
      );

      await prisma.lessonPart.deleteMany({ where: { lessonId: params.id } });
      await prisma.lessonFile.deleteMany({ where: { lessonId: params.id } });

      if (videos.length > 0) {
        await prisma.lessonPart.createMany({
          data: videos.map((video, index) => ({
            lessonId: params.id,
            sectionTitle: video.sectionTitle,
            title: video.title,
            provider: video.videoUrl.includes('youtu') ? 'YOUTUBE' : 'CUSTOM',
            videoUrl: video.videoUrl,
            order: index + 1,
          })),
        });
      }

      if (files.length > 0) {
        await prisma.lessonFile.createMany({
          data: files.map((file, index) => ({
            lessonId: params.id,
            sectionTitle: file.sectionTitle,
            title: file.title,
            fileUrl: file.fileUrl,
            fileType: file.fileType || 'PDF',
            order: index + 1,
          })),
        });
      }

      if (exams.length > 0) {
        const existingExams = await prisma.exam.findMany({
          where: { lessonId: params.id },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });

        for (let index = 0; index < exams.length; index += 1) {
          const exam = exams[index];
          const target = existingExams[index];

          if (target) {
            await prisma.exam.update({
              where: { id: target.id },
              data: {
                title: exam.title,
                passingScore: exam.passingScore,
                timeLimit: exam.timeLimit,
                description: `قسم: ${exam.sectionTitle}`,
              },
            });
          } else {
            await prisma.exam.create({
              data: {
                lessonId: params.id,
                title: exam.title,
                passingScore: exam.passingScore,
                timeLimit: exam.timeLimit,
                description: `قسم: ${exam.sectionTitle}`,
              },
            });
          }
        }
      }

      return NextResponse.json({ success: true, message: 'تم تحديث الحصة تفصيليًا بنجاح' });
    }

    const nextPrice = typeof body.price === 'number' ? body.price : undefined;
    const nextIsFree = typeof body.isFree === 'boolean' ? body.isFree : undefined;

    const updatedLesson = await prisma.lesson.update({
      where: { id: params.id },
      data: {
        title: typeof body.title === 'string' ? body.title.trim() : undefined,
        description:
          body.description === null || typeof body.description === 'string'
            ? body.description
            : undefined,
        price: nextPrice,
        isFree: nextIsFree,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        isFree: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, lesson: updatedLesson });
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json({ error: 'فشل تحديث الحصة' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Delete associated records first
    await prisma.lessonPart.deleteMany({
      where: { lessonId: id },
    });

    await prisma.lessonFile.deleteMany({
      where: { lessonId: id },
    });

    await prisma.lessonPurchase.deleteMany({
      where: { lessonId: id },
    });

    await prisma.lessonAccessLog.deleteMany({
      where: { lessonId: id },
    });

    // Delete the lesson
    const deletedLesson = await prisma.lesson.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف الحصة بنجاح',
      lesson: deletedLesson,
    });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json(
      { error: 'فشل حذف الحصة' },
      { status: 500 }
    );
  }
}
