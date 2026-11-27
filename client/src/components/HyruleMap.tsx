// Nintendo's official map of Hyrule with a tappable hotspot over each
// region. A region tints in its colour as its deeds are done and turns
// gold when finished. Tap or press Enter to jump to its list below.
// Static SVG: no animated filters, no transforms.
import { memo, type KeyboardEvent } from "react";
import { ART } from "../data/art.generated";
import { MAP_H, MAP_REGIONS, MAP_W, smoothPath, type MapRegion } from "../data/map";
import { TONE_COLOR } from "../data/look";

const PATHS = new Map(MAP_REGIONS.map((r) => [r.id, r.shapes.map((s) => smoothPath(s)).join(" ")]));

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
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <image href={ART["hyrule-map-1200-webp"]} x="0" y="0" width={MAP_W} height={MAP_H} preserveAspectRatio="none" />
        <rect x="0" y="0" width={MAP_W} height={MAP_H} className="map-shade" />
        {MAP_REGIONS.map((r) => {
          const p = progress.get(r.id) ?? { done: 0, total: 0 };
          const pct = p.total ? p.done / p.total : 0;
          const complete = p.total > 0 && p.done === p.total;
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
              style={{ ["--region" as string]: TONE_COLOR[r.tone] }}
            >
              {pct > 0 && <path d={d} className="map-glow" style={{ opacity: 0.25 + pct * 0.45 }} filter="url(#map-glow)" />}
              <path d={d} className="map-fill" style={{ fillOpacity: complete ? 0.34 : 0.04 + pct * 0.3 }} />
              <path d={d} className="map-edge" />
            </g>
          );
        })}
        {/* Labels last, above every region, and never hit targets. */}
        <g className="map-labels" aria-hidden="true">
          {MAP_REGIONS.map((r) => {
            const p = progress.get(r.id) ?? { done: 0, total: 0 };
            const complete = p.total > 0 && p.done === p.total;
            const [x, y] = r.labelAt;
            const w = Math.max(r.label.length * 10.4, 52) + 18;
            const pct = complete ? "Done" : `${p.total ? Math.floor((p.done / p.total) * 100) : 0}%`;
            return (
              <g key={r.id} className={`map-pill${complete ? " is-complete" : ""}`} style={{ ["--region" as string]: TONE_COLOR[r.tone] }}>
                <rect x={x - w / 2} y={y - 25} width={w} height={50} rx="9" />
                <text x={x} y={y - 4} className="map-label" textAnchor="middle">
                  {r.label}
                </text>
                <text x={x} y={y + 15} className="map-pct" textAnchor="middle">
                  {pct}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </figure>
  );
});
