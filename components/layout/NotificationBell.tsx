'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface PredictionNotif {
  kind: 'prediction'
  id: string
  questionTitle: string
  questionId: string
  isCorrect: boolean
  coinsWon: number
  resolvedAt: string
}

interface ReplyNotif {
  kind: 'reply'
  id: string
  actorName: string
  commentBody: string
  questionId: string
  read: boolean
  createdAt: string
}

interface ReferralNotif {
  kind: 'referral'
  id: string
  message: string
  coinsGained: number
  questionId: string
  read: boolean
  createdAt: string
}

interface QuestionStatusNotif {
  kind: 'question_approved' | 'question_rejected'
  id: string
  message: string
  questionId: string
  read: boolean
  createdAt: string
}

interface ShareNotif {
  kind: 'share'
  id: string
  message: string
  coinsWon: number
  questionId: string
  read: boolean
  createdAt: string
}

type Notif = PredictionNotif | ReplyNotif | ReferralNotif | QuestionStatusNotif | ShareNotif

export default function NotificationBell() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUser(data.user)
      loadNotifs(data.user.id)

      const channel = supabase
        .channel(`notifs:${data.user.id}:${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'predictions', filter: `user_id=eq.${data.user.id}` },
          async (payload) => {
            if (payload.new.is_correct === null) return
            const { data: q } = await supabase.from('questions').select('title').eq('id', payload.new.question_id).single()
            const notif: PredictionNotif = {
              kind: 'prediction',
              id: payload.new.id,
              questionTitle: (q as any)?.title ?? '—',
              questionId: payload.new.question_id,
              isCorrect: payload.new.is_correct,
              coinsWon: payload.new.coins_won ?? 0,
              resolvedAt: payload.new.resolved_at,
            }
            setNotifs(prev => [notif, ...prev])
            setUnread(n => n + 1)
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${data.user.id}` },
          async (payload) => {
            const n = payload.new
            if (n.type === 'question_approved' || n.type === 'question_rejected') {
              const notif: QuestionStatusNotif = {
                kind: n.type,
                id: n.id,
                message: n.message ?? '',
                questionId: n.question_id ?? '',
                read: false,
                createdAt: n.created_at,
              }
              setNotifs(prev => [notif, ...prev])
              setUnread(u => u + 1)
              return
            }
            const { data: comment } = await supabase
              .from('comments')
              .select('body, question_id, users(display_name)')
              .eq('id', n.comment_id)
              .single()
            if (!comment) return
            const c = comment as any
            const notif: ReplyNotif = {
              kind: 'reply',
              id: n.id,
              actorName: c.users?.display_name ?? 'ใครบางคน',
              commentBody: c.body,
              questionId: c.question_id,
              read: false,
              createdAt: n.created_at,
            }
            setNotifs(prev => [notif, ...prev])
            setUnread(u => u + 1)
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [])

  async function loadNotifs(userId: string) {
    const [predRes, replyRes] = await Promise.all([
      supabase
        .from('predictions')
        .select('id, question_id, is_correct, coins_won, resolved_at, questions(title)')
        .eq('user_id', userId)
        .not('is_correct', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(10),
      supabase
        .from('notifications')
        .select('id, type, read, created_at, message, coins_gained, coins_won, question_id, comment_id, comments(body, question_id, users(display_name))')
        .eq('user_id', userId)
        .in('type', ['reply', 'referral', 'question_approved', 'question_rejected', 'share'])
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const predictions: PredictionNotif[] = (predRes.data ?? []).map((p: any) => ({
      kind: 'prediction',
      id: p.id,
      questionTitle: p.questions?.title ?? '—',
      questionId: p.question_id,
      isCorrect: p.is_correct,
      coinsWon: p.coins_won ?? 0,
      resolvedAt: p.resolved_at,
    }))

    const dbNotifs: (ReplyNotif | ReferralNotif | QuestionStatusNotif | ShareNotif)[] = (replyRes.data ?? []).map((n: any) => {
      if (n.type === 'referral') {
        return {
          kind: 'referral' as const,
          id: n.id,
          message: n.message ?? 'มีคนมาทายจากลิงก์ของคุณ!',
          coinsGained: n.coins_gained ?? 100,
          questionId: n.question_id ?? '',
          read: n.read,
          createdAt: n.created_at,
        }
      }
      if (n.type === 'question_approved' || n.type === 'question_rejected') {
        return {
          kind: n.type as 'question_approved' | 'question_rejected',
          id: n.id,
          message: n.message ?? '',
          questionId: n.question_id ?? '',
          read: n.read,
          createdAt: n.created_at,
        }
      }
      if (n.type === 'share') {
        return {
          kind: 'share' as const,
          id: n.id,
          message: n.message ?? 'แชร์คำถามสำเร็จ!',
          coinsWon: n.coins_won ?? 500,
          questionId: n.question_id ?? '',
          read: n.read,
          createdAt: n.created_at,
        }
      }
      return {
        kind: 'reply' as const,
        id: n.id,
        actorName: n.comments?.users?.display_name ?? 'ใครบางคน',
        commentBody: n.comments?.body ?? '',
        questionId: n.comments?.question_id ?? '',
        read: n.read,
        createdAt: n.created_at,
      }
    })

    const all = [...predictions, ...dbNotifs].sort((a, b) => {
      const aDate = a.kind === 'prediction' ? a.resolvedAt : a.createdAt
      const bDate = b.kind === 'prediction' ? b.resolvedAt : b.createdAt
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })

    const lastSeen = localStorage.getItem('notif_last_seen')
    const lastSeenDate = lastSeen ? new Date(lastSeen) : new Date(0)

    const unreadPredictions = predictions.filter(p => new Date(p.resolvedAt) > lastSeenDate).length
    const unreadDbNotifs = dbNotifs.filter(r => !r.read).length

    setNotifs(all)
    setUnread(unreadPredictions + unreadDbNotifs)
  }

  async function markRepliesRead() {
    if (!user) return
    localStorage.setItem('notif_last_seen', new Date().toISOString())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setUnread(0)
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) markRepliesRead() }}
        className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors relative"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">การแจ้งเตือน</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีการแจ้งเตือน</p>
              ) : (
                notifs.map(n => (
                  <Link key={n.id} href={`/question/${n.kind === 'prediction' ? n.questionId : n.questionId}`} onClick={() => setOpen(false)}>
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50">
                      {n.kind === 'prediction' ? (
                        <>
                          <span className="text-lg mt-0.5">{n.isCorrect ? '✅' : '❌'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 font-medium line-clamp-2">{n.questionTitle}</p>
                            <p className={`text-xs mt-0.5 font-semibold ${n.isCorrect ? 'text-green-600' : 'text-gray-400'}`}>
                              {n.isCorrect ? `ถูก! +${n.coinsWon.toLocaleString()} คะแนน` : 'ทายผิด'}
                            </p>
                          </div>
                        </>
                      ) : n.kind === 'referral' ? (
                        <>
                          <span className="text-lg mt-0.5">🔗</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 font-medium">{n.message}</p>
                            <p className="text-xs text-amber-600 font-semibold mt-0.5">+{n.coinsGained} คะแนน</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-1" />}
                        </>
                      ) : n.kind === 'question_approved' || n.kind === 'question_rejected' ? (
                        <>
                          <span className="text-lg mt-0.5">{n.kind === 'question_approved' ? '🎉' : '❌'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 font-medium">{n.message}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-1" />}
                        </>
                      ) : n.kind === 'share' ? (
                        <>
                          <span className="text-lg mt-0.5">📤</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 font-medium">{n.message}</p>
                            <p className="text-xs text-amber-600 font-semibold mt-0.5">+{n.coinsWon.toLocaleString()} คะแนน</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-1" />}
                        </>
                      ) : n.kind === 'reply' ? (
                        <>
                          <span className="text-lg mt-0.5">💬</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 font-medium">
                              <span className="font-semibold">{n.actorName}</span> ตอบกลับความคิดเห็นของคุณ
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{n.commentBody}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-1" />}
                        </>
                      ) : null}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
