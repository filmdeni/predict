import { getPoolShares } from '@/lib/game/odds'
import { PointIcon } from '@/components/PointBadge'
import type { QuestionOption } from '@/lib/supabase/types'

interface Props {
  options: QuestionOption[]
  pool: Record<string, number>
  totalPool: number
}

const OPTION_COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500']

export default function PredictionBar({ options, pool, totalPool }: Props) {
  const shares = getPoolShares(pool)

  return (
    <div className="space-y-2">
      {/* stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {options.map((opt, i) => (
          <div
            key={opt.id}
            className={`${OPTION_COLORS[i % OPTION_COLORS.length]} transition-all duration-500`}
            style={{ width: `${shares[opt.id] ?? 0}%` }}
          />
        ))}
      </div>

      {/* labels */}
      <div className="flex justify-between">
        {options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${OPTION_COLORS[i % OPTION_COLORS.length]}`} />
            <span className="text-xs text-gray-400">{opt.label}</span>
            <span className="text-xs font-semibold text-white">
              {(shares[opt.id] ?? 0).toFixed(0)}%
            </span>
          </div>
        ))}
        {totalPool > 0 && (
          <span className="text-xs text-gray-500 flex items-center gap-1"><PointIcon size={14} />{totalPool.toLocaleString()} คะแนน</span>
        )}
      </div>
    </div>
  )
}
