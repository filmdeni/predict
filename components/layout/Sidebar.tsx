'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Trophy, Clock, PlusCircle, HelpCircle, LogOut, ChevronDown, ChevronUp, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RANKS } from '@/lib/game/ranks'
import { hasVault } from '@/lib/crypto/pinVault'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import WeatherCard from './WeatherCard'

const NAV_LINKS = [
  { href: '/feed',        icon: Home,   label: 'หน้าหลัก' },
  { href: '/leaderboard', icon: Trophy, label: 'อันดับ' },
  { href: '/pending',     icon: Clock,  label: 'รอเฉลย' },
]

type Profile = {
  display_name: string
  coins: number
  rank: string
  correct_predictions: number
  total_predictions: number
}

export default function Sidebar({ priceTicker }: { priceTicker?: ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [showWidgets, setShowWidgets] = useState(true)
  // Fixed-cost tool: only surface its menu on devices where the user set up a PIN
  const [showFixedCost, setShowFixedCost] = useState(false)
  useEffect(() => { setShowFixedCost(hasVault()) }, [pathname])

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

  const rankInfo = profile ? RANKS.find(r => r.tier === profile.rank) : null
  const accuracy = profile && profile.total_predictions > 0
    ? Math.round((profile.correct_predictions / profile.total_predictions) * 100)
    : null

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-gray-100 flex flex-col z-30 hidden md:flex">
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
      <nav className="px-3 space-y-0.5 flex-shrink-0">
        {[
          ...NAV_LINKS,
          { href: '/submit', icon: PlusCircle, label: 'ตั้งคำถาม' },
          ...(showFixedCost ? [{ href: '/fixed-cost', icon: Wallet, label: 'คำนวณค่าใช้จ่าย' }] : []),
          { href: '/how-to-play', icon: HelpCircle, label: 'วิธีเล่น' },
        ].map(({ href, icon: Icon, label }) => {
          const active = href === '/feed'
            ? pathname === href || pathname.startsWith('/feed')
            : pathname.startsWith(href)
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

      {/* Widgets */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <button
          onClick={() => setShowWidgets(v => !v)}
          className="flex items-center justify-between w-full px-0.5 group"
        >
          <span className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">วิดเจ็ต</span>
          {showWidgets
            ? <ChevronUp size={12} className="text-gray-300 group-hover:text-gray-400" />
            : <ChevronDown size={12} className="text-gray-300 group-hover:text-gray-400" />}
        </button>
        {showWidgets && (
          <div className="space-y-2">
            <WeatherCard />
            {priceTicker}
          </div>
        )}
      </div>

      {/* Profile card / Login */}
      <div className="p-3 flex-shrink-0 border-t border-gray-100">
        {user && profile ? (
          <div className="flex items-center gap-1">
            <Link
              href="/profile/me"
              className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors flex-1 min-w-0"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-700 text-xs font-bold">
                  {profile.display_name?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{profile.display_name}</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {rankInfo?.name ?? profile.rank}
                </p>
              </div>
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              title="ออกจากระบบ"
            >
              <LogOut size={15} strokeWidth={1.8} />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </aside>
  )
}
