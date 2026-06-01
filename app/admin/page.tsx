'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, HelpCircle, TrendingUp, CheckCircle2, Eye } from 'lucide-react'

interface Stats {
  totalUsers: number
  newUsersToday: number
  newUsersWeek: number
  totalQuestions: number
  pendingQuestions: number
  openQuestions: number
  resolvedQuestions: number
  newUsersPerDay: { date: string; count: number }[]
  visitorSessionsToday: number
  visitorSessionsWeek: number
  pageViewsToday: number
  topPages: { path: string; count: number }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekISO = weekAgo.toISOString()

      const [usersRes, questionsRes, recentRes, visitorTodayRes, visitorWeekRes, pvTodayRes, topPagesRes] = await Promise.all([
        supabase.from('users').select('id, created_at', { count: 'exact' }),
        supabase.from('questions').select('id, status', { count: 'exact' }),
        supabase.from('users').select('created_at').gte('created_at', weekISO).order('created_at'),
        supabase.from('visitor_sessions').select('id', { count: 'exact' }).gte('first_seen', todayISO),
        supabase.from('visitor_sessions').select('id', { count: 'exact' }).gte('first_seen', weekISO),
        supabase.from('page_views').select('id', { count: 'exact' }).gte('viewed_at', todayISO),
        supabase.from('page_views').select('path').gte('viewed_at', weekISO),
      ])

      const allUsers = (usersRes.data ?? []) as { id: string; created_at: string }[]
      const allQuestions = (questionsRes.data ?? []) as { id: string; status: string }[]
      const recentUsers = (recentRes.data ?? []) as { created_at: string }[]

      // Aggregate top pages from last 7 days
      const pathCounts: Record<string, number> = {}
      for (const { path } of (topPagesRes.data ?? []) as { path: string }[]) {
        pathCounts[path] = (pathCounts[path] ?? 0) + 1
      }
      const topPages = Object.entries(pathCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([path, count]) => ({ path, count }))

      // count by day for last 7 days
      const dayMap: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        dayMap[d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })] = 0
      }
      for (const u of recentUsers) {
        const d = new Date(u.created_at)
        const key = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
        if (key in dayMap) dayMap[key]++
      }

      setStats({
        totalUsers: usersRes.count ?? allUsers.length,
        newUsersToday: allUsers.filter(u => u.created_at >= todayISO).length,
        newUsersWeek: recentUsers.length,
        totalQuestions: questionsRes.count ?? allQuestions.length,
        pendingQuestions: allQuestions.filter(q => q.status === 'pending').length,
        openQuestions: allQuestions.filter(q => q.status === 'open').length,
        resolvedQuestions: allQuestions.filter(q => q.status === 'resolved').length,
        newUsersPerDay: Object.entries(dayMap).map(([date, count]) => ({ date, count })),
        visitorSessionsToday: visitorTodayRes.count ?? 0,
        visitorSessionsWeek: visitorWeekRes.count ?? 0,
        pageViewsToday: pvTodayRes.count ?? 0,
        topPages,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  const maxDay = Math.max(...stats.newUsersPerDay.map(d => d.count), 1)

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">ภาพรวมแอป ภาวนา</p>
      </div>

      {/* Visitor stats */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Eye size={13} /> ผู้เยี่ยมชม (ทั้ง login และไม่ login)
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Sessions วันนี้" value={stats.visitorSessionsToday} icon="👁️" highlight={stats.visitorSessionsToday > 0} />
          <StatCard label="Sessions 7 วัน" value={stats.visitorSessionsWeek} icon="📊" />
          <StatCard label="Page views วันนี้" value={stats.pageViewsToday} icon="📄" />
        </div>
        {stats.topPages.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">หน้ายอดนิยม (7 วัน)</p>
            <div className="space-y-2">
              {stats.topPages.map(({ path, count }) => (
                <div key={path} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-mono truncate max-w-xs">{path}</span>
                  <span className="font-semibold text-gray-900 ml-4 shrink-0">{count.toLocaleString()} views</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* User stats */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Users size={13} /> ผู้ใช้
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="ผู้ใช้ทั้งหมด" value={stats.totalUsers} icon="👥" />
          <StatCard label="ใหม่วันนี้" value={stats.newUsersToday} icon="🆕" highlight={stats.newUsersToday > 0} />
          <StatCard label="ใหม่ 7 วัน" value={stats.newUsersWeek} icon="📈" />
        </div>
      </section>

      {/* User per day chart */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp size={15} /> User ใหม่รายวัน (7 วันล่าสุด)
        </p>
        <div className="flex items-end gap-2 h-28">
          {stats.newUsersPerDay.map(({ date, count }) => (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-gray-700">{count > 0 ? count : ''}</span>
              <div
                className="w-full rounded-t-lg bg-gray-900 transition-all"
                style={{ height: `${Math.max((count / maxDay) * 80, count > 0 ? 4 : 2)}px` }}
              />
              <span className="text-[10px] text-gray-400 text-center leading-tight">{date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Question stats */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <HelpCircle size={13} /> คำถาม
        </h2>
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="ทั้งหมด" value={stats.totalQuestions} icon="📋" />
          <StatCard label="รออนุมัติ" value={stats.pendingQuestions} icon="⏳" highlight={stats.pendingQuestions > 0} />
          <StatCard label="เปิดรับ" value={stats.openQuestions} icon="🟢" />
          <StatCard label="เฉลยแล้ว" value={stats.resolvedQuestions} icon="✅" />
        </div>
      </section>

      {stats.pendingQuestions > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800">มีคำถามรออนุมัติ {stats.pendingQuestions} รายการ</p>
              <p className="text-xs text-amber-600">ไปที่หน้าคำถามเพื่ออนุมัติหรือปฏิเสธ</p>
            </div>
          </div>
          <a
            href="/admin/questions"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            ดูคำถาม
          </a>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, highlight }: {
  label: string
  value: number
  icon: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 border ${highlight ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-100'}`}>
      <p className="text-2xl mb-1">{icon}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>{value.toLocaleString()}</p>
      <p className={`text-xs mt-0.5 ${highlight ? 'text-gray-300' : 'text-gray-400'}`}>{label}</p>
    </div>
  )
}
