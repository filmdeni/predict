'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import QuestionCard from '@/components/feed/QuestionCard'
import type { Database } from '@/lib/supabase/types'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string; slug: string }
}

type Tab = 'pending' | 'resolved'

export default function PendingPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [pending, setPending] = useState<Question[]>([])
  const [resolved, setResolved] = useState<Question[]>([])
  const [predictedIds, setPredictedIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setIsAdmin(user.email === 'zwwzww19192@gmail.com')
      const [{ data: savedData }, { data: predData }] = await Promise.all([
        supabase.from('saved_questions').select('question_id').eq('user_id', user.id),
        supabase.from('predictions').select('question_id').eq('user_id', user.id),
      ])
      setSavedIds(new Set((savedData ?? []).map((r: { question_id: string }) => r.question_id)))
      setPredictedIds(new Set((predData ?? []).map((r: { question_id: string }) => r.question_id)))
    })
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const now = new Date().toISOString()
      const [{ data: pendingData }, { data: resolvedData }] = await Promise.all([
        supabase
          .from('questions')
          .select('*, categories(name_th, emoji, slug)')
          .eq('status', 'open')
          .lt('closes_at', now)
          .order('closes_at', { ascending: false })
          .limit(100),
        supabase
          .from('questions')
          .select('*, categories(name_th, emoji, slug)')
          .eq('status', 'resolved')
          .order('resolved_at', { ascending: false })
          .limit(100),
      ])
      setPending((pendingData as Question[]) ?? [])
      setResolved((resolvedData as Question[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const questions = tab === 'pending' ? pending : resolved

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-8">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('pending')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'pending'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Clock size={15} />
          รอเฉลย
          {!loading && pending.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full leading-none">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('resolved')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'resolved'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <CheckCircle2 size={15} />
          เฉลยแล้ว
          {!loading && resolved.length > 0 && (
            <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full leading-none">
              {resolved.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <p className="text-4xl mb-2">{tab === 'pending' ? '⏳' : '✅'}</p>
          <p>{tab === 'pending' ? 'ยังไม่มีคำถามรอเฉลย' : 'ยังไม่มีคำถามที่เฉลยแล้ว'}</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 ${tab === 'pending' ? 'opacity-70' : ''}`}>
          {questions.map((q, i) => (
            <div key={q.id} className="animate-fadeInUp" style={{ animationDelay: `${i * 30}ms` }}>
              <QuestionCard
                question={q}
                isAdmin={isAdmin}
                initialSaved={savedIds.has(q.id)}
                isPredicted={predictedIds.has(q.id)}
                onDelete={id => {
                  if (tab === 'pending') setPending(prev => prev.filter(x => x.id !== id))
                  else setResolved(prev => prev.filter(x => x.id !== id))
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
