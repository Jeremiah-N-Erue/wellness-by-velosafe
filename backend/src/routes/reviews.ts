import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";

export const reviewsRouter = Router();

async function recomputeRating(providerId: string) {
  const agg = await prisma.review.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.providerProfile.update({
    where: { id: providerId },
    data: {
      ratingAvg: agg._avg.rating ?? 0,
      ratingCount: agg._count.rating,
    },
  });
}

const createReviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// A review can only be left against a booking the client actually completed — never a
// free-floating rating. One review per booking.
reviewsRouter.post("/", requireAuth, requireRole("CLIENT"), async (req: AuthedRequest, res) => {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.clientId !== req.user!.id) return res.status(403).json({ error: "Not your booking" });
  if (booking.status !== "COMPLETED") {
    return res.status(400).json({ error: "You can only review a completed session" });
  }

  const existing = await prisma.review.findUnique({ where: { bookingId: booking.id } });
  if (existing) return res.status(409).json({ error: "You already reviewed this session" });

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      clientId: req.user!.id,
      providerId: booking.providerId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  await recomputeRating(booking.providerId);

  res.status(201).json(review);
});

reviewsRouter.get("/provider/:providerId", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { providerId: req.params.providerId },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

// So a client's "My Bookings" view can know which completed sessions still need a review.
reviewsRouter.get("/me", requireAuth, requireRole("CLIENT"), async (req: AuthedRequest, res) => {
  const reviews = await prisma.review.findMany({ where: { clientId: req.user!.id } });
  res.json(reviews);
});
