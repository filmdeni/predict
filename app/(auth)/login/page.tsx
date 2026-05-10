'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

const AVATARS = ['🧑', '👩', '🧔', '👧', '🙎']

function LoginForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  return (
    <div className="relative min-h-screen bg-[#07070f] flex flex-col items-center justify-center px-6 overflow-hidden">

      {/* Ambient gradients */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-15%] left-[-5%] w-[480px] h-[480px] rounded-full bg-emerald-950/60 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[380px] h-[380px] rounded-full bg-violet-950/40 blur-[120px]" />
        <div className="absolute top-[55%] left-[5%] w-[280px] h-[280px] rounded-full bg-blue-950/30 blur-[100px]" />
      </div>

      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px' }}
      />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.22s; }
        .delay-3 { animation-delay: 0.34s; }
        .delay-4 { animation-delay: 0.46s; }
        .delay-5 { animation-delay: 0.58s; }
        .delay-6 { animation-delay: 0.70s; }
      `}</style>

      <div className="relative z-10 w-full max-w-[360px] py-20 flex flex-col gap-10">

        {sent ? (
          <div className="fade-up text-center space-y-5">
            <div className="text-4xl">📬</div>
            <div className="space-y-2">
              <p className="text-white/80 font-light text-lg">เช็คอีเมลได้เลย</p>
              <p className="text-white/30 text-sm leading-relaxed">
                ส่งลิงก์เข้าสู่ระบบไปที่<br />
                <span className="text-white/50">{email}</span>
              </p>
            </div>
            <button onClick={() => setSent(false)} className="text-xs text-white/20 hover:text-white/40 transition-colors">
              ← เปลี่ยนอีเมล
            </button>
          </div>
        ) : (
          <>
            {/* ── Hero copy ── */}
            <div className="space-y-7">

              <div className="fade-up delay-1 space-y-1">
                <p className="text-white/20 text-[10px] tracking-[0.25em] uppercase font-light">Social Prediction Platform</p>
                <h1 className="text-[2.6rem] font-bold tracking-tight leading-none">
                  <span className="text-green-500">ภาว</span><span className="text-white">นา</span>
                </h1>
              </div>

              <div className="fade-up delay-2 space-y-4">
                <p className="text-white/75 text-[1.05rem] font-light leading-[1.85] tracking-wide">
                  อนาคตยังไม่ถูกเฉลย<br />
                  แต่ทุกคนต่างมีคำตอบของตัวเอง
                </p>
                <p className="text-white/30 text-[0.82rem] font-light leading-[1.9] tracking-wide">
                  พื้นที่สำหรับร่วมคาดการณ์เหตุการณ์ต่าง ๆ<br />
                  ผ่านมุมมอง เหตุผล ข้อมูล และความเชื่อของผู้คน<br />
                  ในโลกที่เต็มไปด้วยความไม่แน่นอน
                </p>
              </div>

              <div className="fade-up delay-3 flex items-center gap-3">
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                <div className="inline-flex items-center gap-2 border border-amber-400/20 rounded-full px-3.5 py-1.5 bg-amber-400/[0.04]">
                  <span className="text-[11px] text-amber-300/70 tracking-wide font-light">
                    🔮 เริ่มทำนายฟรี รับ 500 คะแนน + โบนัสรายวัน
                  </span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-white/10 to-transparent" />
              </div>
            </div>

            {/* ── Auth card ── */}
            <div className="fade-up delay-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5 space-y-4">
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white text-gray-900 font-medium rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                เข้าสู่ระบบด้วย Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[11px] text-white/20 tracking-wider">หรือใช้อีเมล</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="อีเมลของคุณ"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-white/20 transition-colors"
                />
                {error && <p className="text-red-400/80 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.09] disabled:opacity-30 text-white/60 font-light rounded-xl transition-all text-sm tracking-wide active:scale-[0.98]"
                >
                  {loading ? 'กำลังส่ง...' : 'ส่งลิงก์เข้าสู่ระบบ'}
                </button>
                <p className="text-center text-[11px] text-white/18 leading-relaxed" style={{ color: 'rgba(255,255,255,0.18)' }}>
                  คลิกลิงก์ในอีเมล — ไม่ต้องจำรหัสผ่าน
                </p>
              </form>
            </div>

            {/* ── Social proof ── */}
            <div className="fade-up delay-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2">
                  {AVATARS.map((e, i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-sm">
                      {e}
                    </div>
                  ))}
                </div>
                <p className="text-[12px] text-white/25">
                  ผู้คนกว่า <span className="text-white/45 font-medium">3,200 คน</span> กำลังร่วมคาดการณ์อยู่ตอนนี้
                </p>
              </div>
            </div>

            {/* ── Disclaimer ── */}
            <div className="fade-up delay-6 text-center space-y-1.5 pb-4">
              <p className="text-[10px] text-white/15 tracking-[0.18em] uppercase leading-relaxed">
                ไม่มีเงินจริง &nbsp;·&nbsp; ไม่มีการเดิมพัน &nbsp;·&nbsp; คะแนนทั้งหมดเป็นเพียงการจำลอง
              </p>
              <p className="text-[10px] text-white/10">
                เข้าสู่ระบบ = ยอมรับ Terms & Privacy Policy
              </p>
            </div>
          </>
        )}
      </div>
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
