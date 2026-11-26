// First-load reconciliation between this device's ticks and the
// account's. If one side is empty the other wins; if both hold
// different progress, the user chooses.

export type ReconcileResult = "same" | "pull" | "push" | "conflict";

export function reconcile(local: ReadonlySet<string>, server: ReadonlySet<string>): ReconcileResult {
  const same = local.size === server.size && [...local].every((id) => server.has(id));
  if (same) return "same";
  if (local.size === 0) return "pull";
  if (server.size === 0) return "push";
  return "conflict";
}

export function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}
