import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { DiceRisk } from '../titles/dice-risk/DiceRisk';
import { HideoutHunt } from '../titles/hideout-hunt/HideoutHunt';
import { Minesweeper } from '../titles/minesweeper/Minesweeper';
import { LastPokerHand } from '../titles/last-poker-hand/LastPokerHand';
import { DiceShootout } from '../titles/dice-shootout/DiceShootout';
import { DegenSweeper } from '../titles/degen-sweeper/DegenSweeper';
import { HighRoller } from '../titles/high-roller/HighRoller';
const games = [
    { key: 'dice-risk', title: 'Dice Risk', ready: true, description: 'Roll, hold, or risk re-rolling to beat the bot.' },
    { key: 'minesweeper', title: 'Minesweeper (Arcade)', ready: true, description: 'Flip tiles, avoid bombs, cash out early.' },
    { key: 'bounty-hunter', title: 'Bounty Hunter', ready: false, description: 'Pick your target: risk vs reward.' },
    { key: 'dog-race', title: 'Dog Race', ready: false, description: 'Bet on the winning dog.' },
    { key: 'last-poker-hand', title: 'Last Poker Hand', ready: true, description: 'One swap round to build the best hand.' },
    { key: 'hideout-hunt', title: 'Hideout Hunt', ready: true, description: 'Find and destroy enemy hideouts.' },
    { key: 'dice-shootout', title: 'Dice Shootout', ready: true, description: 'Deal damage with die rolls; 6 is crit.' },
    { key: 'degen-sweeper', title: 'Degen Sweeper', ready: true, description: 'Clear 4x4 without bombs for jackpot.' },
    { key: 'high-roller', title: 'High Roller', ready: true, description: 'Bet on Player/Banker/Tie; closest to 15 wins.' },
];
export function App() {
    const [active, setActive] = useState('hideout-hunt');
    const activeGameTitle = useMemo(() => games.find(g => g.key === active)?.title ?? 'GangstaVerse Parlor', [active]);
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '280px 1fr', height: '100%' }, children: [_jsxs("aside", { style: { borderRight: '1px solid #1f2230', padding: '24px 16px', background: '#0e1017' }, children: [_jsx("h2", { style: { margin: 0, fontSize: 20 }, children: "GangstaVerse Parlor" }), _jsx("p", { style: { color: '#aab', marginTop: 8 }, children: "Pick a game" }), _jsx("div", { style: { display: 'grid', gap: 8, marginTop: 12 }, children: games.map(g => (_jsxs("button", { onClick: () => g.ready && setActive(g.key), style: {
                                textAlign: 'left',
                                padding: '12px 14px',
                                borderRadius: 10,
                                border: '1px solid #24283a',
                                background: active === g.key ? '#1b1f2e' : '#121525',
                                color: g.ready ? '#eaeaf0' : '#6a6d85',
                                cursor: g.ready ? 'pointer' : 'not-allowed',
                                transition: 'transform 120ms ease, background 200ms',
                            }, children: [_jsx("div", { style: { fontWeight: 600 }, children: g.title }), _jsxs("div", { style: { fontSize: 12, color: '#9aa' }, children: [g.description, !g.ready ? ' — Coming soon' : ''] })] }, g.key))) })] }), _jsxs("main", { style: { padding: 24 }, children: [_jsx("header", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: _jsx("h1", { style: { margin: 0, fontSize: 28 }, children: activeGameTitle }) }), _jsxs("section", { style: { marginTop: 16, height: 'calc(100% - 56px)' }, children: [active === 'dice-risk' && _jsx(DiceRisk, {}), active === 'hideout-hunt' && _jsx(HideoutHunt, {}), active === 'minesweeper' && _jsx(Minesweeper, {}), active === 'last-poker-hand' && _jsx(LastPokerHand, {}), active === 'dice-shootout' && _jsx(DiceShootout, {}), active === 'degen-sweeper' && _jsx(DegenSweeper, {}), active === 'high-roller' && _jsx(HighRoller, {}), active !== 'dice-risk' && active !== 'hideout-hunt' && (_jsx("div", { style: { color: '#9aa' }, children: "Select Dice Risk to start. Others are coming soon." }))] })] })] }));
}
