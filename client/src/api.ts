// REST client for the oot2-tracker server. Mirrors the action surface the
// checklist UI was built against (getChecks / setCheck / replaceChecks /
// resetChecks) plus a session probe used to decide whether account sync
// applies at all.

export interface SessionInfo {
  googleConfigured: boolean;
  user: { email: string; name: string | null; picture: string | null } | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
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
    throw new Error(message);
  }
  return (await res.json()) as T;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});

export const api = {
  getSession: async (): Promise<SessionInfo> => request<SessionInfo>("/api/auth/me"),
  getChecks: async (_args: Record<string, never>): Promise<{ checked: string[] }> =>
    request<{ checked: string[] }>("/api/checks"),
  setCheck: async (args: { itemKey: string; checked: boolean }): Promise<{ ok: true }> =>
    request<{ ok: true }>("/api/checks/set", post(args)),
  replaceChecks: async (args: { itemKeys: string[] }): Promise<{ ok: true }> =>
    request<{ ok: true }>("/api/checks/replace", post(args)),
  resetChecks: async (_args: Record<string, never>): Promise<{ ok: true }> =>
    request<{ ok: true }>("/api/checks/reset", post({})),
};
