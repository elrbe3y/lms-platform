'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface StudentProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  grade: string;
  walletBalance: number;
  schoolName: string;
  governorate: string;
  status: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/student/profile', { cache: 'no-store', credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setStudent(data.user);
        }
      } catch (error) {
        console.error('خطأ في تحميل الملف الشخصي:', error);
      }
    };
    loadProfile();
  }, []);

  const menuItems = [
    {
      label: 'الصفحة الرئيسية',
      icon: HomeIcon,
      href: '/dashboard',
    },
    {
      label: 'الملف الشخصي',
      icon: UserIcon,
      href: '/dashboard/profile',
    },
    {
      label: 'الكورسات',
      icon: BookIcon,
      href: '/dashboard/courses',
    },
    {
      label: 'كورساتي',
      icon: GraduationIcon,
      href: '/dashboard/my-courses',
    },
    {
      label: 'نتائج الامتحانات',
      icon: AwardIcon,
      href: '/dashboard/exam-results',
    },
    {
      label: 'المحفظة',
      icon: WalletIcon,
      href: '/dashboard/wallet',
    },
    {
      label: 'عن المنصة',
      icon: InfoIcon,
      href: '/dashboard/about',
    },
    {
      label: 'سياسة الخصوصية',
      icon: ShieldIcon,
      href: '/dashboard/privacy',
    },
    {
      label: 'روابطنا الرسمية',
      icon: LinkIcon,
      href: '/dashboard/links',
    },
    {
      label: 'الدعم الفني',
      icon: SupportIcon,
      href: '/dashboard/support',
    },
  ];

  const handleLogout = async () => {
    try {
      // قد نضيف logout API لاحقاً
      localStorage.removeItem('session');
      router.push('/login');
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Hamburger Menu Button - Mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-40 md:hidden rounded-lg bg-blue-700 p-2 text-white shadow-lg"
        aria-label={isOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
      >
        {isOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>

      {/* Sidebar Overlay - Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-30 h-screen w-72 bg-gradient-to-b from-blue-900 to-blue-950 text-white shadow-xl transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        dir="rtl"
      >
        <div className="px-5 pb-3 pt-6 text-center">
          {!logoFailed ? (
            <Image
              src="/logo.png"
              alt="شعار منصة محمد الربيعي"
              width={220}
              height={80}
              className="mx-auto h-20 w-auto object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <>
              <div className="text-3xl font-black leading-none tracking-tight text-white">منصة محمد الربيعي</div>
              <div className="mt-2 text-xs font-semibold text-blue-200">التعليمية</div>
            </>
          )}
          {student?.fullName ? <div className="mt-2 text-xs text-blue-300">{student.fullName}</div> : null}
        </div>

        {/* Navigation Menu */}
        <nav className="h-[calc(100vh-180px)] space-y-3 overflow-y-auto px-4 pb-24 pt-3">
          {menuItems.map((item) => (
            (() => {
              const Icon = item.icon;
              return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-lg font-bold transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-blue-700 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                  : 'bg-blue-900/40 text-blue-100 hover:bg-blue-800/70'
              }`}
            >
              <span>{item.label}</span>
              <Icon className="h-6 w-6" />
            </Link>
              );
            })()
          ))}
        </nav>

        {/* Settings Section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-blue-800/80 bg-blue-950/90 p-4">
          <div className="space-y-2">
            <button
              onClick={handleLogout}
              className="w-full rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

    </>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19a3 3 0 0 1 3-3h13" />
      <path d="M7 4h13v16H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" />
    </svg>
  );
}

function GraduationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m2 9 10-5 10 5-10 5-10-5Z" />
      <path d="M6 11v4a6 3 0 0 0 12 0v-4" />
    </svg>
  );
}

function AwardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="6" />
      <path d="m8 14-1 7 5-3 5 3-1-7" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7a2 2 0 0 1 2-2h14v14H5a2 2 0 0 1-2-2V7Z" />
      <path d="M17 13h3v-3h-3a1.5 1.5 0 0 0 0 3Z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01" />
      <path d="M11 12h2v4h-2z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3 4 6v6c0 5 3.4 9.5 8 10 4.6-.5 8-5 8-10V6l-8-3Z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 20" />
    </svg>
  );
}

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
