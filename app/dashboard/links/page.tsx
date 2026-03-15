'use client';

export default function OfficialLinksPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6" dir="rtl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">روابطنا الرسمية</h1>
        <p className="mt-3 text-sm text-gray-600">تابعنا على منصاتنا الرسمية.</p>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <a
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-blue-700 hover:bg-blue-50"
            href="https://example.com"
            target="_blank"
            rel="noreferrer"
          >
            <span>الموقع الرسمي</span>
            <GlobeIcon className="h-5 w-5" />
          </a>
          <a
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-blue-700 hover:bg-blue-50"
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer"
          >
            <span>فيسبوك</span>
            <FacebookIcon className="h-5 w-5" />
          </a>
          <a
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-blue-700 hover:bg-blue-50"
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
          >
            <span>انستجرام</span>
            <InstagramIcon className="h-5 w-5" />
          </a>
          <a
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-blue-700 hover:bg-blue-50"
            href="https://youtube.com"
            target="_blank"
            rel="noreferrer"
          >
            <span>يوتيوب</span>
            <YoutubeIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h2v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 8.1c0-1.1-.9-2.1-2-2.2C18.2 5.6 12 5.6 12 5.6s-6.2 0-8 .3c-1.1.1-2 1.1-2 2.2C2 10 2 12 2 12s0 2 .1 3.9c0 1.1.9 2.1 2 2.2 1.8.3 8 .3 8 .3s6.2 0 8-.3c1.1-.1 2-1.1 2-2.2.1-1.9.1-3.9.1-3.9s0-2-.1-3.9ZM10 15.3V8.7L16 12l-6 3.3Z" />
    </svg>
  );
}
