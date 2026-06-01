'use client'

export type CardStyle = 'auto' | 'gauge' | 'bars' | 'rows'

interface Props {
  value: CardStyle
  onChange: (v: CardStyle) => void
}

function GaugePreview() {
  const W = 56, stroke = 6, r = (W - stroke) / 2
  const cx = W / 2, cy = W / 2
  const startDeg = 145, endDeg = 395
  function pt(deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  function arc(a: number, b: number) {
    const s = pt(a), e = pt(b)
    return `M${s.x} ${s.y} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${e.x} ${e.y}`
  }
  const fillEnd = startDeg + (endDeg - startDeg) * 0.65
  return (
    <div className="flex items-center justify-between px-2 w-full">
      <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`}>
        <path d={arc(startDeg, endDeg)} fill="none" stroke="#e5e7eb" strokeWidth={stroke} strokeLinecap="round" />
        <path d={arc(startDeg, fillEnd)} fill="none" stroke="#f59e0b" strokeWidth={stroke} strokeLinecap="round" />
        <text x={cx} y={cy - 1} textAnchor="middle" fontSize="10" fontWeight="700" fill="#111827">65%</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="#9ca3af">โอกาส</text>
      </svg>
      <div className="flex flex-col gap-1">
        <div className="px-2 py-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold rounded-md">ใช่</div>
        <div className="px-2 py-1 bg-red-50 border border-red-200 text-red-600 text-[10px] font-semibold rounded-md">ไม่ใช่</div>
      </div>
    </div>
  )
}

function BarsPreview() {
  const bars = [
    { label: 'ตัวเลือก 1', pct: 52, color: 'bg-green-400' },
    { label: 'ตัวเลือก 2', pct: 31, color: 'bg-blue-400' },
    { label: 'ตัวเลือก 3', pct: 17, color: 'bg-orange-400' },
  ]
  return (
    <div className="space-y-1.5 px-1 w-full">
      {bars.map(b => (
        <div key={b.label} className="space-y-0.5">
          <div className="flex justify-between">
            <span className="text-[9px] text-gray-500">{b.label}</span>
            <span className="text-[9px] font-bold text-gray-700">{b.pct}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full">
            <div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function RowsPreview() {
  const rows = [
    { label: 'ทีม A', pct: 84, color: 'bg-green-400' },
    { label: 'ทีม B', pct: 16, color: 'bg-blue-400' },
  ]
  return (
    <div className="space-y-1 px-1 w-full">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-gray-200 flex-shrink-0" />
          <span className="text-[9px] text-gray-600 flex-1 truncate">{r.label}</span>
          <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
            <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
          </div>
          <span className="text-[9px] font-bold text-gray-700 w-5 text-right flex-shrink-0">{r.pct}%</span>
        </div>
      ))}
      <div className="flex gap-1 pt-0.5">
        <div className="flex-1 py-0.5 bg-gray-100 rounded text-[9px] text-center text-gray-500">ทีม A</div>
        <div className="flex-1 py-0.5 bg-gray-100 rounded text-[9px] text-center text-gray-500">ทีม B</div>
      </div>
    </div>
  )
}

const OPTIONS: { value: CardStyle; label: string; sub: string; preview: React.ReactNode }[] = [
  {
    value: 'auto',
    label: 'อัตโนมัติ',
    sub: 'gauge 2 ตัวเลือก / bars อื่นๆ',
    preview: <GaugePreview />,
  },
  {
    value: 'gauge',
    label: 'Gauge',
    sub: 'วงกลม % + ปุ่มตัวเลือก',
    preview: <GaugePreview />,
  },
  {
    value: 'bars',
    label: 'Bars',
    sub: 'progress bar แต่ละตัวเลือก',
    preview: <BarsPreview />,
  },
  {
    value: 'rows',
    label: 'Rows',
    sub: 'icon + ชื่อ + % เป็น list',
    preview: <RowsPreview />,
  },
]

export default function CardStylePicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-2">สไตล์การ์ด</label>
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border p-2 text-left transition-all space-y-2 ${
              value === opt.value
                ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="bg-white border border-gray-100 rounded-lg py-2 min-h-[72px] flex items-center justify-center">
              {opt.preview}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800 leading-tight">{opt.label}</p>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{opt.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
