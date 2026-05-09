'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import QuestionCard from '@/components/feed/QuestionCard'
import CategoryFilter from '@/components/feed/CategoryFilter'
import type { Database } from '@/lib/supabase/types'

const ADMIN_EMAIL = 'zwwzww19192@gmail.com'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string; slug: string }
}

export default function FeedPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user?.email === ADMIN_EMAIL)
    })
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .in('status', ['open', 'closed', 'resolved'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (category !== 'all') {
        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category)
          .single()
        if (cat && 'id' in cat) query = query.eq('category_id', (cat as { id: number }).id)
      }

      const { data } = await query
      setQuestions((data as Question[]) ?? [])
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('feed-questions')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'questions' }, payload => {
        setQuestions(prev => prev.filter(q => q.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [category])

  const active = questions.filter(q => q.status !== 'resolved')
  const resolved = questions.filter(q => q.status === 'resolved')

  return (
    <div>
      <CategoryFilter selected={category} onChange={setCategory} />

      <div className="px-6 pt-5 pb-2">
        <h1 className="text-xl font-bold text-gray-900">ตลาดทั้งหมด</h1>
      </div>

      <div className="px-6 pb-6 space-y-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 bg-white rounded-xl animate-pulse border border-gray-200" />
            ))}
          </div>
        ) : (
          <>
            {/* Active questions */}
            {active.length === 0 && resolved.length === 0 ? (
              <div className="text-center text-gray-400 py-16">
                <p className="text-4xl mb-2">🔮</p>
                <p>ยังไม่มีคำถามในหมวดนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {active.map(q => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    isAdmin={isAdmin}
                    onDelete={id => setQuestions(prev => prev.filter(x => x.id !== id))}
                  />
                ))}
              </div>
            )}

            {/* Resolved questions */}
            {resolved.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-500">เฉลยแล้ว</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{resolved.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 opacity-70">
                  {resolved.map(q => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      isAdmin={isAdmin}
                      onDelete={id => setQuestions(prev => prev.filter(x => x.id !== id))}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
