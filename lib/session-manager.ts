/**
 * 🔐 نظام الجهاز الواحد (Single Device Login)
 * منصة محمد الربيعي التعليمية
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

// ====================================
// 1. توليد بصمة الجهاز
// ====================================

interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  deviceName?: string;
}

/**
 * توليد معرف فريد للجهاز
 */
export function generateDeviceId(deviceInfo: DeviceInfo): string {
  const data = `${deviceInfo.userAgent}|${deviceInfo.ipAddress}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ====================================
// 2. إنشاء جلسة جديدة
// ====================================

interface CreateSessionOptions {
  userId: string;
  deviceInfo: DeviceInfo;
  jwtToken: string;
  refreshToken?: string;
  expiresIn?: number; // بالثواني (افتراضي: 7 أيام)
}

/**
 * إنشاء جلسة جديدة وإنهاء الجلسات القديمة
 */
export async function createSession({
  userId,
  deviceInfo,
  jwtToken,
  refreshToken,
  expiresIn = 604800, // 7 أيام
}: CreateSessionOptions) {
  try {
    const deviceId = generateDeviceId(deviceInfo);

    // 1. إنهاء جميع الجلسات النشطة للمستخدم (تطبيق سياسة جهاز واحد)
    await prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // 2. إنشاء جلسة جديدة
    const expirationDate = new Date(Date.now() + expiresIn * 1000);

    const newSession = await prisma.session.create({
      data: {
        userId,
        deviceId,
        deviceName: deviceInfo.deviceName || extractDeviceName(deviceInfo.userAgent),
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        token: jwtToken,
        refreshToken,
        expiresAt: expirationDate,
        isActive: true,
      },
    });

    // 3. تحديث آخر تسجيل دخول للمستخدم
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    return { success: true, session: newSession };
  } catch (error) {
    console.error('❌ خطأ في إنشاء الجلسة:', error);
    return { success: false, error: 'فشل إنشاء الجلسة' };
  }
}

// ====================================
// 3. التحقق من الجلسة
// ====================================

/**
 * التحقق من صحة الجلسة
 */
export async function verifySession(
  token: string,
  deviceId: string
): Promise<{ valid: boolean; userId?: string; role?: 'ADMIN' | 'STUDENT'; message?: string }> {
  try {
    if (process.env.ENABLE_DEV_QUICK_LOGIN === 'true' && token.startsWith('dev.')) {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return { valid: false, message: 'JWT secret is missing' };
      }

      const rawToken = token.slice(4);
      const decoded = jwt.verify(rawToken, jwtSecret) as jwt.JwtPayload;
      const userId = typeof decoded.sub === 'string' ? decoded.sub : '';

      if (!userId || (decoded.role !== 'ADMIN' && decoded.role !== 'STUDENT')) {
        return { valid: false, message: 'Invalid dev session' };
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, status: true },
      });

      if (!user) {
        return { valid: false, message: 'User not found' };
      }

      if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
        return { valid: false, message: 'الحساب معلق' };
      }

      return { valid: true, userId, role: user.role };
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return { valid: false, message: 'الجلسة غير موجودة' };
    }

    // التحقق من تطابق الجهاز
    if (session.deviceId !== deviceId) {
      return { valid: false, message: 'الجهاز غير متطابق' };
    }

    // التحقق من حالة الجلسة
    if (!session.isActive) {
      return { valid: false, message: 'الجلسة غير نشطة - تم تسجيل الدخول من جهاز آخر' };
    }

    // التحقق من انتهاء الصلاحية
    if (session.expiresAt < new Date()) {
      await prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      return { valid: false, message: 'انتهت صلاحية الجلسة' };
    }

    // التحقق من حالة المستخدم
    if (session.user.status === 'SUSPENDED' || session.user.status === 'BANNED') {
      await prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      return { valid: false, message: 'الحساب معلق' };
    }

    // تحديث آخر نشاط
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    return { valid: true, userId: session.userId, role: session.user.role };
  } catch (error) {
    console.error('❌ خطأ في التحقق من الجلسة:', error);
    return { valid: false, message: 'خطأ في التحقق' };
  }
}

// ====================================
// 4. إنهاء الجلسة (تسجيل الخروج)
// ====================================

/**
 * إنهاء جلسة معينة
 */
export async function terminateSession(token: string): Promise<boolean> {
  try {
    await prisma.session.update({
      where: { token },
      data: { isActive: false },
    });
    return true;
  } catch (error) {
    console.error('❌ خطأ في إنهاء الجلسة:', error);
    return false;
  }
}

/**
 * إنهاء جميع جلسات مستخدم
 */
export async function terminateAllUserSessions(userId: string): Promise<boolean> {
  try {
    await prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    return true;
  } catch (error) {
    console.error('❌ خطأ في إنهاء الجلسات:', error);
    return false;
  }
}

// ====================================
// 5. مساعدات
// ====================================

/**
 * استخراج اسم الجهاز من User Agent
 */
function extractDeviceName(userAgent: string): string {
  // تبسيط User Agent لاستخراج نوع الجهاز
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Unknown Device';
}

/**
 * الحصول على جميع الجلسات النشطة لمستخدم
 */
export async function getUserActiveSessions(userId: string) {
  return await prisma.session.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gte: new Date() },
    },
    orderBy: { lastActiveAt: 'desc' },
  });
}

/**
 * تنظيف الجلسات المنتهية (Cron Job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: new Date() },
      },
      data: { isActive: false },
    });

    console.log(`🧹 تم تنظيف ${result.count} جلسة منتهية`);
    return result.count;
  } catch (error) {
    console.error('❌ خطأ في تنظيف الجلسات:', error);
    return 0;
  }
}
