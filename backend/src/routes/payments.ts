import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getActivePaymentProvider } from "../services/payment/adapter.js";

export const paymentsRouter = Router();

// Credit packs are market-specific (priced in that country's currency), so this always
// requires a country.
paymentsRouter.get("/credit-packs", async (req, res) => {
  const { countrySlug } = req.query as Record<string, string | undefined>;
  if (!countrySlug) return res.status(400).json({ error: "countrySlug is required" });

  const packs = await prisma.creditPack.findMany({
    where: { isActive: true, country: { slug: countrySlug } },
    include: { country: true },
    orderBy: { price: "asc" },
  });
  res.json(packs);
});

// Balance is per-country. Returns balances for every country the client has ever held
// credits in, plus the one requested (at 0) if they have none there yet.
paymentsRouter.get("/me/balance", requireAuth, async (req: AuthedRequest, res) => {
  const { countrySlug } = req.query as Record<string, string | undefined>;
  if (!countrySlug) return res.status(400).json({ error: "countrySlug is required" });

  const country = await prisma.country.findUnique({ where: { slug: countrySlug } });
  if (!country) return res.status(404).json({ error: "Unknown market" });

  const last = await prisma.creditLedgerEntry.findFirst({
    where: { userId: req.user!.id, countryId: country.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ countrySlug, currency: country.currency, balance: last?.balanceAfter ?? 0 });
});

paymentsRouter.get("/me/ledger", requireAuth, async (req: AuthedRequest, res) => {
  const { countrySlug } = req.query as Record<string, string | undefined>;
  const entries = await prisma.creditLedgerEntry.findMany({
    where: { userId: req.user!.id, ...(countrySlug ? { country: { slug: countrySlug } } : {}) },
    include: { country: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(entries);
});

const purchaseSchema = z.object({ creditPackId: z.string() });

// Buy a credit pack. Runs through the PaymentProviderAdapter — MOCK succeeds instantly
// today, for every market; a real MoMo/ZaloPay/VNPay/Paystack/Flutterwave provider slots
// in later without touching this route.
paymentsRouter.post("/purchase", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pack = await prisma.creditPack.findUnique({
    where: { id: parsed.data.creditPackId },
    include: { country: true },
  });
  if (!pack || !pack.isActive) return res.status(404).json({ error: "Credit pack not found" });

  const payment = await prisma.payment.create({
    data: {
      userId: req.user!.id,
      creditPackId: pack.id,
      amount: pack.price,
      provider: (process.env.PAYMENT_PROVIDER as any) || "MOCK",
      status: "PENDING",
    },
  });

  const adapter = getActivePaymentProvider();
  try {
    const result = await adapter.charge({
      amount: pack.price,
      currency: pack.country.currency,
      userId: req.user!.id,
      creditPackId: pack.id,
      description: `Purchase: ${pack.name}`,
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: result.status, externalRef: result.externalRef },
    });

    if (result.status === "SUCCEEDED") {
      const lastEntry = await prisma.creditLedgerEntry.findFirst({
        where: { userId: req.user!.id, countryId: pack.countryId },
        orderBy: { createdAt: "desc" },
      });
      const newBalance = (lastEntry?.balanceAfter ?? 0) + pack.credits;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pack.validityDays);

      await prisma.creditLedgerEntry.create({
        data: {
          userId: req.user!.id,
          countryId: pack.countryId,
          delta: pack.credits,
          balanceAfter: newBalance,
          reason: "PURCHASE",
          relatedPaymentId: payment.id,
          expiresAt,
        },
      });
    }

    res.status(201).json(updated);
  } catch (err: any) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    res.status(502).json({ error: err.message || "Payment provider error" });
  }
});
