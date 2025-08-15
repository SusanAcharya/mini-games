import React, { useEffect, useMemo, useRef, useState } from 'react'

type Player = 'human' | 'bot'

type BattleState = {
  hp: { human: number; bot: number }
  turn: Player
  lastRoll: { human: number | null; bot: number | null }
  stage: 'playing' | 'finished'
  winner: Player | null
}

function rollDie(): number { return 1 + Math.floor(Math.random() * 6) }

function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const ensure = () => {
    if (!ctxRef.current) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      ctxRef.current = new Ctx()
    }
    return ctxRef.current!
  }
  const blip = (f: number, d = 0.08, type: OscillatorType = 'square') => {
    const ctx = ensure(); const t = ctx.currentTime
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = type; o.frequency.setValueAtTime(f, t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    o.connect(g).connect(ctx.destination)
    o.start(t); o.stop(t + d + 0.02)
  }
  const roll = () => { blip(300, 0.06, 'triangle'); setTimeout(() => blip(380, 0.06, 'triangle'), 60) }
  const hit = () => blip(520, 0.12, 'square')
  const crit = () => { blip(700, 0.12, 'square'); setTimeout(()=>blip(900, 0.12, 'square'), 90) }
  const win = () => { blip(500, 0.1, 'sine'); setTimeout(()=>blip(700, 0.12, 'sine'), 100) }
  const lose = () => blip(160, 0.2, 'sawtooth')
  return { roll, hit, crit, win, lose }
}

export function DiceShootout(): JSX.Element {
  const [state, setState] = useState<BattleState>({
    hp: { human: 50, bot: 50 },
    turn: 'human',
    lastRoll: { human: null, bot: null },
    stage: 'playing',
    winner: null,
  })
  const { roll, hit, crit, win, lose } = useAudio()

  const status = useMemo(() => {
    if (state.stage === 'finished') return state.winner === 'human' ? 'You win! +25 points' : 'You lost.'
    return state.turn === 'human' ? 'Your turn — Roll' : 'Bot is rolling…'
  }, [state])

  const applyDamage = (attacker: Player, amount: number) => {
    setState(prev => {
      const target: Player = attacker === 'human' ? 'bot' : 'human'
      const hp = { ...prev.hp }
      hp[target] = Math.max(0, hp[target] - amount)
      const winner: Player | null = hp[target] <= 0 ? attacker : null
      return { ...prev, hp, stage: winner ? 'finished' : prev.stage, winner: winner ?? prev.winner }
    })
  }

  const doHumanRoll = () => {
    if (state.stage !== 'playing' || state.turn !== 'human') return
    roll()
    const val = rollDie()
    const dmg = val === 6 ? val * 2 : val
    setState(prev => ({ ...prev, lastRoll: { ...prev.lastRoll, human: val } }))
    setTimeout(() => { (val === 6 ? crit() : hit()); applyDamage('human', dmg); setState(p => ({ ...p, turn: p.winner ? p.turn : 'bot' })) }, 150)
  }

  useEffect(() => {
    if (state.stage !== 'playing') return
    if (state.turn !== 'bot') return
    const timer = setTimeout(() => {
      roll()
      const val = rollDie()
      const dmg = val === 6 ? val * 2 : val
      setState(prev => ({ ...prev, lastRoll: { ...prev.lastRoll, bot: val } }))
      setTimeout(() => { (val === 6 ? crit() : hit()); applyDamage('bot', dmg); setState(p => ({ ...p, turn: p.winner ? p.turn : 'human' })) }, 150)
    }, 650)
    return () => clearTimeout(timer)
  }, [state.turn, state.stage])

  useEffect(() => {
    if (state.stage !== 'finished') return
    state.winner === 'human' ? win() : lose()
  }, [state.stage])

  const reset = () => setState({ hp: { human: 50, bot: 50 }, turn: 'human', lastRoll: { human: null, bot: null }, stage: 'playing', winner: null })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
      <div>
        <Panel title="Dice Shootout">
          <div style={{ display: 'grid', gap: 8 }}>
            <div>{status}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={doHumanRoll} disabled={state.stage!=='playing' || state.turn!=='human'} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #2d3550', background: state.turn==='human' && state.stage==='playing' ? 'transparent' : '#1a1f33', color: '#eaeaf0' }}>Roll</button>
              <button onClick={reset} style={{ padding: '10px 14px', borderRadius: 10, border: '1px dashed #2d3550', background: 'transparent', color: '#9aa' }}>Reset</button>
            </div>
          </div>
        </Panel>
      </div>
      <div>
        <Panel title="Arena">
          <div style={{ display: 'grid', gap: 14 }}>
            <Fighter name="You" hp={state.hp.human} lastRoll={state.lastRoll.human} active={state.turn==='human' && state.stage==='playing'} />
            <Fighter name="Bot" hp={state.hp.bot} lastRoll={state.lastRoll.bot} active={state.turn==='bot' && state.stage==='playing'} />
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #121525 0%, #0e1017 100%)',
      border: '1px solid #24283a',
      borderRadius: 14,
      padding: 16,
      boxShadow: '0 12px 24px rgba(0,0,0,0.25) inset, 0 6px 24px rgba(2,10,30,0.35)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function Fighter({ name, hp, lastRoll, active }: { name: string; hp: number; lastRoll: number | null; active: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!ref.current || lastRoll == null) return
    ref.current.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.05)' },
      { transform: 'scale(1)' },
    ], { duration: 240, easing: 'ease-in-out' })
  }, [lastRoll])

  const pct = Math.max(0, Math.min(100, Math.round(hp / 50 * 100)))
  return (
    <div ref={ref} style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700 }}>{name}</div>
        <div style={{ color: '#aab' }}>{lastRoll != null ? `Rolled: ${lastRoll}${lastRoll===6 ? ' (CRIT)' : ''}` : ''}</div>
      </div>
      <div style={{ height: 14, background: '#1a1f33', borderRadius: 999, border: '1px solid #2a2f45', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct>50 ? '#44d19a' : pct>20 ? '#f7c948' : '#ff6b6b', transition: 'width 220ms ease' }} />
      </div>
      <div style={{ color: '#eaeaf0' }}>{hp} HP</div>
      {active && <div style={{ color: '#8aa1ff' }}>Your move…</div>}
    </div>
  )
}


