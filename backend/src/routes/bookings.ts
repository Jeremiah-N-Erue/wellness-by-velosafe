import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";

export const bookingsRouter = Router();

const createBookingSchema = z.object({
  serviceId: z.string(),
  scheduledAt: z.string().datetime({ offset: true }),
  goalText: z.string().optional(),
});

// Book a session against the client's credit balance. Charges credits atomically
// alongside creating the booking so a balance can never go negative from a race.
bookingsRouter.post("/", requireAuth, requireRole("CLIENT"), async (req: AuthedRequest, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const service = await prisma.service.findUnique({
    where: { id: parsed.data.serviceId },
    include: { provider: true },
  });
  if (!service || !service.isActive) return res.status(404).json({ error: "Service not found" });

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Credits are scoped per-country — charge against the balance in the provider's market.
      const lastEntry = await tx.creditLedgerEntry.findFirst({
        where: { userId: req.user!.id, countryId: service.provider.countryId },
        orderBy: { createdAt: "desc" },
      });
      const currentBalance = lastEntry?.balanceAfter ?? 0;
      if (currentBalance < service.creditCost) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      const created = await tx.booking.create({
        data: {
          clientId: req.user!.id,
          providerId: service.providerId,
          serviceId: service.id,
          scheduledAt: new Date(parsed.data.scheduledAt),
          creditsCharged: service.creditCost,
          goalText: parsed.data.goalText,
          status: "CONFIRMED",
        },
      });

      await tx.creditLedgerEntry.create({
        data: {
          userId: req.user!.id,
          countryId: service.provider.countryId,
          delta: -service.creditCost,
          balanceAfter: currentBalance - service.creditCost,
          reason: "BOOKING_CHARGE",
          relatedBookingId: created.id,
        },
      });

      return created;
    });

    // A confirmed booking unlocks fuller messaging between this client and provider —
    // find or start their conversation and flip it past the pre-booking filter stage.
    const existingConversation = await prisma.conversation.findFirst({
      where: { clientId: req.user!.id, providerId: service.providerId },
    });
    if (existingConversation) {
      await prisma.conversation.update({
        where: { id: existingConversation.id },
        data: { stage: "POST_BOOKING" },
      });
    } else {
      await prisma.conversation.create({
        data: { clientId: req.user!.id, providerId: service.providerId, stage: "POST_BOOKING" },
      });
    }

    res.status(201).json(booking);
  } catch (err: any) {
    if (err.message === "INSUFFICIENT_CREDITS") {
      return res.status(402).json({ error: "Not enough credits for this session" });
    }
    throw err;
  }
});

bookingsRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const asClient = req.user!.role === "CLIENT";
  const bookings = asClient
    ? await prisma.booking.findMany({
        where: { clientId: req.user!.id },
        include: { service: true, provider: { include: { user: { select: { name: true } } } }, progressLog: true },
        orderBy: { scheduledAt: "desc" },
      })
    : await prisma.booking.findMany({
        where: { provider: { userId: req.user!.id } },
        include: { service: true, client: { select: { name: true } }, progressLog: true },
        orderBy: { scheduledAt: "desc" },
      });
  res.json(bookings);
});

bookingsRouter.patch("/:id/cancel", requireAuth, async (req: AuthedRequest, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { provider: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.clientId !== req.user!.id) return res.status(403).json({ error: "Not your booking" });
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return res.status(400).json({ error: "Booking can no longer be cancelled" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });

    const lastEntry = await tx.creditLedgerEntry.findFirst({
      where: { userId: req.user!.id, countryId: booking.provider.countryId },
      orderBy: { createdAt: "desc" },
    });
    const currentBalance = lastEntry?.balanceAfter ?? 0;

    await tx.creditLedgerEntry.create({
      data: {
        userId: req.user!.id,
        countryId: booking.provider.countryId,
        delta: booking.creditsCharged,
        balanceAfter: currentBalance + booking.creditsCharged,
        reason: "BOOKING_REFUND",
        relatedBookingId: booking.id,
      },
    });

    return cancelled;
  });

  res.json(updated);
});
