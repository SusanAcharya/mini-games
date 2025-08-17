import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const VALUE = { A: 1, K: 13, Q: 12, J: 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
function buildDeck() {
    const out = [];
    for (const s of SUITS)
        for (const r of RANKS)
            out.push({ suit: s, rank: r, id: `${r}${s}` });
    return out;
}
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
} return a; }
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
function total(cards) { return cards.reduce((a, c) => a + VALUE[c.rank], 0); }
export function HighRoller() {
    const [game, setGame] = useState(() => {
        const deck = shuffle(buildDeck());
        const player = deck.slice(0, 3);
        const banker = [deck[3]];
        const rest = deck.slice(4);
        return { phase: 'betting', bet: null, blindBet: false, playerRevealed: false, deck: rest, player, banker, winner: null, points: 0 };
    });
    const { deal, flip, win, lose } = useAudio();
    const canReveal = useMemo(() => game.phase === 'betting' && game.bet !== null, [game]);
    const placeBet = (b) => { if (game.phase !== 'betting')
        return; setGame(prev => ({ ...prev, bet: b, blindBet: !prev.playerRevealed })); };
    const revealMyHand = () => { if (game.phase !== 'betting')
        return; if (game.playerRevealed)
        return; flip(); setGame(prev => ({ ...prev, playerRevealed: true })); };
    const doReveal = () => {
        if (!canReveal)
            return;
        setGame(prev => ({ ...prev, phase: 'reveal' }));
        // Add remaining 2 banker cards from deck
        const add = game.deck.slice(0, 2);
        const b = [...game.banker, ...add];
        const rest = game.deck.slice(2);
        deal();
        setTimeout(() => { setGame(prev => ({ ...prev, banker: b, deck: rest })); flip(); }, 120);
        setTimeout(() => finalize(game.player, b), 500);
    };
    const finalize = (p, b) => {
        const pt = total(p);
        const bt = total(b);
        const pd = Math.abs(15 - pt);
        const bd = Math.abs(15 - bt);
        let winner = 'tie';
        if (pd < bd)
            winner = 'player';
        else if (bd < pd)
            winner = 'banker';
        const correct = game.bet === winner;
        const base = correct ? 10 : 0;
        const award = correct ? (game.blindBet ? base * 2 : base) : 0;
        setGame(prev => ({ ...prev, phase: 'finished', winner, points: award }));
        setTimeout(() => { correct ? win() : lose(); }, 80);
    };
    const reset = () => {
        const deck = shuffle(buildDeck());
        const player = deck.slice(0, 3);
        const banker = [deck[3]];
        const rest = deck.slice(4);
        setGame({ phase: 'betting', bet: null, blindBet: false, playerRevealed: false, deck: rest, player, banker, winner: null, points: 0 });
    };
    const status = useMemo(() => {
        if (game.phase === 'betting')
            return game.playerRevealed ? 'Decide your bet based on your hand.' : 'Optionally reveal your hand, or bet blindly for 2×.';
        if (game.phase === 'reveal')
            return 'Revealing…';
        if (game.phase === 'finished') {
            const pt = total(game.player), bt = total(game.banker);
            const w = game.winner === 'tie' ? 'Tie' : game.winner === 'player' ? 'Player' : 'Banker';
            const correct = game.bet === game.winner;
            const blindNote = correct && game.blindBet ? ' (2× blind bonus)' : '';
            return `${w} wins. Player ${pt} vs Banker ${bt}. ${correct ? `You guessed correctly${blindNote}! +${game.points} pts` : 'Your bet missed.'}`;
        }
        return '';
    }, [game]);
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }, children: [_jsx("div", { children: _jsx(Panel, { title: "High Roller", children: _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { children: status }), game.phase === 'betting' && (_jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { onClick: () => placeBet('player'), style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: game.bet === 'player' ? '#1b1f2e' : 'transparent', color: '#eaeaf0' }, children: "Bet Player" }), _jsx("button", { onClick: () => placeBet('banker'), style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: game.bet === 'banker' ? '#1b1f2e' : 'transparent', color: '#eaeaf0' }, children: "Bet Banker" }), _jsx("button", { onClick: () => placeBet('tie'), style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: game.bet === 'tie' ? '#1b1f2e' : 'transparent', color: '#eaeaf0' }, children: "Bet Tie" })] })), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { onClick: revealMyHand, disabled: game.playerRevealed || game.phase !== 'betting', style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: game.playerRevealed ? '#1a1f33' : 'transparent', color: '#eaeaf0' }, children: "Reveal My Hand" }), _jsx("button", { onClick: doReveal, disabled: !canReveal, style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: canReveal ? 'transparent' : '#1a1f33', color: '#eaeaf0' }, children: "Reveal Outcome" }), _jsx("button", { onClick: reset, style: { padding: '8px 10px', borderRadius: 10, border: '1px dashed #2d3550', background: 'transparent', color: '#aab' }, children: "New Round" })] })] }) }) }), _jsx("div", { children: _jsx(Panel, { title: "Table", children: _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { children: [_jsx("div", { style: { marginBottom: 6, color: '#aab' }, children: "Banker" }), _jsx(CardRow, { cards: game.banker, hidden: false, firstOnlyHidden: game.phase === 'betting' })] }), _jsxs("div", { children: [_jsx("div", { style: { marginBottom: 6, color: '#aab' }, children: "Player" }), _jsx(CardRow, { cards: game.player, hidden: !game.playerRevealed && game.phase === 'betting' })] })] }) }) })] }));
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
function CardRow({ cards, hidden, firstOnlyHidden }) {
    return (_jsxs("div", { style: { display: 'flex', gap: 10 }, children: [cards.length === 0 && _jsx("div", { style: { color: '#6a6d85' }, children: "\u2014" }), cards.map((c, idx) => (_jsx(PlayingCard, { card: c, faceDown: hidden ? (idx > 0) : (firstOnlyHidden ? idx > 0 : false) }, c.id + idx)))] }));
}
function PlayingCard({ card, faceDown }) {
    const ref = useRef(null);
    useEffect(() => { if (!ref.current)
        return; ref.current.animate([{ transform: 'translateY(-10px)', opacity: 0 }, { transform: 'translateY(0px)', opacity: 1 }], { duration: 200, easing: 'ease-out' }); }, []);
    const color = card.suit === '♥' || card.suit === '♦' ? '#ff7a7a' : '#eaeaf0';
    return (_jsxs("div", { ref: ref, style: { width: 68, height: 92, borderRadius: 10, border: '1px solid #30364a', background: faceDown ? 'linear-gradient(135deg,#1c2235,#151728)' : 'linear-gradient(180deg,#141e2e,#0e1220)', color, position: 'relative', display: 'grid', gridTemplateRows: 'auto 1fr auto', padding: 8 }, children: [!faceDown && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontWeight: 800, fontSize: 14 }, children: card.rank }), _jsx("div", { style: { display: 'grid', placeItems: 'center', fontSize: 20 }, children: card.suit }), _jsx("div", { style: { fontWeight: 800, fontSize: 14, transform: 'rotate(180deg)', justifySelf: 'end' }, children: card.rank })] })), faceDown && (_jsx("div", { style: { display: 'grid', placeItems: 'center', color: '#aab' }, children: "\u2605" }))] }));
}
