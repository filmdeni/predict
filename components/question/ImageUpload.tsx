'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  imageUrl: string | null
  onChange: (url: string | null) => void
  folder?: string
}

export default function ImageUpload({ imageUrl, onChange, folder = 'questions' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(imageUrl)

  async function uploadFile(file: File) {
    setUploading(true)
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)

    const ext = file.name.split('.').pop() ?? file.type.split('/')[1] ?? 'png'
    const path = `${folder}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('question-images')
      .upload(path, file, { upsert: true })
    if (error) {
      alert('อัพโหลดไม่ได้: ' + error.message)
      setPreview(imageUrl)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('question-images').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handlePaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (!item) return
    const file = item.getAsFile()
    if (file) uploadFile(file)
  }

  async function handleGlobalPaste() {
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
    } catch { /* clipboard permission denied — ignore */ }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault()
      handleGlobalPaste()
    }
  }

  function remove() {
    setPreview(null)
    onChange(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div onPaste={handlePaste}>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      {preview ? (
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="preview" className="w-full max-h-48 object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="text-white text-sm">กำลังอัพโหลด...</span>
            </div>
          )}
          <button
            type="button"
            onClick={remove}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <X size={14} />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded-lg text-white text-xs hover:bg-black/70 transition-colors flex items-center gap-1"
          >
            <ImagePlus size={12} /> เปลี่ยนรูป
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="w-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-8 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:border-indigo-300"
        >
          <ImagePlus size={20} />
          <span>คลิกเพื่ออัพโหลดรูป</span>
          <span className="text-xs text-gray-300">หรือวางรูปจาก screenshot (Ctrl+V)</span>
        </button>
      )}
    </div>
  )
}
