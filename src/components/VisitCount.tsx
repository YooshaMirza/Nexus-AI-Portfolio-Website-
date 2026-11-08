import { useEffect, useState } from 'react';

const KEY = 'nexus-visited';
/** Small numbers look weak (he asked for this with the GitHub stats too), so production hides the line until then. */
const SHOW_FROM = import.meta.env.DEV ? 0 : 100;
let once: Promise<{ count: number; since: string } | null> | undefined;

/** Counts this browser's first visit and reads the total, once per page load (React dev runs effects twice). */
function load() {
  once ??= (async () => {
    let first = false;
    try { first = localStorage.getItem(KEY) !== '1'; } catch { /* private mode: counts as a read only */ }
    const r = await fetch('/api/visits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ first }) });
    if (!r.ok) return null;
    const j = await r.json();
    if (first) try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    return typeof j.count === 'number' ? j : null;
  })().catch(() => null);
  return once;
}

/** "1,234 visitors since Nov 2026", counted on the server from launch day. */
export default function VisitCount() {
  const [v, setV] = useState<{ count: number; since: string } | null>(null);
  useEffect(() => { load().then(setV); }, []);
  if (!v || v.count < SHOW_FROM) return null;
  const since = new Date(v.since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  return (
    <span className="visits">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
      <b>{v.count.toLocaleString('en-IN')}</b> {v.count === 1 ? 'visitor' : 'visitors'} since {since}
    </span>
  );
}
