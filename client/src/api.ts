// REST client for the oot2-tracker server.

import type { Patch } from "./lib/sync";

export interface SessionInfo {
  googleConfigured: boolean;
  user: { email: string; name: string | null; picture: string | null } | null;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(0, "You're offline.");
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body: unknown = await res.json();
      if (body && typeof body === "object" && "error" in body) {
        message = String((body as { error: unknown }).error);
      }
    } catch {
      // keep the status-based message
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

const post = (body: unknown, keepalive = false): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
  keepalive,
});

export const api = {
  getSession: () => request<SessionInfo>("/api/auth/me"),
  getChecks: () => request<{ checked: string[] }>("/api/checks"),
  patchChecks: (patch: Patch, keepalive = false) => request<{ ok: true }>("/api/checks/patch", post(patch, keepalive)),
  replaceChecks: (itemKeys: string[]) => request<{ ok: true }>("/api/checks/replace", post({ itemKeys })),
  resetChecks: () => request<{ ok: true }>("/api/checks/reset", post({})),
  deleteAccount: () => request<{ ok: true }>("/api/account/delete", post({})),
};
