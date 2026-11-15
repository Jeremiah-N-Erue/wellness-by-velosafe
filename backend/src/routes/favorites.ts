import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";

export const favoritesRouter = Router();

favoritesRouter.get("/me", requireAuth, requireRole("CLIENT"), async (req: AuthedRequest, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user!.id },
    include: {
      provider: {
        include: { user: { select: { name: true } }, category: true, country: true, services: { where: { isActive: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(favorites.map((f) => f.provider));
});

favoritesRouter.post("/:providerId", requireAuth, requireRole("CLIENT"), async (req: AuthedRequest, res) => {
  const provider = await prisma.providerProfile.findUnique({ where: { id: req.params.providerId } });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const favorite = await prisma.favorite.upsert({
    where: { userId_providerId: { userId: req.user!.id, providerId: provider.id } },
    update: {},
    create: { userId: req.user!.id, providerId: provider.id },
  });
  res.status(201).json(favorite);
});

favoritesRouter.delete("/:providerId", requireAuth, requireRole("CLIENT"), async (req: AuthedRequest, res) => {
  await prisma.favorite
    .delete({ where: { userId_providerId: { userId: req.user!.id, providerId: req.params.providerId } } })
    .catch(() => {});
  res.status(204).send();
});
