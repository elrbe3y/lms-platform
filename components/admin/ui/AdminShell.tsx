import type { ReactNode } from 'react';

type AdminTabKey =
  | 'overview'
  | 'students'
  | 'attendance'
  | 'content'
  | 'featured'
  | 'honor-board'
  | 'codes'
  | 'payments'
  | 'courses';

interface AdminKpi {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}

interface AdminNavItem {
  key: AdminTabKey;
  label: string;
  icon: ReactNode;
}

interface AdminShellProps {
  title: ReactNode;
  subtitle: string;
  currentSectionLabel: string;
  kpis: AdminKpi[];
  navItems: AdminNavItem[];
  activeTab: AdminTabKey;
  onTabChange: (tab: AdminTabKey) => void;
  children: ReactNode;
}

export function AdminShell({
  title,
  subtitle,
  currentSectionLabel,
  kpis,
  navItems,
  activeTab,
  onTabChange,
  children,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6" dir="rtl">
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="mt-2 text-gray-600">{subtitle}</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            القسم الحالي: <span className="font-bold">{currentSectionLabel}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs text-gray-600">{kpi.label}</div>
              <div className={`mt-1 text-xl font-bold ${kpi.valueClassName ?? 'text-gray-900'}`}>{kpi.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-3 xl:col-span-2">
          <div className="sticky top-4 rounded-2xl bg-white p-3 shadow-sm">
            <div className="mb-2 px-3 py-2 text-xs font-bold text-gray-500">الأقسام</div>
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onTabChange(item.key)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm font-semibold transition ${
                    activeTab === item.key ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="space-y-6 lg:col-span-9 xl:col-span-10">{children}</main>
      </div>
    </div>
  );
}
