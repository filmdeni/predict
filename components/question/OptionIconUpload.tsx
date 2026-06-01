'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X, Clipboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  iconUrl: string | null
  onChange: (url: string | null) => void
}

export default function OptionIconUpload({ iconUrl, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)

  async function uploadFile(file: File) {
    setUploading(true)
    const ext = file.type.split('/')[1] ?? 'png'
    const path = `options/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('question-images')
      .upload(path, file, { upsert: true })
    if (error) { alert('อัพโหลดไม่ได้: ' + error.message); setUploading(false); return }
    const { data } = supabase.storage.from('question-images').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handlePaste() {
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'))
        if (imageType) {
          const blob = await item.getType(imageType)
          await uploadFile(new File([blob], `paste.${imageType.split('/')[1]}`, { type: imageType }))
          return
        }
      }
      alert('ไม่พบรูปใน clipboard')
    } catch {
      alert('ขอสิทธิ์ clipboard ไม่ได้ — ลองกด Ctrl+V ขณะ focus ที่ปุ่มนี้แทน')
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault()
      await handlePaste()
    }
  }

  async function handleDivPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (!item) return
    const file = item.getAsFile()
    if (file) await uploadFile(file)
  }

  return (
    <div className="flex-shrink-0" onPaste={handleDivPaste}>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {iconUrl ? (
        <div className="relative w-9 h-9 group" onPaste={handleDivPaste}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white items-center justify-center hidden group-hover:flex"
          >
            <X size={9} />
          </button>
        </div>
      ) : (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onKeyDown={handleKeyDown}
            disabled={uploading}
            title="คลิกเพื่อเลือกไฟล์ หรือกด Ctrl+V วางรูปจาก screenshot"
            className="w-9 h-9 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 hover:border-gray-400 hover:text-gray-500 transition-colors disabled:opacity-40 relative group"
          >
            {uploading
              ? <span className="text-[9px] text-gray-400">...</span>
              : <ImagePlus size={15} />
            }
            {/* tooltip hint */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-[10px] bg-gray-800 text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              คลิกเลือกไฟล์ · Ctrl+V วางรูป
            </span>
          </button>
          <button
            type="button"
            onClick={handlePaste}
            disabled={uploading}
            title="วางรูปจาก clipboard"
            className="w-9 h-9 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 hover:border-indigo-400 hover:text-indigo-400 transition-colors disabled:opacity-40"
          >
            <Clipboard size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
