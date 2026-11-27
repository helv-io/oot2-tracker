// A small stylized Hyrule. Each region fills with its tone as its deeds
// are done; a finished region gets a gold rim. Tap or press Enter on a
// region to jump to its list below. Static SVG: no animated filters.
import { memo, type KeyboardEvent } from "react";
import { MAP_H, MAP_REGIONS, MAP_W, roughen, smoothPath, type MapRegion } from "../data/map";
import { TONE_COLOR } from "../data/look";

const PATHS = new Map(MAP_REGIONS.map((r, i) => [r.id, smoothPath(roughen(r.outline, i + 3, r.id === "ganon" || r.id === "ranch" ? 3 : 7))]));
// Decorative river from Zora's Domain down through the field to the lake.
const RIVER = "M560,196 C520,222 486,214 462,236 C430,262 404,292 372,316 C356,328 346,332 340,336";

export interface RegionProgress {
  done: number;
  total: number;
}

export const HyruleMap = memo(function HyruleMap({
  progress,
  onPick,
}: {
  progress: ReadonlyMap<string, RegionProgress>;
  onPick: (regionId: string) => void;
}) {
  const key = (r: MapRegion) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick(r.id);
    }
  };
  return (
    <figure className="hyrule-map" aria-label="Map of Hyrule">
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="group" aria-label="Regions of Hyrule">
        <defs>
          <filter id="map-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <pattern id="map-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="8" className="map-hatch-line" />
          </pattern>
        </defs>
        <rect x="3" y="3" width={MAP_W - 6} height={MAP_H - 6} rx="14" className="map-board" />
        <rect x="9" y="9" width={MAP_W - 18} height={MAP_H - 18} rx="10" className="map-rule" />
        <path d={RIVER} className="map-river" />
        {MAP_REGIONS.map((r) => {
          const p = progress.get(r.id) ?? { done: 0, total: 0 };
          const pct = p.total ? p.done / p.total : 0;
          const complete = p.total > 0 && p.done === p.total;
          const color = TONE_COLOR[r.tone];
          const d = PATHS.get(r.id)!;
          return (
            <g
              key={r.id}
              className={`map-region${complete ? " is-complete" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${r.name}, ${p.done} of ${p.total} done`}
              onClick={() => onPick(r.id)}
              onKeyDown={key(r)}
              style={{ ["--region" as string]: color }}
            >
              {pct > 0 && <path d={d} className="map-glow" style={{ opacity: 0.15 + pct * 0.45 }} filter="url(#map-glow)" />}
              <path d={d} className="map-land" />
              <path d={d} className="map-fill" style={{ fillOpacity: 0.14 + pct * 0.66 }} />
              {pct === 0 && <path d={d} fill="url(#map-hatch)" className="map-unexplored" />}
              <path d={d} className="map-edge" />
            </g>
          );
        })}
        {/* Labels last, above every region, and never hit targets. */}
        <g className="map-labels" aria-hidden="true">
          {MAP_REGIONS.map((r) => {
            const p = progress.get(r.id) ?? { done: 0, total: 0 };
            const complete = p.total > 0 && p.done === p.total;
            const lines = r.label.split("\n");
            const [x, y] = r.labelAt;
            const top = y - 4 - (lines.length - 1) * 10;
            return (
              <g key={r.id}>
                <text x={x} y={top} className="map-label" textAnchor="middle">
                  {lines.map((l, i) => (
                    <tspan key={l} x={x} dy={i === 0 ? 0 : "1.05em"}>
                      {l}
                    </tspan>
                  ))}
                </text>
                <text x={x} y={top + (lines.length - 1) * 21 + 19} className="map-pct" textAnchor="middle">
                  {complete ? "Complete" : `${p.total ? Math.floor((p.done / p.total) * 100) : 0}%`}
                </text>
              </g>
            );
          })}
        </g>
        <g className="map-compass" transform="translate(52 366)" aria-hidden="true">
          <circle r="18" />
          <path d="M0,-24 L5,0 L0,24 L-5,0 Z" />
          <text y="-28" textAnchor="middle">N</text>
        </g>
      </svg>
    </figure>
  );
});
