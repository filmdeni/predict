import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PriceItem {
  label: string
  value: string
  change?: number // percent change, optional
  unit: string
}

interface Props {
  items: PriceItem[]
  updatedAt?: string
}

function ChangeIcon({ change }: { change?: number }) {
  if (change == null) return <Minus size={10} className="text-gray-400" />
  if (change > 0) return <TrendingUp size={10} className="text-green-500" />
  if (change < 0) return <TrendingDown size={10} className="text-red-400" />
  return <Minus size={10} className="text-gray-400" />
}

export default function PriceTickerCard({ items, updatedAt }: Props) {
  return (
    <div className="bg-gray-50 rounded-2xl p-3 space-y-1.5">
      <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase px-0.5">ราคาวันนี้</p>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5">
          <span className="text-[11px] text-gray-500 font-medium">{item.label}</span>
          <div className="flex items-center gap-1">
            <ChangeIcon change={item.change} />
            <span className="text-[11px] font-bold text-gray-900">{item.value}</span>
            <span className="text-[9px] text-gray-400">{item.unit}</span>
          </div>
        </div>
      ))}
      {updatedAt && (
        <p className="text-[9px] text-gray-300 text-right px-0.5">อัปเดต {updatedAt}</p>
      )}
    </div>
  )
}
