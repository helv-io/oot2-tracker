// Schematic of the Hall of Fallen Foes: six wedges around the owl
// podium, regular statues on round stands, rematches on rectangular
// stands at the outer ring. Wedge membership and left-to-right order
// follow Zelda Wiki; seat positions are a schematic, not a traced
// floor plan. Static SVG: no animated filters, no transforms.
import { useMemo, useState } from "react";
import {
  FOE_RECORDS,
  HALL_CX,
  HALL_CY,
  HALL_H,
  HALL_SEATS,
  HALL_W,
  HALL_WEDGES,
  REMATCH_BY_FOE,
  REMATCH_RECORDS,
  TRIAL_ITEMS,
  type FoeRecord,
} from "../data/foes";
import { TONE_COLOR } from "../data/look";
import type { CatalogItem } from "../data/catalog";

const FOE_BY_ID: ReadonlyMap<string, FoeRecord> = new Map(FOE_RECORDS.map((r) => [r.item.id, r]));
const REMATCH_ITEM_BY_ID: ReadonlyMap<string, CatalogItem> = new Map(REMATCH_RECORDS.map((r) => [r.item.id, r.item]));

function wedgePath(startDeg: number, inner: number, outer: number): string {
  const to = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(HALL_CX + Math.cos(rad) * r).toFixed(2)},${(HALL_CY + Math.sin(rad) * r).toFixed(2)}`;
  };
  const end = startDeg + 60;
  const large = 0;
  return [
    `M ${to(startDeg, inner)}`,
    `A ${inner} ${inner} 0 ${large} 1 ${to(end, inner)}`,
    `L ${to(end, outer)}`,
    `A ${outer} ${outer} 0 ${large} 0 ${to(startDeg, outer)}`,
    "Z",
  ].join(" ");
}

function Check({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`hall-check${on ? " is-on" : ""}`} aria-hidden="true">
      {on ? "\u2713" : ""}
    </span>
  );
}

export function HallMap({
  checked,
  onToggle,
  onJump,
  age = "all",
  hideDone = false,
}: {
  checked: ReadonlySet<string>;
  onToggle: (id: string, next: boolean) => void;
  onJump?: (id: string) => void;
  age?: "all" | "Child" | "Adult";
  hideDone?: boolean;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const foe = sel ? FOE_BY_ID.get(sel) : undefined;
  const rmId = foe ? REMATCH_BY_FOE.get(foe.item.id) : undefined;
  const rmItem = rmId ? REMATCH_ITEM_BY_ID.get(rmId) : undefined;

  const visible = useMemo(() => {
    const hide = new Set<string>();
    for (const r of FOE_RECORDS) {
      const eraOk = age === "all" || r.item.age === "Both" || r.item.age === age;
      const doneOk = !hideDone || !checked.has(r.item.id);
      if (!eraOk || !doneOk) hide.add(r.item.id);
    }
    return hide;
  }, [age, hideDone, checked]);

  const identified = FOE_RECORDS.filter((r) => checked.has(r.item.id)).length;
  const rematchesWon = REMATCH_RECORDS.filter((r) => checked.has(r.item.id)).length;
  const trialsWon = TRIAL_ITEMS.filter((t) => checked.has(t.id)).length;

  const trialOf = (id: string) => TRIAL_ITEMS.find((t) => t.id === id);

  return (
    <figure className="hall-map">
      <svg viewBox={`0 0 ${HALL_W} ${HALL_H}`} role="group" aria-label="Hall of Fallen Foes schematic">
        <circle cx={HALL_CX} cy={HALL_CY} r="188" className="hall-floor" />
        {HALL_WEDGES.map((w) => {
          const color = TONE_COLOR[w.tone];
          const recs = FOE_RECORDS.filter((r) => r.wedge === w.id);
          const done = recs.filter((r) => checked.has(r.item.id)).length;
          const all = recs.length;
          const complete = all > 0 && done === all;
          return (
            <path
              key={w.id}
              d={wedgePath(w.startDeg, 52, 178)}
              className={`hall-wedge${complete ? " is-complete" : ""}`}
              style={{ ["--region" as string]: color }}
            />
          );
        })}
        <circle cx={HALL_CX} cy={HALL_CY} r="48" className="hall-podium" />
        {/* Three owl trial stands around the perch. */}
        {TRIAL_ITEMS.map((t, i) => {
          const deg = -90 + i * 120;
          const rad = (deg * Math.PI) / 180;
          const x = HALL_CX + Math.cos(rad) * 28;
          const y = HALL_CY + Math.sin(rad) * 28;
          const on = checked.has(t.id);
          return (
            <g
              key={t.id}
              className={`hall-trial${on ? " is-done" : ""}${sel === t.id ? " is-sel" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={t.name}
              aria-pressed={sel === t.id}
              onClick={() => setSel(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSel(t.id);
                }
              }}
            >
              <circle cx={x} cy={y} r="7" />
            </g>
          );
        })}
        <text x={HALL_CX} y={HALL_CY + 2} textAnchor="middle" className="hall-center-label">
          Owl
        </text>
        {HALL_WEDGES.map((w) => {
          const mid = w.startDeg + 30;
          const p = {
            x: HALL_CX + Math.cos((mid * Math.PI) / 180) * 172,
            y: HALL_CY + Math.sin((mid * Math.PI) / 180) * 172,
          };
          return (
            <text key={`lbl-${w.id}`} x={p.x} y={p.y} textAnchor="middle" className="hall-wedge-label">
              {w.title}
            </text>
          );
        })}
        {HALL_SEATS.map((seat) => {
          const rec = FOE_BY_ID.get(seat.id)!;
          const on = checked.has(seat.id);
          const dim = visible.has(seat.id);
          const missing = !on;
          const chosen = sel === seat.id;
          const cls = [
            "hall-seat",
            seat.rematch ? "is-rematch" : "is-regular",
            on ? "is-done" : "is-missing",
            dim ? "is-dim" : "",
            chosen ? "is-sel" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <g
              key={seat.id}
              className={cls}
              role="button"
              tabIndex={dim ? -1 : 0}
              aria-label={`${rec.item.name}${on ? ", identified" : ", not yet identified"}`}
              aria-pressed={chosen}
              onClick={() => setSel(seat.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSel(seat.id);
                }
              }}
            >
              {seat.rematch ? (
                <rect x={seat.x - 6} y={seat.y - 6} width="12" height="12" rx="1.5" />
              ) : (
                <circle cx={seat.x} cy={seat.y} r="6" />
              )}
              {missing && !dim ? <circle cx={seat.x} cy={seat.y} r="9" className="hall-miss" /> : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="hall-caption">
        <p>
          {identified}/84 statues identified · {rematchesWon}/25 rematches · {trialsWon}/3 trials
        </p>
        <p>
          Six wedges in Zelda Wiki order, rematches on the outer square stands. Seat positions are a
          schematic; wedge and sequence are verified, exact floor spots are not.
        </p>
      </figcaption>
      {foe ? (
        <div className="hall-card" aria-live="polite">
          <h3 className="font-display">{foe.item.name}</h3>
          <p className="hall-card-meta">
            {HALL_WEDGES.find((w) => w.id === foe.wedge)?.title} wedge
            {foe.rematch ? " · rematch stand" : ""}
            {foe.item.age ? ` · ${foe.item.age}` : ""}
            {foe.item.area ? ` · ${foe.item.area}` : ""}
          </p>
          <p>{foe.item.detail}</p>
          {foe.useful ? <p className="hall-card-meta">Useful items: {foe.useful}</p> : null}
          <div className="hall-card-actions">
            <button
              type="button"
              className="hall-btn"
              aria-pressed={checked.has(foe.item.id)}
              onClick={() => onToggle(foe.item.id, !checked.has(foe.item.id))}
            >
              <Check on={checked.has(foe.item.id)} label="" />
              {checked.has(foe.item.id) ? "Identified" : "Mark identified"}
            </button>
            {rmItem ? (
              <button
                type="button"
                className="hall-btn"
                aria-pressed={checked.has(rmItem.id)}
                onClick={() => onToggle(rmItem.id, !checked.has(rmItem.id))}
              >
                <Check on={checked.has(rmItem.id)} label="" />
                {checked.has(rmItem.id) ? "Rematch won" : "Mark rematch won"}
              </button>
            ) : null}
            {onJump ? (
              <button type="button" className="hall-btn hall-btn-quiet" onClick={() => onJump(foe.item.id)}>
                Show in Journey
              </button>
            ) : null}
          </div>
        </div>
      ) : trialOf(sel ?? "") ? (
        <div className="hall-card" aria-live="polite">
          <h3 className="font-display">{trialOf(sel!)!.name}</h3>
          <p className="hall-card-meta">{trialOf(sel!)!.age} · trophy in Link's house</p>
          <p>{trialOf(sel!)!.detail}</p>
          <div className="hall-card-actions">
            <button
              type="button"
              className="hall-btn"
              aria-pressed={checked.has(sel!)}
              onClick={() => onToggle(sel!, !checked.has(sel!))}
            >
              <Check on={checked.has(sel!)} label="" />
              {checked.has(sel!) ? "Trial cleared" : "Mark trial cleared"}
            </button>
            {onJump ? (
              <button type="button" className="hall-btn hall-btn-quiet" onClick={() => onJump(sel!)}>
                Show in Journey
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="hall-card is-empty">
          <p>Tap a statue to read its Hall entry and mark it identified. Square stands also have a rematch. The three small stands at the center are the owl trials.</p>
        </div>
      )}
    </figure>
  );
}
