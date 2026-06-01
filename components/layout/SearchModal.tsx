'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

type Question = Database['public']['Tables']['questions']['Row'] & {
  categories: { name_th: string; emoji: string }
}

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); setError(false); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(false)
      const { data, error: qErr } = await supabase
        .from('questions')
        .select('*, categories(name_th, emoji)')
        .ilike('title', `%${query}%`)
        .eq('status', 'open')
        .limit(8)
      if (qErr) {
        setError(true)
        setResults([])
      } else {
        setResults((data ?? []) as Question[])
        resultsRef.current?.scrollTo({ top: 0 })
      }
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ค้นหาคำถาม..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-700">
              <X size={16} />
            </button>
          )}
        </div>

        {/* results */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-3">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : error ? (
            <p className="text-sm text-red-400 text-center py-8">เกิดข้อผิดพลาด ลองใหม่อีกครั้ง</p>
          ) : results.length > 0 ? (
            results.map(q => (
              <Link key={q.id} href={`/question/${q.id}`} onClick={onClose}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <span className="text-xl">{q.categories.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{q.title}</p>
                    <p className="text-xs text-gray-400">{q.categories.name_th} · {q.predictions_count} การทาย</p>
                  </div>
                </div>
              </Link>
            ))
          ) : query.trim() ? (
            <p className="text-sm text-gray-400 text-center py-8">ไม่พบคำถามที่ค้นหา</p>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">พิมพ์เพื่อค้นหา</p>
          )}
        </div>
      </div>
    </div>
  )
}
