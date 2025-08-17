import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
function rollDie() { return 1 + Math.floor(Math.random() * 6); }
function useAudio() {
    const ctxRef = useRef(null);
    const ensure = () => { if (!ctxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        ctxRef.current = new Ctx();
    } return ctxRef.current; };
    const blip = (f, d = 0.08, type = 'square') => { const ctx = ensure(); const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02); };
    const roll = () => { blip(260, 0.06, 'triangle'); setTimeout(() => blip(320, 0.06, 'triangle'), 50); setTimeout(() => blip(380, 0.06, 'triangle'), 100); };
    const win = () => { blip(520, 0.1, 'square'); setTimeout(() => blip(720, 0.12, 'square'), 100); };
    const lose = () => blip(180, 0.18, 'sawtooth');
    return { roll, win, lose };
}
export function ShootTheMoon() {
    const [game, setGame] = useState({ phase: 'comeout', point: null, last: null, winner: null, rolling: false, showHelp: false });
    const { roll, win, lose } = useAudio();
    const status = useMemo(() => {
        if (game.phase === 'comeout')
            return 'Come Out Roll — press Roll';
        if (game.phase === 'point')
            return `Point is ${game.point}. Roll point again to win; 7 loses.`;
        if (game.phase === 'finished')
            return game.winner === 'player' ? 'You win!' : 'You lose.';
        return '';
    }, [game]);
    const doRoll = () => {
        if (game.phase === 'finished' || game.rolling)
            return;
        setGame(prev => ({ ...prev, rolling: true }));
        roll();
        setTimeout(() => {
            const d1 = rollDie();
            const d2 = rollDie();
            const sum = d1 + d2;
            setGame(prev => {
                if (prev.phase === 'comeout') {
                    if (sum === 7 || sum === 11) {
                        win();
                        return { ...prev, last: { d1, d2, sum }, phase: 'finished', winner: 'player', rolling: false };
                    }
                    if (sum === 2 || sum === 3 || sum === 12) {
                        lose();
                        return { ...prev, last: { d1, d2, sum }, phase: 'finished', winner: 'bot', rolling: false };
                    }
                    return { ...prev, last: { d1, d2, sum }, phase: 'point', point: sum, rolling: false };
                }
                if (prev.phase === 'point') {
                    if (sum === prev.point) {
                        win();
                        return { ...prev, last: { d1, d2, sum }, phase: 'finished', winner: 'player', rolling: false };
                    }
                    if (sum === 7) {
                        lose();
                        return { ...prev, last: { d1, d2, sum }, phase: 'finished', winner: 'bot', rolling: false };
                    }
                    return { ...prev, last: { d1, d2, sum }, rolling: false };
                }
                return prev;
            });
        }, 300);
    };
    const reset = () => setGame({ phase: 'comeout', point: null, last: null, winner: null, rolling: false, showHelp: false });
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }, children: [_jsx("div", { children: _jsx(Panel, { title: "Shoot the Moon", children: _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { children: status }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { onClick: doRoll, disabled: game.phase === 'finished' || game.rolling, style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: (game.phase !== 'finished' && !game.rolling) ? 'transparent' : '#1a1f33', color: '#eaeaf0' }, children: "Roll" }), _jsx("button", { onClick: reset, style: { padding: '8px 10px', borderRadius: 10, border: '1px dashed #2d3550', background: 'transparent', color: '#aab' }, children: "New Round" }), _jsx("button", { onClick: () => setGame(p => ({ ...p, showHelp: true })), style: { padding: '8px 10px', borderRadius: 10, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }, children: "?" })] })] }) }) }), _jsx("div", { children: _jsx(Panel, { title: "Table", children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx(Dice, { d1: game.last?.d1 ?? 1, d2: game.last?.d2 ?? 1, rolling: game.rolling }), _jsxs("div", { style: { color: '#aab' }, children: ["Sum: ", _jsx("strong", { children: game.last?.sum ?? '-' })] })] }), _jsxs("div", { children: ["Point: ", _jsx("strong", { children: game.point ?? '-' })] })] }) }) }), game.showHelp && (_jsx(HelpModal, { onClose: () => setGame(p => ({ ...p, showHelp: false })) }))] }));
}
function Panel({ title, children }) {
    return (_jsxs("div", { style: { background: 'linear-gradient(180deg, #121525 0%, #0e1017 100%)', border: '1px solid #24283a', borderRadius: 14, padding: 16, boxShadow: '0 12px 24px rgba(0,0,0,0.25) inset, 0 6px 24px rgba(2,10,30,0.35)' }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, children: _jsx("div", { style: { fontWeight: 700, letterSpacing: 0.2 }, children: title }) }), children] }));
}
function Dice({ d1, d2, rolling }) {
    const ref = useRef(null);
    if (rolling && ref.current) {
        ref.current.animate([
            { transform: 'translateX(0px) rotate(0deg)' },
            { transform: 'translateX(-4px) rotate(-3deg)' },
            { transform: 'translateX(4px) rotate(3deg)' },
            { transform: 'translateX(0px) rotate(0deg)' },
        ], { duration: 280, easing: 'ease-in-out' });
    }
    return (_jsxs("div", { ref: ref, style: { display: 'inline-flex', alignItems: 'center', gap: 8 }, children: [_jsx(Die, { pip: d1 }), _jsx(Die, { pip: d2 })] }));
}
function Die({ pip }) {
    const spots = Array.from({ length: Math.max(1, Math.min(6, pip)) }).map((_, i) => (_jsx("div", { style: { width: 6, height: 6, background: '#eaeaf0', borderRadius: 999, boxShadow: '0 0 8px rgba(255,255,255,0.6)' } }, i)));
    return (_jsx("div", { style: { width: 40, height: 40, borderRadius: 8, background: 'radial-gradient(120% 120% at 10% 10%, #2a2f45 0%, #151728 100%)', display: 'grid', placeItems: 'center', border: '1px solid #3a3f59', boxShadow: '0 8px 20px rgba(0,0,0,0.35)' }, children: _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 8px)', gridAutoRows: 8, gap: 4 }, children: spots }) }));
}
function HelpModal({ onClose }) {
    return (_jsx("div", { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 50 }, children: _jsxs("div", { style: { width: 520, maxWidth: '90vw', background: '#0e1017', border: '1px solid #24283a', borderRadius: 12, padding: 16 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("div", { style: { fontWeight: 700 }, children: "How to Play \u2014 Shoot the Moon" }), _jsx("button", { onClick: onClose, style: { padding: '4px 8px', borderRadius: 8, border: '1px solid #2d3550', background: 'transparent', color: '#eaeaf0' }, children: "Close" })] }), _jsxs("div", { style: { marginTop: 12, color: '#c7c9d9', fontSize: 14, lineHeight: 1.5 }, children: [_jsx("p", { children: "Come Out Roll:" }), _jsxs("ul", { children: [_jsx("li", { children: "Roll 7 or 11 \u2014 instant win." }), _jsx("li", { children: "Roll 2, 3, or 12 \u2014 instant loss." }), _jsx("li", { children: "Roll 4, 5, 6, 8, 9, or 10 \u2014 that number becomes the point." })] }), _jsx("p", { children: "Point Phase:" }), _jsxs("ul", { children: [_jsx("li", { children: "Keep rolling until you roll the point again (win) or roll a 7 (loss)." }), _jsx("li", { children: "The bot is passive and wins only when you lose." })] }), _jsx("p", { style: { marginTop: 8 }, children: "To play this game in arcade, you'd need to bet your points (at least 50). You will pay for 2\u00D7 your betted points." })] })] }) }));
}
