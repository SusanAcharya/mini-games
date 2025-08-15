import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
const SHIPS = [
    { id: 'S1', length: 1, label: '1-tile' },
    { id: 'S2', length: 2, label: '2-tiles' },
    { id: 'S3', length: 3, label: '3-tiles' },
];
const SIZE = 8;
function keyOf(cell) { return `${cell.row},${cell.col}`; }
function inBounds(cell) { return cell.row >= 0 && cell.row < SIZE && cell.col >= 0 && cell.col < SIZE; }
function makeRange(start, len) { return Array.from({ length: len }, (_, i) => start + i); }
function placeShipAt(anchor, length, orientation) {
    const cells = orientation === 'h'
        ? makeRange(anchor.col, length).map(col => ({ row: anchor.row, col }))
        : makeRange(anchor.row, length).map(row => ({ row, col: anchor.col }));
    if (cells.some(c => !inBounds(c)))
        return null;
    return cells;
}
function collides(ships, cells) {
    const occupied = new Set(ships.flatMap(s => s.cells.map(keyOf)));
    return cells.some(c => occupied.has(keyOf(c)));
}
function randomInt(n) { return Math.floor(Math.random() * n); }
function tryPlaceAllShipsRandomly() {
    const ships = [];
    for (const spec of SHIPS) {
        let placed = null;
        for (let attempts = 0; attempts < 200 && !placed; attempts++) {
            const orientation = Math.random() < 0.5 ? 'h' : 'v';
            const anchor = { row: randomInt(SIZE), col: randomInt(SIZE) };
            const cells = placeShipAt(anchor, spec.length, orientation);
            if (!cells)
                continue;
            if (collides(ships, cells))
                continue;
            placed = { id: spec.id, cells, hits: new Set() };
        }
        if (!placed)
            throw new Error('Failed to place bot ship');
        ships.push(placed);
    }
    return ships;
}
function isHit(ships, target) {
    for (const s of ships) {
        if (s.cells.some(c => c.row === target.row && c.col === target.col)) {
            s.hits.add(keyOf(target));
            const sunk = s.hits.size >= s.cells.length;
            return { hit: true, sunkId: sunk ? s.id : null };
        }
    }
    return { hit: false, sunkId: null };
}
function allSunk(ships) { return ships.every(s => s.hits.size >= s.cells.length); }
function neighbors(cell) {
    return [
        { row: cell.row - 1, col: cell.col },
        { row: cell.row + 1, col: cell.col },
        { row: cell.row, col: cell.col - 1 },
        { row: cell.row, col: cell.col + 1 },
    ].filter(inBounds);
}
export function HideoutHunt() {
    const [state, setState] = useState(() => ({
        phase: 'placement',
        current: 'human',
        human: { size: SIZE, shots: new Set(), ships: [] },
        bot: { size: SIZE, shots: new Set(), ships: tryPlaceAllShipsRandomly() },
        winner: null,
        selection: { shipId: SHIPS[0].id, orientation: 'h' },
    }));
    // Simple audio for feedback
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
        const hit = () => { blip(420, 0.1, 'sawtooth'); setTimeout(() => blip(240, 0.12, 'square'), 60); };
        const miss = () => blip(160, 0.08, 'triangle');
        return { hit, miss };
    }
    const { hit: sfxHit, miss: sfxMiss } = useAudio();
    // Bot attack memory
    const huntQueueRef = useRef([]);
    const lastHitRef = useRef(null);
    // Placement helpers
    const remainingHumanShips = useMemo(() => SHIPS.filter(s => !state.human.ships.some(p => p.id === s.id)), [state.human.ships]);
    const selectedSpec = useMemo(() => SHIPS.find(s => s.id === state.selection.shipId) ?? SHIPS[0], [state.selection.shipId]);
    const onToggleOrientation = () => setState(p => ({ ...p, selection: { ...p.selection, orientation: p.selection.orientation === 'h' ? 'v' : 'h' } }));
    const onPlaceAt = (anchor) => {
        if (state.phase !== 'placement')
            return;
        const spec = selectedSpec;
        const cells = placeShipAt(anchor, spec.length, state.selection.orientation);
        if (!cells)
            return;
        if (collides(state.human.ships, cells))
            return;
        setState(prev => {
            const nextShips = [...prev.human.ships, { id: spec.id, cells, hits: new Set() }];
            const nextSelShip = SHIPS.find(s => !nextShips.some(p => p.id === s.id))?.id ?? null;
            const nextPhase = nextSelShip ? 'placement' : 'battle';
            return {
                ...prev,
                human: { ...prev.human, ships: nextShips },
                phase: nextPhase,
                selection: { shipId: nextSelShip, orientation: prev.selection.orientation },
                current: nextPhase === 'battle' ? 'human' : prev.current,
            };
        });
    };
    const fireAt = (cell) => {
        if (state.phase !== 'battle')
            return;
        if (state.current !== 'human')
            return;
        const k = keyOf(cell);
        if (state.human.shots.has(k))
            return;
        let didHit = false;
        setState(prev => {
            const shots = new Set(prev.human.shots);
            shots.add(k);
            const { hit } = isHit(prev.bot.ships, cell);
            didHit = hit;
            const botAllSunk = allSunk(prev.bot.ships);
            let next = { ...prev, human: { ...prev.human, shots }, current: hit ? 'human' : 'bot' };
            if (botAllSunk)
                next = { ...next, phase: 'finished', winner: 'human' };
            return next;
        });
        setTimeout(() => { didHit ? sfxHit() : sfxMiss(); }, 0);
    };
    // Bot turn logic with consecutive actions on hit
    useEffect(() => {
        if (state.phase !== 'battle')
            return;
        if (state.current !== 'bot')
            return;
        let cancelled = false;
        const actOnce = () => {
            let didHit = false;
            let finished = false;
            setState(prev => {
                if (prev.phase !== 'battle' || prev.current !== 'bot') {
                    return prev;
                }
                // pick a target (prefer queued neighbors)
                const pickFromQueue = () => {
                    while (huntQueueRef.current.length) {
                        const c = huntQueueRef.current.shift();
                        const k = keyOf(c);
                        if (!prev.bot.shots.has(k))
                            return c;
                    }
                    return null;
                };
                let target = pickFromQueue();
                if (!target) {
                    // random untargeted
                    const candidates = [];
                    for (let r = 0; r < SIZE; r++) {
                        for (let c = 0; c < SIZE; c++) {
                            const cell = { row: r, col: c };
                            const k = keyOf(cell);
                            if (!prev.bot.shots.has(k))
                                candidates.push(cell);
                        }
                    }
                    target = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
                }
                if (!target) {
                    // Safety: if somehow no target available, yield turn to human to avoid a stuck state
                    return { ...prev, current: 'human' };
                }
                const targetKey = keyOf(target);
                const nextBotShots = new Set(prev.bot.shots);
                nextBotShots.add(targetKey);
                const { hit } = isHit(prev.human.ships, target);
                didHit = hit;
                let next = { ...prev, bot: { ...prev.bot, shots: nextBotShots }, current: hit ? 'bot' : 'human' };
                if (hit) {
                    lastHitRef.current = target;
                    // Prioritize extending in straight lines first using recent direction, else neighbors
                    const neigh = neighbors(target);
                    // Push direct neighbors to the front to be tried first
                    huntQueueRef.current = [...neigh, ...huntQueueRef.current];
                }
                const humanAllSunk = allSunk(next.human.ships);
                if (humanAllSunk)
                    next = { ...next, phase: 'finished', winner: 'bot' };
                finished = humanAllSunk;
                return next;
            });
            setTimeout(() => { didHit ? sfxHit() : sfxMiss(); }, 0);
            if (!cancelled && didHit && !finished) {
                setTimeout(actOnce, 500);
            }
        };
        const timer = setTimeout(actOnce, 500);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [state.current, state.phase]);
    // Watchdog: if bot is stuck on thinking without firing a shot, yield turn to human
    useEffect(() => {
        if (state.phase !== 'battle')
            return;
        if (state.current !== 'bot')
            return;
        const initialShots = state.bot.shots.size;
        const timer = setTimeout(() => {
            setState(prev => {
                if (prev.phase !== 'battle')
                    return prev;
                if (prev.current !== 'bot')
                    return prev;
                if (prev.bot.shots.size !== initialShots)
                    return prev;
                return { ...prev, current: 'human' };
            });
        }, 2200);
        return () => clearTimeout(timer);
    }, [state.current, state.phase, state.bot.shots.size]);
    const status = useMemo(() => {
        if (state.phase === 'placement')
            return 'Place your hideouts. Toggle orientation and click cells to place.';
        if (state.phase === 'battle')
            return state.current === 'human' ? 'Your turn: pick a cell to attack' : 'Bot is thinking…';
        return state.winner === 'human' ? 'Victory! You destroyed all enemy hideouts.' : 'Defeat. Your hideouts were destroyed.';
    }, [state.phase, state.current, state.winner]);
    const reset = () => {
        huntQueueRef.current = [];
        lastHitRef.current = null;
        setState({
            phase: 'placement',
            current: 'human',
            human: { size: SIZE, shots: new Set(), ships: [] },
            bot: { size: SIZE, shots: new Set(), ships: tryPlaceAllShipsRandomly() },
            winner: null,
            selection: { shipId: SHIPS[0].id, orientation: 'h' },
        });
    };
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }, children: [_jsx("div", { children: _jsxs(Panel, { title: "Setup", children: [_jsx("div", { children: status }), state.phase === 'placement' && (_jsxs("div", { style: { marginTop: 12, display: 'grid', gap: 8 }, children: [_jsx("div", { children: "Remaining:" }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: remainingHumanShips.map(s => (_jsx("button", { onClick: () => setState(p => ({ ...p, selection: { ...p.selection, shipId: s.id } })), style: {
                                            padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550',
                                            background: state.selection.shipId === s.id ? '#1b1f2e' : 'transparent', color: '#eaeaf0'
                                        }, children: s.label }, s.id))) }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: onToggleOrientation, style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }, children: "Toggle Orientation" }), _jsx("button", { onClick: reset, style: { padding: '8px 10px', borderRadius: 10, border: '1px dashed #2d3550', background: 'transparent', color: '#aab' }, children: "Reset" })] })] })), state.phase === 'finished' && (_jsx("div", { style: { marginTop: 12 }, children: _jsx("button", { onClick: reset, style: { padding: '10px 12px', borderRadius: 10, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }, children: "Play Again" }) }))] }) }), _jsx("div", { children: _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }, children: [_jsx(Panel, { title: "Your Grid", children: _jsx(Grid, { board: state.human, revealShips: true, onCellClick: cell => state.phase === 'placement' ? onPlaceAt(cell) : undefined, selectedPlacement: state.phase === 'placement' ? { length: selectedSpec.length, orientation: state.selection.orientation } : null, shotsOverride: state.bot.shots }) }), _jsx(Panel, { title: "Enemy Grid", children: _jsx(Grid, { board: state.bot, revealShips: false, onCellClick: cell => state.phase === 'battle' && state.current === 'human' ? fireAt(cell) : undefined, shotsOverride: state.human.shots }) })] }) })] }));
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
function Grid({ board, revealShips, onCellClick, selectedPlacement, shotsOverride }) {
    const cells = [];
    const occupied = new Set(board.ships.flatMap(s => s.cells.map(keyOf)));
    const shots = shotsOverride ?? board.shots;
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = { row: r, col: c };
            const k = keyOf(cell);
            const wasShot = shots.has(k);
            const isShip = revealShips && occupied.has(k);
            const content = isShip ? ShipTile(cell, board.ships) : null;
            const marker = wasShot ? (occupied.has(k)
                ? _jsx("div", { style: { width: 14, height: 14, borderRadius: 999, background: '#ff4d4f', boxShadow: '0 0 12px rgba(255,77,79,0.7)' } })
                : _jsx("div", { style: { width: 10, height: 10, borderRadius: 999, background: '#7a82a8' } })) : null;
            cells.push(_jsxs("div", { onClick: () => onCellClick && onCellClick(cell), style: {
                    width: 36, height: 36, border: '1px solid #24283a', background: wasShot ? (isShip ? '#b94c4c' : '#1d2132') : '#121525',
                    display: 'grid', placeItems: 'center', cursor: onCellClick ? 'pointer' : 'default',
                    position: 'relative'
                }, children: [content, marker] }, k));
        }
    }
    return (_jsxs("div", { style: { position: 'relative' }, children: [selectedPlacement && (_jsxs("div", { style: { marginBottom: 8, color: '#aab' }, children: ["Placing: ", selectedPlacement.length, "-tile (", selectedPlacement.orientation === 'h' ? 'horizontal' : 'vertical', ")"] })), _jsx("div", { style: { display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 36px)`, gridAutoRows: 36, gap: 0 }, children: cells })] }));
}
function ShipTile(cell, ships) {
    const ship = ships.find(s => s.cells.some(c => c.row === cell.row && c.col === cell.col));
    if (!ship)
        return null;
    const spec = SHIPS.find(s => s.id === ship.id);
    // Differentiated UI per ship size
    const styles = {
        1: { width: 14, height: 14, borderRadius: 4, background: '#ffd166', boxShadow: '0 0 12px rgba(255,209,102,0.6)' },
        2: { width: 30, height: 12, borderRadius: 3, background: '#6ecbff', boxShadow: '0 0 12px rgba(110,203,255,0.6)' },
        3: { width: 32, height: 10, borderRadius: 2, background: '#9cffb3', boxShadow: '0 0 12px rgba(156,255,179,0.6)' },
    };
    return _jsx("div", { style: styles[spec.length] });
}
