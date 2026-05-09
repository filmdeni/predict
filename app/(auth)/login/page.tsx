'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/feed'
  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${next}` },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${next}` },
    })
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-5xl">📬</div>
        <h2 className="text-white font-bold text-xl">เช็คอีเมลได้เลย</h2>
        <p className="text-gray-400 text-sm">ส่ง magic link ไปที่ <span className="text-white">{email}</span> แล้ว</p>
        <button onClick={() => setSent(false)} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← เปลี่ยนอีเมล
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Logo */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-green-500">ภาว</span><span className="text-white">นา</span>
        </h1>
        <p className="text-gray-400 text-sm mt-2">ทายผลเหตุการณ์ แข่งกันด้วยสกิล</p>
      </div>

      <div className="bg-[#1a1a24] border border-[#2a2a38] rounded-2xl p-6 space-y-5">
        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          เข้าสู่ระบบด้วย Google
        </button>

        {/* divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#2a2a38]" />
          <span className="text-xs text-gray-500">หรือ</span>
          <div className="flex-1 h-px bg-[#2a2a38]" />
        </div>

        {/* Magic link */}
        <form onSubmit={handleMagicLink} className="space-y-3">
          <input
            type="email"
            required
            placeholder="อีเมลของคุณ"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#0f0f13] border border-[#2a2a38] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'กำลังส่ง...' : 'ส่ง Magic Link'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-gray-600">
        เข้าสู่ระบบ = ยอมรับ Terms & Privacy Policy
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
