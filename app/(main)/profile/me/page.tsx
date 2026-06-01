'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { LogOut, Trophy, Target, Flame, BookOpen, Bookmark, Pencil, Check, X, MessageSquareWarning } from 'lucide-react'
import FeedbackModal from '@/components/profile/FeedbackModal'
import { getRank, getNextRank, getProgressToNext } from '@/lib/game/ranks'
import QuestionCard from '@/components/feed/QuestionCard'

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

const RANK_COLOR: Record<string, string> = {
  'ผู้มาใหม่':     'text-slate-500 bg-slate-100',
  'ผู้ตื่นรู้':    'text-blue-500 bg-blue-50',
  'นักพยากรณ์':   'text-emerald-600 bg-emerald-50',
  'โหรมือทอง':    'text-yellow-600 bg-yellow-50',
  'เซียนทำนาย':   'text-orange-500 bg-orange-50',
  'เทพทำนาย':     'text-purple-600 bg-purple-50',
  'จักรวาลเลือก': 'text-pink-600 bg-pink-50',
}

type Tab = 'history' | 'saved' | 'badges'

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
        supabase
          .from('predictions')
          .select('*, questions(id, title, options)')
          .eq('user_id', user.id)
          .order('placed_at', { ascending: false })
          .limit(20),
        supabase
          .from('saved_questions')
          .select('question_id, questions(*, categories(name_th, emoji, slug))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_badges')
          .select('badge_id, earned_at, badges(id, name_th, description_th, emoji, category)')
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false }),
      ])

      setProfile(prof as unknown as UserProfile)
      setPredictions((preds ?? []) as Prediction[])
      setSavedQuestions((saved ?? []) as SavedRow[])
      setBadges((userBadges ?? []) as BadgeRow[])
      setLoading(false)

      channel = supabase
        .channel(`profile-coins:${user.id}:${Date.now()}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}`
        }, (payload) => {
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
    const { error } = await supabase
      .from('users')
      .update({ display_name: name, username: uname, bio })
      .eq('id', profile.id)
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
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <div className="h-24 bg-white rounded-2xl animate-pulse border border-gray-200" />
        <div className="h-40 bg-white rounded-2xl animate-pulse border border-gray-200" />
      </div>
    )
  }

  if (!profile) return (
    <div className="max-w-lg mx-auto p-6 flex flex-col items-center gap-4 pt-20 text-center">
      <p className="text-gray-400 text-sm">ไม่พบข้อมูลโปรไฟล์</p>
      <button onClick={signOut} className="text-sm text-red-500 underline">ออกจากระบบ</button>
    </div>
  )

  const winRate = profile.total_predictions > 0
    ? Math.round((profile.correct_predictions / profile.total_predictions) * 100)
    : 0

  const rep = Number(profile.reputation ?? 0)
  const rankDisplay = getRank(rep)
  const nextRank = getNextRank(rep)
  const progress = getProgressToNext(rep)

  return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-700">
            {profile.display_name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-1.5">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="ชื่อที่แสดง"
                  className="w-full text-sm font-semibold border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gray-500"
                  maxLength={30}
                />
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-xs">@</span>
                  <input
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-gray-500"
                    maxLength={20}
                  />
                </div>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="แนะนำตัวสั้นๆ..."
                  rows={2}
                  maxLength={100}
                  className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gray-500 resize-none"
                />
                {editError && <p className="text-[11px] text-red-500">{editError}</p>}
              </div>
            ) : (
              <>
                <h1 className="text-gray-900 font-bold text-lg truncate">{profile.display_name}</h1>
                <p className="text-gray-400 text-sm">@{profile.username}</p>
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${RANK_COLOR[profile.rank] ?? 'text-gray-500 bg-gray-100'}`}>
                  {profile.rank}
                </span>
                {profile.bio && (
                  <p className="text-xs text-gray-500 mt-1.5 leading-snug">{profile.bio}</p>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {editing ? (
              <>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="p-1.5 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
                >
                  <Check size={18} />
                </button>
                <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <button onClick={signOut} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                  <LogOut size={18} />
                </button>
                <button onClick={startEdit} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                  <Pencil size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Coins */}
        <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">คะแนนของฉัน</span>
          <span className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-xs leading-none">P</span>
            {profile.coins.toLocaleString()}
          </span>
        </div>

        {/* Rank progress */}
        <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{rankDisplay.emoji}</span>
              <span className="text-sm font-bold" style={{ color: rankDisplay.color }}>{rankDisplay.name}</span>
              <span className="text-xs text-gray-400">"{rankDisplay.title}"</span>
            </div>
            <span className="text-xs text-gray-400">{rep.toLocaleString()} rep</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: rankDisplay.color }}
            />
          </div>
          {nextRank ? (
            <p className="text-[11px] text-gray-400 text-right">
              อีก {(nextRank.minRep - rep).toLocaleString()} rep → {nextRank.emoji} {nextRank.name}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 text-right">แรงก์สูงสุดแล้ว 🌌</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Target size={16} className="mx-auto text-gray-400 mb-1" />
            <p className="text-lg font-bold text-gray-900">{profile.total_predictions}</p>
            <p className="text-xs text-gray-400">ทายทั้งหมด</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Trophy size={16} className="mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold text-gray-900">{winRate}%</p>
            <p className="text-xs text-gray-400">แม่นยำ</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Flame size={16} className="mx-auto text-orange-400 mb-1" />
            <p className="text-lg font-bold text-gray-900">{profile.win_streak}</p>
            <p className="text-xs text-gray-400">streak</p>
          </div>
        </div>
      </div>

      {/* Invite friends */}
      <Link
        href="/invite"
        className="flex items-center gap-3 bg-white border border-indigo-100 rounded-2xl px-4 py-3.5 shadow-sm hover:border-indigo-200 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-base">
          🔗
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-700">ชวนเพื่อน</span>
          <span className="ml-2 text-xs text-indigo-500 font-semibold">+100 คะแนน/คน</span>
        </div>
        <span className="text-gray-400 text-xs">→</span>
      </Link>

      {/* How to play */}
      <Link
        href="/how-to-play"
        className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 shadow-sm hover:border-gray-300 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
          <BookOpen size={16} className="text-indigo-500" />
        </div>
        <span className="flex-1 text-sm font-medium text-gray-700">วิธีเล่น ภาวนา</span>
        <span className="text-gray-400 text-xs">→</span>
      </Link>

      {/* Report / Feedback */}
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

      {showFeedback && profile && (
        <FeedbackModal userId={profile.id} onClose={() => setShowFeedback(false)} />
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
          {([
            { key: 'history', label: 'ประวัติการทาย' },
            { key: 'saved',   label: `บันทึกไว้ ${savedQuestions.length > 0 ? `(${savedQuestions.length})` : ''}` },
            { key: 'badges',  label: `ป้ายเกียรติยศ ${badges.length > 0 ? `(${badges.length})` : ''}` },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: History */}
        {tab === 'history' && (
          predictions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🔮</p>
              <p className="text-sm">ยังไม่เคยทายเลย</p>
            </div>
          ) : (
            <div className="space-y-2">
              {predictions.map(p => {
                const optLabel = p.questions?.options?.find(o => o.id === p.option_id)?.label ?? p.option_id
                const statusColor = p.is_correct === null
                  ? 'bg-gray-100 text-gray-500'
                  : p.is_correct
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                const statusText = p.is_correct === null ? 'รอผล' : p.is_correct ? 'ถูก ✓' : 'ผิด ✗'

                return (
                  <div
                    key={p.id}
                    onClick={() => p.questions?.id && router.push(`/question/${p.questions.id}`)}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-gray-300 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.questions?.title ?? '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        ทาย: <span className="text-gray-600 font-medium">{optLabel}</span>
                        {' · '}
                        <span className="inline-flex items-center gap-0.5">
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[8px] leading-none">P</span>
                          {p.coins_wagered.toLocaleString()} คะแนน
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{statusText}</span>
                      {p.coins_won !== null && p.coins_won > 0 && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                          +<span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black text-[8px] leading-none">P</span>
                          {p.coins_won.toLocaleString()} คะแนน
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* Tab: Saved */}
        {tab === 'saved' && (
          savedQuestions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bookmark size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">ยังไม่มีคำถามที่บันทึกไว้</p>
              <p className="text-xs mt-1">กด 🔖 ที่การ์ดคำถามเพื่อบันทึก</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {savedQuestions.map(row => (
                <QuestionCard
                  key={row.question_id}
                  question={row.questions}
                  initialSaved={true}
                />
              ))}
            </div>
          )
        )}

        {/* Tab: Badges */}
        {tab === 'badges' && (
          badges.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🏅</p>
              <p className="text-sm">ยังไม่มีป้ายเกียรติยศ</p>
              <p className="text-xs mt-1">ทายให้แม่นและสม่ำเสมอเพื่อรับป้าย!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {badges.map(row => (
                <div key={row.badge_id} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center text-center gap-2">
                  <span className="text-3xl">{row.badges.emoji}</span>
                  <p className="text-sm font-bold text-gray-900">{row.badges.name_th}</p>
                  {row.badges.description_th && (
                    <p className="text-[11px] text-gray-400 leading-snug">{row.badges.description_th}</p>
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
    </div>
  )
}
