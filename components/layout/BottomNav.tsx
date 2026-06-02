'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, User, PlusCircle, Clock } from 'lucide-react'

const LINKS = [
  { href: '/feed',        icon: Home,       label: 'ฟีด' },
  { href: '/leaderboard', icon: Trophy,     label: 'อันดับ' },
  { href: '/submit',      icon: PlusCircle, label: 'ตั้งคำถาม' },
  { href: '/pending',     icon: Clock,      label: 'รอเฉลย' },
  { href: '/profile/me',  icon: User,       label: 'โปรไฟล์' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
      {LINKS.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className={`text-[10px] font-medium ${active ? 'text-gray-900' : ''}`}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
