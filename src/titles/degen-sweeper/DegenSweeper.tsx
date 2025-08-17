import React, { useMemo, useRef, useState } from 'react'

type Cell = { row: number; col: number }
type Tile = { pos: Cell; bomb: boolean; revealed: boolean }

const SIZE = 4
const BOMBS = 4

function keyOf(c: Cell) { return `${c.row},${c.col}` }

function pick(n: number): Set<string> {
  const set = new Set<string>()
  while (set.size < n) {
    const r = Math.floor(Math.random()*SIZE)
    const c = Math.floor(Math.random()*SIZE)
    set.add(`${r},${c}`)
  }
  return set
}

function gen(): Tile[] {
  const bombs = pick(BOMBS)
  const tiles: Tile[] = []
  for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
    const pos = { row: r, col: c }
    tiles.push({ pos, bomb: bombs.has(keyOf(pos)), revealed: false })
  }
  return tiles
}

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
  const reveal = () => blip(360, 0.09, 'triangle')
  const boom = () => { blip(140, 0.2, 'sawtooth'); setTimeout(()=>blip(90, 0.22, 'sine'), 120) }
  const win = () => { blip(500, 0.1, 'square'); setTimeout(()=>blip(700, 0.12, 'square'), 100) }
  return { reveal, boom, win }
}

export function DegenSweeper(): JSX.Element {
  const [tiles, setTiles] = useState<Tile[]>(() => gen())
  const [points, setPoints] = useState(0)
  const [status, setStatus] = useState<'playing' | 'lost' | 'won'>('playing')
  const [undoLeft, setUndoLeft] = useState(1)
  const [pendingBombKey, setPendingBombKey] = useState<string | null>(null)
  const { reveal, boom, win } = useAudio()

  const safeLeft = useMemo(() => tiles.filter(t=>!t.bomb && !t.revealed).length, [tiles])

  const reset = () => { setTiles(gen()); setPoints(0); setStatus('playing'); setUndoLeft(1); setPendingBombKey(null) }

  const onClick = (tile: Tile) => {
    if (status !== 'playing') return
    if (pendingBombKey) return
    if (tile.revealed) return
    setTiles(prev => prev.map(t => (t.pos.row===tile.pos.row && t.pos.col===tile.pos.col ? { ...t, revealed: true } : t)))
    if (tile.bomb) {
      boom()
      const k = keyOf(tile.pos)
      if (undoLeft > 0) {
        setPendingBombKey(k)
      } else {
        setStatus('lost')
        setPoints(0)
      }
      return
    }
    reveal()
    setPoints(p => p + 10)
    setTimeout(() => {
      setTiles(prev => {
        const left = prev.filter(t=>!t.bomb && !t.revealed).length
        if (left === 0) { setStatus('won'); win() }
        return prev
      })
    }, 0)
  }

  const undoBomb = () => {
    if (!pendingBombKey || undoLeft <= 0) return
    setTiles(prev => prev.map(t => (keyOf(t.pos)===pendingBombKey ? { ...t, revealed: false } : t)))
    setPendingBombKey(null)
    setUndoLeft(n => n - 1)
  }

  const acceptLoss = () => {
    if (!pendingBombKey) return
    setPendingBombKey(null)
    setStatus('lost')
    setPoints(0)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
      <div>
        <Panel title="Degen Sweeper">
          <div style={{ display: 'grid', gap: 8 }}>
            <div>Points: <strong>{points}</strong></div>
            <div>Status: {status === 'playing' ? 'Playing' : status === 'won' ? 'Cleared! +500' : 'Boom! 0 points'}</div>
            <div>Safe tiles left: {safeLeft}</div>
            <div>Undo available: {undoLeft}</div>
            {pendingBombKey && status==='playing' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={undoBomb} disabled={undoLeft<=0} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: undoLeft>0 ? 'transparent' : '#1a1f33', color: '#eaeaf0' }}>Undo Bomb</button>
                <button onClick={acceptLoss} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }}>Accept Loss</button>
              </div>
            )}
            <button onClick={reset} style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }}>New Round</button>
          </div>
        </Panel>
      </div>
      <div>
        <Panel title="Grid">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 54px)`, gridAutoRows: 54, gap: 4 }}>
            {tiles.map(t => (
              <div key={keyOf(t.pos)} onClick={() => onClick(t)} style={{
                width: 54, height: 54, borderRadius: 8, border: '1px solid #2a2f45',
                background: t.revealed ? (t.bomb ? '#8b2b2b' : '#172039') : '#121525', display: 'grid', placeItems: 'center', cursor: 'pointer'
              }}>
                {t.revealed && !t.bomb && <span style={{ color: '#9bb1ff', fontWeight: 700 }}>+10</span>}
                {t.revealed && t.bomb && <span style={{ color: '#ff6b6b', fontWeight: 800 }}>X</span>}
              </div>
            ))}
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


