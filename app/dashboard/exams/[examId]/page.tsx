'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ExamQuestion {
  id: string;
  questionText: string;
  questionImage?: string | null;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  order: number;
  points: number;
  options: { text: string }[];
}

interface ExamPayload {
  id: string;
  title: string;
  description?: string | null;
  timeLimit?: number | null;
  maxAttempts: number;
  preventBackNavigation: boolean;
  questions: ExamQuestion[];
}

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [exam, setExam] = useState<ExamPayload | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    async function loadExam() {
      try {
        const response = await fetch(`/api/student/exams/${examId}`, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'فشل تحميل الامتحان');
        }

        setExam(data.exam);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشل تحميل الامتحان');
      } finally {
        setLoading(false);
      }
    }

    void loadExam();
  }, [examId]);

  useEffect(() => {
    if (!exam) return;

    async function startAttempt(timeLimit?: number | null) {
      try {
        const response = await fetch(`/api/student/exams/${examId}/start`, {
          method: 'POST',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'تعذر بدء الامتحان');
        }

        setAttemptId(data.attempt.id);
        if (timeLimit) {
          setTimeLeft(timeLimit * 60);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'تعذر بدء الامتحان');
      }
    }

    void startAttempt(exam.timeLimit);
  }, [exam, examId]);

  const submitExam = useCallback(async () => {
    if (!attemptId) return;

    try {
      const response = await fetch(`/api/student/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
            questionId,
            selectedOption,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل تسليم الامتحان');
      }

      alert(`تم تسجيل نتيجتك. النسبة: ${Math.round(data.result.percentage)}%`);
      router.push('/dashboard/exam-results');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل تسليم الامتحان');
    }
  }, [answers, attemptId, examId, router]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      void submitExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(timer);
  }, [submitExam, timeLeft]);

  const currentQuestion = useMemo(() => {
    if (!exam) return null;
    return exam.questions[currentIndex] ?? null;
  }, [exam, currentIndex]);

  const formattedTime = useMemo(() => {
    if (timeLeft === null) return null;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">جاري تحميل الامتحان...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="rounded bg-red-50 border border-red-200 p-6 text-red-700">{error}</div>
      </div>
    );
  }

  if (!exam || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-gray-600">لا يوجد امتحان متاح.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
              {exam.description ? <p className="text-gray-600 mt-1">{exam.description}</p> : null}
            </div>
            {formattedTime && (
              <div className="rounded bg-blue-50 px-4 py-2 text-blue-700 font-semibold">{formattedTime}</div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md space-y-4">
          <div className="text-sm text-gray-500">سؤال {currentIndex + 1} من {exam.questions.length}</div>
          <div className="text-lg font-semibold text-gray-900">{currentQuestion.questionText}</div>
          {currentQuestion.questionImage ? (
            <Image
              src={currentQuestion.questionImage}
              alt="question"
              width={960}
              height={360}
              className="max-h-64 w-auto rounded border"
            />
          ) : null}

          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <label key={option.text} className="flex items-center gap-3 rounded border px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  checked={answers[currentQuestion.id] === option.text}
                  onChange={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: option.text,
                    }))
                  }
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            className="rounded border px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            disabled={exam.preventBackNavigation || currentIndex === 0}
          >
            السابق
          </button>
          {currentIndex < exam.questions.length - 1 ? (
            <button
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, exam.questions.length - 1))}
            >
              التالي
            </button>
          ) : (
            <button
              className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              onClick={() => void submitExam()}
            >
              إنهاء الامتحان
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
