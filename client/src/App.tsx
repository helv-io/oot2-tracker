import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { SECTIONS, TOTAL_ITEMS, type CatalogItem } from "./data/catalog";
import { ITEM_ICON, eraGroups, journeyGroups, locationGroups, type ViewGroup } from "./data/views";
import { HeartContainerIcon, HeartPieceIcon, SectionIcon, SkulltulaIcon, TriforceIcon } from "./components/icons";
import { buildChecklistPdf } from "./pdf";

type StatusFilter = "all" | "todo" | "done";
type AgeFilter = "all" | "Child" | "Adult";
type ViewMode = "journey" | "places" | "eras";

// Device-side progress lives in browser storage under this key, so the
// checklist works (and keeps every tick) before the account copy loads.
const LOCAL_KEY = "oot-100-checklist:device-checks:v1";
const ALL_IDS: ReadonlySet<string> = new Set(SECTIONS.flatMap((s) => s.items.map((i) => i.id)));

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

function itemMatches(
  item: CatalogItem,
  query: string,
  status: StatusFilter,
  age: AgeFilter,
  checked: ReadonlySet<string>,
): boolean {
  const isDone = checked.has(item.id);
  if (status === "todo" && isDone) return false;
  if (status === "done" && !isDone) return false;
  if (age !== "all" && item.age && item.age !== "Both" && item.age !== age) return false;
  if (query) {
    const q = query.toLowerCase();
    const hay = `${item.name} ${item.detail} ${item.area ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-32 w-32 shrink-0" role="img" aria-label={`${pct}% complete`}>
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
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold text-[#f5ecd4]">{pct}%</span>
        <span className="text-[11px] tracking-widest text-[#cbb26a] uppercase">of Hyrule</span>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  icon,
  isDone,
  onToggle,
}: {
  item: CatalogItem;
  icon: string;
  isDone: boolean;
  onToggle: (item: CatalogItem, next: boolean) => void;
}) {
  return (
    <div
      className={`flex gap-3 px-3 py-3 sm:px-4 ${isDone ? "opacity-70" : ""}`}
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={`Mark done: ${item.name}`}
        onClick={() => onToggle(item, !isDone)}
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-transform active:scale-95"
        style={{
          border: "2px solid var(--accent)",
          background: isDone ? "var(--gold)" : "transparent",
          minHeight: 40,
        }}
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
          className="text-[15px] leading-snug font-semibold"
          style={{
            color: "var(--text)",
            textDecoration: isDone ? "line-through" : "none",
            textDecorationColor: "var(--gold)",
          }}
        >
          {item.name}
        </p>
        <p className="mt-0.5 text-sm leading-snug" style={{ color: "var(--dim)" }}>
          {item.detail}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.area && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide"
              style={{ background: "var(--surface-alt)", color: "var(--accent)", border: "1px solid var(--border)" }}
            >
              {item.area}
            </span>
          )}
          {item.age && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide"
              style={{ background: "var(--surface-alt)", color: "var(--dim)", border: "1px solid var(--border)" }}
            >
              {item.age === "Both" ? "Child & Adult" : `${item.age} Link`}
            </span>
          )}
          {item.time && item.time !== "Any" && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide"
              style={{ background: "var(--surface-alt)", color: "var(--dim)", border: "1px solid var(--border)" }}
            >
              {item.time} only
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

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
  onToggle: (item: CatalogItem, next: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = filtering || open;
  const doneCount = group.items.filter((i) => checked.has(i.id)).length;
  const pct = group.items.length ? Math.round((doneCount / group.items.length) * 100) : 0;
  const rows = visibleItems.map((item) => (
    <ItemRow
      key={item.id}
      item={item}
      icon={ITEM_ICON.get(item.id) ?? group.icon}
      isDone={checked.has(item.id)}
      onToggle={onToggle}
    />
  ));
  return (
    <section id={`grp-${group.key}`} className="scroll-mt-64">
      <div
        className="overflow-hidden rounded-xl"
        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "0 2px 10px rgba(36,26,16,0.12)" }}
      >
        {filtering ? (
          <p className="font-display flex items-center gap-2.5 px-4 pt-3.5 text-[15px] font-bold" style={{ color: "var(--text)" }}>
            <SectionIcon kind={group.icon} size={24} /> {group.title}
            <span className="text-sm" style={{ color: "var(--accent)" }}>
              {doneCount}/{group.items.length}
            </span>
          </p>
        ) : (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={`${group.title}, ${doneCount} of ${group.items.length} done. ${isOpen ? "Collapse" : "Expand"} group`}
            onClick={() => setOpen(!open)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            style={{ minHeight: 56 }}
          >
            <SectionIcon kind={group.icon} size={30} />
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[17px] leading-tight font-bold tracking-wide" style={{ color: "var(--text)" }}>
                {group.title}
              </span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-alt)" }}>
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gold)" }} />
              </span>
            </span>
            <span className="font-display shrink-0 text-sm font-bold" style={{ color: "var(--accent)" }}>
              {doneCount}/{group.items.length}
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              aria-hidden="true"
              style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <path d="M4 7 L10 13 L16 7" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {isOpen && (
          <div>
            {group.blurb && !filtering && (
              <p className="px-4 pb-1 text-sm italic" style={{ color: "var(--dim)" }}>
                {group.blurb}
              </p>
            )}
            <div className={filtering ? "mt-2" : undefined}>{rows}</div>
          </div>
        )}
      </div>
    </section>
  );
}

export function App() {
  const queryClient = useQueryClient();
  // Who is signed in (if anyone) decides whether account sync applies.
  // Until then, progress lives in this browser's storage alone.
  const sessionQuery = useQuery({ queryKey: ["session"], queryFn: () => api.getSession(), retry: 1 });
  const user = sessionQuery.data?.user ?? null;
  const googleConfigured = sessionQuery.data?.googleConfigured ?? false;
  const signedIn = Boolean(user);
  const checksQuery = useQuery({
    queryKey: ["checks"],
    queryFn: () => api.getChecks({}),
    enabled: signedIn,
  });
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => readDeviceChecks());
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("journey");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [age, setAge] = useState<AgeFilter>("all");
  const [confirmReset, setConfirmReset] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Device <-> account sync -------------------------------------------
  // Progress always lands in this device's browser storage first. The
  // account copy (server) is reconciled once, when it first loads: if one
  // side is empty the other wins automatically; if both hold different
  // progress, the traveler chooses push / pull / merge in a modal.
  type AccountState = "signedout" | "connecting" | "synced" | "conflict" | "offline";
  const [accountState, setAccountState] = useState<AccountState>("connecting");
  const [conflictKeys, setConflictKeys] = useState<string[] | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const reconciledRef = useRef(false);
  const checkedRef = useRef(checked);

  useEffect(() => {
    checkedRef.current = checked;
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify([...checked]));
    } catch {
      // Device storage unavailable (private mode, quota) — account sync
      // still carries the progress.
    }
  }, [checked]);

  const pushProgress = useMutation({
    mutationFn: async (keys: string[]) => await api.replaceChecks({ itemKeys: keys }),
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : "Couldn't sync progress to your account. Try again.");
    },
  });

  useEffect(() => {
    if (!checksQuery.data || reconciledRef.current) return;
    reconciledRef.current = true;
    const serverSet = new Set(checksQuery.data.checked.filter((id) => ALL_IDS.has(id)));
    const localSet = new Set(checkedRef.current);
    const differs = localSet.size !== serverSet.size || [...localSet].some((id) => !serverSet.has(id));
    if (!differs) {
      setAccountState("synced");
    } else if (localSet.size === 0) {
      // Device is empty: pull the account's progress down, no questions.
      setChecked(serverSet);
      setAccountState("synced");
    } else if (serverSet.size === 0) {
      // Account is empty: push this device's progress up, no questions.
      setAccountState("synced");
      pushProgress.mutate([...localSet]);
    } else {
      // Both sides remember a different journey — let the traveler choose.
      setConflictKeys([...serverSet]);
      setAccountState("conflict");
      setSyncModalOpen(true);
    }
    // pushProgress is stable enough for this one-shot reconcile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checksQuery.data]);

  useEffect(() => {
    if (checksQuery.isError && !reconciledRef.current) setAccountState("offline");
  }, [checksQuery.isError]);

  // Once we know nobody is signed in, account sync simply doesn't apply:
  // the device copy is the only copy, and it is already being kept.
  useEffect(() => {
    if (sessionQuery.isSuccess && !sessionQuery.data.user) setAccountState("signedout");
  }, [sessionQuery.isSuccess, sessionQuery.data]);

  // If the account check itself fails, fall back to the signed-out banner
  // instead of sitting on "connecting" forever with no way to sign in.
  useEffect(() => {
    if (sessionQuery.isError) setAccountState("signedout");
  }, [sessionQuery.isError]);

  const setCheck = useMutation({
    mutationFn: async (args: { itemKey: string; checked: boolean }) => await api.setCheck(args),
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : "Couldn't save that check. Try again.");
      void queryClient.invalidateQueries({ queryKey: ["checks"] });
    },
  });

  const reset = useMutation({
    mutationFn: async () => {
      if (signedIn) await api.resetChecks({});
      return { ok: true as const };
    },
    onSuccess: () => {
      setChecked(new Set());
      setConfirmReset(false);
      void queryClient.invalidateQueries({ queryKey: ["checks"] });
    },
    onError: (err) => setSaveError(err instanceof Error ? err.message : "Couldn't reset. Try again."),
  });

  const finishSync = () => {
    setConflictKeys(null);
    setAccountState("synced");
    setSyncModalOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["checks"] });
  };

  const resolvePush = () => {
    // Keep this device's journey: the account copy becomes exactly this.
    pushProgress.mutate([...checkedRef.current], { onSuccess: finishSync });
  };

  const resolvePull = () => {
    // Keep the account's journey: this device adopts it wholesale.
    if (conflictKeys) setChecked(new Set(conflictKeys));
    finishSync();
  };

  const resolveMerge = () => {
    // Keep every deed ticked on either side, and store the union in both.
    const union = new Set([...checkedRef.current, ...(conflictKeys ?? [])]);
    setChecked(union);
    pushProgress.mutate([...union], { onSuccess: finishSync });
  };

  const retryAccount = () => {
    setAccountState("connecting");
    void checksQuery.refetch().then((res) => {
      if (res.isError && !reconciledRef.current) setAccountState("offline");
    });
  };

  const onToggle = (item: CatalogItem, next: boolean) => {
    setSaveError(null);
    setChecked((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(item.id);
      else copy.delete(item.id);
      return copy;
    });
    // Device storage already has the tick (see the effect above); the
    // account copy is only written when someone is actually signed in.
    if (signedIn) setCheck.mutate({ itemKey: item.id, checked: next });
  };

  const filtering = query.trim() !== "" || status !== "all" || age !== "all";

  const groups = useMemo<ViewGroup[]>(() => {
    if (view === "places") return locationGroups();
    if (view === "eras") return eraGroups();
    return journeyGroups();
  }, [view]);

  const visibleGroups = useMemo(() => {
    return groups
      .map((group) => ({
        group,
        items: group.items.filter((i) => itemMatches(i, query.trim(), status, age, checked)),
      }))
      .filter((v) => v.items.length > 0);
  }, [groups, query, status, age, checked]);

  const doneTotal = checked.size;
  const pct = Math.round((doneTotal / TOTAL_ITEMS) * 100);
  const skullSection = SECTIONS.find((s) => s.id === "skulltulas");
  const heartSection = SECTIONS.find((s) => s.id === "hearts");
  const skullDone = skullSection ? skullSection.items.filter((i) => checked.has(i.id)).length : 0;
  const heartDone = heartSection ? heartSection.items.filter((i) => checked.has(i.id)).length : 0;
  // Health = 3 starting hearts + one per boss Heart Container actually
  // earned (the eight dungeon-clear story items) + one per four pieces.
  const BOSS_CONTAINER_IDS = ["story-1", "story-5", "story-7", "story-10", "story-11", "story-13", "story-15", "story-18"];
  const containersDone = BOSS_CONTAINER_IDS.filter((id) => checked.has(id)).length;
  const heartsTotal = 3 + containersDone + Math.floor(heartDone / 4);

  const conflictServerSet = useMemo(() => new Set(conflictKeys ?? []), [conflictKeys]);
  const localOnlyCount = conflictKeys ? [...checked].filter((id) => !conflictServerSet.has(id)).length : 0;
  const serverOnlyCount = conflictKeys ? conflictKeys.filter((id) => !checked.has(id)).length : 0;

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

  const onResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    reset.mutate();
  };

  const chipStyle = (active: boolean): CSSProperties => ({
    background: active ? "var(--forest)" : "var(--surface)",
    color: active ? "#f5ecd4" : "var(--text)",
    border: "1.5px solid var(--border)",
    minHeight: 36,
  });

  // The sign-in button is just a link to /auth/google, so it never needs to
  // wait for the session probe: show it while the probe is still running
  // too, and let the banner swap if a signed-in session turns up.
  const signInButton = (
    <a
      href="/auth/google"
      className="font-display inline-flex items-center gap-2 rounded-lg px-3.5 text-[13px] font-bold tracking-wide"
      style={{
        background: "var(--gold)",
        color: "#241a10",
        border: "1.5px solid #7c5f14",
        minHeight: 36,
        textDecoration: "none",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#241a10"
          d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3L18.6 21c1.9-1.7 3-4.3 3-8.8zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2L3.1 16.1A10 10 0 0 0 12 22zM6.4 13.9a6 6 0 0 1 0-3.8L3.1 7.9a10 10 0 0 0 0 8.2l3.3-2.2zM12 5.9c1.5 0 2.8.5 3.8 1.5L18.6 4.6A10 10 0 0 0 3.1 7.9l3.3 2.2C7.2 7.7 9.4 5.9 12 5.9z"
        />
      </svg>
      Sign in with Google
    </a>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ---------- Hero ---------- */}
      <header
        className="px-4 pt-8 pb-6"
        style={{ background: "linear-gradient(160deg, #1e3a29 0%, #14231a 70%)", borderBottom: "3px solid var(--gold)" }}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5">
          <div className="flex items-center gap-4">
            <ProgressRing pct={pct} />
            <div>
              <div className="flex items-center gap-2">
                <TriforceIcon size={20} />
                <p className="text-[11px] font-bold tracking-[0.22em] text-[#cbb26a] uppercase">The Legend of Zelda</p>
              </div>
              <h1 className="font-display mt-1 text-[26px] leading-tight font-bold text-[#f5ecd4]">
                Ocarina of Time
                <span className="block text-[17px] tracking-wide text-[#e7c65a]">The Ultimate 100% Checklist</span>
              </h1>
              <p className="mt-1.5 text-sm text-[#d8c9a3]">
                {doneTotal} of {TOTAL_ITEMS} deeds done · Nintendo Switch 2 remake
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2.5">
            <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: "rgba(245,236,212,0.08)", border: "1px solid rgba(201,162,39,0.45)" }}>
              <div className="flex items-center justify-center gap-1.5">
                <SkulltulaIcon size={19} />
                <span className="font-display text-lg font-bold text-[#f5ecd4]">{skullDone}/100</span>
              </div>
              <p className="text-[11px] tracking-wider text-[#cbb26a] uppercase">Skulltula tokens</p>
            </div>
            <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: "rgba(245,236,212,0.08)", border: "1px solid rgba(201,162,39,0.45)" }}>
              <div className="flex items-center justify-center gap-1.5">
                <HeartPieceIcon size={19} />
                <span className="font-display text-lg font-bold text-[#f5ecd4]">{heartDone}/36</span>
              </div>
              <p className="text-[11px] tracking-wider text-[#cbb26a] uppercase">Pieces of Heart</p>
            </div>
            <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: "rgba(245,236,212,0.08)", border: "1px solid rgba(201,162,39,0.45)" }}>
              <div className="flex items-center justify-center gap-1.5">
                <HeartContainerIcon size={19} />
                <span className="font-display text-lg font-bold text-[#f5ecd4]">{heartsTotal}/20</span>
              </div>
              <p className="text-[11px] tracking-wider text-[#cbb26a] uppercase">Hearts of health</p>
            </div>
          </div>

          <div
            className="w-full rounded-lg px-3 py-2.5 text-center"
            style={{ background: "rgba(245,236,212,0.08)", border: "1px solid rgba(201,162,39,0.45)" }}
            aria-live="polite"
          >
            {accountState === "signedout" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[13px] leading-snug text-[#d8c9a3]">
                  Not signed in — every tick is saved on this device.
                  {googleConfigured || sessionQuery.isError
                    ? " Sign in with Google and your journey follows you to any screen."
                    : " Google sign-in isn't switched on for this shrine yet."}
                </p>
                {(googleConfigured || sessionQuery.isError) && signInButton}
              </div>
            )}
            {accountState === "connecting" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[13px] leading-snug text-[#d8c9a3]">
                  Reaching your account… until then, every tick is saved on this device.
                </p>
                {signInButton}
              </div>
            )}
            {accountState === "synced" && (
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-[13px] leading-snug text-[#d8c9a3]">
                  Signed in{user?.email ? <> as {user.email}</> : ""} — progress syncs to your account and is kept
                  on this device too, so it follows you from the phone by the console to any other screen.
                </p>
                <a href="/auth/logout" className="text-[12.5px] font-semibold text-[#cbb26a] underline">
                  Sign out
                </a>
              </div>
            )}
            {accountState === "conflict" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[13px] leading-snug text-[#d8c9a3]">
                  This device and your account remember different journeys.
                </p>
                <button
                  type="button"
                  onClick={() => setSyncModalOpen(true)}
                  className="font-display rounded-lg px-3.5 text-[13px] font-bold tracking-wide"
                  style={{ background: "var(--gold)", color: "#241a10", border: "1.5px solid #7c5f14", minHeight: 36 }}
                >
                  Choose which progress to keep
                </button>
              </div>
            )}
            {accountState === "offline" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[13px] leading-snug text-[#d8c9a3]">
                  Your account can't be reached right now — progress is saving on this device only.
                </p>
                <button
                  type="button"
                  onClick={retryAccount}
                  className="font-display rounded-lg px-3.5 text-[13px] font-bold tracking-wide"
                  style={{ background: "var(--gold)", color: "#241a10", border: "1.5px solid #7c5f14", minHeight: 36 }}
                >
                  Try reaching it again
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------- Controls ---------- */}
      <div
        className="sticky top-0 z-20 px-4 py-3"
        style={{ background: "var(--bg)", borderBottom: "1.5px solid var(--border)", paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
          <div>
            <div
              className="flex overflow-hidden rounded-lg"
              role="group"
              aria-label="Choose how to view the checklist"
              style={{ border: "1.5px solid var(--border)" }}
            >
              {(
                [
                  ["journey", "Journey"],
                  ["places", "By place"],
                  ["eras", "By era"],
                ] as [ViewMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
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
            <p className="mt-1.5 text-[12.5px] leading-snug" style={{ color: "var(--dim)" }}>
              The same deeds, three ways of looking at them — tick one off in any view and it counts in all of them.
            </p>
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="checklist-search">Search the checklist</label>
            <input
              id="checklist-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search — try “soft soil”, “frogs”, “crater”…"
              className="min-w-0 flex-1 rounded-lg px-3 py-2 text-[15px]"
              style={{ background: "var(--surface)", color: "var(--text)", border: "1.5px solid var(--border)", minHeight: 40 }}
            />
            <button
              type="button"
              onClick={downloadPdf}
              aria-label="Download the checklist as a PDF"
              className="font-display shrink-0 rounded-lg px-3.5 text-[13px] font-bold tracking-wide"
              style={{ background: "var(--gold)", color: "#241a10", border: "1.5px solid #7c5f14", minHeight: 40 }}
            >
              ↓ PDF
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Checklist filters">
            {(["all", "todo", "done"] as StatusFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={status === f}
                onClick={() => setStatus(f)}
                className="rounded-full px-3 text-[13px] font-semibold"
                style={chipStyle(status === f)}
              >
                {f === "all" ? "Everything" : f === "todo" ? "Still to do" : "Done"}
              </button>
            ))}
            <span className="mx-1 hidden h-5 w-px sm:block" style={{ background: "var(--border)" }} aria-hidden="true" />
            {(["all", "Child", "Adult"] as AgeFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={age === f}
                onClick={() => setAge(f)}
                className="rounded-full px-3 text-[13px] font-semibold"
                style={chipStyle(age === f)}
              >
                {f === "all" ? "Both eras" : `${f} Link`}
              </button>
            ))}
            <span className="flex-1" />
            <button
              type="button"
              onClick={onResetClick}
              aria-label={confirmReset ? "Confirm: erase all progress and start over" : "Start over: erase all progress"}
              className="rounded-full px-3 text-[13px] font-semibold"
              style={{
                background: confirmReset ? "#b03030" : "transparent",
                color: confirmReset ? "#fff" : "var(--dim)",
                border: "1.5px solid var(--border)",
                minHeight: 36,
              }}
            >
              {confirmReset ? "Tap again to erase everything" : "Start over"}
            </button>
          </div>
          {saveError && (
            <p role="alert" className="text-sm font-semibold" style={{ color: "var(--heart)" }}>
              {saveError}
            </p>
          )}
        </div>
      </div>

      {/* ---------- Group jump nav ---------- */}
      {!filtering && (
        <nav aria-label="Jump to a group" className="mx-auto flex max-w-3xl flex-wrap gap-1.5 px-4 pt-4">
          {groups.map((group) => (
            <a
              key={group.key}
              href={`#grp-${group.key}`}
              className="rounded-full px-2.5 py-1 text-[12.5px] font-semibold"
              style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", minHeight: 32, display: "inline-flex", alignItems: "center" }}
            >
              {group.title.replace(/ — All.*$/, "")}
            </a>
          ))}
        </nav>
      )}

      {/* ---------- Sections ---------- */}
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 pb-10">
        {visibleGroups.length === 0 ? (
          <p className="py-10 text-center" style={{ color: "var(--dim)" }}>
            Nothing in Hyrule matches that — loosen the search or filters.
          </p>
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

        {pct === 100 && (
          <div
            className="rounded-xl px-5 py-6 text-center"
            style={{ background: "linear-gradient(160deg, #1e3a29, #14231a)", border: "2px solid var(--gold)" }}
          >
            <div className="flex justify-center">
              <TriforceIcon size={44} />
            </div>
            <p className="font-display mt-2 text-xl font-bold text-[#f5ecd4]">100% — Hyrule is complete.</p>
            <p className="mt-1 text-sm text-[#d8c9a3]">
              Every token, every heart, every secret. The Hero of Time can finally rest.
            </p>
          </div>
        )}

        <footer className="px-2 pt-2 pb-4 text-center text-[12.5px] leading-relaxed" style={{ color: "var(--dim)" }}>
          <p>
            A fan-made labor of love, built for one hero's playthrough of the 2026 Nintendo Switch 2 remake.
            Skulltula and Piece of Heart placements follow RPG Site's remake guides; where the remake kept the
            classics, so did we.
          </p>
          <p className="mt-1.5">
            Sources:{" "}
            <a href="https://www.rpgsite.net/guide/21634-the-legend-zelda-ocarina-time-remake-gold-skulltula-locations-guide-all-100-token-locations" target="_blank" rel="noreferrer" className="underline">
              RPG Site — Gold Skulltula guide
            </a>{" "}
            ·{" "}
            <a href="https://www.rpgsite.net/guide/21635-the-legend-zelda-ocarina-time-remake-heart-piece-locations-guide" target="_blank" rel="noreferrer" className="underline">
              RPG Site — Heart Piece guide
            </a>{" "}
            ·{" "}
            <a href="https://gamingroute.com/ocarina-of-time-heart-pieces/" target="_blank" rel="noreferrer" className="underline">
              GamingRoute — Heart Pieces (Switch 2)
            </a>
          </p>
          <p className="mt-1.5">
            <a href="/privacy" className="underline">
              Privacy policy
            </a>{" "}
            — what signing in stores, and what it doesn't.
          </p>
        </footer>
      </main>

      {/* ---------- Sync choice modal ---------- */}
      {syncModalOpen && conflictKeys && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          style={{ background: "rgba(16,22,14,0.66)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-choice-title"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl"
            style={{ background: "var(--surface)", border: "2px solid var(--gold)", boxShadow: "0 16px 44px rgba(20,14,4,0.45)" }}
          >
            <div
              className="px-5 py-4"
              style={{ background: "linear-gradient(160deg, #1e3a29, #14231a)", borderBottom: "2px solid var(--gold)" }}
            >
              <div className="flex items-center gap-2">
                <TriforceIcon size={18} />
                <h2 id="sync-choice-title" className="font-display text-lg font-bold text-[#f5ecd4]">
                  Two journeys remembered
                </h2>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-[#d8c9a3]">
                You ticked deeds on this device before your account's progress arrived, and the two don't match.
                Which journey should carry on?
              </p>
            </div>
            <div className="flex flex-col gap-2.5 px-5 py-4">
              <p className="text-sm leading-snug" style={{ color: "var(--text)" }}>
                This device holds <strong>{checked.size}</strong> deeds
                {localOnlyCount > 0 && <> — {localOnlyCount} of them aren't in your account</>}. Your account holds{" "}
                <strong>{conflictKeys.length}</strong> deeds
                {serverOnlyCount > 0 && <> — {serverOnlyCount} of them aren't on this device</>}.
              </p>
              <button
                type="button"
                onClick={resolvePush}
                disabled={pushProgress.isPending}
                className="rounded-lg px-4 py-3 text-left"
                style={{ background: "var(--gold)", color: "#241a10", border: "1.5px solid #7c5f14", minHeight: 48 }}
              >
                <span className="font-display block text-[15px] font-bold">Push — keep this device's journey</span>
                <span className="block text-[13px] leading-snug">Your account's progress is replaced by what's ticked here.</span>
              </button>
              <button
                type="button"
                onClick={resolvePull}
                className="rounded-lg px-4 py-3 text-left"
                style={{ background: "var(--forest)", color: "#f5ecd4", border: "1.5px solid var(--border)", minHeight: 48 }}
              >
                <span className="font-display block text-[15px] font-bold">Pull — keep my account's journey</span>
                <span className="block text-[13px] leading-snug">This device's ticks are replaced by your account's progress.</span>
              </button>
              <button
                type="button"
                onClick={resolveMerge}
                disabled={pushProgress.isPending}
                className="rounded-lg px-4 py-3 text-left"
                style={{ background: "var(--surface-alt)", color: "var(--text)", border: "1.5px solid var(--border)", minHeight: 48 }}
              >
                <span className="font-display block text-[15px] font-bold">Merge — keep every deed from both</span>
                <span className="block text-[13px] leading-snug">Anything ticked on either side stays ticked, in both places.</span>
              </button>
              {pushProgress.isError && (
                <p role="alert" className="text-sm font-semibold" style={{ color: "var(--heart)" }}>
                  {pushProgress.error instanceof Error ? pushProgress.error.message : "That sync didn't go through — try again."}
                </p>
              )}
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
