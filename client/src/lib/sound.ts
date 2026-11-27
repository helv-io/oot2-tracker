// Background music (a faint, looped Zelda's Lullaby) and the item-get
// fanfare. One Web Audio graph with a master gain, so volume works on
// iOS too (HTMLAudioElement.volume is read-only there). Browsers block
// autoplay, so nothing starts until the first tap or key press. One mute
// switch, remembered on the device, silences both.

export const SOUND_KEY = "oot-100-checklist:sound:v1";
export const MUSIC_VOLUME = 0.1;
const SFX_VOLUME = 0.55;
const FADE_IN_S = 4;

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

function pickFormat(): "webm" | "m4a" {
  const probe = typeof document !== "undefined" ? document.createElement("audio") : null;
  return probe?.canPlayType('audio/webm; codecs="opus"') ? "webm" : "m4a";
}

class Sound {
  muted = readMuted();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private music: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private listeners = new Set<Listener>();
  private started = false;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Call from a user gesture: creates the audio graph and starts the music. */
  unlock(): void {
    if (this.started) {
      void this.ctx?.resume().catch(() => undefined);
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.started = true;
    try {
      this.ctx = new Ctx();
    } catch {
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    void this.ctx.resume().catch(() => undefined);
    void this.startMusic();
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
    for (const fn of this.listeners) fn(muted);
  }

  /** The item-get flourish. Silent when muted or before the first gesture. */
  fanfare(): void {
    if (this.muted || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const master = this.master;
    void this.load("item-get").then((buf) => {
      if (!buf || this.muted) return;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = SFX_VOLUME;
      src.buffer = buf;
      src.connect(gain).connect(master);
      // Duck the music under the fanfare, then bring it back.
      const now = ctx.currentTime;
      this.musicGain?.gain.setTargetAtTime(MUSIC_VOLUME * 0.25, now, 0.08);
      this.musicGain?.gain.setTargetAtTime(MUSIC_VOLUME, now + buf.duration, 0.6);
      src.start();
    });
  }

  private load(name: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(name);
    if (!p) {
      const ctx = this.ctx;
      p = fetch(`/assets/audio/${name}.${pickFormat()}`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((data) => (ctx ? ctx.decodeAudioData(data) : null))
        .catch(() => null);
      this.buffers.set(name, p);
    }
    return p;
  }

  private async startMusic(): Promise<void> {
    const buf = await this.load("lullaby");
    if (!buf || !this.ctx || !this.master || this.music) return;
    const ctx = this.ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.setValueAtTime(0, ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(MUSIC_VOLUME, ctx.currentTime + FADE_IN_S);
    this.musicGain.connect(this.master);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.musicGain);
    src.start();
    this.music = src;
    // Pause with the tab so it never plays to an empty room.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) void ctx.suspend().catch(() => undefined);
      else void ctx.resume().catch(() => undefined);
    });
  }
}

export const sound = new Sound();

/** Start audio on the first real interaction (autoplay policy). */
export function armSoundOnFirstGesture(): () => void {
  const go = () => {
    sound.unlock();
    off();
  };
  const off = () => {
    window.removeEventListener("pointerdown", go, true);
    window.removeEventListener("keydown", go, true);
  };
  window.addEventListener("pointerdown", go, true);
  window.addEventListener("keydown", go, true);
  return off;
}
