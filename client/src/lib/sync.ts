// Account write queue. Every tick lands in device storage at once; this
// queue carries the same change to the server. Rapid ticks are coalesced
// per item (the last state wins), sent as one batch, strictly one batch
// at a time so writes can't arrive out of order, and retried with
// backoff when the network or server fails.

export interface Patch {
  add: string[];
  remove: string[];
}

export type QueueStatus = "idle" | "saving" | "error";

export interface QueueOptions {
  debounceMs?: number;
  minRetryMs?: number;
  maxRetryMs?: number;
  onStatus?: (status: QueueStatus) => void;
  onSaved?: () => void;
  /** Return false to drop the pending writes instead of retrying (e.g. signed out). */
  onError?: (err: unknown) => boolean;
}

export function toPatch(changes: ReadonlyMap<string, boolean>): Patch {
  const add: string[] = [];
  const remove: string[] = [];
  for (const [key, checked] of changes) (checked ? add : remove).push(key);
  return { add, remove };
}

export class WriteQueue {
  private pending = new Map<string, boolean>();
  private inflight: Map<string, boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryMs = 0;
  private status: QueueStatus = "idle";
  /** Bumps on every enqueue; lets readers detect writes that raced a fetch. */
  version = 0;

  private readonly send: (patch: Patch) => Promise<void>;
  private readonly opts: QueueOptions;

  constructor(send: (patch: Patch) => Promise<void>, opts: QueueOptions = {}) {
    this.send = send;
    this.opts = opts;
  }

  get idle(): boolean {
    return this.pending.size === 0 && this.inflight === null;
  }

  enqueue(key: string, checked: boolean): void {
    this.pending.set(key, checked);
    this.version++;
    this.schedule(this.retryMs || (this.opts.debounceMs ?? 400));
  }

  /** Forget unsent writes (used before a reset or account deletion). */
  clear(): void {
    this.pending.clear();
    this.version++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.retryMs = 0;
    if (!this.inflight) this.setStatus("idle");
  }

  /** Send now, skipping the debounce or backoff wait. */
  async flushNow(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    await this.flush();
  }

  private schedule(ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, ms);
  }

  private setStatus(next: QueueStatus): void {
    if (next === this.status) return;
    this.status = next;
    this.opts.onStatus?.(next);
  }

  private async flush(): Promise<void> {
    if (this.inflight || this.pending.size === 0) return;
    const batch = this.pending;
    this.inflight = batch;
    this.pending = new Map();
    this.setStatus("saving");
    try {
      await this.send(toPatch(batch));
      this.inflight = null;
      this.retryMs = 0;
      if (this.pending.size > 0) {
        this.schedule(this.opts.debounceMs ?? 400);
      } else {
        this.setStatus("idle");
        this.opts.onSaved?.();
      }
    } catch (err) {
      this.inflight = null;
      const retry = this.opts.onError ? this.opts.onError(err) : true;
      if (!retry) {
        this.pending.clear();
        this.retryMs = 0;
        this.setStatus("idle");
        return;
      }
      // Newer ticks made while the batch was in flight win over it.
      for (const [key, checked] of batch) if (!this.pending.has(key)) this.pending.set(key, checked);
      const min = this.opts.minRetryMs ?? 2000;
      this.retryMs = Math.min(this.retryMs ? this.retryMs * 2 : min, this.opts.maxRetryMs ?? 30000);
      this.setStatus("error");
      this.schedule(this.retryMs);
    }
  }
}
