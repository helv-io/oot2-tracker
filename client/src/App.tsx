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
import { ITEM_ICON, eraGroups, journeyGroups, locationGroups, type ViewGroup } from "./data/views";
import { TONE_COLOR, placeOf, type Tone } from "./data/look";
import { ART } from "./data/art.generated";
import { Sprite } from "./components/Art";
import { Fireflies } from "./components/Fireflies";
import { buildChecklistPdf } from "./pdf";
import { WriteQueue, type QueueStatus } from "./lib/sync";
import { reconcile, sameSet } from "./lib/reconcile";
import { decodeProgress, encodeProgress } from "./lib/share";
import { buzz, celebrate } from "./lib/celebrate";
import { useInstallPrompt } from "./lib/pwa";

type StatusFilter = "all" | "todo" | "done";
type AgeFilter = "all" | "Child" | "Adult";
type ViewMode = "journey" | "places" | "eras";
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
}

function readPrefs(): Prefs {
  const fallback: Prefs = { view: "journey", filtersOpen: false, theme: "system" };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) || "{}") as Partial<Prefs>;
    return {
      view: parsed.view === "places" || parsed.view === "eras" ? parsed.view : "journey",
      filtersOpen: parsed.filtersOpen === true,
      theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : "system",
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

function itemMatches(item: CatalogItem, q: string, status: StatusFilter, age: AgeFilter, checked: ReadonlySet<string>) {
  const isDone = checked.has(item.id);
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
        <span className="font-display text-[28px] leading-none text-[#f6eedb]">{pct}%</span>
        <span className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-[#d9c58f] uppercase">Complete</span>
      </div>
    </div>
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
  onToggle,
}: {
  item: CatalogItem;
  icon: string;
  isDone: boolean;
  query: string;
  readOnly: boolean;
  onToggle: (id: string, next: boolean) => void;
}) {
  const labelId = `lbl-${item.id}`;
  const [justDone, setJustDone] = useState(false);
  const areaColor = tone(placeOf(item.area).tone);
  return (
    <div className={`row flex gap-3 px-3.5 py-3 sm:px-4 ${isDone ? "done" : ""}`} style={{ borderTop: "1px solid var(--border)" }}>
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-labelledby={labelId}
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
  defaultOpen = false,
  onToggle,
  onComplete,
}: {
  group: ViewGroup;
  visibleItems: CatalogItem[];
  checked: ReadonlySet<string>;
  filtering: boolean;
  query: string;
  readOnly: boolean;
  defaultOpen?: boolean;
  onToggle: (id: string, next: boolean) => void;
  onComplete: (group: ViewGroup, el: HTMLElement | null) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
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
  const [age, setAge] = useState<AgeFilter>("all");
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountState, setAccountState] = useState<AccountState>("connecting");
  const [queueStatus, setQueueStatus] = useState<QueueStatus>("idle");
  const [conflictKeys, setConflictKeys] = useState<string[] | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  // A friend's progress opened from a share link: read-only until closed.
  const [shared, setShared] = useState<Set<string> | null>(() => readShared());
  const [fanfare, setFanfare] = useState<string | null>(null);
  const [finale, setFinale] = useState(false);
  const install = useInstallPrompt();
  const searchRef = useRef<HTMLInputElement | null>(null);

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
  const onToggle = useCallback(
    (id: string, next: boolean) => {
      lastTapRef.current = Date.now();
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
    setFanfare(group.title.replace(/: All \d+$/, ""));
  }, []);

  useEffect(() => {
    if (!fanfare) return;
    const t = setTimeout(() => setFanfare(null), 2600);
    return () => clearTimeout(t);
  }, [fanfare]);

  // Everything done: the big finale, once per reaching it.
  const wasComplete = useRef(checked.size === TOTAL_ITEMS);
  useEffect(() => {
    const complete = checked.size === TOTAL_ITEMS;
    if (complete && !wasComplete.current && Date.now() - lastTapRef.current < 1500) {
      setFinale(true);
      celebrate({ big: true });
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

  const filterCount = (status !== "all" ? 1 : 0) + (age !== "all" ? 1 : 0);
  const filtering = deferredQuery !== "" || filterCount > 0;

  // While viewing a friend's link, everything reads from their snapshot.
  const viewChecked: ReadonlySet<string> = shared ?? checked;
  const readOnly = shared !== null;

  const groups = useMemo<ViewGroup[]>(() => {
    if (view === "places") return locationGroups();
    if (view === "eras") return eraGroups();
    return journeyGroups();
  }, [view]);

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({ group, items: group.items.filter((i) => itemMatches(i, deferredQuery, status, age, viewChecked)) }))
        .filter((v) => v.items.length > 0),
    [groups, deferredQuery, status, age, viewChecked],
  );
  const visibleCount = visibleGroups.reduce((n, g) => n + g.items.length, 0);

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

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setAge("all");
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
              ] as [ViewMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setPrefs((p) => ({ ...p, view: mode }))}
                className="font-display flex-1 rounded-full px-2 text-[14px] transition-colors"
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
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
                    {f === "all" ? "Any era" : f}
                  </button>
                ))}
              </div>
            </div>
          )}
          {filtering && (
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
        {visibleGroups.length === 0 ? (
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
              defaultOpen={
                view === "journey"
                  ? group.key === "story" || group.key === "skulltulas" || group.key === "hearts"
                  : view === "eras"
                    ? group.key === "era-child"
                    : false
              }
              onToggle={onToggle}
              onComplete={onGroupComplete}
            />
          ))
        )}

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

      {/* ---------- Group complete fanfare ---------- */}
      {fanfare && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }} aria-live="polite">
          <div
            key={fanfare}
            className="rise-in flex items-center gap-2.5 rounded-full px-4 py-2"
            style={{ background: "linear-gradient(180deg, #24382b, #142119)", border: "1px solid var(--gold)", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}
          >
            <Sprite name="triforce" size={22} className="glow" />
            <span className="font-display text-[15px] text-[#f6eedb]">{fanfare} complete</span>
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
