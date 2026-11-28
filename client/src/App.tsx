import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "./api";
import { ALL_ITEMS, SECTIONS, TOTAL_ITEMS, type CatalogItem } from "./data/catalog";
import { ITEM_ICON, eraGroups, journeyGroups, locationGroups, mapGroups, type ViewGroup } from "./data/views";
import { MAP_REGIONS } from "./data/map";
import { missingNeeds, needsHint, ownedKeys } from "./data/gating";
import { TONE_COLOR, placeOf, type Tone } from "./data/look";
import { ART } from "./data/art.generated";
import { Sprite } from "./components/Art";
import { Fireflies } from "./components/Fireflies";
import { HyruleMap, type RegionProgress } from "./components/HyruleMap";
import { HallMap } from "./components/HallMap";
import { buildChecklistPdf } from "./pdf";
import { WriteQueue, type QueueStatus } from "./lib/sync";
import { reconcile, sameSet } from "./lib/reconcile";
import { decodeProgress, encodeProgress } from "./lib/share";
import { buzz, celebrate } from "./lib/celebrate";
import { useInstallPrompt } from "./lib/pwa";
import { armSoundOnFirstGesture, sound } from "./lib/sound";

type StatusFilter = "all" | "todo" | "done";
type AgeFilter = "all" | "Child" | "Adult";
type ViewMode = "journey" | "places" | "eras" | "map" | "hall";
type ThemeMode = "system" | "light" | "dark";
type AccountState = "signedout" | "connecting" | "synced" | "conflict" | "offline";

// Device-side progress lives in browser storage under this key, so the
// checklist works (and keeps every tick) with or without an account.
const LOCAL_KEY = "oot-100-checklist:device-checks:v1";
const PREFS_KEY = "oot-100-checklist:prefs:v1";
const ALL_IDS: ReadonlySet<string> = new Set(ALL_ITEMS.map((i) => i.id));
const ALL_ID_LIST = ALL_ITEMS.map((i) => i.id);
// Health = 3 starting hearts + one per boss Heart Container actually
// earned (the eight dungeon-clear story items) + one per four pieces.
const BOSS_CONTAINER_IDS = ["story-1", "story-5", "story-7", "story-10", "story-11", "story-13", "story-15", "story-18"];
const SKULL_IDS = SECTIONS.find((s) => s.id === "skulltulas")?.items.map((i) => i.id) ?? [];
const HEART_IDS = SECTIONS.find((s) => s.id === "hearts")?.items.map((i) => i.id) ?? [];
// Lower-cased search text per item, built once.
const HAYSTACK: ReadonlyMap<string, string> = new Map(
  ALL_ITEMS.map((i) => [i.id, `${i.name} ${i.detail} ${i.area ?? ""}`.toLowerCase()]),
);
const SECTION_TITLE: ReadonlyMap<string, string> = new Map(
  SECTIONS.flatMap((s) => s.items.map((i) => [i.id, s.title.replace(/: All \d+$/, "")] as const)),
);
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Global search: name matches first, then descriptions, at most 8. */
function searchItems(q: string): CatalogItem[] {
  if (q.length < 2) return [];
  const byName: CatalogItem[] = [];
  const byText: CatalogItem[] = [];
  for (const item of ALL_ITEMS) {
    if (item.name.toLowerCase().includes(q)) byName.push(item);
    else if ((HAYSTACK.get(item.id) ?? "").includes(q)) byText.push(item);
  }
  return [...byName, ...byText].slice(0, 8);
}

function readDeviceChecks(): Set<string> {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string" && ALL_IDS.has(v)));
  } catch {
    return new Set();
  }
}

interface Prefs {
  view: ViewMode;
  filtersOpen: boolean;
  theme: ThemeMode;
  /** Smart filters, remembered on this device. */
  age: AgeFilter;
  hideDone: boolean;
  showLocks: boolean;
}

function readPrefs(): Prefs {
  const fallback: Prefs = { view: "journey", filtersOpen: false, theme: "system", age: "all", hideDone: false, showLocks: true };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) || "{}") as Partial<Prefs>;
    return {
      view: parsed.view === "places" || parsed.view === "eras" || parsed.view === "map" || parsed.view === "hall" ? parsed.view : "journey",
      filtersOpen: parsed.filtersOpen === true,
      theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : "system",
      age: parsed.age === "Child" || parsed.age === "Adult" ? parsed.age : "all",
      hideDone: parsed.hideDone === true,
      showLocks: parsed.showLocks !== false,
    };
  } catch {
    return fallback;
  }
}

/** A friend's shared progress from the URL (#p=...), if any. */
function readShared(): Set<string> | null {
  const m = /^#p=([A-Za-z0-9_-]+)$/.exec(window.location.hash);
  return m ? decodeProgress(m[1], ALL_IDS) : null;
}

function itemMatches(item: CatalogItem, q: string, status: StatusFilter, age: AgeFilter, hideDone: boolean, checked: ReadonlySet<string>) {
  const isDone = checked.has(item.id);
  if (hideDone && isDone) return false;
  if (status === "todo" && isDone) return false;
  if (status === "done" && !isDone) return false;
  if (age !== "all" && item.age && item.age !== "Both" && item.age !== age) return false;
  if (q && !(HAYSTACK.get(item.id) ?? "").includes(q)) return false;
  return true;
}

/** Wraps each match of q in <mark>. */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let at = 0;
  for (let i = lower.indexOf(q); i !== -1; i = lower.indexOf(q, i + q.length)) {
    if (i > at) parts.push(text.slice(at, i));
    parts.push(
      <mark key={i} className="hit">
        {text.slice(i, i + q.length)}
      </mark>,
    );
    at = i + q.length;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}

function Caret({ open, size = 18 }: { open: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s", flexShrink: 0 }}
    >
      <path d="M5 7.5 L10 12.5 L15 7.5" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const tone = (t: Tone) => TONE_COLOR[t];

/** The hero's big ring. */
function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[104px] w-[104px] shrink-0 sm:h-28 sm:w-28" role="img" aria-label={`${pct}% complete`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="rgba(10,15,12,0.45)" stroke="rgba(230,205,138,0.22)" strokeWidth="6" />
        <circle
          className="ring-arc"
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#gold-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
        <defs>
          <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f4e6bd" />
            <stop offset="1" stopColor="#c9a95c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <TriforceFill pct={pct} size={40} />
        <span className="font-display mt-1 text-[22px] leading-none text-[#f6eedb]">{pct}%</span>
      </div>
    </div>
  );
}

/** The one Triforce (triforce.webp), filling from the bottom with overall progress. */
function TriforceFill({ pct, size }: { pct: number; size: number }) {
  return (
    <span className="triforce-fill" style={{ width: size, height: size }} aria-hidden="true">
      <Sprite name="triforce" size={size} className="tf-base" />
      <span className="tf-top" style={{ clipPath: `inset(${100 - Math.max(0, Math.min(100, pct))}% 0 0 0)` }}>
        <Sprite name="triforce" size={size} className={pct >= 100 ? "glow" : ""} />
      </span>
    </span>
  );
}

/** A section emblem inside a thin progress ring in the section's colour. */
function Medallion({ icon, color, pct, size = 48 }: { icon: string; color: string; pct: number; size?: number }) {
  const r = 21;
  const c = 2 * Math.PI * r;
  const complete = pct >= 100;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="24" cy="24" r={r} strokeWidth="2.5" style={{ fill: `color-mix(in srgb, ${color} 38%, #101612)`, stroke: `color-mix(in srgb, ${color} 30%, transparent)` }} />
        <circle
          className="ring-arc"
          cx="24"
          cy="24"
          r={r}
          fill="none"
          style={{ stroke: complete ? "var(--gold)" : color }}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <Sprite name={icon} size={Math.round(size * 0.6)} className={`relative ${complete ? "glow" : ""}`} />
    </span>
  );
}

const Tag = ({ children, color }: { children: ReactNode; color?: string }) => (
  <span
    className="inline-flex items-center gap-1 rounded-full px-2 py-[1px] text-[11.5px] font-medium"
    style={{
      background: color ? `color-mix(in srgb, ${color} 12%, var(--surface))` : "var(--surface-alt)",
      color: color ? `color-mix(in srgb, ${color} 70%, var(--text))` : "var(--dim)",
      border: `1px solid ${color ? `color-mix(in srgb, ${color} 30%, transparent)` : "var(--border)"}`,
    }}
  >
    {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
    {children}
  </span>
);

const ItemRow = memo(function ItemRow({
  item,
  icon,
  isDone,
  query,
  readOnly,
  needs,
  onToggle,
}: {
  item: CatalogItem;
  icon: string;
  isDone: boolean;
  query: string;
  readOnly: boolean;
  /** "Needs Hookshot" when a key item is missing; empty otherwise. */
  needs: string;
  onToggle: (id: string, next: boolean) => void;
}) {
  const labelId = `lbl-${item.id}`;
  const [justDone, setJustDone] = useState(false);
  const areaColor = tone(placeOf(item.area).tone);
  return (
    <div id={`item-${item.id}`} className={`row flex scroll-mt-40 gap-3 px-3.5 py-3 sm:px-4 ${isDone ? "done" : ""}${needs && !isDone ? " locked" : ""}`} style={{ borderTop: "1px solid var(--border)" }}>
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-labelledby={labelId}
        aria-describedby={needs && !isDone ? `need-${item.id}` : undefined}
        aria-disabled={readOnly || undefined}
        onClick={() => {
          if (readOnly) return;
          if (!isDone) {
            setJustDone(true);
            buzz();
          }
          onToggle(item.id, !isDone);
        }}
        onAnimationEnd={() => setJustDone(false)}
        className={`check mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] ${justDone ? "just-done" : ""}`}
        style={{
          border: `1.5px solid ${isDone ? "var(--gold)" : "var(--border)"}`,
          background: isDone ? "color-mix(in srgb, var(--gold) 16%, var(--surface))" : "var(--surface-alt)",
          cursor: readOnly ? "default" : "pointer",
        }}
      >
        <Sprite name={icon} size={34} className="sprite" />
        {isDone && (
          <span
            className="absolute -right-1.5 -bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: "var(--gold)", boxShadow: "0 0 0 2px var(--surface)" }}
          >
            <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true" className="tick">
              <path d="M4 10.5 L8.2 14.5 L16 6" fill="none" stroke="var(--on-gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p id={labelId} className="title text-[15px] leading-snug font-semibold" style={{ color: "var(--text)" }}>
          <Highlight text={item.name} q={query} />
        </p>
        <p className="copy mt-0.5 text-[13.5px] leading-[1.45]" style={{ color: "var(--dim)" }}>
          <Highlight text={item.detail} q={query} />
        </p>
        {needs && !isDone && (
          <p id={`need-${item.id}`} className="need mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold">
            <svg width="11" height="11" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 9V6.5a4 4 0 0 1 8 0V9M4.5 9h11v8h-11z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            {needs}
          </p>
        )}
        <div className="copy mt-1.5 flex flex-wrap gap-1.5">
          {item.area && <Tag color={areaColor}>{item.area}</Tag>}
          {item.age && <Tag>{item.age === "Both" ? "Child & Adult" : `${item.age} Link`}</Tag>}
          {item.time && item.time !== "Any" && <Tag>{item.time} only</Tag>}
        </div>
      </div>
    </div>
  );
});

function GroupBlock({
  group,
  visibleItems,
  checked,
  filtering,
  query,
  readOnly,
  owned,
  defaultOpen = false,
  openSignal = 0,
  onToggle,
  onComplete,
}: {
  group: ViewGroup;
  visibleItems: CatalogItem[];
  checked: ReadonlySet<string>;
  filtering: boolean;
  query: string;
  readOnly: boolean;
  /** Key items owned, or null when locked items shouldn't be marked. */
  owned: ReadonlySet<string> | null;
  defaultOpen?: boolean;
  /** Changes when something outside (map, search) asks this group to open. */
  openSignal?: number;
  onToggle: (id: string, next: boolean) => void;
  onComplete: (group: ViewGroup, el: HTMLElement | null) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (openSignal) setOpen(true);
  }, [openSignal]);
  const isOpen = filtering || open;
  const doneCount = group.items.filter((i) => checked.has(i.id)).length;
  const total = group.items.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const bodyId = `body-${group.key}`;
  const color = tone(group.tone);
  const headRef = useRef<HTMLDivElement | null>(null);

  // Celebrate the moment a group fills up (not on first render).
  const prevDone = useRef(doneCount);
  useEffect(() => {
    if (!readOnly && prevDone.current < total && doneCount === total && total > 0) onComplete(group, headRef.current);
    prevDone.current = doneCount;
  }, [doneCount, total, group, onComplete, readOnly]);

  const title = group.title.replace(/: All \d+$/, "");
  return (
    <section id={`grp-${group.key}`} className="group-card scroll-mt-40">
      <div
        className="group-card-inner"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div
          ref={headRef}
          className="group-head"
          style={{
            background: `linear-gradient(100deg, color-mix(in srgb, ${color} var(--tint), var(--surface)) 0%, var(--surface) 70%)`,
            borderLeft: `3px solid ${color}`,
          }}
        >
          {filtering ? (
            <h2 className="flex items-center gap-3 px-4 pt-3 pb-2">
              <Medallion icon={group.icon} color={color} pct={pct} size={36} />
              <span className="font-display min-w-0 flex-1 text-[16px] leading-tight" style={{ color: "var(--text)" }}>
                {title}
              </span>
              <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--dim)" }}>
                {doneCount}/{total}
              </span>
            </h2>
          ) : (
            <h2>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={bodyId}
                onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left sm:px-4"
                style={{ minHeight: 64 }}
              >
                <Medallion icon={group.icon} color={color} pct={pct} />
                <span className="min-w-0 flex-1">
                  <span className="font-display block text-[17px] leading-tight" style={{ color: "var(--text)" }}>
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] font-medium tabular-nums" style={{ color: "var(--dim)" }}>
                    <span className="sr-only">Done: </span>
                    {doneCount === total && total > 0 ? "Complete" : `${doneCount} of ${total}`}
                  </span>
                </span>
                {doneCount === total && total > 0 && <Sprite name="triforce" size={18} className="glow" />}
                <Caret open={isOpen} />
              </button>
            </h2>
          )}
        </div>
        <div id={bodyId} className={isOpen ? "group-body is-open" : "group-body"} inert={!isOpen || undefined}>
          <div className="group-body-inner">
            {group.blurb && !filtering && (
              <p className="group-blurb px-4 pt-1 pb-3 text-[13.5px] leading-relaxed" style={{ color: "var(--dim)" }}>
                {group.blurb}
              </p>
            )}
            <div>
              {visibleItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  icon={ITEM_ICON.get(item.id) ?? group.icon}
                  isDone={checked.has(item.id)}
                  query={query}
                  readOnly={readOnly}
                  needs={owned ? needsHint(missingNeeds(item, owned)) : ""}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const goldButton: CSSProperties = {
  background: "linear-gradient(180deg, var(--gold-bright), var(--gold))",
  color: "var(--on-gold)",
  border: "1px solid color-mix(in srgb, var(--gold) 60%, #000)",
  minHeight: 40,
};
const quietButton: CSSProperties = { border: "1px solid var(--border)", color: "var(--text)", background: "var(--surface)", minHeight: 40 };

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3L18.6 21c1.9-1.7 3-4.3 3-8.8zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2L3.1 16.1A10 10 0 0 0 12 22zM6.4 13.9a6 6 0 0 1 0-3.8L3.1 7.9a10 10 0 0 0 0 8.2l3.3-2.2zM12 5.9c1.5 0 2.8.5 3.8 1.5L18.6 4.6A10 10 0 0 0 3.1 7.9l3.3 2.2C7.2 7.7 9.4 5.9 12 5.9z"
      />
    </svg>
  );
}
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fillOpacity="0.25" />
      {muted ? (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      ) : (
        <>
          <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
          <path d="M18 6.5a7.8 7.8 0 0 1 0 11" />
        </>
      )}
    </svg>
  );
}

/** Two-tap destructive button: the first tap arms it for 4 seconds. */
function ConfirmButton({ label, confirmLabel, onConfirm, disabled }: { label: string; confirmLabel: string; onConfirm: () => void; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (timer.current) clearTimeout(timer.current);
        if (!armed) {
          setArmed(true);
          timer.current = setTimeout(() => setArmed(false), 4000);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
      className="rounded-lg px-3.5 text-[14px] font-semibold"
      style={{
        background: armed ? "#9b3a33" : "var(--surface)",
        color: armed ? "#fff" : "var(--text)",
        border: "1px solid var(--border)",
        minHeight: 40,
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

interface Toast {
  id: number;
  text: string;
  tone: "ok" | "warn";
}
export function App() {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({ queryKey: ["session"], queryFn: api.getSession, retry: 1 });
  const user = sessionQuery.data?.user ?? null;
  const googleConfigured = sessionQuery.data?.googleConfigured ?? false;
  const signedIn = Boolean(user);
  const checksQuery = useQuery({ queryKey: ["checks"], queryFn: api.getChecks, enabled: signedIn, retry: 1 });

  const [checked, setChecked] = useState<ReadonlySet<string>>(() => readDeviceChecks());
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs());
  const view = prefs.view;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [status, setStatus] = useState<StatusFilter>("all");
  const age = prefs.age;
  const setAge = useCallback((a: AgeFilter) => setPrefs((p) => ({ ...p, age: a })), []);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountState, setAccountState] = useState<AccountState>("connecting");
  const [queueStatus, setQueueStatus] = useState<QueueStatus>("idle");
  const [conflictKeys, setConflictKeys] = useState<string[] | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  // A friend's progress opened from a share link: read-only until closed.
  const [shared, setShared] = useState<Set<string> | null>(() => readShared());
  const [fanfare, setFanfare] = useState<{ title: string; icon: string; tone: Tone; n: number } | null>(null);
  const [finale, setFinale] = useState(false);
  const install = useInstallPrompt();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeHit, setActiveHit] = useState(0);
  // A request from the map or search to open a group (and maybe show one item).
  const [jump, setJump] = useState<{ group: string; item?: string; n: number } | null>(null);
  const [muted, setMuted] = useState(sound.muted);

  // Music and the fanfare start on the first tap or key (autoplay rules).
  useEffect(() => armSoundOnFirstGesture(), []);
  useEffect(() => sound.subscribe(setMuted), []);

  const reconciledRef = useRef(false);
  const checkedRef = useRef(checked);
  const accountRef = useRef(accountState);
  accountRef.current = accountState;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, tone: Toast["tone"] = "ok", ms = 1600) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, tone });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  // One write queue for the whole session (see lib/sync.ts).
  const queueRef = useRef<WriteQueue | null>(null);
  if (!queueRef.current) {
    queueRef.current = new WriteQueue((patch) => api.patchChecks(patch).then(() => undefined), {
      onStatus: setQueueStatus,
      onSaved: () => showToast("Saved"),
      onError: (err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
          // Signed out elsewhere, or the server refused the batch: stop
          // retrying; the device copy still has every tick.
          if (err.status === 401) {
            setAccountState("signedout");
            void queryClient.invalidateQueries({ queryKey: ["session"] });
          }
          showToast("Saved on this device", "warn", 2400);
          return false;
        }
        showToast("Offline. Will retry", "warn", 2400);
        return true;
      },
    });
  }
  const queue = queueRef.current;

  useEffect(() => {
    checkedRef.current = checked;
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify([...checked]));
    } catch {
      // Device storage unavailable (private mode, quota).
    }
  }, [checked]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  // Theme: system, light or dark (theme-init.js applies it before paint).
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = prefs.theme;
    const dark = prefs.theme === "dark" || (prefs.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0e1411" : "#f1ebdd");
  }, [prefs.theme]);

  // "/" jumps to search; Escape clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "Escape" && target === searchRef.current) {
        setQuery("");
        setSearchOpen(false);
        searchRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Share links can arrive while the app is open, too.
  useEffect(() => {
    const onHash = () => setShared(readShared());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Sign-in result from the OAuth redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const login = params.get("login");
    if (!login) return;
    if (login === "failed") showToast("Sign-in didn't work. Try again", "warn", 3500);
    if (login === "unavailable") showToast("Sign-in is off for now", "warn", 3500);
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  }, [showToast]);

  // --- Device <-> account sync -------------------------------------------
  useEffect(() => {
    if (!checksQuery.data || reconciledRef.current) return;
    reconciledRef.current = true;
    const serverSet = new Set(checksQuery.data.checked.filter((id) => ALL_IDS.has(id)));
    const decision = reconcile(checkedRef.current, serverSet);
    if (decision === "pull") setChecked(serverSet);
    if (decision === "push") {
      setBusy(true);
      api
        .replaceChecks([...checkedRef.current])
        .then(() => showToast("Synced to your account"))
        .catch(() => showToast("Couldn't sync yet", "warn"))
        .finally(() => setBusy(false));
    }
    if (decision === "conflict") {
      setConflictKeys([...serverSet]);
      setAccountState("conflict");
      setSyncModalOpen(true);
      return;
    }
    setAccountState("synced");
  }, [checksQuery.data, showToast]);

  useEffect(() => {
    if (checksQuery.isError && !reconciledRef.current) setAccountState("offline");
  }, [checksQuery.isError]);

  useEffect(() => {
    if (sessionQuery.isSuccess && !sessionQuery.data.user) setAccountState("signedout");
    if (sessionQuery.isError) setAccountState("signedout");
  }, [sessionQuery.isSuccess, sessionQuery.isError, sessionQuery.data]);

  // Coming back to the tab: pick up ticks made on other devices, as long
  // as nothing local is still waiting to be sent.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible" || accountRef.current !== "synced" || !queue.idle) return;
      const version = queue.version;
      api
        .getChecks()
        .then((res) => {
          if (accountRef.current !== "synced" || !queue.idle || queue.version !== version) return;
          const serverSet = new Set(res.checked.filter((id) => ALL_IDS.has(id)));
          if (!sameSet(serverSet, checkedRef.current)) setChecked(serverSet);
        })
        .catch(() => undefined);
    };
    // Last-chance flush when the page is hidden or closed.
    const flushOnHide = () => {
      if (document.visibilityState === "hidden" && !queue.idle) void queue.flushNow();
    };
    document.addEventListener("visibilitychange", refresh);
    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("focus", refresh);
    };
  }, [queue]);

  // Celebrations only follow the user's own taps, not a sync pull.
  const lastTapRef = useRef(0);
  // Items ticked while "Hide finished" is on stay put until the filter
  // changes, so a tap never makes a row vanish from under your finger.
  const [lingering, setLingering] = useState<ReadonlySet<string>>(new Set());
  const onToggle = useCallback(
    (id: string, next: boolean) => {
      lastTapRef.current = Date.now();
      if (next) setLingering((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
      setChecked((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(id);
        else copy.delete(id);
        return copy;
      });
      if (accountRef.current === "synced") {
        queue.enqueue(id, next);
      } else {
        // Device-only: the tick is already stored; confirm once the
        // burst of taps settles.
        if (deviceSavedTimer.current) clearTimeout(deviceSavedTimer.current);
        deviceSavedTimer.current = setTimeout(() => showToast("Saved"), 450);
      }
    },
    [queue, showToast],
  );

  const onGroupComplete = useCallback((group: ViewGroup, el: HTMLElement | null) => {
    if (Date.now() - lastTapRef.current > 1500) return;
    const box = el?.getBoundingClientRect();
    celebrate({ x: box ? box.left + 40 : undefined, y: box ? box.top + 32 : undefined });
    buzz([14, 40, 22]);
    sound.fanfare();
    setFanfare({ title: group.title.replace(/: All \d+$/, ""), icon: group.icon, tone: group.tone, n: Date.now() });
  }, []);

  useEffect(() => {
    if (!fanfare) return;
    const t = setTimeout(() => setFanfare(null), 3000);
    return () => clearTimeout(t);
  }, [fanfare]);

  // Everything done: the big finale, once per reaching it.
  const wasComplete = useRef(checked.size === TOTAL_ITEMS);
  useEffect(() => {
    const complete = checked.size === TOTAL_ITEMS;
    if (complete && !wasComplete.current && Date.now() - lastTapRef.current < 1500) {
      setFinale(true);
      celebrate({ big: true });
      sound.fanfare();
      buzz([30, 60, 30, 60, 80]);
    }
    wasComplete.current = complete;
  }, [checked]);

  const shareProgress = async () => {
    const url = `${window.location.origin}/#p=${encodeProgress(checked, ALL_ID_LIST)}`;
    const text = `${checked.size} of ${TOTAL_ITEMS} done in Ocarina of Time`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Ocarina of Time progress", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      showToast("Couldn't share. Try again", "warn", 2400);
    }
  };

  const closeShared = () => {
    setShared(null);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const finishSync = (message: string) => {
    setConflictKeys(null);
    setAccountState("synced");
    setSyncModalOpen(false);
    showToast(message);
  };

  const resolveWith = async (keys: Set<string>, upload: boolean, message: string) => {
    setBusy(true);
    try {
      if (upload) await api.replaceChecks([...keys]);
      setChecked(keys);
      finishSync(message);
    } catch {
      showToast("That didn't go through. Try again", "warn", 2400);
    } finally {
      setBusy(false);
    }
  };

  const resolvePush = () => void resolveWith(new Set(checkedRef.current), true, "Account updated");
  const resolvePull = () => void resolveWith(new Set(conflictKeys ?? []), false, "Loaded your account");
  const resolveMerge = () => void resolveWith(new Set([...checkedRef.current, ...(conflictKeys ?? [])]), true, "Merged");

  const retryAccount = () => {
    setAccountState("connecting");
    void checksQuery.refetch().then((res) => {
      if (res.isError && !reconciledRef.current) setAccountState("offline");
    });
  };

  const startOver = async () => {
    setBusy(true);
    try {
      queue.clear();
      if (accountState === "synced") await api.resetChecks();
      setChecked(new Set());
      showToast("Progress cleared");
    } catch {
      showToast("Couldn't clear. Try again", "warn", 2400);
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      queue.clear();
      await api.deleteAccount();
      setAccountState("signedout");
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      showToast("Account deleted");
    } catch {
      showToast("Couldn't delete. Try again", "warn", 2400);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!queue.idle) await queue.flushNow().catch(() => undefined);
    window.location.href = "/auth/logout";
  };

  const downloadPdf = async () => {
    try {
      const blob = await buildChecklistPdf(checked);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ocarina-of-time-100-checklist.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      showToast("Couldn't build the PDF", "warn", 2400);
    }
  };

  const filterCount = (status !== "all" ? 1 : 0) + (age !== "all" ? 1 : 0) + (prefs.hideDone ? 1 : 0);
  // Only a search or the status chips force every group open and hide the
  // jump nav; the remembered smart filters (era, hide finished) don't.
  const filtering = deferredQuery !== "" || status !== "all";

  // While viewing a friend's link, everything reads from their snapshot.
  const viewChecked: ReadonlySet<string> = shared ?? checked;
  const readOnly = shared !== null;

  const groups = useMemo<ViewGroup[]>(() => {
    if (view === "map") return mapGroups();
    if (view === "places") return locationGroups();
    if (view === "eras") return eraGroups();
    if (view === "hall") return journeyGroups().filter((g) => g.key === "foes" || g.key === "hallbattles");
    return journeyGroups();
  }, [view]);

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({ group, items: group.items.filter((i) => itemMatches(i, deferredQuery, status, age, prefs.hideDone && !lingering.has(i.id), viewChecked)) }))
        .filter((v) => v.items.length > 0),
    [groups, deferredQuery, status, age, prefs.hideDone, lingering, viewChecked],
  );
  const visibleCount = visibleGroups.reduce((n, g) => n + g.items.length, 0);

  const hits = useMemo(() => searchItems(deferredQuery), [deferredQuery]);
  const showHits = searchOpen && hits.length > 0;

  const owned = useMemo(() => (prefs.showLocks ? ownedKeys(viewChecked) : null), [prefs.showLocks, viewChecked]);

  const regionProgress = useMemo(() => {
    const m = new Map<string, RegionProgress>();
    for (const r of MAP_REGIONS) {
      const items = ALL_ITEMS.filter((i) => i.area && r.areas.includes(i.area));
      m.set(r.id, { done: items.filter((i) => viewChecked.has(i.id)).length, total: items.length });
    }
    return m;
  }, [viewChecked]);

  /** Open the item's group in the current view and bring the item into view. */
  const jumpToItem = (id: string) => {
    const group = groups.find((g) => g.items.some((i) => i.id === id));
    setQuery("");
    setStatus("all");
    setAge("all");
    if (viewChecked.has(id)) setPrefs((p) => ({ ...p, hideDone: false }));
    setSearchOpen(false);
    searchRef.current?.blur();
    if (group) setJump({ group: group.key, item: id, n: Date.now() });
  };
  const jumpToHallItem = (id: string) => {
    const group = id.startsWith("rm-") || id.startsWith("trial-") ? "hallbattles" : "foes";
    setQuery("");
    setStatus("all");
    setAge("all");
    setSearchOpen(false);
    searchRef.current?.blur();
    setPrefs((p) => ({ ...p, view: "journey", hideDone: false }));
    setJump({ group, item: id, n: Date.now() });
  };
  const jumpToRegion = useCallback((regionId: string) => {
    setJump({ group: `map-${regionId}`, n: Date.now() });
  }, []);

  useEffect(() => {
    if (!jump) return;
    // Wait for the group to finish opening (grid-template-rows, 0.35s).
    const t = setTimeout(
      () => {
        const el = document.getElementById(jump.item ? `item-${jump.item}` : `grp-${jump.group}`);
        if (!el) return;
        el.scrollIntoView({ block: jump.item ? "center" : "start", behavior: reducedMotion() ? "auto" : "smooth" });
        if (jump.item) {
          el.classList.remove("jump-flash");
          void el.offsetWidth;
          el.classList.add("jump-flash");
          el.addEventListener("animationend", () => el.classList.remove("jump-flash"), { once: true });
          el.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
        }
      },
      reducedMotion() ? 20 : 380,
    );
    return () => clearTimeout(t);
  }, [jump]);

  const doneTotal = viewChecked.size;
  const pct = Math.floor((doneTotal / TOTAL_ITEMS) * 100);
  const skullDone = SKULL_IDS.filter((id) => viewChecked.has(id)).length;
  const heartDone = HEART_IDS.filter((id) => viewChecked.has(id)).length;
  const containersDone = BOSS_CONTAINER_IDS.filter((id) => viewChecked.has(id)).length;
  const heartsTotal = 3 + containersDone + Math.floor(heartDone / 4);

  const conflictServerSet = useMemo(() => new Set(conflictKeys ?? []), [conflictKeys]);
  const localOnlyCount = conflictKeys ? [...checked].filter((id) => !conflictServerSet.has(id)).length : 0;
  const serverOnlyCount = conflictKeys ? conflictKeys.filter((id) => !checked.has(id)).length : 0;

  const chipStyle = (active: boolean): CSSProperties => ({
    background: active ? "color-mix(in srgb, var(--gold) 22%, var(--surface))" : "var(--surface)",
    color: active ? "var(--text)" : "var(--dim)",
    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
    minHeight: 36,
  });

  const setHideDone = (hideDone: boolean) => {
    setLingering(new Set());
    setPrefs((p) => ({ ...p, hideDone }));
  };
  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setAge("all");
    setHideDone(false);
  };

  // ---- Modal focus handling ---------------------------------------------
  const modalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!syncModalOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    modalRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSyncModalOpen(false);
      if (e.key !== "Tab" || !modalRef.current) return;
      const buttons = [...modalRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
      if (buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [syncModalOpen]);

  const signInButton = (
    <a
      href="/auth/google"
      className="inline-flex items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold"
      style={{ ...goldButton, minHeight: 38, textDecoration: "none" }}
    >
      <GoogleMark />
      Sign in to sync
    </a>
  );

  const statText = "mt-0.5 text-[10.5px] font-semibold tracking-[0.14em] text-[#d9c58f] uppercase";
  const statBox: CSSProperties = {
    background: "rgba(10,15,12,0.5)",
    border: "1px solid rgba(230,205,138,0.28)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
  };
  const pill = "inline-flex items-center rounded-full px-3.5 text-[13px] font-semibold";
  const syncing = accountState === "synced" && queueStatus !== "idle";


  const setTheme = (theme: ThemeMode) => {
    setPrefs((p) => ({ ...p, theme }));
    showToast("Saved");
  };

  return (
    <div className="app-shell min-h-screen" style={{ color: "var(--text)" }}>
      <div className="site-texture" aria-hidden="true" />
      <Fireflies />
      <a href="#checklist" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        Skip to the checklist
      </a>

      {/* ---------- Hero: official key art and logo ---------- */}
      <header className="relative overflow-hidden" style={{ borderBottom: "1px solid rgba(230,205,138,0.35)", background: "#0b100d" }}>
        <picture>
          <source type="image/avif" srcSet={`${ART["key-art-800-avif"]} 800w, ${ART["key-art-1600-avif"]} 1600w`} sizes="100vw" />
          <source type="image/webp" srcSet={`${ART["key-art-800-webp"]} 800w, ${ART["key-art-1600-webp"]} 1600w`} sizes="100vw" />
          <img
            src={ART["key-art-800-webp"]}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "32% 38%" }}
          />
        </picture>
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: "linear-gradient(180deg, rgba(8,12,10,0.25) 0%, rgba(8,12,10,0.5) 45%, rgba(8,12,10,0.9) 100%)" }}
        />
        <button
          type="button"
          onClick={() => {
            sound.unlock();
            sound.setMuted(!muted);
          }}
          aria-pressed={!muted}
          aria-label={muted ? "Play music" : "Mute music"}
          title={muted ? "Play music" : "Mute music"}
          className="sound-toggle absolute z-10 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))", right: "max(0.75rem, env(safe-area-inset-right))" }}
        >
          <SpeakerIcon muted={muted} />
        </button>
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 pb-5" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
          <div className="flex flex-col items-center">
            <picture>
              <source type="image/avif" srcSet={ART["logo-640-avif"]} />
              <img
                src={ART["logo-640-webp"]}
                alt="The Legend of Zelda: Ocarina of Time"
                width={640}
                height={492}
                className="h-auto w-[210px] sm:w-[250px]"
                style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.55))" }}
              />
            </picture>
            <h1 className="font-display -mt-1 text-[15px] tracking-[0.32em] text-[#ecd697] uppercase sm:text-[16px]">100% Checklist</h1>
          </div>

          <div className="flex w-full max-w-md items-center justify-center gap-4">
            <ProgressRing pct={pct} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {[
                { icon: "token", value: `${skullDone}/100`, label: "Skulltulas" },
                { icon: "piece-of-heart", value: `${heartDone}/36`, label: "Heart pieces" },
                { icon: null, value: `${heartsTotal}/20`, label: "Hearts" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 rounded-xl px-3 py-1.5" style={statBox}>
                  {s.icon ? (
                    <Sprite name={s.icon} size={26} />
                  ) : (
                    <img src={ART["heart-container-96-webp"]} alt="" aria-hidden="true" width={26} height={26} style={{ width: 26, height: 26, objectFit: "contain" }} />
                  )}
                  <span className="font-display text-[17px] leading-none text-[#f6eedb] tabular-nums">{s.value}</span>
                  <span className={`${statText} ml-auto`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-[13px] text-[#e3d7b8]" aria-live="polite">
            {readOnly ? (
              <>
                <span>A friend's progress · {doneTotal} of {TOTAL_ITEMS}</span>
                <button type="button" onClick={closeShared} className={pill} style={{ ...goldButton, minHeight: 36 }}>
                  Back to mine
                </button>
              </>
            ) : (
              <>
                <span className="tabular-nums">
                  {doneTotal} of {TOTAL_ITEMS} done
                </span>
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                {accountState === "signedout" && (
                  <>
                    <span>Saved on this device</span>
                    {/* A failed probe still offers sign-in: /auth/google
                        itself reports when sign-in is unavailable. */}
                    {(googleConfigured || sessionQuery.isError) && signInButton}
                  </>
                )}
                {accountState === "connecting" && (
                  <>
                    <span>Connecting…</span>
                    {/* Never make sign-in wait on a slow probe. */}
                    {signInButton}
                  </>
                )}
                {accountState === "synced" && (
                  <span className="max-w-full truncate">
                    {syncing ? (queueStatus === "error" ? "Offline. Will retry" : "Syncing…") : <>Synced{user?.email ? ` · ${user.email}` : ""}</>}
                  </span>
                )}
                {accountState === "conflict" && (
                  <>
                    <span>Device and account differ</span>
                    <button type="button" onClick={() => setSyncModalOpen(true)} className={pill} style={{ ...goldButton, minHeight: 36 }}>
                      Choose
                    </button>
                  </>
                )}
                {accountState === "offline" && (
                  <>
                    <span>Can't reach your account</span>
                    <button type="button" onClick={retryAccount} className={pill} style={{ ...goldButton, minHeight: 36 }}>
                      Retry
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------- Controls ---------- */}
      <div
        className="sticky top-0 z-20 px-4 py-2.5"
        style={{
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          paddingTop: "max(0.625rem, env(safe-area-inset-top))",
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex rounded-full p-1" role="group" aria-label="View" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
            {(
              [
                ["journey", "Journey"],
                ["places", "Places"],
                ["eras", "Eras"],
                ["map", "Map"],
                ["hall", "Hall"],
              ] as [ViewMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setPrefs((p) => ({ ...p, view: mode }))}
                className="font-display flex-1 rounded-full px-1.5 text-[13px] sm:px-2 sm:text-[14px] transition-colors"
                style={{
                  background: view === mode ? "var(--surface)" : "transparent",
                  color: view === mode ? "var(--text)" : "var(--dim)",
                  boxShadow: view === mode ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
                  minHeight: 34,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <label className="sr-only" htmlFor="checklist-search">
                Search
              </label>
              <svg className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="var(--dim)" strokeWidth="1.8" />
                <path d="M13 13 L17 17" stroke="var(--dim)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                id="checklist-search"
                type="search"
                role="combobox"
                aria-expanded={showHits}
                aria-controls="search-hits"
                aria-autocomplete="list"
                aria-activedescendant={showHits ? `hit-${hits[Math.min(activeHit, hits.length - 1)]?.id}` : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                  setActiveHit(0);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setSearchOpen(false)}
                onKeyDown={(e) => {
                  if (!showHits) return;
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const step = e.key === "ArrowDown" ? 1 : -1;
                    setActiveHit((i) => (i + step + hits.length) % hits.length);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const hit = hits[Math.min(activeHit, hits.length - 1)];
                    if (hit) jumpToItem(hit.id);
                  }
                }}
                placeholder="Search every item"
                autoComplete="off"
                enterKeyHint="search"
                className="w-full rounded-full py-2 pr-10 pl-9 text-[16px] outline-none focus:ring-2"
                style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", minHeight: 40, ["--tw-ring-color" as string]: "color-mix(in srgb, var(--gold) 55%, transparent)" }}
              />
              {!query && (
                <kbd
                  className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded px-1.5 text-[11px] sm:block"
                  style={{ border: "1px solid var(--border)", color: "var(--dim)" }}
                >
                  /
                </kbd>
              )}
              {showHits && (
                <ul id="search-hits" role="listbox" aria-label="Results" className="search-results absolute inset-x-0 top-full z-30 mt-1.5 max-h-[60vh] overflow-y-auto rounded-2xl py-1">
                  {hits.map((item, i) => (
                    <li
                      key={item.id}
                      id={`hit-${item.id}`}
                      role="option"
                      aria-selected={i === Math.min(activeHit, hits.length - 1)}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveHit(i)}
                      onClick={() => jumpToItem(item.id)}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2"
                      style={{ minHeight: 48 }}
                    >
                      <Sprite name={ITEM_ICON.get(item.id) ?? "triforce"} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold" style={{ color: "var(--text)" }}>
                          <Highlight text={item.name} q={deferredQuery} />
                        </span>
                        <span className="block truncate text-[12.5px]" style={{ color: "var(--dim)" }}>
                          {SECTION_TITLE.get(item.id)}
                          {item.area ? ` · ${item.area}` : ""}
                        </span>
                      </span>
                      {viewChecked.has(item.id) && <span className="text-[12px] font-semibold" style={{ color: "var(--accent)" }}>Done</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              aria-expanded={prefs.filtersOpen}
              aria-controls="filter-panel"
              onClick={() => setPrefs((p) => ({ ...p, filtersOpen: !p.filtersOpen }))}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium"
              style={{ ...quietButton }}
            >
              Filters
              {filterCount > 0 && (
                <span className="rounded-full px-1.5 text-[12px] font-bold" style={{ background: "var(--gold)", color: "var(--on-gold)" }}>
                  {filterCount}
                </span>
              )}
              <Caret open={prefs.filtersOpen} size={16} />
            </button>
          </div>
          {prefs.filtersOpen && (
            <div id="filter-panel" className="fade-in flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
                {(["all", "todo", "done"] as StatusFilter[]).map((f) => (
                  <button key={f} type="button" aria-pressed={status === f} onClick={() => setStatus(f)} className="rounded-full px-3 text-[13px] font-medium" style={chipStyle(status === f)}>
                    {f === "all" ? "All" : f === "todo" ? "To do" : "Done"}
                  </button>
                ))}
              </div>
              <span className="mx-1 hidden h-5 w-px sm:block" style={{ background: "var(--border)" }} aria-hidden="true" />
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Era">
                {(["all", "Child", "Adult"] as AgeFilter[]).map((f) => (
                  <button key={f} type="button" aria-pressed={age === f} onClick={() => setAge(f)} className="rounded-full px-3 text-[13px] font-medium" style={chipStyle(age === f)}>
                    {f === "all" ? "Both" : f}
                  </button>
                ))}
              </div>
              <span className="mx-1 hidden h-5 w-px sm:block" style={{ background: "var(--border)" }} aria-hidden="true" />
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Display">
                <button type="button" aria-pressed={prefs.hideDone} onClick={() => setHideDone(!prefs.hideDone)} className="rounded-full px-3 text-[13px] font-medium" style={chipStyle(prefs.hideDone)}>
                  Hide finished
                </button>
                <button type="button" aria-pressed={prefs.showLocks} onClick={() => setPrefs((p) => ({ ...p, showLocks: !p.showLocks }))} className="rounded-full px-3 text-[13px] font-medium" style={chipStyle(prefs.showLocks)}>
                  Show what's locked
                </button>
              </div>
            </div>
          )}
          {(filtering || filterCount > 0) && (
            <p className="flex items-center gap-2 text-[13px]" style={{ color: "var(--dim)" }} aria-live="polite">
              {visibleCount} {visibleCount === 1 ? "match" : "matches"}
              <button type="button" onClick={clearFilters} className="font-semibold underline" style={{ color: "var(--accent)", minHeight: 28 }}>
                Clear
              </button>
            </p>
          )}
        </div>
      </div>

      {/* ---------- Group jump nav ---------- */}
      {!filtering && (
        <nav aria-label="Jump to a group" className="mx-auto max-w-3xl px-4 pt-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none", maskImage: "linear-gradient(90deg, #000 92%, transparent)", WebkitMaskImage: "linear-gradient(90deg, #000 92%, transparent)" }}>
            {groups.map((group) => (
              <a
                key={group.key}
                href={`#grp-${group.key}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium whitespace-nowrap"
                style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", minHeight: 32 }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: tone(group.tone) }} aria-hidden="true" />
                {group.title.replace(/: All.*$/, "")}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* ---------- Sections ---------- */}
      <main id="checklist" className="mx-auto flex max-w-3xl flex-col gap-3.5 px-4 py-4 pb-10">
        {view === "map" && !filtering && <HyruleMap progress={regionProgress} onPick={jumpToRegion} />}
        {view === "hall" && !filtering && (
          <HallMap
            checked={viewChecked}
            age={age === "Child" || age === "Adult" ? age : "all"}
            hideDone={prefs.hideDone}
            onToggle={(id: string, next: boolean) => {
              onToggle(id, next);
              if (!next) return;
              const section = SECTIONS.find((s) => s.items.some((i) => i.id === id));
              if (!section) return;
              if (!section.items.every((i) => i.id === id || viewChecked.has(i.id))) return;
              onGroupComplete(
                { key: section.id, title: section.title, icon: "hall-statue", tone: "light", items: section.items },
                null,
              );
            }}
            onJump={jumpToHallItem}
          />
        )}
        {!(view === "hall" && !filtering) && (visibleGroups.length === 0 ? (
          <div className="py-10 text-center" style={{ color: "var(--dim)" }}>
            <p>Nothing matches.</p>
            <button type="button" onClick={clearFilters} className="mt-2 font-semibold underline" style={{ color: "var(--accent)", minHeight: 36 }}>
              Clear search and filters
            </button>
          </div>
        ) : (
          visibleGroups.map(({ group, items }) => (
            <GroupBlock
              key={`${view}-${group.key}`}
              group={group}
              visibleItems={items}
              checked={viewChecked}
              filtering={filtering}
              query={deferredQuery}
              readOnly={readOnly}
              owned={owned}
              defaultOpen={
                view === "journey"
                  ? group.key === "story" || group.key === "skulltulas" || group.key === "hearts"
                  : view === "eras"
                    ? group.key === "era-child"
                    : false
              }
              openSignal={jump?.group === group.key ? jump.n : 0}
              onToggle={onToggle}
              onComplete={onGroupComplete}
            />
          ))
        ))}

        {doneTotal === TOTAL_ITEMS && (
          <div className="rise-in rounded-2xl px-5 py-6 text-center" style={{ background: "linear-gradient(160deg, #1f3327, #0f1a13)", border: "1px solid var(--gold)" }}>
            <div className="flex justify-center">
              <Sprite name="triforce" size={52} className="glow" />
            </div>
            <p className="font-display mt-2 text-xl text-[#f6eedb]">Hyrule is complete</p>
            <p className="mt-1 text-sm text-[#d8ccaf]">Every token, every heart, every secret.</p>
          </div>
        )}

        {/* ---------- More: rarely used actions ---------- */}
        <section className="overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <h2>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="more-panel"
              onClick={() => setMoreOpen(!moreOpen)}
              className="font-display flex w-full items-center justify-between px-4 py-3 text-left text-[16px]"
              style={{ color: "var(--text)", minHeight: 52 }}
            >
              More
              <Caret open={moreOpen} />
            </button>
          </h2>
          {moreOpen && (
            <div id="more-panel" className="fade-in flex flex-col gap-4 px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void shareProgress()} className={pill} style={goldButton}>
                  Share progress
                </button>
                {install && (
                  <button
                    type="button"
                    onClick={() => void install().then((ok) => ok && showToast("Installed"))}
                    className={pill}
                    style={quietButton}
                  >
                    Install app
                  </button>
                )}
                <button type="button" onClick={downloadPdf} className={pill} style={quietButton}>
                  Download PDF
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[13px]" style={{ color: "var(--dim)" }}>
                  Theme
                </span>
                <div className="flex rounded-full p-1" role="group" aria-label="Theme" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
                  {(
                    [
                      ["system", "Auto"],
                      ["light", "Light"],
                      ["dark", "Dark"],
                    ] as [ThemeMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={prefs.theme === mode}
                      onClick={() => setTheme(mode)}
                      className="rounded-full px-3.5 text-[13px] font-medium"
                      style={{
                        background: prefs.theme === mode ? "var(--surface)" : "transparent",
                        color: prefs.theme === mode ? "var(--text)" : "var(--dim)",
                        boxShadow: prefs.theme === mode ? "0 1px 3px rgba(0,0,0,0.14)" : "none",
                        minHeight: 32,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <ConfirmButton label="Start over" confirmLabel="Tap again to erase all" onConfirm={() => void startOver()} disabled={busy || readOnly} />
                {signedIn && accountState !== "signedout" && (
                  <>
                    <button type="button" onClick={() => void signOut()} className="rounded-lg px-3.5 text-[14px] font-medium" style={quietButton}>
                      Sign out
                    </button>
                    <ConfirmButton label="Delete my account" confirmLabel="Tap again to delete" onConfirm={() => void deleteAccount()} disabled={busy} />
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        <footer className="px-2 pt-2 pb-4 text-center text-[12.5px] leading-relaxed" style={{ color: "var(--dim)" }}>
          <p>A fan-made checklist for the Nintendo Switch 2 remake. Not affiliated with Nintendo.</p>
          <p className="mt-1">Official art © Nintendo, from Zelda Wiki's remake galleries.</p>
          <p className="mt-1">Music and fanfare are original renditions, not the game's recordings.</p>
          <p className="mt-1.5">
            <a href="https://github.com/helv-io/oot2-tracker/blob/main/DATA-SOURCES.md" target="_blank" rel="noreferrer" className="underline">
              Sources
            </a>{" "}
            ·{" "}
            <a href="/privacy" className="underline">
              Privacy
            </a>
          </p>
        </footer>
      </main>

      {/* ---------- Group complete: item get ---------- */}
      {fanfare && (
        <div className="pointer-events-none fixed inset-x-0 top-[18vh] z-50 flex justify-center px-4" aria-live="polite">
          <div key={fanfare.n} className="item-get relative flex flex-col items-center px-8 py-5 text-center">
            <svg className="item-get-rays absolute top-[-30px] left-1/2 -ml-[90px]" width="180" height="180" viewBox="-90 -90 180 180" aria-hidden="true">
              <defs>
                <radialGradient id="ig-halo">
                  <stop offset="0" stopColor="#fff4d2" stopOpacity="0.95" />
                  <stop offset="0.35" stopColor={tone(fanfare.tone)} stopOpacity="0.45" />
                  <stop offset="1" stopColor={tone(fanfare.tone)} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle r="62" fill="rgba(10,15,12,0.55)" />
              <circle r="88" fill="url(#ig-halo)" />
              {Array.from({ length: 12 }, (_, i) => (
                <path key={i} d="M0,0 L-5,-86 L5,-86 Z" fill="#f4e6bd" opacity="0.32" transform={`rotate(${i * 30})`} />
              ))}
            </svg>
            <Sprite name={fanfare.icon} size={64} className="glow relative" />
            <div
              className="relative mt-3 rounded-full px-4 py-2"
              style={{ background: "linear-gradient(180deg, #24382b, #142119)", border: "1px solid var(--gold)", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}
            >
              <span className="font-display text-[16px] text-[#f6eedb]">{fanfare.title} complete</span>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 100% finale ---------- */}
      {finale && (
        <div
          className="fade-in fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(6,9,7,0.78)", backdropFilter: "blur(4px)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="finale-title"
          onClick={() => setFinale(false)}
        >
          <div className="rise-in flex max-w-sm flex-col items-center text-center">
            <img src={ART["logo-640-webp"]} alt="" aria-hidden="true" className="w-[240px]" />
            <Sprite name="triforce" size={64} className="glow mt-3" />
            <h2 id="finale-title" className="font-display mt-3 text-[26px] text-[#f6eedb]">
              Hyrule is complete
            </h2>
            <p className="mt-1 text-[15px] text-[#d8ccaf]">All {TOTAL_ITEMS}. Every token, heart and secret.</p>
            <button type="button" onClick={() => setFinale(false)} className={`${pill} mt-5`} style={goldButton}>
              Wonderful
            </button>
          </div>
        </div>
      )}

      {/* ---------- Toast ---------- */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }} aria-live="polite" role="status">
        {toast && (
          <span
            key={toast.id}
            className="rise-in inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold"
            style={{
              background: toast.tone === "ok" ? "#17241b" : "#5e2420",
              color: "#f6eedb",
              border: `1px solid ${toast.tone === "ok" ? "rgba(230,205,138,0.6)" : "rgba(255,180,160,0.5)"}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            {toast.tone === "ok" && (
              <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 10.5 L8.2 14.5 L16 6" fill="none" stroke="#e6cd8a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {toast.text}
          </span>
        )}
      </div>

      {/* ---------- Sync choice modal ---------- */}
      {syncModalOpen && conflictKeys && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          style={{ background: "rgba(8,12,10,0.62)", backdropFilter: "blur(3px)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-choice-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSyncModalOpen(false);
          }}
        >
          <div
            ref={modalRef}
            className="rise-in w-full max-w-md overflow-hidden rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--gold)", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}
          >
            <div className="px-5 py-4" style={{ background: "linear-gradient(160deg, #1f3327, #0f1a13)", borderBottom: "1px solid var(--gold)" }}>
              <div className="flex items-center gap-2">
                <Sprite name="triforce" size={20} />
                <h2 id="sync-choice-title" className="font-display text-lg text-[#f6eedb]">
                  Which progress to keep?
                </h2>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-[#d8c9a3]">
                This device: {checked.size} done, {localOnlyCount} only here. Account: {conflictKeys.length} done, {serverOnlyCount} only there.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 px-5 py-4">
              <button
                type="button"
                onClick={resolveMerge}
                disabled={busy}
                className="rounded-lg px-4 py-3 text-left"
                style={{ ...goldButton, minHeight: 48 }}
              >
                <span className="block text-[15px] font-semibold">Merge both</span>
                <span className="block text-[13px] leading-snug">Keep everything done on either side.</span>
              </button>
              <button
                type="button"
                onClick={resolvePush}
                disabled={busy}
                className="rounded-lg px-4 py-3 text-left"
                style={{ ...quietButton, minHeight: 48 }}
              >
                <span className="block text-[15px] font-semibold">Keep this device</span>
                <span className="block text-[13px] leading-snug">Replace the account's progress.</span>
              </button>
              <button
                type="button"
                onClick={resolvePull}
                disabled={busy}
                className="rounded-lg px-4 py-3 text-left"
                style={{ ...quietButton, background: "var(--surface-alt)", minHeight: 48 }}
              >
                <span className="block text-[15px] font-semibold">Keep my account</span>
                <span className="block text-[13px] leading-snug">Replace this device's progress.</span>
              </button>
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="self-center px-3 py-1 text-sm font-semibold underline"
                style={{ color: "var(--dim)", minHeight: 36 }}
              >
                Decide later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
