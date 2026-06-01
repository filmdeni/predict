'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2 } from 'lucide-react'
import CardStylePicker, { type CardStyle } from '@/components/question/CardStylePicker'
import OptionIconUpload from '@/components/question/OptionIconUpload'
import ImageUpload from '@/components/question/ImageUpload'

interface Option { id: string; label: string; icon_url?: string | null }

export default function SubmitQuestionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [categories, setCategories] = useState<{ id: number; name_th: string; emoji: string }[]>([])
  const [options, setOptions] = useState<Option[]>([
    { id: 'yes', label: 'ใช่' },
    { id: 'no', label: 'ไม่ใช่' },
  ])
  const [closesAt, setClosesAt] = useState('')
  const [cardStyle, setCardStyle] = useState<CardStyle>('auto')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase.from('categories').select('id, name_th, emoji').order('sort_order')
      const cats = (data ?? []) as { id: number; name_th: string; emoji: string }[]
      setCategories(cats)
      if (cats[0]) setCategoryId(cats[0].id)

      const d = new Date()
      d.setDate(d.getDate() + 7)
      const pad = (n: number) => String(n).padStart(2, '0')
      setClosesAt(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    }
    init()
  }, [])

  function addOption() {
    if (options.length >= 5) return
    setOptions(o => [...o, { id: `opt${Date.now()}`, label: '' }])
  }

  function removeOption(id: string) {
    setOptions(o => o.filter(x => x.id !== id))
  }

  function updateOption(id: string, label: string) {
    setOptions(o => o.map(x => x.id === id ? { ...x, label } : x))
  }

  function updateOptionIcon(id: string, icon_url: string | null) {
    setOptions(o => o.map(x => x.id === id ? { ...x, icon_url } : x))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId || options.length < 2 || options.some(o => !o.label.trim())) {
      setError('กรอกให้ครบทุกช่อง')
      return
    }

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const pool = Object.fromEntries(options.map(o => [o.id, 0]))
    const { error: err } = await supabase.from('questions').insert({
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      created_by: user.id,
      options,
      pool,
      total_pool: 0,
      closes_at: new Date(closesAt).toISOString(),
      status: 'pending',
      card_style: cardStyle,
      image_url: imageUrl,
    } as never)

    if (err) { setError(err.message); setLoading(false); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center space-y-4 pt-20">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-bold text-gray-900">ส่งคำถามแล้ว!</h2>
        <p className="text-sm text-gray-500">Admin จะรีวิวและอนุมัติคำถามของคุณเร็ว ๆ นี้ค่ะ</p>
        <button
          onClick={() => router.push('/feed')}
          className="mt-4 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors"
        >
          กลับหน้าหลัก
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">เสนอคำถาม</h1>
        <p className="text-sm text-gray-400 mt-0.5">Admin จะรีวิวก่อนเผยแพร่</p>
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
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            รายละเอียด <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
          </label>
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
            {loading ? 'กำลังส่ง...' : 'เสนอคำถาม'}
          </button>
        </div>
      </form>
    </div>
  )
}
