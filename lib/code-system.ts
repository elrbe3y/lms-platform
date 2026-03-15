/**
 * 🎟️ نظام توليد الأكواد الشاملة (Universal Codes)
 * منصة محمد الربيعي التعليمية
 */

import crypto from 'crypto';
import { prisma } from './db';

// ====================================
// 1. توليد كود فريد
// ====================================

/**
 * توليد كود مكون من 12 حرف/رقم فريد
 */
export function generateUniqueCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون أحرف ملتبسة
  let code = '';
  
  for (let i = 0; i < 12; i++) {
    const randomIndex = crypto.randomInt(0, characters.length);
    code += characters[randomIndex];
    
    // إضافة شرطة بعد كل 4 أحرف للقراءة السهلة
    if ((i + 1) % 4 === 0 && i !== 11) {
      code += '-';
    }
  }
  
  return code; // مثال: ABCD-EFGH-IJKL
}

/**
 * التحقق من عدم تكرار الكود
 */
export async function ensureUniqueCode(): Promise<string> {
  let code = generateUniqueCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const existing = await prisma.code.findUnique({
      where: { code },
    });
    
    if (!existing) {
      return code;
    }
    
    code = generateUniqueCode();
    attempts++;
  }
  
  throw new Error('فشل توليد كود فريد');
}

// ====================================
// 2. إنشاء دفعة أكواد
// ====================================

interface CreateCodesOptions {
  quantity: number;
  type: 'LESSON_UNLOCK' | 'COURSE_ACCESS';
  credits?: number;
  expiresInDays?: number;
}

/**
 * توليد دفعة من الأكواد
 */
export async function generateCodeBatch({
  quantity,
  type,
  credits = 1,
  expiresInDays,
}: CreateCodesOptions): Promise<string[]> {
  const codes: string[] = [];
  
  for (let i = 0; i < quantity; i++) {
    const code = await ensureUniqueCode();
    
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    
    await prisma.code.create({
      data: {
        code,
        type,
        credits,
        expiresAt,
        status: 'ACTIVE',
      },
    });
    
    codes.push(code);
  }
  
  return codes;
}

// ====================================
// 3. استخدام الكود
// ====================================

interface RedeemCodeOptions {
  code: string;
  userId: string;
  lessonId?: string;
}

interface RedeemCodeResult {
  success: boolean;
  message: string;
  creditsRemaining?: number;
  creditsUsed?: number;
}

/**
 * استخدام كود لفتح درس
 */
export async function redeemCode({
  code,
  userId,
  lessonId,
}: RedeemCodeOptions): Promise<RedeemCodeResult> {
  try {
    // 1. البحث عن الكود
    const codeRecord = await prisma.code.findUnique({
      where: { code: code.replace(/\s/g, '').toUpperCase() }, // إزالة المسافات والتحويل لأحرف كبيرة
      include: { usages: true },
    });

    if (!codeRecord) {
      return { success: false, message: 'الكود غير موجود' };
    }

    // 2. التحقق من حالة الكود
    if (codeRecord.status !== 'ACTIVE') {
      return { success: false, message: 'الكود غير صالح' };
    }

    // 3. التحقق من تاريخ الانتهاء
    if (codeRecord.expiresAt && codeRecord.expiresAt < new Date()) {
      await prisma.code.update({
        where: { id: codeRecord.id },
        data: { status: 'EXPIRED' },
      });
      return { success: false, message: 'الكود منتهي الصلاحية' };
    }

    // 4. حساب الرصيد المستخدم
    const usedCredits = codeRecord.usages.reduce(
      (sum, usage) => sum + usage.creditsUsed,
      0
    );
    const remainingCredits = codeRecord.credits - usedCredits;

    if (remainingCredits <= 0) {
      await prisma.code.update({
        where: { id: codeRecord.id },
        data: { status: 'USED' },
      });
      return { success: false, message: 'الكود مستخدم بالكامل' };
    }

    // 5. كود صالح لمرة واحدة فقط
    const creditsToConsume = remainingCredits;

    // 6. تسجيل الاستخدام
    if (lessonId) {
      // التحقق من عدم استخدام نفس الكود لنفس الدرس
      const existingUsage = await prisma.codeUsage.findFirst({
        where: {
          codeId: codeRecord.id,
          userId,
          lessonId,
        },
      });

      if (existingUsage) {
        return { success: false, message: 'تم استخدام هذا الكود لهذا الدرس مسبقاً' };
      }

      await prisma.codeUsage.create({
        data: {
          codeId: codeRecord.id,
          userId,
          lessonId,
          creditsUsed: creditsToConsume,
        },
      });

      await prisma.code.update({
        where: { id: codeRecord.id },
        data: { status: 'USED' },
      });

      return {
        success: true,
        message: 'تم فتح الدرس بنجاح!',
        creditsRemaining: 0,
        creditsUsed: creditsToConsume,
      };
    } else {
      // إضافة رصيد للمستخدم بدون ربط بدرس محدد
      await prisma.codeUsage.create({
        data: {
          codeId: codeRecord.id,
          userId,
          creditsUsed: creditsToConsume,
        },
      });

      await prisma.code.update({
        where: { id: codeRecord.id },
        data: { status: 'USED' },
      });

      return {
        success: true,
        message: 'تم شحن الكود بنجاح!',
        creditsRemaining: 0,
        creditsUsed: creditsToConsume,
      };
    }
  } catch (error) {
    console.error('❌ خطأ في استخدام الكود:', error);
    return { success: false, message: 'حدث خطأ، يرجى المحاولة لاحقاً' };
  }
}

// ====================================
// 4. التحقق من رصيد المستخدم
// ====================================

/**
 * حساب رصيد الطالب من الأكواد المستخدمة
 */
export async function getUserCodeCredits(userId: string): Promise<number> {
  const usages = await prisma.codeUsage.findMany({
    where: {
      userId,
      lessonId: null, // الأكواد غير المربوطة بدروس = رصيد متاح
    },
  });

  return usages.reduce((sum, usage) => sum + usage.creditsUsed, 0);
}

// ====================================
// 5. سجل الأكواد للأدمن
// ====================================

/**
 * جلب سجل استخدام كود معين
 */
export async function getCodeUsageHistory(codeId: string) {
  return await prisma.codeUsage.findMany({
    where: { codeId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      lesson: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { usedAt: 'desc' },
  });
}

/**
 * إلغاء كود
 */
export async function revokeCode(codeId: string): Promise<boolean> {
  try {
    await prisma.code.update({
      where: { id: codeId },
      data: { status: 'REVOKED' },
    });
    return true;
  } catch (error) {
    console.error('❌ خطأ في إلغاء الكود:', error);
    return false;
  }
}
