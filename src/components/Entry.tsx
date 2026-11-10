import { useEffect, useRef, useState } from 'react';
import { jobs, papers, person, projects } from '../content';
import { experienceSplit } from '../experience';
import { frameHooks } from './Stage';

/**
 * Entry — "Meet Nexus". A full-screen welcome on the first visit in a tab. The one big tap it asks for
 * is also the gesture the browser needs before it lets Nexus speak, so Nexus talks the moment it opens.
 * The real blob (Stage) sits in #blob-entry while this is open, then flies into the hero.
 * Highlights from content.ts orbit it, so the first screen already says who Yoosha is.
 */
/** Nexus's silent first line, lit word by word like the site's live captions */
const SAY = "Hi, I'm Nexus. Tap enter and I'll show you around.".split(' ');
const MONTHS = experienceSplit(jobs).total;
const HIGHLIGHTS = [
  jobs[0].org,
  'InstaBus',
  `IEEE paper · ${papers[0].figure}`,
  'Voice agents',
  `${MONTHS} months experience`,
  `${projects.length} projects`,
  'Springer paper',
  'LLMs · MCP',
];

export default function Entry({ onEnter, onSkip, onUnlock }: {
  /** the visitor tapped to meet Nexus: start the call */
  onEnter: () => void;
  /** closed without voice; `declined` = they picked "Explore without voice" (not just scrolled / Esc) */
  onSkip: (declined: boolean) => void;
  /** mouse press: unlock audio now (Chrome only counts the press) */
  onUnlock: () => void;
}) {
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const done = useRef(false);
  const slot = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const mag = useRef<HTMLSpanElement>(null);

  const close = (x: number, y: number, then: () => void) => {
    if (done.current) return;
    done.current = true;
    setOrigin({ x: (x / innerWidth) * 100, y: (y / innerHeight) * 100 });
    setPhase('out');
    document.documentElement.classList.remove('entry-open', 'entry-hot'); // the blob starts flying to the hero now
    then();
  };
  const enter = (e: React.MouseEvent) => close(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2, onEnter);
  const skip = (declined: boolean, e?: { clientX: number; clientY: number }) => close(e?.clientX ?? innerWidth / 2, e?.clientY ?? innerHeight / 2, () => onSkip(declined));

  // open: lock the page behind. Only a click gets you in (Yoosha: visitors should meet Nexus first), so scrolling and Esc do nothing
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('entry-open');
    return () => { html.classList.remove('entry-open', 'entry-hot'); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // highlights orbit the blob on one tilted ring; the front half sits above the blob, the back half behind it
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bt = Array.from(back.current?.children ?? []) as HTMLElement[];
    const ft = Array.from(front.current?.children ?? []) as HTMLElement[];
    // the mouse: the blob leans toward it, the orbit tilts, the tags drift with depth, the button pulls toward the cursor
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced;
    let mx = 0, my = 0, px = 0, py = 0, cx0 = -999, cy0 = -999;
    const onMove = (e: PointerEvent) => {
      mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; cx0 = e.clientX; cy0 = e.clientY;
      root.current?.style.setProperty('--mx', `${e.clientX}px`); root.current?.style.setProperty('--my', `${e.clientY}px`);
      root.current?.classList.add('lit-on');
    };
    if (fine) addEventListener('pointermove', onMove, { passive: true });
    let mgx = 0, mgy = 0, t0 = -1;
    const hook = (t: number) => {
      if (done.current) return;
      if (t0 < 0) t0 = t;
      px += (mx - px) * 0.06; py += (my - py) * 0.06;
      if (slot.current) slot.current.style.transform = `translate(${(px * 26).toFixed(1)}px, ${(py * 16).toFixed(1)}px)`;
      const b = mag.current;
      if (b) {
        const r = b.getBoundingClientRect(), dx = cx0 - (r.left - mgx + r.width / 2), dy = cy0 - (r.top - mgy + r.height / 2);
        const near = fine && Math.hypot(dx, dy) < 170;
        mgx += ((near ? dx * 0.22 : 0) - mgx) * 0.15; mgy += ((near ? dy * 0.3 : 0) - mgy) * 0.15;
        b.style.transform = `translate(${mgx.toFixed(1)}px, ${mgy.toFixed(1)}px)`;
      }
      const s = slot.current?.getBoundingClientRect();
      if (!s) return;
      const cx = s.left + s.width / 2, cy = s.top + s.height / 2;
      const r = Math.min(s.width, s.height) * 0.31;
      const phone = innerWidth < 640;
      // phones: a rounder, taller orbit so the tags don't pile up side by side
      const R = r * (phone ? 1.45 : 1.75), ry = (phone ? 0.95 : 0.34) + py * 0.14, roll = (phone ? 0.1 : 0.16) + px * 0.1;
      const n = HIGHLIGHTS.length;
      for (let i = 0; i < n; i++) {
        // opening: each highlight flies out from the blob to its orbit, one after another
        const k0 = reduced ? 1 : Math.min(1, Math.max(0, (t - t0 - 0.5 - i * 0.09) / 0.7));
        const k = 1 - Math.pow(1 - k0, 3);
        const a = (i / n) * Math.PI * 2 + (reduced ? 0 : t * 0.16);
        const z = Math.sin(a), depth = (z + 1) / 2;
        const sc = 0.8 + depth * 0.3;
        const half = ((bt[i]?.offsetWidth ?? 0) * sc) / 2 + 8; // keep every tag fully on screen
        const x = Math.min(innerWidth - half, Math.max(half, cx + (Math.cos(a) * R + px * 22 * (0.3 + depth)) * k));
        const y = cy + (Math.sin(a) * R * ry - Math.cos(a) * R * roll + py * 14 * (0.3 + depth)) * k;
        const tf = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${(sc * (0.4 + 0.6 * k)).toFixed(3)})`;
        const op = ((0.35 + depth * 0.65) * k0).toFixed(3);
        for (const [el, show] of [[bt[i], z <= 0], [ft[i], z > 0]] as const) {
          if (!el) continue;
          el.style.transform = tf;
          el.style.opacity = show ? op : '0';
        }
      }
    };
    frameHooks.add(hook);
    return () => { frameHooks.delete(hook); removeEventListener('pointermove', onMove); };
  }, []);

  const tags = HIGHLIGHTS.map((h) => <span key={h} className="en-tag">{h}</span>);
  return (
    <>
      <div
        ref={root}
        className={`entry ${phase}`}
        style={{ '--ox': `${origin.x}%`, '--oy': `${origin.y}%` } as React.CSSProperties}
        data-ask
        role="dialog"
        aria-modal="true"
        aria-label="Welcome. Enter the website"
        onPointerDown={(e) => { if (e.pointerType === 'mouse' && !(e.target as Element).closest('.en-skip')) onUnlock(); }}
        onClick={(e) => { if (!(e.target as Element).closest('.en-skip')) enter(e); }}
        onTransitionEnd={(e) => { if (e.target === e.currentTarget && phase === 'out') (e.currentTarget as HTMLElement).style.display = 'none'; }}
      >
        <div className="en-tags" ref={back} aria-hidden="true">{tags}</div>
        <p className="en-kick"><span className="en-dot" aria-hidden="true" />Nexus is online</p>
        <div className="en-mid">
          <div id="blob-entry" ref={slot} className="en-blob" aria-hidden="true"><span className="blob-fallback" /></div>
          <p className="en-say">{SAY.map((w, i) => <span key={i} style={{ animationDelay: `${1.3 + i * 0.13}s` }}>{w} </span>)}</p>
        </div>
        <div className="en-copy">
          <h1 className="en-name">{person.name}</h1>
          <p className="en-line">AI engineer building production AI systems.</p>
          <span
            className="en-mag"
            ref={mag}
            onPointerEnter={() => document.documentElement.classList.add('entry-hot')}
            onPointerLeave={() => document.documentElement.classList.remove('entry-hot')}
            onFocus={() => document.documentElement.classList.add('entry-hot')}
            onBlur={() => document.documentElement.classList.remove('entry-hot')}
          >
            <button type="button" className="en-go" autoFocus>
              Enter website
              <span className="en-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
            </button>
          </span>
          <p className="en-note">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
            Nexus, his AI voice agent, greets you as you enter · sound on
          </p>
          <button type="button" className="en-skip" onClick={(e) => { e.stopPropagation(); skip(true, e); }}>Enter without voice</button>
        </div>
      </div>
      <div className={`en-tags en-front ${phase}`} ref={front} aria-hidden="true">{tags}</div>
    </>
  );
}
