/**
 * audio.ts — browser audio for Nexus.
 * PcmPlayer: gapless playback of Gemini's 24 kHz PCM, with an analyser for the
 *   voice visual and timing info so captions can follow the speech.
 * MicStream: captures the mic at the device's native rate and resamples to
 *   16 kHz PCM in an AudioWorklet (works in Chrome, Safari and Firefox).
 */

const OUT_RATE = 24000;
const IN_RATE = 16000;

export class PcmPlayer {
  ctx: AudioContext;
  private gain: GainNode;
  private analyser: AnalyserNode;
  private buf: Float32Array<ArrayBuffer>;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  /** seconds of audio scheduled / started for the current model turn */
  private turnStart = -1;
  private turnScheduled = 0;

  constructor() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.gain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.6;
    this.buf = new Float32Array(this.analyser.fftSize);
    this.gain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  private resuming?: Promise<void>;
  /** One resume at a time: a second call without a user gesture must not replace the one a press started. */
  resume() {
    if (this.ctx.state !== 'suspended') return Promise.resolve();
    return (this.resuming ??= this.ctx.resume().finally(() => { this.resuming = undefined; }));
  }

  play(base64: string) {
    const bin = atob(base64);
    const n = bin.length >> 1;
    const audio = this.ctx.createBuffer(1, n, OUT_RATE);
    const ch = audio.getChannelData(0);
    for (let i = 0; i < n; i++) {
      let v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
      if (v >= 0x8000) v -= 0x10000;
      ch[i] = v / 32768;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = audio;
    src.connect(this.gain);
    const now = this.ctx.currentTime;
    const start = Math.max(now + 0.03, this.nextTime);
    if (this.turnStart < 0) { this.turnStart = start; this.turnScheduled = 0; }
    src.start(start);
    this.nextTime = start + audio.duration;
    this.turnScheduled += audio.duration;
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  /** Stop everything immediately (barge-in or hang-up). */
  flush() {
    this.sources.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
    this.sources.clear();
    this.nextTime = 0;
    this.endTurn();
  }

  endTurn() { this.turnStart = -1; this.turnScheduled = 0; }

  get playing() { return this.ctx.currentTime < this.nextTime - 0.01; }

  /** 0..1 fraction of the current turn's audio that has been heard so far. */
  turnProgress() {
    if (this.turnStart < 0 || this.turnScheduled <= 0) return 1;
    return Math.min(1, Math.max(0, (this.ctx.currentTime - this.turnStart) / this.turnScheduled));
  }

  level() { return rms(this.analyser, this.buf); }

  close() { this.flush(); this.ctx.close().catch(() => {}); }
}

const WORKLET = `
class Pcm16 extends AudioWorkletProcessor {
  constructor(o){ super(); this.ratio = sampleRate / ${IN_RATE}; this.pos = 0; this.out = new Int16Array(640); this.n = 0; }
  process(inputs){
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    // linear-interpolation resample to 16 kHz
    while (this.pos < ch.length - 1) {
      const i = Math.floor(this.pos), f = this.pos - i;
      const s = Math.max(-1, Math.min(1, ch[i] * (1 - f) + ch[i + 1] * f));
      this.out[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.out.length) { this.port.postMessage(this.out.buffer.slice(0)); this.n = 0; }
      this.pos += this.ratio;
    }
    this.pos -= ch.length;
    return true;
  }
}
registerProcessor('pcm16', Pcm16);`;

export class MicStream {
  private stream?: MediaStream;
  private node?: AudioWorkletNode;
  private source?: MediaStreamAudioSourceNode;
  private analyser?: AnalyserNode;
  private buf = new Float32Array(512) as Float32Array<ArrayBuffer>;
  muted = false;

  constructor(private ctx: AudioContext) {}

  async start(onChunk: (base64: string) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
    try { await this.ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.node = new AudioWorkletNode(this.ctx, 'pcm16');
    this.source.connect(this.analyser);
    this.source.connect(this.node);
    // keep the worklet pulled without sending the mic to the speakers
    const sink = this.ctx.createGain(); sink.gain.value = 0;
    this.node.connect(sink); sink.connect(this.ctx.destination);
    this.node.port.onmessage = (e) => { if (!this.muted) onChunk(toBase64(e.data as ArrayBuffer)); };
  }

  level() { return this.analyser && !this.muted ? rms(this.analyser, this.buf) : 0; }

  stop() {
    this.node?.port.close();
    this.node?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.node = undefined; this.source = undefined; this.stream = undefined;
  }
}

function rms(a: AnalyserNode, buf: Float32Array<ArrayBuffer>) {
  a.getFloatTimeDomainData(buf);
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.min(1, Math.sqrt(s / buf.length) * 4.5);
}

function toBase64(ab: ArrayBuffer) {
  const bytes = new Uint8Array(ab);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
