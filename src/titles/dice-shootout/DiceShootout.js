import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
function rollDie() { return 1 + Math.floor(Math.random() * 6); }
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
    const roll = () => { blip(300, 0.06, 'triangle'); setTimeout(() => blip(380, 0.06, 'triangle'), 60); };
    const hit = () => blip(520, 0.12, 'square');
    const crit = () => { blip(700, 0.12, 'square'); setTimeout(() => blip(900, 0.12, 'square'), 90); };
    const win = () => { blip(500, 0.1, 'sine'); setTimeout(() => blip(700, 0.12, 'sine'), 100); };
    const lose = () => blip(160, 0.2, 'sawtooth');
    return { roll, hit, crit, win, lose };
}
export function DiceShootout() {
    const [state, setState] = useState({
        hp: { human: 50, bot: 50 },
        turn: 'human',
        lastRoll: { human: null, bot: null },
        stage: 'playing',
        winner: null,
        heals: { human: 3, bot: 3 },
    });
    const { roll, hit, crit, win, lose } = useAudio();
    const status = useMemo(() => {
        if (state.stage === 'finished')
            return state.winner === 'human' ? 'You win! +25 points' : 'You lost.';
        return state.turn === 'human' ? 'Your turn — Roll' : 'Bot is rolling…';
    }, [state]);
    const applyDamage = (attacker, amount) => {
        setState(prev => {
            const target = attacker === 'human' ? 'bot' : 'human';
            const hp = { ...prev.hp };
            hp[target] = Math.max(0, hp[target] - amount);
            const winner = hp[target] <= 0 ? attacker : null;
            return { ...prev, hp, stage: winner ? 'finished' : prev.stage, winner: winner ?? prev.winner };
        });
    };
    const doHumanRoll = (action = 'attack') => {
        if (state.stage !== 'playing' || state.turn !== 'human')
            return;
        roll();
        const val = rollDie();
        setState(prev => ({ ...prev, lastRoll: { ...prev.lastRoll, human: val } }));
        if (action === 'attack') {
            const dmg = val === 12 ? 10 : val;
            setTimeout(() => { (val === 6 ? crit() : hit()); applyDamage('human', dmg); setState(p => ({ ...p, turn: p.winner ? p.turn : 'bot' })); }, 150);
        }
        else {
            // heal self, capped at 50, only if heals left
            setTimeout(() => {
                setState(prev => {
                    if (prev.heals.human <= 0)
                        return prev;
                    if (val === 2) {
                        // heal action grants opponent +20 (as per spec), but since heal already gives self val, we prioritize spec: enemy +20
                        const enemy = 'bot';
                        const hpEnemy = Math.min(50, prev.hp[enemy] + 20);
                        return { ...prev, hp: { ...prev.hp, [enemy]: hpEnemy }, heals: { ...prev.heals, human: prev.heals.human - 1 }, turn: 'bot' };
                    }
                    const healed = Math.min(50, prev.hp.human + val);
                    return { ...prev, hp: { ...prev.hp, human: healed }, heals: { ...prev.heals, human: prev.heals.human - 1 }, turn: 'bot' };
                });
            }, 150);
        }
    };
    useEffect(() => {
        if (state.stage !== 'playing')
            return;
        if (state.turn !== 'bot')
            return;
        const timer = setTimeout(() => {
            roll();
            const val = rollDie();
            // Simple bot policy: if hp <= 15 and heals left -> 60% heal else attack
            const shouldHeal = state.heals.bot > 0 && state.hp.bot <= 15 && Math.random() < 0.6;
            setState(prev => ({ ...prev, lastRoll: { ...prev.lastRoll, bot: val } }));
            if (shouldHeal) {
                setTimeout(() => {
                    setState(prev => {
                        if (val === 2) {
                            const hpEnemy = Math.min(50, prev.hp.human + 20);
                            return { ...prev, hp: { ...prev.hp, human: hpEnemy }, heals: { ...prev.heals, bot: prev.heals.bot - 1 }, turn: 'human' };
                        }
                        const healed = Math.min(50, prev.hp.bot + val);
                        return { ...prev, hp: { ...prev.hp, bot: healed }, heals: { ...prev.heals, bot: prev.heals.bot - 1 }, turn: 'human' };
                    });
                }, 150);
            }
            else {
                const dmg = val === 12 ? 10 : val;
                setTimeout(() => { (val === 6 ? crit() : hit()); applyDamage('bot', dmg); setState(p => ({ ...p, turn: p.winner ? p.turn : 'human' })); }, 150);
            }
        }, 650);
        return () => clearTimeout(timer);
    }, [state.turn, state.stage]);
    useEffect(() => {
        if (state.stage !== 'finished')
            return;
        state.winner === 'human' ? win() : lose();
    }, [state.stage]);
    const reset = () => setState({ hp: { human: 50, bot: 50 }, turn: 'human', lastRoll: { human: null, bot: null }, stage: 'playing', winner: null, heals: { human: 3, bot: 3 } });
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }, children: [_jsx("div", { children: _jsx(Panel, { title: "Dice Shootout", children: _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { children: status }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { onClick: () => doHumanRoll('attack'), disabled: state.stage !== 'playing' || state.turn !== 'human', style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #2d3550', background: state.turn === 'human' && state.stage === 'playing' ? 'transparent' : '#1a1f33', color: '#eaeaf0' }, children: "Attack" }), _jsxs("button", { onClick: () => doHumanRoll('heal'), disabled: state.stage !== 'playing' || state.turn !== 'human' || state.heals.human <= 0, style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #2d3550', background: state.turn === 'human' && state.stage === 'playing' && state.heals.human > 0 ? 'transparent' : '#1a1f33', color: '#eaeaf0' }, children: ["Heal (", state.heals.human, " left)"] }), _jsx("button", { onClick: reset, style: { padding: '10px 14px', borderRadius: 10, border: '1px dashed #2d3550', background: 'transparent', color: '#9aa' }, children: "Reset" })] })] }) }) }), _jsx("div", { children: _jsx(Panel, { title: "Arena", children: _jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsx(Fighter, { name: "You", hp: state.hp.human, lastRoll: state.lastRoll.human, active: state.turn === 'human' && state.stage === 'playing' }), _jsx(Fighter, { name: "Bot", hp: state.hp.bot, lastRoll: state.lastRoll.bot, active: state.turn === 'bot' && state.stage === 'playing' })] }) }) })] }));
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
function Fighter({ name, hp, lastRoll, active }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current || lastRoll == null)
            return;
        ref.current.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.05)' },
            { transform: 'scale(1)' },
        ], { duration: 240, easing: 'ease-in-out' });
    }, [lastRoll]);
    const pct = Math.max(0, Math.min(100, Math.round(hp / 50 * 100)));
    return (_jsxs("div", { ref: ref, style: { display: 'grid', gap: 6 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("div", { style: { fontWeight: 700 }, children: name }), _jsx("div", { style: { color: '#aab' }, children: lastRoll != null ? `Rolled: ${lastRoll}` : '' })] }), _jsx("div", { style: { height: 14, background: '#1a1f33', borderRadius: 999, border: '1px solid #2a2f45', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${pct}%`, height: '100%', background: pct > 50 ? '#44d19a' : pct > 20 ? '#f7c948' : '#ff6b6b', transition: 'width 220ms ease' } }) }), _jsxs("div", { style: { color: '#eaeaf0' }, children: [hp, " HP"] }), active && _jsx("div", { style: { color: '#8aa1ff' }, children: "Your move\u2026" })] }));
}
