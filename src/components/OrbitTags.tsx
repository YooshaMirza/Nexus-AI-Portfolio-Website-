import { useEffect, useRef } from 'react';
import { frameHooks } from './Stage';

/**
 * Text tags orbiting Nexus in 3D: two tilted rings turning in opposite directions.
 * Tags in front of the blob sit above the WebGL layer (bigger, sharper); tags behind
 * it sit below, so the blob hides them. Driven by the Stage frame loop, no React re-renders.
 */
const RINGS = [
  // tilt = how open the orbit looks, roll = how much it leans (the two rings cross diagonally)
  { tags: ['Voice agents', 'LLMs', 'RAG', 'MCP', 'Gemini Live', 'STT · TTS'], radius: 1.42, tilt: 0.42, roll: 0.42, period: 40, dir: 1, phase: 0 },
  { tags: ['Telephony', 'Computer vision', 'Agentic AI', 'FastAPI', 'PyTorch', 'Prompt design'], radius: 1.62, tilt: 0.38, roll: -0.46, period: 58, dir: -1, phase: 0.08 },
];
/** must match the hero radius factor in Stage.tsx */
const BLOB_R = 0.31;

export default function OrbitTags() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tags = Array.from(el.querySelectorAll<HTMLElement>('.orbit-tag'));
    let px = 0, py = 0, tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; };
    addEventListener('pointermove', onMove, { passive: true });

    const hook = (t: number) => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || scrollY > innerHeight * 1.2) return;
      const top = el.getBoundingClientRect().top;
      const fade = Math.max(0, 1 - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-p') || '0') * 2.6);
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      const r = Math.min(w, h) * BLOB_R;
      let k = 0;
      for (const ring of RINGS) {
        const n = ring.tags.length;
        for (let i = 0; i < n; i++, k++) {
          const tag = tags[k];
          if (!tag) continue;
          const a = (i / n + ring.phase) * Math.PI * 2 + (reduced ? 0 : (t / ring.period) * Math.PI * 2 * ring.dir);
          const R = r * ring.radius;
          const x = Math.cos(a) * R;
          const z = Math.sin(a);                      // -1 back … 1 front
          const tilt = ring.tilt + py * 0.12;
          const y = Math.sin(a) * R * tilt + Math.cos(a) * R * (ring.roll + px * 0.06);
          const front = z > 0;
          const depth = (z + 1) / 2;                  // 0 back … 1 front
          const scale = 0.78 + depth * 0.34;
          // keep every tag fully on screen (matters on phones)
          const half = (tag.offsetWidth * scale) / 2 + 4;
          const sx = Math.min(w - half, Math.max(half, w / 2 + x + px * 14 * (0.4 + depth))), sy = h / 2 + y + py * 10 * (0.4 + depth);
          const hidden = top + sy < 76;               // never float over the sticky nav
          tag.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
          tag.style.opacity = hidden ? '0' : ((0.38 + depth * 0.62) * fade).toFixed(3);
          tag.style.zIndex = front ? '61' : '1';
          tag.classList.toggle('front', front && depth > 0.75);
        }
      }
    };
    frameHooks.add(hook);
    return () => { frameHooks.delete(hook); removeEventListener('pointermove', onMove); };
  }, []);

  return (
    <div ref={box} className="orbit-tags" aria-hidden="true">
      {RINGS.flatMap((ring) => ring.tags).map((t) => <span key={t} className="orbit-tag">{t}</span>)}
    </div>
  );
}
