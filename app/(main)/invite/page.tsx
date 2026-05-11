'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/Toast'
import { Link2, Check, Users, Gift } from 'lucide-react'

interface ReferralNotif {
  id: string
  message: string
  coins_gained: number
  created_at: string
  ref_user: { display_name: string } | null
}

export default function InvitePage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [referrals, setReferrals] = useState<ReferralNotif[]>([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await (supabase as any)
        .from('notifications')
        .select('id, message, coins_gained, created_at, ref_user:ref_user_id(display_name)')
        .eq('user_id', user.id)
        .eq('type', 'referral')
        .order('created_at', { ascending: false })
        .limit(20)

      setReferrals((data ?? []) as ReferralNotif[])
      setLoading(false)
    }
    load()
  }, [])

  function inviteLink() {
    return `${window.location.origin}/feed?ref=${userId}`
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink())
    setCopied(true)
    toast('คัดลอกลิงก์แล้ว!')
    setTimeout(() => setCopied(false), 2000)
  }

  async function share() {
    try {
      await navigator.share({
        title: 'ภาวนา — เกมทายกระแสสังคม',
        text: 'มาทายเหตุการณ์สนุกๆ ด้วยกันนะ! ได้รับ 10,000 คะแนนตั้งต้นเลย 🔮',
        url: inviteLink(),
      })
    } catch { /* cancelled */ }
  }

  const totalCoins = referrals.reduce((s, r) => s + (r.coins_gained ?? 0), 0)

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ชวนเพื่อน</h1>
        <p className="text-sm text-gray-400 mt-1">ทุกครั้งที่เพื่อนมาทายจากลิงก์ของคุณ — คุณได้ +100 คะแนน</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <Users size={20} className="mx-auto text-indigo-400 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{referrals.length}</p>
          <p className="text-xs text-gray-400">คนที่ชวนมาได้</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <Gift size={20} className="mx-auto text-orange-400 mb-2" />
          <p className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[10px] leading-none">P</span>
            {totalCoins.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">คะแนนที่ได้จาก referral</p>
        </div>
      </div>

      {/* Link card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">ลิงก์ชวนเพื่อนของคุณ</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
          <p className="flex-1 text-xs text-gray-500 truncate">
            {userId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/feed?ref=${userId}` : '...'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Link2 size={16} />}
            {copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={share}
              className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              แชร์เลย 🚀
            </button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-bold text-indigo-700">วิธีรับคะแนน</p>
        <div className="space-y-1.5 text-xs text-indigo-600">
          <p>1. คัดลอกลิงก์แล้วส่งให้เพื่อน</p>
          <p>2. เพื่อนกดลิงก์แล้วทายคำถามใดก็ได้</p>
          <p>3. คุณได้รับ <span className="font-bold">+100 คะแนน</span> ทันที</p>
        </div>
      </div>

      {/* Referral history */}
      {!loading && referrals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">ประวัติการชวน</h2>
          <div className="space-y-2">
            {referrals.map(r => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                  {(r.ref_user?.display_name ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {r.ref_user?.display_name ?? 'ผู้ใช้ใหม่'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className="text-sm font-bold text-green-600 flex items-center gap-0.5">
                  +<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[8px] leading-none">P</span>
                  {r.coins_gained.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && referrals.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-3xl mb-2">🔗</p>
          <p className="text-sm">ยังไม่มีเพื่อนมาจากลิงก์ของคุณ</p>
          <p className="text-xs mt-1">แชร์ลิงก์ด้านบนเพื่อเริ่มรับคะแนน!</p>
        </div>
      )}
    </div>
  )
}
