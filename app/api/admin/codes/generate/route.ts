/**
 * 🎟️ API: توليد دفعة أكواد
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCodeBatch } from '@/lib/code-system';

export async function POST(request: NextRequest) {
  try {
    const { quantity, credits, expiresInDays } = await request.json();

    // التحقق من البيانات
    if (!quantity || quantity < 1 || quantity > 1000) {
      return NextResponse.json(
        { error: 'العدد يجب أن يكون بين 1 و 1000' },
        { status: 400 }
      );
    }

    // توليد الأكواد
    const codes = await generateCodeBatch({
      quantity,
      type: 'COURSE_ACCESS',
      credits: credits || 1,
      expiresInDays: expiresInDays || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `تم توليد ${codes.length} كود بنجاح`,
      codes,
    });
  } catch (error) {
    console.error('❌ خطأ في توليد الأكواد:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}
