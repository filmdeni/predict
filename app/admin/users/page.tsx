'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X, Save, Trash2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import { RANKS } from '@/lib/game/ranks'
import type { RankTier } from '@/lib/game/ranks'

type User = Database['public']['Tables']['users']['Row']

interface EditForm {
  display_name: string
  username: string
  bio: string
  coins: number
  rank: RankTier
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'created_at' | 'coins' | 'reputation' | 'total_predictions'>('created_at')

  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('users')
        .select('*')
        .order(sort, { ascending: false })
        .limit(200)
      setUsers((data ?? []) as User[])
      setLoading(false)
    }
    load()
  }, [sort])

  function openEdit(u: User) {
    setEditing(u)
    setForm({
      display_name: u.display_name,
      username: u.username,
      bio: u.bio ?? '',
      coins: u.coins,
      rank: u.rank,
    })
    setSaveError(null)
  }

  function closeEdit() {
    setEditing(null)
    setForm(null)
    setSaveError(null)
    setConfirmDelete(false)
  }

  async function deleteUser() {
    if (!editing) return
    setDeleting(true)
    const { error } = await supabase.auth.admin.deleteUser(editing.id).catch(() => ({ error: { message: 'ไม่มีสิทธิ์' } }))
    if (error) {
      // fallback: delete from public.users only (auth.users ต้องใช้ service role)
      const { error: err2 } = await supabase.from('users').delete().eq('id', editing.id)
      if (err2) { setSaveError(err2.message); setDeleting(false); setConfirmDelete(false); return }
    }
    setUsers(prev => prev.filter(u => u.id !== editing.id))
    setDeleting(false)
    closeEdit()
  }

  async function save() {
    if (!editing || !form) return
    setSaving(true)
    setSaveError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('users') as any)
      .update({
        display_name: form.display_name.trim(),
        username: form.username.trim(),
        bio: form.bio.trim() || null,
        coins: form.coins,
        rank: form.rank,
      })
      .eq('id', editing.id)
    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }
    setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...form, bio: form.bio.trim() || null } : u))
    setSaving(false)
    closeEdit()
  }

  const filtered = users.filter(u =>
    !search ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ผู้ใช้</h1>
        <p className="text-sm text-gray-400 mt-0.5">{users.length} คนล่าสุด · คลิกแถวเพื่อแก้ไข</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา username..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 bg-white"
          />
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as typeof sort)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 bg-white text-gray-700"
        >
          <option value="created_at">ใหม่สุด</option>
          <option value="coins">คะแนนมากสุด</option>
          <option value="reputation">reputation มากสุด</option>
          <option value="total_predictions">ทายมากสุด</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-gray-50/50" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">ไม่พบผู้ใช้</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">ผู้ใช้</th>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium text-right">คะแนน</th>
                <th className="px-4 py-3 font-medium text-right">ทาย</th>
                <th className="px-4 py-3 font-medium text-right">ถูก</th>
                <th className="px-4 py-3 font-medium text-right">สมัครเมื่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => {
                const accuracy = u.total_predictions > 0
                  ? Math.round((u.correct_predictions / u.total_predictions) * 100)
                  : null
                const isNew = Date.now() - new Date(u.created_at).getTime() < 86400000
                return (
                  <tr
                    key={u.id}
                    onClick={() => openEdit(u)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {u.display_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-none">{u.display_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">@{u.username}</p>
                        </div>
                        {isNew && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded-full">NEW</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(() => { const r = RANKS.find(x => x.tier === u.rank); return r ? `${r.emoji} ${r.name}` : u.rank })()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {u.coins.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{u.total_predictions}</td>
                    <td className="px-4 py-3 text-right">
                      {accuracy !== null ? (
                        <span className={`font-medium ${accuracy >= 60 ? 'text-emerald-600' : accuracy >= 40 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {accuracy}%
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Drawer */}
      {editing && form && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={closeEdit}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900">แก้ไขผู้ใช้</p>
                <p className="text-xs text-gray-400 mt-0.5">@{editing.username}</p>
              </div>
              <button onClick={closeEdit} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Stats (read-only) */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">{editing.total_predictions}</p>
                  <p className="text-[11px] text-gray-400">ทายทั้งหมด</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{editing.correct_predictions}</p>
                  <p className="text-[11px] text-gray-400">ถูก</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{editing.reputation}</p>
                  <p className="text-[11px] text-gray-400">reputation</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <Field label="ชื่อแสดง">
                <input
                  value={form.display_name}
                  onChange={e => setForm(f => f ? { ...f, display_name: e.target.value } : f)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </Field>

              <Field label="Username">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                  <input
                    value={form.username}
                    onChange={e => setForm(f => f ? { ...f, username: e.target.value } : f)}
                    className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </Field>

              <Field label="Bio">
                <textarea
                  rows={2}
                  value={form.bio}
                  onChange={e => setForm(f => f ? { ...f, bio: e.target.value } : f)}
                  placeholder="ไม่มี bio"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none"
                />
              </Field>

              <Field label="คะแนน (coins)">
                <input
                  type="number"
                  min={0}
                  value={form.coins}
                  onChange={e => setForm(f => f ? { ...f, coins: Number(e.target.value) } : f)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </Field>

              <Field label="Rank">
                <div className="grid grid-cols-1 gap-1.5">
                  {RANKS.map(r => (
                    <button
                      key={r.tier}
                      type="button"
                      onClick={() => setForm(f => f ? { ...f, rank: r.tier } : f)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm text-left transition-all ${
                        form.rank === r.tier
                          ? 'bg-gray-900 border-gray-900 text-white'
                          : 'border-gray-100 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-auto text-xs opacity-50">{r.tier}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 space-y-2">
              {saveError && (
                <p className="text-xs text-red-500 mb-1">{saveError}</p>
              )}
              <button
                onClick={save}
                disabled={saving || deleting}
                className="w-full py-3 bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Save size={15} />
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving || deleting}
                  className="w-full py-2.5 border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={14} /> ลบผู้ใช้นี้
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={deleteUser}
                    disabled={deleting}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
