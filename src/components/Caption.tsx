import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { VoiceAgent } from '../agent/NexusAgent';
import { frameHooks } from './Stage';

/** Live words of whatever Nexus is saying; spoken words light up in step with the audio. */
export function Caption({ agent, idleText, className, tail, boot }: { agent: VoiceAgent; idleText: string; className?: string; tail?: number; /** reveal the idle line word by word, as if being said */ boot?: boolean }) {
  const st = useSyncExternalStore(agent.subscribe, agent.getState);
  const live = st.status === 'live' || st.status === 'connecting';
  let text = live && st.nexusText ? st.nexusText.trim() : idleText;
  if (tail && text.length > tail) text = '…' + text.slice(text.length - tail).replace(/^\S*\s/, '');
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const ref = useRef<HTMLParagraphElement>(null);
  const isLive = live && !!st.nexusText;

  useEffect(() => {
    let lastN = -1;
    const hook = () => {
      const el = ref.current;
      if (!el) return;
      const n = isLive ? Math.ceil(words.length * agent.captionProgress()) : words.length;
      if (n === lastN) return;
      lastN = n;
      const spans = el.children;
      for (let i = 0; i < spans.length; i++) {
        spans[i].className = i < n - 1 ? 'w said' : i === n - 1 && isLive && n < words.length ? 'w now' : i < n ? 'w said' : 'w next';
      }
    };
    frameHooks.add(hook);
    hook();
    return () => { frameHooks.delete(hook); };
  }, [agent, words, isLive]);

  const size = words.length > 26 ? 'len-l' : words.length > 16 ? 'len-m' : 'len-s';
  return (
    <p ref={ref} className={`caption ${size} ${className ?? ''}${boot && !isLive ? ' boot' : ''}`} aria-live="polite" lang="en">
      {words.map((w, i) => <span key={i + w} className="w said" style={{ ['--i' as string]: i }}>{w} </span>)}
    </p>
  );
}
