/**
 * 💧 العلامة المائية الديناميكية المتحركة
 * منع تسجيل وتصوير الشاشة - منصة محمد الربيعي
 */

'use client';

import { useEffect, useState, useRef } from 'react';

interface DynamicWatermarkProps {
  userPhone: string;
  userEmail: string;
  userName?: string;
}

export default function DynamicWatermark({
  userPhone,
  userEmail,
  userName,
}: DynamicWatermarkProps) {
  const [position, setPosition] = useState({ x: 10, y: 10 });
  const [opacity, setOpacity] = useState(0.4);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // حركة عشوائية كل 3-5 ثواني
    const moveInterval = setInterval(() => {
      if (containerRef.current) {
        const container = containerRef.current.parentElement;
        if (!container) return;

        const maxX = container.clientWidth - 300; // عرض العلامة المائية
        const maxY = container.clientHeight - 80; // ارتفاع العلامة المائية

        const newX = Math.random() * maxX;
        const newY = Math.random() * maxY;

        setPosition({ x: newX, y: newY });
        
        // تغيير الشفافية عشوائياً (بين 0.3 و 0.6)
        setOpacity(0.3 + Math.random() * 0.3);
      }
    }, Math.random() * 2000 + 3000); // بين 3-5 ثواني

    return () => clearInterval(moveInterval);
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute z-50 select-none transition-all duration-1000 ease-in-out"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity,
      }}
    >
      <div className="rounded-lg bg-gradient-to-r from-red-500/20 to-orange-500/20 px-4 py-2 backdrop-blur-sm">
        <div className="space-y-0.5 text-xs font-semibold text-white drop-shadow-lg">
          {userName && (
            <div className="text-shadow">{userName}</div>
          )}
          <div className="text-shadow">{userPhone}</div>
          <div className="text-shadow">{userEmail}</div>
        </div>
      </div>
    </div>
  );
}
