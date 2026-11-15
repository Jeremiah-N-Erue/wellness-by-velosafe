import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { createNotification } from "./notifications.js";

export const providersRouter = Router();

// Public: browse/search providers. Core discovery flow.
providersRouter.get("/", async (req, res) => {
  const { categorySlug, countrySlug, city, q } = req.query as Record<string, string | undefined>;

  const providers = await prisma.providerProfile.findMany({
    where: {
      ...(city ? { city } : {}),
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(countrySlug ? { country: { slug: countrySlug } } : {}),
      ...(q
        ? {
            OR: [
              { headline: { contains: q, mode: "insensitive" } },
              { bio: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { name: true } },
      category: true,
      country: true,
      services: { where: { isActive: true } },
      verificationRecord: true,
    },
    orderBy: { trustScore: "desc" },
  });

  res.json(providers);
});

// Provider's own profile + a simple real performance overview (no new schema needed —
// derived from existing Booking rows). "Earnings" here is credits charged across completed
// sessions, since there's no real payout rail yet — see docs/architecture.md on payments.
// IMPORTANT: this must be registered BEFORE GET "/:id" below — Express matches routes in
// registration order, and "/:id" would otherwise swallow "/me" as if id === "me".
providersRouter.get("/me", requireAuth, requireRole("PROVIDER"), async (req: AuthedRequest, res) => {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: req.user!.id },
    include: { category: true, country: true, verificationRecord: true, services: true },
  });
  if (!profile) return res.status(404).json({ error: "No provider profile yet" });

  const bookings = await prisma.booking.findMany({ where: { providerId: profile.id } });
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const cancelled = bookings.filter((b) => b.status === "CANCELLED" || b.status === "NO_SHOW");
  const creditsEarned = completed.reduce((sum, b) => sum + b.creditsCharged, 0);
  const completionRate = bookings.length > 0 ? Math.round((completed.length / bookings.length) * 100) : 0;

  res.json({
    profile,
    stats: {
      totalBookings: bookings.length,
      completedSessions: completed.length,
      creditsEarned,
      completionRate,
      cancelledOrNoShow: cancelled.length,
    },
  });
});

// Marketplace-wide stats for the Admin Console overview — all real counts, nothing mocked.
providersRouter.get("/stats/overview", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  const [totalClients, totalProviders, totalBookings, completedBookings, pendingVerifications, verifiedProviders, activeCategories, activeCountries] =
    await Promise.all([
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.user.count({ where: { role: "PROVIDER" } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.providerProfile.count({ where: { verificationTier: "NONE" } }),
      prisma.providerProfile.count({ where: { verificationTier: { not: "NONE" } } }),
      prisma.serviceCategory.count({ where: { isActive: true } }),
      prisma.country.count({ where: { isActive: true } }),
    ]);

  res.json({
    totalClients,
    totalProviders,
    totalBookings,
    completedBookings,
    pendingVerifications,
    verifiedProviders,
    activeCategories,
    activeCountries,
  });
});

providersRouter.get("/:id", async (req, res) => {
  const provider = await prisma.providerProfile.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { name: true, email: true } },
      category: true,
      country: true,
      services: { where: { isActive: true } },
      verificationRecord: true,
    },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });
  res.json(provider);
});

const createProfileSchema = z.object({
  categorySlug: z.string(),
  countrySlug: z.string(),
  city: z.string().min(1),
  headline: z.string().min(1),
  bio: z.string().min(1),
  yearsExperience: z.number().int().min(0).default(0),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

// Provider creates/completes their profile. Starts at verificationTier NONE —
// Tier 1 only unlocks once admin confirms the checklist (see /verification routes below).
providersRouter.post("/me", requireAuth, requireRole("PROVIDER"), async (req: AuthedRequest, res) => {
  const parsed = createProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const category = await prisma.serviceCategory.findUnique({ where: { slug: parsed.data.categorySlug } });
  if (!category) return res.status(400).json({ error: "Unknown category" });

  const country = await prisma.country.findUnique({ where: { slug: parsed.data.countrySlug } });
  if (!country || !country.isActive) return res.status(400).json({ error: "Unknown or inactive market" });

  const { categorySlug: _c, countrySlug: _k, avatarUrl, ...rest } = parsed.data;
  const cleanAvatarUrl = avatarUrl || undefined;

  const profile = await prisma.providerProfile.upsert({
    where: { userId: req.user!.id },
    update: { ...rest, categoryId: category.id, countryId: country.id, ...(cleanAvatarUrl !== undefined ? { avatarUrl: cleanAvatarUrl } : {}) },
    create: {
      userId: req.user!.id,
      categoryId: category.id,
      countryId: country.id,
      city: parsed.data.city,
      headline: parsed.data.headline,
      bio: parsed.data.bio,
      yearsExperience: parsed.data.yearsExperience,
      avatarUrl: cleanAvatarUrl,
      verificationRecord: { create: {} },
    },
    include: { verificationRecord: true, country: true },
  });

  res.status(201).json(profile);
});

const addServiceSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  durationMins: z.number().int().min(15).default(60),
  creditCost: z.number().int().min(1).default(1),
});

providersRouter.post("/me/services", requireAuth, requireRole("PROVIDER"), async (req: AuthedRequest, res) => {
  const parsed = addServiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const profile = await prisma.providerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!profile) return res.status(400).json({ error: "Complete your provider profile first" });

  const service = await prisma.service.create({
    data: { ...parsed.data, providerId: profile.id },
  });
  res.status(201).json(service);
});

// Tier 1 baseline verification checklist update. In the MVP, an admin drives this;
// a real ops flow would gate it behind actually contacting the reference.
const verificationSchema = z.object({
  idDocumentVerified: z.boolean().optional(),
  certificationVerified: z.boolean().optional(),
  referenceContactName: z.string().optional(),
  referenceContactPhone: z.string().optional(),
  referenceContactStatus: z.enum(["PENDING", "CONTACTED", "CONFIRMED", "FAILED"]).optional(),
  codeOfConductSignedAt: z.string().datetime().optional(),
  waiverSignedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

providersRouter.patch(
  "/:id/verification",
  requireAuth,
  requireRole("ADMIN"),
  async (req: AuthedRequest, res) => {
    const parsed = verificationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const record = await prisma.verificationRecord.update({
      where: { providerId: req.params.id },
      data: parsed.data,
    });

    const allTier1Complete =
      record.idDocumentVerified &&
      record.certificationVerified &&
      record.referenceContactStatus === "CONFIRMED" &&
      record.codeOfConductSignedAt &&
      record.waiverSignedAt;

    let finalRecord = record;
    if (allTier1Complete && !record.tier1CompletedAt) {
      finalRecord = await prisma.verificationRecord.update({
        where: { providerId: req.params.id },
        data: { tier1CompletedAt: new Date() },
      });
      const updatedProvider = await prisma.providerProfile.update({
        where: { id: req.params.id },
        data: { verificationTier: "TIER_1_BASELINE" },
      });
      await createNotification(
        updatedProvider.userId,
        "VERIFICATION_UPDATED",
        "You're verified!",
        "Your Tier 1 baseline verification is complete — you're now bookable on Discover.",
        "/provider"
      );
    }

    res.json(finalRecord);
  }
);
