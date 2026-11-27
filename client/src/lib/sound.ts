// Background music (a faint, looped Zelda's Lullaby) and the item-get
// fanfare. Volume is a Web Audio GainNode because HTMLAudioElement.volume
// is read-only on iOS. Autoplay is blocked, so nothing starts until a
// user gesture, and that gesture must call play() (or resume + start)
// itself, not after a fetch or await, or iOS will refuse. The first
// gesture listener stays until music actually starts, so a rejected
// play() can be retried.
//
// Real browsers use an <audio> element so play() can run in the gesture
// (the reliable iOS path). Playwright's Linux WebKit crashes if those
// files are used as a media src, so automated WebKit falls back to
// fetch + decodeAudioData, which the motion e2e already used safely.

export const SOUND_KEY = "oot-100-checklist:sound:v1";
export const MUSIC_VOLUME = 0.1;
const SFX_VOLUME = 0.55;
const FADE_IN_S = 4;
const OPUS = 'audio/webm; codecs="opus"';

type Listener = (muted: boolean) => void;

export function readMuted(storage: Pick<Storage, "getItem"> | null = safeStorage()): boolean {
  try {
    return storage?.getItem(SOUND_KEY) === "muted";
  } catch {
    return false;
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Prefer AAC unless the browser is confident it can decode Opus. */
export function pickFormat(canPlayType?: (type: string) => string): "webm" | "m4a" {
  let probe = canPlayType;
  if (!probe && typeof document !== "undefined") {
    const el = document.createElement("audio");
    probe = (t) => el.canPlayType(t);
  }
  if (!probe) return "m4a";
  return probe(OPUS) === "probably" ? "webm" : "m4a";
}

export function preferMediaElement(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
  webdriver = typeof navigator !== "undefined" && navigator.webdriver === true,
): boolean {
  const webkit = /AppleWebKit/i.test(ua) && !/Chrom(e|ium)/i.test(ua);
  if (webdriver && webkit) return false;
  return true;
}

function srcFor(name: string, format: "webm" | "m4a"): string {
  return `/assets/audio/${name}.${format}`;
}

class Sound {
  muted = readMuted();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicEl: HTMLAudioElement | null = null;
  private sfxEl: HTMLAudioElement | null = null;
  private musicSrc: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private format: "webm" | "m4a" = pickFormat();
  private useElement = preferMediaElement();
  private fallback = new Set<string>();
  private listeners = new Set<Listener>();
  private tries = 0;
  private fadeStarted = false;
  private wantMusic = true;
  private hiddenPaused = false;
  private visibilityBound = false;
  private gains = new WeakMap<HTMLAudioElement, GainNode>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** True once the lullaby is actually running (including into a muted gain). */
  isPlaying(): boolean {
    if (this.useElement) {
      const el = this.musicEl;
      return !!el && !el.paused && el.readyState >= 2;
    }
    return !!this.musicSrc && this.ctx?.state === "running";
  }

  /** Stop playback. Used by the motion e2e so later steps are quiet. */
  silence(): void {
    this.wantMusic = false;
    this.musicEl?.pause();
    this.sfxEl?.pause();
    if (this.musicSrc) {
      try { this.musicSrc.stop(); } catch { /* already stopped */ }
      this.musicSrc = null;
    }
    void this.ctx?.suspend().catch(() => undefined);
    this.publish();
  }

  /** Call from a user gesture: must invoke play()/resume() before any await. */
  unlock(): void {
    this.ensureGraph();
    void this.ctx?.resume().catch(() => undefined);
    if (this.useElement) {
      this.ensureElements();
      this.tryPlayMusic();
    } else {
      this.tries += 1;
      void this.startBufferMusic();
      this.publish();
    }
    this.bindVisibility();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      safeStorage()?.setItem(SOUND_KEY, muted ? "muted" : "on");
    } catch {
      // storage unavailable
    }
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.15);
      if (!muted) void this.ctx.resume().catch(() => undefined);
    }
    if (!muted) {
      this.wantMusic = true;
      if (this.useElement) this.tryPlayMusic();
      else void this.startBufferMusic();
    }
    this.publish();
    for (const fn of this.listeners) fn(muted);
  }

  /** The item-get flourish. Silent when muted. play() is called in this turn. */
  fanfare(): void {
    this.unlock();
    if (this.muted) return;
    if (this.useElement && this.sfxEl) {
      const el = this.sfxEl;
      try {
        el.currentTime = 0;
      } catch {
        // not ready yet; play() still starts from the beginning
      }
      void el.play()?.catch(() => undefined);
      this.duck(typeof el.duration === "number" && el.duration > 0 ? el.duration : 2.4);
      return;
    }
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    void this.loadBuffer("item-get").then((buf) => {
      if (!buf || this.muted) return;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = SFX_VOLUME;
      src.buffer = buf;
      src.connect(gain).connect(master);
      this.duck(buf.duration);
      try {
        src.start();
      } catch {
        // already started
      }
    });
  }

  private duck(seconds: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(MUSIC_VOLUME * 0.25, now, 0.08);
    this.musicGain.gain.setTargetAtTime(MUSIC_VOLUME, now + seconds, 0.6);
  }

  private ensureGraph(): void {
    if (this.ctx) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    try {
      this.ctx = new Ctx();
    } catch {
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
  }

  private ensureElements(): void {
    if (!this.useElement) return;
    if (!this.musicEl) this.musicEl = this.makeEl("lullaby", true);
    if (!this.sfxEl) this.sfxEl = this.makeEl("item-get", false);
    if (this.ctx && this.master && this.musicEl && this.musicEl.dataset.wired !== "1") {
      this.wire(this.musicEl, 0);
      this.musicGain = this.gains.get(this.musicEl) ?? null;
      this.musicEl.dataset.wired = "1";
    }
    if (this.ctx && this.master && this.sfxEl && this.sfxEl.dataset.wired !== "1") {
      this.wire(this.sfxEl, SFX_VOLUME);
      this.sfxEl.dataset.wired = "1";
    }
  }

  private makeEl(name: string, loop: boolean): HTMLAudioElement {
    const el = document.createElement("audio");
    el.dataset.sound = name;
    el.preload = "auto";
    el.loop = loop;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
    el.crossOrigin = "anonymous";
    el.className = "sound-el";
    el.src = srcFor(name, this.format);
    el.addEventListener("error", () => this.onError(name, el));
    el.addEventListener("playing", () => {
      if (name === "lullaby") {
        this.beginFade();
        this.publish();
      }
    });
    document.body.appendChild(el);
    return el;
  }

  private wire(el: HTMLAudioElement, initial: number): void {
    if (!this.ctx || !this.master) return;
    const src = this.ctx.createMediaElementSource(el);
    const gain = this.ctx.createGain();
    gain.gain.value = initial;
    src.connect(gain).connect(this.master);
    this.gains.set(el, gain);
  }

  private onError(name: string, el: HTMLAudioElement): void {
    if (this.fallback.has(name)) {
      this.publish();
      return;
    }
    this.fallback.add(name);
    const next = this.format === "webm" ? "m4a" : "webm";
    this.format = next;
    el.src = srcFor(name, next);
    el.load();
    // Switching src is not a user gesture; the next tap will call play().
    this.publish();
  }

  /** Must stay synchronous: this is the call iOS treats as the gesture. */
  private tryPlayMusic(): void {
    const el = this.musicEl;
    if (!el || !this.wantMusic) return;
    this.tries += 1;
    const play = el.play();
    if (play) {
      void play
        .then(() => {
          this.beginFade();
          this.publish();
        })
        .catch(() => {
          this.publish();
        });
    }
    this.publish();
  }

  private loadBuffer(name: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(name);
    if (!p) {
      const ctx = this.ctx;
      const tryFmt = async (fmt: "webm" | "m4a"): Promise<AudioBuffer | null> => {
        const res = await fetch(srcFor(name, fmt));
        if (!res.ok) return null;
        const data = await res.arrayBuffer();
        if (!ctx) return null;
        try {
          return await ctx.decodeAudioData(data);
        } catch {
          return null;
        }
      };
      p = tryFmt(this.format).then((buf) => {
        if (buf) return buf;
        const other = this.format === "webm" ? "m4a" : "webm";
        return tryFmt(other);
      });
      this.buffers.set(name, p);
    }
    return p;
  }

  private async startBufferMusic(): Promise<void> {
    if (this.musicSrc) {
      void this.ctx?.resume().catch(() => undefined);
      this.beginFade();
      this.publish();
      return;
    }
    const buf = await this.loadBuffer("lullaby");
    if (!buf || !this.ctx || !this.master || this.musicSrc || !this.wantMusic) {
      this.publish();
      return;
    }
    const ctx = this.ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.musicGain);
    try {
      src.start();
      this.musicSrc = src;
    } catch {
      this.publish();
      return;
    }
    this.beginFade();
    this.publish();
  }

  private beginFade(): void {
    if (!this.ctx || !this.musicGain || this.muted) return;
    if (this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const g = this.musicGain.gain;
    const already = this.fadeStarted && g.value >= MUSIC_VOLUME * 0.5;
    g.cancelScheduledValues(now);
    if (already) {
      g.setValueAtTime(MUSIC_VOLUME, now);
      return;
    }
    g.setValueAtTime(g.value, now);
    const remain = Math.max(0.4, FADE_IN_S * (1 - g.value / MUSIC_VOLUME));
    g.linearRampToValueAtTime(MUSIC_VOLUME, now + remain);
    this.fadeStarted = true;
  }

  private bindVisibility(): void {
    if (this.visibilityBound) return;
    this.visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.hiddenPaused = this.isPlaying();
        this.musicEl?.pause();
        void this.ctx?.suspend().catch(() => undefined);
      } else {
        void this.ctx?.resume().catch(() => undefined);
        if (this.hiddenPaused && this.wantMusic) {
          if (this.useElement) this.tryPlayMusic();
          else void this.startBufferMusic();
        }
        this.hiddenPaused = false;
        this.beginFade();
      }
    });
  }

  private publish(): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.lullabyTries = String(this.tries);
    root.dataset.lullaby = this.isPlaying() ? "on" : this.tries > 0 ? "pending" : "off";
  }
}

export const sound = new Sound();

/**
 * Start audio on a user gesture and keep listening until it actually
 * plays. A rejected play() (Safari's first-tap race, a late source, a
 * muted hardware switch that later flips) must not disarm the retry.
 */
export function armSoundOnFirstGesture(): () => void {
  (window as unknown as { __ootSilence?: () => void }).__ootSilence = () => sound.silence();
  const go = () => {
    sound.unlock();
    if (sound.isPlaying()) off();
  };
  const off = () => {
    window.removeEventListener("pointerdown", go, true);
    window.removeEventListener("keydown", go, true);
    window.removeEventListener("click", go, true);
  };
  window.addEventListener("pointerdown", go, true);
  window.addEventListener("keydown", go, true);
  window.addEventListener("click", go, true);
  return off;
}
