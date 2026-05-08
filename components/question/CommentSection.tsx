'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, CornerDownRight } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface Comment {
  id: string
  body: string
  created_at: string
  user_id: string
  parent_id: string | null
  users: { display_name: string; username: string } | null
}

export default function CommentSection({ questionId }: { questionId: string }) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    async function load() {
      const { data } = await supabase
        .from('comments')
        .select('*, users(display_name, username)')
        .eq('question_id', questionId)
        .order('created_at', { ascending: true })
        .limit(100)
      setComments((data ?? []) as Comment[])
    }
    load()

    const channel = supabase
      .channel(`comments:${questionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `question_id=eq.${questionId}` },
        async (payload) => {
          const { data } = await supabase
            .from('comments')
            .select('*, users(display_name, username)')
            .eq('id', payload.new.id)
            .single()
          if (data) setComments(prev => [...prev, data as Comment])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [questionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  function handleReply(comment: Comment) {
    setReplyTo(comment)
    inputRef.current?.focus()
  }

  function cancelReply() {
    setReplyTo(null)
    setBody('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !user) return
    setLoading(true)
    await supabase.from('comments').insert({
      question_id: questionId,
      user_id: user.id,
      body: body.trim(),
      parent_id: replyTo?.id ?? null,
    } as never)
    setBody('')
    setReplyTo(null)
    setLoading(false)
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'เมื่อกี้'
    if (mins < 60) return `${mins} นาที`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} ชม.`
    return `${Math.floor(hrs / 24)} วัน`
  }

  // แยก top-level กับ replies
  const topLevel = comments.filter(c => !c.parent_id)
  const replies = comments.filter(c => c.parent_id)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-500">
        ความคิดเห็น {comments.length > 0 && <span className="text-gray-400">({comments.length})</span>}
      </h3>

      {/* comments list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {topLevel.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีความคิดเห็น เป็นคนแรกได้เลย</p>
        ) : (
          topLevel.map(c => (
            <div key={c.id}>
              {/* parent comment */}
              <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">
                    {c.users?.display_name ?? 'ไม่ระบุ'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                    {user && (
                      <button
                        onClick={() => handleReply(c)}
                        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        ตอบกลับ
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{c.body}</p>
              </div>

              {/* replies */}
              {replies.filter(r => r.parent_id === c.id).map(r => (
                <div key={r.id} className="ml-6 mt-1.5 flex gap-2">
                  <CornerDownRight size={14} className="text-gray-300 flex-shrink-0 mt-2.5" />
                  <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-600">
                        {r.users?.display_name ?? 'ไม่ระบุ'}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{r.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      {user ? (
        <form onSubmit={submit} className="space-y-2">
          {replyTo && (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-500">
                ตอบกลับ <span className="font-semibold text-gray-700">{replyTo.users?.display_name}</span>
                <span className="text-gray-400"> · {replyTo.body.slice(0, 40)}{replyTo.body.length > 40 ? '...' : ''}</span>
              </p>
              <button type="button" onClick={cancelReply} className="text-xs text-gray-400 hover:text-gray-700 ml-2">✕</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={replyTo ? `ตอบกลับ ${replyTo.users?.display_name}...` : 'แสดงความคิดเห็น...'}
              maxLength={500}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              disabled={!body.trim() || loading}
              className="p-2.5 bg-gray-900 text-white rounded-xl disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">
          <a href="/login" className="text-gray-700 underline">เข้าสู่ระบบ</a> เพื่อแสดงความคิดเห็น
        </p>
      )}
    </div>
  )
}
