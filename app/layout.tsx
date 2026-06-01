import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PageTracker } from '@/components/PageTracker'

export const metadata: Metadata = {
  title: 'ฟันธง — Social Forecasting',
  description: 'ทายผลเหตุการณ์ แข่งกันด้วยสกิล ไม่มีเงินจริง',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0f0f13',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full">
      <body className="min-h-full antialiased">
        <PageTracker />
        {children}
      </body>
    </html>
  )
}
