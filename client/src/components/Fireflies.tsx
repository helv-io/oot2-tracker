import { useEffect, useRef } from "react";
import { startFireflies } from "../lib/fireflies";

/** Fixed canvas of Kokiri Forest fairy lights, behind the page. */
export function Fireflies() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return startFireflies(el);
  }, []);
  return <canvas ref={ref} className="site-fireflies" aria-hidden="true" />;
}
