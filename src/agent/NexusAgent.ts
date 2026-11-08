/**
 * NexusAgent — one Gemini Live voice session, framework-free.
 * The UI subscribes for state changes (status, captions) and polls
 * per-frame values (voice level, caption progress) from the render loop.
 */
import { SERVICE_MESSAGE, isOutOfService, isQuotaError } from '../serviceText';
import type { FunctionResponseScheduling, LiveServerMessage, Session } from '@google/genai';
import { LIVE_MODEL, liveConfig } from './liveConfig';
import { MicStream, PcmPlayer } from './audio';
import { devlog } from './devlog';

export type Status = 'idle' | 'connecting' | 'live' | 'ended' | 'error';
export type PageContext = { id: string; label: string; detail?: string };

export type AgentState = {
  status: Status;
  /** what Nexus is saying in the current/last turn */
  nexusText: string;
  /** what the visitor said most recently (cleared after a few seconds) */
  visitorText: string;
  micBlocked: boolean;
  muted: boolean;
  error?: string;
};

export interface VoiceAgent {
  getState(): AgentState;
  subscribe(fn: () => void): () => void;
  /** 0..1 */ nexusLevel(): number;
  /** 0..1 */ visitorLevel(): number;
  /** 0..1 how much of the current Nexus sentence has been spoken */ captionProgress(): number;
  speaking(): boolean;
  prefetch(): void;
  /** Open the live session ahead of time so the first tap gets a voice almost instantly. */
  warm(): void;
  /** True when this browser will play sound without a tap (returning visitors, some browsers). */
  autoplayAllowed(): boolean;
  start(ctx: PageContext, question?: string, note?: string): Promise<void>;
  /** Start the call if needed and ask Nexus something. Call from a click. */
  ask(text: string, ctx: PageContext): void;
  /** Something the visitor did (e.g. opened the resume). Starts the call if needed. Call from a click. */
  event(note: string, ctx: PageContext): void;
  stop(): void;
  setMuted(m: boolean): void;
  sendText(text: string): void;
  setContext(ctx: PageContext): void;
  onShow?: (target: string) => void;
  onTheme?: (mode: 'light' | 'dark') => void;
  onTour?: () => void;
  /** guided tour: have Nexus narrate this stop (only if a call is live) */
  tourNote?(line: string, label: string): void;
  /** while true, Nexus doesn't comment on what the visitor scrolls to */
  setQuiet?(quiet: boolean): void;
}

type Token = { token: string; model: string; at: number };

/** Test builds only: lets the owner paste a Gemini key on their own device instead of using the token server. */
export const TEST_KEY_ENTRY = import.meta.env.VITE_TEST_KEY_ENTRY === '1';
export const NEEDS_KEY = 'needs-key';
const KEY_STORE = 'nexus-test-gemini-key';
export const testKey = {
  get: () => { try { return TEST_KEY_ENTRY ? localStorage.getItem(KEY_STORE) ?? '' : ''; } catch { return ''; } },
  set: (k: string) => { try { localStorage.setItem(KEY_STORE, k.trim()); } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(KEY_STORE); } catch { /* private mode */ } },
};

const CALL_LIMIT_MS = 10 * 60_000;

export class NexusAgent implements VoiceAgent {
  private state: AgentState = { status: 'idle', nexusText: '', visitorText: '', micBlocked: false, muted: false };
  private subs = new Set<() => void>();
  private player?: PcmPlayer;
  private mic?: MicStream;
  private session?: Session;
  private tokenP?: Promise<Token>;
  private resumeHandle?: string;
  private modelTurnOpen = false;
  private visitorClear?: number;
  private lastVisitorSpeech = 0;
  private lastModelEnd = 0;
  private ctx?: PageContext & { since: number };
  private sentCtx = new Set<string>();
  private lastCtxSent = 0;
  private ticker?: number;
  private closing = false;
  /** true while trying API versions, so failed handshakes don't end the call */
  private connecting = false;
  /** bumps on every new socket so late events from an old one are ignored */
  private gen = 0;
  /** when the last request to Nexus was made (visitor finished speaking, or a note was sent) */
  private askedAt = 0;

  private warmP?: Promise<void>;
  private warmTimer?: number;
  private warmCount = 0;
  onShow?: (target: string) => void;
  onTheme?: (mode: 'light' | 'dark') => void;
  onTour?: () => void;
  private quiet = false;
  private capTimer?: number;

  private endForLimit() {
    if (this.state.status !== 'live' || !this.session) return;
    devlog.add('sys', 'call reached its 10-minute limit');
    this.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: '[session-limit] This call has reached its 10-minute limit. Say a warm one-line goodbye and mention they can call again or use the chat.' }] }], turnComplete: true });
    window.setTimeout(() => this.stop(), 9000);
  }

  setQuiet(q: boolean) { this.quiet = q; }

  tourNote(line: string, label: string) {
    if (this.state.status !== 'live' || !this.session) return;
    this.askedAt = performance.now();
    this.lastCtxSent = performance.now();
    devlog.add('ctx', `tour note → ${label}`);
    this.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: `[tour] Now showing: ${label}. Say this naturally: "${line}"` }] }], turnComplete: true });
  }

  getState = () => this.state;
  subscribe = (fn: () => void) => { this.subs.add(fn); return () => { this.subs.delete(fn); }; };
  private set(p: Partial<AgentState>) { this.state = { ...this.state, ...p }; this.subs.forEach((f) => f()); }

  nexusLevel() { return this.player?.level() ?? 0; }
  visitorLevel() { return this.mic?.level() ?? 0; }
  captionProgress() { return this.player?.turnProgress() ?? 1; }
  speaking() { return !!this.player?.playing; }

  /** Fetch a token early so the first click connects faster. */
  prefetch() {
    if (this.tokenP || TEST_KEY_ENTRY) return;
    this.tokenP = this.fetchToken();
    this.tokenP.catch(() => { this.tokenP = undefined; });
    // warm the SDK chunk while the visitor reads
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1500));
    idle(() => { import('@google/genai').catch(() => {}); });
  }

  private async fetchToken(): Promise<Token> {
    const r = await fetch('/api/nexus-token', { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.token) throw new Error(j.error || `Token request failed (${r.status})`);
    return { token: j.token, model: j.model || LIVE_MODEL, at: Date.now() };
  }

  private async freshToken() {
    let t = await (this.tokenP ?? (this.tokenP = this.fetchToken())).catch(() => undefined);
    // a token can open a new session only within ~2 minutes of being minted
    if (!t || Date.now() - t.at > 90_000) t = await (this.tokenP = this.fetchToken());
    this.tokenP = undefined; // single use
    return t;
  }

  autoplayAllowed() {
    const nav = navigator as unknown as { getAutoplayPolicy?: (t: string) => string };
    try { if (nav.getAutoplayPolicy) return nav.getAutoplayPolicy('audiocontext') === 'allowed'; } catch { /* not supported */ }
    try { this.player ??= new PcmPlayer(); return this.player.ctx.state === 'running'; } catch { return false; }
  }

  warm() {
    if (TEST_KEY_ENTRY && !testKey.get()) return;
    const s = this.state.status;
    if (this.session || this.warmP || s !== 'idle' || this.warmCount >= 3) return;
    this.warmCount++;
    this.closing = false;
    this.warmP = this.connect()
      .then(() => { this.warmTimer = window.setTimeout(() => this.dropWarm(), 90_000); })
      .catch((e) => { console.warn('[nexus] warm-up failed, will connect on tap', e); this.session = undefined; })
      .finally(() => { this.warmP = undefined; });
  }

  /** Close an unused warm session so idle readers don't hold one open. */
  private dropWarm() {
    const s = this.state.status;
    if (s === 'live' || s === 'connecting' || !this.session) return;
    this.gen++;
    try { this.session.close(); } catch { /* already closed */ }
    this.session = undefined;
  }

  ask(text: string, ctx: PageContext) {
    const s = this.state.status;
    if (s === 'live') { this.sendText(text); return; }
    if (s === 'connecting') return;
    this.start(ctx, text);
  }

  event(note: string, ctx: PageContext) {
    const s = this.state.status;
    this.setContext(ctx);
    this.sentCtx.add(ctx.id);
    if (s === 'live') {
      this.session?.sendClientContent({ turns: [{ role: 'user', parts: [{ text: `[page-event] ${note}` }] }], turnComplete: true });
      this.lastCtxSent = performance.now();
      return;
    }
    if (s === 'connecting') return;
    this.start(ctx, undefined, note);
  }

  /** Call from a user gesture (click / tap / key) so audio can play, unless autoplayAllowed(). */
  async start(ctx: PageContext, question?: string, note?: string) {
    if (this.state.status === 'connecting' || this.state.status === 'live') return;
    this.closing = false;
    this.player ??= new PcmPlayer();
    const resumed = this.player.resume();
    this.ctx = { ...ctx, since: performance.now() };
    try {
      // If the browser didn't count this as a user gesture, audio stays locked: wait quietly for the next tap.
      await Promise.race([resumed, new Promise((r) => setTimeout(r, 400))]);
      if (this.player.ctx.state !== 'running') return;
      if (['connecting', 'live'].includes(this.getState().status)) return; // another tap won the race
      this.set({ status: 'connecting', error: undefined, nexusText: '', visitorText: question ?? '' });
      window.clearTimeout(this.warmTimer);
      if (this.warmP) await this.warmP;
      if (!this.session) await this.connect();
      this.set({ status: 'live' });
      devlog.add('sys', question ? `call started from a question: "${question}"` : note ? 'call started by a page event (resume opened)' : 'call started, greeting requested');
      this.askedAt = performance.now();
      // Started by an action (a question or opening the resume): skip the standard greeting and respond to that directly.
      const opening = question
        ? `[session-start] The visitor started the call by tapping the question: "${question}". They are looking at: ${ctx.label}. Do NOT give the standard greeting. Say a two-word hello at most, then answer the question.`
        : note
          ? `[session-start] [page-event] ${note} Do NOT give the standard greeting or introduce yourself at length. Open directly with your reaction to this, e.g. "Hi! I see you've opened his resume..."`
          : `[session-start] A visitor just opened the website. They are looking at: ${ctx.label}.`;
      this.session!.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: opening }] }],
        turnComplete: true,
      });
      this.sentCtx.add(ctx.id);
      this.startMic();
      this.ticker = window.setInterval(() => this.maybeSendContext(), 400);
      // budget guard: calls end at 10 minutes, with a friendly goodbye
      window.clearTimeout(this.capTimer);
      this.capTimer = window.setTimeout(() => this.endForLimit(), CALL_LIMIT_MS);
    } catch (e) {
      console.error('[nexus] start failed', e);
      this.set({ status: 'error', error: friendly(e) });
      this.teardown();
    }
  }

  private async connect() {
    const c0 = performance.now();
    devlog.add('net', 'requesting a single-use session token');
    const { GoogleGenAI } = await import('@google/genai');
    const key = testKey.get();
    const cfg = liveConfig();
    if (this.resumeHandle) cfg.sessionResumption = { handle: this.resumeHandle };
    const g = ++this.gen;
    const callbacks = {
      onmessage: (m: LiveServerMessage) => { if (g === this.gen) this.onMessage(m); },
      onerror: (e: ErrorEvent) => { console.error('[nexus] socket error', e); },
      onclose: (e: CloseEvent) => { if (g === this.gen) this.onClose(e); },
    };
    if (key) {
      // test mode: this device talks to Gemini directly with the owner's key.
      // Try API versions in order until the Live handshake succeeds.
      let last: unknown;
      for (const apiVersion of ['v1beta', 'v1', 'v1alpha']) {
        try {
          const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion } });
          this.connecting = true;
          this.session = await ai.live.connect({ model: LIVE_MODEL, config: cfg, callbacks });
          this.connecting = false;
          console.info('[nexus] connected via', apiVersion);
          return;
        } catch (e) { last = e; console.warn('[nexus] connect failed on', apiVersion, e); }
      }
      this.connecting = false;
      throw last;
    }
    if (TEST_KEY_ENTRY) throw new Error(NEEDS_KEY);
    const t = await this.freshToken();
    const ai = new GoogleGenAI({ apiKey: t.token, httpOptions: { apiVersion: 'v1alpha' } });
    devlog.add('net', `token ok · opening Gemini Live socket (${t.model})`);
    this.session = await ai.live.connect({ model: t.model, config: cfg, callbacks });
    devlog.add('net', `connected in ${Math.round(performance.now() - c0)} ms · voice ${cfg.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName ?? ''} · 16 kHz mic in, 24 kHz audio out`);
  }

  private async startMic() {
    if (!this.player) return;
    this.mic = new MicStream(this.player.ctx);
    this.mic.muted = this.state.muted;
    try {
      await this.mic.start((b64) => {
        try { this.session?.sendRealtimeInput({ audio: { data: b64, mimeType: 'audio/pcm;rate=16000' } }); } catch { /* socket closing */ }
      });
    } catch (e) {
      console.warn('[nexus] mic unavailable', e);
      this.mic = undefined;
      this.set({ micBlocked: true });
    }
  }

  private beginModelTurn() {
    if (this.modelTurnOpen) return;
    this.modelTurnOpen = true;
    if (this.state.visitorText) devlog.add('you', this.state.visitorText.slice(0, 90));
    const since = Math.max(this.askedAt, this.lastVisitorSpeech);
    if (since) devlog.add('net', `first audio ${Math.round(performance.now() - since)} ms after the visitor stopped`);
    this.player?.endTurn();
    // Nexus is answering: its words take over the caption
    window.clearTimeout(this.visitorClear);
    this.set({ nexusText: '', visitorText: '' });
  }

  private onMessage(m: LiveServerMessage) {
    const sc = m.serverContent;
    if (sc?.inputTranscription?.text) {
      this.lastVisitorSpeech = performance.now();
      const next = (this.modelTurnOpen ? '' : this.state.visitorText) + sc.inputTranscription.text;
      this.set({ visitorText: next.trimStart() });
      window.clearTimeout(this.visitorClear);
      this.visitorClear = window.setTimeout(() => this.set({ visitorText: '' }), 6000);
    }
    if (sc?.outputTranscription?.text) {
      this.beginModelTurn();
      this.set({ nexusText: this.state.nexusText + sc.outputTranscription.text });
    }
    for (const part of sc?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
        this.beginModelTurn();
        this.player?.play(part.inlineData.data);
      }
    }
    if (sc?.interrupted) { this.player?.flush(); this.modelTurnOpen = false; devlog.add('sys', 'visitor interrupted · playback flushed (barge-in)'); }
    if (sc?.turnComplete && this.state.nexusText) devlog.add('ai', this.state.nexusText.trim().slice(0, 90) + (this.state.nexusText.length > 90 ? '…' : ''));
    if (sc?.turnComplete) { this.modelTurnOpen = false; this.lastModelEnd = performance.now(); }

    for (const fc of m.toolCall?.functionCalls ?? []) {
      devlog.add('tool', `${fc.name}(${JSON.stringify(fc.args ?? {})})`);
      if (fc.name === 'show_on_page') {
        const target = String((fc.args as { target?: string })?.target ?? '');
        if (target) { this.onShow?.(target); this.sentCtx.add(target); }
      }
      this.session?.sendToolResponse({
        functionResponses: [{ id: fc.id, name: fc.name, response: { result: 'done' }, scheduling: 'SILENT' as FunctionResponseScheduling }],
      });
      if (fc.name === 'start_tour') this.onTour?.();
      if (fc.name === 'set_theme') { const m = (fc.args as { mode?: string })?.mode; if (m === 'light' || m === 'dark') this.onTheme?.(m); }
      if (fc.name === 'end_conversation') window.setTimeout(() => this.stop(), 2500);
    }

    if (m.sessionResumptionUpdate?.resumable && m.sessionResumptionUpdate.newHandle) this.resumeHandle = m.sessionResumptionUpdate.newHandle;
    if (m.goAway) { devlog.add('net', 'server asked to reconnect · resuming the session'); this.reconnect(); }
  }

  private async reconnect() {
    if (this.closing) return;
    const old = this.session;
    try { await this.connect(); old?.close(); } catch (e) { console.warn('[nexus] reconnect failed', e); }
  }

  private onClose(e: CloseEvent) {
    devlog.add(e.code === 1000 ? 'sys' : 'err', `socket closed (${e.code}${e.reason ? ', ' + e.reason : ''})`);
    if (this.closing || this.connecting) return;
    console.warn('[nexus] closed', e.code, e.reason);
    // a warm (not yet started) session timed out or was dropped: forget it, the next tap reconnects
    if (this.state.status === 'idle' || this.state.status === 'ended') { this.session = undefined; return; }
    if (isQuotaError(e.reason)) { this.set({ status: 'error', error: SERVICE_MESSAGE.quota }); this.teardown(); return; }
    if (this.state.status !== 'live' || /key|permission|denied|not found|unsupported/i.test(e.reason || '')) {
      this.set({ status: 'error', error: e.reason ? `Nexus disconnected: ${e.reason}` : 'Nexus disconnected.' });
      this.teardown();
      return;
    }
    if (this.resumeHandle && e.code !== 1000) { this.reconnect(); return; }
    this.set({ status: 'ended' });
    this.teardown();
  }

  /** The page tells us what the visitor is looking at; we decide when Nexus hears it. */
  setContext(ctx: PageContext) {
    if (this.ctx?.id === ctx.id) return;
    this.ctx = { ...ctx, since: performance.now() };
  }

  private maybeSendContext() {
    const c = this.ctx, s = this.session;
    if (!c || !s || this.state.status !== 'live' || this.sentCtx.has(c.id) || this.quiet) return;
    const now = performance.now();
    const dwelled = now - c.since > 2200;
    const quiet = !this.speaking() && !this.modelTurnOpen && now - this.lastModelEnd > 900;
    const visitorQuiet = now - this.lastVisitorSpeech > 1800 && this.visitorLevel() < 0.08;
    // keep Nexus from narrating every card: at most one page note every ~10 s
    const spaced = now - this.lastCtxSent > 10_000 && now - this.lastModelEnd > 3500;
    if (!(dwelled && quiet && visitorQuiet && spaced)) return;
    this.sentCtx.add(c.id);
    this.lastCtxSent = now;
    devlog.add('ctx', `page-context → ${c.label}`);
    this.askedAt = now;
    s.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: `[page-context] The visitor is now looking at ${c.label} (id ${c.id}).${c.detail ? ' ' + c.detail : ''}` }] }],
      turnComplete: true,
    });
  }

  setMuted(m: boolean) { if (this.mic) this.mic.muted = m; this.set({ muted: m }); }

  sendText(text: string) {
    const t = text.trim();
    if (!t || !this.session) return;
    this.player?.flush();
    this.set({ visitorText: t });
    this.session.sendRealtimeInput({ text: t });
  }

  stop() {
    this.closing = true;
    this.teardown();
    this.set({ status: 'ended', visitorText: '' });
  }

  private teardown() {
    window.clearInterval(this.ticker);
    window.clearTimeout(this.capTimer);
    window.clearTimeout(this.warmTimer);
    this.gen++;
    this.mic?.stop(); this.mic = undefined;
    this.player?.flush();
    try { this.session?.close(); } catch { /* already closed */ }
    this.session = undefined;
    this.modelTurnOpen = false;
  }
}

function friendly(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (m === NEEDS_KEY) return NEEDS_KEY;
  if (isOutOfService(m)) return m;
  if (isQuotaError(m)) return SERVICE_MESSAGE.quota;
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(m)) return 'That Gemini key was rejected. Check it and paste it again.';
  if (/GEMINI_API_KEY/.test(m)) return 'Nexus is not configured yet. Add GEMINI_API_KEY on the server.';
  if (/Origin not allowed|403/.test(m)) return 'Nexus only runs on Yoosha\'s own site.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Couldn\'t reach Nexus. Check your connection and try again.';
  return 'Nexus couldn\'t connect. Try again in a moment.';
}
