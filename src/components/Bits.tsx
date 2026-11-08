import { useEffect, useRef, useState } from 'react';
import type { Area } from '../content';

/** Counts up to a number (keeps its decimals and suffix) the first time it scrolls into view. */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const m = value.match(/^([^\d]*)([\d,.]+)(.*)$/);
  const target = m ? parseFloat(m[2].replace(/,/g, '')) : 0;
  const decimals = m && m[2].includes('.') ? m[2].split('.')[1].length : 0;
  const comma = !!m && m[2].includes(',');
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(m ? 0 : target);
  useEffect(() => {
    const el = ref.current;
    if (!m || !el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), dur = 1300;
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        setV(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0, rootMargin: "0px 0px 10% 0px" });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <span className={className}>{value}</span>;
  const n = comma ? Math.round(v).toLocaleString('en-IN') : v.toFixed(decimals);
  return <span ref={ref} className={className} aria-label={value}>{m[1]}{n}{m[3]}</span>;
}

/** Accuracy ring for research results. */
export function Ring({ pct }: { pct: number }) {
  const r = 44, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} className="ring-bg" />
      <circle cx="50" cy="50" r={r} className="ring-fg" style={{ strokeDasharray: c, ['--off' as string]: c * (1 - pct / 100) }} />
    </svg>
  );
}

/** Small generated cover art per expertise area. Pure SVG + CSS, no images to load. */
export function Cover({ area }: { area: Area }) {
  if (area === 'voice') {
    return (
      <svg viewBox="0 0 240 120" className="cover-svg" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => {
          const h = 18 + 70 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21));
          return <rect key={i} x={8 + i * 8.2} y={60 - h / 2} width="4" height={h} rx="2" style={{ animationDelay: `${(i % 7) * -0.17}s` }} />;
        })}
      </svg>
    );
  }
  if (area === 'llm') {
    const pts = [[40, 30], [40, 90], [110, 20], [110, 60], [110, 100], [190, 45], [190, 80]];
    const edges = [[0, 2], [0, 3], [1, 3], [1, 4], [2, 5], [3, 5], [3, 6], [4, 6], [0, 4], [2, 6]];
    return (
      <svg viewBox="0 0 240 120" className="cover-svg" aria-hidden="true">
        {edges.map(([a, b], i) => <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} style={{ animationDelay: `${i * 0.25}s` }} />)}
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 3 ? 9 : 6} style={{ animationDelay: `${i * 0.3}s` }} />)}
      </svg>
    );
  }
  if (area === 'vision') {
    return (
      <svg viewBox="0 0 240 120" className="cover-svg" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => <line key={'v' + i} className="grid" x1={i * 20 + 10} y1="0" x2={i * 20 + 10} y2="120" />)}
        {Array.from({ length: 6 }, (_, i) => <line key={'h' + i} className="grid" x1="0" y1={i * 20 + 10} x2="240" y2={i * 20 + 10} />)}
        <circle cx="128" cy="62" r="26" className="blobby" />
        <rect x="94" y="28" width="68" height="68" rx="4" className="box" />
        <line x1="0" y1="0" x2="240" y2="0" className="scan" />
      </svg>
    );
  }
  if (area === 'ml') {
    const d = 'M6 92 L30 80 L52 86 L74 60 L96 66 L118 44 L140 52 L162 30 L184 38 L206 18 L234 24';
    return (
      <svg viewBox="0 0 240 120" className="cover-svg" aria-hidden="true">
        {[30, 60, 90].map((y) => <line key={y} className="grid" x1="0" y1={y} x2="240" y2={y} />)}
        <path d={d + ' L234 120 L6 120 Z'} className="area" />
        <path d={d} className="trend" pathLength={1} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 120" className="cover-svg" aria-hidden="true">
      <rect x="24" y="14" width="192" height="96" rx="8" className="win" />
      <line x1="24" y1="32" x2="216" y2="32" className="grid" />
      {[36, 46, 56].map((x) => <circle key={x} cx={x} cy="23" r="3" className="dot3" />)}
      <rect x="38" y="44" width="70" height="10" rx="3" className="blk" />
      <rect x="38" y="62" width="110" height="6" rx="3" className="ln" />
      <rect x="38" y="74" width="90" height="6" rx="3" className="ln" />
      <rect x="150" y="44" width="52" height="52" rx="6" className="blk2" />
    </svg>
  );
}
