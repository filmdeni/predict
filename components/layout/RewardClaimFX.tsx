'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    __rcfxTrigger?: (sourceEl: Element, amount: number, label?: string) => void
    __rcfxAudio?: AudioContext
  }
}

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!window.__rcfxAudio) window.__rcfxAudio = new AudioContext()
  // resume if suspended (browser autoplay policy)
  if (window.__rcfxAudio.state === 'suspended') window.__rcfxAudio.resume()
  return window.__rcfxAudio
}

function playBurst(ctx: AudioContext) {
  // Quick sparkle — short noise burst with high-pass filter
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = ctx.createBufferSource()
  src.buffer = buf

  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 4000

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.18, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)

  src.connect(hp).connect(gain).connect(ctx.destination)
  src.start()
}

function playOrbHum(ctx: AudioContext, duration: number) {
  // Rising mystical tone — sine sweep
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(320, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + duration)

  const osc2 = ctx.createOscillator()
  osc2.type = 'triangle'
  osc2.frequency.setValueAtTime(480, ctx.currentTime)
  osc2.frequency.exponentialRampToValueAtTime(960, ctx.currentTime + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.05)
  gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + duration - 0.05)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

  osc.connect(gain)
  osc2.connect(gain)
  gain.connect(ctx.destination)
  osc.start(); osc2.start()
  osc.stop(ctx.currentTime + duration)
  osc2.stop(ctx.currentTime + duration)
}

export function triggerBellPing(source: Element | DOMRect) {
  const bellEl = document.getElementById('noti-bell-target')
  if (!bellEl) return
  const bell = bellEl

  const fromRect = source instanceof Element ? source.getBoundingClientRect() : source
  const toRect = bell.getBoundingClientRect()

  const startX = fromRect.left + fromRect.width / 2
  const startY = fromRect.top + fromRect.height / 2
  const endX = toRect.left + toRect.width / 2
  const endY = toRect.top + toRect.height / 2
  const cpX = (startX + endX) / 2
  const cpY = Math.min(startY, endY) - 80

  const orb = document.createElement('div')
  orb.textContent = '🔮'
  orb.style.cssText = `
    position: fixed;
    font-size: 16px;
    line-height: 1;
    pointer-events: none;
    z-index: 9999;
    filter: drop-shadow(0 0 4px rgba(99,102,241,0.8));
  `
  document.body.appendChild(orb)

  const DURATION = 550
  const startTime = performance.now()

  function animate(now: number) {
    const t = Math.min((now - startTime) / DURATION, 1)
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    const x = (1 - e) * (1 - e) * startX + 2 * (1 - e) * e * cpX + e * e * endX
    const y = (1 - e) * (1 - e) * startY + 2 * (1 - e) * e * cpY + e * e * endY
    orb.style.left = `${x - 8}px`
    orb.style.top = `${y - 8}px`
    orb.style.opacity = t > 0.85 ? `${1 - (t - 0.85) / 0.15}` : '1'
    if (t < 1) {
      requestAnimationFrame(animate)
    } else {
      orb.remove()
      window.dispatchEvent(new Event('bell-ping'))
      // shake bell
      bell.classList.remove('rcfx-bell-shake')
      void bell.offsetWidth
      bell.classList.add('rcfx-bell-shake')
      setTimeout(() => bell.classList.remove('rcfx-bell-shake'), 600)
    }
  }
  requestAnimationFrame(animate)
}

export function playPredictionSound() {
  const ctx = getAudioCtx()
  if (!ctx) return

  // Low thud — "lock in" feel
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(180, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.18)
  const g1 = ctx.createGain()
  g1.gain.setValueAtTime(0.25, ctx.currentTime)
  g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
  osc.connect(g1).connect(ctx.destination)
  osc.start(); osc.stop(ctx.currentTime + 0.2)

  // Ascending two-note confirm: ding-ding↑
  const notes = [523, 784] // C5 → G5
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq
    const g = ctx.createGain()
    const t = ctx.currentTime + 0.05 + i * 0.13
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.18, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    o.connect(g).connect(ctx.destination)
    o.start(t); o.stop(t + 0.4)
  })
}

function playLandChime(ctx: AudioContext) {
  // Magical coin chime — stacked harmonics
  const freqs = [880, 1108, 1320, 1760]
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const gain = ctx.createGain()
    const t = ctx.currentTime + i * 0.045
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.22 - i * 0.04, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)

    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.6)
  })
}

export function triggerRewardClaim(sourceEl: Element, amount: number, label?: string) {
  if (typeof window !== 'undefined' && window.__rcfxTrigger) {
    window.__rcfxTrigger(sourceEl, amount, label)
  }
}


export default function RewardClaimFX() {
  useEffect(() => {
    // inject keyframes once
    const styleId = 'rcfx-keyframes'
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style')
      s.id = styleId
      s.textContent = `
        @keyframes rcfx-particle-burst {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
        }
        @keyframes rcfx-label-float {
          0%   { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-48px); opacity: 0; }
        }
        @keyframes rcfx-orb-pulse {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(251,146,60,0.7); }
          50%       { box-shadow: 0 0 20px 6px rgba(251,146,60,0.9); }
        }
        @keyframes rcfx-glint {
          0%   { opacity: 0; transform: translateX(-100%) rotate(30deg); }
          30%  { opacity: 0.8; }
          100% { opacity: 0; transform: translateX(200%) rotate(30deg); }
        }
        @keyframes rcfx-wallet-flash {
          0%   { box-shadow: 0 0 0 0 rgba(251,146,60,0); }
          30%  { box-shadow: 0 0 0 8px rgba(251,146,60,0.5); }
          100% { box-shadow: 0 0 0 16px rgba(251,146,60,0); }
        }
      `
      document.head.appendChild(s)
    }

    function run(sourceEl: Element, amount: number, label?: string) {
      const ctx = getAudioCtx()
      if (ctx) {
        playBurst(ctx)
        playOrbHum(ctx, 0.75)
      }

      const target = document.getElementById('wallet-coin-target')
      const fromRect = sourceEl.getBoundingClientRect()
      const toRect = target?.getBoundingClientRect()

      const startX = fromRect.left + fromRect.width / 2
      const startY = fromRect.top + fromRect.height / 2

      // --- burst particles ---
      const PARTICLE_COUNT = 10
      const particles: HTMLElement[] = []
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2
        const dist = 32 + Math.random() * 28
        const px = Math.cos(angle) * dist
        const py = Math.sin(angle) * dist
        const size = 6 + Math.random() * 6
        const colors = ['#fb923c', '#f59e0b', '#fbbf24', '#f97316', '#fdba74']
        const color = colors[i % colors.length]

        const el = document.createElement('div')
        el.style.cssText = `
          position: fixed;
          left: ${startX - size / 2}px;
          top: ${startY - size / 2}px;
          width: ${size}px; height: ${size}px;
          border-radius: 50%;
          background: ${color};
          pointer-events: none; z-index: 9998;
          --px: ${px}px; --py: ${py}px;
          animation: rcfx-particle-burst 0.5s cubic-bezier(.2,0,.6,1) ${i * 20}ms forwards;
        `
        document.body.appendChild(el)
        particles.push(el)
      }

      // --- floating +N label ---
      const labelText = label ?? `+${amount.toLocaleString()} P`
      const lbl = document.createElement('div')
      lbl.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY - 20}px;
        transform: translateX(-50%);
        font-size: 18px; font-weight: 900;
        color: #f59e0b;
        text-shadow: 0 1px 4px rgba(0,0,0,0.3);
        pointer-events: none; z-index: 9999;
        animation: rcfx-label-float 0.7s cubic-bezier(.2,0,.6,1) 0.1s forwards;
      `
      lbl.textContent = labelText
      document.body.appendChild(lbl)

      // --- glowing orb (curved path via JS RAF) ---
      if (toRect) {
        const endX = toRect.left + toRect.width / 2
        const endY = toRect.top + toRect.height / 2

        // control point for quadratic bezier (arc upward)
        const cpX = (startX + endX) / 2 + (Math.random() * 60 - 30)
        const cpY = Math.min(startY, endY) - 120

        const orb = document.createElement('div')
        orb.style.cssText = `
          position: fixed;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fb923c, #f59e0b);
          box-shadow: 0 0 12px 4px rgba(251,146,60,0.7);
          pointer-events: none; z-index: 9999;
          overflow: hidden;
          animation: rcfx-orb-pulse 0.4s ease-in-out infinite;
        `

        // glint stripe inside orb
        const glint = document.createElement('div')
        glint.style.cssText = `
          position: absolute; inset: 0;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%);
          animation: rcfx-glint 0.8s ease-in-out 0.2s infinite;
        `
        orb.appendChild(glint)

        // P label inside orb
        const orbLabel = document.createElement('span')
        orbLabel.style.cssText = `
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 900; color: white;
        `
        orbLabel.textContent = 'P'
        orb.appendChild(orbLabel)
        document.body.appendChild(orb)

        const DURATION = 750 // ms
        const startTime = performance.now()

        function animateOrb(now: number) {
          const t = Math.min((now - startTime) / DURATION, 1)
          // ease in-out
          const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
          // quadratic bezier
          const x = (1 - e) * (1 - e) * startX + 2 * (1 - e) * e * cpX + e * e * endX
          const y = (1 - e) * (1 - e) * startY + 2 * (1 - e) * e * cpY + e * e * endY
          const scale = 1 - e * 0.4
          orb.style.left = `${x - 13}px`
          orb.style.top = `${y - 13}px`
          orb.style.transform = `scale(${scale})`
          if (t < 1) {
            requestAnimationFrame(animateOrb)
          } else {
            orb.remove()
            if (ctx) playLandChime(ctx)
            // flash wallet target
            if (target) {
              target.style.transition = 'none'
              target.style.animation = 'rcfx-wallet-flash 0.4s ease-out forwards'
              target.classList.add('rcfx-wallet-hit')
              setTimeout(() => {
                target.style.animation = ''
                target.classList.remove('rcfx-wallet-hit')
              }, 500)
            }
          }
        }

        setTimeout(() => requestAnimationFrame(animateOrb), 80)
      }

      // cleanup particles + label
      setTimeout(() => {
        particles.forEach(p => p.remove())
        lbl.remove()
      }, 900)
    }

    window.__rcfxTrigger = run
    return () => { delete window.__rcfxTrigger }
  }, [])

  return null
}

export function RewardClaimDevButtons() {
  const claimRef = useRef<HTMLButtonElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  // show in all envs for manual testing
  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2">
      <button
        ref={claimRef}
        onClick={() => claimRef.current && triggerRewardClaim(claimRef.current, 1240)}
        className="bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg hover:bg-amber-600 transition-colors"
      >
        💰 ทดสอบ Claim FX
      </button>
      <button
        ref={bellRef}
        onClick={() => {
          playPredictionSound()
          if (bellRef.current) {
            const rect = bellRef.current.getBoundingClientRect()
            triggerBellPing(rect)
          }
        }}
        className="bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg hover:bg-indigo-600 transition-colors"
      >
        🔔 ทดสอบ Bell Ping
      </button>
    </div>
  )
}
