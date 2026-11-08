import { useSyncExternalStore } from 'react';
import { devlog } from '../agent/devlog';

export const LOG_LABEL: Record<string, string> = { sys: 'agent', net: 'speed', tool: 'action', ctx: 'context', you: 'you', ai: 'nexus', err: 'error' };

/**
 * One clickable line that lives INSIDE the dock (voice) or the chat panel (text), never over the page.
 * It shows the latest agent event live, and opens the full Agent console.
 */
export default function ConsoleLine({ onOpen, tone = 'dark', idle }: { onOpen: () => void; tone?: 'dark' | 'light'; idle?: string }) {
  const lines = useSyncExternalStore(devlog.subscribe, devlog.get);
  const last = lines[lines.length - 1];
  return (
    <button type="button" data-ask className={`console-line ${tone}`} onClick={onOpen} title="Open the agent console: see what Nexus is doing, live">
      <span className="cl-dot" aria-hidden="true" />
      <span className="cl-name">Agent console</span>
      {last
        ? <span key={last.id} className={`cl-text k-${last.kind}`}><em>{LOG_LABEL[last.kind] ?? last.kind}</em>{last.text}</span>
        : <span className="cl-text">{idle ?? 'live steps will show here'}</span>}
      <span className="cl-open" aria-hidden="true">Open ↗</span>
    </button>
  );
}
