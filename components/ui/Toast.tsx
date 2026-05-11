'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

let _addToast: ((msg: string, type?: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'success') {
  _addToast?.(message, type)
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    _addToast = (message, type = 'success') => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    }
    return () => { _addToast = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg animate-fadeInUp ${
            t.type === 'success' ? 'bg-gray-900 text-white'
            : t.type === 'error' ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
          }`}
        >
          {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          {t.message}
        </div>
      ))}
    </div>
  )
}
