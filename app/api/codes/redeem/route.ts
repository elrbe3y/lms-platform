/**
 * ✨ API: استخدام كود من قبل الطالب
 */

import { NextRequest, NextResponse } from 'next/server';
import { redeemCode } from '@/lib/code-system';

export async function POST(request: NextRequest) {
  try {
    const { code, userId, lessonId } = await request.json();

    if (!code || !userId) {
      return NextResponse.json(
        { error: 'الكود ومعرف المستخدم مطلوبان' },
        { status: 400 }
      );
    }

    // استخدام الكود
    const result = await redeemCode({
      code,
      userId,
      lessonId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      creditsRemaining: result.creditsRemaining,
    });
  } catch (error) {
    console.error('❌ خطأ في استخدام الكود:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}
