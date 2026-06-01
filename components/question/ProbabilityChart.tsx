'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { getPoolShares } from '@/lib/game/odds'

type Option = { id: string; label: string; icon_url?: string | null }

type Snapshot = {
  pool: Record<string, number>
  recorded_at: string
}

type ChartPoint = Record<string, string | number>

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#eab308', '#a855f7', '#ef4444', '#06b6d4', '#ec4899']

// Custom dot — renders only on the last data point with a pulsing ring
function LiveDot(props: {
  cx?: number; cy?: number; index?: number; dataLength: number; color: string
}) {
  const { cx, cy, index, dataLength, color } = props
  if (index !== dataLength - 1 || cx == null || cy == null) return null
  return (
    <g>
      {/* outer pulse ring */}
      <circle cx={cx} cy={cy} r={4} fill={color} opacity={0}>
        <animate attributeName="r" values="4;10;4" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="1.6s" repeatCount="indefinite" />
      </circle>
      {/* mid ring */}
      <circle cx={cx} cy={cy} r={4} fill={color} opacity={0}>
        <animate attributeName="r" values="4;7;4" dur="1.6s" begin="0.3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="1.6s" begin="0.3s" repeatCount="indefinite" />
      </circle>
      {/* solid dot */}
      <circle cx={cx} cy={cy} r={5} fill={color} />
      <circle cx={cx} cy={cy} r={2.5} fill="white" />
    </g>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${d.toLocaleString('th-TH', { month: 'short' })}`
}

// Downsample to at most maxPoints evenly spaced
function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr
  const step = (arr.length - 1) / (maxPoints - 1)
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.round(i * step)])
}

export default function ProbabilityChart({
  questionId,
  options,
  currentPool,
}: {
  questionId: string
  options: Option[]
  currentPool: Record<string, number>
}) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: snaps } = await supabase
        .from('pool_snapshots')
        .select('pool, recorded_at')
        .eq('question_id', questionId)
        .order('recorded_at', { ascending: true })

      const raw: Snapshot[] = (snaps ?? []).map(s => ({ ...s, pool: s.pool as Record<string, number> }))
      const sampled = downsample(raw, 60)

      const points: ChartPoint[] = sampled.map(s => {
        const shares = getPoolShares(s.pool)
        const point: ChartPoint = { date: formatDate(s.recorded_at) }
        for (const opt of options) {
          point[opt.id] = Math.round(shares[opt.id] ?? 0)
        }
        return point
      })

      // Append current pool as the live final point
      const currentShares = getPoolShares(currentPool)
      const nowLabel = formatDate(new Date().toISOString())
      const lastPoint: ChartPoint = { date: nowLabel }
      for (const opt of options) {
        lastPoint[opt.id] = Math.round(currentShares[opt.id] ?? 0)
      }
      // Only append if different date or no snapshots
      const last = points[points.length - 1]
      if (!last || last.date !== nowLabel || options.some(o => last[o.id] !== lastPoint[o.id])) {
        points.push(lastPoint)
      }

      setData(points)
      setLoading(false)
    }
    load()
  }, [questionId])

  if (loading) {
    return <div className="h-48 rounded-xl bg-gray-100 animate-pulse" />
  }

  if (data.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 text-sm">
        ยังไม่มีข้อมูลประวัติความน่าจะเป็น
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
      <p className="text-xs text-gray-500 font-medium">ความน่าจะเป็น</p>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map((opt, i) => (
          <span key={opt.id} className="flex items-center gap-1.5 text-xs text-gray-600">
            {opt.icon_url ? (
              <img
                src={opt.icon_url}
                alt=""
                className="w-5 h-5 rounded-full object-cover flex-shrink-0 ring-1.5"
                style={{ outline: `2px solid ${COLORS[i % COLORS.length]}` }}
              />
            ) : (
              <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            )}
            {opt.label}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ color: '#374151' }}
            formatter={(v, name) => {
              const opt = options.find(o => o.id === String(name))
              return [`${v}%`, opt?.label ?? String(name)]
            }}
          />
          {options.map((opt, i) => (
            <Line
              key={opt.id}
              type="monotone"
              dataKey={opt.id}
              stroke={COLORS[i % COLORS.length]}
              dot={(dotProps) => (
                <LiveDot
                  key={`dot-${opt.id}-${dotProps.index}`}
                  {...dotProps}
                  dataLength={data.length}
                  color={COLORS[i % COLORS.length]}
                />
              )}
              activeDot={{ r: 4, fill: COLORS[i % COLORS.length] }}
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
