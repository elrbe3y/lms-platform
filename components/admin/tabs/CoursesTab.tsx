import Link from 'next/link';
import type { Course, Lesson, Module } from '../types';

interface CoursesTabProps {
  loadingCourses: boolean;
  courses: Course[];
  setEditingCourse: (course: Course) => void;
  setEditingModule: (module: Module) => void;
  setEditingLesson: (lesson: Lesson) => void;
  deleteLesson: (lessonId: string) => Promise<void>;
}

export function CoursesTab({
  loadingCourses,
  courses,
  setEditingCourse,
  setEditingModule,
  setEditingLesson,
  deleteLesson,
}: CoursesTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h3 className="mb-4 text-xl font-bold text-gray-900">الكورسات والحصص</h3>

        {!loadingCourses ? (
          courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{course.title}</h4>
                      <p className="mt-1 text-sm text-gray-600">{course.description}</p>
                    </div>
                    <button
                      onClick={() => setEditingCourse(course)}
                      className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      تعديل
                    </button>
                  </div>

                  {course.modules && course.modules.length > 0 && (
                    <div>
                      <div className="mb-2 text-sm font-semibold text-gray-700">الوحدات والحصص:</div>
                      <div className="mr-4 space-y-2">
                        {course.modules.map((module) => (
                          <div key={module.id} className="rounded border border-gray-200 bg-white p-3">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{module.title}</p>
                                <p className="text-xs text-gray-500">{module.lessons?.length ?? 0} حصص</p>
                              </div>
                              <button
                                onClick={() => setEditingModule(module)}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                تعديل الوحدة
                              </button>
                            </div>

                            {module.lessons && module.lessons.length > 0 && (
                              <div className="space-y-1 text-xs">
                                {module.lessons.map((lesson) => (
                                  <div key={lesson.id} className="flex items-center justify-between rounded bg-gray-50 p-2">
                                    <span className="text-gray-700">
                                      {lesson.title}
                                      {lesson.price && lesson.price > 0 && (
                                        <span className="mr-2 font-medium text-amber-600">({lesson.price} ج.م)</span>
                                      )}
                                    </span>
                                    <div className="flex gap-2">
                                      <Link
                                        href={`/admin/content?editLessonId=${lesson.id}`}
                                        className="text-emerald-600 hover:underline"
                                      >
                                        تعديل تفصيلي
                                      </Link>
                                      <button
                                        onClick={() => setEditingLesson(lesson)}
                                        className="text-blue-600 hover:underline"
                                      >
                                        تعديل
                                      </button>
                                      <button
                                        onClick={() => void deleteLesson(lesson.id)}
                                        className="text-red-600 hover:underline"
                                      >
                                        حذف
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">لا توجد كورسات بعد</p>
          )
        ) : (
          <p className="py-8 text-center text-gray-500">جاري التحميل...</p>
        )}
      </div>
    </div>
  );
}
