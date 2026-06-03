'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Clock, Trophy, User, PlusCircle, HelpCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RANKS } from '@/lib/game/ranks'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const NAV_LINKS = [
  { href: '/feed',        icon: Home,       label: 'หน้าหลัก' },
  { href: '/leaderboard', icon: Trophy,     label: 'อันดับ' },
  { href: '/submit',      icon: PlusCircle, label: 'ตั้งคำถาม' },
  { href: '/pending',     icon: Clock,      label: 'รอเฉลย' },
  { href: '/profile/me',  icon: User,       label: 'โปรไฟล์' },
  { href: '/how-to-play', icon: HelpCircle, label: 'วิธีเล่น' },
]

type Profile = {
  display_name: string
  coins: number
  rank: string
  correct_predictions: number
  total_predictions: number
}

export default function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUser(data.user)
      const { data: p } = await supabase
        .from('users')
        .select('display_name, coins, rank, correct_predictions, total_predictions')
        .eq('id', data.user.id)
        .single()
      if (p) setProfile(p as Profile)
    })
  }, [])

  const rankData = RANKS.find(r => r.tier === profile?.rank) ?? RANKS[0]
  const accuracy =
    profile && profile.total_predictions > 0
      ? Math.round((profile.correct_predictions / profile.total_predictions) * 100)
      : 0

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-gray-100 flex-col z-30 hidden md:flex">
      {/* Logo */}
      <div className="px-5 py-4 flex-shrink-0">
        <Link href="/feed" className="flex flex-col">
          <span className="text-2xl font-black tracking-tight leading-tight">
            <span className="text-indigo-600">ภา</span><span className="text-gray-900">วนา</span>
          </span>
          <span className="text-[10px] font-medium tracking-widest text-gray-400">แพลตฟอร์มทายผลเหตุการณ์</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map(({ href, icon: Icon, label }) => {
          const active = href === '/feed' ? pathname === href || pathname.startsWith('/feed') : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 rounded-full" />}
              <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User profile card */}
      {user && profile && (
        <div className="p-3 flex-shrink-0 space-y-2">

          {/* Profile card */}
          <div className="bg-gray-50 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0">
                {(profile.display_name ?? user.email ?? '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {profile.display_name ?? user.email?.split('@')[0]}
                </p>
                <p className="text-xs font-medium" style={{ color: rankData.color }}>
                  {rankData.emoji} {rankData.name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-xs font-bold text-gray-900">{profile.total_predictions}</p>
                <p className="text-[10px] text-gray-400">ทาย</p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <p className="text-xs font-bold text-green-600">{accuracy}%</p>
                <p className="text-[10px] text-gray-400">แม่น</p>
              </div>
            </div>

            <Link
              href="/profile/me"
              className="flex items-center justify-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[9px]">P</span>
              <span className="text-sm font-bold text-gray-900">{profile.coins.toLocaleString()}</span>
              <span className="text-xs text-gray-400">คะแนน</span>
            </Link>
          </div>
        </div>
      )}

      {!user && (
        <div className="p-3 flex-shrink-0">
          <Link
            href="/login"
            className="block w-full text-center bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      )}
    </aside>
  )
}
