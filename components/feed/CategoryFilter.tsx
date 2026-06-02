'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export const PARENT_SUBS: Record<string, string[]> = {
  esports: ['esports', 'dota2', 'cs2', 'mlbb', 'valorant', 'lol'],
  sports:  ['sports', 'football', 'boxing', 'nba'],
}

export const ALL_GROUPS = [
  { slug: 'all',      name: 'ทั้งหมด',  subs: [] },
  { slug: 'politics', name: 'การเมือง', subs: [] },
  { slug: 'crypto',   name: 'Crypto',   subs: [] },
  { slug: 'drama',    name: 'ดราม่า',   subs: [] },
  { slug: 'stock',    name: 'หุ้น',     subs: [] },
  { slug: 'viral',    name: 'ไวรัล',   subs: [] },
  {
    slug: 'esports',
    name: 'eSports',
    subs: [
      { slug: 'dota2',    name: 'Dota 2',   icon: '🔴', image: 'https://cdn.akamai.steamstatic.com/steam/apps/570/capsule_sm_120.jpg' },
      { slug: 'cs2',      name: 'CS2',      icon: '🔫', image: 'https://cdn.akamai.steamstatic.com/steam/apps/730/capsule_sm_120.jpg' },
      { slug: 'valorant', name: 'Valorant', icon: '🎯', image: '/images/valorant.png' },
      { slug: 'lol',      name: 'LoL',      icon: '⚡', image: '/images/lol.png' },
      { slug: 'mlbb',     name: 'MLBB',     icon: '⚔️', image: '/images/mlbb.png' },
    ],
  },
  {
    slug: 'sports',
    name: 'กีฬา',
    subs: [
      { slug: 'football', name: 'ฟุตบอล', icon: '⚽', image: undefined },
      { slug: 'boxing',   name: 'มวย',    icon: '🥊', image: undefined },
      { slug: 'nba',      name: 'NBA',     icon: '🏀', image: undefined },
    ],
  },
]

// ย้อนหา parent จาก sub-slug
export const SUB_TO_PARENT: Record<string, string> = {}
for (const g of ALL_GROUPS) {
  for (const s of g.subs) SUB_TO_PARENT[s.slug] = g.slug
}

interface Props {
  selected: string
  onChange: (slug: string) => void
  hideSubs?: boolean
}

export default function CategoryFilter({ selected, onChange, hideSubs = false }: Props) {
  const [hiddenSlugs, setHiddenSlugs] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('category_visibility')
      .select('slug, hidden')
      .eq('hidden', true)
      .then(({ data }) => {
        if (data) setHiddenSlugs(new Set(data.map(r => r.slug)))
      })
  }, [])

  const GROUPS = ALL_GROUPS.filter(g => !hiddenSlugs.has(g.slug))
  const activeParent = SUB_TO_PARENT[selected] ?? selected
  const activeGroup = GROUPS.find(g => g.slug === activeParent)
  const hasSubs = (activeGroup?.subs?.length ?? 0) > 0

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Row 1 — main categories */}
      <div className="flex gap-1.5 overflow-x-auto px-6 py-2.5 scrollbar-none">
        {GROUPS.map(g => {
          const isActive = g.slug === activeParent
          return (
            <button
              key={g.slug}
              onClick={() => onChange(g.slug)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-900'
              }`}
            >
              {g.name}
              {g.subs.length > 0 && (
                <span className={`text-[10px] ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>▾</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Row 2 — sub-categories (hidden when sidebar is shown) */}
      {!hideSubs && hasSubs && activeGroup && (
        <div className="flex gap-1.5 overflow-x-auto px-6 py-2 scrollbar-none bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => onChange(activeParent)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              selected === activeParent
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            ทั้งหมด
          </button>
          {activeGroup.subs.map(s => (
            <button
              key={s.slug}
              onClick={() => onChange(s.slug)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                selected === s.slug
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {s.image
                ? <img src={s.image} alt={s.name} className="w-4 h-4 rounded object-cover flex-shrink-0" />
                : <span>{s.icon}</span>
              } {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
