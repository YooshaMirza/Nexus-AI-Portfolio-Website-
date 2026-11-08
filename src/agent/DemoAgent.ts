/**
 * DemoAgent — a scripted stand-in for NexusAgent (open the site with ?demo).
 * No network, no mic: it fakes speech levels and captions so the design can be
 * previewed, tested and recorded. Time comes from window.__demoTime when a
 * recorder drives the page frame by frame, else from the real clock.
 */
import type { AgentState, PageContext, VoiceAgent } from './NexusAgent';

declare global { interface Window { __demoTime?: number; __demoVisitor?: (text: string, dur?: number) => void; __demoTick?: () => void } }

const now = () => window.__demoTime ?? performance.now() / 1000;

const LINES: Record<string, string> = {
  work: 'This is his career so far. He started with research internships and now ships voice agents that take real calls.',
  'job-weya': 'Right now he\'s a forward deployed engineer at Weya, building voice agents hand in hand with customer teams.',
  'job-neurabit': 'Before Weya, he architected InstaBus at Neurabit, a voice platform that answers calls for bus operators.',
  expertise: "Here's what he's strongest at, worked out from everything he has shipped. Voice agents lead the list.",
  'pillar-voice': 'Voice is his main thing. Six roles and projects back it up, from InstaBus to me.',
  projects: "Here are the things he has built. The big cards are the ones he's proudest of.",
  'proj-instabus': 'InstaBus is his biggest production system. Real passengers call it to book and reschedule trips.',
  'proj-nexus': 'And that one is me. I run on Gemini Live, and I can see what you scroll to.',
  research: 'Two medical imaging papers. The skin disease model reached 96.64 percent across 57 classes.',
  'paper-skin': 'This one is published in IEEE Xplore, and it beat VGG16 and MobileNet.',
  about: 'A bit more about him: Bennett University, rank 409 in the Amazon ML Challenge, and a YouTube channel since 2022.',
  contact: 'If you\'d like to work with him, email or WhatsApp is the fastest way to reach him.',
};

type Utt = { text: string; t0: number; dur: number; who: 'nexus' | 'visitor' };

export class DemoAgent implements VoiceAgent {
  private state: AgentState = { status: 'idle', nexusText: '', visitorText: '', micBlocked: false, muted: false };
  private subs = new Set<() => void>();
  private queue: Utt[] = [];
  private cur?: Utt;
  private ctx?: PageContext & { since: number };
  private said = new Set<string>();
  private lastEnd = 0;
  private raf = 0;
  onShow?: (target: string) => void;

  getState = () => this.state;
  subscribe = (fn: () => void) => { this.subs.add(fn); return () => { this.subs.delete(fn); }; };
  private set(p: Partial<AgentState>) { this.state = { ...this.state, ...p }; this.subs.forEach((f) => f()); }

  prefetch() {}
  setQuiet() {}
  tourNote(line: string) { if (this.state.status === 'live') this.say(line, 'nexus'); }
  warm() {}
  autoplayAllowed() { return false; }
  unlock() { /* nothing to unlock in the scripted demo */ }
  ask(text: string, ctx: PageContext) {
    if (this.state.status === 'live') { this.sendText(text); return; }
    this.start(ctx, text);
    setTimeout(() => this.say(text, 'visitor', 1.4), 300);
  }

  event(_note: string, ctx: PageContext) {
    const line = 'I saw you opened his resume. The short version: voice agents in production, two medical imaging papers, and a lot of shipping. Ask me anything about it.';
    this.setContext(ctx); this.said.add(ctx.id);
    if (this.state.status === 'live') { this.say(line, 'nexus'); return; }
    this.start(ctx, undefined, 'resume');
    setTimeout(() => this.say(line, 'nexus'), 200);
  }

  /** Like the real agent: the standard greeting only when the call wasn't started by a question or event. */
  async start(ctx: PageContext, question?: string, note?: string) {
    this.set({ status: 'connecting' });
    window.__demoVisitor = (text, dur) => this.say(text, 'visitor', dur);
    window.__demoTick = this.tick;
    this.ctx = { ...ctx, since: now() };
    this.said.add(ctx.id);
    const t = now();
    setTimeout(() => {
      this.set({ status: 'live' });
      if (!question && !note) this.queue.push(this.utt('Hi! I\'m Nexus, Yoosha\'s voice agent. We can talk in English, या फिर हिंदी में भी। Scroll around and I\'ll tell you about whatever you\'re looking at.', 'nexus', t + 0.6));
      this.loop();
    }, window.__demoTime !== undefined ? 0 : 500);
  }

  private utt(text: string, who: Utt['who'], t0 = now(), dur?: number): Utt {
    return { text, who, t0, dur: dur ?? Math.max(1.6, text.split(/\s+/).length * 0.31) };
  }

  say(text: string, who: Utt['who'], dur?: number) { this.queue.push(this.utt(text, who, now(), dur)); }

  /** Advance the simulation. Called by rAF, or by the recorder each frame. */
  tick = () => {
    const t = now();
    if (this.cur && t > this.cur.t0 + this.cur.dur) {
      if (this.cur.who === 'visitor') this.respondTo(this.cur.text);
      this.cur = undefined; this.lastEnd = t;
    }
    if (!this.cur && this.queue.length && t >= this.queue[0].t0) {
      this.cur = this.queue.shift()!;
      this.cur.t0 = Math.max(this.cur.t0, t);
      if (this.cur.who === 'nexus') this.set({ nexusText: this.cur.text, visitorText: '' });
      else this.set({ visitorText: this.cur.text });
    }
    if (this.state.visitorText && !this.cur && t - this.lastEnd > 5) this.set({ visitorText: '' });
    // page awareness: speak about a newly viewed item after a short dwell
    const c = this.ctx;
    if (c && !this.cur && !this.queue.length && !this.said.has(c.id) && t - c.since > 1.1 && t - this.lastEnd > 0.6 && LINES[c.id]) {
      this.said.add(c.id);
      this.queue.push(this.utt(LINES[c.id], 'nexus', t));
    }
  };

  private respondTo(text: string) {
    if (/research|paper/i.test(text)) { this.onShow?.('research'); this.said.add('research'); this.queue.push(this.utt('Sure, here\'s his research. His skin disease model is published in IEEE Xplore.', 'nexus', now() + 0.5)); }
    else this.queue.push(this.utt('Good question. He would love to tell you more, so drop him an email.', 'nexus', now() + 0.5));
  }

  private loop = () => { if (window.__demoTime === undefined) this.tick(); this.raf = requestAnimationFrame(this.loop); };

  private level(who: Utt['who']) {
    const u = this.cur;
    if (!u || u.who !== who) return 0;
    const t = now() - u.t0;
    const edge = Math.min(1, t / 0.15, (u.dur - t) / 0.2);
    const syll = 0.55 + 0.45 * Math.sin(t * 23) * Math.sin(t * 7.3 + 1) ;
    const phrase = 0.6 + 0.4 * Math.sin(t * 2.1);
    return Math.max(0, edge) * Math.max(0.08, syll * phrase) * (who === 'nexus' ? 0.9 : 0.7);
  }

  nexusLevel() { return this.level('nexus'); }
  visitorLevel() { return this.level('visitor'); }
  speaking() { return this.cur?.who === 'nexus'; }
  captionProgress() {
    const u = this.cur;
    if (!u || u.who !== 'nexus') return 1;
    return Math.min(1, (now() - u.t0) / u.dur);
  }

  stop() { cancelAnimationFrame(this.raf); this.queue = []; this.cur = undefined; this.set({ status: 'ended', visitorText: '' }); }
  setMuted(m: boolean) { this.set({ muted: m }); }
  sendText(text: string) { this.say(text, 'visitor', 1.2); }
  setContext(ctx: PageContext) { if (this.ctx?.id !== ctx.id) this.ctx = { ...ctx, since: now() }; }
}
