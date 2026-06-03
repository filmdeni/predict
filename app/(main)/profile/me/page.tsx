'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { BookOpen, Check, Edit3, LogOut, MessageSquareWarning, Pencil, Target, Trophy, X } from 'lucide-react'
import FeedbackModal from '@/components/profile/FeedbackModal'
import { getRank, getNextRank, getProgressToNext } from '@/lib/game/ranks'

type UserProfile = Database['public']['Tables']['users']['Row']
type Prediction = Database['public']['Tables']['predictions']['Row'] & {
  questions: { id: string; title: string; options: { id: string; label: string }[] } | null
}
type SavedRow = {
  question_id: string
  questions: Database['public']['Tables']['questions']['Row'] & {
    categories: { name_th: string; emoji: string; slug: string }
  }
}
type BadgeRow = {
  badge_id: string
  earned_at: string
  badges: { id: string; name_th: string; description_th: string | null; emoji: string; category: string }
}

type Tab = 'history' | 'saved' | 'badges'

const STATIC_BADGES = [
  { icon: '🔮', label: 'จักรวาลแห่งผู้มองเห็น', desc: 'ทำนายถูก 100 ครั้ง',   check: (c: number, _t: number, _a: number, _s: number) => c >= 100 },
  { icon: '⚡', label: 'นักพยากรณ์มือเร็ว',      desc: 'ทำนาย 10 ครั้งขึ้นไป', check: (_c: number, t: number, _a: number, _s: number) => t >= 10 },
  { icon: '🎯', label: 'เข้าเป้าเสมอ',            desc: 'ความแม่น 80%+',        check: (_c: number, t: number, a: number, _s: number) => a >= 80 && t >= 10 },
  { icon: '🏆', label: 'เจ้าแห่งอันดับ',           desc: 'ติด Top 10',           check: () => false },
  { icon: '🌙', label: 'จิตใจแห่งดวงจันทร์',      desc: 'สตรีค 30 วัน',         check: (_c: number, _t: number, _a: number, s: number) => s >= 30 },
  { icon: '👑', label: 'ราชาแห่งคำทำนาย',         desc: 'อันดับ 1 ประจำปี',     check: () => false },
]

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [savedQuestions, setSavedQuestions] = useState<SavedRow[]>([])
  const [badges, setBadges] = useState<BadgeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('history')
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      await supabase.from('users').upsert({
        id: user.id,
        username: (user.email?.split('@')[0] ?? 'user') + '_' + user.id.slice(0, 4),
        display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'ผู้ใช้',
        avatar_url: user.user_metadata?.avatar_url ?? null,
      }, { onConflict: 'id', ignoreDuplicates: true })

      const [{ data: prof }, { data: preds }, { data: saved }, { data: userBadges }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('predictions').select('*, questions(id, title, options)').eq('user_id', user.id).order('placed_at', { ascending: false }).limit(30),
        supabase.from('saved_questions').select('question_id, questions(*, categories(name_th, emoji, slug))').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('user_badges').select('badge_id, earned_at, badges(id, name_th, description_th, emoji, category)').eq('user_id', user.id).order('earned_at', { ascending: false }),
      ])

      setProfile(prof as unknown as UserProfile)
      setPredictions((preds ?? []) as Prediction[])
      setSavedQuestions((saved ?? []) as SavedRow[])
      setBadges((userBadges ?? []) as BadgeRow[])
      setLoading(false)

      channel = supabase
        .channel(`profile-coins:${user.id}:${Date.now()}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, (payload) => {
          setProfile(prev => prev ? { ...prev, ...(payload.new as UserProfile) } : prev)
        })
        .subscribe()
    }
    load()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  function startEdit() {
    if (!profile) return
    setEditName(profile.display_name)
    setEditUsername(profile.username)
    setEditBio(profile.bio ?? '')
    setEditError(null)
    setEditing(true)
  }

  async function saveProfile() {
    if (!profile) return
    const name = editName.trim()
    const uname = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!name) { setEditError('กรุณากรอกชื่อ'); return }
    if (uname.length < 3) { setEditError('username ต้องมีอย่างน้อย 3 ตัวอักษร'); return }
    setSaving(true)
    setEditError(null)
    const bio = editBio.trim() || null
    const { error } = await supabase.from('users').update({ display_name: name, username: uname, bio }).eq('id', profile.id)
    setSaving(false)
    if (error) {
      setEditError(error.message.includes('unique') ? 'username นี้ถูกใช้แล้ว' : 'บันทึกไม่สำเร็จ')
    } else {
      setProfile(p => p ? { ...p, display_name: name, username: uname, bio } : p)
      setEditing(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="h-56 bg-white rounded-2xl animate-pulse border border-gray-200 shadow-sm" />
        <div className="h-44 bg-white rounded-2xl animate-pulse border border-gray-200 shadow-sm" />
        <div className="h-36 bg-white rounded-2xl animate-pulse border border-gray-200 shadow-sm" />
      </div>
    )
  }

  if (!profile) return (
    <div className="max-w-lg mx-auto p-6 flex flex-col items-center gap-4 pt-20 text-center">
      <p className="text-gray-400 text-sm">ไม่พบข้อมูลโปรไฟล์</p>
      <button onClick={signOut} className="text-sm text-red-500 underline">ออกจากระบบ</button>
    </div>
  )

  const rep = Number(profile.reputation ?? 0)
  const rankDisplay = getRank(rep)
  const nextRank = getNextRank(rep)
  const progress = getProgressToNext(rep)
  const accuracy = profile.total_predictions > 0 ? Math.round((profile.correct_predictions / profile.total_predictions) * 100) : 0
  const wrongCount = Math.max(0, profile.total_predictions - profile.correct_predictions - Math.round(profile.total_predictions * 0.07))
  const pendingCount = Math.max(0, profile.total_predictions - profile.correct_predictions - wrongCount)
  const unlockedCount = STATIC_BADGES.filter(b => b.check(profile.correct_predictions, profile.total_predictions, accuracy, profile.win_streak)).length

  const circumference = 2 * Math.PI * 40
  const dashArray = `${(accuracy / 100) * circumference} ${circumference}`

  return (
    <div className="max-w-lg mx-auto p-4 space-y-3 pb-10">
      {showFeedback && profile && (
        <FeedbackModal userId={profile.id} onClose={() => setShowFeedback(false)} />
      )}

      {/* Edit Profile Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-900 font-bold text-base">แก้ไขโปรไฟล์</h2>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ชื่อที่แสดง</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="ชื่อที่แสดง"
                  maxLength={30}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Username</label>
                <div className="flex items-center border border-gray-300 rounded-xl px-3 py-2 focus-within:border-indigo-400">
                  <span className="text-gray-400 text-sm mr-1">@</span>
                  <input
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    maxLength={20}
                    className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">แนะนำตัว</label>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="แนะนำตัวสั้นๆ..."
                  rows={2}
                  maxLength={100}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>
              {editError && <p className="text-xs text-red-500">{editError}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">
                ยกเลิก
              </button>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Hero Card ── */}
      <div className="relative rounded-2xl p-5 overflow-hidden bg-gradient-to-br from-[#1e0a3c] via-[#2d1260] to-[#1a0a2e] shadow-lg">
        {/* decorative glows */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-36 h-36 rounded-full bg-indigo-600/15 blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-violet-400 to-purple-800 border-2 border-yellow-400/70 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-purple-900/50 overflow-hidden">
              {profile.display_name[0]?.toUpperCase()}
            </div>
            <div className="absolute -inset-1.5 rounded-full border border-yellow-400/30 aura-ring" />
            <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-400 border-2 border-[#1e0a3c]" />
          </div>

          {/* Name + actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-white font-black text-lg leading-tight flex items-center gap-1.5">
                  {profile.display_name}
                  <button onClick={startEdit} className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Edit3 className="w-2.5 h-2.5 text-purple-300" />
                  </button>
                </h1>
                <p className="text-yellow-400 text-xs font-semibold mt-0.5">@{profile.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white/50 text-[11px]">{profile.bio || rankDisplay.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
                    {rankDisplay.emoji} {profile.rank}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
<button
                  onClick={startEdit}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition-colors"
                >
                  แก้ไขโปรไฟล์
                </button>
              </div>
            </div>

            {/* XP bar */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">Lv.{Math.max(1, Math.floor(rep / 200))} {rankDisplay.name}</span>
                <span className="text-[10px] text-white/40">
                  {rep.toLocaleString()} / {nextRank ? nextRank.minRep.toLocaleString() : '∞'} XP
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: rankDisplay.color, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
              </div>
              {nextRank && (
                <p className="text-[10px] text-white/30 text-right">
                  อีก {(nextRank.minRep - rep).toLocaleString()} XP → {nextRank.emoji} {nextRank.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="relative grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'point',       value: profile.coins.toLocaleString(), icon: 'P',  color: 'text-amber-500'  },
            { label: 'ความแม่น',   value: `${accuracy}%`,                 icon: '🎯', color: 'text-green-400'  },
            { label: 'ทำนายแล้ว', value: profile.total_predictions.toLocaleString(), icon: '🔮', color: 'text-purple-300' },
            { label: 'streak',      value: profile.win_streak.toString(),  icon: '🔥', color: 'text-orange-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-2.5 text-center backdrop-blur-sm border border-white/5 card-hover">
              {s.icon === 'P'
                ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[11px] leading-none coin-bounce">P</span>
                : <span className="text-base">{s.icon}</span>
              }
              <p className={`text-sm font-black mt-0.5 ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Badges — hidden for now */}

      {/* ── Prediction Stats ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-indigo-500" /> สถิติการทำนาย
        </h2>
        <div className="flex items-center gap-8">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="12"
                strokeDasharray={dashArray} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-gray-900">{profile.total_predictions.toLocaleString()}</span>
              <span className="text-[9px] text-gray-400">ทำนายทั้งหมด</span>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'ถูก',   count: profile.correct_predictions, color: '#22c55e' },
              { label: 'ผิด',   count: wrongCount,                  color: '#ef4444' },
              { label: 'รอผล', count: pendingCount,                 color: '#a855f7' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-sm text-gray-500 w-12">{s.label}</span>
                <span className="text-sm font-bold text-gray-900">{s.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabbed History ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-100">
          {([
            { key: 'history', label: 'ประวัติทำนาย' },
            { key: 'saved',   label: `บันทึกไว้${savedQuestions.length > 0 ? ` (${savedQuestions.length})` : ''}` },
            { key: 'badges',  label: `เหรียญตรา${badges.length > 0 ? ` (${badges.length})` : ''}` },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                tab === t.key
                  ? 'text-indigo-600 bg-indigo-50/60 border-b-2 border-indigo-500'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'history' && (
          predictions.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-400">
              <p className="text-3xl mb-2">🔮</p>
              <p className="text-sm">ยังไม่เคยทายเลย</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {predictions.map(p => {
                const optLabel = p.questions?.options?.find(o => o.id === p.option_id)?.label ?? p.option_id
                const result = p.is_correct === null ? 'pending' : p.is_correct ? 'win' : 'lose'
                return (
                  <div
                    key={p.id}
                    onClick={() => p.questions?.id && router.push(`/question/${p.questions.id}`)}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 font-bold
                      ${result === 'win' ? 'bg-green-100 text-green-600' : result === 'lose' ? 'bg-red-100 text-red-500' : 'bg-indigo-50 text-indigo-400'}`}>
                      {result === 'win' ? '✓' : result === 'lose' ? '✗' : '⌛'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{p.questions?.title ?? '—'}</p>
                      <p className="text-[11px] text-gray-400">
                        เลือก: <span className="text-indigo-500 font-medium">{optLabel}</span>
                        {result === 'pending' && <span className="ml-1.5 text-gray-400">· รอผล</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">
                        {result === 'win'
                          ? <span className="text-green-600">+{(p.coins_won ?? 0).toLocaleString()}</span>
                          : result === 'lose'
                          ? <span className="text-red-500">-{p.coins_wagered.toLocaleString()}</span>
                          : <span className="text-gray-400">{p.coins_wagered.toLocaleString()}</span>}
                      </p>
                      <p className="text-[10px] text-gray-400">point</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {tab === 'saved' && (
          savedQuestions.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-400">
              <p className="text-3xl mb-2">🔖</p>
              <p className="text-sm">ยังไม่มีคำถามที่บันทึกไว้</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {savedQuestions.map(row => (
                <Link
                  key={row.question_id}
                  href={`/question/${row.question_id}`}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xl">{row.questions.categories?.emoji ?? '📌'}</span>
                  <p className="flex-1 text-sm text-gray-900 truncate">{row.questions.title}</p>
                  <span className="text-gray-400 text-xs">→</span>
                </Link>
              ))}
            </div>
          )
        )}

        {tab === 'badges' && (
          badges.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-400">
              <p className="text-3xl mb-2">🏅</p>
              <p className="text-sm">ยังไม่มีป้ายเกียรติยศ</p>
              <p className="text-xs mt-1 text-gray-300">ทายให้แม่นและสม่ำเสมอเพื่อรับป้าย!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4">
              {badges.map(row => (
                <div key={row.badge_id} className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex flex-col items-center text-center gap-2">
                  <span className="text-3xl">{row.badges.emoji}</span>
                  <p className="text-xs font-bold text-gray-900">{row.badges.name_th}</p>
                  {row.badges.description_th && (
                    <p className="text-[10px] text-gray-400 leading-snug">{row.badges.description_th}</p>
                  )}
                  <p className="text-[10px] text-gray-300 mt-auto">
                    {new Date(row.earned_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Quick Links ── */}
      <div className="space-y-2">
        <Link href="/invite" className="flex items-center gap-3 bg-white border border-indigo-100 rounded-2xl px-4 py-3.5 shadow-sm hover:border-indigo-200 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-base">🔗</div>
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-700">ชวนเพื่อน</span>
            <span className="ml-2 text-xs text-indigo-500 font-semibold">+100 คะแนน/คน</span>
          </div>
          <span className="text-gray-400 text-xs">→</span>
        </Link>

        <Link href="/how-to-play" className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 shadow-sm hover:border-gray-300 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <BookOpen size={16} className="text-indigo-500" />
          </div>
          <span className="flex-1 text-sm font-medium text-gray-700">วิธีเล่น ภาวนา</span>
          <span className="text-gray-400 text-xs">→</span>
        </Link>

        <button
          onClick={() => setShowFeedback(true)}
          className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 shadow-sm hover:border-gray-300 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
            <MessageSquareWarning size={16} className="text-red-500" />
          </div>
          <span className="flex-1 text-sm font-medium text-gray-700">แจ้งปัญหา / ข้อเสนอแนะ</span>
          <span className="text-gray-400 text-xs">→</span>
        </button>
      </div>

      {/* ── Mobile Logout ── */}
      <button
        onClick={signOut}
        className="md:hidden w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors bg-white"
      >
        <LogOut className="w-4 h-4" />
        ออกจากระบบ
      </button>
    </div>
  )
}
