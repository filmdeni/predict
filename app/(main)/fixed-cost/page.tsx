'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Wallet, Plus, Pencil, Trash2, RotateCcw, Target, StickyNote,
  Lightbulb, Check, PiggyBank, Tag, CreditCard, AlertTriangle, Sparkles, PartyPopper,
  Home, Car, Wifi, Tv, Shield, Zap, Droplet, Phone, ShoppingCart,
  Lock, LockKeyhole, Loader2, type LucideIcon,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  newSalt, deriveKey, encryptWithKey, decryptWithKey, unlockKey,
  readVault, saveVault, clearVault, type Vault,
} from '@/lib/crypto/pinVault'

type Expense = { id: string; name: string; amount: number }
type SecureData = { income: string; expenses: Expense[]; goal: string; note: string }

const LEGACY_KEY = 'fixed-cost:v1' // pre-encryption plaintext — migrated to the vault, then removed
const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#06b6d4', '#ec4899', '#14b8a6', '#f43f5e']

// auto-pick icon + tint from the item name
const ICON_RULES: { kw: string[]; icon: LucideIcon; color: string }[] = [
  { kw: ['เช่า', 'บ้าน', 'คอนโด', 'หอ', 'ห้อง'], icon: Home, color: '#3b82f6' },
  { kw: ['รถ', 'ผ่อนรถ', 'มอเตอร์'], icon: Car, color: '#f97316' },
  { kw: ['เน็ต', 'อินเทอร์เน็ต', 'wifi', 'ไวไฟ'], icon: Wifi, color: '#22c55e' },
  { kw: ['netflix', 'youtube', 'disney', 'ดู', 'หนัง', 'ทีวี', 'tv', 'spotify'], icon: Tv, color: '#ef4444' },
  { kw: ['ประกัน'], icon: Shield, color: '#a855f7' },
  { kw: ['ไฟ', 'ค่าไฟ'], icon: Zap, color: '#eab308' },
  { kw: ['น้ำ', 'ค่าน้ำ'], icon: Droplet, color: '#06b6d4' },
  { kw: ['มือถือ', 'โทรศัพท์', 'แพ็กเกจ', 'ซิม'], icon: Phone, color: '#ec4899' },
  { kw: ['บัตร', 'เครดิต', 'กู้', 'หนี้'], icon: CreditCard, color: '#14b8a6' },
  { kw: ['ซื้อ', 'ของ', 'ช้อป'], icon: ShoppingCart, color: '#f43f5e' },
]

function iconFor(name: string): { icon: LucideIcon; color: string } {
  const lower = name.toLowerCase()
  for (const rule of ICON_RULES) {
    if (rule.kw.some(k => lower.includes(k.toLowerCase()))) return { icon: rule.icon, color: rule.color }
  }
  return { icon: Tag, color: '#64748b' }
}

const baht = (n: number) => n.toLocaleString('th-TH')

// digit-only string <-> formatted display (thousand separators while typing)
const onlyDigits = (s: string) => s.replace(/[^\d]/g, '')
const fmtInput = (s: string) => (s ? Number(s).toLocaleString('th-TH') : '')

const SAVE_TARGET_PCT = 20   // เป้าออมแนะนำ 20% ของรายรับ
const ITEM_WARN_PCT = 30     // รายการเดียวกินเกิน 30% ของรายรับ = เตือน

const SAVING_TIPS = [
  'พยายามเก็บออมอย่างน้อย 20% ของรายรับ',
  'ทบทวนค่าใช้จ่ายประจำทุกเดือน',
  'ตัดค่าใช้จ่ายที่ไม่จำเป็นออก',
  'เพิ่มรายได้จากช่องทางอื่น',
]

type Mode = 'loading' | 'setup' | 'locked' | 'open'

export default function FixedCostPage() {
  const [mode, setMode] = useState<Mode>('loading')
  const keyRef = useRef<CryptoKey | null>(null)
  const saltRef = useRef<Uint8Array | null>(null)
  const vaultRef = useRef<Vault | null>(null) // locked vault awaiting unlock

  const [income, setIncome] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [goal, setGoal] = useState('')
  const [note, setNote] = useState('')

  // add-form state
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [addError, setAddError] = useState('')

  // edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')

  // detect vault on mount → setup (first time) or locked
  useEffect(() => {
    const v = readVault()
    if (v) { vaultRef.current = v; setMode('locked') }
    else setMode('setup')
  }, [])

  // persist (encrypted) whenever data changes while unlocked
  useEffect(() => {
    if (mode !== 'open' || !keyRef.current || !saltRef.current) return
    const data: SecureData = { income, expenses, goal, note }
    encryptWithKey(keyRef.current, saltRef.current, data).then(saveVault).catch(() => {})
  }, [income, expenses, goal, note, mode])

  function applyData(d: SecureData) {
    setIncome(d.income ?? '')
    setExpenses(Array.isArray(d.expenses) ? d.expenses : [])
    setGoal(d.goal ?? '')
    setNote(d.note ?? '')
  }

  // first-time PIN setup — creates the vault (migrating any legacy plaintext)
  async function handleSetup(pin: string) {
    const salt = newSalt()
    const key = await deriveKey(pin, salt)

    let initial: SecureData = { income: '', expenses: [], goal: '', note: '' }
    try {
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (legacy) {
        const d = JSON.parse(legacy)
        initial = {
          income: d.income ?? '',
          expenses: Array.isArray(d.expenses) ? d.expenses : [],
          goal: d.goal ?? '',
          note: d.note ?? '',
        }
        localStorage.removeItem(LEGACY_KEY)
      }
    } catch { /* ignore */ }

    saveVault(await encryptWithKey(key, salt, initial))
    keyRef.current = key
    saltRef.current = salt
    applyData(initial)
    setMode('open')
  }

  // unlock — returns false on wrong PIN so the gate can show an error
  async function handleUnlock(pin: string): Promise<boolean> {
    const v = vaultRef.current
    if (!v) return false
    try {
      const { key, salt } = await unlockKey(pin, v)
      const data = await decryptWithKey<SecureData>(key, v) // throws on wrong PIN
      keyRef.current = key
      saltRef.current = salt
      applyData(data)
      setMode('open')
      return true
    } catch {
      return false
    }
  }

  function lock() {
    keyRef.current = null
    saltRef.current = null
    setIncome(''); setExpenses([]); setGoal(''); setNote(''); setEditId(null)
    vaultRef.current = readVault()
    setMode('locked')
  }

  function clearData() {
    if (!confirm('ล้างข้อมูลทั้งหมด? (ยังใช้ PIN เดิม) — ย้อนกลับไม่ได้')) return
    setIncome(''); setExpenses([]); setGoal(''); setNote(''); setEditId(null)
  }

  function forgetPin() {
    if (!confirm('ลืม PIN จะกู้ข้อมูลคืนไม่ได้ — ล้างทั้งหมดแล้วตั้ง PIN ใหม่?')) return
    clearVault()
    vaultRef.current = null
    setIncome(''); setExpenses([]); setGoal(''); setNote('')
    setMode('setup')
  }

  const incomeNum = Number(income) || 0
  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const remaining = incomeNum - totalExpense
  const usedPct = incomeNum > 0 ? (totalExpense / incomeNum) * 100 : 0

  const chartData = useMemo(
    () => expenses.filter(e => e.amount > 0).map((e, i) => ({ ...e, color: COLORS[i % COLORS.length] })),
    [expenses],
  )

  // dynamic savings advice
  const saveRate = incomeNum > 0 ? (remaining / incomeNum) * 100 : 0
  const targetAmount = Math.round(incomeNum * SAVE_TARGET_PCT / 100)
  const insight = (() => {
    if (incomeNum <= 0) return null
    if (remaining < 0)
      return { tone: 'bad' as const, icon: AlertTriangle, text: `ค่าใช้จ่ายเกินรายรับ ${baht(-remaining)} บาท — ต้องลดรายจ่ายหรือเพิ่มรายได้` }
    if (saveRate >= SAVE_TARGET_PCT)
      return { tone: 'good' as const, icon: PartyPopper, text: `ออมได้ ${saveRate.toFixed(0)}% ของรายรับ 🎉 เกินเป้า ${SAVE_TARGET_PCT}% แล้ว!` }
    return { tone: 'warn' as const, icon: Sparkles, text: `ออมได้ ${saveRate.toFixed(0)}% ของรายรับ — อีก ${baht(Math.max(targetAmount - remaining, 0))} บาท จะถึงเป้า ${SAVE_TARGET_PCT}%` }
  })()

  function addExpense() {
    const amt = Number(newAmount)
    if (!newName.trim()) { setAddError('กรอกชื่อรายการก่อน'); return }
    if (!amt || amt <= 0) { setAddError('กรอกจำนวนเงินให้มากกว่า 0'); return }
    setExpenses(prev => [...prev, { id: crypto.randomUUID(), name: newName.trim(), amount: amt }])
    setNewName('')
    setNewAmount('')
    setAddError('')
  }

  function startEdit(e: Expense) {
    setEditId(e.id)
    setEditName(e.name)
    setEditAmount(String(e.amount))
  }

  function saveEdit() {
    const amt = Number(editAmount)
    if (!editName.trim() || !amt || amt <= 0) return
    setExpenses(prev => prev.map(e => e.id === editId ? { ...e, name: editName.trim(), amount: amt } : e))
    setEditId(null)
  }

  function removeExpense(id: string) {
    setExpenses(prev => prev.filter(e => e.id !== id))
    if (editId === id) setEditId(null)
  }

  // --- gate screens ---
  if (mode === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-300">
        <Loader2 size={28} className="animate-spin" />
      </div>
    )
  }
  if (mode === 'setup') return <PinGate variant="setup" onSubmit={handleSetup} />
  if (mode === 'locked') return <PinGate variant="unlock" onSubmit={handleUnlock} onForget={forgetPin} />

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Wallet size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-tight">คำนวณค่าใช้จ่ายประจำ (Fixed Cost)</h1>
            <p className="text-sm text-gray-500">วางแผนการเงินง่าย ๆ เห็นเงินเหลือเก็บทันที</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={lock}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            title="ล็อกหน้านี้"
          >
            <Lock size={15} /> <span className="hidden sm:inline">ล็อก</span>
          </button>
          <button
            onClick={clearData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-500 transition-colors"
          >
            <RotateCcw size={15} /> <span className="hidden sm:inline">ล้างข้อมูล</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT — inputs & list */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {/* Income */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <PiggyBank size={18} className="text-green-500" />
              <h2 className="font-bold text-gray-800">รายรับต่อเดือน (เงินเดือน)</h2>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                value={fmtInput(income)}
                onChange={e => setIncome(onlyDigits(e.target.value))}
                placeholder="กรอกเงินเดือนของคุณ"
                className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-200 text-2xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
              <span className="text-gray-400 font-medium">บาท</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">แก้ไขรายรับได้ตลอดเวลา ระบบจะคำนวณให้อัตโนมัติ</p>
          </section>

          {/* Add expense */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Plus size={18} className="text-indigo-500" />
              <h2 className="font-bold text-gray-800">เพิ่มรายการค่าใช้จ่ายประจำ</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <label className="flex-1">
                <span className="block text-xs text-gray-500 mb-1">ชื่อรายการ</span>
                <input
                  value={newName}
                  onChange={e => { setNewName(e.target.value); if (addError) setAddError('') }}
                  onKeyDown={e => e.key === 'Enter' && addExpense()}
                  placeholder="เช่น ค่าเช่า, ผ่อนรถ, อินเทอร์เน็ต"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </label>
              <label className="sm:w-40">
                <span className="block text-xs text-gray-500 mb-1">จำนวนเงิน (บาท)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fmtInput(newAmount)}
                  onChange={e => { setNewAmount(onlyDigits(e.target.value)); if (addError) setAddError('') }}
                  onKeyDown={e => e.key === 'Enter' && addExpense()}
                  placeholder="เช่น 8,000"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </label>
              <button
                onClick={addExpense}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Plus size={16} /> เพิ่มรายการ
              </button>
            </div>
            {addError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                <AlertTriangle size={13} /> {addError}
              </p>
            )}
          </section>

          {/* Expense list */}
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 p-5 pb-3">
              <Wallet size={18} className="text-indigo-500" />
              <h2 className="font-bold text-gray-800">รายการค่าใช้จ่ายประจำ (Fixed Cost)</h2>
            </div>

            {expenses.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">
                ยังไม่มีรายการ — เพิ่มค่าใช้จ่ายประจำด้านบนได้เลย
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs border-y border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-2.5 font-medium w-10">#</th>
                      <th className="px-2 py-2.5 font-medium">ชื่อรายการ</th>
                      <th className="px-2 py-2.5 font-medium text-right">จำนวนเงิน (บาท)</th>
                      <th className="px-5 py-2.5 font-medium text-center w-28">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e, i) => {
                      const { icon: Icon, color } = iconFor(e.name)
                      const editing = editId === e.id
                      return (
                        <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                          <td className="px-2 py-3">
                            {editing ? (
                              <input
                                value={editName}
                                onChange={ev => setEditName(ev.target.value)}
                                onKeyDown={ev => ev.key === 'Enter' && saveEdit()}
                                className="w-full px-2 py-1.5 rounded-lg border border-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium text-gray-700">
                                <span className="flex items-center gap-2.5">
                                  <Icon size={18} style={{ color }} className="flex-shrink-0" />
                                  {e.name}
                                </span>
                                {incomeNum > 0 && (
                                  <span className={`ml-7 text-xs flex items-center gap-1 ${
                                    (e.amount / incomeNum) * 100 > ITEM_WARN_PCT ? 'text-amber-600' : 'text-gray-400'
                                  }`}>
                                    {(e.amount / incomeNum) * 100 > ITEM_WARN_PCT && <AlertTriangle size={11} />}
                                    {((e.amount / incomeNum) * 100).toFixed(1)}% ของรายรับ
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-right">
                            {editing ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={fmtInput(editAmount)}
                                onChange={ev => setEditAmount(onlyDigits(ev.target.value))}
                                onKeyDown={ev => ev.key === 'Enter' && saveEdit()}
                                className="w-28 px-2 py-1.5 rounded-lg border border-indigo-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              />
                            ) : (
                              <span className="font-semibold text-gray-800">{baht(e.amount)}</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {editing ? (
                                <button
                                  onClick={saveEdit}
                                  className="p-2 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 transition-colors"
                                  title="บันทึก"
                                >
                                  <Check size={15} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEdit(e)}
                                  className="p-2 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors"
                                  title="แก้ไข"
                                >
                                  <Pencil size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => removeExpense(e.id)}
                                className="p-2 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                                title="ลบ"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50/60 border-t border-indigo-100">
                      <td colSpan={2} className="px-5 py-3.5 font-bold text-gray-700">รวมค่าใช้จ่ายประจำทั้งหมด</td>
                      <td className="px-2 py-3.5 text-right font-black text-indigo-700">{baht(totalExpense)}</td>
                      <td className="px-5 py-3.5 text-center text-gray-400 text-xs">บาท</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — summary & chart */}
        <div className="space-y-4 min-w-0">
          {/* Summary */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-bold text-gray-800 border-b border-gray-100 pb-2">สรุปภาพรวม</h2>

            <SummaryRow label="รายรับต่อเดือน" value={baht(incomeNum)} color="text-green-600" icon={<PiggyBank size={18} className="text-green-500" />} />
            <SummaryRow label="ค่าใช้จ่ายประจำรวม" value={baht(totalExpense)} color="text-red-500" icon={<Tag size={18} className="text-red-400" />} />
            <SummaryRow
              label="เงินคงเหลือ"
              value={baht(remaining)}
              color={remaining >= 0 ? 'text-green-600' : 'text-red-600'}
              icon={<Wallet size={18} className={remaining >= 0 ? 'text-green-500' : 'text-red-500'} />}
            />

            <div className="pt-1">
              <p className="text-xs text-gray-500 mb-1">ใช้จ่ายไป</p>
              <p className={`text-2xl font-black ${usedPct > 100 ? 'text-red-600' : usedPct > 80 ? 'text-amber-500' : 'text-gray-800'}`}>
                {usedPct.toFixed(1)}%
              </p>
              <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usedPct > 100 ? 'bg-red-500' : usedPct > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(usedPct, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">จากรายรับทั้งหมด</p>
            </div>

            {insight && (
              <div className={`flex items-start gap-2 rounded-xl p-3 text-sm font-medium ${
                insight.tone === 'good' ? 'bg-emerald-50 text-emerald-700'
                  : insight.tone === 'bad' ? 'bg-red-50 text-red-600'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                <insight.icon size={16} className="mt-0.5 flex-shrink-0" />
                <span>{insight.text}</span>
              </div>
            )}
          </section>

          {/* Donut chart */}
          {chartData.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 mb-2">สัดส่วนค่าใช้จ่าย</h2>
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={1}
                      stroke="none"
                    >
                      {chartData.map(d => <Cell key={d.id} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-gray-800">{baht(totalExpense)}</span>
                  <span className="text-xs text-gray-400">บาท</span>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {chartData.map(d => {
                  const pct = totalExpense > 0 ? (d.amount / totalExpense) * 100 : 0
                  return (
                    <li key={d.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="truncate">{d.name}</span>
                      </span>
                      <span className="text-gray-500 flex-shrink-0 ml-2">
                        <span className="font-semibold text-gray-700">{baht(d.amount)}</span>
                        <span className="text-gray-400 text-xs"> ({pct.toFixed(1)}%)</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Bottom cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Tips */}
        <section className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={18} className="text-amber-500" />
            <h2 className="font-bold text-amber-900">เคล็ดลับการออม</h2>
          </div>
          <ul className="space-y-2">
            {SAVING_TIPS.map(t => (
              <li key={t} className="flex items-start gap-2 text-sm text-amber-900/80">
                <Check size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Goal */}
        <section className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target size={18} className="text-blue-500" />
            <h2 className="font-bold text-blue-900">เป้าหมายการออม</h2>
          </div>
          <p className="text-xs text-blue-900/60 mb-2">ตั้งเป้าเก็บเงินในแต่ละเดือน</p>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              inputMode="numeric"
              value={fmtInput(goal)}
              onChange={e => setGoal(onlyDigits(e.target.value))}
              placeholder="เช่น 10,000"
              className="flex-1 px-3 py-2.5 rounded-xl border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <span className="text-blue-900/50 text-sm">บาท</span>
          </div>
          {Number(goal) > 0 && (
            <p className={`text-sm font-medium ${remaining >= Number(goal) ? 'text-green-600' : 'text-amber-600'}`}>
              {remaining >= Number(goal)
                ? `🎉 เงินคงเหลือถึงเป้าแล้ว (เหลือ ${baht(remaining)} บาท)`
                : `ยังขาดอีก ${baht(Number(goal) - remaining)} บาท จะถึงเป้า`}
            </p>
          )}
        </section>

        {/* Note */}
        <section className="bg-green-50 rounded-2xl border border-green-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote size={18} className="text-green-500" />
            <h2 className="font-bold text-green-900">บันทึกย่อ</h2>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="จดบันทึกอะไรได้ที่นี่..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-green-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </section>
      </div>

      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5 pt-1">
        <LockKeyhole size={12} /> ข้อมูลถูกเข้ารหัสด้วย PIN และเก็บไว้ในเครื่องนี้เท่านั้น
      </p>
    </div>
  )
}

function SummaryRow({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value} <span className="text-sm font-medium text-gray-400">บาท</span></p>
      </div>
      <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">{icon}</div>
    </div>
  )
}

/** 4-digit PIN gate — handles both first-time setup (enter + confirm) and unlock. */
function PinGate({
  variant,
  onSubmit,
  onForget,
}: {
  variant: 'setup' | 'unlock'
  onSubmit: (pin: string) => Promise<boolean> | Promise<void> | void
  onForget?: () => void
}) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [phase, setPhase] = useState<'enter' | 'confirm'>('enter')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isConfirm = variant === 'setup' && phase === 'confirm'
  const current = isConfirm ? confirmPin : pin

  useEffect(() => { inputRef.current?.focus() }, [phase])

  async function submit(value: string) {
    if (variant === 'setup') {
      if (phase === 'enter') { setPhase('confirm'); setError(''); return }
      if (value !== pin) {
        setError('PIN ไม่ตรงกัน ลองใหม่อีกครั้ง')
        setPin(''); setConfirmPin(''); setPhase('enter')
        return
      }
      setBusy(true)
      await onSubmit(pin) // component unmounts on success
      return
    }
    // unlock
    setBusy(true)
    const ok = await onSubmit(value)
    if (ok === false) {
      setError('PIN ไม่ถูกต้อง ลองอีกครั้ง')
      setPin('')
      setBusy(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  function handleChange(raw: string) {
    if (busy) return
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    if (isConfirm) setConfirmPin(digits)
    else setPin(digits)
    if (error) setError('')
    if (digits.length === 4) setTimeout(() => submit(digits), 130)
  }

  const title = variant === 'unlock'
    ? 'ใส่รหัส PIN เพื่อเปิด'
    : phase === 'enter' ? 'ตั้งรหัส PIN 4 หลัก' : 'ยืนยันรหัส PIN อีกครั้ง'
  const subtitle = variant === 'unlock'
    ? 'หน้านี้ถูกล็อกไว้ — ใส่ PIN ที่ตั้งไว้'
    : phase === 'enter' ? 'ใช้ปลดล็อกหน้านี้ครั้งต่อไป — จำให้ดี ลืมแล้วกู้ข้อมูลไม่ได้' : 'พิมพ์ PIN เดิมอีกครั้งเพื่อยืนยัน'

  return (
    <div className="max-w-sm mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5">
        <LockKeyhole size={30} className="text-white" />
      </div>
      <h1 className="text-lg font-black text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-7 max-w-xs">{subtitle}</p>

      {/* 4 dot boxes over a hidden numeric input */}
      <label className="relative block">
        <div className="flex gap-3 justify-center">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center transition-colors ${
                error ? 'border-red-300 bg-red-50'
                  : current.length === i ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {current.length > i && <span className="w-3 h-3 rounded-full bg-indigo-600" />}
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={current}
          onChange={e => handleChange(e.target.value)}
          maxLength={4}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={title}
        />
      </label>

      <div className="h-6 mt-4">
        {busy
          ? <span className="flex items-center gap-1.5 text-sm text-gray-400"><Loader2 size={14} className="animate-spin" /> กำลังตรวจสอบ...</span>
          : error
            ? <span className="flex items-center gap-1.5 text-sm text-red-500"><AlertTriangle size={14} /> {error}</span>
            : null}
      </div>

      {variant === 'unlock' && onForget && (
        <button
          onClick={onForget}
          className="mt-6 text-xs text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2"
        >
          ลืม PIN? (ล้างข้อมูลแล้วตั้งใหม่)
        </button>
      )}

      <p className="mt-8 text-[11px] text-gray-400 flex items-center gap-1.5 max-w-xs">
        <Shield size={12} className="flex-shrink-0" />
        ข้อมูลถูกเข้ารหัสในเครื่องนี้ คนอื่นที่ไม่รู้ PIN เปิดดูไม่ได้
      </p>
    </div>
  )
}
