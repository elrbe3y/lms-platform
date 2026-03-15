import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'منصة محمد الربيعي التعليمية',
  description: 'نظام إدارة تعلم متقدم لطلاب الثانوية العامة',
  keywords: ['فيزياء', 'ثانوية عامة', 'محمد الربيعي', 'تعليم أونلاين'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
