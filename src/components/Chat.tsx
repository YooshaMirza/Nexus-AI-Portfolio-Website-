import { useCallback, useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { devlog } from '../agent/devlog';
import ConsoleLine from './ConsoleChip';
import { isOutOfService } from '../serviceText';
import { person } from '../content';
import { evidenceFor, labelFor, linkedIds, type Evidence } from './evidence';

/** shown: items Nexus moved the page to while answering (they get cards too) */
type Msg = { role: 'user' | 'model'; text: string; error?: boolean; shown?: string[]; typed?: boolean };
const STORE = 'nexus-chat';
const SUGGESTIONS = ['What does Yoosha do at Weya?', 'Show me his best project', 'Is he open to freelance work?', 'हिंदी में बताओ, उसका experience क्या है?'];
const TOUR_CHIP = 'Take the 60-second tour';
const DEFAULT_NEXT = [TOUR_CHIP, 'How can I hire him?', 'What is his strongest skill?'];

/** The guided tour posts its stops into the chat through this tiny bus (no API call needed). */
const tourListeners = new Set<(text: string, target?: string) => void>();
/** The tour posts its stops here; `target` = the page item being shown (gets an evidence card). */
export const chatBus = { post: (text: string, target?: string) => tourListeners.forEach((f) => f(text, target)) };

const load = (): Msg[] => { try { return JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch { return []; } };
const save = (m: Msg[]) => { try { sessionStorage.setItem(STORE, JSON.stringify(m.slice(-30))); } catch { /* private mode */ } };

/** Plain text as word spans, so each new word can light up as it streams in (keys stay stable while text grows). */
function words(text: string, key: string): ReactNode[] {
  return text.split(/(\s+)/).map((w, i) => (w.trim() ? <span key={`${key}.${i}`} className="w" style={{ '--i': i } as CSSProperties}>{w}</span> : w));
}

/** Tiny safe markdown: paragraphs, "- " / "* " bullets, **bold**, [label](url-or-item-id). No HTML is ever injected. */
function renderInline(text: string, onJump: (id: string) => void, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...words(text.slice(last, m.index), `${key}t${k}`));
    if (m[1]) out.push(<strong key={`${key}b${k}`}>{renderInline(m[1], onJump, `${key}b${k}.`)}</strong>);
    else if (/^https?:\/\//.test(m[3])) out.push(<a key={`${key}a${k}`} className="w" href={m[3]} target="_blank" rel="noreferrer">{m[2]}</a>);
    else { const id = m[3]; out.push(<button key={`${key}j${k}`} type="button" className="chat-jump w" onClick={() => onJump(id)}>{m[2]}</button>); }
    k++;
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...words(text.slice(last), `${key}t${k}`));
  return out;
}
function Markdown({ text, onJump }: { text: string; onJump: (id: string) => void }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{renderInline(l.replace(/^\s*[-*•]\s+/, ''), onJump, `${i}.${j}`)}</li>)}</ul>;
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{renderInline(l, onJump, `${i}.${j}`)}</span>)}</p>;
      })}
    </>
  );
}

/** A tappable card for something Nexus mentioned: jumps to it on the page. */
function Card({ e, onJump }: { e: Evidence; onJump: (id: string) => void }) {
  return (
    <button type="button" className="ev-card" onClick={() => onJump(e.id)}>
      <span className={`ev-ic${e.logo ? '' : ' txt'}`} aria-hidden="true">{e.logo ? <img src={e.logo} alt="" loading="lazy" /> : e.badge}</span>
      <span className="ev-body">
        <span className="ev-kind">{e.kind}</span>
        <b>{e.title}</b>
        {e.meta && <span className="ev-meta">{e.meta}</span>}
        {e.pct ? <span className="ev-bar"><i style={{ ['--v' as string]: `${e.pct}%` }} /></span> : null}
      </span>
      <span className="ev-go">Show →</span>
    </button>
  );
}

const cardsOf = (m: Msg) => [...new Set([...linkedIds(m.text), ...(m.shown ?? [])])].map(evidenceFor).filter((e): e is Evidence => !!e).slice(0, 3);

/**
 * Text chat with Nexus: same knowledge as the voice agent, streamed from /api/nexus-chat.
 * Answers light up word by word like the voice captions, and every page item Nexus mentions
 * becomes a card that jumps to it. Nexus can still move the page, open the resume and switch the theme.
 */
export default function Chat({ open, onClose, onShow, onTheme, getPage, onVoice, onLog, onTour }: {
  open: boolean;
  onClose: () => void;
  /** user = the visitor tapped a card/link (false = Nexus moved the page itself) */
  onShow: (target: string, user: boolean) => void;
  onTheme: (mode: 'light' | 'dark') => void;
  getPage: () => string;
  onVoice: () => void;
  onLog: () => void;
  onTour: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>(load);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { save(msgs); }, [msgs]);
  useEffect(() => {
    // tour stops are stored whole at once (nothing can cut them off) and typed out by CSS, word by word
    const onTour = (text: string, target?: string) => setMsgs((cur) => [...cur.map((m) => (m.typed ? { ...m, typed: false } : m)), { role: 'model', text, typed: true, shown: target && evidenceFor(target) ? [target] : undefined }]);
    tourListeners.add(onTour);
    return () => { tourListeners.delete(onTour); };
  }, []);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus({ preventScroll: true }), 350); }, [open]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [msgs, busy]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const jump = useCallback((id: string) => { onShow(id, true); }, [onShow]);

  const send = useCallback(async (text: string, base?: Msg[]) => {
    const t = text.trim();
    if (!t || busy) return;
    setDraft('');
    if (input.current) input.current.style.height = 'auto';
    const history: Msg[] = [...(base ?? msgs).filter((m) => !m.error), { role: 'user', text: t }];
    setMsgs([...history, { role: 'model', text: '' }]);
    setBusy(true); setPhase('Thinking…');
    const c0 = performance.now(); let firstTok = true;
    devlog.add('you', `chat: ${t.slice(0, 90)}`);
    const edit = (f: (last: Msg) => Msg) => setMsgs((cur) => { const n = cur.slice(); n[n.length - 1] = f(n[n.length - 1]); return n; });
    const append = (d: string) => edit((last) => ({ ...last, text: last.text + d }));
    const fail = (d: string) => setMsgs((cur) => { const n = cur.slice(); n[n.length - 1] = { role: 'model', text: d, error: true }; return n; });
    try {
      const r = await fetch('/api/nexus-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history.map(({ role, text: tx }) => ({ role, text: tx })), page: getPage() }),
      });
      if (r.status === 429) { const j = await r.json().catch(() => ({})); devlog.add('err', 'usage limit reached'); fail(j.error || 'Nexus is resting for now. Please email Yoosha directly.'); setBusy(false); setPhase(''); return; }
      if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as { t: string; d?: string; name?: string; args?: Record<string, string> };
          if (ev.t === 'text' && ev.d) { if (firstTok) { firstTok = false; setPhase('Answering…'); devlog.add('net', `first words in ${Math.round(performance.now() - c0)} ms (streaming)`); } append(ev.d); }
          else if (ev.t === 'meta') devlog.add('net', `chat model: ${(ev as { model?: string }).model}`);
          else if (ev.t === 'tool') devlog.add('tool', `${ev.name}(${JSON.stringify(ev.args ?? {})})`);
          if (ev.t === 'tool' && ev.name === 'show_on_page' && ev.args?.target) {
            const target = ev.args.target;
            setPhase(`Opening ${labelFor(target)}…`);
            edit((last) => ({ ...last, shown: [...(last.shown ?? []), target] }));
            onShow(target, false);
          }
          else if (ev.t === 'tool' && ev.name === 'start_tour') { setPhase('Starting the tour…'); onTour(); }
          else if (ev.t === 'tool' && ev.name === 'set_theme' && (ev.args?.mode === 'light' || ev.args?.mode === 'dark')) { setPhase('Switching the theme…'); onTheme(ev.args.mode); }
          else if (ev.t === 'error') { devlog.add('err', 'all models busy · showing retry'); fail(ev.d || 'Nexus could not answer just now.'); }
        }
      }
    } catch (e) {
      console.warn('[chat]', e);
      fail('Couldn\'t reach Nexus. Check your connection and try again.');
    }
    devlog.add('sys', `chat reply complete in ${Math.round(performance.now() - c0)} ms`);
    setBusy(false); setPhase('');
  }, [busy, msgs, getPage, onShow, onTheme, onTour]);

  const lastEmpty = busy && msgs[msgs.length - 1]?.role === 'model' && !msgs[msgs.length - 1].text;
  const asked = new Set(msgs.filter((m) => m.role === 'user').map((m) => m.text));
  const pick = (q: string) => { if (q === TOUR_CHIP) onTour(); else send(q); };

  return (
    <aside className={`chat${open ? ' open' : ''}`} role="dialog" aria-label="Chat with Nexus" aria-hidden={!open} inert={!open}>
      <header className="chat-head">
        <span id="blob-chat" className={`chat-orb${busy ? ' busy' : ''}`} aria-hidden="true" />
        <div className="chat-who"><b>Nexus</b><span className={busy ? 'chat-phase' : ''}>{busy ? phase || 'Thinking…' : 'Yoosha\'s AI agent · text chat'}</span></div>
        <button type="button" className="chat-voice" onClick={onVoice} title="Switch to a voice call">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>Talk
        </button>
        <button type="button" className="chat-x" onClick={onClose} aria-label="Close chat">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      <div className="chat-log" ref={log} aria-live="polite">
        <div className="msg model intro"><p>Hi! I'm Nexus, Yoosha's AI agent. Ask me anything about his work, in English or Hindi, or say "tour" and I'll walk you through it in a minute.</p></div>
        {!msgs.length && (
          <div className="chat-sugs">
            {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}
          </div>
        )}
        {msgs.map((m, i) => {
          if (m.role === 'model' && !m.text) return null;
          if (m.role === 'user') return <p key={i} className="msg user"><small>You asked</small>{m.text}</p>;
          const isLast = i === msgs.length - 1;
          const live = isLast && busy;
          const cards = m.error ? [] : cardsOf(m);
          const next = isLast && !busy && !m.error
            ? [...new Set([...(cards[0]?.follow ?? []), ...DEFAULT_NEXT])].filter((q) => !asked.has(q)).slice(0, 3)
            : [];
          return (
            <div key={i} className={`msg model${m.error ? (isOutOfService(m.text) ? ' notice' : ' error') : ''}${live ? ' live' : ''}${m.typed && isLast ? ' typed' : ''}`}>
              <Markdown text={m.text} onJump={jump} />
              {cards.length > 0 && <div className="ev">{cards.map((e) => <Card key={e.id} e={e} onJump={jump} />)}</div>}
              {next.length > 0 && <div className="chat-next">{next.map((q) => <button key={q} type="button" onClick={() => pick(q)}>{q}</button>)}</div>}
              {m.error && isLast && !busy && (isOutOfService(m.text)
                ? <span className="chat-contact"><a className="chat-retry" href={`mailto:${person.email}`}>Email Yoosha</a><a className="chat-retry" href={person.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a></span>
                : <button type="button" className="chat-retry" onClick={() => { const q = [...msgs].reverse().find((x) => x.role === 'user')?.text; if (q) send(q, msgs.slice(0, -2)); }}>Try again</button>
              )}
            </div>
          );
        })}
        {lastEmpty && <p className="chat-think" aria-label="Nexus is thinking"><span><i /><i /><i /></span>{phase || 'Thinking…'}</p>}
      </div>

      <ConsoleLine onOpen={onLog} tone="light" idle="send a message to see Nexus work" />
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <textarea ref={input} rows={1} value={draft} placeholder="Ask about his work…" aria-label="Message Nexus" maxLength={1500}
          onChange={(e) => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(140, e.target.scrollHeight)}px`; }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }} />
        <button type="submit" className="chat-send" disabled={!draft.trim() || busy} aria-label="Send">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
      <p className="chat-note">Answers come from Yoosha's portfolio · tap a card to see it on the page{msgs.length > 0 && <> · <button type="button" className="linkish" onClick={() => setMsgs([])}>clear chat</button></>}</p>
    </aside>
  );
}
