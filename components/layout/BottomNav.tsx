'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, User, PlusCircle, Clock } from 'lucide-react'

const LINKS = [
  { href: '/feed',        icon: Home,   label: 'ฟีด' },
  { href: '/pending',     icon: Clock,  label: 'รอเฉลย' },
  null, // FAB placeholder
  { href: '/leaderboard', icon: Trophy, label: 'อันดับ' },
  { href: '/profile/me',  icon: User,   label: 'โปรไฟล์' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-end z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {LINKS.map((item, i) => {
        if (!item) {
          return (
            <div key="fab" className="flex-1 flex justify-center" style={{ marginBottom: 8 }}>
              <Link
                href="/submit"
                className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                aria-label="ตั้งคำถาม"
              >
                <PlusCircle size={22} strokeWidth={2.2} className="text-white" />
              </Link>
            </div>
          )
        }

        const { href, icon: Icon, label } = item
        const active = href === '/feed' ? pathname === href || pathname.startsWith('/feed') : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
              active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
