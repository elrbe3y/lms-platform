/**
 * 🎬 مشغل الفيديو الآمن - الحصن السيبراني الكامل
 * منصة محمد الربيعي التعليمية
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import DynamicWatermark from './DynamicWatermark';

interface SecureVideoPlayerProps {
  userPhone: string;
  userEmail: string;
  userName?: string;
  signedUrl: string;
  onProgress?: (watchedSeconds: number) => void;
}

export default function SecureVideoPlayer({
  userPhone,
  userEmail,
  userName,
  signedUrl,
  onProgress,
}: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<{ enableWatermark?: boolean; streamUrl?: string } | null>(null);

  // جلب بيانات الفيديو
  useEffect(() => {
    async function fetchVideoData() {
      try {
        const response = await fetch(signedUrl);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'فشل تحميل الفيديو');
        }

        setVideoData(data.video);
        setIsLoading(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'فشل تحميل الفيديو');
        setIsLoading(false);
      }
    }

    fetchVideoData();
  }, [signedUrl]);

  // تسجيل التقدم كل 10 ثواني
  useEffect(() => {
    if (!videoRef.current || !onProgress) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        const currentTime = Math.floor(videoRef.current.currentTime);
        onProgress(currentTime);
      }
    }, 10000); // كل 10 ثواني

    return () => clearInterval(interval);
  }, [onProgress]);

  // حماية ضد أدوات المطورين
  useEffect(() => {
    // منع النقر الأيمن
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // منع اختصارات لوحة المفاتيح
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        return false;
      }
    };

    // منع تحديد النص
    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    if (containerRef.current) {
      const container = containerRef.current;
      container.addEventListener('contextmenu', preventContextMenu);
      container.addEventListener('selectstart', preventSelection);
      document.addEventListener('keydown', preventKeyboardShortcuts);

      return () => {
        container.removeEventListener('contextmenu', preventContextMenu);
        container.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('keydown', preventKeyboardShortcuts);
      };
    }
  }, []);

  // منع التقاط الشاشة (محاولة إضافية)
  useEffect(() => {
    const detectScreenCapture = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        // إيقاف الفيديو مؤقتاً
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
    };

    document.addEventListener('visibilitychange', detectScreenCapture);
    
    return () => {
      document.removeEventListener('visibilitychange', detectScreenCapture);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[500px] items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-blue-500"></div>
          <p className="text-white">جاري تحميل الفيديو...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[500px] items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mb-4 text-6xl">🔒</div>
          <h3 className="mb-2 text-xl font-bold text-white">غير مصرح بالوصول</h3>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg bg-black"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* العلامة المائية الديناميكية */}
      {videoData?.enableWatermark && (
        <DynamicWatermark
          userPhone={userPhone}
          userEmail={userEmail}
          userName={userName}
        />
      )}

      {/* مشغل الفيديو */}
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      >
        <source src={videoData?.streamUrl} type="application/x-mpegURL" />
        <source src={videoData?.streamUrl} type="video/mp4" />
        متصفحك لا يدعم تشغيل الفيديو.
      </video>

      {/* طبقة حماية شفافة */}
      <div className="pointer-events-none absolute inset-0"></div>
    </div>
  );
}
