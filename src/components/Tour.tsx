import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceAgent } from '../agent/NexusAgent';
import { TOUR } from '../tour';
import { devlog } from '../agent/devlog';
import { chatBus } from './Chat';

export type TourMode = 'silent' | 'voice' | 'chat';

const MIN_MS = 5200;         // shortest stop
const MAX_VOICE_MS = 16000;  // never wait longer than this for Nexus to finish a line

/**
 * The 60-second guided tour. Works silently with captions; if a voice call is live,
 * Nexus narrates each stop and the tour waits for it to finish speaking.
 * Scrolling by hand pauses it. Esc exits.
 */
export default function Tour({ open, mode, onMode, onClose, agent, show, onVoice, onChat }: {
  open: boolean;
  mode: TourMode;
  onMode: (m: TourMode) => void;
  onClose: () => void;
  agent: VoiceAgent;
  show: (target: string) => void;
  onVoice: () => void;
  onChat: () => void;
}) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const stepStart = useRef(0);
  const pausedAt = useRef(0);
  const ourScrollUntil = useRef(0);
  const narrated = useRef(-1);

  const live = () => agent.getState().status === 'live';

  // reset when opened
  useEffect(() => {
    if (!open) return;
    setStep(0); setPaused(false); setDone(false); narrated.current = -1;
    document.documentElement.classList.add('tour-on');
    agent.setQuiet?.(true);
    devlog.add('sys', 'guided tour started');
    return () => { document.documentElement.classList.remove('tour-on'); agent.setQuiet?.(false); };
  }, [open, agent]);

  // go to the current stop
  useEffect(() => {
    if (!open || done) return;
    const stop = TOUR[step];
    ourScrollUntil.current = performance.now() + 1400;
    show(stop.target);
    stepStart.current = performance.now();
    setProgress(0);
    if (narrated.current !== step) {
      if (mode === 'voice' && live()) { narrated.current = step; agent.tourNote?.(stop.line, stop.label); }
      else if (mode === 'chat') { narrated.current = step; chatBus.post(`**${stop.label}** · ${stop.line}`); }
    }
    devlog.add('tool', `tour stop ${step + 1}/${TOUR.length} → ${stop.target}`);
  }, [open, step, done, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // timer: silent stops last a reading-time; narrated stops wait for Nexus to finish
  useEffect(() => {
    if (!open || done) return;
    let raf = 0;
    const tick = () => {
      if (!paused) {
        const el = performance.now() - stepStart.current;
        const words = TOUR[step].line.split(/\s+/).length;
        const silentDur = Math.max(MIN_MS, words * 300);
        const voice = mode === 'voice' && live();
        const dur = voice ? MAX_VOICE_MS : silentDur;
        setProgress(Math.min(1, voice ? Math.min(el / silentDur, 0.95) : el / dur));
        const finished = voice ? (el > 3500 && !agent.speaking() && agent.nexusLevel() < 0.02 && el > 1200) || el > MAX_VOICE_MS : el >= dur;
        if (finished) {
          if (step < TOUR.length - 1) setStep(step + 1);
          else { setDone(true); devlog.add('sys', 'guided tour finished'); }
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, step, paused, done, agent, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // scrolling by hand pauses the tour; Esc exits
  useEffect(() => {
    if (!open) return;
    const onManual = () => { if (performance.now() > ourScrollUntil.current && !paused) { setPaused(true); pausedAt.current = performance.now(); } };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('wheel', onManual, { passive: true });
    addEventListener('touchmove', onManual, { passive: true });
    addEventListener('keydown', onKey);
    return () => { removeEventListener('wheel', onManual); removeEventListener('touchmove', onManual); removeEventListener('keydown', onKey); };
  }, [open, paused, onClose]);

  const resume = useCallback(() => {
    // continue where we were: shift the step start by the paused time, and bring the stop back into view
    stepStart.current += performance.now() - pausedAt.current;
    setPaused(false);
    ourScrollUntil.current = performance.now() + 1400;
    show(TOUR[step].target);
  }, [step, show]);
  const togglePause = () => { if (paused) resume(); else { pausedAt.current = performance.now(); setPaused(true); } };
  const next = () => { if (step < TOUR.length - 1) { setPaused(false); setStep(step + 1); } else setDone(true); };
  const pick = (m: TourMode) => {
    if (m === mode) return;
    narrated.current = -1;
    if (m === 'voice') onVoice();
    if (m === 'chat') { onChat(); chatBus.post(`Here's the 60-second tour. I'll post each stop here as the page moves.`); }
    onMode(m);
    stepStart.current = performance.now();
  };

  const stop = TOUR[step];
  return (
    <aside className={`tour${open ? ' open' : ''}`} role="dialog" aria-label="60-second guided tour" aria-hidden={!open} inert={!open}>
      {done ? (
        <div className="tour-done">
          <p className="tour-kicker">Tour complete</p>
          <p className="tour-line">Want the details? Ask Nexus anything about his work.</p>
          <div className="tour-ctl">
            <button type="button" data-ask className="tour-primary" onClick={() => { onClose(); onVoice(); }}>Talk to Nexus</button>
            <button type="button" data-ask onClick={() => { onClose(); onChat(); }}>Chat</button>
            <button type="button" data-ask onClick={onClose}>Close</button>
          </div>
        </div>
      ) : (
        <>
          <div className="tour-head">
            <span className="tour-kicker">60-second tour · {step + 1}/{TOUR.length}</span>
            <button type="button" data-ask className="tour-x" onClick={onClose} aria-label="Exit tour">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="tour-modes" role="radiogroup" aria-label="How to take the tour">
            {(['silent', 'voice', 'chat'] as TourMode[]).map((m) => (
              <button key={m} type="button" data-ask role="radio" aria-checked={mode === m} onClick={() => pick(m)}>
                {m === 'silent' ? 'Silent' : m === 'voice' ? 'With voice' : 'In chat'}
              </button>
            ))}
          </div>
          <div className="tour-bars" aria-hidden="true">
            {TOUR.map((_, i) => <i key={i} className={i < step ? 'done' : ''}>{i === step && <b style={{ transform: `scaleX(${progress})` }} />}</i>)}
          </div>
          <p className="tour-label">{stop.label}</p>
          <p key={step} className="tour-line">{stop.line}</p>
          <div className="tour-ctl">
            <button type="button" data-ask onClick={togglePause} aria-label={paused ? 'Resume tour' : 'Pause tour'}>
              {paused
                ? <><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>Resume</>
                : <><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>Pause</>}
            </button>
            <button type="button" data-ask onClick={next}>Next</button>

          </div>
          {paused && <p className="tour-paused">Paused. Resume to continue the tour.</p>}
        </>
      )}
    </aside>
  );
}
