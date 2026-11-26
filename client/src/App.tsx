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
import { SECTIONS, TOTAL_ITEMS, type CatalogItem } from "./data/catalog";
import { ITEM_ICON, eraGroups, journeyGroups, locationGroups, type ViewGroup } from "./data/views";
import { HeartContainerIcon, HeartPieceIcon, SectionIcon, SkulltulaIcon, TriforceIcon } from "./components/icons";
import { buildChecklistPdf } from "./pdf";
import { WriteQueue, type QueueStatus } from "./lib/sync";
import { reconcile, sameSet } from "./lib/reconcile";

type StatusFilter = "all" | "todo" | "done";
type AgeFilter = "all" | "Child" | "Adult";
type ViewMode = "journey" | "places" | "eras";
type AccountState = "signedout" | "connecting" | "synced" | "conflict" | "offline";

// Device-side progress lives in browser storage under this key, so the
// checklist works (and keeps every tick) with or without an account.
const LOCAL_KEY = "oot-100-checklist:device-checks:v1";
const PREFS_KEY = "oot-100-checklist:prefs:v1";
const ALL_IDS: ReadonlySet<string> = new Set(SECTIONS.flatMap((s) => s.items.map((i) => i.id)));
// Health = 3 starting hearts + one per boss Heart Container actually
// earned (the eight dungeon-clear story items) + one per four pieces.
const BOSS_CONTAINER_IDS = ["story-1", "story-5", "story-7", "story-10", "story-11", "story-13", "story-15", "story-18"];

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
}

function readPrefs(): Prefs {
  const fallback: Prefs = { view: "journey", filtersOpen: false };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) || "{}") as Partial<Prefs>;
    return {
      view: parsed.view === "places" || parsed.view === "eras" ? parsed.view : "journey",
      filtersOpen: parsed.filtersOpen === true,
    };
  } catch {
    return fallback;
  }
}

function itemMatches(item: CatalogItem, q: string, status: StatusFilter, age: AgeFilter, checked: ReadonlySet<string>) {
  const isDone = checked.has(item.id);
  if (status === "todo" && isDone) return false;
  if (status === "done" && !isDone) return false;
  if (age !== "all" && item.age && item.age !== "Both" && item.age !== age) return false;
  if (q) {
    const hay = `${item.name} ${item.detail} ${item.area ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function Caret({ open, size = 18 }: { open: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
    >
      <path d="M4 7 L10 13 L16 7" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32" role="img" aria-label={`${pct}% complete`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(201,162,39,0.25)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#e7c65a"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold text-[#f5ecd4]">{pct}%</span>
        <span className="text-[11px] tracking-widest text-[#cbb26a] uppercase">of Hyrule</span>
      </div>
    </div>
  );
}

const Tag = ({ children, accent }: { children: ReactNode; accent?: boolean }) => (
  <span
    className="rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide"
    style={{ background: "var(--surface-alt)", color: accent ? "var(--accent)" : "var(--dim)", border: "1px solid var(--border)" }}
  >
    {children}
  </span>
);

const ItemRow = memo(function ItemRow({
  item,
  icon,
  isDone,
  onToggle,
}: {
  item: CatalogItem;
  icon: string;
  isDone: boolean;
  onToggle: (id: string, next: boolean) => void;
}) {
  const labelId = `lbl-${item.id}`;
  return (
    <div className={`flex gap-3 px-3 py-3 sm:px-4 ${isDone ? "opacity-70" : ""}`} style={{ borderTop: "1px solid var(--border)" }}>
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-labelledby={labelId}
        onClick={() => onToggle(item.id, !isDone)}
        className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-transform active:scale-95"
        style={{ border: "2px solid var(--accent)", background: isDone ? "var(--gold)" : "transparent" }}
      >
        {isDone ? (
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3.5 10.5 L8 15 L16.5 5" fill="none" stroke="#241a10" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="opacity-45">
            <SectionIcon kind={icon} size={20} />
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          id={labelId}
          className="text-[15px] leading-snug font-semibold"
          style={{ color: "var(--text)", textDecoration: isDone ? "line-through" : "none", textDecorationColor: "var(--gold)" }}
        >
          {item.name}
        </p>
        <p className="mt-0.5 text-sm leading-snug" style={{ color: "var(--dim)" }}>
          {item.detail}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.area && <Tag accent>{item.area}</Tag>}
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
  defaultOpen = false,
  onToggle,
}: {
  group: ViewGroup;
  visibleItems: CatalogItem[];
  checked: ReadonlySet<string>;
  filtering: boolean;
  defaultOpen?: boolean;
  onToggle: (id: string, next: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = filtering || open;
  const doneCount = group.items.filter((i) => checked.has(i.id)).length;
  const pct = group.items.length ? Math.round((doneCount / group.items.length) * 100) : 0;
  const bodyId = `body-${group.key}`;
  return (
    <section id={`grp-${group.key}`} className="scroll-mt-40">
      <div
        className="overflow-hidden rounded-xl"
        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "0 2px 10px rgba(36,26,16,0.12)" }}
      >
        {filtering ? (
          <h2 className="font-display flex items-center gap-2.5 px-4 pt-3.5 text-[15px] font-bold" style={{ color: "var(--text)" }}>
            <SectionIcon kind={group.icon} size={24} /> {group.title}
            <span className="text-sm" style={{ color: "var(--accent)" }}>
              {doneCount}/{group.items.length}
            </span>
          </h2>
        ) : (
          <h2>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={bodyId}
              onClick={() => setOpen(!open)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              style={{ minHeight: 56 }}
            >
              <SectionIcon kind={group.icon} size={30} />
              <span className="min-w-0 flex-1">
                <span className="font-display block text-[17px] leading-tight font-bold tracking-wide" style={{ color: "var(--text)" }}>
                  {group.title}
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-alt)" }} aria-hidden="true">
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gold)" }} />
                </span>
              </span>
              <span className="font-display shrink-0 text-sm font-bold" style={{ color: "var(--accent)" }}>
                <span className="sr-only">Done: </span>
                {doneCount}/{group.items.length}
              </span>
              <Caret open={isOpen} />
            </button>
          </h2>
        )}
        {isOpen && (
          <div id={bodyId}>
            {group.blurb && !filtering && (
              <p className="px-4 pb-2 text-sm italic" style={{ color: "var(--dim)" }}>
                {group.blurb}
              </p>
            )}
            <div className={filtering ? "mt-2" : undefined}>
              {visibleItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  icon={ITEM_ICON.get(item.id) ?? group.icon}
                  isDone={checked.has(item.id)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const goldButton: CSSProperties = { background: "var(--gold)", color: "#241a10", border: "1.5px solid #7c5f14", minHeight: 40 };

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#241a10"
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
        background: armed ? "#b03030" : "transparent",
        color: armed ? "#fff" : "var(--text)",
        border: "1.5px solid var(--border)",
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

  const onToggle = useCallback(
    (id: string, next: boolean) => {
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

  const downloadPdf = () => {
    const blob = buildChecklistPdf(checked);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ocarina-of-time-100-checklist.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const filterCount = (status !== "all" ? 1 : 0) + (age !== "all" ? 1 : 0);
  const filtering = deferredQuery !== "" || filterCount > 0;

  const groups = useMemo<ViewGroup[]>(() => {
    if (view === "places") return locationGroups();
    if (view === "eras") return eraGroups();
    return journeyGroups();
  }, [view]);

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({ group, items: group.items.filter((i) => itemMatches(i, deferredQuery, status, age, checked)) }))
        .filter((v) => v.items.length > 0),
    [groups, deferredQuery, status, age, checked],
  );
  const visibleCount = visibleGroups.reduce((n, g) => n + g.items.length, 0);

  const doneTotal = checked.size;
  const pct = Math.floor((doneTotal / TOTAL_ITEMS) * 100);
  const skullDone = SECTIONS.find((s) => s.id === "skulltulas")?.items.filter((i) => checked.has(i.id)).length ?? 0;
  const heartDone = SECTIONS.find((s) => s.id === "hearts")?.items.filter((i) => checked.has(i.id)).length ?? 0;
  const containersDone = BOSS_CONTAINER_IDS.filter((id) => checked.has(id)).length;
  const heartsTotal = 3 + containersDone + Math.floor(heartDone / 4);

  const conflictServerSet = useMemo(() => new Set(conflictKeys ?? []), [conflictKeys]);
  const localOnlyCount = conflictKeys ? [...checked].filter((id) => !conflictServerSet.has(id)).length : 0;
  const serverOnlyCount = conflictKeys ? conflictKeys.filter((id) => !checked.has(id)).length : 0;

  const chipStyle = (active: boolean): CSSProperties => ({
    background: active ? "var(--forest)" : "var(--surface)",
    color: active ? "#f5ecd4" : "var(--text)",
    border: "1.5px solid var(--border)",
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
      className="font-display inline-flex items-center gap-2 rounded-lg px-3.5 text-[13px] font-bold tracking-wide"
      style={{ ...goldButton, minHeight: 36, textDecoration: "none" }}
    >
      <GoogleMark />
      Sign in to sync
    </a>
  );

  const statText = "text-[11px] tracking-wider text-[#cbb26a] uppercase";
  const statBox: CSSProperties = { background: "rgba(245,236,212,0.08)", border: "1px solid rgba(201,162,39,0.45)" };
  const syncing = accountState === "synced" && queueStatus !== "idle";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <a href="#checklist" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        Skip to the checklist
      </a>

      {/* ---------- Hero ---------- */}
      <header
        className="px-4 pt-7 pb-5"
        style={{
          background: "linear-gradient(160deg, #1e3a29 0%, #14231a 70%)",
          borderBottom: "3px solid var(--gold)",
          paddingTop: "max(1.75rem, env(safe-area-inset-top))",
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <ProgressRing pct={pct} />
            <div>
              <div className="flex items-center gap-2">
                <TriforceIcon size={20} />
                <p className="text-[11px] font-bold tracking-[0.22em] text-[#cbb26a] uppercase">The Legend of Zelda</p>
              </div>
              <h1 className="font-display mt-1 text-[24px] leading-tight font-bold text-[#f5ecd4] sm:text-[26px]">
                Ocarina of Time
                <span className="block text-[16px] tracking-wide text-[#e7c65a] sm:text-[17px]">100% Checklist</span>
              </h1>
              <p className="mt-1.5 text-sm text-[#d8c9a3]">
                {doneTotal} of {TOTAL_ITEMS} done
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2">
            <div className="rounded-lg px-2 py-2.5 text-center" style={statBox}>
              <div className="flex items-center justify-center gap-1.5">
                <SkulltulaIcon size={19} />
                <span className="font-display text-lg font-bold text-[#f5ecd4]">{skullDone}/100</span>
              </div>
              <p className={statText}>Skulltulas</p>
            </div>
            <div className="rounded-lg px-2 py-2.5 text-center" style={statBox}>
              <div className="flex items-center justify-center gap-1.5">
                <HeartPieceIcon size={19} />
                <span className="font-display text-lg font-bold text-[#f5ecd4]">{heartDone}/36</span>
              </div>
              <p className={statText}>Heart pieces</p>
            </div>
            <div className="rounded-lg px-2 py-2.5 text-center" style={statBox}>
              <div className="flex items-center justify-center gap-1.5">
                <HeartContainerIcon size={19} />
                <span className="font-display text-lg font-bold text-[#f5ecd4]">{heartsTotal}/20</span>
              </div>
              <p className={statText}>Hearts</p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-[13px] text-[#d8c9a3]" aria-live="polite">
            {accountState === "signedout" && (
              <>
                <span>Saved on this device.</span>
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
                <span>Device and account differ.</span>
                <button
                  type="button"
                  onClick={() => setSyncModalOpen(true)}
                  className="font-display rounded-lg px-3.5 text-[13px] font-bold tracking-wide"
                  style={{ ...goldButton, minHeight: 36 }}
                >
                  Choose
                </button>
              </>
            )}
            {accountState === "offline" && (
              <>
                <span>Can't reach your account.</span>
                <button
                  type="button"
                  onClick={retryAccount}
                  className="font-display rounded-lg px-3.5 text-[13px] font-bold tracking-wide"
                  style={{ ...goldButton, minHeight: 36 }}
                >
                  Retry
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------- Controls ---------- */}
      <div
        className="sticky top-0 z-20 px-4 py-2.5"
        style={{ background: "var(--bg)", borderBottom: "1.5px solid var(--border)", paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex overflow-hidden rounded-lg" role="group" aria-label="View" style={{ border: "1.5px solid var(--border)" }}>
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
                className="font-display flex-1 px-2 text-[13px] font-bold tracking-wide"
                style={{
                  background: view === mode ? "var(--forest)" : "var(--surface)",
                  color: view === mode ? "#f5ecd4" : "var(--text)",
                  minHeight: 38,
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
              <input
                id="checklist-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search deeds or places"
                autoComplete="off"
                enterKeyHint="search"
                className="w-full rounded-lg px-3 py-2 text-[16px]"
                style={{ background: "var(--surface)", color: "var(--text)", border: "1.5px solid var(--border)", minHeight: 40 }}
              />
            </div>
            <button
              type="button"
              aria-expanded={prefs.filtersOpen}
              aria-controls="filter-panel"
              onClick={() => setPrefs((p) => ({ ...p, filtersOpen: !p.filtersOpen }))}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 text-[14px] font-semibold"
              style={{ background: "var(--surface)", color: "var(--text)", border: "1.5px solid var(--border)", minHeight: 40 }}
            >
              Filters
              {filterCount > 0 && (
                <span className="rounded-full px-1.5 text-[12px] font-bold" style={{ background: "var(--gold)", color: "#241a10" }}>
                  {filterCount}
                </span>
              )}
              <Caret open={prefs.filtersOpen} size={16} />
            </button>
          </div>
          {prefs.filtersOpen && (
            <div id="filter-panel" className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
                {(["all", "todo", "done"] as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={status === f}
                    onClick={() => setStatus(f)}
                    className="rounded-full px-3 text-[13px] font-semibold"
                    style={chipStyle(status === f)}
                  >
                    {f === "all" ? "All" : f === "todo" ? "To do" : "Done"}
                  </button>
                ))}
              </div>
              <span className="mx-1 hidden h-5 w-px sm:block" style={{ background: "var(--border)" }} aria-hidden="true" />
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Era">
                {(["all", "Child", "Adult"] as AgeFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={age === f}
                    onClick={() => setAge(f)}
                    className="rounded-full px-3 text-[13px] font-semibold"
                    style={chipStyle(age === f)}
                  >
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
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" style={{ scrollbarWidth: "none" }}>
            {groups.map((group) => (
              <a
                key={group.key}
                href={`#grp-${group.key}`}
                className="shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap"
                style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", minHeight: 32, display: "inline-flex", alignItems: "center" }}
              >
                {group.title.replace(/ — All.*$/, "")}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* ---------- Sections ---------- */}
      <main id="checklist" className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4 pb-10">
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
              checked={checked}
              filtering={filtering}
              defaultOpen={
                view === "journey"
                  ? group.key === "story" || group.key === "skulltulas" || group.key === "hearts"
                  : view === "eras"
                    ? group.key === "era-child"
                    : false
              }
              onToggle={onToggle}
            />
          ))
        )}

        {doneTotal === TOTAL_ITEMS && (
          <div className="rounded-xl px-5 py-6 text-center" style={{ background: "linear-gradient(160deg, #1e3a29, #14231a)", border: "2px solid var(--gold)" }}>
            <div className="flex justify-center">
              <TriforceIcon size={44} />
            </div>
            <p className="font-display mt-2 text-xl font-bold text-[#f5ecd4]">100%. Hyrule is complete.</p>
            <p className="mt-1 text-sm text-[#d8c9a3]">Every token, every heart, every secret.</p>
          </div>
        )}

        {/* ---------- More: rarely used actions ---------- */}
        <section className="overflow-hidden rounded-xl" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
          <h2>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="more-panel"
              onClick={() => setMoreOpen(!moreOpen)}
              className="font-display flex w-full items-center justify-between px-4 py-3 text-left text-[15px] font-bold"
              style={{ color: "var(--text)", minHeight: 48 }}
            >
              More
              <Caret open={moreOpen} />
            </button>
          </h2>
          {moreOpen && (
            <div id="more-panel" className="flex flex-col gap-3 px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={downloadPdf} className="font-display rounded-lg px-3.5 text-[14px] font-bold" style={goldButton}>
                  Download PDF
                </button>
                <ConfirmButton label="Start over" confirmLabel="Tap again to erase all" onConfirm={() => void startOver()} disabled={busy} />
              </div>
              {signedIn && accountState !== "signedout" && (
                <div className="flex flex-wrap items-center gap-2 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="w-full pt-2 text-[13px]" style={{ color: "var(--dim)" }}>
                    Account
                  </p>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="rounded-lg px-3.5 text-[14px] font-semibold"
                    style={{ border: "1.5px solid var(--border)", color: "var(--text)", minHeight: 40 }}
                  >
                    Sign out
                  </button>
                  <ConfirmButton label="Delete my account" confirmLabel="Tap again to delete" onConfirm={() => void deleteAccount()} disabled={busy} />
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="px-2 pt-2 pb-4 text-center text-[12.5px] leading-relaxed" style={{ color: "var(--dim)" }}>
          <p>A fan-made checklist for the Nintendo Switch 2 remake. Not affiliated with Nintendo.</p>
          <p className="mt-1.5">
            Sources:{" "}
            <a href="https://www.rpgsite.net/guide/21634-the-legend-zelda-ocarina-time-remake-gold-skulltula-locations-guide-all-100-token-locations" target="_blank" rel="noreferrer" className="underline">
              Skulltulas
            </a>{" "}
            ·{" "}
            <a href="https://www.rpgsite.net/guide/21635-the-legend-zelda-ocarina-time-remake-heart-piece-locations-guide" target="_blank" rel="noreferrer" className="underline">
              Heart pieces
            </a>{" "}
            ·{" "}
            <a href="https://gamingroute.com/ocarina-of-time-heart-pieces/" target="_blank" rel="noreferrer" className="underline">
              GamingRoute
            </a>{" "}
            ·{" "}
            <a href="/privacy" className="underline">
              Privacy
            </a>
          </p>
        </footer>
      </main>

      {/* ---------- Toast ---------- */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }} aria-live="polite" role="status">
        {toast && (
          <span
            key={toast.id}
            className="font-display rounded-full px-4 py-2 text-[14px] font-bold shadow-lg"
            style={{
              background: toast.tone === "ok" ? "var(--forest)" : "#7a2a22",
              color: "#f5ecd4",
              border: "1.5px solid var(--gold)",
            }}
          >
            {toast.tone === "ok" ? "✓ " : ""}
            {toast.text}
          </span>
        )}
      </div>

      {/* ---------- Sync choice modal ---------- */}
      {syncModalOpen && conflictKeys && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          style={{ background: "rgba(16,22,14,0.66)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-choice-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSyncModalOpen(false);
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-md overflow-hidden rounded-xl"
            style={{ background: "var(--surface)", border: "2px solid var(--gold)", boxShadow: "0 16px 44px rgba(20,14,4,0.45)" }}
          >
            <div className="px-5 py-4" style={{ background: "linear-gradient(160deg, #1e3a29, #14231a)", borderBottom: "2px solid var(--gold)" }}>
              <div className="flex items-center gap-2">
                <TriforceIcon size={18} />
                <h2 id="sync-choice-title" className="font-display text-lg font-bold text-[#f5ecd4]">
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
                <span className="font-display block text-[15px] font-bold">Merge both</span>
                <span className="block text-[13px] leading-snug">Keep everything done on either side.</span>
              </button>
              <button
                type="button"
                onClick={resolvePush}
                disabled={busy}
                className="rounded-lg px-4 py-3 text-left"
                style={{ background: "var(--forest)", color: "#f5ecd4", border: "1.5px solid var(--border)", minHeight: 48 }}
              >
                <span className="font-display block text-[15px] font-bold">Keep this device</span>
                <span className="block text-[13px] leading-snug">Replace the account's progress.</span>
              </button>
              <button
                type="button"
                onClick={resolvePull}
                disabled={busy}
                className="rounded-lg px-4 py-3 text-left"
                style={{ background: "var(--surface-alt)", color: "var(--text)", border: "1.5px solid var(--border)", minHeight: 48 }}
              >
                <span className="font-display block text-[15px] font-bold">Keep my account</span>
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
