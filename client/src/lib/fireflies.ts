// Kokiri Forest fairy lights: a single canvas of soft motes that drift
// and twinkle behind the page. Cheap to paint (one pre-baked sprite,
// no filters, no page transforms). Paused when the tab is hidden.
// Under prefers-reduced-motion we draw a still frame and stop.

export interface FireflyOptions {
  reducedMotion?: boolean;
  isHidden?: () => boolean;
  count?: number;
}

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  twinkle: number;
  sprite: number;
}


function bakeSprites(): HTMLCanvasElement[] {
  // Three soft glows, gold / leaf-green / warm white, baked so the
  // animation loop never calls createRadialGradient or shadowBlur.
  const recipes: Array<[number, number, number]> = [
    [255, 228, 150],
    [190, 230, 150],
    [255, 248, 220],
  ];
  return recipes.map(([r, g, b]) => {
    const s = 64;
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const ctx = c.getContext("2d")!;
    const gdt = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gdt.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gdt.addColorStop(0.15, `rgba(${r},${g},${b},0.7)`);
    gdt.addColorStop(0.45, `rgba(${r},${g},${b},0.16)`);
    gdt.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gdt;
    ctx.fillRect(0, 0, s, s);
    return c;
  });
}

function seed(count: number, w: number, h: number): Mote[] {
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    motes.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 5.5 + Math.random() * 9,
      vx: (Math.random() - 0.5) * 6,
      vy: -2 - Math.random() * 8,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.35 + Math.random() * 0.55,
      sprite: Math.random() < 0.12 ? 2 : Math.random() < 0.45 ? 1 : 0,
    });
  }
  return motes;
}

function paint(
  ctx: CanvasRenderingContext2D,
  sprites: HTMLCanvasElement[],
  motes: Mote[],
  dark: boolean,
  t: number,
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  // Additive glow reads as lantern-light at night; on parchment we
  // keep ordinary source-over so motes stay soft, not blown out.
  ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
  const base = dark ? 0.8 : 0.38;
  for (const m of motes) {
    const pulse = 0.45 + 0.55 * Math.abs(Math.sin(t * m.twinkle + m.phase));
    const size = m.r * (0.85 + 0.3 * pulse) * 2;
    ctx.globalAlpha = base * pulse;
    ctx.drawImage(sprites[m.sprite] ?? sprites[0], m.x - size / 2, m.y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function isDarkTheme(): boolean {
  const theme = document.documentElement.dataset.theme;
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

/**
 * Starts the forest-light animation on `canvas`. Returns a disposer.
 * Positions are in CSS pixels; the canvas is sized to the viewport.
 */
export function startFireflies(canvas: HTMLCanvasElement, opts: FireflyOptions = {}): () => void {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};

  const reduced =
    opts.reducedMotion ?? window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const hidden = opts.isHidden ?? (() => document.hidden);
  const cssW = () => window.innerWidth;
  const cssH = () => Math.max(window.innerHeight, document.documentElement.clientHeight);
  const count = Math.max(30, Math.min(50, opts.count ?? (cssW() < 600 ? 34 : 44)));

  const sprites = bakeSprites();
  let w = 0;
  let h = 0;
  let motes: Mote[] = [];
  let raf = 0;
  let last = 0;
  let running = false;

  const resize = () => {
    const nextW = cssW();
    const nextH = cssH();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(nextW * dpr));
    canvas.height = Math.max(1, Math.round(nextH * dpr));
    canvas.style.width = `${nextW}px`;
    canvas.style.height = `${nextH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (motes.length === 0) {
      motes = seed(count, nextW, nextH);
    } else if (w > 0 && h > 0) {
      const sx = nextW / w;
      const sy = nextH / h;
      for (const m of motes) {
        m.x *= sx;
        m.y *= sy;
      }
    }
    w = nextW;
    h = nextH;
  };

  const step = (now: number, dt: number) => {
    for (const m of motes) {
      // Slow wander, plus a long, gentle sidesway.
      m.x += (m.vx + Math.sin(now * 0.00015 + m.phase) * 4) * dt;
      m.y += m.vy * dt;
      if (m.y < -20) m.y = h + 20;
      if (m.y > h + 20) m.y = -20;
      if (m.x < -20) m.x = w + 20;
      if (m.x > w + 20) m.x = -20;
    }
    paint(ctx, sprites, motes, isDarkTheme(), now * 0.001);
  };

  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(now, dt);
    raf = requestAnimationFrame(frame);
  };

  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const start = () => {
    if (reduced || hidden() || running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const onVis = () => {
    if (hidden()) stop();
    else start();
  };

  resize();
  paint(ctx, sprites, motes, isDarkTheme(), 0);
  if (!reduced) start();

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", onVis);

  return () => {
    stop();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVis);
  };
}
