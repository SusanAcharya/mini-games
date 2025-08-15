import React, { useMemo, useState } from 'react'
import { DiceRisk } from '../titles/dice-risk/DiceRisk'
import { HideoutHunt } from '../titles/hideout-hunt/HideoutHunt'
import { Minesweeper } from '../titles/minesweeper/Minesweeper'
import { LastPokerHand } from '../titles/last-poker-hand/LastPokerHand'

type GameKey = 'dice-risk' | 'minesweeper' | 'bounty-hunter' | 'dog-race' | 'last-poker-hand' | 'hideout-hunt'

const games: Array<{ key: GameKey; title: string; ready: boolean; description: string }> = [
  { key: 'dice-risk', title: 'Dice Risk', ready: true, description: 'Roll, hold, or risk re-rolling to beat the bot.' },
  { key: 'minesweeper', title: 'Minesweeper (Arcade)', ready: true, description: 'Flip tiles, avoid bombs, cash out early.' },
  { key: 'bounty-hunter', title: 'Bounty Hunter', ready: false, description: 'Pick your target: risk vs reward.' },
  { key: 'dog-race', title: 'Dog Race', ready: false, description: 'Bet on the winning dog.' },
  { key: 'last-poker-hand', title: 'Last Poker Hand', ready: true, description: 'One swap round to build the best hand.' },
  { key: 'hideout-hunt', title: 'Hideout Hunt', ready: true, description: 'Find and destroy enemy hideouts.' },
]

export function App(): JSX.Element {
  const [active, setActive] = useState<GameKey | null>('hideout-hunt')

  const activeGameTitle = useMemo(() => games.find(g => g.key === active)?.title ?? 'GangstaVerse Parlor', [active])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '100%' }}>
      <aside style={{ borderRight: '1px solid #1f2230', padding: '24px 16px', background: '#0e1017' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>GangstaVerse Parlor</h2>
        <p style={{ color: '#aab', marginTop: 8 }}>Pick a game</p>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {games.map(g => (
            <button
              key={g.key}
              onClick={() => g.ready && setActive(g.key)}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #24283a',
                background: active === g.key ? '#1b1f2e' : '#121525',
                color: g.ready ? '#eaeaf0' : '#6a6d85',
                cursor: g.ready ? 'pointer' : 'not-allowed',
                transition: 'transform 120ms ease, background 200ms',
              }}
            >
              <div style={{ fontWeight: 600 }}>{g.title}</div>
              <div style={{ fontSize: 12, color: '#9aa' }}>{g.description}{!g.ready ? ' — Coming soon' : ''}</div>
            </button>
          ))}
        </div>
      </aside>
      <main style={{ padding: 24 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>{activeGameTitle}</h1>
        </header>
        <section style={{ marginTop: 16, height: 'calc(100% - 56px)' }}>
          {active === 'dice-risk' && <DiceRisk />}
          {active === 'hideout-hunt' && <HideoutHunt />}
          {active === 'minesweeper' && <Minesweeper />}
          {active === 'last-poker-hand' && <LastPokerHand />}
          {active !== 'dice-risk' && active !== 'hideout-hunt' && (
            <div style={{ color: '#9aa' }}>Select Dice Risk to start. Others are coming soon.</div>
          )}
        </section>
      </main>
    </div>
  )
}


