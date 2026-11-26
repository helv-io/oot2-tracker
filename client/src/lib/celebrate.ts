// A short shower of golden Triforce shards. One canvas, removed when the
// last shard settles; skipped entirely for reduced-motion users.

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
}

const COLORS = ["#e6cd8a", "#c9a95c", "#f4e6bd", "#b89a4e", "#fff4d2"];

export function celebrate({ big = false, x, y }: { big?: boolean; x?: number; y?: number } = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: `${w}px`, height: `${h}px`, pointerEvents: "none", zIndex: "60" });
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();
  ctx.scale(dpr, dpr);

  const ox = x ?? w / 2;
  const oy = y ?? h * 0.35;
  const count = big ? 160 : 46;
  const shards: Shard[] = Array.from({ length: count }, () => {
    const angle = big ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const speed = (big ? 5 : 3.6) + Math.random() * (big ? 7 : 4.5);
    return {
      x: big ? w * Math.random() : ox,
      y: big ? -20 - Math.random() * h * 0.4 : oy,
      vx: big ? (Math.random() - 0.5) * 2 : Math.cos(angle) * speed,
      vy: big ? 1.5 + Math.random() * 3 : Math.sin(angle) * speed,
      size: 5 + Math.random() * (big ? 9 : 6),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.25,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
    };
  });

  let last = performance.now();
  const end = last + (big ? 4200 : 1500);
  const frame = (now: number) => {
    const dt = Math.min(2, (now - last) / 16.7);
    last = now;
    ctx.clearRect(0, 0, w, h);
    let alive = 0;
    for (const s of shards) {
      s.vy += (big ? 0.06 : 0.16) * dt;
      s.vx *= 0.99;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
      if (now > end - 500) s.life = Math.max(0, (end - now) / 500);
      if (s.y > h + 30 || s.life <= 0) continue;
      alive++;
      ctx.save();
      ctx.globalAlpha = s.life;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(0, -s.size * 0.6);
      ctx.lineTo(s.size * 0.55, s.size * 0.4);
      ctx.lineTo(-s.size * 0.55, s.size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (alive > 0 && now < end) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** A tiny tap of haptic feedback where the device supports it. */
export function buzz(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported
  }
}
