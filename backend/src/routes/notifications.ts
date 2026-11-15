import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const notificationsRouter = Router();

// Shared helper other routes call when a real event happens (booking confirmed, progress
// logged, new message, verification updated) — never a decorative/fake notification.
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string
) {
  return prisma.notification.create({ data: { userId, type, title, body, link } });
}

notificationsRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(notifications);
});

notificationsRouter.patch("/:id/read", requireAuth, async (req: AuthedRequest, res) => {
  const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notif || notif.userId !== req.user!.id) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.notification.update({ where: { id: notif.id }, data: { readAt: new Date() } });
  res.json(updated);
});

notificationsRouter.patch("/read-all", requireAuth, async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.status(204).send();
});
