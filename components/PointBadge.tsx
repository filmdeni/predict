export function PointIcon({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.56 }}
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-black leading-none flex-shrink-0"
    >
      P
    </span>
  )
}

export function PointAmount({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <PointIcon />
      <span>{amount.toLocaleString()} คะแนน</span>
    </span>
  )
}
