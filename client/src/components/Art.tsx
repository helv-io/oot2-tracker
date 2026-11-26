// Official remake icons, served from this site (see client/assets/official).
import { ICONS, type IconName } from "../data/art.generated";

export function Sprite({ name, size = 28, className, alt = "" }: { name: string; size?: number; className?: string; alt?: string }) {
  const src = ICONS[name as IconName] ?? ICONS["triforce"];
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`art ${className ?? ""}`}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
