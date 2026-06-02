'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, ShieldCheck } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import SearchModal from './SearchModal'
import NotificationBell from './NotificationBell'
import { RANKS } from '@/lib/game/ranks'

const ADMIN_EMAIL = 'zwwzww19192@gmail.com'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [coins, setCoins] = useState<number | null>(null)
  const [rank, setRank] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let userId: string | null = null

    async function fetchCoins() {
      if (!userId) return
      const { data: profile } = await supabase.from('users').select('coins, rank').eq('id', userId).single()
      if (profile) {
        setCoins((profile as { coins: number; rank: string }).coins)
        setRank((profile as { coins: number; rank: string }).rank)
      }
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUser(data.user)
      userId = data.user.id
      await fetchCoins()

      channel = supabase
        .channel(`header-coins:${data.user.id}:${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${data.user.id}` },
          (payload) => {
            const p = payload.new as { coins: number; rank: string }
            setCoins(p.coins)
            setRank(p.rank)
          }
        )
        .subscribe()
    })

    window.addEventListener('coins-updated', fetchCoins)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setCoins(null)
    })

    return () => {
      subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
      window.removeEventListener('coins-updated', fetchCoins)
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
      <Link href="/feed" className="flex flex-col leading-none flex-shrink-0">
        <span className="text-xl font-bold text-gray-900 tracking-tight">
          <span className="text-green-500">ภาว</span>นา
        </span>
        <span className="text-[10px] font-medium text-gray-400 tracking-wide mt-0.5">เกมทายกระแสสังคม</span>
      </Link>
      <button
        onClick={() => setShowSearch(true)}
        className="flex-1 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full px-4 py-2 text-sm text-gray-400 text-left"
      >
        <Search size={15} className="flex-shrink-0" />
        <span>ค้นหาคำถาม...</span>
      </button>
      <div className="flex items-center gap-3 flex-shrink-0">
        {user?.email === ADMIN_EMAIL && (
          <Link href="/admin" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors">
            <ShieldCheck size={13} />
            Admin
          </Link>
        )}
        <NotificationBell />
        {user ? (
          <div className="flex items-center gap-2 ml-1">
            {coins !== null && (
              <Link id="header-coins" href="/profile/me" className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 hover:bg-gray-200 transition-colors">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[9px] leading-none flex-shrink-0">P</span>
                <span className="text-sm font-semibold text-gray-800 tabular-nums">{coins.toLocaleString()}</span>
              </Link>
            )}
            <Link href="/profile/me">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg leading-none">
                {rank ? (RANKS.find(r => r.tier === rank)?.emoji ?? '🌫️') : (user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
              </div>
            </Link>
          </div>
        ) : (
          <Link href="/login" className="ml-1 text-sm bg-gray-900 text-white px-3 py-1.5 rounded-full font-medium hover:bg-gray-700 transition-colors">
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </header>
    {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </>
  )
}
