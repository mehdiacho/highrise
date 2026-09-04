/**
 * Sound effects, synthesized in-browser with the Web Audio API.
 *
 * No asset files: every sound is built from oscillators and filtered noise, so
 * there is nothing to license, download, or ship. Each sound is a short recipe
 * scheduled on the audio clock, which keeps them tight and sample-accurate.
 *
 * The AudioContext is created lazily and resumed on the first user gesture —
 * browsers refuse to start audio before one.
 */

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let unlocked = false;

const STORAGE_KEY = 'highrise.sound';
const MASTER_GAIN = 0.32;

function readStoredEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true; // private mode / blocked storage — default to on
  }
}

let enabled = readStoredEnabled();

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable — setting is session-only */
  }
  if (on) void ensureCtx()?.resume();
}

function ensureCtx(): Ctx | null {
  if (ctx) return ctx;
  const Impl =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Impl) return null; // no Web Audio — stay silent rather than throw
  try {
    ctx = new Impl();
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

/** Browsers block audio until the user interacts; resume on the first gesture. */
function installUnlock(): void {
  if (unlocked || typeof window === 'undefined') return;
  unlocked = true;
  const resume = () => {
    const c = ensureCtx();
    if (c && c.state === 'suspended') void c.resume();
  };
  window.addEventListener('pointerdown', resume, { once: false, passive: true });
  window.addEventListener('keydown', resume, { once: false, passive: true });
}
installUnlock();

// ─── Primitives ───────────────────────────────────────────────────────────────

interface ToneOpts {
  freq: number;
  /** Glide to this frequency over the note (portamento). */
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** Seconds from now to start. */
  at?: number;
  attack?: number;
}

function tone(c: Ctx, o: ToneOpts): void {
  const t0 = c.currentTime + (o.at ?? 0);
  const dur = o.dur;
  const peak = o.gain ?? 0.3;
  const attack = o.attack ?? 0.005;

  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(o.to, 1), t0 + dur);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g);
  g.connect(master!);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

interface NoiseOpts {
  dur: number;
  gain?: number;
  at?: number;
  /** Band-pass centre, or low-pass cutoff when `type` is 'lowpass'. */
  freq?: number;
  to?: number;
  q?: number;
  type?: BiquadFilterType;
}

function noise(c: Ctx, o: NoiseOpts): void {
  const t0 = c.currentTime + (o.at ?? 0);
  const dur = o.dur;
  const frames = Math.max(1, Math.floor(c.sampleRate * dur));

  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buf;

  const filter = c.createBiquadFilter();
  filter.type = o.type ?? 'bandpass';
  filter.frequency.setValueAtTime(o.freq ?? 1200, t0);
  if (o.to !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(o.to, 1), t0 + dur);
  filter.Q.value = o.q ?? 1;

  const g = c.createGain();
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter);
  filter.connect(g);
  g.connect(master!);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// ─── The sound set ────────────────────────────────────────────────────────────

export type SfxName =
  | 'dice'
  | 'move'
  | 'passStart'
  | 'buy'
  | 'rentPaid'
  | 'rentReceived'
  | 'tax'
  | 'card'
  | 'gavel'
  | 'bid'
  | 'auctionWon'
  | 'auctionDud'
  | 'build'
  | 'demolish'
  | 'mortgage'
  | 'unmortgage'
  | 'jailIn'
  | 'jailOut'
  | 'tradeOffer'
  | 'tradeAccepted'
  | 'tradeRejected'
  | 'bankrupt'
  | 'victory'
  | 'click';

const RECIPES: Record<SfxName, (c: Ctx) => void> = {
  // Dice tumbling in a cup: a few filtered noise ticks, irregularly spaced.
  dice: (c) => {
    for (let i = 0; i < 5; i++) {
      noise(c, { dur: 0.045, at: i * 0.055 + Math.random() * 0.015, freq: 2600 + Math.random() * 1400, q: 6, gain: 0.22 });
    }
    noise(c, { dur: 0.09, at: 0.3, freq: 1500, q: 3, gain: 0.26 });
  },

  // Token hop — soft, short, stays out of the way when repeated.
  move: (c) => tone(c, { freq: 520, to: 700, dur: 0.07, type: 'sine', gain: 0.12 }),

  // Passing Start: bright rising triad.
  passStart: (c) => {
    tone(c, { freq: 523, dur: 0.12, type: 'triangle', gain: 0.2 });
    tone(c, { freq: 659, dur: 0.12, type: 'triangle', gain: 0.2, at: 0.09 });
    tone(c, { freq: 784, dur: 0.26, type: 'triangle', gain: 0.22, at: 0.18 });
  },

  // Purchase — a bright two-note "ka-ching" with a metallic shimmer.
  buy: (c) => {
    tone(c, { freq: 880, dur: 0.1, type: 'square', gain: 0.13 });
    tone(c, { freq: 1318, dur: 0.3, type: 'square', gain: 0.11, at: 0.07 });
    noise(c, { dur: 0.25, at: 0.07, freq: 5200, q: 2, gain: 0.09 });
  },

  // Money out — descending, slightly sour.
  rentPaid: (c) => {
    tone(c, { freq: 440, to: 300, dur: 0.22, type: 'triangle', gain: 0.22 });
    tone(c, { freq: 220, to: 150, dur: 0.24, type: 'sine', gain: 0.16, at: 0.03 });
  },

  // Money in — coins landing.
  rentReceived: (c) => {
    tone(c, { freq: 700, dur: 0.09, type: 'triangle', gain: 0.16 });
    tone(c, { freq: 1050, dur: 0.22, type: 'triangle', gain: 0.15, at: 0.06 });
    noise(c, { dur: 0.18, at: 0.05, freq: 4200, q: 3, gain: 0.07 });
  },

  // Tax — a dull, heavy hit.
  tax: (c) => {
    tone(c, { freq: 180, to: 90, dur: 0.34, type: 'sawtooth', gain: 0.2 });
    noise(c, { dur: 0.16, freq: 320, type: 'lowpass', gain: 0.16 });
  },

  // Card draw — paper flick, then a small chime.
  card: (c) => {
    noise(c, { dur: 0.16, freq: 900, to: 4200, q: 1.2, gain: 0.16 });
    tone(c, { freq: 1046, dur: 0.2, type: 'sine', gain: 0.14, at: 0.13 });
  },

  // Auction opens — wooden knock.
  gavel: (c) => {
    tone(c, { freq: 260, to: 120, dur: 0.11, type: 'square', gain: 0.22 });
    noise(c, { dur: 0.07, freq: 1800, q: 2, gain: 0.18 });
  },

  bid: (c) => tone(c, { freq: 640, to: 880, dur: 0.1, type: 'square', gain: 0.15 }),

  auctionWon: (c) => {
    tone(c, { freq: 260, to: 120, dur: 0.1, type: 'square', gain: 0.2 });
    tone(c, { freq: 659, dur: 0.12, type: 'triangle', gain: 0.18, at: 0.12 });
    tone(c, { freq: 988, dur: 0.28, type: 'triangle', gain: 0.2, at: 0.22 });
  },

  // Nobody bid — a flat, deflating blip.
  auctionDud: (c) => tone(c, { freq: 300, to: 190, dur: 0.26, type: 'sine', gain: 0.16 }),

  // Hammer on timber.
  build: (c) => {
    noise(c, { dur: 0.06, freq: 2400, q: 4, gain: 0.2 });
    tone(c, { freq: 150, to: 80, dur: 0.16, type: 'sine', gain: 0.26, at: 0.01 });
  },

  // Tearing a building down.
  demolish: (c) => {
    noise(c, { dur: 0.3, freq: 1800, to: 260, q: 1, gain: 0.2 });
    tone(c, { freq: 140, to: 60, dur: 0.3, type: 'sawtooth', gain: 0.14 });
  },

  mortgage: (c) => tone(c, { freq: 420, to: 190, dur: 0.3, type: 'triangle', gain: 0.2 }),
  unmortgage: (c) => tone(c, { freq: 300, to: 720, dur: 0.28, type: 'triangle', gain: 0.2 }),

  // Cell door: dissonant metallic clang.
  jailIn: (c) => {
    noise(c, { dur: 0.34, freq: 1400, to: 500, q: 1.5, gain: 0.22 });
    tone(c, { freq: 196, dur: 0.4, type: 'square', gain: 0.14 });
    tone(c, { freq: 207, dur: 0.4, type: 'square', gain: 0.12 }); // beating = metallic
  },

  jailOut: (c) => {
    tone(c, { freq: 392, dur: 0.1, type: 'triangle', gain: 0.18 });
    tone(c, { freq: 587, dur: 0.1, type: 'triangle', gain: 0.18, at: 0.08 });
    tone(c, { freq: 880, dur: 0.24, type: 'triangle', gain: 0.2, at: 0.16 });
  },

  // Incoming offer — notification two-tone.
  tradeOffer: (c) => {
    tone(c, { freq: 784, dur: 0.11, type: 'sine', gain: 0.18 });
    tone(c, { freq: 1046, dur: 0.2, type: 'sine', gain: 0.18, at: 0.1 });
  },

  tradeAccepted: (c) => {
    tone(c, { freq: 659, dur: 0.14, type: 'triangle', gain: 0.18 });
    tone(c, { freq: 830, dur: 0.28, type: 'triangle', gain: 0.18, at: 0.11 });
  },

  tradeRejected: (c) => {
    tone(c, { freq: 240, dur: 0.18, type: 'sawtooth', gain: 0.16 });
    tone(c, { freq: 226, dur: 0.22, type: 'sawtooth', gain: 0.14, at: 0.02 });
  },

  // Slow, sinking minor fall.
  bankrupt: (c) => {
    tone(c, { freq: 440, dur: 0.2, type: 'triangle', gain: 0.18 });
    tone(c, { freq: 349, dur: 0.2, type: 'triangle', gain: 0.18, at: 0.18 });
    tone(c, { freq: 262, dur: 0.5, type: 'triangle', gain: 0.2, at: 0.36 });
    tone(c, { freq: 131, dur: 0.6, type: 'sine', gain: 0.16, at: 0.36 });
  },

  // Winner fanfare.
  victory: (c) => {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => tone(c, { freq: f, dur: 0.18, type: 'triangle', gain: 0.2, at: i * 0.12 }));
    tone(c, { freq: 1318, dur: 0.6, type: 'triangle', gain: 0.22, at: 0.5 });
    noise(c, { dur: 0.5, at: 0.5, freq: 6000, q: 2, gain: 0.06 });
  },

  click: (c) => tone(c, { freq: 900, dur: 0.03, type: 'sine', gain: 0.1 }),
};

/** Play a sound by name. No-op when muted or when Web Audio is unavailable. */
export function playSfx(name: SfxName): void {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c || !master) return;
  if (c.state === 'suspended') void c.resume();
  try {
    RECIPES[name](c);
  } catch {
    /* never let a sound break the game */
  }
}
