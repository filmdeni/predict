'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

export function PageTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname

    const anon_id = getCookie('anon_id')
    if (!anon_id) return

    // Skip admin and api paths
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anon_id,
          path: pathname,
          user_id: data.user?.id ?? null,
        }),
      }).catch(() => {/* silent */})
    })
  }, [pathname])

  return null
}
