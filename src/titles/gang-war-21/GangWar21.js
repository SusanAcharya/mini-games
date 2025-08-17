import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const VALUE = { A: 1, K: 13, Q: 12, J: 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
function buildDeck() { const d = []; for (const s of SUITS)
    for (const r of RANKS)
        d.push({ suit: s, rank: r, id: `${r}${s}` }); return d; }
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
} return a; }
function total(cards) { return cards.reduce((sum, c) => sum + VALUE[c.rank], 0); }
function useAudio() {
    const ctxRef = useRef(null);
    const ensure = () => { if (!ctxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        ctxRef.current = new Ctx();
    } return ctxRef.current; };
    const blip = (f, d = 0.08, type = 'square') => { const ctx = ensure(); const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02); };
    const deal = () => { blip(420, 0.06, 'triangle'); setTimeout(() => blip(520, 0.06, 'triangle'), 60); };
    const flip = () => blip(700, 0.06, 'sine');
    const win = () => { blip(520, 0.1, 'square'); setTimeout(() => blip(720, 0.12, 'square'), 100); };
    const lose = () => blip(180, 0.18, 'sawtooth');
    return { deal, flip, win, lose };
}
function initialGame() {
    const deck = shuffle(buildDeck());
    const p = [deck[0]];
    const b = [deck[1]];
    const rest = deck.slice(2);
    return { phase: 'player', deck: rest, player: p, bot: b, revealBot: false, winner: null };
}
export function GangWar21() {
    const [game, setGame] = useState(() => initialGame());
    const { deal, flip, win, lose } = useAudio();
    useEffect(() => { deal(); }, []);
    const totals = useMemo(() => ({ p: total(game.player), b: total(game.bot) }), [game.player, game.bot]);
    const pBust = totals.p > 21;
    const bBust = totals.b > 21;
    const status = useMemo(() => {
        if (game.phase === 'player')
            return 'Your turn — Hit or Stand';
        if (game.phase === 'bot')
            return 'Bot is drawing…';
        if (game.phase === 'finished') {
            const w = game.winner === 'player' ? 'You win!' : game.winner === 'bot' ? 'Bot wins.' : 'Tie.';
            return `${w} Player ${totals.p} vs Bot ${totals.b}`;
        }
        return '';
    }, [game.phase, game.winner, totals]);
    const hitMe = () => {
        if (game.phase !== 'player')
            return;
        setGame(prev => ({ ...prev, player: [...prev.player, prev.deck[0]], deck: prev.deck.slice(1) }));
        flip();
    };
    const stand = () => {
        if (game.phase !== 'player')
            return;
        setGame(prev => ({ ...prev, phase: 'bot' }));
    };
    useEffect(() => {
        if (game.phase !== 'player')
            return;
        if (pBust) {
            setGame(prev => ({ ...prev, phase: 'finished', revealBot: true, winner: 'bot' }));
            lose();
        }
    }, [game.phase, pBust]);
    useEffect(() => {
        if (game.phase !== 'bot')
            return;
        // Bot draws until reaching 17+ or bust
        if (bBust || totals.b >= 17) {
            // finalize
            const result = decideWinner(totals.p, totals.b);
            setGame(prev => ({ ...prev, phase: 'finished', revealBot: true, winner: result }));
            setTimeout(() => { result === 'player' ? win() : result === 'bot' ? lose() : undefined; }, 80);
            return;
        }
        const timer = setTimeout(() => {
            setGame(prev => ({ ...prev, bot: [...prev.bot, prev.deck[0]], deck: prev.deck.slice(1) }));
            flip();
        }, 700);
        return () => clearTimeout(timer);
    }, [game.phase, totals.b, bBust]);
    const reset = () => setGame(initialGame());
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }, children: [_jsx("div", { children: _jsx(Panel, { title: "Gang War 21", children: _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { children: status }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { onClick: hitMe, disabled: game.phase !== 'player', style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: game.phase === 'player' ? 'transparent' : '#1a1f33', color: '#eaeaf0' }, children: "Hit" }), _jsx("button", { onClick: stand, disabled: game.phase !== 'player', style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: game.phase === 'player' ? 'transparent' : '#1a1f33', color: '#eaeaf0' }, children: "Stand" }), _jsx("button", { onClick: reset, style: { padding: '8px 10px', borderRadius: 10, border: '1px dashed #2d3550', background: 'transparent', color: '#aab' }, children: "New Round" })] })] }) }) }), _jsx("div", { children: _jsx(Panel, { title: "Table", children: _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 6, color: '#aab' }, children: ["Bot \u2014 ", game.phase === 'finished' ? totals.b : ''] }), _jsx(CardRow, { cards: game.bot, hidden: game.phase !== 'finished' })] }), _jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 6, color: '#aab' }, children: ["You \u2014 ", totals.p] }), _jsx(CardRow, { cards: game.player })] })] }) }) })] }));
}
function decideWinner(p, b) {
    const pBust = p > 21;
    const bBust = b > 21;
    if (pBust && bBust)
        return 'tie';
    if (pBust)
        return 'bot';
    if (bBust)
        return 'player';
    if (p === b)
        return 'tie';
    return p > b ? 'player' : 'bot';
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
function CardRow({ cards, hidden }) {
    return (_jsx("div", { style: { display: 'flex', gap: 10 }, children: cards.map((c, idx) => (_jsx(PlayingCard, { card: c, faceDown: hidden && idx > 0 }, c.id + idx))) }));
}
function PlayingCard({ card, faceDown }) {
    const ref = useRef(null);
    useEffect(() => { if (!ref.current)
        return; ref.current.animate([{ transform: 'translateY(-10px)', opacity: 0 }, { transform: 'translateY(0px)', opacity: 1 }], { duration: 200, easing: 'ease-out' }); }, []);
    const color = card.suit === '♥' || card.suit === '♦' ? '#ff7a7a' : '#eaeaf0';
    return (_jsxs("div", { ref: ref, style: { width: 68, height: 92, borderRadius: 10, border: '1px solid #30364a', background: faceDown ? 'linear-gradient(135deg,#1c2235,#151728)' : 'linear-gradient(180deg,#141e2e,#0e1220)', color, position: 'relative', display: 'grid', gridTemplateRows: 'auto 1fr auto', padding: 8 }, children: [!faceDown && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontWeight: 800, fontSize: 14 }, children: card.rank }), _jsx("div", { style: { display: 'grid', placeItems: 'center', fontSize: 20 }, children: card.suit }), _jsx("div", { style: { fontWeight: 800, fontSize: 14, transform: 'rotate(180deg)', justifySelf: 'end' }, children: card.rank })] })), faceDown && (_jsx("div", { style: { display: 'grid', placeItems: 'center', color: '#aab' }, children: "\u2605" }))] }));
}
