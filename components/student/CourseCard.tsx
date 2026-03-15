import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';

interface CourseCardStat {
  label: string;
  value: string | number;
}

interface CourseCardProps {
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  topBadgeText: string;
  tagText?: string;
  extraBadges?: ReactNode;
  descriptionFallback?: string;
  stats: CourseCardStat[];
  footerHint?: ReactNode;
  actionHref?: string;
  actionOnClick?: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
  fallbackIcon?: ReactNode;
}

export function CourseCard({
  title,
  description,
  thumbnail,
  topBadgeText,
  tagText = 'اللغة العربية - الصف الثالث الثانوي',
  extraBadges,
  descriptionFallback = 'كورس منظم يشمل شرحاً وتدريبات وأجزاء متعددة داخل كل محاضرة.',
  stats,
  footerHint = <span className="text-xs text-gray-600">جاهز لبدء الكورس؟</span>,
  actionHref,
  actionOnClick,
  actionLabel,
  actionDisabled = false,
  fallbackIcon,
}: CourseCardProps) {
  const normalizedStats = stats.slice(0, 3);

  return (
    <article className="overflow-hidden rounded-2xl border border-blue-200 bg-white text-gray-900 shadow-lg">
      <div className="relative h-56 w-full overflow-hidden">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-500 text-white">
            {fallbackIcon || <DefaultBookIcon className="h-14 w-14" />}
          </div>
        )}

        <div className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-blue-800 shadow-sm">
          {topBadgeText}
        </div>
      </div>

      <div className="border-t border-blue-100 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {tagText}
          </span>
          {extraBadges}
        </div>

        <h3 className="line-clamp-2 text-xl font-black leading-tight text-gray-900">{title}</h3>

        <p className="mt-3 line-clamp-3 text-sm text-gray-600">{description || descriptionFallback}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-blue-100 py-3 text-center">
          {normalizedStats.map((stat, index) => (
            <div key={`${stat.label}-${index}`}>
              <div className="mx-auto mb-1 flex w-fit items-center justify-center text-blue-600">
                {index === 0 ? <ChartIcon className="h-4 w-4" /> : index === 1 ? <VideoIcon className="h-4 w-4" /> : <ExamIcon className="h-4 w-4" />}
              </div>
              <div className="text-[11px] text-gray-500">{stat.label}</div>
              <div className="text-sm font-bold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>{footerHint}</div>
          {actionOnClick ? (
            <button
              type="button"
              onClick={actionOnClick}
              disabled={actionDisabled}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLabel}
            </button>
          ) : actionHref ? (
            <Link href={actionHref} className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700">
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DefaultBookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5h16" />
      <path d="M6 4h10a3 3 0 0 1 3 3v12H9a3 3 0 0 0-3 3z" />
      <path d="M6 4a2 2 0 0 0-2 2v13.5a2 2 0 0 0 2 2" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M7 14v4" />
      <path d="M12 10v8" />
      <path d="M17 6v12" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="M17 10l4-2v8l-4-2z" />
    </svg>
  );
}

function ExamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3h6" />
      <path d="M10 8h4" />
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <path d="M9 13l2 2 4-4" />
    </svg>
  );
}
