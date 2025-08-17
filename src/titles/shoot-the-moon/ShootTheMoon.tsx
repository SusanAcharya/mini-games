import React, { useMemo, useRef, useState } from 'react'

type Phase = 'comeout' | 'point' | 'finished'

type GameState = {
  phase: Phase
  point: number | null
  last: { d1: number; d2: number; sum: number } | null
  winner: 'player' | 'bot' | null
  rolling: boolean
  showHelp: boolean
}

function rollDie(): number { return 1 + Math.floor(Math.random() * 6) }

function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const ensure = () => { if (!ctxRef.current) { const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext; ctxRef.current = new Ctx() } return ctxRef.current! }
  const blip = (f: number, d = 0.08, type: OscillatorType = 'square') => { const ctx=ensure(); const t=ctx.currentTime; const o=ctx.createOscillator(); const g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.2,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+d); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t+d+0.02) }
  const roll = () => { blip(260,0.06,'triangle'); setTimeout(()=>blip(320,0.06,'triangle'),50); setTimeout(()=>blip(380,0.06,'triangle'),100) }
  const win = () => { blip(520,0.1,'square'); setTimeout(()=>blip(720,0.12,'square'),100) }
  const lose = () => blip(180,0.18,'sawtooth')
  return { roll, win, lose }
}

export function ShootTheMoon(): JSX.Element {
  const [game, setGame] = useState<GameState>({ phase: 'comeout', point: null, last: null, winner: null, rolling: false, showHelp: false })
  const { roll, win, lose } = useAudio()

  const status = useMemo(() => {
    if (game.phase === 'comeout') return 'Come Out Roll — press Roll'
    if (game.phase === 'point') return `Point is ${game.point}. Roll point again to win; 7 loses.`
    if (game.phase === 'finished') return game.winner === 'player' ? 'You win!' : 'You lose.'
    return ''
  }, [game])

  const doRoll = () => {
    if (game.phase === 'finished' || game.rolling) return
    setGame(prev => ({ ...prev, rolling: true }))
    roll()
    setTimeout(() => {
      const d1 = rollDie(); const d2 = rollDie(); const sum = d1 + d2
      setGame(prev => {
        if (prev.phase === 'comeout') {
          if (sum === 7 || sum === 11) { win(); return { ...prev, last: { d1, d2, sum }, phase: 'finished', winner: 'player', rolling: false } }
          if (sum === 2 || sum === 3 || sum === 12) { lose(); return { ...prev, last: { d1, d2, sum }, phase: 'finished', winner: 'bot', rolling: false } }
          return { ...prev, last: { d1, d2, sum }, phase: 'point', point: sum, rolling: false }
        }
        if (prev.phase === 'point') {
          if (sum === prev.point) { win(); return { ...prev, last: { d1, d2, sum }, phase: 'finished', winner: 'player', rolling: false } }
          if (sum === 7) { lose(); return { ...prev, last: { d1, d2, sum }, phase: 'finished', winner: 'bot', rolling: false } }
          return { ...prev, last: { d1, d2, sum }, rolling: false }
        }
        return prev
      })
    }, 300)
  }

  const reset = () => setGame({ phase: 'comeout', point: null, last: null, winner: null, rolling: false, showHelp: false })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
      <div>
        <Panel title="Shoot the Moon">
          <div style={{ display: 'grid', gap: 8 }}>
            <div>{status}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={doRoll} disabled={game.phase==='finished' || game.rolling} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: (game.phase!=='finished' && !game.rolling) ? 'transparent' : '#1a1f33', color: '#eaeaf0' }}>Roll</button>
              <button onClick={reset} style={{ padding: '8px 10px', borderRadius: 10, border: '1px dashed #2d3550', background: 'transparent', color: '#aab' }}>New Round</button>
              <button onClick={() => setGame(p => ({ ...p, showHelp: true }))} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }}>?</button>
            </div>
          </div>
        </Panel>
      </div>
      <div>
        <Panel title="Table">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Dice d1={game.last?.d1 ?? 1} d2={game.last?.d2 ?? 1} rolling={game.rolling} />
              <div style={{ color: '#aab' }}>Sum: <strong>{game.last?.sum ?? '-'}</strong></div>
            </div>
            <div>Point: <strong>{game.point ?? '-'}</strong></div>
          </div>
        </Panel>
      </div>
      {game.showHelp && (
        <HelpModal onClose={() => setGame(p => ({ ...p, showHelp: false }))} />
      )}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'linear-gradient(180deg, #121525 0%, #0e1017 100%)', border: '1px solid #24283a', borderRadius: 14, padding: 16, boxShadow: '0 12px 24px rgba(0,0,0,0.25) inset, 0 6px 24px rgba(2,10,30,0.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function Dice({ d1, d2, rolling }: { d1: number; d2: number; rolling: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null)
  if (rolling && ref.current) {
    ref.current.animate([
      { transform: 'translateX(0px) rotate(0deg)' },
      { transform: 'translateX(-4px) rotate(-3deg)' },
      { transform: 'translateX(4px) rotate(3deg)' },
      { transform: 'translateX(0px) rotate(0deg)' },
    ], { duration: 280, easing: 'ease-in-out' })
  }
  return (
    <div ref={ref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Die pip={d1} />
      <Die pip={d2} />
    </div>
  )
}

function Die({ pip }: { pip: number }) {
  const spots = Array.from({ length: Math.max(1, Math.min(6, pip)) }).map((_, i) => (
    <div key={i} style={{ width: 6, height: 6, background: '#eaeaf0', borderRadius: 999, boxShadow: '0 0 8px rgba(255,255,255,0.6)' }} />
  ))
  return (
    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'radial-gradient(120% 120% at 10% 10%, #2a2f45 0%, #151728 100%)', display: 'grid', placeItems: 'center', border: '1px solid #3a3f59', boxShadow: '0 8px 20px rgba(0,0,0,0.35)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 8px)', gridAutoRows: 8, gap: 4 }}>
        {spots}
      </div>
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <div style={{ width: 520, maxWidth: '90vw', background: '#0e1017', border: '1px solid #24283a', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>How to Play — Shoot the Moon</div>
          <button onClick={onClose} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }}>Close</button>
        </div>
        <div style={{ marginTop: 12, color: '#c7c9d9', fontSize: 14, lineHeight: 1.5 }}>
          <p>Come Out Roll:</p>
          <ul>
            <li>Roll 7 or 11 — instant win.</li>
            <li>Roll 2, 3, or 12 — instant loss.</li>
            <li>Roll 4, 5, 6, 8, 9, or 10 — that number becomes the point.</li>
          </ul>
          <p>Point Phase:</p>
          <ul>
            <li>Keep rolling until you roll the point again (win) or roll a 7 (loss).</li>
            <li>The bot is passive and wins only when you lose.</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            To play this game in arcade, you'd need to bet your points (at least 50). You will pay for 2× your betted points.
          </p>
        </div>
      </div>
    </div>
  )
}


