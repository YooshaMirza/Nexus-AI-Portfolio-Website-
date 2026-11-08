import { useEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'nexus-theme-hint';
const isPhone = () => matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
const seen = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return true; } };
const markSeen = () => { try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ } };

/** What to say, from the visitor's local time and the current theme. */
function copy(theme: Theme) {
  const h = new Date().getHours();
  const night = h >= 19 || h < 6;
  if (theme === 'light') {
    return night
      ? { title: 'It\'s night where you are', text: 'Dark mode is easier on the eyes. Want to switch?', go: 'Switch to dark', stay: 'Stay in light' }
      : { title: 'You\'re in light mode', text: 'There\'s a dark mode too, made for the night. Want a look?', go: 'Try dark mode', stay: 'Keep light' };
  }
  return night
    ? { title: 'You\'re in dark mode', text: 'Prefer the original look? Light mode is one tap away.', go: 'Try light mode', stay: 'Keep dark' }
    : { title: 'It\'s daytime where you are', text: 'Light mode reads better in daylight. Want to switch?', go: 'Switch to light', stay: 'Stay in dark' };
}

/**
 * A one-time suggestion (per visit) to try the other theme, worded by local time.
 * Waits for the phone desktop tip, and never shows over the chat, resume or tour.
 */
export default function ThemeHint({ theme, blocked, onSwitch }: { theme: Theme; blocked: boolean; onSwitch: (t: Theme, x: number, y: number) => void }) {
  const [due, setDue] = useState(false);
  const [show, setShow] = useState(false);
  const start = useRef(theme);
  const go = useRef<HTMLButtonElement>(null);

  // due after a few seconds of reading (later on phones, after the desktop-view tip)
  useEffect(() => {
    if (seen()) return;
    const t = setTimeout(() => setDue(true), isPhone() ? 22000 : 9000);
    return () => clearTimeout(t);
  }, []);
  // the visitor switched theme on their own: they've seen both, no need to suggest
  useEffect(() => { if (theme !== start.current && !show) { markSeen(); setDue(false); } }, [theme, show]);
  useEffect(() => {
    if (!due || blocked || seen()) return;
    setShow(true); markSeen();
    const t = setTimeout(() => setShow(false), 14000);
    return () => clearTimeout(t);
  }, [due, blocked]);
  useEffect(() => { if (blocked) setShow(false); }, [blocked]);

  const c = copy(start.current);
  const next: Theme = start.current === 'light' ? 'dark' : 'light';
  return (
    <div className={`th-hint${show ? ' on' : ''}`} role="status" aria-hidden={!show} inert={!show}>
      <span className="th-ic" aria-hidden="true">
        {next === 'dark'
          ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>
          : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>}
      </span>
      <p><b>{c.title}</b><span>{c.text}</span></p>
      <div className="th-ctl">
        <button ref={go} type="button" data-ask className="th-go" onClick={() => { const r = go.current?.getBoundingClientRect(); setShow(false); onSwitch(next, r ? r.left + r.width / 2 : innerWidth - 60, r ? r.top + r.height / 2 : 36); }}>{c.go}</button>
        <button type="button" data-ask onClick={() => setShow(false)}>{c.stay}</button>
      </div>
    </div>
  );
}
