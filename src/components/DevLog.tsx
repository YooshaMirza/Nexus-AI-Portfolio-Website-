import { useEffect, useRef, useSyncExternalStore } from 'react';
import { devlog } from '../agent/devlog';

const fmt = (ms: number) => { const s = ms / 1000; return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

const LABEL: Record<string, string> = { sys: 'agent', net: 'speed', tool: 'action', ctx: 'context', you: 'you', ai: 'nexus', err: 'error' };

/** Agent console: a live, terminal-style log of what Nexus is doing. Opt-in. */
export default function DevLog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lines = useSyncExternalStore(devlog.subscribe, devlog.get);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) box.current?.scrollTo({ top: box.current.scrollHeight }); }, [lines, open]);

  return (
    <aside className={`devlog${open ? ' open' : ''}`} aria-label="Agent console: what Nexus is doing, live" aria-hidden={!open} inert={!open}>
      <header>
        <span className="dl-dot" aria-hidden="true" />
        <b>Agent console</b>
        <span className="dl-sub">what Nexus is doing, live</span>
        <button type="button" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>
      <div className="dl-body" ref={box}>
        {!lines.length && <p className="dl-empty">This is Nexus's live log. Start a voice call or send a chat message and you'll see each step here: connecting to Gemini, how fast it answers, the actions it takes on this page (like scrolling to a project) and what it knows you're looking at.</p>}
        {lines.map((l) => (
          <p key={l.id} className={`dl-line k-${l.kind}`}><time>{fmt(l.t)}</time><span className="dl-k">{LABEL[l.kind] ?? l.kind}</span><span className="dl-t">{l.text}</span></p>
        ))}
      </div>
    </aside>
  );
}
