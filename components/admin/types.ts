export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  pendingVerification: number;
  suspendedStudents: number;
  totalCourses: number;
  totalRevenue: number;
  activeCodes: number;
  pendingPaymentRequests: number;
  onlineNow: number;
  inactiveSevenDays: number;
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  parentPhone: string | null;
  governorate: string | null;
  schoolName: string;
  grade: string;
  address: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: string;
  lastLoginAt: string | null;
  nationalIdImage: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  price?: number;
  isFree?: boolean;
  parts?: { id: string; title: string; order: number; sectionTitle?: string }[];
  files?: { id: string; title: string; order: number; sectionTitle?: string }[];
  module: {
    title: string;
    course: {
      title: string;
    };
  };
}

export interface Module {
  id: string;
  title: string;
  description: string | null;
  order: number;
  courseId: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  isFeatured: boolean;
  featuredOrder: number | null;
  modules: Module[];
  createdAt: string;
  updatedAt: string;
}

export interface LessonPartFormState {
  lessonId: string;
  sectionTitle: string;
  title: string;
  order: string;
  description: string;
  provider: 'YOUTUBE' | 'BUNNY_NET' | 'CUSTOM';
  videoUrl: string;
  streamingUrl: string;
  duration: string;
}

export interface LessonFileFormState {
  lessonId: string;
  sectionTitle: string;
  title: string;
  order: string;
  fileUrl: string;
  fileType: string;
}

export interface VideoFormState {
  lessonId: string;
  title: string;
  provider: 'YOUTUBE' | 'BUNNY_NET' | 'CUSTOM';
  videoUrl: string;
  streamingUrl: string;
  duration: string;
  pdfUrl: string;
  enableWatermark: boolean;
}

export interface ExamFormState {
  lessonId: string;
  title: string;
  description: string;
  passingScore: string;
  timeLimit: string;
  maxAttempts: string;
  shuffleQuestions: boolean;
  blockNextLesson: boolean;
  preventBackNavigation: boolean;
  questions: {
    questionText: string;
    questionImage: string;
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
    points: string;
    options: { text: string; isCorrect: boolean }[];
  }[];
}

export interface CreateLessonFormState {
  courseTitle: string;
  courseDescription: string;
  courseThumbnail: string;
  coursePrice: string;
  courseIsFree: boolean;
  courseTargetGrade: 'ALL' | 'FIRST' | 'SECOND' | 'THIRD';
  moduleTitle: string;
  lessonTitle: string;
  lessonDescription: string;
  lessonPrice: string;
}

export interface LessonVideoInput {
  title: string;
  videoUrl: string;
}

export interface LessonFileInput {
  title: string;
  fileUrl: string;
  fileType?: string;
}

export interface LessonOption {
  id: string;
  label: string;
}

export interface LessonAccessLogRow {
  id: string;
  openedAt: string;
  user: { id: string; fullName: string; phone: string; status: string };
}

export interface CodeUsageRow {
  id: string;
  usedAt: string;
  user: { id: string; fullName: string; phone: string } | null;
  lesson: { id: string; title: string } | null;
}

export interface CodeRow {
  id: string;
  code: string;
  type: 'LESSON_UNLOCK' | 'COURSE_ACCESS';
  credits: number;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  createdAt: string;
  expiresAt: string | null;
  usages: CodeUsageRow[];
}

export interface CodeGenerateFormState {
  quantity: string;
  type: 'LESSON_UNLOCK' | 'COURSE_ACCESS';
  credits: string;
  expiresInDays: string;
}

export interface PaymentRow {
  id: string;
  amount: number;
  method: 'FAWRY' | 'PAYMOB' | 'VODAFONE_CASH' | 'CODE';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transferImageUrl: string | null;
  createdAt: string;
  user: { id: string; fullName: string; phone: string };
}

export interface StudentProfileData {
  student: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    parentPhone: string | null;
    governorate: string | null;
    schoolName: string;
    grade: string;
    address: string;
    status: Student['status'];
    walletBalance: number;
    createdAt: string;
    lastLoginAt: string | null;
  };
  payments: {
    id: string;
    amount: number;
    method: 'FAWRY' | 'PAYMOB' | 'VODAFONE_CASH' | 'CODE';
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    providerReference: string | null;
    createdAt: string;
  }[];
  purchases: {
    id: string;
    amount: number;
    createdAt: string;
    lesson: { id: string; title: string; module: { title: string; course: { title: string } } };
  }[];
  accessLogs: {
    id: string;
    openedAt: string;
    lesson: { id: string; title: string; module: { title: string; course: { title: string } } };
  }[];
  grants: {
    id: string;
    lessonId: string;
    lesson: { id: string; title: string; module: { title: string; course: { title: string } } };
  }[];
  purchasedLessonIds: string[];
  grantedLessonIds: string[];
}
