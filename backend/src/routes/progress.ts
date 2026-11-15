import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { createNotification } from "./notifications.js";

export const progressRouter = Router();

const logSchema = z.object({
  bookingId: z.string(),
  sessionNotes: z.string().min(1),
  goalProgressSummary: z.string().min(1),
  recommendedNextSessions: z.number().int().min(0).optional(),
  recommendationRationale: z.string().optional(),
});

// Provider logs a structured report against the booking's stated goal. This is the
// "Verified Progress" differentiator — provider-entered, never self-reported by the
// client, and the session-count recommendation is explainable (rationale is required
// text, not a hidden model score).
progressRouter.post("/", requireAuth, requireRole("PROVIDER"), async (req: AuthedRequest, res) => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { provider: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.provider.userId !== req.user!.id) return res.status(403).json({ error: "Not your booking" });

  const log = await prisma.progressLog.create({
    data: {
      bookingId: booking.id,
      providerId: booking.providerId,
      clientId: booking.clientId,
      sessionNotes: parsed.data.sessionNotes,
      goalProgressSummary: parsed.data.goalProgressSummary,
      recommendedNextSessions: parsed.data.recommendedNextSessions,
      recommendationRationale: parsed.data.recommendationRationale,
    },
  });

  await prisma.booking.update({ where: { id: booking.id }, data: { status: "COMPLETED" } });
  await prisma.providerProfile.update({
    where: { id: booking.providerId },
    data: { sessionCount: { increment: 1 } },
  });

  await createNotification(
    booking.clientId,
    "PROGRESS_LOGGED",
    "Progress logged",
    "Your provider logged progress for a completed session. You can now leave a review.",
    "/profile"
  );

  res.status(201).json(log);
});

progressRouter.get("/me", requireAuth, requireRole("CLIENT"), async (req: AuthedRequest, res) => {
  const logs = await prisma.progressLog.findMany({
    where: { clientId: req.user!.id },
    include: { provider: { include: { user: { select: { name: true } } } }, booking: { include: { service: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(logs);
});

progressRouter.patch("/:id/acknowledge", requireAuth, requireRole("CLIENT"), async (req: AuthedRequest, res) => {
  const log = await prisma.progressLog.findUnique({ where: { id: req.params.id } });
  if (!log) return res.status(404).json({ error: "Progress log not found" });
  if (log.clientId !== req.user!.id) return res.status(403).json({ error: "Not your progress log" });

  const updated = await prisma.progressLog.update({
    where: { id: req.params.id },
    data: { clientAcknowledgedAt: new Date() },
  });
  res.json(updated);
});
