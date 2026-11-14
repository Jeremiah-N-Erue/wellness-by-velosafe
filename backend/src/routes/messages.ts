import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { filterContactDetails } from "../utils/contactFilter.js";

export const messagesRouter = Router();

const startSchema = z.object({ providerId: z.string() });

messagesRouter.post("/conversations", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.conversation.findFirst({
    where: { clientId: req.user!.id, providerId: parsed.data.providerId },
  });
  if (existing) return res.json(existing);

  const created = await prisma.conversation.create({
    data: { clientId: req.user!.id, providerId: parsed.data.providerId },
  });
  res.status(201).json(created);
});

messagesRouter.get("/conversations", requireAuth, async (req: AuthedRequest, res) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ clientId: req.user!.id }, { provider: { userId: req.user!.id } }],
    },
    include: {
      client: { select: { name: true } },
      provider: { include: { user: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(conversations);
});

messagesRouter.get("/conversations/:id", requireAuth, async (req: AuthedRequest, res) => {
  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(messages);
});

const sendSchema = z.object({ body: z.string().min(1) });

// Pre-booking stage: text only, contact details soft-blocked per the documented
// messaging model. Once a booking exists between the two parties, the conversation's
// stage flips to POST_BOOKING and the filter is relaxed (handled by the stage check).
messagesRouter.post("/conversations/:id/messages", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { provider: true },
  });
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const isClient = conversation.clientId === req.user!.id;
  const isProvider = conversation.provider.userId === req.user!.id;
  if (!isClient && !isProvider) return res.status(403).json({ error: "Not a participant" });

  const recipientId = isClient ? conversation.provider.userId : conversation.clientId;

  const shouldFilter = conversation.stage === "PRE_BOOKING";
  const { filteredBody, wasFiltered } = shouldFilter
    ? filterContactDetails(parsed.data.body)
    : { filteredBody: parsed.data.body, wasFiltered: false };

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: req.user!.id,
      recipientId,
      body: parsed.data.body,
      filteredBody,
      wasFiltered,
    },
  });

  res.status(201).json(message);
});

// Called once a booking is confirmed between the two parties, to unlock fuller messaging.
// (Booking creation also calls this automatically — see bookings.ts — this endpoint exists
// for cases like a provider manually vouching for an existing client.)
messagesRouter.patch("/conversations/:id/advance-stage", requireAuth, async (req: AuthedRequest, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { provider: true },
  });
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const isParticipant =
    conversation.clientId === req.user!.id || conversation.provider.userId === req.user!.id;
  if (!isParticipant) return res.status(403).json({ error: "Not a participant" });

  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { stage: "POST_BOOKING" },
  });
  res.json(updated);
});
