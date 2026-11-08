/**
 * devlog.ts — a tiny event log of what Nexus is doing (connection, latency, tool calls,
 * page context). Shown only when a visitor opens "Under the hood"; costs nothing otherwise.
 */
export type LogKind = 'sys' | 'net' | 'tool' | 'ctx' | 'you' | 'ai' | 'err';
export type LogLine = { id: number; t: number; kind: LogKind; text: string };

let lines: LogLine[] = [];
let seq = 0;
const subs = new Set<() => void>();
const t0 = performance.now();

export const devlog = {
  add(kind: LogKind, text: string) {
    lines = [...lines.slice(-79), { id: ++seq, t: performance.now() - t0, kind, text }];
    subs.forEach((f) => f());
  },
  get: () => lines,
  subscribe(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; },
};
