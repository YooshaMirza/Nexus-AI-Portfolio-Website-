import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { VoiceAgent } from '../agent/NexusAgent';
import { Caption } from './Caption';
import { frameHooks } from './Stage';
import ConsoleLine from './ConsoleChip';
import { isOutOfService } from '../serviceText';
import { person } from '../content';

const Icon = {
  mic: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  micOff: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V6a3 3 0 0 0-5.7-1.3M5 11a7 7 0 0 0 11.5 5.4M19 11a7 7 0 0 1-.6 2.8M12 18v3M3 3l18 18" /></svg>,
  keys: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9" /></svg>,
  end: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  send: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
};

/** Bottom dock: Nexus's mini presence, live caption, what it can see, and call controls. */
export default function Dock({ agent, seeing, onStart, onChat, onLog }: { agent: VoiceAgent; seeing: string; onStart: () => void; onChat: () => void; onLog: () => void }) {
  const st = useSyncExternalStore(agent.subscribe, agent.getState);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const bars = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const live = st.status === 'live';
  const connecting = st.status === 'connecting';

  useEffect(() => {
    const hook = (t: number) => {
      const el = bars.current;
      if (!el) return;
      const lv = Math.max(agent.nexusLevel(), agent.visitorLevel());
      for (let i = 0; i < el.children.length; i++) {
        const wob = 0.5 + 0.5 * Math.sin(t * 9 + i * 1.7);
        (el.children[i] as HTMLElement).style.transform = `scaleY(${(0.18 + lv * (0.5 + wob * 0.9)).toFixed(3)})`;
      }
    };
    frameHooks.add(hook);
    return () => { frameHooks.delete(hook); };
  }, [agent]);

  useEffect(() => { if (typing) input.current?.focus(); }, [typing]);
  useEffect(() => { if (st.micBlocked) setTyping(true); }, [st.micBlocked]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    agent.sendText(draft);
    setDraft('');
  };

  return (
    <div className={`dock ${live ? 'is-live' : ''}`} role="region" aria-label="Nexus voice agent">
      <span id="blob-dock" className="dock-orb" aria-hidden="true" />
      <div className="dock-body">
        {live || connecting ? (
          typing ? (
            <form className="dock-type" onSubmit={submit}>
              <input ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={st.micBlocked ? 'Mic is off. Type to Nexus…' : 'Type to Nexus…'} aria-label="Message Nexus" />
              <button type="submit" className="ic" aria-label="Send" disabled={!draft.trim()}>{Icon.send}</button>
            </form>
          ) : (
            <>
              {st.visitorText ? <p className="dock-visitor">You: {st.visitorText}</p> : <Caption agent={agent} idleText={connecting ? 'Connecting…' : 'Listening…'} className="dock-caption" tail={110} />}
              <p className="dock-seeing"><span ref={bars} className="bars" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</span>Seeing {seeing}</p>
              <ConsoleLine onOpen={onLog} idle="connecting…" />
            </>
          )
        ) : (
          <>
            <p className="dock-caption idle">{st.status === 'error' ? (st.error === 'needs-key' ? 'Paste a Gemini key at the top of the page to test Nexus.' : st.error) : st.status === 'ended' ? 'Nexus has hung up. Start again any time.' : 'Nexus can walk you through Yoosha\'s work.'}</p>
            <p className="dock-seeing">Seeing {seeing}</p>
          </>
        )}
      </div>
      <div className="dock-ctl">
        {live || connecting ? (
          <>
            <button className="ic" onClick={() => setTyping((v) => !v)} aria-pressed={typing} aria-label={typing ? 'Back to voice' : 'Type instead'}>{typing ? Icon.mic : Icon.keys}</button>
            {!st.micBlocked && !typing && (
              <button className="ic" onClick={() => agent.setMuted(!st.muted)} aria-pressed={st.muted} aria-label={st.muted ? 'Unmute microphone' : 'Mute microphone'}>{st.muted ? Icon.micOff : Icon.mic}</button>
            )}
            <button className="ic end" onClick={() => agent.stop()} aria-label="End conversation">{Icon.end}</button>
          </>
        ) : (
          <>
            <button className="ic chat-ic" onClick={onChat} aria-label="Chat with Nexus" title="Chat instead">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" /></svg>
            </button>
            {st.status === 'error' && isOutOfService(st.error)
              ? <a className="talk" href={`mailto:${person.email}`}>Email Yoosha</a>
              : <button className="talk" onClick={onStart}><span className="dot" />{st.status === 'ended' || st.status === 'error' ? 'Talk again' : 'Talk to Nexus'}</button>}
          </>
        )}
      </div>
    </div>
  );
}
