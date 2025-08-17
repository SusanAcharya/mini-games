import React, { useEffect, useMemo, useRef, useState } from 'react'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'
type Card = { suit: Suit; rank: Rank; id: string }

type HandRank =
  | 'royal_flush' | 'straight_flush' | 'four_kind' | 'full_house' | 'flush'
  | 'straight' | 'three_kind' | 'two_pair' | 'one_pair' | 'high_card'

type Evaluated = {
  rank: HandRank
  points: number
  scoreKey: number[] // tie-breaker lexicographic
  bestFive: Card[]
}

type Phase = 'dealing' | 'swap' | 'reveal' | 'finished'

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS: Rank[] = ['A','K','Q','J','10','9','8','7','6','5','4','3','2']

const RANK_VALUE: Record<Rank, number> = {
  A: 14, K: 13, Q: 12, J: 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
}

const POINTS: Record<HandRank, number> = {
  royal_flush: 100,
  straight_flush: 75,
  four_kind: 50,
  full_house: 40,
  flush: 30,
  straight: 20,
  three_kind: 15,
  two_pair: 10,
  one_pair: 5,
  high_card: 1,
}

function buildDeck(): Card[] {
  const cards: Card[] = []
  for (const s of SUITS) {
    for (const r of RANKS) {
      cards.push({ suit: s, rank: r, id: `${r}${s}` })
    }
  }
  return cards
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}

function evaluateFive(cards: Card[]): Evaluated {
  // helper maps
  const byRank = new Map<number, Card[]>()
  const bySuit = new Map<Suit, Card[]>()
  for (const c of cards) {
    const rv = RANK_VALUE[c.rank]
    byRank.set(rv, [...(byRank.get(rv) || []), c])
    bySuit.set(c.suit, [...(bySuit.get(c.suit) || []), c])
  }
  const values = [...byRank.keys()].sort((a,b) => b-a)

  const isSeq = (): { ok: boolean; high: number } => {
    const uniq = values.slice().sort((a,b)=>b-a)
    // Handle wheel straight A-2-3-4-5
    const wheel = [5,4,3,2,14]
    const sorted = uniq.length === 5 ? uniq : []
    if (sorted.length === 5) {
      const consecutive = sorted.every((v,i) => i===0 || sorted[i-1] === v+1) || sorted.join(',') === wheel.join(',')
      if (consecutive) {
        const high = sorted.join(',') === wheel.join(',') ? 5 : sorted[0]
        return { ok: true, high }
      }
    }
    return { ok: false, high: 0 }
  }

  const isFlush = bySuit.size === 1
  const seq = isSeq()
  if (isFlush && seq.ok && seq.high === 14) {
    return { rank: 'royal_flush', points: POINTS.royal_flush, scoreKey: [10], bestFive: cards }
  }
  if (isFlush && seq.ok) {
    return { rank: 'straight_flush', points: POINTS.straight_flush, scoreKey: [9, seq.high], bestFive: cards }
  }
  // counts by rank
  const counts = [...byRank.entries()].map(([val, cs]) => ({ val, n: cs.length }))
  counts.sort((a,b) => b.n - a.n || b.val - a.val)
  if (counts[0]?.n === 4) {
    return { rank: 'four_kind', points: POINTS.four_kind, scoreKey: [8, counts[0].val, counts[1]?.val || 0], bestFive: cards }
  }
  if (counts[0]?.n === 3 && counts[1]?.n === 2) {
    return { rank: 'full_house', points: POINTS.full_house, scoreKey: [7, counts[0].val, counts[1].val], bestFive: cards }
  }
  if (isFlush) {
    return { rank: 'flush', points: POINTS.flush, scoreKey: [6, ...values], bestFive: cards }
  }
  if (seq.ok) {
    return { rank: 'straight', points: POINTS.straight, scoreKey: [5, seq.high], bestFive: cards }
  }
  if (counts[0]?.n === 3) {
    return { rank: 'three_kind', points: POINTS.three_kind, scoreKey: [4, counts[0].val, ...(counts.slice(1).map(c=>c.val))], bestFive: cards }
  }
  if (counts[0]?.n === 2 && counts[1]?.n === 2) {
    const pairHigh = Math.max(counts[0].val, counts[1].val)
    const pairLow = Math.min(counts[0].val, counts[1].val)
    const kicker = counts.find(c => c.n === 1)?.val || 0
    return { rank: 'two_pair', points: POINTS.two_pair, scoreKey: [3, pairHigh, pairLow, kicker], bestFive: cards }
  }
  if (counts[0]?.n === 2) {
    const kickers = counts.filter(c=>c.n===1).map(c=>c.val)
    return { rank: 'one_pair', points: POINTS.one_pair, scoreKey: [2, counts[0].val, ...kickers], bestFive: cards }
  }
  return { rank: 'high_card', points: POINTS.high_card, scoreKey: [1, ...values], bestFive: cards }
}

function compareEval(a: Evaluated, b: Evaluated): number {
  const A = a.scoreKey
  const B = b.scoreKey
  for (let i=0;i<Math.max(A.length,B.length);i++) {
    const av = A[i] ?? 0, bv = B[i] ?? 0
    if (av !== bv) return av - bv
  }
  return 0
}

function handRankLabel(rank: HandRank): string {
  switch (rank) {
    case 'royal_flush': return 'Royal Flush'
    case 'straight_flush': return 'Straight Flush'
    case 'four_kind': return 'Four of a Kind'
    case 'full_house': return 'Full House'
    case 'flush': return 'Flush'
    case 'straight': return 'Straight'
    case 'three_kind': return 'Three of a Kind'
    case 'two_pair': return 'Two Pair'
    case 'one_pair': return 'One Pair'
    case 'high_card': return 'High Card'
  }
}

function valueToLabel(v: number): string {
  const map: Record<number,string> = { 14:'A', 13:'K', 12:'Q', 11:'J', 10:'10', 9:'9', 8:'8', 7:'7', 6:'6', 5:'5', 4:'4', 3:'3', 2:'2' }
  return map[v] ?? String(v)
}

function explainWhy(a: Evaluated, b: Evaluated): string {
  if (a.rank !== b.rank) return `${handRankLabel(a.rank)} beats ${handRankLabel(b.rank)}`
  // Same rank: interpret scoreKey positions by rank type
  const A = a.scoreKey
  const B = b.scoreKey
  for (let i=0;i<Math.max(A.length,B.length);i++) {
    const av = A[i] ?? 0, bv = B[i] ?? 0
    if (av === bv) continue
    const higher = av > bv
    switch (a.rank) {
      case 'straight_flush':
      case 'straight': {
        return `${higher ? 'Higher' : 'Lower'} straight (${valueToLabel(higher ? av : bv)} high)`
      }
      case 'four_kind': {
        if (i===1) return `${higher ? 'Higher' : 'Lower'} quads (${valueToLabel(higher ? av : bv)})`
        if (i===2) return `${higher ? 'Higher' : 'Lower'} kicker (${valueToLabel(higher ? av : bv)})`
        break
      }
      case 'full_house': {
        if (i===1) return `${higher ? 'Higher' : 'Lower'} trips (${valueToLabel(higher ? av : bv)})`
        if (i===2) return `${higher ? 'Higher' : 'Lower'} pair (${valueToLabel(higher ? av : bv)})`
        break
      }
      case 'flush': {
        return `${higher ? 'Higher' : 'Lower'} high card in flush (${valueToLabel(higher ? av : bv)})`
      }
      case 'three_kind': {
        if (i===1) return `${higher ? 'Higher' : 'Lower'} trips (${valueToLabel(higher ? av : bv)})`
        return `${higher ? 'Higher' : 'Lower'} kicker (${valueToLabel(higher ? av : bv)})`
      }
      case 'two_pair': {
        if (i===1) return `${higher ? 'Higher' : 'Lower'} top pair (${valueToLabel(higher ? av : bv)})`
        if (i===2) return `${higher ? 'Higher' : 'Lower'} second pair (${valueToLabel(higher ? av : bv)})`
        if (i===3) return `${higher ? 'Higher' : 'Lower'} kicker (${valueToLabel(higher ? av : bv)})`
        break
      }
      case 'one_pair': {
        if (i===1) return `${higher ? 'Higher' : 'Lower'} pair (${valueToLabel(higher ? av : bv)})`
        return `${higher ? 'Higher' : 'Lower'} kicker (${valueToLabel(higher ? av : bv)})`
      }
      case 'high_card': {
        return `${higher ? 'Higher' : 'Lower'} high card (${valueToLabel(higher ? av : bv)})`
      }
      case 'royal_flush': {
        return 'Both Royal Flush — tie'
      }
    }
  }
  return 'Hands are equal'
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
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    o.connect(g).connect(ctx.destination)
    o.start(t); o.stop(t + d + 0.02)
  }
  const deal = () => { blip(420, 0.06, 'triangle'); setTimeout(()=>blip(520, 0.06, 'triangle'), 50) }
  const flip = () => blip(700, 0.06, 'sine')
  const win = () => { blip(500, 0.1, 'square'); setTimeout(()=>blip(700, 0.12, 'square'), 100) }
  const lose = () => { blip(180, 0.18, 'sawtooth') }
  return { deal, flip, win, lose }
}

type PlayerState = {
  cards: Card[]
  selectedIds: Set<string>
  goldenId: string | null
  swapped: boolean
}

type DealerState = {
  cards: Card[]
  revealAll: boolean
}

type GameState = {
  phase: Phase
  community: { cards: Card[]; selectedIds: Set<string> }
  player: PlayerState
  dealer: DealerState
  result: 'player' | 'dealer' | 'tie' | null
  points: number
  blindArmed: boolean
  explanation: string | null
  showHelp: boolean
  showRanks: boolean
}

function dealInitial(): GameState {
  const deck = shuffle(buildDeck())
  const p = deck.slice(0,5)
  const d = deck.slice(5,10)
  const community = deck.slice(10,15)
  const golden = p[Math.floor(Math.random()*p.length)].id
  return {
    phase: 'swap',
    community: { cards: community, selectedIds: new Set() },
    player: { cards: p, selectedIds: new Set(), goldenId: golden, swapped: false },
    dealer: { cards: d, revealAll: false },
    result: null,
    points: 0,
    blindArmed: false,
    explanation: null,
    showHelp: false,
    showRanks: false,
  }
}

function dealerStrategyDecisions(hand: Card[]): number {
  // returns how many cards to discard based on highest category that matches, but also identify which; here we just return a bitmask for simplicity
  // We'll mark discards via boolean array
  const mark = new Array(hand.length).fill(false)
  const eval5 = evaluateFive(hand)
  const mistake = Math.random() < 0.08
  const bySuit = new Map<Suit, number[]>()
  const byRank = new Map<number, number[]>()
  hand.forEach((c, i) => {
    bySuit.set(c.suit, [...(bySuit.get(c.suit)||[]), i])
    const rv = RANK_VALUE[c.rank]
    byRank.set(rv, [...(byRank.get(rv)||[]), i])
  })

  const keepAll = () => hand.map(()=>false)
  const replaceAll = () => hand.map(()=>true)

  const countByRank = [...byRank.entries()].map(([rv, idxs])=>({rv, idxs})).sort((a,b)=>b.idxs.length - a.idxs.length || b.rv - a.rv)

  const choose = (): boolean[] => {
    switch (eval5.rank) {
      case 'full_house':
      case 'four_kind':
      case 'straight_flush':
      case 'royal_flush':
        return keepAll()
      case 'flush': {
        // keep suited, replace others
        let maxSuit: Suit = '♠'; let best = 0
        for (const [s, idxs] of bySuit.entries()) { if (idxs.length > best) { best = idxs.length; maxSuit = s } }
        return hand.map((c)=>c.suit!==maxSuit)
      }
      case 'straight': {
        // keep cards that belong to sequence if obvious; as heuristic, keep top 4 ranks
        const vals = hand.map(c=>RANK_VALUE[c.rank]).sort((a,b)=>b-a)
        const keepVals = new Set(vals.slice(0,4))
        return hand.map(c=>!keepVals.has(RANK_VALUE[c.rank]))
      }
      case 'three_kind': {
        const triple = countByRank.find(x=>x.idxs.length===3)!
        const toKeep = new Set(triple.idxs)
        return hand.map((_,i)=>!toKeep.has(i))
      }
      case 'two_pair': {
        const pairs = countByRank.filter(x=>x.idxs.length===2).slice(0,2).flatMap(x=>x.idxs)
        const toKeep = new Set(pairs)
        return hand.map((_,i)=>!toKeep.has(i))
      }
      case 'one_pair': {
        const pair = countByRank.find(x=>x.idxs.length===2)!
        const toKeep = new Set(pair.idxs)
        return hand.map((_,i)=>!toKeep.has(i))
      }
      case 'high_card': {
        const hasAce = hand.some(c=>c.rank==='A')
        if (hasAce) {
          // keep Ace only
          const keepIdx = hand.findIndex(c=>c.rank==='A')
          return hand.map((_,i)=> i!==keepIdx)
        }
        return replaceAll()
      }
    }
  }

  let discards = choose()
  if (mistake) {
    // flip one random decision
    const idx = Math.floor(Math.random()*hand.length)
    discards[idx] = !discards[idx]
  }
  // limit to at most 3 discards
  const count = discards.filter(Boolean).length
  if (count > 3) {
    // keep highest ranks among discards
    const discardIdxs = discards.map((d, i) => d ? i : -1).filter(i=>i>=0)
    discardIdxs.sort((a,b)=> RANK_VALUE[hand[a].rank] - RANK_VALUE[hand[b].rank]) // discard lower
    const toDiscard = new Set(discardIdxs.slice(0,3))
    discards = hand.map((_,i)=> toDiscard.has(i))
  }
  return discards.reduce((acc, d)=> acc + (d?1:0), 0)
}

export function LastPokerHand(): JSX.Element {
  const [game, setGame] = useState<GameState>(() => dealInitial())
  const { deal, flip, win, lose } = useAudio()

  useEffect(() => { deal() }, [])

  const playerEval = useMemo(() => evaluateFive(game.player.cards), [game.player.cards])
  const dealerEval = useMemo(() => evaluateFive(game.dealer.cards), [game.dealer.cards])

  const canSwap = useMemo(() => {
    if (game.phase !== 'swap') return false
    const a = game.player.selectedIds.size
    const b = game.community.selectedIds.size
    return a > 0 && a <= 3 && a === b
  }, [game])
  const canReveal = useMemo(() => game.phase === 'swap', [game.phase])

  const toggleSelectPlayer = (id: string) => {
    if (game.phase !== 'swap') return
    setGame(prev => {
      const nextSel = new Set(prev.player.selectedIds)
      if (nextSel.has(id)) nextSel.delete(id)
      else {
        if (nextSel.size >= 3) return prev
        nextSel.add(id)
      }
      return { ...prev, player: { ...prev.player, selectedIds: nextSel } }
    })
  }

  const toggleSelectCommunity = (id: string) => {
    if (game.phase !== 'swap') return
    setGame(prev => {
      const nextSel = new Set(prev.community.selectedIds)
      if (nextSel.has(id)) nextSel.delete(id)
      else {
        if (nextSel.size >= 3) return prev
        nextSel.add(id)
      }
      return { ...prev, community: { ...prev.community, selectedIds: nextSel } }
    })
  }

  const doSwap = () => {
    if (!canSwap) return
    setGame(prev => {
      const playerCards = prev.player.cards.slice()
      const communityCards = prev.community.cards.slice()
      const selPlayer = Array.from(prev.player.selectedIds)
      const selCommunity = Array.from(prev.community.selectedIds)
      // perform pairwise swap in selection order
      for (let k=0;k<selPlayer.length; k++) {
        const pid = selPlayer[k]
        const cid = selCommunity[k]
        const pi = playerCards.findIndex(c=>c.id===pid)
        const ci = communityCards.findIndex(c=>c.id===cid)
        if (pi>=0 && ci>=0) {
          const temp = playerCards[pi]
          playerCards[pi] = communityCards[ci]
          communityCards[ci] = temp
        }
      }
      return {
        ...prev,
        player: { ...prev.player, cards: playerCards, selectedIds: new Set(), swapped: true },
        community: { cards: communityCards, selectedIds: new Set() },
      }
    })
    flip()
  }

  const doBlind = () => {
    if (game.phase !== 'swap') return
    setGame(prev => ({ ...prev, blindArmed: true, player: { ...prev.player, selectedIds: new Set(), swapped: false } }))
  }

  const doReveal = () => {
    if (!canReveal) return
    // Dealer swaps greedily with community up to 3 times
    setGame(prev => {
      const dealer = prev.dealer.cards.slice()
      const community = prev.community.cards.slice()
      let swaps = 0
      while (swaps < 3) {
        let bestGain = -Infinity
        let bestPi = -1
        let bestCi = -1
        const currentEval = evaluateFive(dealer)
        for (let pi = 0; pi < dealer.length; pi++) {
          for (let ci = 0; ci < community.length; ci++) {
            const tmpDealer = dealer.slice()
            const tmpCommunity = community.slice()
            const t = tmpDealer[pi]
            tmpDealer[pi] = tmpCommunity[ci]
            tmpCommunity[ci] = t
            const ev = evaluateFive(tmpDealer)
            const gain = compareEval(ev, currentEval)
            if (gain > bestGain) { bestGain = gain; bestPi = pi; bestCi = ci }
          }
        }
        if (bestGain > 0 && bestPi >= 0 && bestCi >= 0) {
          const t = dealer[bestPi]
          dealer[bestPi] = community[bestCi]
          community[bestCi] = t
          swaps++
        } else {
          break
        }
      }
      return { ...prev, dealer: { cards: dealer, revealAll: true }, community: { ...prev.community, cards: community }, phase: 'reveal' }
    })
    setTimeout(flip, 150)
    setTimeout(() => finalize(), 600)
  }

  const finalize = () => {
    setGame(prev => {
      const playerEv = evaluateFive(prev.player.cards)
      const dealerEv = evaluateFive(prev.dealer.cards)
      const cmp = compareEval(playerEv, dealerEv)
      let result: GameState['result'] = 'tie'
      if (cmp > 0) result = 'player'
      else if (cmp < 0) result = 'dealer'
      // base points
      let pts = playerEv.points
      if (result === 'player') pts += 10
      if (result === 'dealer') pts -= 5
      // Blind bonus
      if (result === 'player' && prev.blindArmed && !prev.player.swapped) {
        pts *= 2
      }
      // Golden card bonus
      const golden = prev.player.goldenId
      const isGoldenInBest = playerEv.bestFive.some(c => c.id === golden)
      if (isGoldenInBest) pts += 50
      const why = result === 'tie' ? 'Tie: equal hand strength' : `${result === 'player' ? 'Player' : 'Dealer'} wins — ${result === 'player' ? explainWhy(playerEv, dealerEv) : explainWhy(dealerEv, playerEv)}`
      return { ...prev, phase: 'finished', result, points: pts, explanation: why }
    })
  }

  useEffect(() => {
    if (game.phase !== 'finished') return
    if (game.result === 'player') win(); else if (game.result === 'dealer') lose();
  }, [game.phase])

  const reset = () => { setGame(dealInitial()); deal() }

  const status = useMemo(() => {
    switch (game.phase) {
      case 'swap': return 'Select up to 3 cards to swap, or go Blind for 2× if you win.'
      case 'reveal': return 'Revealing hands…'
      case 'finished': return game.result === 'player' ? 'You win!' : game.result === 'dealer' ? 'Dealer wins.' : 'Tie.'
      default: return 'Dealing…'
    }
  }, [game])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
      <div>
        <Panel title="Last Poker Hand" titleRight={(
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setGame(p => ({ ...p, showHelp: true }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }}>?</button>
            <button onClick={() => setGame(p => ({ ...p, showRanks: true }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }}>i</button>
          </div>
        )}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>Status: {status}</div>
            {game.phase === 'finished' && (
              <div>Points awarded: <strong>{game.points}</strong></div>
            )}
            {game.phase === 'finished' && game.explanation && (
              <div style={{ color: '#aab' }}>{game.explanation}</div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={doSwap} disabled={!canSwap} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: canSwap ? 'transparent' : '#1a1f33', color: '#eaeaf0' }}>Draw</button>
              <button onClick={doReveal} disabled={!canReveal} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }}>Reveal</button>
              <button onClick={doBlind} disabled={game.phase !== 'swap'} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: game.blindArmed ? '#1b1f2e' : 'transparent', color: '#eaeaf0' }}>Blind Bonus</button>
              <button onClick={reset} style={{ padding: '8px 10px', borderRadius: 10, border: '1px dashed #2d3550', background: 'transparent', color: '#aab' }}>New Hand</button>
            </div>
          </div>
        </Panel>
      </div>
      <div>
        <Panel title="Table">
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div style={{ marginBottom: 6, color: '#aab' }}>Dealer</div>
              <CardRow cards={game.dealer.cards} hidden={!game.dealer.revealAll} highlight={game.phase==='finished' ? dealerEval.rank : undefined} />
            </div>
            <div>
              <div style={{ marginBottom: 6, color: '#aab' }}>Community</div>
              <CardRow cards={game.community.cards} selectable={game.phase==='swap'} selectedIds={game.community.selectedIds} onToggle={toggleSelectCommunity} />
            </div>
            <div>
              <div style={{ marginBottom: 6, color: '#aab' }}>You</div>
              <CardRow cards={game.player.cards} selectable={game.phase==='swap'} selectedIds={game.player.selectedIds} onToggle={toggleSelectPlayer} goldenId={game.player.goldenId} highlight={game.phase==='finished' ? playerEval.rank : undefined} />
            </div>
          </div>
        </Panel>
      </div>
      {game.showHelp && (
        <HelpModal onClose={() => setGame(p => ({ ...p, showHelp: false }))} />
      )}
      {game.showRanks && (
        <RanksModal onClose={() => setGame(p => ({ ...p, showRanks: false }))} />
      )}
    </div>
  )
}

function Panel({ title, children, titleRight }: { title: string; children: React.ReactNode; titleRight?: React.ReactNode }) {
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
        {titleRight}
      </div>
      {children}
    </div>
  )
}

function CardRow({ cards, hidden, selectable, selectedIds, onToggle, goldenId, highlight }: {
  cards: Card[]
  hidden?: boolean
  selectable?: boolean
  selectedIds?: Set<string>
  onToggle?: (id: string) => void
  goldenId?: string | null
  highlight?: HandRank
}) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {cards.map((c, idx) => (
        <PlayingCard
          key={c.id + idx}
          card={c}
          faceDown={hidden && idx > 0}
          selectable={!!selectable}
          selected={!!selectedIds?.has(c.id)}
          onToggle={onToggle}
          isGolden={goldenId === c.id}
        />
      ))}
    </div>
  )
}

function PlayingCard({ card, faceDown, selectable, selected, onToggle, isGolden }: {
  card: Card
  faceDown?: boolean
  selectable?: boolean
  selected?: boolean
  onToggle?: (id: string) => void
  isGolden?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.animate([
      { transform: 'translateY(-12px)', opacity: 0 },
      { transform: 'translateY(0px)', opacity: 1 },
    ], { duration: 220, easing: 'ease-out' })
  }, [])

  const color = card.suit === '♥' || card.suit === '♦' ? '#ff7a7a' : '#eaeaf0'
  return (
    <div
      ref={ref}
      onClick={() => selectable && onToggle && onToggle(card.id)}
      style={{
        width: 68, height: 92, borderRadius: 10, border: selected ? '2px solid #8aa1ff' : '1px solid #30364a',
        background: faceDown ? 'linear-gradient(135deg,#1c2235,#151728)' : 'linear-gradient(180deg,#141e2e,#0e1220)',
        color,
        boxShadow: isGolden ? '0 0 20px rgba(255,215,0,0.7), 0 6px 14px rgba(0,0,0,0.4)' : '0 6px 14px rgba(0,0,0,0.4)',
        position: 'relative',
        cursor: selectable ? 'pointer' : 'default',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        padding: 8,
      }}
    >
      {!faceDown && (
        <>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{card.rank}</div>
          <div style={{ display: 'grid', placeItems: 'center', fontSize: 20 }}>{card.suit}</div>
          <div style={{ fontWeight: 800, fontSize: 14, transform: 'rotate(180deg)', justifySelf: 'end' }}>{card.rank}</div>
          {isGolden && (
            <div style={{ position: 'absolute', inset: 2, borderRadius: 8, border: '1px solid rgba(255,215,0,0.9)' }} />
          )}
        </>
      )}
      {faceDown && (
        <div style={{ display: 'grid', placeItems: 'center', color: '#aab' }}>★</div>
      )}
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <div style={{ width: 560, maxWidth: '92vw', background: '#0e1017', border: '1px solid #24283a', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>How to Play — Last Poker Hand</div>
          <button onClick={onClose} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }}>Close</button>
        </div>
        <div style={{ marginTop: 10, color: '#c7c9d9', fontSize: 14, lineHeight: 1.5 }}>
          <p>Deal: You and the dealer receive 5 cards. Your cards are face-up; dealer keeps 4 hidden.</p>
          <p>Swap: Select up to 3 of your cards and an equal number of community cards to swap 1:1. Or arm Blind Bonus (skip swap) for 2× points if you win.</p>
          <p>Dealer: Dealer will swap up to 3 cards with the community to improve its hand (small chance of mistakes).</p>
          <p>Reveal: Both hands are revealed. Points are awarded by hand rank (see ranking), +10 win bonus, -5 loss penalty, +50 if your golden card is in your best five. Blind Bonus doubles if you win without swapping.</p>
        </div>
      </div>
    </div>
  )
}

function RanksModal({ onClose }: { onClose: () => void }) {
  const C = (r: Rank, s: Suit): Card => ({ rank: r, suit: s, id: `${r}${s}` })
  const rows: Array<{ title: string; desc: string; hand: Card[] }> = [
    { title: 'Royal Flush', desc: 'A, K, Q, J, 10 all in the same suit.', hand: [C('10','♥'), C('J','♥'), C('Q','♥'), C('K','♥'), C('A','♥')] },
    { title: 'Straight Flush', desc: 'Five sequential cards in the same suit.', hand: [C('5','♣'), C('6','♣'), C('7','♣'), C('8','♣'), C('9','♣')] },
    { title: 'Four of a Kind', desc: 'Four cards of the same rank.', hand: [C('9','♠'), C('9','♥'), C('9','♦'), C('9','♣'), C('2','♠')] },
    { title: 'Full House', desc: 'Three of a kind plus a pair.', hand: [C('K','♠'), C('K','♥'), C('K','♦'), C('3','♣'), C('3','♦')] },
    { title: 'Flush', desc: 'Any five cards of the same suit, not sequential.', hand: [C('A','♦'), C('J','♦'), C('9','♦'), C('6','♦'), C('3','♦')] },
    { title: 'Straight', desc: 'Five sequential cards, any suits (A can be low).', hand: [C('A','♠'), C('2','♥'), C('3','♦'), C('4','♣'), C('5','♠')] },
    { title: 'Three of a Kind', desc: 'Three cards of the same rank.', hand: [C('7','♠'), C('7','♥'), C('7','♦'), C('K','♣'), C('4','♠')] },
    { title: 'Two Pair', desc: 'Two different pairs.', hand: [C('Q','♠'), C('Q','♥'), C('4','♦'), C('4','♣'), C('9','♠')] },
    { title: 'One Pair', desc: 'One pair of equal rank.', hand: [C('J','♠'), C('J','♦'), C('K','♥'), C('8','♣'), C('5','♠')] },
    { title: 'High Card', desc: 'No combination; highest card plays.', hand: [C('A','♣'), C('K','♦'), C('8','♥'), C('5','♦'), C('3','♣')] },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <div style={{ width: 700, maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto', background: '#0e1017', border: '1px solid #24283a', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>Poker Hand Rankings</div>
          <button onClick={onClose} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }}>Close</button>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 14 }}>
          {rows.map((row, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ color: '#c7c9d9', fontWeight: 700 }}>{row.title}</div>
                <div style={{ color: '#aab', fontSize: 13 }}>{row.desc}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {row.hand.map((card, i) => (
                  <PlayingCard key={card.id + i} card={card} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


