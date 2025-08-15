import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
const SIZE = 8;
const BOMBS = 12;
const STAR_RATIO = 0.5; // proportion of non-bomb tiles that are stars; rest are cash
function keyOf(c) { return `${c.row},${c.col}`; }
function inBounds(c) { return c.row >= 0 && c.row < SIZE && c.col >= 0 && c.col < SIZE; }
function pickUniquePositions(count, forbidden = new Set()) {
    const set = new Set();
    while (set.size < count) {
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);
        const k = `${r},${c}`;
        if (forbidden.has(k))
            continue;
        set.add(k);
    }
    return set;
}
function generateBoard() {
    const bombs = pickUniquePositions(BOMBS);
    // Collect remaining non-bomb keys
    const remaining = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const k = `${r},${c}`;
            if (!bombs.has(k))
                remaining.push(k);
        }
    }
    // Shuffle remaining to randomize star/cash assignment
    for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = remaining[i];
        remaining[i] = remaining[j];
        remaining[j] = tmp;
    }
    const starCount = Math.floor(remaining.length * STAR_RATIO);
    const stars = new Set(remaining.slice(0, starCount));
    const cash = new Set(remaining.slice(starCount));
    const tiles = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const pos = { row: r, col: c };
            const k = keyOf(pos);
            const isBomb = bombs.has(k);
            const isCash = !isBomb && cash.has(k);
            const isStar = !isBomb && stars.has(k);
            tiles.push({ pos, isBomb, isRevealed: false, isCash, isStar });
        }
    }
    return tiles;
}
function useAudio() {
    const ctxRef = useRef(null);
    const ensure = () => {
        if (!ctxRef.current) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            ctxRef.current = new Ctx();
        }
        return ctxRef.current;
    };
    const blip = (f, d = 0.08, type = 'square') => {
        const ctx = ensure();
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + d + 0.02);
    };
    const reveal = () => blip(360, 0.09, 'triangle');
    const bomb = () => { blip(120, 0.18, 'sawtooth'); setTimeout(() => blip(70, 0.22, 'sine'), 120); };
    const cash = () => { blip(500, 0.1, 'square'); setTimeout(() => blip(700, 0.12, 'square'), 100); };
    const arm = () => blip(820, 0.06, 'sine');
    return { reveal, bomb, cash, arm };
}
function streakMultiplier(streak) {
    if (streak <= 0)
        return 1;
    if (streak === 1)
        return 1.1;
    if (streak === 2)
        return 1.2;
    if (streak === 3)
        return 1.5;
    if (streak === 4)
        return 1.7;
    return 2.0;
}
export function Minesweeper() {
    const [tiles, setTiles] = useState(() => generateBoard());
    const [phase, setPhase] = useState('playing');
    const [roundPoints, setRoundPoints] = useState(0);
    const [bankedPoints, setBankedPoints] = useState(0);
    const [safeStreak, setSafeStreak] = useState(0);
    const [doubleArmed, setDoubleArmed] = useState(false);
    const [multiplier, setMultiplier] = useState(1);
    const { reveal, bomb, cash, arm } = useAudio();
    const revealedSafeCount = useMemo(() => tiles.filter(t => t.isRevealed && !t.isBomb).length, [tiles]);
    const canArmDouble = useMemo(() => phase === 'playing' && revealedSafeCount >= 2 && !doubleArmed, [phase, revealedSafeCount, doubleArmed]);
    const reset = () => {
        setTiles(generateBoard());
        setPhase('playing');
        setRoundPoints(0);
        setSafeStreak(0);
        setDoubleArmed(false);
        setMultiplier(1);
    };
    const cashOut = () => {
        if (phase !== 'playing')
            return;
        setBankedPoints(b => b + roundPoints);
        setPhase('cashed');
        cash();
    };
    const onReveal = (tile) => {
        if (phase !== 'playing')
            return;
        if (tile.isRevealed)
            return;
        setTiles(prev => prev.map(t => (t.pos.row === tile.pos.row && t.pos.col === tile.pos.col ? { ...t, isRevealed: true } : t)));
        if (tile.isBomb) {
            bomb();
            // Double-or-nothing loses everything
            setRoundPoints(0);
            setSafeStreak(0);
            setPhase('busted');
            setDoubleArmed(false);
            return;
        }
        // Safe reveal
        reveal();
        setSafeStreak(s => s + 1);
        if (doubleArmed) {
            // Next tile doubles or nothing
            setRoundPoints(p => p * 2);
            setDoubleArmed(false);
            return;
        }
        // Points model: cash tile yields +5 * multiplier; star tile increases multiplier by +0.5; others yield 0
        if (tile.isCash) {
            const gained = Math.round(5 * multiplier);
            setRoundPoints(p => p + gained);
        }
        else if (tile.isStar) {
            setMultiplier(m => m + 0.5);
        }
    };
    const grid = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const t = tiles.find(x => x.pos.row === r && x.pos.col === c);
            grid.push(_jsxs("div", { onClick: () => onReveal(t), style: {
                    width: 48, height: 48, display: 'grid', placeItems: 'center', cursor: phase === 'playing' ? 'pointer' : 'default',
                    border: '1px solid #2a2f45',
                    background: t.isRevealed ? (t.isBomb ? '#8b2b2b' : '#1a2034') : '#121525',
                    boxShadow: t.isRevealed ? 'inset 0 6px 16px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.25)',
                    position: 'relative',
                }, children: [t.isRevealed && t.isBomb && (_jsx("span", { style: { color: '#ff5c5c', fontWeight: 800 }, children: "X" })), t.isRevealed && !t.isBomb && t.isCash && (_jsx("span", { style: { color: '#ffd166', fontWeight: 800 }, children: "$" })), t.isRevealed && !t.isBomb && t.isStar && (_jsx("span", { style: { color: '#9cffb3', fontWeight: 800 }, children: "\u2605" }))] }, `${r},${c}`));
        }
    }
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }, children: [_jsx("div", { children: _jsx(Panel, { title: "Minesweeper (Arcade)", children: _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsxs("div", { children: ["Round Points: ", _jsx("strong", { children: roundPoints })] }), _jsxs("div", { children: ["Banked Points: ", _jsx("strong", { children: bankedPoints })] }), _jsxs("div", { children: ["Multiplier: ", _jsxs("strong", { children: ["x", multiplier.toFixed(2)] })] }), _jsxs("div", { children: ["Status: ", phase === 'playing' ? 'Playing' : phase === 'busted' ? 'Busted (bomb)' : 'Cashed Out'] }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { onClick: cashOut, disabled: phase !== 'playing', style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }, children: "Cash Out" }), _jsx("button", { onClick: () => { if (canArmDouble) {
                                            setDoubleArmed(true);
                                            arm();
                                        } }, disabled: !canArmDouble, style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: doubleArmed ? '#1b1f2e' : 'transparent', color: '#eaeaf0' }, children: "Double Next" }), _jsx("button", { onClick: reset, style: { padding: '8px 10px', borderRadius: 10, border: '1px dashed #2d3550', background: 'transparent', color: '#aab' }, children: "New Round" })] })] }) }) }), _jsx("div", { children: _jsx(Panel, { title: "Board", children: _jsx("div", { style: { display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 48px)`, gridAutoRows: 48, gap: 2 }, children: grid }) }) })] }));
}
function Panel({ title, children }) {
    return (_jsxs("div", { style: {
            background: 'linear-gradient(180deg, #121525 0%, #0e1017 100%)',
            border: '1px solid #24283a',
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 12px 24px rgba(0,0,0,0.25) inset, 0 6px 24px rgba(2,10,30,0.35)'
        }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, children: _jsx("div", { style: { fontWeight: 700, letterSpacing: 0.2 }, children: title }) }), children] }));
}
