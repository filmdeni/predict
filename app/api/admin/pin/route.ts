import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'zwwzww19192@gmail.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireAdmin(): Promise<boolean> {
  const browser = await createBrowserClient()
  const { data: { user } } = await browser.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, questionId } = await req.json()

  if (action === 'pin_trending') {
    await supabase.from('questions').update({ is_pinned_trending: true, is_daily_hero: false } as any).eq('id', questionId)
  } else if (action === 'unpin_trending') {
    await supabase.from('questions').update({ is_pinned_trending: false } as any).eq('id', questionId)
  } else if (action === 'set_hero') {
    await supabase.from('questions').update({ is_daily_hero: false } as any).neq('id', questionId)
    await supabase.from('questions').update({ is_daily_hero: true, is_pinned_trending: false } as any).eq('id', questionId)
  } else if (action === 'unset_hero') {
    await supabase.from('questions').update({ is_daily_hero: false } as any).eq('id', questionId)
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
