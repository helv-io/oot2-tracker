// Hand-drawn, OoT-inspired icon set as inline SVG. No external assets:
// the golden Skulltula token, the quarter Piece of Heart, the full Heart
// Container, and small emblems for each checklist section.

interface IconProps {
  size?: number;
  className?: string;
}

export function SkulltulaIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      {/* legs */}
      <g stroke="#8a6d1f" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M14 18 L5 10" />
        <path d="M13 26 L3 24" />
        <path d="M15 34 L6 40" />
        <path d="M34 18 L43 10" />
        <path d="M35 26 L45 24" />
        <path d="M33 34 L42 40" />
      </g>
      {/* body */}
      <ellipse cx="24" cy="27" rx="12" ry="13" fill="#c9a227" stroke="#7c5f14" strokeWidth="1.6" />
      {/* skull face */}
      <path
        d="M24 8c5.5 0 9 3.8 9 8.6 0 3.4-1.9 5.6-4 7.1v3.1c0 1-0.8 1.7-1.7 1.7h-6.6c-0.9 0-1.7-0.7-1.7-1.7v-3.1c-2.1-1.5-4-3.7-4-7.1C15 11.8 18.5 8 24 8z"
        fill="#e7c65a"
        stroke="#7c5f14"
        strokeWidth="1.4"
      />
      <circle cx="19.8" cy="17" r="2.6" fill="#3a2a08" />
      <circle cx="28.2" cy="17" r="2.6" fill="#3a2a08" />
      <path d="M24 20.5l-1.6 3h3.2z" fill="#3a2a08" />
      <path d="M20 25.4h8" stroke="#3a2a08" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function HeartPieceIcon({ size = 22, className }: IconProps) {
  // A heart with only the top-left quarter filled — the Piece of Heart.
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <clipPath id="hp-clip">
          <path d="M24 42S6 30.6 6 17.9C6 10.9 11.2 6 17.4 6c2.9 0 5.3 1.4 6.6 3.4C25.3 7.4 27.7 6 30.6 6C36.8 6 42 10.9 42 17.9C42 30.6 24 42 24 42z" />
        </clipPath>
      </defs>
      <g clipPath="url(#hp-clip)">
        <rect x="4" y="4" width="40" height="40" fill="#d8c9a3" />
        <rect x="4" y="4" width="20" height="20" fill="#c0392b" />
        <path d="M24 4v40M4 24h40" stroke="#8a6d1f" strokeWidth="1.6" />
      </g>
      <path
        d="M24 42S6 30.6 6 17.9C6 10.9 11.2 6 17.4 6c2.9 0 5.3 1.4 6.6 3.4C25.3 7.4 27.7 6 30.6 6C36.8 6 42 10.9 42 17.9C42 30.6 24 42 24 42z"
        fill="none"
        stroke="#7c2d20"
        strokeWidth="2"
      />
    </svg>
  );
}

export function HeartContainerIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M24 43S5 31.2 5 18.2C5 10.8 10.4 5.5 17 5.5c3 0 5.5 1.4 7 3.6 1.5-2.2 4-3.6 7-3.6 6.6 0 12 5.3 12 12.7C43 31.2 24 43 24 43z"
        fill="#c0392b"
        stroke="#e7c65a"
        strokeWidth="2.6"
      />
      <path
        d="M24 43S5 31.2 5 18.2C5 10.8 10.4 5.5 17 5.5c3 0 5.5 1.4 7 3.6 1.5-2.2 4-3.6 7-3.6 6.6 0 12 5.3 12 12.7C43 31.2 24 43 24 43z"
        fill="none"
        stroke="#7c2d20"
        strokeWidth="1"
        transform="scale(0.86) translate(3.9 3.9)"
        opacity="0.5"
      />
      <ellipse cx="16" cy="14" rx="4.4" ry="2.8" fill="#e88" opacity="0.75" transform="rotate(-24 16 14)" />
    </svg>
  );
}

export function TriforceIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g fill="#c9a227" stroke="#7c5f14" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M24 5 L33 20 L15 20 Z" />
        <path d="M14.5 22 L23.5 37 L5.5 37 Z" transform="translate(0 4)" />
        <path d="M33.5 22 L42.5 37 L24.5 37 Z" transform="translate(0 4)" />
      </g>
    </svg>
  );
}

export function BottleIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M20 4h8v5h-8z" fill="#a9743f" stroke="#6e4a22" strokeWidth="1.4" />
      <path
        d="M19 9c0 4-5 6.4-5 12v14a7 7 0 0 0 7 7h6a7 7 0 0 0 7-7V21c0-5.6-5-8-5-12z"
        fill="#bcd8e8"
        fillOpacity="0.65"
        stroke="#5b7d94"
        strokeWidth="1.8"
      />
      <path d="M14.5 27h19v8a6.5 6.5 0 0 1-6.5 6.5h-6A6.5 6.5 0 0 1 14.5 35z" fill="#7fb3d9" fillOpacity="0.8" />
    </svg>
  );
}

export function NoteIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g fill="#8a6d1f">
        <path d="M30 6v22.5a6.75 5.5 0 1 1-3-4.65V14l14-3.2V26a6.75 5.5 0 1 1-3-4.65V6z" />
      </g>
    </svg>
  );
}

export function RupeeIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M24 3 L38 15 L38 33 L24 45 L10 33 L10 15 Z" fill="#3f9e4d" stroke="#256b31" strokeWidth="2" />
      <path d="M24 10 L32 17 L32 31 L24 38 L16 31 L16 17 Z" fill="#57bd68" />
    </svg>
  );
}

export function PinIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M24 44S10 29.6 10 18.5C10 10.8 16.3 5 24 5s14 5.8 14 13.5C38 29.6 24 44 24 44z"
        fill="#1e3a29"
        stroke="#c9a227"
        strokeWidth="2"
      />
      <circle cx="24" cy="18.5" r="6" fill="#e7c65a" />
    </svg>
  );
}

export function SectionIcon({ kind, size = 22 }: { kind: string; size?: number }) {
  switch (kind) {
    case "pin":
      return <PinIcon size={size} />;
    case "skulltula":
      return <SkulltulaIcon size={size} />;
    case "heart":
      return <HeartPieceIcon size={size} />;
    case "bottle":
      return <BottleIcon size={size} />;
    case "song":
      return <NoteIcon size={size} />;
    case "merchant":
      return <RupeeIcon size={size} />;
    case "quest":
      return <TriforceIcon size={size} />;
    default:
      return <TriforceIcon size={size} />;
  }
}
