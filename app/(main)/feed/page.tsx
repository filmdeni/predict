'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import QuestionCard from '@/components/feed/QuestionCard'
import CategoryFilter from '@/components/feed/CategoryFilter'
import type { Database } from '@/lib/supabase/types'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string; slug: string }
}

export default function FeedPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('questions')
        .select('*, categories(name_th, emoji, slug)')
        .order('created_at', { ascending: false })
        .limit(20)

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
  }, [category])

  return (
    <div>
      <CategoryFilter selected={category} onChange={setCategory} />

      <div className="px-6 pt-5 pb-2">
        <h1 className="text-xl font-bold text-gray-900">ตลาดทั้งหมด</h1>
      </div>

      <div className="px-6 pb-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 bg-white rounded-xl animate-pulse border border-gray-200" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-4xl mb-2">🔮</p>
            <p>ยังไม่มีคำถามในหมวดนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {questions.map(q => <QuestionCard key={q.id} question={q} />)}
          </div>
        )}
      </div>
    </div>
  )
}
