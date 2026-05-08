'use client'

const CATEGORIES = [
  { slug: 'all',      name: 'ทั้งหมด' },
  { slug: 'drama',    name: 'ดราม่า' },
  { slug: 'esports',  name: 'eSports' },
  { slug: 'stock',    name: 'หุ้น' },
  { slug: 'politics', name: 'การเมือง' },
  { slug: 'viral',    name: 'ไวรัล' },
  { slug: 'crypto',   name: 'Crypto' },
]

interface Props {
  selected: string
  onChange: (slug: string) => void
}

export default function CategoryFilter({ selected, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-6 py-3 scrollbar-none border-b border-gray-200 bg-white">
      {CATEGORIES.map(cat => (
        <button
          key={cat.slug}
          onClick={() => onChange(cat.slug)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            selected === cat.slug
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-900'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
