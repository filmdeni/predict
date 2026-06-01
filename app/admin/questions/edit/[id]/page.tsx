'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2 } from 'lucide-react'
import CardStylePicker, { type CardStyle } from '@/components/question/CardStylePicker'
import OptionIconUpload from '@/components/question/OptionIconUpload'
import ImageUpload from '@/components/question/ImageUpload'

interface Option { id: string; label: string; icon_url?: string | null }

export default function EditQuestionPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [categories, setCategories] = useState<{ id: number; name_th: string; emoji: string }[]>([])
  const [options, setOptions] = useState<Option[]>([])
  const [closesAt, setClosesAt] = useState('')
  const [cardStyle, setCardStyle] = useState<CardStyle>('auto')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const [{ data: cats }, { data: q }] = await Promise.all([
        supabase.from('categories').select('id, name_th, emoji').order('sort_order'),
        supabase.from('questions').select('*').eq('id', id).single(),
      ])
      setCategories((cats ?? []) as { id: number; name_th: string; emoji: string }[])
      if (!q) { router.replace('/admin/questions'); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = q as any
      setTitle(row.title)
      setDescription(row.description ?? '')
      setCategoryId(row.category_id)
      setOptions(row.options as Option[])
      setCardStyle((row.card_style ?? 'auto') as CardStyle)
      setImageUrl(row.image_url ?? null)

      // convert ISO → datetime-local (local time)
      const d = new Date(row.closes_at)
      const pad = (n: number) => String(n).padStart(2, '0')
      setClosesAt(
        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      )
      setInitializing(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function addOption() {
    setOptions(o => [...o, { id: `opt${Date.now()}`, label: '' }])
  }

  function removeOption(oid: string) {
    setOptions(o => o.filter(x => x.id !== oid))
  }

  function updateOption(oid: string, label: string) {
    setOptions(o => o.map(x => x.id === oid ? { ...x, label } : x))
  }

  function updateOptionIcon(oid: string, icon_url: string | null) {
    setOptions(o => o.map(x => x.id === oid ? { ...x, icon_url } : x))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId || options.length < 2 || options.some(o => !o.label.trim())) {
      setError('กรอกให้ครบทุกช่อง')
      return
    }

    setLoading(true)
    setError(null)

    const closesAtIso = new Date(closesAt).toISOString()
    const { error: err } = await supabase
      .from('questions')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        options,
        closes_at: closesAtIso,
        image_url: imageUrl,
        card_style: cardStyle,
        status: new Date(closesAtIso) > new Date() ? 'open' : 'closed',
      } as never)
      .eq('id', id)

    if (err) { setError(err.message); setLoading(false); return }
    router.push('/admin/questions')
  }

  if (initializing) {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">แก้ไขคำถาม</h1>
        <p className="text-sm text-gray-400 mt-0.5">Admin only</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Category */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">หมวดหมู่</label>
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  categoryId === c.id
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {c.emoji} {c.name_th}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">คำถาม</label>
          <textarea
            required
            rows={2}
            placeholder="เช่น Bitcoin จะแตะ $150,000 ก่อนสิ้นปีไหม?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">รายละเอียด <span className="text-gray-400 font-normal">(ไม่บังคับ)</span></label>
          <textarea
            rows={2}
            placeholder="อธิบายเพิ่มเติม..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none"
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">รูปประกอบ <span className="text-gray-400 font-normal">(ไม่บังคับ)</span></label>
          <ImageUpload imageUrl={imageUrl} onChange={setImageUrl} />
        </div>

        {/* Options */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">ตัวเลือก</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={opt.id} className="flex gap-2 items-center">
                <span className="flex items-center justify-center w-6 text-xs text-gray-400 font-medium flex-shrink-0">{i + 1}</span>
                <OptionIconUpload iconUrl={opt.icon_url ?? null} onChange={url => updateOptionIcon(opt.id, url)} />
                <input
                  required
                  placeholder={`ตัวเลือกที่ ${i + 1}`}
                  value={opt.label}
                  onChange={e => updateOption(opt.id, e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(opt.id)} className="p-2 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 5 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Plus size={15} /> เพิ่มตัวเลือก
            </button>
          )}
        </div>

        {/* Card style */}
        <CardStylePicker value={cardStyle} onChange={setCardStyle} />

        {/* Closes at */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">ปิดรับ</label>
          <input
            type="datetime-local"
            required
            value={closesAt}
            onChange={e => setClosesAt(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
