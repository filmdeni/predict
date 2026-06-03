'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Globe, Landmark, TrendingUp, Star, Gamepad2, Trophy, Bitcoin } from 'lucide-react'

export const PARENT_SUBS: Record<string, string[]> = {
  esports: ['esports', 'dota2', 'cs2', 'mlbb', 'valorant', 'lol', 'pubg', 'rov'],
  sports:  ['sports', 'football', 'boxing', 'nba', 'mlb'],
}

export const SIDEBAR_PARENTS = new Set(['esports', 'sports'])

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all:      <Globe     size={14} strokeWidth={1.75} />,
  politics: <Landmark  size={14} strokeWidth={1.75} />,
  crypto:   <Bitcoin   size={14} strokeWidth={1.75} />,
  stock:    <TrendingUp size={14} strokeWidth={1.75} />,
  viral:    <Star      size={14} strokeWidth={1.75} />,
  esports:  <Gamepad2  size={14} strokeWidth={1.75} />,
  sports:   <Trophy    size={14} strokeWidth={1.75} />,
}

export const ALL_GROUPS = [
  { slug: 'all',      name: 'ทั้งหมด',  subs: [] },
  {
    slug: 'esports',
    name: 'เกม',
    subs: [
      { slug: 'dota2',         name: 'Dota 2',       icon: '🔴', image: 'https://cdn.akamai.steamstatic.com/steam/apps/570/capsule_sm_120.jpg' },
      { slug: 'cs2',           name: 'CS2',           icon: '🔫', image: 'https://cdn.akamai.steamstatic.com/steam/apps/730/capsule_sm_120.jpg' },
      { slug: 'valorant',      name: 'Valorant',      icon: '🎯', image: '/images/valorant.png' },
      { slug: 'lol',           name: 'LoL',           icon: '⚡', image: '/images/lol.png' },
      { slug: 'mlbb',          name: 'MLBB',          icon: '⚔️', image: '/images/mlbb.png' },
      { slug: 'pubg',          name: 'PUBG',          icon: '🎯', image: '/images/pubg.jpg' },
      { slug: 'rov',           name: 'RoV',           icon: '⚔️', image: undefined },
    ],
  },
  {
    slug: 'sports',
    name: 'กีฬา',
    subs: [
      { slug: 'football', name: 'ฟุตบอล', icon: '⚽', image: undefined },
      { slug: 'boxing',   name: 'มวย',    icon: '🥊', image: undefined },
      { slug: 'nba',      name: 'NBA',     icon: '🏀', image: undefined },
      { slug: 'mlb',      name: 'MLB',     icon: '⚾', image: undefined },
    ],
  },
  { slug: 'politics', name: 'การเมือง', subs: [] },
  { slug: 'crypto',   name: 'Crypto',   subs: [] },
  { slug: 'stock',    name: 'หุ้น',     subs: [] },
  { slug: 'viral',    name: 'ไวรัล',   subs: [] },
]

export const SUB_TO_PARENT: Record<string, string> = {}
for (const g of ALL_GROUPS) {
  for (const s of g.subs) SUB_TO_PARENT[s.slug] = g.slug
}

interface Props {
  selected: string
  onChange: (slug: string) => void
  liveOnly?: boolean
  onLiveToggle?: (v: boolean) => void
}

export default function CategoryFilter({ selected, onChange, liveOnly, onLiveToggle }: Props) {
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
  const hasSubs = (activeGroup?.subs.length ?? 0) > 0

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Row 1 — main categories */}
      <div className="flex gap-1.5 overflow-x-auto px-6 py-2.5 scrollbar-none">
        {GROUPS.map(g => {
          const isActive = g.slug === activeParent && !liveOnly
          return (
            <button
              key={g.slug}
              onClick={() => {
                onLiveToggle?.(false)
                if (g.subs.length > 0) {
                  onChange(g.subs[0].slug)
                } else {
                  onChange(g.slug)
                }
              }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-900'
              }`}
            >
              {CATEGORY_ICONS[g.slug]}
              {g.name}
              {g.subs.length > 0 && (
                <span className="text-[10px] opacity-50">▾</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Row 2 — sub-categories (mobile only for esports/sports; desktop uses sidebar) */}
      {hasSubs && activeGroup && (
        <div className={`flex gap-1.5 overflow-x-auto px-6 py-2 scrollbar-none bg-gray-50 border-t border-gray-100${SIDEBAR_PARENTS.has(activeParent) ? ' md:hidden' : ''}`}>
          <button
            onClick={() => { onChange(activeParent); onLiveToggle?.(false) }}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              selected === activeParent && !liveOnly
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            ทั้งหมด
          </button>
{activeGroup.subs.map(s => (
            <button
              key={s.slug}
              onClick={() => { onChange(s.slug); onLiveToggle?.(false) }}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                selected === s.slug && !liveOnly
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
