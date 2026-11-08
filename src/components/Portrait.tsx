import { useEffect, useRef } from 'react';
import { jobs, person } from '../content';

const PHOTO = '/me/yoosha.webp';

/**
 * 3D portrait for About: one rigid object that tilts toward the pointer. Each layer sits at a real
 * distance (translateZ) from the card, so the browser's perspective gives physically correct depth:
 * card at the back, photo just in front, labels nearest. Natural colour, nothing warped. Sways when idle.
 */
export default function Portrait() {
  const root = useRef<HTMLDivElement>(null);
  const current = jobs.find((j) => j.current);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tx = 0, ty = 0, x = 0, y = 0, last = 0, raf = 0, visible = false;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      last = performance.now();
    };
    const tick = (now: number) => {
      if (now - last > 2500) { tx = Math.sin(now / 2100) * 0.4; ty = Math.cos(now / 2700) * 0.2 - 0.1; } // idle sway
      x += (tx - x) * 0.07; y += (ty - y) * 0.07;
      el.style.setProperty('--mx', x.toFixed(3));
      el.style.setProperty('--my', y.toFixed(3));
      if (visible) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !reduced;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    addEventListener('pointermove', onMove, { passive: true });
    return () => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); };
  }, []);

  return (
    <div ref={root} className="portrait" role="img" aria-label={`Photo of ${person.name}`}>
      <div className="pt-tilt">
        <div className="pt-card">
          <span className="pt-grid" />
        </div>
        <img className="pt-person" src={PHOTO} alt="" width={800} height={800} decoding="async" loading="lazy" />
        <div className="pt-chip"><i />Open to work · Upwork</div>
        <div className="pt-badge">
          {current?.logo && <img src={current.logo} alt="" width={38} height={38} />}
          <div><b>{person.name}</b><span>{current ? `${current.role} · ${current.org}` : person.role}</span></div>
        </div>
      </div>
    </div>
  );
}
