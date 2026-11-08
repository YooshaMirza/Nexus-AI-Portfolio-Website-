import { useEffect, useRef } from 'react';
import type { VoiceAgent } from '../agent/NexusAgent';

/**
 * Stage — the fixed WebGL layer. Each frame it:
 *  - reads live voice levels from the agent,
 *  - flies the blob between the hero slot and the dock slot as the page scrolls,
 *  - lets other components hook in (captions, dock waveform) via onFrame.
 */
export type FrameFn = (t: number) => void;
export const frameHooks = new Set<FrameFn>();

const smooth = (x: number) => x * x * (3 - 2 * x);

export default function Stage({ agent }: { agent: VoiceAgent }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0, alive = true, last = 0;
    let blob: import('../voice/VoiceBlob').VoiceBlob | undefined;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = matchMedia('(max-width: 820px)').matches;
    // the mouse: Nexus turns to look at it, leans a little toward it, and ripples when it comes close
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced;
    let mx = -1, my = -1;
    const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; };
    const onLeave = () => { mx = -1; };
    if (fine) { addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('pointerleave', onLeave); }

    const slots = () => {
      // while the entry screen is open, Nexus sits in its centre; closing it flies the blob to the hero
      const hero = document.getElementById(document.documentElement.classList.contains('entry-open') ? 'blob-entry' : 'blob-hero')?.getBoundingClientRect();
      // while text chat is open, Nexus lives in the chat header instead of the dock
      const dock = document.getElementById(document.documentElement.classList.contains('chat-open') ? 'blob-chat' : 'blob-dock')?.getBoundingClientRect();
      const heroH = document.getElementById('intro')?.offsetHeight ?? innerHeight;
      return { hero, dock, heroH };
    };

    const frame = (ms: number) => {
      if (!alive) return;
      const t = window.__demoTime ?? ms / 1000;
      const dt = Math.min(0.1, last ? t - last : 0.016);
      last = t;
      const { hero, dock, heroH } = slots();
      // while the resume viewer is open, Nexus stays in the dock above it
      const p = document.documentElement.classList.contains('entry-open') ? 0 : document.documentElement.classList.contains('resume-open') || document.documentElement.classList.contains('chat-open') ? 1 : smooth(Math.min(1, Math.max(0, window.scrollY / (heroH * 0.55))));
      document.documentElement.style.setProperty('--dock-p', p.toFixed(3));
      document.documentElement.classList.toggle('dock-on', p > 0.4);
      if (blob && hero && dock) {
        // a little smaller than the slot so the floating proof tags can sit around it
        const hr = Math.min(hero.width, hero.height) * 0.31;
        const dr = dock.width * 0.42;
        blob.target = {
          x: hero.left + hero.width / 2 + (dock.left + dock.width / 2 - (hero.left + hero.width / 2)) * p,
          y: hero.top + hero.height / 2 + (dock.top + dock.height / 2 - (hero.top + hero.height / 2)) * p,
          r: hr + (dr - hr) * p,
        };
        let nl = agent.nexusLevel();
        if (fine && mx >= 0) {
          const dx = mx - blob.target.x, dy = my - blob.target.y, d = Math.hypot(dx, dy) || 1, r = blob.target.r;
          blob.look = { y: Math.max(-1, Math.min(1, dx / (innerWidth * 0.5))) * 0.85, x: Math.max(-1, Math.min(1, dy / (innerHeight * 0.5))) * 0.6 };
          const lean = Math.min(1, d / 400) * r * 0.07;
          blob.target.x += (dx / d) * lean; blob.target.y += (dy / d) * lean;
          const near = 1 - d / (r * 2.2);
          if (near > 0) nl = Math.max(nl, near * 0.3);
        } else blob.look = { x: 0, y: 0 };
        const vl = agent.visitorLevel();
        // entry screen: the cursor on "Enter website" wakes Nexus up (ripples as if about to speak)
        if (document.documentElement.classList.contains('entry-hot')) nl = Math.max(nl, 0.3 + 0.1 * Math.sin(t * 5.5));
        const mode = nl > 0.02 || agent.speaking() ? 'speaking' : vl > 0.06 ? 'listening' : 'idle';
        blob.frame(reduced ? t * 0.3 : t, dt, mode === 'listening' ? vl : nl, mode);
      }
      frameHooks.forEach((f) => f(t));
      // the video recorder drives frames itself
      if (!(window as unknown as { __recording?: boolean }).__recording) raf = requestAnimationFrame(frame);
    };

    // three.js loads after first paint so the text appears instantly
    import('../voice/VoiceBlob').then(({ VoiceBlob }) => {
      if (!alive || !canvas.current) return;
      try {
        blob = new VoiceBlob(canvas.current, { mobile });
        document.documentElement.classList.add('webgl');
      } catch (e) {
        console.warn('WebGL unavailable, using the flat fallback', e);
      }
    });
    const onResize = () => blob?.resize();
    addEventListener('resize', onResize);
    raf = requestAnimationFrame(frame);
    // recorder hook: render one deterministic frame
    (window as unknown as { __renderFrame?: (t: number) => void }).__renderFrame = (t) => frame(t * 1000);
    return () => { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', onResize); removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); blob?.dispose(); };
  }, [agent]);

  return <canvas ref={canvas} className="stage" aria-hidden="true" />;
}
