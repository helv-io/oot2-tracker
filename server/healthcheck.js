// Container healthcheck: exit 0 when /healthz answers 200.
const port = process.env.PORT || 8080;
fetch(`http://127.0.0.1:${port}/healthz`, { signal: AbortSignal.timeout(4000) })
  .then((r) => process.exit(r.ok ? 0 : 1))
  .catch(() => process.exit(1));
