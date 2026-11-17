import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { OpsOverview } from "../lib/types";

const REFRESH_MS = 15_000;

function formatUptime(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (d > 0 || h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  if (d === 0 && h === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

function statusTone(status: number): "ok" | "warn" | "error" {
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  return "ok";
}

export default function AdminOpsPage() {
  const [ops, setOps] = useState<OpsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    api<OpsOverview>("/admin/ops")
      .then((data) => {
        setOps(data);
        setLastFetched(new Date());
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load system health"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  if (loading && !ops) {
    return (
      <div className="container">
        <h1 className="page-title">System Health</h1>
        <p className="muted">Checking the API…</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="ops-header">
        <div>
          <h1 className="page-title">System Health</h1>
          <p className="page-subtitle">
            Live operational status of the API itself — requests, response times, and database
            connectivity. For marketplace business metrics (clients, bookings, providers), see the{" "}
            <a href="/admin">Admin Console</a>.
          </p>
        </div>
        <div className="ops-refresh">
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh now"}
          </button>
          <span className="muted" style={{ fontSize: "0.78rem" }}>
            Auto-refreshes every 15s{lastFetched ? ` · last updated ${lastFetched.toLocaleTimeString()}` : ""}
          </span>
        </div>
      </div>

      {error && <div className="error-banner section">Could not reach the API: {error}</div>}

      {ops && (
        <>
          <div className="section ops-status-card card">
            <div className="ops-status-row">
              <span className={`ops-pill ops-pill-${ops.status}`}>
                <span className="ops-pill-dot" />
                {ops.status === "ok" ? "Operational" : "Degraded"}
              </span>
              <span className="muted">
                {ops.service} · up {formatUptime(ops.uptimeSeconds)} · woke at{" "}
                {new Date(ops.startedAt).toLocaleString()}
              </span>
            </div>
            <div className="ops-deployment-meta muted">
              {ops.deployment.commit ? (
                <>
                  deploy <code>{ops.deployment.commit.slice(0, 7)}</code>
                  {ops.deployment.branch ? ` on ${ops.deployment.branch}` : ""} ·{" "}
                </>
              ) : (
                "local/dev environment · "
              )}
              Node {ops.node.version} ({ops.node.platform}) · {ops.node.env}
            </div>
          </div>

          <div className="section">
            <div className="stat-tile-row">
              <div className="stat-tile">
                <strong>{ops.database.status === "ok" ? `${ops.database.latencyMs}ms` : "—"}</strong>
                <span>DB latency{ops.database.status !== "ok" ? " (error)" : ""}</span>
              </div>
              <div className="stat-tile">
                <strong>{ops.requests.total}</strong>
                <span>Requests since wake</span>
              </div>
              <div className="stat-tile">
                <strong>{ops.requests.errorRate}%</strong>
                <span>Error rate</span>
              </div>
              <div className="stat-tile">
                <strong>{ops.requests.avgResponseTimeMs}ms</strong>
                <span>Avg response time</span>
              </div>
              <div className="stat-tile">
                <strong>{ops.memory.rssMb}MB</strong>
                <span>Memory (RSS)</span>
              </div>
            </div>
          </div>

          {ops.database.status === "error" && (
            <div className="error-banner section">Database check failed: {ops.database.error}</div>
          )}

          <div className="section">
            <h2>Traffic by response status</h2>
            {ops.requests.total === 0 ? (
              <p className="empty-state">No requests recorded since the API last woke up.</p>
            ) : (
              <>
                <div className="ops-status-bar">
                  {(["2xx", "3xx", "4xx", "5xx"] as const).map((cls) => {
                    const count = ops.requests.byStatusClass[cls];
                    const pct = (count / ops.requests.total) * 100;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={cls}
                        className={`ops-status-segment ops-status-${cls}`}
                        style={{ width: `${pct}%` }}
                        title={`${cls}: ${count} (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
                <div className="ops-status-legend">
                  {(["2xx", "3xx", "4xx", "5xx"] as const).map((cls) => (
                    <span key={cls} className="ops-legend-item">
                      <span className={`ops-legend-dot ops-status-${cls}`} />
                      {cls}: {ops.requests.byStatusClass[cls]}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="section">
            <h2>Busiest endpoints</h2>
            {ops.requests.topRoutes.length === 0 ? (
              <p className="empty-state">No traffic yet.</p>
            ) : (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Requests</th>
                      <th>Avg time</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ops.requests.topRoutes.map((r) => (
                      <tr key={r.route}>
                        <td><code>{r.route}</code></td>
                        <td>{r.count}</td>
                        <td>{r.avgMs}ms</td>
                        <td>{r.errorCount > 0 ? <span className="ops-text-error">{r.errorCount}</span> : "0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="section">
            <h2>Recent requests</h2>
            {ops.recentRequests.length === 0 ? (
              <p className="empty-state">No requests recorded since the API last woke up.</p>
            ) : (
              <div className="card ops-recent-scroll" style={{ padding: 0 }}>
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Method</th>
                      <th>Path</th>
                      <th>Status</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ops.recentRequests.map((r, i) => (
                      <tr key={i}>
                        <td className="muted">{new Date(r.at).toLocaleTimeString()}</td>
                        <td>{r.method}</td>
                        <td><code>{r.path}</code></td>
                        <td>
                          <span className={`ops-status-text ops-text-${statusTone(r.status)}`}>{r.status}</span>
                        </td>
                        <td>{r.ms}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="muted ops-footnote">
            These numbers live only in the running process — they reset whenever the API restarts,
            including Render's free-tier spin-down after ~15 minutes of inactivity. This is traffic
            since the service last woke up, not long-term history.
          </p>
        </>
      )}
    </div>
  );
}
