/**
 * 🔒 نظام أمان الفيديو - مستوى "حصن سيبراني"
 * منصة محمد الربيعي التعليمية
 */

import crypto from 'crypto';
import { prisma } from './db';

// ====================================
// 1. توليد Signed URLs المشفرة
// ====================================

interface SignedUrlOptions {
  videoId: string;
  userId: string;
  expiresIn?: number; // بالثواني (افتراضي: 6 ساعات)
}

/**
 * توليد رابط فيديو مشفر ومؤقت
 * يُستخدم لمنع مشاركة الروابط
 */
export async function generateSignedVideoUrl({
  videoId,
  userId,
  expiresIn = 21600, // 6 ساعات
}: SignedUrlOptions): Promise<string | null> {
  try {
    // 1. التحقق من وجود الفيديو
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!video) {
      throw new Error('الفيديو غير موجود');
    }

    // 2. التحقق من صلاحية المستخدم
    const hasAccess = await checkUserVideoAccess(userId, videoId);
    if (!hasAccess) {
      throw new Error('المستخدم غير مصرح له بمشاهدة هذا الفيديو');
    }

    // 3. توليد التوقيع المشفر
    const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;
    const tokenData = {
      videoId,
      userId,
      exp: expirationTime,
    };

    const signature = generateSignature(tokenData);
    
    // 4. بناء الرابط المشفر
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const signedUrl = new URL(`${baseUrl}/api/video/stream`);
    signedUrl.searchParams.set('v', videoId);
    signedUrl.searchParams.set('u', userId);
    signedUrl.searchParams.set('exp', expirationTime.toString());
    signedUrl.searchParams.set('sig', signature);

    return signedUrl.toString();
  } catch (error) {
    console.error('❌ خطأ في توليد Signed URL:', error);
    return null;
  }
}

/**
 * التحقق من صحة الـ Signed URL
 */
export function verifySignedUrl(
  videoId: string,
  userId: string,
  exp: number,
  signature: string
): boolean {
  // 1. التحقق من عدم انتهاء الصلاحية
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime > exp) {
    console.warn('⏰ الرابط منتهي الصلاحية');
    return false;
  }

  // 2. التحقق من صحة التوقيع
  const expectedSignature = generateSignature({ videoId, userId, exp });
  if (signature !== expectedSignature) {
    console.warn('🚫 توقيع غير صحيح - محاولة اختراق محتملة');
    return false;
  }

  return true;
}

/**
 * توليد التوقيع الرقمي
 */
function generateSignature(data: { videoId: string; userId: string; exp: number }): string {
  const secret = process.env.VIDEO_SIGNING_SECRET || 'your-super-secret-key-change-in-production';
  const message = JSON.stringify(data);
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

// ====================================
// 2. التحقق من صلاحيات المستخدم
// ====================================

/**
 * التحقق من إمكانية وصول المستخدم للفيديو
 */
export async function checkUserVideoAccess(
  userId: string,
  videoId: string
): Promise<boolean> {
  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!video || !video.lesson) {
      return false;
    }

    const lesson = video.lesson;
    const course = lesson.module.course;

    // 1. إذا كان الدرس مجاني
    if (lesson.isFree) {
      return true;
    }

    // 2. التحقق من التسجيل في الكورس
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: course.id,
        isActive: true,
      },
    });

    if (!enrollment) {
      return false;
    }

    // 3. التحقق من انتهاء الصلاحية
    if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
      return false;
    }

    // 4. التحقق من إتمام الدرس السابق (إذا كان مطلوباً)
    if (lesson.requiresPreviousCompletion) {
      const previousLesson = await prisma.lesson.findFirst({
        where: {
          moduleId: lesson.moduleId,
          order: lesson.order - 1,
        },
      });

      if (previousLesson) {
        const progress = await prisma.lessonProgress.findUnique({
          where: {
            userId_lessonId: {
              userId,
              lessonId: previousLesson.id,
            },
          },
        });

        if (!progress || !progress.isCompleted) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('❌ خطأ في التحقق من الصلاحيات:', error);
    return false;
  }
}

// ====================================
// 3. HLS Streaming Support (Bunny.net)
// ====================================

/**
 * توليد رابط HLS مشفر لـ Bunny.net
 */
export function generateBunnyHlsUrl(
  videoLibraryId: string,
  videoGuid: string,
  expiresIn: number = 3600
): string {
  const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;
  const token = generateBunnyToken(videoLibraryId, videoGuid, expirationTime);
  
  return `https://video.bunnycdn.com/${videoLibraryId}/${videoGuid}/playlist.m3u8?token=${token}&expires=${expirationTime}`;
}

/**
 * توليد توكن Bunny.net
 */
function generateBunnyToken(
  libraryId: string,
  videoGuid: string,
  expirationTime: number
): string {
  const apiKey = process.env.BUNNY_STREAM_API_KEY || '';
  const data = `${libraryId}${videoGuid}${expirationTime}`;
  
  return crypto
    .createHmac('sha256', apiKey)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ====================================
// 4. تسجيل نشاط المشاهدة
// ====================================

interface WatchActivityData {
  userId: string;
  lessonId: string;
  watchedDuration: number; // بالثواني
  totalDuration: number;   // بالثواني
}

/**
 * تسجيل وتحديث تقدم المشاهدة
 */
export async function updateWatchProgress({
  userId,
  lessonId,
  watchedDuration,
  totalDuration,
}: WatchActivityData): Promise<void> {
  try {
    // حساب نسبة الإكمال
    const completionPercentage = (watchedDuration / totalDuration) * 100;
    const isCompleted = completionPercentage >= 80; // اعتبار الفيديو مكتملاً عند 80%

    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        watchedDuration,
        isCompleted,
        lastWatchedAt: new Date(),
      },
      create: {
        userId,
        lessonId,
        watchedDuration,
        isCompleted,
        lastWatchedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث التقدم:', error);
  }
}

// ====================================
// 5. حماية إضافية ضد التسريب
// ====================================

/**
 * توليد مفتاح تشفير فريد للفيديو
 */
export function generateVideoEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * التحقق من عدم وجود جلسات متعددة تشاهد نفس الفيديو
 */
export async function detectSimultaneousViewing(): Promise<boolean> {
  // يمكن إضافة منطق Redis للتحقق من الجلسات النشطة
  // هنا نضع مثالاً بسيطاً
  
  // في الإنتاج: استخدم Redis لتخزين الجلسات النشطة
  // const activeSession = await redis.get(`video:${videoId}:user:${userId}`);
  // if (activeSession) return true;
  
  return false;
}

/**
 * تسجيل محاولة وصول مشبوهة
 */
export async function logSuspiciousActivity(
  userId: string,
  videoId: string,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  console.warn(`🚨 نشاط مشبوه:`, {
    userId,
    videoId,
    reason,
    metadata,
    timestamp: new Date().toISOString(),
  });

  // يمكن إرسال تنبيه للأدمن أو تسجيل في قاعدة البيانات
  // await prisma.securityLog.create({ ... })
}
