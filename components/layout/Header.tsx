'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, ShieldCheck } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import SearchModal from './SearchModal'
import NotificationBell from './NotificationBell'

const ADMIN_EMAIL = 'zwwzww19192@gmail.com'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [coins, setCoins] = useState<number | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let userId: string | null = null

    async function fetchCoins() {
      if (!userId) return
      const { data: profile } = await supabase.from('users').select('coins').eq('id', userId).single()
      if (profile) setCoins((profile as { coins: number }).coins)
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
          (payload) => { setCoins((payload.new as { coins: number }).coins) }
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
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-3">
        {/* Logo — mobile only (hidden on desktop where sidebar shows it) */}
        <Link href="/feed" className="flex items-center gap-2 flex-shrink-0 md:hidden">
          <Image src="/images/logopawana.png" alt="Pawana" width={100} height={30} className="h-8 w-auto" />
        </Link>

        {/* Search bar */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex-1 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full px-4 py-2 text-sm text-gray-400 text-left"
        >
          <Search size={15} className="flex-shrink-0" />
          <span className="hidden sm:inline">ค้นหาคำถาม หมวดหมู่ หรือคน...</span>
          <span className="sm:hidden">ค้นหา...</span>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {user?.email === ADMIN_EMAIL && (
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
            >
              <ShieldCheck size={13} />
              Admin
            </Link>
          )}

          <NotificationBell />

          {user ? (
            <div className="flex items-center gap-2">
              {coins !== null && (
                <Link
                  id="wallet-coin-target"
                  href="/profile/me"
                  className="hidden sm:flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 hover:bg-gray-200 transition-colors"
                >
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[9px] leading-none flex-shrink-0">P</span>
                  <span className="text-sm font-semibold text-gray-800 tabular-nums">{coins.toLocaleString()}</span>
                </Link>
              )}
              <Link href="/profile/me">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700">
                  {(user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
                </div>
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-full font-medium hover:bg-indigo-700 transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </header>
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </>
  )
}
