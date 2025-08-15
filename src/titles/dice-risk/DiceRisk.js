import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
function rollTwoDice() {
    const dieA = 1 + Math.floor(Math.random() * 6);
    const dieB = 1 + Math.floor(Math.random() * 6);
    return { dieA, dieB, sum: dieA + dieB };
}
function decideBotAction(currentSum, turnIndex) {
    const sum = currentSum ?? 0;
    if (sum >= 10)
        return 'hold';
    if (turnIndex >= 3)
        return 'hold';
    if (sum >= 9) {
        return Math.random() < 0.7 ? 'hold' : 'reroll';
    }
    return Math.random() < 0.8 ? 'reroll' : 'hold';
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
    const blip = (freq, duration = 0.08, type = 'square') => {
        const ctx = ensure();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    };
    const roll = () => {
        // Quick rolling rattles
        blip(220, 0.06, 'triangle');
        setTimeout(() => blip(320, 0.05, 'triangle'), 40);
        setTimeout(() => blip(270, 0.05, 'triangle'), 80);
        setTimeout(() => blip(380, 0.05, 'triangle'), 120);
    };
    const confirm = () => blip(660, 0.12, 'sine');
    const lose = () => blip(160, 0.25, 'sawtooth');
    const win = () => { blip(440, 0.12, 'square'); setTimeout(() => blip(660, 0.14, 'square'), 90); };
    return { roll, confirm, lose, win };
}
function useDiceAnim() {
    const [shakeKey, setShakeKey] = useState(0);
    const trigger = () => setShakeKey(k => k + 1);
    return { shakeKey, trigger };
}
export function DiceRisk() {
    const [round, setRound] = useState(() => ({
        human: { player: 'human', turnIndex: 0, rollSum: null, held: false, dice: null },
        bot: { player: 'bot', turnIndex: 0, rollSum: null, held: false, dice: null },
        stage: 'playing',
        winner: null,
        currentTurn: 'human',
    }));
    const { roll, confirm, lose, win } = useAudio();
    const { shakeKey, trigger } = useDiceAnim();
    const isPlayerDone = (t) => t.held || t.turnIndex >= 3;
    const canHumanAct = useMemo(() => {
        return (round.stage === 'playing' &&
            round.currentTurn === 'human' &&
            !round.human.held &&
            round.human.turnIndex < 3);
    }, [round]);
    const statusText = useMemo(() => {
        if (round.stage === 'finished') {
            if (round.winner === 'human')
                return 'You win! +20 points';
            if (round.winner === 'bot')
                return 'You lost. 0 points';
            return 'Tie. +5 points each';
        }
        const whose = round.currentTurn === 'human' ? 'Your' : 'Bot\'s';
        return `${whose} turn — Roll or Hold (max 3 turns each).`;
    }, [round]);
    const resolveWinner = (human, bot) => {
        const h = human.rollSum ?? 0;
        const b = bot.rollSum ?? 0;
        if (h > b)
            return 'human';
        if (b > h)
            return 'bot';
        return 'tie';
    };
    const isRoundOver = (state) => isPlayerDone(state.human) && isPlayerDone(state.bot);
    const doHumanRoll = () => {
        if (!canHumanAct)
            return;
        trigger();
        roll();
        setRound(prev => {
            const r = rollTwoDice();
            const humanNext = { player: 'human', turnIndex: prev.human.turnIndex + 1, rollSum: r.sum, held: false, dice: [r.dieA, r.dieB] };
            const botDone = isPlayerDone(prev.bot);
            return { ...prev, human: humanNext, currentTurn: botDone ? 'human' : 'bot' };
        });
    };
    const doHumanHold = () => {
        if (!canHumanAct)
            return;
        confirm();
        setRound(prev => {
            const humanNext = { ...prev.human, held: true, turnIndex: Math.max(prev.human.turnIndex, 1) };
            const botDone = isPlayerDone(prev.bot);
            // If bot still has turns, pass turn to bot, else it stays with human (round will end shortly)
            return { ...prev, human: humanNext, currentTurn: botDone ? 'human' : 'bot' };
        });
    };
    // Bot acts on its turn. If human already held, bot can take consecutive actions until done.
    useEffect(() => {
        if (round.stage !== 'playing')
            return;
        if (round.currentTurn !== 'bot')
            return;
        if (isRoundOver(round))
            return;
        const timer = setTimeout(() => {
            trigger();
            roll();
            setRound(prev => {
                if (prev.stage !== 'playing' || prev.currentTurn !== 'bot')
                    return prev;
                const botTurnNumber = Math.min(prev.bot.turnIndex + 1, 3);
                const action = decideBotAction(prev.bot.rollSum, botTurnNumber);
                let botNext;
                if (action === 'hold') {
                    botNext = { ...prev.bot, held: true, turnIndex: Math.max(prev.bot.turnIndex, 1) };
                }
                else {
                    const r = rollTwoDice();
                    botNext = { player: 'bot', turnIndex: prev.bot.turnIndex + 1, rollSum: r.sum, held: false, dice: [r.dieA, r.dieB] };
                }
                const humanHeld = prev.human.held;
                const botDone = isPlayerDone(botNext);
                // If human is held, keep bot's turn until bot is done; else pass back to human
                const nextTurn = humanHeld ? (botDone ? 'human' : 'bot') : 'human';
                return { ...prev, bot: botNext, currentTurn: nextTurn };
            });
        }, 550);
        return () => clearTimeout(timer);
    }, [round.currentTurn, round.stage]);
    // Check round completion and compute winner
    useEffect(() => {
        if (round.stage !== 'playing')
            return;
        if (!isRoundOver(round))
            return;
        const winner = resolveWinner(round.human, round.bot);
        if (winner === 'human')
            win();
        else if (winner === 'bot')
            lose();
        else
            confirm();
        setRound(prev => ({ ...prev, stage: 'finished', winner }));
    }, [round.human, round.bot, round.stage]);
    const reset = () => {
        setRound({
            human: { player: 'human', turnIndex: 0, rollSum: null, held: false, dice: null },
            bot: { player: 'bot', turnIndex: 0, rollSum: null, held: false, dice: null },
            stage: 'playing',
            winner: null,
            currentTurn: 'human',
        });
    };
    const canAllIn = round.stage === 'finished' && round.winner === 'human';
    const canTieOptions = round.stage === 'finished' && round.winner === 'tie';
    const doAllIn = () => {
        if (!canAllIn)
            return;
        // One final roll by human vs bot's last roll; must beat to double
        setRound(prev => ({ ...prev, stage: 'all-in' }));
        setTimeout(() => {
            trigger();
            roll();
            const humanFinal = rollTwoDice().sum;
            const botFinal = (round.bot.rollSum ?? 0);
            const success = humanFinal > botFinal;
            if (success)
                win();
            else
                lose();
            const resultText = success ? 'All-in success! Rewards doubled.' : 'All-in failed. 0 points.';
            alert(`${resultText}\nYour roll: ${humanFinal} vs Bot: ${botFinal}`);
            reset();
        }, 400);
    };
    const doTieSplit = () => {
        if (!canTieOptions)
            return;
        confirm();
        alert('Tie split selected. +5 points each.');
        reset();
    };
    const doTieGamble = () => {
        if (!canTieOptions)
            return;
        setRound(prev => ({ ...prev, stage: 'all-in' }));
        setTimeout(() => {
            trigger();
            roll();
            let humanDie = 1 + Math.floor(Math.random() * 6);
            let botDie = 1 + Math.floor(Math.random() * 6);
            while (humanDie === botDie) {
                humanDie = 1 + Math.floor(Math.random() * 6);
                botDie = 1 + Math.floor(Math.random() * 6);
            }
            const success = humanDie > botDie;
            if (success)
                win();
            else
                lose();
            alert(`Tie Gamble result: You ${success ? 'WIN' : 'LOSE'}!\nYour die: ${humanDie} vs Bot: ${botDie}`);
            reset();
        }, 400);
    };
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }, children: [_jsx("div", { children: _jsxs(Panel, { title: "You", children: [_jsx(ScoreRow, { label: "Roll", value: round.human.rollSum ?? 0, highlight: true, shakeKey: shakeKey, dice: round.human.dice }), _jsx(TurnsRow, { current: round.human.turnIndex, held: round.human.held }), _jsxs("div", { style: { display: 'flex', gap: 12, marginTop: 12 }, children: [_jsx(PrimaryButton, { onClick: doHumanRoll, disabled: !canHumanAct, children: "Roll" }), _jsx(SecondaryButton, { onClick: doHumanHold, disabled: !canHumanAct, children: "Hold" }), _jsx(TertiaryButton, { onClick: reset, children: "Reset" })] })] }) }), _jsx("div", { children: _jsxs(Panel, { title: "Bot", children: [_jsx(ScoreRow, { label: "Roll", value: round.bot.rollSum ?? 0, shakeKey: shakeKey, dice: round.bot.dice }), _jsx(TurnsRow, { current: round.bot.turnIndex, held: round.bot.held })] }) }), _jsx("div", { style: { gridColumn: '1 / span 2' }, children: _jsx(Panel, { title: "Round Status", children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("div", { children: statusText }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx(PrimaryButton, { onClick: doAllIn, disabled: !canAllIn, children: "All-In Final Roll" }), canTieOptions && (_jsxs(_Fragment, { children: [_jsx(SecondaryButton, { onClick: doTieSplit, children: "Split Points" }), _jsx(PrimaryButton, { onClick: doTieGamble, children: "Tie Gamble" })] }))] })] }) }) })] }));
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
function ScoreRow({ label, value, dice, highlight, shakeKey }) {
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: { opacity: 0.8 }, children: label }), _jsx(DiceVisual, { value: value, dice: dice ?? undefined, shakeKey: shakeKey }), _jsx("div", { style: { fontSize: 28, fontWeight: 800, color: highlight ? '#8be9a5' : '#eaeaf0', textShadow: '0 2px 12px rgba(139,233,165,0.2)' }, children: value })] }));
}
function TurnsRow({ current, held }) {
    const circles = [1, 2, 3].map(i => (_jsx("div", { style: {
            width: 12, height: 12, borderRadius: 999,
            background: i <= current ? '#8aa1ff' : '#2a2f45',
            boxShadow: i <= current ? '0 0 12px rgba(138,161,255,0.5)' : undefined
        } }, i)));
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }, children: [_jsx("div", { style: { display: 'flex', gap: 6 }, children: circles }), held && _jsx("span", { style: { marginLeft: 8, color: '#f7c948' }, children: "Held" })] }));
}
function PrimaryButton({ children, onClick, disabled }) {
    return (_jsx("button", { onClick: onClick, disabled: disabled, style: {
            padding: '10px 14px', borderRadius: 10, border: '1px solid #2d3550',
            background: disabled ? '#1a1f33' : 'linear-gradient(180deg,#263158,#1b2346)', color: '#eaeaf0', cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 16px rgba(30,50,100,0.35)', transform: 'translateZ(0)', transition: 'transform 120ms ease'
        }, onMouseDown: (e) => (e.currentTarget.style.transform = 'scale(0.98)'), onMouseUp: (e) => (e.currentTarget.style.transform = 'scale(1)'), children: children }));
}
function SecondaryButton({ children, onClick, disabled }) {
    return (_jsx("button", { onClick: onClick, disabled: disabled, style: {
            padding: '10px 14px', borderRadius: 10, border: '1px solid #2d3550',
            background: 'transparent', color: disabled ? '#6a6d85' : '#aab6ff', cursor: disabled ? 'not-allowed' : 'pointer'
        }, children: children }));
}
function TertiaryButton({ children, onClick, disabled }) {
    return (_jsx("button", { onClick: onClick, disabled: disabled, style: {
            padding: '10px 14px', borderRadius: 10, border: '1px dashed #2d3550',
            background: 'transparent', color: '#9aa', cursor: disabled ? 'not-allowed' : 'pointer'
        }, children: children }));
}
function DiceVisual({ value, dice, shakeKey }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current)
            return;
        const el = ref.current;
        el.animate([
            { transform: 'translateX(0px) rotate(0deg)' },
            { transform: 'translateX(-4px) rotate(-3deg)' },
            { transform: 'translateX(4px) rotate(3deg)' },
            { transform: 'translateX(0px) rotate(0deg)' },
        ], { duration: 280, easing: 'ease-in-out' });
    }, [shakeKey]);
    const approxA = dice ? dice[0] : Math.max(1, Math.min(6, Math.floor((value || 1) / 2)));
    const approxB = dice ? dice[1] : Math.max(1, Math.min(6, Math.ceil((value || 2) / 2)));
    return (_jsxs("div", { ref: ref, style: { display: 'inline-flex', alignItems: 'center', gap: 8 }, children: [_jsx(Die, { pip: approxA }), _jsx(Die, { pip: approxB })] }));
}
function Die({ pip }) {
    const spots = Array.from({ length: pip }).map((_, i) => (_jsx("div", { style: { width: 6, height: 6, background: '#eaeaf0', borderRadius: 999, boxShadow: '0 0 8px rgba(255,255,255,0.6)' } }, i)));
    return (_jsx("div", { style: {
            width: 40, height: 40, borderRadius: 8, background: 'radial-gradient(120% 120% at 10% 10%, #2a2f45 0%, #151728 100%)',
            display: 'grid', placeItems: 'center', border: '1px solid #3a3f59', boxShadow: '0 8px 20px rgba(0,0,0,0.35)'
        }, children: _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 8px)', gridAutoRows: 8, gap: 4 }, children: spots }) }));
}
