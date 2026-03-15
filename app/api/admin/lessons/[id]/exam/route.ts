import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const examSchema = z.object({
  examId: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  passingScore: z.number().min(0).max(100).default(50),
  timeLimit: z.number().int().min(1).max(300).optional(),
  maxAttempts: z.number().int().min(1).max(20).default(3),
  shuffleQuestions: z.boolean().default(false),
  blockNextLesson: z.boolean().default(true),
  preventBackNavigation: z.boolean().default(false),
  questions: z
    .array(
      z.object({
        questionText: z.string().min(2),
        questionImage: z.string().min(1).optional(),
        type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE']).default('MULTIPLE_CHOICE'),
        points: z.number().min(1).default(1),
        options: z.array(
          z.object({
            text: z.string().min(1),
            isCorrect: z.boolean(),
          })
        ),
      })
    )
    .min(1),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'الدرس غير موجود' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = examSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات الامتحان غير صالحة' }, { status: 400 });
    }

    const payload = parsed.data;

    const examData = {
      title: payload.title,
      description: payload.description,
      passingScore: payload.passingScore,
      timeLimit: payload.timeLimit,
      maxAttempts: payload.maxAttempts,
      shuffleQuestions: payload.shuffleQuestions,
      blockNextLesson: payload.blockNextLesson,
      preventBackNavigation: payload.preventBackNavigation,
    };

    let exam;
    if (payload.examId) {
      const existingExam = await prisma.exam.findFirst({
        where: { id: payload.examId, lessonId: lesson.id },
        select: { id: true },
      });

      if (!existingExam) {
        return NextResponse.json({ error: 'الامتحان غير موجود ضمن هذه الحصة' }, { status: 404 });
      }

      exam = await prisma.exam.update({
        where: { id: payload.examId },
        data: examData,
      });
    } else {
      exam = await prisma.exam.create({
          data: {
            lessonId: lesson.id,
            ...examData,
          },
        });
    }

    await prisma.answer.deleteMany({
      where: {
        question: {
          examId: exam.id,
        },
      },
    });

    await prisma.question.deleteMany({
      where: { examId: exam.id },
    });

    await prisma.question.createMany({
      data: payload.questions.map((question, index) => ({
        examId: exam.id,
        questionText: question.questionText,
        questionImage: question.questionImage,
        type: question.type,
        order: index + 1,
        points: question.points,
        options: question.options,
      })),
    });

    return NextResponse.json({ success: true, examId: exam.id, message: 'تم حفظ الامتحان بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في حفظ الامتحان:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
