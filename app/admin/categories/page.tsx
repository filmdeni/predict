'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

const LABELS: Record<string, string> = {
  all:      'ทั้งหมด',
  politics: 'การเมือง',
  crypto:   'Crypto',
  drama:    'ดราม่า',
  stock:    'หุ้น',
  viral:    'ไวรัล',
  esports:  'eSports',
  sports:   'กีฬา',
}

const ORDERED_SLUGS = ['all', 'politics', 'crypto', 'drama', 'stock', 'viral', 'esports', 'sports']

type Row = { slug: string; hidden: boolean }

export default function CategoriesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('category_visibility')
      .select('slug, hidden')
      .then(({ data }) => {
        if (!data) return
        const map = Object.fromEntries(data.map(r => [r.slug, r.hidden]))
        setRows(ORDERED_SLUGS.map(slug => ({ slug, hidden: map[slug] ?? false })))
      })
  }, [])

  async function toggle(slug: string) {
    const current = rows.find(r => r.slug === slug)
    if (!current) return
    const nextHidden = !current.hidden
    setSaving(slug)
    const { error } = await supabase
      .from('category_visibility')
      .upsert({ slug, hidden: nextHidden, updated_at: new Date().toISOString() })
    if (!error) {
      setRows(prev => prev.map(r => r.slug === slug ? { ...r, hidden: nextHidden } : r))
    }
    setSaving(null)
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">หมวดหมู่</h1>
        <p className="text-sm text-gray-400 mt-0.5">ซ่อน/แสดงหมวดหมู่ในหน้า Feed</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {rows.map(({ slug, hidden }) => (
          <div key={slug} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${hidden ? 'bg-gray-300' : 'bg-green-500'}`} />
              <span className="text-sm font-medium text-gray-900">{LABELS[slug] ?? slug}</span>
              {slug === 'all' && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">ซ่อนไม่ได้</span>
              )}
            </div>
            <button
              disabled={slug === 'all' || saving === slug}
              onClick={() => toggle(slug)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                slug === 'all'
                  ? 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-400'
                  : hidden
                  ? 'bg-gray-900 text-white hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {saving === slug ? (
                <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : hidden ? (
                <><EyeOff size={12} /> ซ่อนอยู่</>
              ) : (
                <><Eye size={12} /> แสดงอยู่</>
              )}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        การเปลี่ยนแปลงมีผลทันทีกับผู้ใช้ทุกคน
      </p>
    </div>
  )
}
