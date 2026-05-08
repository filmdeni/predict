'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, SlidersHorizontal, Bookmark, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import SearchModal from './SearchModal'
import NotificationBell from './NotificationBell'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link href="/feed" className="text-xl font-bold text-gray-900 tracking-tight">
        <span className="text-green-500">ภาว</span>นา
      </Link>
      <div className="flex items-center gap-3">
        <button onClick={() => setShowSearch(true)} className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors">
          <Search size={18} />
        </button>
        <NotificationBell />
        <button className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors">
          <Bookmark size={18} />
        </button>

        {user ? (
          <div className="flex items-center gap-2 ml-1">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-700">
              {(user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
            </div>
            <button
              onClick={signOut}
              className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut size={16} />
            </button>
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
