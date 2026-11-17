import { Router } from "express";
import os from "node:os";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getMetricsSnapshot, getStartedAtMs } from "../lib/metrics.js";

export const adminRouter = Router();

// Admin-only backend operations dashboard. Distinct from GET /providers/stats/overview
// (the business/marketplace dashboard) — this is about the API process itself: is it up,
// is the database reachable, how is it performing, what's it been doing lately.
adminRouter.get("/ops", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  const startedAtMs = getStartedAtMs();
  const uptimeSeconds = Math.round((Date.now() - startedAtMs) / 1000);

  const dbStart = process.hrtime.bigint();
  let database: { status: "ok" | "error"; latencyMs: number | null; error: string | null };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = {
      status: "ok",
      latencyMs: Math.round(Number(process.hrtime.bigint() - dbStart) / 1_000_000),
      error: null,
    };
  } catch (err) {
    database = {
      status: "error",
      latencyMs: null,
      error: err instanceof Error ? err.message : "Unknown database error",
    };
  }

  const mem = process.memoryUsage();
  const metrics = getMetricsSnapshot();

  res.json({
    service: "wellness-by-velosafe-api",
    status: database.status === "ok" ? "ok" : "degraded",
    time: new Date().toISOString(),
    startedAt: new Date(startedAtMs).toISOString(),
    uptimeSeconds,
    node: {
      version: process.version,
      platform: `${os.platform()} ${os.arch()}`,
      env: process.env.NODE_ENV || "production",
    },
    // Render automatically injects these for any web service — absent (null) when running
    // locally, which is the honest signal that this isn't deployed infrastructure.
    deployment: {
      commit: process.env.RENDER_GIT_COMMIT || null,
      branch: process.env.RENDER_GIT_BRANCH || null,
      serviceName: process.env.RENDER_SERVICE_NAME || null,
      instanceId: process.env.RENDER_INSTANCE_ID || null,
    },
    memory: {
      rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
    },
    database,
    requests: {
      total: metrics.total,
      byStatusClass: metrics.byStatusClass,
      errorRate: metrics.errorRate,
      avgResponseTimeMs: metrics.avgResponseTimeMs,
      topRoutes: metrics.topRoutes,
    },
    recentRequests: metrics.recentRequests,
  });
});
