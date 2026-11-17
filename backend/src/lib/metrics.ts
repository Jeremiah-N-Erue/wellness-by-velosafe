import type { NextFunction, Request, Response } from "express";

// Lightweight, dependency-free in-process request metrics for the admin System Health page.
// Deliberately in-memory, not persisted: adding a database write to every single API request
// would be real overhead for a free-tier MVP, and Render's free plan spins the service down
// after ~15 minutes idle anyway — so these numbers are always "since the API last woke up,"
// not long-term history. That tradeoff is explained to the admin in the frontend, not hidden.

const startedAtMs = Date.now();
const MAX_RECENT = 40;

interface RouteStat {
  count: number;
  totalMs: number;
  errors: number;
}

interface RecentEntry {
  at: string;
  method: string;
  path: string;
  status: number;
  ms: number;
}

const state = {
  totalRequests: 0,
  byStatusClass: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 } as Record<string, number>,
  totalMs: 0,
  routeStats: new Map<string, RouteStat>(),
  recentRequests: [] as RecentEntry[],
};

function statusClass(status: number): "2xx" | "3xx" | "4xx" | "5xx" {
  if (status >= 500) return "5xx";
  if (status >= 400) return "4xx";
  if (status >= 300) return "3xx";
  return "2xx";
}

// Mount this once, early — before the routers — so it wraps every request (including /health
// and the bare root) and still captures the status code set by the centralized error handler,
// since res.on("finish") fires only once the response has actually been sent.
export function requestMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startNs = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const status = res.statusCode;
    const cls = statusClass(status);

    state.totalRequests += 1;
    state.byStatusClass[cls] += 1;
    state.totalMs += durationMs;

    // req.route is only populated once Express has matched a router's route, which gives a
    // normalized key like "GET /api/providers/:id" instead of one row per real provider id.
    // Unmatched requests (404s) fall back to the raw path — fine, since those are rare.
    const matchedPath = req.route
      ? `${req.baseUrl}${req.route.path === "/" ? "" : req.route.path}` || "/"
      : req.path;
    const routeKey = `${req.method} ${matchedPath}`;

    const existing = state.routeStats.get(routeKey) || { count: 0, totalMs: 0, errors: 0 };
    existing.count += 1;
    existing.totalMs += durationMs;
    if (status >= 400) existing.errors += 1;
    state.routeStats.set(routeKey, existing);

    state.recentRequests.unshift({
      at: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status,
      ms: Math.round(durationMs),
    });
    if (state.recentRequests.length > MAX_RECENT) {
      state.recentRequests.length = MAX_RECENT;
    }
  });

  next();
}

export function getStartedAtMs() {
  return startedAtMs;
}

export function getMetricsSnapshot() {
  const total = state.totalRequests;
  const errorCount = state.byStatusClass["4xx"] + state.byStatusClass["5xx"];

  const topRoutes = [...state.routeStats.entries()]
    .map(([route, s]) => ({
      route,
      count: s.count,
      avgMs: Math.round(s.totalMs / s.count),
      errorCount: s.errors,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    total,
    byStatusClass: { ...state.byStatusClass },
    errorRate: total > 0 ? Math.round((errorCount / total) * 1000) / 10 : 0,
    avgResponseTimeMs: total > 0 ? Math.round(state.totalMs / total) : 0,
    topRoutes,
    recentRequests: state.recentRequests,
  };
}
