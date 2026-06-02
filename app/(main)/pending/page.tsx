'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import QuestionCard from '@/components/feed/QuestionCard'
import type { Database } from '@/lib/supabase/types'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string; slug: string }
}

export default function PendingPage() {
  const [questions, setQuestions] = useState<Question[]>([])
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
      const { data } = await supabase
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .eq('status', 'open')
        .lt('closes_at', now)
        .order('closes_at', { ascending: false })
        .limit(100)
      setQuestions((data as Question[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-8">
      <div className="flex items-center gap-2 mb-6">
        <Clock size={18} className="text-amber-500" />
        <h1 className="text-base font-bold text-gray-900">รอเฉลย</h1>
        {!loading && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {questions.length} คำถาม
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <p className="text-4xl mb-2">⏳</p>
          <p>ยังไม่มีคำถามรอเฉลย</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 opacity-70">
          {questions.map((q, i) => (
            <div key={q.id} className="animate-fadeInUp" style={{ animationDelay: `${i * 30}ms` }}>
              <QuestionCard
                question={q}
                isAdmin={isAdmin}
                initialSaved={savedIds.has(q.id)}
                isPredicted={predictedIds.has(q.id)}
                onDelete={id => setQuestions(prev => prev.filter(x => x.id !== id))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
