// Background music (a faint, looping playlist of Ocarina of Time songs)
// and the item-get fanfare. Volume is a Web Audio GainNode because
// HTMLAudioElement.volume is read-only on iOS. Autoplay is blocked, so
// nothing starts until a user gesture, and that gesture must call play()
// (or resume + start) itself, not after a fetch or await, or iOS will
// refuse. The first-gesture listener stays until music actually starts,
// so a rejected play() can be retried.
//
// Real browsers use a pair of <audio> elements so play() can run in the
// gesture and a second deck is already unlocked for the next track.
// Playwright's Linux WebKit crashes if those files are used as a media
// src, and decodeAudioData of the same files has also been seen to take
// the page down later in a run. Automated WebKit therefore does not
// load audio at all; unlock() still counts the gesture so e2e can tell
// that the retry path ran.

export const SOUND_KEY = "oot-100-checklist:sound:v1";
/** Quiet enough to sit under the page, about a third of the old 0.1. */
export const MUSIC_VOLUME = 0.033;
const SFX_VOLUME = 0.5;
const FADE_IN_S = 8;
export const CROSSFADE_S = 5.5;
const OPUS = 'audio/webm; codecs="opus"';

export const PLAYLIST = [
  { id: "lullaby", title: "Zelda's Lullaby" },
  { id: "epona", title: "Epona's Song" },
  { id: "saria", title: "Saria's Song" },
  { id: "sun", title: "Sun's Song" },
  { id: "time", title: "Song of Time" },
  { id: "storms", title: "Song of Storms" },
  { id: "minuet", title: "Minuet of Forest" },
  { id: "bolero", title: "Bolero of Fire" },
  { id: "serenade", title: "Serenade of Water" },
  { id: "nocturne", title: "Nocturne of Shadow" },
  { id: "requiem", title: "Requiem of Spirit" },
  { id: "prelude", title: "Prelude of Light" },
] as const;

export type TrackId = (typeof PLAYLIST)[number]["id"];

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

export function shuffleTracks(items: readonly (typeof PLAYLIST)[number][] = PLAYLIST): TrackId[] {
  const out = items.map((t) => t.id);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

function srcFor(name: string, format: "webm" | "m4a"): string {
  return `/assets/audio/${name}.${format}`;
}

class Sound {
  muted = readMuted();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxEl: HTMLAudioElement | null = null;
  private decks: Array<{ el: HTMLAudioElement; gain: GainNode | null }> = [];
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private bufferSources: Array<{ src: AudioBufferSourceNode; gain: GainNode; startedAt: number; duration: number } | null> = [null, null];
  private format: "webm" | "m4a" = pickFormat();
  private useElement = preferMediaElement();
  private fallback = new Set<string>();
  private listeners = new Set<Listener>();
  private tries = 0;
  private fadeStarted = false;
  private wantMusic = true;
  private hiddenPaused = false;
  private visibilityBound = false;
  private order: TrackId[] = [];
  private index = 0;
  private active = 0;
  private fading = false;
  private watchId = 0;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** True once a track is actually running (including into a muted gain). */
  isPlaying(): boolean {
    if (this.useElement) {
      return this.decks.some((d) => d.el && !d.el.paused && d.el.readyState >= 2);
    }
    return this.bufferSources.some((s) => !!s) && this.ctx?.state === "running";
  }

  /** Stop playback. Used by the motion e2e so later steps are quiet. */
  silence(): void {
    this.wantMusic = false;
    for (const d of this.decks) d.el.pause();
    this.sfxEl?.pause();
    this.stopBuffers();
    void this.ctx?.suspend().catch(() => undefined);
    this.publish();
  }

  /** Call from a user gesture: must invoke play()/resume() before any await. */
  unlock(): void {
    this.ensureGraph();
    void this.ctx?.resume().catch(() => undefined);
    this.bindVisibility();
    // If the device is muted, only unlock the context. Loading the
    // media files here can crash Playwright's Linux WebKit, and a later
    // unmute is itself a gesture, so play() can wait until then.
    if (this.muted) {
      this.publish();
      return;
    }
    if (this.order.length === 0) this.order = shuffleTracks();
    if (this.useElement) {
      this.ensureElements();
      this.tryPlayMusic();
    } else {
      this.tries += 1;
      void this.startBufferMusic();
      this.publish();
    }
    this.watch();
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
    if (!this.ctx || !this.musicBus) return;
    const now = this.ctx.currentTime;
    const g = this.musicBus.gain;
    const top = this.muted ? 0 : MUSIC_VOLUME;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(top * 0.2, now, 0.1);
    g.setTargetAtTime(top, now + seconds, 0.8);
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
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);
  }

  private ensureElements(): void {
    if (!this.useElement) return;
    if (this.decks.length === 0) {
      this.decks = [this.makeDeck(0), this.makeDeck(1)];
      this.loadDeck(0, this.order[0] ?? "lullaby");
      this.loadDeck(1, this.order[1] ?? "epona");
    }
    if (!this.sfxEl) this.sfxEl = this.makeEl("item-get", false, "fanfare");
    if (this.ctx && this.musicBus) {
      for (const d of this.decks) {
        if (d.el.dataset.wired === "1") continue;
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        this.ctx.createMediaElementSource(d.el).connect(gain).connect(this.musicBus);
        d.gain = gain;
        d.el.dataset.wired = "1";
      }
      if (this.sfxEl.dataset.wired !== "1") {
        const gain = this.ctx.createGain();
        gain.gain.value = SFX_VOLUME;
        this.ctx.createMediaElementSource(this.sfxEl).connect(gain).connect(this.master!);
        this.sfxEl.dataset.wired = "1";
      }
    }
    const active = this.decks[this.active];
    if (active?.gain && this.ctx) active.gain.gain.setValueAtTime(1, this.ctx.currentTime);
  }

  private makeDeck(slot: number): { el: HTMLAudioElement; gain: GainNode | null } {
    return { el: this.makeEl("music", false, "music", slot), gain: null };
  }

  private makeEl(name: string, loop: boolean, kind: string, slot?: number): HTMLAudioElement {
    const el = document.createElement("audio");
    el.dataset.sound = kind === "music" ? "music" : name;
    if (slot !== undefined) el.dataset.deck = String(slot);
    el.preload = "auto";
    el.loop = loop;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
    el.crossOrigin = "anonymous";
    el.className = "sound-el";
    el.addEventListener("error", () => this.onError(el));
    el.addEventListener("playing", () => {
      if (kind === "music") {
        this.beginFade();
        this.publish();
      }
    });
    document.body.appendChild(el);
    return el;
  }

  private loadDeck(slot: number, id: TrackId): void {
    const d = this.decks[slot];
    if (!d) return;
    d.el.dataset.track = id;
    d.el.src = srcFor(id, this.format);
    d.el.load();
  }

  private onError(el: HTMLAudioElement): void {
    const name = el.dataset.track || el.dataset.sound || "";
    const key = `${name}:${el.dataset.deck ?? "sfx"}`;
    if (this.fallback.has(key) || !name) {
      this.publish();
      return;
    }
    this.fallback.add(key);
    const next = this.format === "webm" ? "m4a" : "webm";
    this.format = next;
    el.src = srcFor(name, next);
    el.load();
    this.publish();
  }

  /** Must stay synchronous: this is the call iOS treats as the gesture. */
  private tryPlayMusic(): void {
    if (!this.wantMusic || this.decks.length < 2) return;
    const current = this.decks[this.active];
    const standby = this.decks[1 - this.active];
    if (!current) return;
    this.tries += 1;
    const play = current.el.play();
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
    // Unlock the second deck in the same gesture so a later crossfade can play().
    if (standby && standby.el.src) {
      const p2 = standby.el.play();
      if (p2) void p2.then(() => standby.el.pause()).catch(() => undefined);
      else standby.el.pause();
    }
    this.publish();
  }

  private watch(): void {
    if (this.watchId || typeof requestAnimationFrame === "undefined") return;
    const tick = () => {
      this.watchId = requestAnimationFrame(tick);
      if (!this.wantMusic || document.hidden || this.fading) return;
      if (this.useElement) {
        const el = this.decks[this.active]?.el;
        if (!el || !el.duration || el.paused) return;
        if (el.duration - el.currentTime <= CROSSFADE_S) this.crossfade();
      } else {
        const cur = this.bufferSources[this.active];
        if (!cur || !this.ctx) return;
        const remaining = cur.duration - (this.ctx.currentTime - cur.startedAt);
        if (remaining <= CROSSFADE_S) void this.crossfadeBuffer();
      }
    };
    this.watchId = requestAnimationFrame(tick);
  }

  private crossfade(): void {
    if (this.fading || this.decks.length < 2 || !this.ctx) return;
    const nextIndex = (this.index + 1) % this.order.length;
    const incoming = this.decks[1 - this.active];
    const outgoing = this.decks[this.active];
    if (!incoming || !outgoing) return;
    this.fading = true;
    const track = this.order[nextIndex] ?? "lullaby";
    if (incoming.el.dataset.track !== track) this.loadDeck(1 - this.active, track);
    try {
      incoming.el.currentTime = 0;
    } catch {
      // not ready; play() still starts at the beginning
    }
    const now = this.ctx.currentTime;
    incoming.gain?.gain.cancelScheduledValues(now);
    outgoing.gain?.gain.cancelScheduledValues(now);
    incoming.gain?.gain.setValueAtTime(0, now);
    incoming.gain?.gain.linearRampToValueAtTime(1, now + CROSSFADE_S);
    outgoing.gain?.gain.setValueAtTime(outgoing.gain.gain.value, now);
    outgoing.gain?.gain.linearRampToValueAtTime(0, now + CROSSFADE_S);
    void incoming.el.play()?.catch(() => undefined);
    window.setTimeout(() => {
      outgoing.el.pause();
      this.active = 1 - this.active;
      this.index = nextIndex;
      const ahead = this.order[(this.index + 1) % this.order.length] ?? "lullaby";
      this.loadDeck(1 - this.active, ahead);
      this.fading = false;
    }, CROSSFADE_S * 1000);
  }

  private loadBuffer(name: string): Promise<AudioBuffer | null> {
    // useElement is false only for Playwright WebKit, where both an
    // <audio> src and decodeAudioData of these files can crash the page.
    if (!this.useElement) return Promise.resolve(null);
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
    if (!this.useElement) {
      this.publish();
      return;
    }
    if (this.bufferSources.some(Boolean)) {
      void this.ctx?.resume().catch(() => undefined);
      this.beginFade();
      this.publish();
      return;
    }
    const id = this.order[this.index] ?? "lullaby";
    const buf = await this.loadBuffer(id);
    if (!buf || !this.ctx || !this.musicBus || this.bufferSources.some(Boolean) || !this.wantMusic) {
      this.publish();
      return;
    }
    this.startBufferOn(this.active, buf);
    this.beginFade();
    this.publish();
    const ahead = this.order[(this.index + 1) % this.order.length] ?? "epona";
    void this.loadBuffer(ahead);
  }

  private startBufferOn(slot: number, buf: AudioBuffer): void {
    if (!this.ctx || !this.musicBus) return;
    const gain = this.ctx.createGain();
    gain.gain.value = slot === this.active ? 1 : 0;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain).connect(this.musicBus);
    try {
      src.start();
    } catch {
      return;
    }
    this.bufferSources[slot] = { src, gain, startedAt: this.ctx.currentTime, duration: buf.duration };
  }

  private async crossfadeBuffer(): Promise<void> {
    if (this.fading || !this.ctx || !this.musicBus) return;
    const nextIndex = (this.index + 1) % this.order.length;
    const track = this.order[nextIndex] ?? "lullaby";
    const buf = await this.loadBuffer(track);
    if (!buf || !this.wantMusic || this.fading) return;
    this.fading = true;
    const nextSlot = 1 - this.active;
    this.startBufferOn(nextSlot, buf);
    const now = this.ctx.currentTime;
    const incoming = this.bufferSources[nextSlot];
    const outgoing = this.bufferSources[this.active];
    incoming?.gain.gain.setValueAtTime(0, now);
    incoming?.gain.gain.linearRampToValueAtTime(1, now + CROSSFADE_S);
    outgoing?.gain.gain.setValueAtTime(outgoing.gain.gain.value, now);
    outgoing?.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_S);
    window.setTimeout(() => {
      if (outgoing) {
        try {
          outgoing.src.stop();
        } catch {
          /* already stopped */
        }
      }
      this.bufferSources[this.active] = null;
      this.active = nextSlot;
      this.index = nextIndex;
      this.fading = false;
      const ahead = this.order[(this.index + 1) % this.order.length] ?? "lullaby";
      void this.loadBuffer(ahead);
    }, CROSSFADE_S * 1000);
  }

  private stopBuffers(): void {
    for (let i = 0; i < this.bufferSources.length; i++) {
      const s = this.bufferSources[i];
      if (!s) continue;
      try {
        s.src.stop();
      } catch {
        /* already stopped */
      }
      this.bufferSources[i] = null;
    }
  }

  private beginFade(): void {
    if (!this.ctx || !this.musicBus || this.muted) return;
    if (this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const g = this.musicBus.gain;
    const already = this.fadeStarted && g.value >= MUSIC_VOLUME * 0.5;
    g.cancelScheduledValues(now);
    if (already) {
      g.setValueAtTime(MUSIC_VOLUME, now);
      return;
    }
    g.setValueAtTime(g.value, now);
    const remain = Math.max(1, FADE_IN_S * (1 - g.value / MUSIC_VOLUME));
    g.linearRampToValueAtTime(MUSIC_VOLUME, now + remain);
    this.fadeStarted = true;
  }

  private bindVisibility(): void {
    if (this.visibilityBound) return;
    this.visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.hiddenPaused = this.isPlaying();
        for (const d of this.decks) d.el.pause();
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
