import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
const SIZE = 4;
const BOMBS = 4;
function keyOf(c) { return `${c.row},${c.col}`; }
function pick(n) {
    const set = new Set();
    while (set.size < n) {
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);
        set.add(`${r},${c}`);
    }
    return set;
}
function gen() {
    const bombs = pick(BOMBS);
    const tiles = [];
    for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) {
            const pos = { row: r, col: c };
            tiles.push({ pos, bomb: bombs.has(keyOf(pos)), revealed: false });
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
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + d + 0.02);
    };
    const reveal = () => blip(360, 0.09, 'triangle');
    const boom = () => { blip(140, 0.2, 'sawtooth'); setTimeout(() => blip(90, 0.22, 'sine'), 120); };
    const win = () => { blip(500, 0.1, 'square'); setTimeout(() => blip(700, 0.12, 'square'), 100); };
    return { reveal, boom, win };
}
export function DegenSweeper() {
    const [tiles, setTiles] = useState(() => gen());
    const [points, setPoints] = useState(0);
    const [status, setStatus] = useState('playing');
    const [undoLeft, setUndoLeft] = useState(1);
    const [pendingBombKey, setPendingBombKey] = useState(null);
    const { reveal, boom, win } = useAudio();
    const safeLeft = useMemo(() => tiles.filter(t => !t.bomb && !t.revealed).length, [tiles]);
    const reset = () => { setTiles(gen()); setPoints(0); setStatus('playing'); setUndoLeft(1); setPendingBombKey(null); };
    const onClick = (tile) => {
        if (status !== 'playing')
            return;
        if (pendingBombKey)
            return;
        if (tile.revealed)
            return;
        setTiles(prev => prev.map(t => (t.pos.row === tile.pos.row && t.pos.col === tile.pos.col ? { ...t, revealed: true } : t)));
        if (tile.bomb) {
            boom();
            const k = keyOf(tile.pos);
            if (undoLeft > 0) {
                setPendingBombKey(k);
            }
            else {
                setStatus('lost');
                setPoints(0);
            }
            return;
        }
        reveal();
        setPoints(p => p + 10);
        setTimeout(() => {
            setTiles(prev => {
                const left = prev.filter(t => !t.bomb && !t.revealed).length;
                if (left === 0) {
                    setStatus('won');
                    win();
                }
                return prev;
            });
        }, 0);
    };
    const undoBomb = () => {
        if (!pendingBombKey || undoLeft <= 0)
            return;
        setTiles(prev => prev.map(t => (keyOf(t.pos) === pendingBombKey ? { ...t, revealed: false } : t)));
        setPendingBombKey(null);
        setUndoLeft(n => n - 1);
    };
    const acceptLoss = () => {
        if (!pendingBombKey)
            return;
        setPendingBombKey(null);
        setStatus('lost');
        setPoints(0);
    };
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }, children: [_jsx("div", { children: _jsx(Panel, { title: "Degen Sweeper", children: _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsxs("div", { children: ["Points: ", _jsx("strong", { children: points })] }), _jsxs("div", { children: ["Status: ", status === 'playing' ? 'Playing' : status === 'won' ? 'Cleared! +500' : 'Boom! 0 points'] }), _jsxs("div", { children: ["Safe tiles left: ", safeLeft] }), _jsxs("div", { children: ["Undo available: ", undoLeft] }), pendingBombKey && status === 'playing' && (_jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: undoBomb, disabled: undoLeft <= 0, style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: undoLeft > 0 ? 'transparent' : '#1a1f33', color: '#eaeaf0' }, children: "Undo Bomb" }), _jsx("button", { onClick: acceptLoss, style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }, children: "Accept Loss" })] })), _jsx("button", { onClick: reset, style: { marginTop: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }, children: "New Round" })] }) }) }), _jsx("div", { children: _jsx(Panel, { title: "Grid", children: _jsx("div", { style: { display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 54px)`, gridAutoRows: 54, gap: 4 }, children: tiles.map(t => (_jsxs("div", { onClick: () => onClick(t), style: {
                                width: 54, height: 54, borderRadius: 8, border: '1px solid #2a2f45',
                                background: t.revealed ? (t.bomb ? '#8b2b2b' : '#172039') : '#121525', display: 'grid', placeItems: 'center', cursor: 'pointer'
                            }, children: [t.revealed && !t.bomb && _jsx("span", { style: { color: '#9bb1ff', fontWeight: 700 }, children: "+10" }), t.revealed && t.bomb && _jsx("span", { style: { color: '#ff6b6b', fontWeight: 800 }, children: "X" })] }, keyOf(t.pos)))) }) }) })] }));
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
