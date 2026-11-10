import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { about, areaLabels, leadership, journey, jobs, openSource, papers, person, pillars, projects, sections, type Area } from './content';
import { NEEDS_KEY, NexusAgent, TEST_KEY_ENTRY, testKey, type PageContext, type VoiceAgent } from './agent/NexusAgent';
import { DemoAgent } from './agent/DemoAgent';
import Stage from './components/Stage';
import Dock from './components/Dock';
import { Caption } from './components/Caption';
import { CountUp, Cover, Ring } from './components/Bits';
import Resume, { loadDoc } from './components/Resume';
import OrbitTags from './components/OrbitTags';
import Portrait from './components/Portrait';
import ExperienceCounter from './components/ExperienceCounter';
import Chat from './components/Chat';
import DesktopHint from './components/DesktopHint';
import ThemeHint from './components/ThemeHint';
import Entry from './components/Entry';
import VisitCount from './components/VisitCount';
import { ContactTime, CopyEmail } from './components/ContactBits';
import DevLog from './components/DevLog';
import Tour from './components/Tour';
import GitHubPulse from './components/GitHubPulse';
import { devlog } from './agent/devlog';
// start fetching the resume when someone shows intent to open it
const warmResume = () => { loadDoc().catch(() => {}); };

const DEMO = new URLSearchParams(location.search).has('demo');
/** read once at load (React dev runs effects twice, so the URL can't be re-read after it is cleaned) */
const LINK_ACTION = ['chat', 'tour', 'resume'].find((k) => new URLSearchParams(location.search).has(k));
/**
 * The "Enter website" screen: once per browser tab, on the first page load. Its tap is the gesture the browser
 * needs for sound, so Nexus speaks right away. Skipped for direct links (/?chat, /?tour, /?resume) and ?demo;
 * ?entry always shows it (for testing).
 */
const ENTERED_KEY = 'nexus-entered';
const ENTRY = !LINK_ACTION && !DEMO && (new URLSearchParams(location.search).has('entry') || (() => { try { return sessionStorage.getItem(ENTERED_KEY) !== '1'; } catch { return true; } })());
const markEntered = () => { try { sessionStorage.setItem(ENTERED_KEY, '1'); } catch { /* private mode */ } };

type Theme = 'light' | 'dark';
const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
/** Switch theme; where supported the new theme spreads in a circle from (x, y). */
function applyTheme(next: Theme, x = innerWidth - 60, y = 36) {
  const run = () => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* private mode */ }
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', next === 'dark' ? '#060A16' : '#E6EBEF');
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { run(); return; }
  const vt = doc.startViewTransition(run);
  vt.ready.then(() => {
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
}
// The hero headline when Nexus isn't talking. It's about Yoosha, so it reads right even if Nexus never connects.
const IDLE_LINE = 'AI engineer building production AI systems.';
/**
 * When may Nexus start without the visitor pressing a Nexus button?
 * - VITE_NEXUS_AUTOSTART (dev only): '1' = start on load, '0' = ONLY the Talk / Ask buttons start it.
 * - Once a call has ended (visitor hung up, said bye, or the call dropped), nothing restarts it
 *   except an explicit Talk / Ask press. Remembered for this browser tab.
 */
const AUTO = import.meta.env.DEV ? (import.meta.env.VITE_NEXUS_AUTOSTART as string | undefined) : undefined;
const TAP_ANYWHERE = AUTO !== '0';
const ENDED_KEY = 'nexus-ended';
const readEnded = () => { try { return sessionStorage.getItem(ENDED_KEY) === '1'; } catch { return false; } };
const writeEnded = (v: boolean) => { try { if (v) sessionStorage.setItem(ENDED_KEY, '1'); else sessionStorage.removeItem(ENDED_KEY); } catch { /* private mode */ } };
const BOOT = ['Booting Nexus…', `Reading ${jobs.length} roles, ${projects.length} projects and ${papers.length} papers…`, TAP_ANYWHERE ? 'Nexus is online. Tap anywhere to talk.' : 'Nexus is ready. Press Talk to Nexus to start.'];

/** Short names for evidence chips. */
const shortLabel: Record<string, string> = {
  ...Object.fromEntries(jobs.map((j) => [j.id, j.org.split(',')[0]])),
  ...Object.fromEntries(projects.map((p) => [p.id, p.title.replace(/ voice platform| voice agent|, this voice agent/i, '')])),
  'paper-skin': 'IEEE paper', 'paper-brain': 'Springer paper', 'beyond-freelance': 'Freelance clients', 'oss-sellbird': 'Sellbird PR',
};
const evidenceKind = (id: string) => (id.startsWith('job-') ? 'role' : id.startsWith('paper-') ? 'paper' : id.startsWith('proj-') ? 'project' : id.startsWith('oss-') ? 'contribution' : 'work');
const svg = (d: string) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
/** freelance (briefcase), YouTube (play), campus roles (people) */
const BEYOND_ICONS = [
  svg('M4 8h16v11H4zM9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M4 13h16'),
  svg('M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM10 9l5 3-5 3z'),
  svg('M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a5.5 5.5 0 0 1 11 0M16 11a2.5 2.5 0 1 0 0-5M17.5 20H21a4.5 4.5 0 0 0-5-4.5'),
];
/** Live repo numbers from GitHub's public API (cached for an hour per visitor; falls back to the static values). */
function useGitHubRepo(repo: string) {
  const [data, setData] = useState<{ stars: number; forks: number } | null>(null);
  useEffect(() => {
    const key = `gh:${repo}`;
    try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && Date.now() - c.at < 3_600_000) { setData(c.d); return; } } catch { /* ignore */ }
    fetch(`https://api.github.com/repos/${repo}`).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!j || typeof j.stargazers_count !== 'number') return;
      const d = { stars: j.stargazers_count, forks: j.forks_count };
      setData(d);
      try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), d })); } catch { /* ignore */ }
    }).catch(() => {});
  }, [repo]);
  return data;
}
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
const LiveDot = ({ live }: { live: boolean }) => (live ? <span className="live-dot" title="Live from GitHub" /> : null);

const maxEvidence = Math.max(...pillars.map((p) => p.evidence.length));

/** Finds the most specific [data-ctx] element under the reading line (42% down the viewport). */
function readContext(): PageContext & { section: string } {
  const y = innerHeight * 0.42;
  let best: HTMLElement | null = null;
  document.querySelectorAll<HTMLElement>('[data-ctx]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top <= y && r.bottom >= y && (!best || best.contains(el))) best = el;
  });
  const el = (best ?? document.getElementById('intro')) as HTMLElement;
  const sec = el.closest('section') as HTMLElement | null;
  const secLabel = sections.find((s) => s.id === sec?.id)?.label ?? 'Intro';
  const label = el.dataset.label ?? secLabel;
  return { id: el.dataset.ctx ?? 'intro', label: label === secLabel ? secLabel : `${secLabel}, ${label}`, detail: el.dataset.detail, section: sec?.id ?? 'intro' };
}

/** Test builds only: paste a Gemini key on this device. */
function KeyForm({ onSaved, retry }: { onSaved: () => void; retry: boolean }) {
  const [v, setV] = useState(retry ? testKey.get() : '');
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, []);
  return (
    <form ref={ref} className="keyform" onSubmit={(e) => { e.preventDefault(); if (!v.trim()) return; testKey.set(v); onSaved(); }}>
      <label htmlFor="gkey">{retry ? 'Nexus couldn\'t connect with this key. Check it, or try again.' : 'Test mode: paste your Gemini API key. It stays in this browser only and is sent straight to Google.'}</label>
      <div className="keyrow">
        <input id="gkey" value={v} onChange={(e) => setV(e.target.value)} placeholder="AIza…" autoComplete="off" autoCapitalize="off" spellCheck={false} inputMode="text" />
        <button className="btn primary" type="submit" disabled={!v.trim()}>{retry ? 'Try again' : 'Save and talk'}</button>
      </div>
    </form>
  );
}

export default function App() {
  const agent: VoiceAgent = useMemo(() => (DEMO ? new DemoAgent() : new NexusAgent()), []);
  const st = useSyncExternalStore(agent.subscribe, agent.getState);
  const [ctx, setCtx] = useState<PageContext & { section: string }>({ id: 'intro', label: 'Intro', section: 'intro' });
  const [filter, setFilter] = useState<Area | 'all'>('all');
  const [boot, setBoot] = useState(0);
  const gh = useGitHubRepo(openSource[0].ghRepo);
  const [theme, setThemeState] = useState<Theme>(currentTheme);
  const setTheme = useCallback((t: Theme, x?: number, y?: number) => { applyTheme(t, x, y); setThemeState(t); }, []);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourMode, setTourMode] = useState<'silent' | 'voice' | 'chat'>('silent');
  const resumeRef = useRef(false);
  const endedRef = useRef(readEnded());
  const [entryOpen, setEntryOpen] = useState(ENTRY);
  const [ended, setEnded] = useState(endedRef.current);
  // any call that ends (hang-up button, "bye", dropped line) turns off tap-anywhere starts
  useEffect(() => {
    if (st.status !== 'ended') return;
    endedRef.current = true; setEnded(true); writeEnded(true);
  }, [st.status]);
  /** may a generic tap / page action start a call? */
  const mayAutoStart = () => TAP_ANYWHERE && !endedRef.current;
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const live = st.status === 'live';

  // Boot sequence in the status line
  useEffect(() => {
    const t = [setTimeout(() => setBoot(1), 700), setTimeout(() => setBoot(2), 1900)];
    return () => t.forEach(clearTimeout);
  }, []);

  // Track what the visitor is looking at, plus scroll-driven CSS vars
  useEffect(() => {
    let raf = 0;
    const root = document.documentElement;
    const update = () => {
      raf = 0;
      if (resumeRef.current) return;
      const c = readContext();
      if (c.id !== ctxRef.current.id) { setCtx(c); agent.setContext(c); }
      const max = root.scrollHeight - innerHeight;
      root.style.setProperty('--sp', (max > 0 ? scrollY / max : 0).toFixed(4));
      const tl = document.querySelector<HTMLElement>('.timeline');
      if (tl) {
        const r = tl.getBoundingClientRect();
        tl.style.setProperty('--fill', Math.min(1, Math.max(0, (innerHeight * 0.55 - r.top) / r.height)).toFixed(4));
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    update();
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [agent]);

  // Reveal-on-scroll for anything marked .reveal
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not([data-in])');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.setAttribute('data-in', '')); return; }
    // starts revealing a little before content scrolls in, so normal scrolling never shows blanks
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); } }), { rootMargin: '0px 0px 12% 0px', threshold: 0.01 });
    els.forEach((e) => io.observe(e));

    // scroll speed: above ~2 px/ms (a flick or fast wheel) switch to quick reveals for a moment
    const root = document.documentElement;
    let lastY = scrollY, lastT = performance.now(), raf = 0, calm = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const now = performance.now(), dy = Math.abs(scrollY - lastY), dt = Math.max(1, now - lastT);
        lastY = scrollY; lastT = now;
        if (dy / dt > 2) {
          root.classList.add('scroll-fast');
          // reveal everything already passed or about to appear, so nothing is left blank
          const limit = innerHeight * 1.25;
          document.querySelectorAll('.reveal:not([data-in])').forEach((el) => { if (el.getBoundingClientRect().top < limit) el.setAttribute('data-in', ''); });
          clearTimeout(calm);
          calm = window.setTimeout(() => root.classList.remove('scroll-fast'), 350);
        }
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); clearTimeout(calm); };
  }, [filter]);

  // Hero parallax for the floating tags (desktop pointers only)
  useEffect(() => {
    if (!matchMedia('(hover: hover)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = document.getElementById('blob-hero');
    const onMove = (e: PointerEvent) => {
      if (!el || scrollY > innerHeight) return;
      el.style.setProperty('--px', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
      el.style.setProperty('--py', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
    };
    addEventListener('pointermove', onMove, { passive: true });
    return () => removeEventListener('pointermove', onMove);
  }, []);

  // Cursor-lit grid: one rAF-throttled CSS variable update per frame, desktop pointers only
  useEffect(() => {
    if (!matchMedia('(hover: hover)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    let raf = 0, x = 0, y = 0;
    const onMove = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; root.style.setProperty('--cx', `${x}px`); root.style.setProperty('--cy', `${y}px`); root.classList.add('lit-on'); });
    };
    const onLeave = () => root.classList.remove('lit-on');
    addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => { removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); cancelAnimationFrame(raf); };
  }, []);

  // Cursor spotlight on cards (desktop)
  useEffect(() => {
    if (!matchMedia('(hover: hover)').matches) return;
    const onMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.spot');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    addEventListener('pointermove', onMove, { passive: true });
    return () => removeEventListener('pointermove', onMove);
  }, []);

  // In-site resume viewer. Nexus notices it opened and can talk about it.
  const RESUME_CTX = { id: 'resume', label: 'Resume', detail: 'The visitor is reading his resume in the in-site viewer.', section: 'resume' };
  const openResume = useCallback((fromNexus = false) => {
    if (resumeRef.current) return;
    resumeRef.current = true;
    setResumeOpen(true);
    document.documentElement.classList.add('resume-open');
    setCtx(RESUME_CTX);
    if (fromNexus) agent.setContext(RESUME_CTX);
    else if (agent.getState().status === 'live' || mayAutoStart()) agent.event('The visitor just opened the resume viewer.', RESUME_CTX);
    else agent.setContext(RESUME_CTX);
  }, [agent]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeResume = useCallback(() => {
    resumeRef.current = false;
    setResumeOpen(false);
    document.documentElement.classList.remove('resume-open');
    const c = readContext(); setCtx(c); agent.setContext(c);
  }, [agent]);

  // Text chat with Nexus. One mode at a time: opening chat ends a voice call.
  const openChat = useCallback(() => {
    const s = agent.getState().status;
    if (s === 'live' || s === 'connecting') agent.stop();
    setChatOpen(true);
    document.documentElement.classList.add('chat-open');
  }, [agent]);
  const closeChat = useCallback(() => {
    setChatOpen(false);
    document.documentElement.classList.remove('chat-open');
  }, []);

  // Nexus can move the page
  const show = useCallback((target: string) => {
    if (target === 'resume') { openResume(true); return; }
    if (resumeRef.current) closeResume();
    if (target.startsWith('proj-')) setFilter('all');
    requestAnimationFrame(() => {
      const t = document.querySelector<HTMLElement>(`[data-ctx="${target}"]`) ?? document.getElementById(target);
      if (!t) return;
      t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: target.length < 11 ? 'start' : 'center' });
      t.classList.remove('is-flash'); void t.offsetWidth; t.classList.add('is-flash');
    });
  }, [openResume, closeResume]);
  useEffect(() => { agent.onShow = show; }, [agent, show]);
  // 60-second guided tour (button, or Nexus via the start_tour tool)
  const startTour = useCallback((mode?: 'silent' | 'voice' | 'chat') => {
    if (resumeRef.current) closeResume();
    const m = mode ?? (agent.getState().status === 'live' ? 'voice' : chatOpen ? 'chat' : 'silent');
    if (innerWidth < 820 && m !== 'chat') closeChat();
    setTourMode(m);
    setTourOpen(true);
  }, [closeResume, closeChat, agent, chatOpen]);
  // Nexus may not pull the visitor out of the resume into the tour (starting the tour closes the resume)
  useEffect(() => { agent.onTour = () => { if (resumeRef.current) { devlog.add('sys', 'tour ignored: resume is open'); return; } startTour('voice'); }; }, [agent, startTour]);

  // Link shortcuts: /?chat opens the chat, /?tour starts the tour, /?resume opens the resume (the 404 page uses these)
  useEffect(() => {
    const want = LINK_ACTION;
    if (!want) return;
    const q = new URLSearchParams(location.search);
    ['chat', 'tour', 'resume'].forEach((k) => q.delete(k));
    history.replaceState(null, '', location.pathname + (q.toString() ? `?${q}` : '') + location.hash);
    const t = setTimeout(() => { if (want === 'chat') openChat(); else if (want === 'tour') startTour('silent'); else openResume(); }, 700);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Nexus can switch the theme; the reveal starts from the dock where Nexus lives
  useEffect(() => { agent.onTheme = (m) => setTheme(m, innerWidth / 2, innerHeight - 60); }, [agent, setTheme]);
  // Netlify's free plan adds a "Built with Netlify" badge in the bottom-right corner (it can't be switched off).
  // We don't touch it; we just lift the dock and the chat above it wherever they would collide.
  useEffect(() => {
    const check = () => {
      const f = document.getElementById('nl-badge-frame');
      const h = f ? f.getBoundingClientRect().height : 0;
      document.documentElement.classList.toggle('nl-badge', h > 0);
      if (h > 0) document.documentElement.style.setProperty('--nlb', `${Math.round(h)}px`);
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true });
    const t = setInterval(check, 3000); // the badge can also resize or appear late
    return () => { mo.disconnect(); clearInterval(t); };
  }, []);

  // Start Nexus on the first real gesture (browsers block sound before one)
  /** Explicit start: the Talk to Nexus buttons. Clears a previous hang-up. */
  const start = useCallback(() => {
    const s = agent.getState().status;
    if (s === 'live' || s === 'connecting') return;
    endedRef.current = false; setEnded(false); writeEnded(false);
    agent.start(ctxRef.current);
  }, [agent]);
  /** Implicit start: a tap anywhere on the page. Respects the flag and a previous hang-up. */
  const tapStart = useCallback(() => {
    if (!TAP_ANYWHERE || endedRef.current) return;
    const s = agent.getState().status;
    if (s === 'live' || s === 'connecting') return;
    agent.start(ctxRef.current);
  }, [agent]);
  const ask = useCallback((q: string) => {
    endedRef.current = false; setEnded(false); writeEnded(false);
    agent.ask(q, ctxRef.current);
  }, [agent]);

  useEffect(() => {
    agent.prefetch();
    if (DEMO && new URLSearchParams(location.search).has('autostart')) { start(); return; }
    // If this browser already lets the site play sound (returning visitor, some browsers), boot with no tap at all.
    // Local testing: VITE_NEXUS_AUTOSTART=1 in .env starts Nexus on load (dev server only, never in a production build).
    // Set it to 0 to turn auto-start off completely while testing.
    if (!ENTRY && !endedRef.current && (AUTO === '1' || (AUTO !== '0' && agent.autoplayAllowed()))) tapStart();
    // Open the live session while the visitor reads, so the first tap answers almost instantly.
    // Off when VITE_NEXUS_AUTOSTART=0 in dev, so nothing connects until you really tap.
    const warm = () => { if (TAP_ANYWHERE && !endedRef.current) agent.warm(); };
    const warmTimer = setTimeout(warm, 2500);
    const warmEvents = ['pointermove', 'touchstart'];
    warmEvents.forEach((ev) => addEventListener(ev, warm, { passive: true, once: true }));

    // Only a real tap / click / key starts Nexus. Scrolling (wheel, scrollbar drag, touch swipe) must not.
    let down: { x: number; y: number; t: number; sy: number } | null = null;
    const isBlocked = (el: EventTarget | null) => !(el instanceof Element) || el === document.documentElement || !!el.closest('a, .dock-ctl, form, [data-ask], input, textarea, select, .chat');
    const mayTapStart = () => TAP_ANYWHERE && !endedRef.current && !['live', 'connecting'].includes(agent.getState().status);
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now(), sy: scrollY };
      // Chrome only unlocks audio on the mouse PRESS, not on release, so get permission now (plays nothing).
      // Touch unlocks on release, which start() handles itself.
      if (e.pointerType === 'mouse' && mayTapStart() && !isBlocked(e.target)) agent.unlock();
    };
    const onUp = (e: PointerEvent) => {
      const d = down; down = null;
      if (!d || isBlocked(e.target)) return;
      const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || Math.abs(scrollY - d.sy) > 4;
      if (moved || performance.now() - d.t > 800) return; // a drag, swipe or long press, not a tap
      tapStart();
    };
    const onKey = (e: KeyboardEvent) => {
      // scrolling keys and modifiers don't count
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape'].includes(e.key)) return;
      if (isBlocked(e.target)) return;
      if (mayTapStart()) agent.unlock();
      tapStart();
    };
    const opts = { capture: true } as const;
    addEventListener('pointerdown', onDown, opts);
    addEventListener('pointerup', onUp, opts);
    addEventListener('keydown', onKey, opts);
    return () => {
      clearTimeout(warmTimer);
      warmEvents.forEach((ev) => removeEventListener(ev, warm));
      removeEventListener('pointerdown', onDown, opts);
      removeEventListener('pointerup', onUp, opts);
      removeEventListener('keydown', onKey, opts);
    };
  }, [agent, tapStart]);

  const viewing = (id: string) => (live && ctx.id === id ? ' is-viewing' : '');
  const featured = projects.filter((p) => p.featured);
  const archive = projects.filter((p) => !p.featured && (filter === 'all' || p.area === filter));
  const statusLine = live
    ? (agent.speaking() || st.nexusText ? 'Nexus, Yoosha\'s voice agent, is speaking' : 'Nexus is listening')
    : st.status === 'connecting' ? 'Connecting to Nexus…'
    : st.status === 'error' ? (st.error === NEEDS_KEY ? 'Nexus needs a key to start (test mode)' : st.error)
    : st.status === 'ended' || ended ? 'Nexus is off. Press Talk to Nexus whenever you want it back.'
    : BOOT[boot];

  return (
    <>
      <Stage agent={agent} />
      <div className="lit" aria-hidden="true" />
      <a className="skip" href="#work">Skip to content</a>
      <header className="nav">
        <a href="#intro" className="me"><span className="me-dot" aria-hidden="true" />{person.name}</a>
        <nav aria-label="Sections">
          {sections.slice(1).map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={ctx.section === s.id ? 'true' : undefined}>{s.label}</a>
          ))}
        </nav>
        <div className="nav-end">
        <button data-ask className="theme-btn" onClick={(e) => setTheme(theme === 'dark' ? 'light' : 'dark', e.clientX, e.clientY)} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" /></svg>
          <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" /></svg>
        </button>
        <button data-ask className="nav-cv" onPointerEnter={warmResume} onTouchStart={warmResume} onFocus={warmResume} onClick={() => openResume()}>Resume</button>
        </div>
        <span className="progress" aria-hidden="true" />
      </header>

      <main>
        <section id="intro" className="hero wrap" data-ctx="intro">
          <div className="hero-copy">
            <p className={`speaker${boot < 2 && st.status === 'idle' ? ' booting' : ''}`}>
              <span className={`pulse ${live ? 'on' : st.status === 'idle' && boot === 2 ? 'ready' : ''}`} aria-hidden="true" />
              <span key={statusLine} className="speaker-text">{statusLine}</span>
            </p>
            <Caption agent={agent} idleText={IDLE_LINE} className="hero-caption" boot />
            <p className={`visitor-line ${st.visitorText ? 'on' : ''}`} aria-live="polite">{st.visitorText ? `You: ${st.visitorText}` : ' '}</p>
            <button data-ask className="tour-launch" onClick={() => startTour()}>
              <span className="tl-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
              <span className="tl-text"><b>Take the 60-second tour</b><small>Nexus walks you through his work · silent, with voice, or in chat</small></span>
            </button>
          </div>
          <div id="blob-hero" className="hero-blob" aria-hidden="true">
            <span className="blob-fallback" />
            <span className="sat s1" /><span className="sat s2" /><span className="sat s3" />
            <OrbitTags />
          </div>
          {TEST_KEY_ENTRY && st.status === 'error' && <KeyForm key={st.error} retry={st.error !== NEEDS_KEY} onSaved={() => agent.start(ctxRef.current)} />}
          <div className="hero-foot">
            <h1 className="intro-line"><strong>{person.name}</strong> is an AI forward deployed engineer at Weya.ai, building real-time voice agents, LLM pipelines, computer vision and agentic AI with MCP.</h1>
            <div className="ctas">
              {live ? (
                <button className="btn primary" onClick={() => agent.stop()}><span className="dot" />End call</button>
              ) : (
                <button className="btn primary" onClick={start}><span className="dot" />{st.status === 'connecting' ? 'Connecting…' : 'Talk to Nexus'}</button>
              )}
              <button data-ask className="btn" onClick={openChat}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" /></svg>
                Chat
              </button>
              <button data-ask className="btn" onPointerEnter={warmResume} onTouchStart={warmResume} onFocus={warmResume} onClick={() => openResume()}>View resume</button>
            </div>
          </div>
          <ul className="stats">
            <li><CountUp value={String(jobs.length)} className="stat-n" /><span>roles, from research labs to Weya.ai</span></li>
            <li><CountUp value={String(projects.length)} className="stat-n" /><span>projects across voice, LLMs, vision and ML</span></li>
            <li><CountUp value="97.1%" className="stat-n" /><span>best accuracy in his medical imaging research</span></li>
            <li><CountUp value="#409" className="stat-n" /><span>of 30,000+ teams in the Amazon ML Challenge</span></li>
          </ul>
        </section>

        <section id="expertise" className="band band-paper" data-ctx="expertise" data-title="Expertise">
          <div className="wrap">
          <div className="sec-head reveal"><div className="sec-title"><span className="sec-idx">01 / 08</span><h2>Expertise</h2></div><p>Worked out from his roles, projects and papers. Each meter counts the work that proves it; tap any piece of evidence to jump to it.</p></div>
          <div className="pillars">
            {pillars.map((p, i) => (
              <article key={p.id} className={`pillar spot reveal area-${p.area}${i === 0 ? ' lead' : ''}${viewing(p.id)}`} data-ctx={p.id} data-label={p.title} data-detail={p.line} style={{ ['--d' as string]: `${i * 70}ms` }}>
                {i === 0 && <div className="pillar-cover"><Cover area="voice" /></div>}
                <div className="pillar-top">
                  <span className="p-idx">0{i + 1}</span>
                  <span className="p-area">{areaLabels[p.area]}</span>
                </div>
                <h3>{p.title}</h3>
                <p className="p-line">{p.line}</p>
                <div className="meter" aria-hidden="true"><i style={{ ['--v' as string]: p.evidence.length / maxEvidence }} /></div>
                <p className="p-count">{p.evidence.length} pieces of evidence: {['role', 'project', 'paper', 'contribution'].map((k) => { const n = p.evidence.filter((e) => evidenceKind(e) === k).length; return n ? `${n} ${k}${n > 1 ? 's' : ''}` : null; }).filter(Boolean).join(', ')}</p>
                <ul className="evidence">
                  {p.evidence.map((e) => <li key={e}><button onClick={() => show(e)} data-kind={evidenceKind(e)}>{shortLabel[e] ?? e}</button></li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
        </section>

        <section id="work" className="band band-fog" data-ctx="work" data-title="Work">
          <div className="wrap">
          <div className="sec-head reveal"><div className="sec-title"><span className="sec-idx">02 / 08</span><h2>Work</h2></div><p>From deep-learning research internships to shipping voice agents that answer real phone calls.</p></div>
          <ol className="jobs timeline">
            {jobs.map((j) => (
              <li key={j.id} className={`job reveal${j.current ? ' current' : ''}${viewing(j.id)}`} data-ctx={j.id} data-label={`${j.role} at ${j.org}`}>
                <span className="when"><span className="node" aria-hidden="true" />{j.when}</span>
                <div className="what">
                  <h3>{j.role}{j.current && <span className="now">Now</span>}</h3>
                  <p className="org">
                    <span className="org-pill">{j.logo ? <img className={`org-logo${j.logoWide ? ' wide' : ''}`} src={j.logo} alt="" width={j.logoWide ? 69 : 24} height={24} loading="lazy" /> : <span className="org-mark" aria-hidden="true">{j.org.replace(/[^A-Za-z]/g, '').slice(0, 1)}</span>}{j.org}</span>
                    <span className="job-type">{j.type}</span>
                  </p>
                  {j.stages && (
                    <ol className="promo" aria-label={j.progression ?? `Roles at ${j.org}`}>
                      {j.stages.map((st, k) => (
                        <li key={st.title} className={k === j.stages!.length - 1 ? 'promo-now' : ''}>
                          {k > 0 && <span className="promo-arrow" aria-hidden="true"><i />{st.note ? 'converted' : ''}<i /></span>}
                          <span className="promo-step"><b>{st.title}</b><small>{st.type} · {st.when} · {st.months} mo</small></span>
                        </li>
                      ))}
                    </ol>
                  )}
                  <p>{j.text}</p>
                  {j.highlights && <ul className="job-hl">{j.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
                  <ul className="tags">{j.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
        </section>

        <section id="projects" className="band band-paper" data-ctx="projects" data-title="Projects">
          <div className="wrap">
          <div className="sec-head reveal"><div className="sec-title"><span className="sec-idx">03 / 08</span><h2>Projects</h2></div><p>{live ? 'The highlighted card is the one you\'re looking at. Nexus sees it too.' : 'Production systems, research and side projects. The big cards are the ones he is proudest of.'}</p></div>
          <div className="bento">
            {featured.map((p, i) => (
              <article key={p.id} className={`card spot reveal area-${p.area}${i === 0 || p.id === 'proj-skin' ? ' wide' : ''}${viewing(p.id)}`} data-ctx={p.id} data-label={p.title} data-detail={p.text} style={{ ['--d' as string]: `${(i % 3) * 70}ms` }}>
                <div className="cover"><Cover area={p.area} />{p.metric && <span className="metric"><CountUp value={p.metric.value} /><small>{p.metric.label}</small></span>}</div>
                <div className="card-body">
                  <p className="kind">{p.kind}</p>
                  <h3>{p.title}</h3>
                  <p className="card-text">{p.text}</p>
                  {p.detail && <p className="card-detail">{p.detail}</p>}
                  <ul className="tags">{p.stack.map((t) => <li key={t}>{t}</li>)}</ul>
                  <p className="card-links">
                    {p.demo && <a className="demo-btn" href={p.demo} target="_blank" rel="noreferrer">Show demo <span aria-hidden="true">↗</span></a>}
                    {p.id === 'proj-nexus' && <button type="button" data-ask className="demo-btn" onClick={() => setLogOpen(true)}>Watch Nexus think</button>}
                    {!p.company && p.links?.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} <span aria-hidden="true">↗</span></a>)}
                    {(p.company || !p.links?.length) && <button data-ask className="linkish ask-inline" onClick={() => ask(`Tell me more about ${p.title}`)}>Company project. Ask Nexus about it</button>}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="archive-head reveal">
            <h3>More projects</h3>
            <div className="filters" role="group" aria-label="Filter projects">
              {(['all', ...Object.keys(areaLabels)] as (Area | 'all')[]).map((a) => (
                <button key={a} aria-pressed={filter === a} onClick={() => setFilter(a)}>{a === 'all' ? 'All' : areaLabels[a]}</button>
              ))}
            </div>
          </div>
          <ul className="archive">
            {archive.map((p, i) => (
              <li key={p.id} className={`arch spot reveal area-${p.area}${viewing(p.id)}`} data-ctx={p.id} data-label={p.title} data-detail={p.text} style={{ ['--d' as string]: `${(i % 3) * 50}ms` }}>
                <div className="arch-top">
                  <span className="arch-area"><i aria-hidden="true" />{areaLabels[p.area]}</span>
                  {p.metric ? <span className="arch-metric">{p.metric.value}</span> : p.company ? <span className="arch-company">Company</span> : null}
                </div>
                <h4>{p.title}</h4>
                <p>{p.text}</p>
                <div className="arch-foot">
                  <span className="arch-stack">{p.stack.slice(0, 3).join(' · ')}</span>
                  <span className="arch-links">
                    {p.demo && <a href={p.demo} target="_blank" rel="noreferrer">Demo ↗</a>}
                    {!p.company && p.links?.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label === 'Live demo' ? 'Demo' : l.label} ↗</a>)}
                  </span>
                </div>
              </li>
            ))}
            {!archive.length && <li className="arch empty muted">Nothing else in this area. The featured cards above cover it.</li>}
          </ul>
        </div>
        </section>

        <section id="opensource" className="band band-fog" data-ctx="opensource" data-title="Open source">
          <div className="wrap">
          <div className="sec-head reveal"><div className="sec-title"><span className="sec-idx">04 / 08</span><h2>Open source</h2></div><p>Contributions merged into public projects that other developers rely on.</p></div>
          <GitHubPulse />
          {openSource.map((o) => (
            <article key={o.id} className={`oss-card reveal${viewing(o.id)}`} data-ctx={o.id} data-label={`Open source: ${o.repo}`} data-detail={`${o.pr}, ${o.merged}: ${o.title}`}>
              <header className="oss-head">
                <div>
                  <p className="oss-repo-name">
                    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.71 1.71.75.75 0 0 1-1.07 1.05A2.5 2.5 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.71A2.49 2.49 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.09a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" /></svg>
                    {o.repo}
                    {o.formerly && <span className="oss-formerly">formerly {o.formerly}</span>}
                  </p>
                </div>
                <span className="oss-badges2">
                  <span className="stars-badge"><LiveDot live={!!gh} />{gh ? compact(gh.stars) : o.stars}★ on GitHub</span>
                  <span className="merged-badge"><svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M5.45 5.15A3.25 3.25 0 0 0 8.5 7.5h1.07a2.25 2.25 0 1 1 0 1.5H8.5a4.74 4.74 0 0 1-3.25-1.29v3.92a2.25 2.25 0 1 1-1.5 0V5.37a2.25 2.25 0 1 1 1.7-.22ZM4.5 13.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm7.25-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM4.5 3.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" /></svg>Merged</span>
                </span>
              </header>
              {/* compact on purpose: the GitHub strip above carries the big numbers */}
              <p className="oss-line"><b>{o.pr}</b> · {o.title}</p>
              <p className="oss-about">
                An open-source AI outreach agent. His PR lets users send drafted emails from their own Gmail in one click, track manual sends, and watch a live pipeline status panel, shipped with tests.
              </p>
              <p className="oss-links">{o.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</p>
            </article>
          ))}
          </div>
        </section>

        <section id="leadership" className="band band-paper" data-ctx="leadership" data-title="Leadership">
          <div className="wrap">
          <div className="sec-head reveal"><div className="sec-title"><span className="sec-idx">05 / 08</span><h2>Leadership &amp; community</h2></div><p>The other side of his work: roles his batch and his college trusted him with, and the people he teaches and builds for.</p></div>

          <article className="lead-track reveal" aria-label="Leadership roles, 2022 to 2026">
            <div className="lt-axis" aria-hidden="true">{[2022, 2023, 2024, 2025, 2026].map((y) => <span key={y} style={{ left: `${((y - 2022) / 4.5) * 100}%` }}>{y}</span>)}</div>
            <ul className="lt-rows">
              {leadership.map((r, i) => (
                <li key={r.id} className={`lt-row${viewing(r.id)}`} data-ctx={r.id} data-label={`${r.title}, ${r.org}`} data-detail={`${r.span}: ${r.text}`} style={{ ['--d' as string]: `${i * 160}ms` }}>
                  <div className="lt-label">
                    <p className="lt-title">{r.title}</p>
                    <p className="lt-org">{r.org}</p>
                  </div>
                  <div className="lt-lane">
                    <span className="lt-bar" style={{ left: `${((r.from - 2022) / 4.5) * 100}%`, width: `${((r.to - r.from) / 4.5) * 100}%` }}><b>{r.span}</b></span>
                  </div>
                  <p className="lt-text">{r.text}</p>
                </li>
              ))}
            </ul>
          </article>

          <div className="lead-grid">
            {about.beyond.map((b, i) => (
              <article key={b.id} className="ab-card lead-card reveal" data-ctx={b.id} data-label={b.title} data-detail={b.text} style={{ ['--d' as string]: `${i * 80}ms` }}>
                <span className="beyond-ic" aria-hidden="true">{BEYOND_ICONS[i] ?? BEYOND_ICONS[0]}</span>
                <p className="beyond-title">{b.title}<span>{b.when}</span></p>
                <p className="beyond-text">{b.text}</p>
                {'href' in b && b.href && <a className="lead-link" href={b.href} target="_blank" rel="noreferrer">{b.cta} ↗</a>}
              </article>
            ))}
            <article className="ab-card lead-card reveal" data-ctx="about-recognition" data-label="Competitions" style={{ ['--d' as string]: '160ms' }}>
              <p className="ab-label">Competitions</p>
              <div className="recog">
                <div><b><CountUp value="#409" /></b><span className="recog-of">of 30,000+ teams</span><p>Amazon ML Challenge 2024 <em>top 1.4%</em></p></div>
                <div><b>10th</b><span className="recog-of">of 100 teams</span><p>HackEye Hackathon 2022</p></div>
              </div>
            </article>
          </div>
          </div>
        </section>

        <section id="research" className="band band-dark" data-ctx="research" data-title="Research">
          <div className="wrap">
          <div className="sec-head reveal"><div className="sec-title"><span className="sec-idx">06 / 08</span><h2>Research</h2></div><p>Custom CNNs for medical imaging that beat larger pre-trained models.</p></div>
          <div className="papers">
            {papers.map((p, i) => {
              const pub = p.status === 'Published';
              const [pre, ...rest] = p.abstract[0].split(p.figure);
              return (
                <article key={p.id} className={`sheet reveal${viewing(p.id)}`} data-ctx={p.id} data-label={p.title} data-detail={`${p.figure} ${p.figureLabel}, ${p.venue}.`} style={{ ['--d' as string]: `${i * 90}ms` }}>
                  <div className="sh-run">
                    <span><b>{p.venue.split(',')[0]}</b> · {pub ? (p.date ?? p.venue) : 'Accepted, in publication'}</span>
                    <span className={`sh-stamp${pub ? ' pub' : ''}`}>{pub ? 'Published' : 'In press'}</span>
                  </div>
                  <h3>{p.href ? <a href={p.href} target="_blank" rel="noreferrer">{p.title}</a> : p.title}</h3>
                  <p className="sh-auth">{person.name}</p>
                  <p className="sh-aff">Bennett University, Greater Noida, India</p>
                  <p className="sh-abs"><em>Abstract</em>—{pre}{rest.length ? <><mark>{p.figure}</mark>{rest.join(p.figure)}</> : null}</p>
                  <p className="sh-terms"><em>Index Terms</em>—{p.methods.join(', ')}.</p>
                  <div className="sh-cols">
                    <figure>
                      <div className="sh-fig">
                        {p.classNames
                          ? <ul className="p2-tiles">{p.classNames.map((n, k) => <li key={n} style={{ ['--k' as string]: k }}>{n}</li>)}</ul>
                          : <div className="p2-dots">{Array.from({ length: p.classes }, (_, k) => <i key={k} style={{ ['--k' as string]: k }} />)}</div>}
                      </div>
                      <figcaption><b>Fig. 1.</b> {p.classNames ? `The ${p.classes} MRI classes the model separates.` : `Each dot is one of the ${p.classes} skin conditions it tells apart.`}</figcaption>
                    </figure>
                    <div>
                      <table className="sh-table">
                        <caption>Table I · Test accuracy</caption>
                        <thead><tr><th>Model</th><th className="num">Accuracy</th></tr></thead>
                        <tbody><tr><td>Custom CNN (ours)</td><td className="num"><CountUp value={p.figure} /></td></tr></tbody>
                      </table>
                      <p className="sh-vs">Compared against <i>{p.baselines.join(', ')}</i> on the same data.</p>
                    </div>
                  </div>
                  <div className="sh-foot">
                    {p.href ? <a href={p.href} target="_blank" rel="noreferrer">Read on IEEE Xplore ↗</a> : <span>Link coming once Springer publishes it</span>}
                    <span className="sh-pg">{i + 1}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        </section>

        <section id="about" className="band band-paper" data-ctx="about" data-title="About">
          <div className="wrap">
          <div className="sec-head reveal"><div className="sec-title"><span className="sec-idx">07 / 08</span><h2>About</h2></div><p>The person behind the work: how he got here, what he studied, and what he does beyond the job.</p></div>
          <div className="about-hero">
            <Portrait />
            <div className="about-intro reveal">
              <p className="ab-label">Meet Yoosha</p>
              <h3 className="about-title">Engineer, researcher and teacher, building with AI since his first year of college.</h3>
              <p className="about-text">He ships production voice agents and the AI systems behind them, from telephony and speech pipelines to RAG, MCP agents and computer vision. Before Weya.ai he architected InstaBus at Neurabit, and his medical-imaging research is published in IEEE Xplore.</p>
              <div className="about-ctas">
                <a className="btn primary" href={person.upwork} target="_blank" rel="noreferrer">Hire me on Upwork</a>
                <button data-ask className="btn" onPointerEnter={warmResume} onFocus={warmResume} onClick={() => openResume()}>View resume</button>
              </div>
            </div>
          </div>

          <ol className="journey reveal" aria-label="Journey">
            {journey.map((j, i) => <li key={j.year} style={{ ['--d' as string]: `${i * 90}ms` }}><span className="j-year">{j.year}</span><span className="j-text">{j.text}</span></li>)}
          </ol>

          <div className="about-bento">
            <article className="ab-card ab-edu reveal" data-ctx="about-education" data-label="Education">
              <p className="ab-label">Education</p>
              <ul className="edu-list">
                {about.education.map((e) => (
                  <li key={e.id}>
                    <div className="edu-ring"><Ring pct={e.pct} /><b><CountUp value={e.score} /></b></div>
                    <p className="edu-unit">{e.unit}</p>
                    <p className="edu-title">{e.title}</p>
                    {(e.org || e.when) && <p className="edu-meta">{[e.org, e.when].filter(Boolean).join(' · ')}</p>}
                  </li>
                ))}
              </ul>
            </article>

            <article className="ab-card ab-skills reveal" data-ctx="about-skills" data-label="Skills" style={{ ['--d' as string]: '80ms' }}>
              <p className="ab-label">Skills</p>
              <div className="skill-groups">
                {about.skills.map((g) => (
                  <div key={g.group}><p className="skill-group">{g.group}</p><ul className="tags">{g.items.map((i) => <li key={i}>{i}</li>)}</ul></div>
                ))}
              </div>
            </article>
          </div>
        </div>
        </section>

        <section id="contact" className="band band-dark contact" data-ctx="contact" data-title="Contact">
          <div className="wrap">
          <p className="eyebrow reveal"><span className="sec-idx">08 / 08</span> Contact</p>
          <h2 className="reveal">Have a call that an agent should take?</h2>
          <p className="contact-sub reveal">Hiring, a freelance project or a voice agent idea.</p>
          <ContactTime />
          <div className="mail-row reveal">
            <a className="mail" href={`mailto:${person.email}`}>{person.email}</a>
            <CopyEmail email={person.email} />
          </div>
          <div className="contact-ctas reveal">
            <a className="btn primary" href={`mailto:${person.email}`}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>
              Email Yoosha
            </a>
            <a className="btn" href={person.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="btn" href={person.upwork} target="_blank" rel="noreferrer">Hire on Upwork</a>
          </div>
          <button data-ask className="contact-ask reveal" onClick={() => ask('How can I work with Yoosha?')}>
            <span className="ca-dot" aria-hidden="true" />Not sure where to start? Ask Nexus how to work with him →
          </button>
          <div className="contact-links reveal">
            <a href={`tel:${person.phone.replace(/\s/g, '')}`}>{person.phone}</a>
            {person.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
          </div>
        </div>
        </section>
      </main>
      <footer className="foot-band"><div className="wrap foot">
        <span>© {new Date().getFullYear()} {person.name}</span>
        <VisitCount />
        <span>Nexus runs on Gemini Live. Voice is processed by Google while you talk and isn't stored by this site.</span>
        {TEST_KEY_ENTRY && <button className="linkish" onClick={() => { testKey.clear(); location.reload(); }}>Forget test key</button>}
      </div></footer>

      <ExperienceCounter />
      {!entryOpen && <DesktopHint />}
      {/* mounted after the entry screen closes, so its countdown starts from there */}
      {!entryOpen && <ThemeHint theme={theme} blocked={chatOpen || resumeOpen || tourOpen} onSwitch={setTheme} />}
      {entryOpen && (
        <Entry
          onUnlock={() => agent.unlock()}
          onEnter={() => { markEntered(); start(); setTimeout(() => setEntryOpen(false), 900); }}
          onSkip={(declined) => {
            // "Explore without voice" means it: a stray tap later must not start talking. Talk to Nexus still works.
            markEntered();
            if (declined) { endedRef.current = true; setEnded(true); writeEnded(true); }
            setTimeout(() => setEntryOpen(false), 900);
          }}
        />
      )}
      <DevLog open={logOpen} onClose={() => setLogOpen(false)} />
      <Tour open={tourOpen} mode={tourMode} onMode={setTourMode} onClose={() => setTourOpen(false)} agent={agent} show={show} onVoice={start} onChat={openChat} />
      <Resume open={resumeOpen} onClose={closeResume} />
      <Chat open={chatOpen} onClose={closeChat}
        onShow={(t, user) => {
          // phones: the chat covers the page, so only a tapped card/link jumps (and closes the chat); Nexus may still open the resume
          if (innerWidth < 820 && !user && t !== 'resume') return;
          show(t); if (innerWidth < 820 && t !== 'resume') closeChat();
        }}
        onTheme={(m) => setTheme(m, innerWidth - 220, 120)}
        getPage={() => ctxRef.current.label}
        onVoice={() => { closeChat(); start(); }} onLog={() => setLogOpen((v) => !v)} onTour={() => startTour('chat')} />
      <Dock agent={agent} seeing={ctx.label} onStart={start} onChat={openChat} onLog={() => setLogOpen(true)} />
    </>
  );
}
