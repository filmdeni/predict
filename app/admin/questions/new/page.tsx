'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, ImagePlus, X } from 'lucide-react'
import { useRef } from 'react'

interface Option { id: string; label: string }

export default function NewQuestionPage() {
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('categories').select('id, name_th, emoji').order('sort_order')
      const cats = (data ?? []) as { id: number; name_th: string; emoji: string }[]
      setCategories(cats)
      if (cats[0]) setCategoryId(cats[0].id)

      // default closes_at = 7 วันข้างหน้า (local time สำหรับ datetime-local input)
      const d = new Date()
      d.setDate(d.getDate() + 7)
      const pad = (n: number) => String(n).padStart(2, '0')
      setClosesAt(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    }
    init()
  }, [])

  function addOption() {
    const id = `opt${Date.now()}`
    setOptions(o => [...o, { id, label: '' }])
  }

  function removeOption(id: string) {
    setOptions(o => o.filter(x => x.id !== id))
  }

  function updateOption(id: string, label: string) {
    setOptions(o => o.map(x => x.id === id ? { ...x, label } : x))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId || options.length < 2 || options.some(o => !o.label.trim())) {
      setError('กรอกให้ครบทุกช่อง')
      return
    }

    setLoading(true)
    setError(null)

    let imageUrl: string | null = null
    if (imageFile) {
      setImageUploading(true)
      const ext = imageFile.name.split('.').pop()
      const path = `questions/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('question-images')
        .upload(path, imageFile, { upsert: true })
      if (uploadErr) {
        setError('อัพโหลดรูปไม่ได้: ' + uploadErr.message)
        setLoading(false)
        setImageUploading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(path)
      imageUrl = urlData.publicUrl
      setImageUploading(false)
    }

    const pool = Object.fromEntries(options.map(o => [o.id, 0]))
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      created_by: user!.id,
      options,
      pool,
      total_pool: 0,
      closes_at: new Date(closesAt).toISOString(),
      status: 'open' as const,
      image_url: imageUrl,
    }
    const { error: err } = await supabase.from('questions').insert(payload as never)

    if (err) { setError(err.message); setLoading(false); return }
    router.push('/admin/questions')
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">สร้างคำถามใหม่</h1>
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          {imagePreview ? (
            <div className="relative w-full rounded-xl overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
            >
              <ImagePlus size={20} /> คลิกเพื่ออัพโหลดรูป
            </button>
          )}
        </div>

        {/* Options */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">ตัวเลือก</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={opt.id} className="flex gap-2">
                <span className="flex items-center justify-center w-8 h-10 text-xs text-gray-400 font-medium">{i + 1}</span>
                <input
                  required
                  placeholder={`ตัวเลือกที่ ${i + 1}`}
                  value={opt.label}
                  onChange={e => updateOption(opt.id, e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(opt.id)} className="p-2 text-gray-300 hover:text-red-400 transition-colors">
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
            {imageUploading ? 'กำลังอัพโหลดรูป...' : loading ? 'กำลังสร้าง...' : 'สร้างคำถาม'}
          </button>
        </div>
      </form>
    </div>
  )
}
