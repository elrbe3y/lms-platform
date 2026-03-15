import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const urlOrRelativePathSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith('/') || /^https?:\/\//i.test(value), {
    message: 'invalid_url_or_path',
  });

const createLessonSchema = z
  .object({
    courseId: z.string().optional(),
    courseTitle: z.string().min(2).optional(),
    courseDescription: z.string().optional(),
    courseThumbnail: urlOrRelativePathSchema.optional(),
    coursePrice: z.number().min(0).optional(),
    courseIsFree: z.boolean().optional(),
    courseTargetGrade: z.enum(['ALL', 'FIRST', 'SECOND', 'THIRD']).optional(),
    moduleTitle: z.string().min(2),
    lessonTitle: z.string().min(2),
    lessonDescription: z.string().optional(),
    lessonPrice: z.number().min(0).optional(),
    sections: z
      .array(
        z.object({
          title: z.string().optional(),
          videos: z
            .array(
              z.object({
                title: z.string().min(1),
                videoUrl: urlOrRelativePathSchema,
              })
            )
            .optional(),
          files: z
            .array(
              z.object({
                title: z.string().min(1),
                fileUrl: urlOrRelativePathSchema,
                fileType: z.string().optional(),
              })
            )
            .optional(),
          exams: z
            .array(
              z.object({
                title: z.string().min(1),
                passingScore: z.number().min(0).max(100).optional(),
                timeLimit: z.number().int().min(1).max(300).optional(),
              })
            )
            .optional(),
        })
      )
      .optional(),
    videos: z
      .array(
        z.object({
          title: z.string().min(1),
          videoUrl: urlOrRelativePathSchema,
        })
      )
      .optional(),
    files: z
      .array(
        z.object({
          title: z.string().min(1),
          fileUrl: urlOrRelativePathSchema,
          fileType: z.string().optional(),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasCourseTitle = Boolean(data.courseTitle?.trim());
    if (!data.courseId && !hasCourseTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['courseTitle'],
        message: 'missing_course_reference',
      });
    }
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createLessonSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const issuePath = firstIssue?.path?.[0];
      const issuePathString = (firstIssue?.path || []).join('.');

      let message = 'بيانات الحصة غير صالحة';
      if (issuePath === 'courseTitle') {
        message = 'اختر الكورس أولاً قبل إنشاء الحصة';
      } else if (issuePath === 'moduleTitle') {
        message = 'اسم الوحدة مطلوب ويجب أن يكون حرفين على الأقل';
      } else if (issuePath === 'lessonTitle') {
        message = 'عنوان الحصة مطلوب ويجب أن يكون حرفين على الأقل';
      } else if (issuePath === 'lessonPrice') {
        message = 'سعر الحصة يجب أن يكون رقمًا أكبر من أو يساوي 0';
      } else if (issuePath === 'sections') {
        if (issuePathString.includes('fileUrl')) {
          message = 'رابط الملف داخل القسم غير صحيح. يجب أن يبدأ بـ / أو http/https';
        } else if (issuePathString.includes('videoUrl')) {
          message = 'رابط الفيديو داخل القسم غير صحيح. يجب أن يبدأ بـ / أو http/https';
        } else {
          message = 'بيانات أقسام الحصة غير صحيحة';
        }
      }

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const payload = parsed.data;
    if (payload.coursePrice === 0 && !payload.courseIsFree) {
      return NextResponse.json({ error: 'لا يمكن حفظ سعر 0 إلا عند اختيار كورس مجاني.' }, { status: 400 });
    }

    const existingCourse = payload.courseId
      ? await prisma.course.findUnique({
          where: { id: payload.courseId },
          select: { id: true, isPublished: true },
        })
      : await prisma.course.findFirst({
          where: { title: payload.courseTitle?.trim() || '' },
          select: { id: true, isPublished: true },
        });

    if (payload.courseId && !existingCourse) {
      return NextResponse.json({ error: 'الكورس المختار غير موجود' }, { status: 404 });
    }

    const course = existingCourse
      ? existingCourse
      : await prisma.course.create({
          data: {
            title: payload.courseTitle?.trim() || 'كورس بدون اسم',
            description: payload.courseDescription?.trim() || null,
            thumbnail: payload.courseThumbnail || null,
            price: payload.coursePrice ?? 0,
            targetGrade: payload.courseTargetGrade ?? 'ALL',
            isPublished: true,
          },
          select: { id: true, isPublished: true },
        });

    if (
      !course.isPublished ||
      (!payload.courseId &&
        (payload.courseDescription !== undefined ||
          payload.courseThumbnail !== undefined ||
          payload.coursePrice !== undefined ||
          payload.courseTargetGrade !== undefined))
    ) {
      await prisma.course.update({
        where: { id: course.id },
        data: {
          isPublished: true,
          ...(!payload.courseId && payload.courseDescription !== undefined
            ? { description: payload.courseDescription.trim() || null }
            : {}),
          ...(!payload.courseId && payload.courseThumbnail !== undefined
            ? { thumbnail: payload.courseThumbnail || null }
            : {}),
          ...(!payload.courseId && payload.coursePrice !== undefined ? { price: payload.coursePrice } : {}),
          ...(!payload.courseId && payload.courseTargetGrade ? { targetGrade: payload.courseTargetGrade } : {}),
        },
      });
    }

    const existingModule = await prisma.module.findFirst({
      where: {
        courseId: course.id,
        title: payload.moduleTitle,
      },
      select: { id: true },
    });

    const moduleRecord = existingModule
      ? existingModule
      : await prisma.module.create({
          data: {
            courseId: course.id,
            title: payload.moduleTitle,
            order: 1,
          },
          select: { id: true },
        });

    const maxOrder = await prisma.lesson.aggregate({
      where: { moduleId: moduleRecord.id },
      _max: { order: true },
    });

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: moduleRecord.id,
        title: payload.lessonTitle,
        description: payload.lessonDescription,
        order: (maxOrder._max.order ?? 0) + 1,
        price: payload.lessonPrice ?? 0,
      },
      select: { id: true, title: true },
    });

    const normalizedSections =
      payload.sections && payload.sections.length > 0
        ? payload.sections
        : [
            {
              title: 'المحتوى الرئيسي',
              videos: payload.videos || [],
              files: payload.files || [],
              exams: [],
            },
          ];

    const lessonSections = normalizedSections.map((section, sectionIndex) => ({
      title: section.title?.trim() || `القسم ${sectionIndex + 1}`,
      videos: (section.videos || []).filter((item) => item.title.trim() && item.videoUrl.trim()),
      files: (section.files || []).filter((item) => item.title.trim() && item.fileUrl.trim()),
      exams: (section.exams || []).filter((item) => item.title.trim()),
    }));

    const lessonVideos = lessonSections.flatMap((section) =>
      section.videos.map((video) => ({ ...video, sectionTitle: section.title }))
    );
    const lessonFiles = lessonSections.flatMap((section) =>
      section.files.map((file) => ({ ...file, sectionTitle: section.title }))
    );
    const lessonExams = lessonSections.flatMap((section) =>
      section.exams.map((exam) => ({ ...exam, sectionTitle: section.title }))
    );

    if (lessonVideos.length > 0) {
      await prisma.lessonPart.createMany({
        data: lessonVideos.map((video, index) => ({
          lessonId: lesson.id,
          sectionTitle: video.sectionTitle,
          title: video.title.trim(),
          provider: video.videoUrl.includes('youtu') ? 'YOUTUBE' : 'CUSTOM',
          videoUrl: video.videoUrl.trim(),
          order: index + 1,
        })),
      });
    }

    if (lessonFiles.length > 0) {
      await prisma.lessonFile.createMany({
        data: lessonFiles.map((file, index) => ({
          lessonId: lesson.id,
          sectionTitle: file.sectionTitle,
          title: file.title.trim(),
          fileUrl: file.fileUrl.trim(),
          fileType: file.fileType?.trim() || 'PDF',
          order: index + 1,
        })),
      });
    }

    if (lessonExams.length > 0) {
      await prisma.exam.createMany({
        data: lessonExams.map((exam) => ({
          lessonId: lesson.id,
          title: exam.title.trim(),
          passingScore: exam.passingScore ?? 50,
          timeLimit: exam.timeLimit,
          description: `قسم: ${exam.sectionTitle}`,
        })),
      });
    }

    const activeStudents = await prisma.user.findMany({
      where: { role: 'STUDENT', status: 'ACTIVE' },
      select: { id: true },
    });

    if (activeStudents.length > 0) {
      await prisma.notification.createMany({
        data: activeStudents.map((student) => ({
          userId: student.id,
          type: 'BROADCAST',
          title: 'حصة جديدة متاحة',
          message: `تم إضافة حصة جديدة: ${payload.lessonTitle}`,
        })),
      });
    }

    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    console.error('❌ خطأ في إنشاء الدرس:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
