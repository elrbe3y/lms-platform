/**
 * 🎥 API Endpoint: بث الفيديو المشفر
 * المسار: /api/video/stream
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifySignedUrl,
  checkUserVideoAccess,
  logSuspiciousActivity,
} from '@/lib/video-security';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 1. استخراج البارامترات
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('v');
    const userId = searchParams.get('u');
    const exp = searchParams.get('exp');
    const signature = searchParams.get('sig');

    // 2. التحقق من وجود كل البارامترات
    if (!videoId || !userId || !exp || !signature) {
      return NextResponse.json(
        { error: 'معاملات غير صالحة' },
        { status: 400 }
      );
    }

    // 3. التحقق من صحة التوقيع وانتهاء الصلاحية
    const isValid = verifySignedUrl(
      videoId,
      userId,
      parseInt(exp),
      signature
    );

    if (!isValid) {
      await logSuspiciousActivity(
        userId,
        videoId,
        'رابط غير صالح أو منتهي الصلاحية'
      );
      
      return NextResponse.json(
        { error: 'رابط غير صالح أو منتهي الصلاحية' },
        { status: 403 }
      );
    }

    // 4. التحقق الثانوي من الصلاحيات
    const hasAccess = await checkUserVideoAccess(userId, videoId);
    if (!hasAccess) {
      await logSuspiciousActivity(
        userId,
        videoId,
        'محاولة وصول غير مصرح بها'
      );
      
      return NextResponse.json(
        { error: 'غير مصرح لك بمشاهدة هذا الفيديو' },
        { status: 403 }
      );
    }

    // 5. جلب معلومات الفيديو
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    // 6. إرجاع رابط البث حسب نوع المزود
    let streamUrl: string;

    switch (video.provider) {
      case 'BUNNY_NET':
        // رابط HLS من Bunny.net
        streamUrl = video.streamingUrl || video.videoUrl;
        break;
      
      case 'YOUTUBE':
        // رابط يوتيوب (يُفضل تضمينه بطريقة آمنة)
        streamUrl = video.videoUrl;
        break;
      
      case 'CUSTOM':
        // رابط مخصص
        streamUrl = video.streamingUrl || video.videoUrl;
        break;
      
      default:
        streamUrl = video.videoUrl;
    }

    // 7. إرجاع البيانات
    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        streamUrl,
        duration: video.duration,
        enableWatermark: video.enableWatermark,
      },
    });

  } catch (error) {
    console.error('❌ خطأ في API البث:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}
