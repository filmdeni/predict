import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function detectDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

export async function POST(req: NextRequest) {
  try {
    const { anon_id, path, user_id } = await req.json() as {
      anon_id: string
      path: string
      user_id?: string | null
    }

    if (!anon_id || !path) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }

    const ua = req.headers.get('user-agent') ?? ''
    const device_type = detectDevice(ua)

    // Upsert session: one session per anon_id per day
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: existingSession } = await supabase
      .from('visitor_sessions')
      .select('id')
      .eq('anon_id', anon_id)
      .gte('first_seen', today.toISOString())
      .maybeSingle()

    let session_id: string

    if (existingSession) {
      session_id = existingSession.id
      await supabase
        .from('visitor_sessions')
        .update({ last_seen: new Date().toISOString(), ...(user_id ? { user_id } : {}) })
        .eq('id', session_id)
    } else {
      const { data: newSession, error } = await supabase
        .from('visitor_sessions')
        .insert({ anon_id, user_id: user_id ?? null, user_agent: ua, device_type })
        .select('id')
        .single()

      if (error || !newSession) {
        return NextResponse.json({ error: 'session insert failed' }, { status: 500 })
      }
      session_id = newSession.id
    }

    await supabase.from('page_views').insert({ session_id, anon_id, path })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
