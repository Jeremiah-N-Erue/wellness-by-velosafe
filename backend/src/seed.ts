import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Wellness by VeloSafe...");

  // --- Countries ------------------------------------------------------------
  // Vietnam and Nigeria are both live markets. A couple more are seeded inactive
  // ("coming soon") to prove the option is real, not a VN+NG hardcode with a label.
  const vietnam = await prisma.country.upsert({
    where: { slug: "vietnam" },
    update: {},
    create: { slug: "vietnam", name: "Vietnam", isoCode: "VN", currency: "VND", isActive: true },
  });

  const nigeria = await prisma.country.upsert({
    where: { slug: "nigeria" },
    update: {},
    create: { slug: "nigeria", name: "Nigeria", isoCode: "NG", currency: "NGN", isActive: true },
  });

  await prisma.country.upsert({
    where: { slug: "thailand" },
    update: {},
    create: { slug: "thailand", name: "Thailand", isoCode: "TH", currency: "THB", isActive: false },
  });
  await prisma.country.upsert({
    where: { slug: "united-arab-emirates" },
    update: {},
    create: { slug: "united-arab-emirates", name: "United Arab Emirates", isoCode: "AE", currency: "AED", isActive: false },
  });

  // --- Categories -------------------------------------------------------------
  // WELLNESS is the only category with its full operating model wired up.
  const wellness = await prisma.serviceCategory.upsert({
    where: { slug: "wellness" },
    update: {},
    create: {
      slug: "wellness",
      name: "Wellness & Fitness",
      description: "Personal trainers, yoga instructors, and wellness coaches.",
      requiresVerification: true,
      hasProgressTracking: true,
    },
  });

  await prisma.serviceCategory.upsert({
    where: { slug: "tours-experiences" },
    update: {},
    create: {
      slug: "tours-experiences",
      name: "Tours & Experiences",
      description: "Local guides and curated experiences for visitors. Not yet built out beyond discovery.",
      requiresVerification: false,
      hasProgressTracking: false,
      isActive: false,
    },
  });

  await prisma.serviceCategory.upsert({
    where: { slug: "relocation-visa" },
    update: {},
    create: {
      slug: "relocation-visa",
      name: "Visa & Relocation Help",
      description: "Support for expats settling in a new country. Not yet built out beyond discovery.",
      requiresVerification: false,
      hasProgressTracking: false,
      isActive: false,
    },
  });

  // --- Credit packs, per market -------------------------------------------
  await prisma.creditPack.upsert({
    where: { id: "pack_vn_starter" },
    update: {},
    create: { id: "pack_vn_starter", countryId: vietnam.id, name: "Starter — 5 credits", credits: 5, price: 1_000_000, validityDays: 180 },
  });
  await prisma.creditPack.upsert({
    where: { id: "pack_vn_standard" },
    update: {},
    create: { id: "pack_vn_standard", countryId: vietnam.id, name: "Standard — 10 credits", credits: 10, price: 1_800_000, validityDays: 180 },
  });
  await prisma.creditPack.upsert({
    where: { id: "pack_vn_committed" },
    update: {},
    create: { id: "pack_vn_committed", countryId: vietnam.id, name: "Committed — 20 credits", credits: 20, price: 3_200_000, validityDays: 365 },
  });

  await prisma.creditPack.upsert({
    where: { id: "pack_ng_starter" },
    update: {},
    create: { id: "pack_ng_starter", countryId: nigeria.id, name: "Starter — 5 credits", credits: 5, price: 25_000, validityDays: 180 },
  });
  await prisma.creditPack.upsert({
    where: { id: "pack_ng_standard" },
    update: {},
    create: { id: "pack_ng_standard", countryId: nigeria.id, name: "Standard — 10 credits", credits: 10, price: 45_000, validityDays: 180 },
  });
  await prisma.creditPack.upsert({
    where: { id: "pack_ng_committed" },
    update: {},
    create: { id: "pack_ng_committed", countryId: nigeria.id, name: "Committed — 20 credits", credits: 20, price: 80_000, validityDays: 365 },
  });

  // --- Users ----------------------------------------------------------------
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@wellnessbyvelosafe.app" },
    update: {},
    create: { email: "admin@wellnessbyvelosafe.app", passwordHash, name: "Platform Admin", role: "ADMIN" },
  });

  const providerUser1 = await prisma.user.upsert({
    where: { email: "mai.tran@example.com" },
    update: {},
    create: { email: "mai.tran@example.com", passwordHash, name: "Mai Tran", role: "PROVIDER", phone: "+84901234567" },
  });

  const providerUser2 = await prisma.user.upsert({
    where: { email: "duc.nguyen@example.com" },
    update: {},
    create: { email: "duc.nguyen@example.com", passwordHash, name: "Duc Nguyen", role: "PROVIDER", phone: "+84907654321" },
  });

  const providerUser3 = await prisma.user.upsert({
    where: { email: "chioma.okafor@example.com" },
    update: {},
    create: { email: "chioma.okafor@example.com", passwordHash, name: "Chioma Okafor", role: "PROVIDER", phone: "+2348012345678" },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: { email: "client@example.com", passwordHash, name: "Alex Carter", role: "CLIENT" },
  });

  // --- Provider profiles ----------------------------------------------------
  const maiProfile = await prisma.providerProfile.upsert({
    where: { userId: providerUser1.id },
    update: {},
    create: {
      userId: providerUser1.id,
      categoryId: wellness.id,
      countryId: vietnam.id,
      city: "Ho Chi Minh City",
      headline: "Certified Yoga Instructor — Vinyasa & Restorative",
      bio: "8 years teaching in HCMC studios and private sessions. RYT-500 certified.",
      yearsExperience: 8,
      verificationTier: "TIER_1_BASELINE",
      trustScore: 4.8,
      sessionCount: 142,
      verificationRecord: {
        create: {
          idDocumentVerified: true,
          certificationVerified: true,
          referenceContactName: "Lotus Yoga Studio, District 2",
          referenceContactStatus: "CONFIRMED",
          codeOfConductSignedAt: new Date(),
          waiverSignedAt: new Date(),
          tier1CompletedAt: new Date(),
        },
      },
    },
  });

  const ducProfile = await prisma.providerProfile.upsert({
    where: { userId: providerUser2.id },
    update: {},
    create: {
      userId: providerUser2.id,
      categoryId: wellness.id,
      countryId: vietnam.id,
      city: "Ho Chi Minh City",
      headline: "Personal Trainer — Strength & Conditioning",
      bio: "Former national-level swimmer, now coaching strength and mobility. ACE-certified.",
      yearsExperience: 5,
      verificationTier: "TIER_1_BASELINE",
      trustScore: 4.6,
      sessionCount: 89,
      verificationRecord: {
        create: {
          idDocumentVerified: true,
          certificationVerified: true,
          referenceContactName: "California Fitness, District 1",
          referenceContactStatus: "CONFIRMED",
          codeOfConductSignedAt: new Date(),
          waiverSignedAt: new Date(),
          tier1CompletedAt: new Date(),
        },
      },
    },
  });

  const chiomaProfile = await prisma.providerProfile.upsert({
    where: { userId: providerUser3.id },
    update: {},
    create: {
      userId: providerUser3.id,
      categoryId: wellness.id,
      countryId: nigeria.id,
      city: "Lagos",
      headline: "Wellness Coach — HIIT & Nutrition Guidance",
      bio: "Lagos-based coach, 6 years experience, specializing in sustainable habit-building over quick fixes.",
      yearsExperience: 6,
      verificationTier: "TIER_1_BASELINE",
      trustScore: 4.7,
      sessionCount: 61,
      verificationRecord: {
        create: {
          idDocumentVerified: true,
          certificationVerified: true,
          referenceContactName: "Ikoyi Fitness Club, Lagos",
          referenceContactStatus: "CONFIRMED",
          codeOfConductSignedAt: new Date(),
          waiverSignedAt: new Date(),
          tier1CompletedAt: new Date(),
        },
      },
    },
  });

  const yogaService = await prisma.service.create({
    data: {
      providerId: maiProfile.id,
      title: "1:1 Private Vinyasa Session",
      description: "60-minute personalized Vinyasa flow, any level.",
      durationMins: 60,
      creditCost: 2,
    },
  });

  const ptService = await prisma.service.create({
    data: {
      providerId: ducProfile.id,
      title: "1:1 Strength Coaching Session",
      description: "60-minute strength & conditioning session with program design.",
      durationMins: 60,
      creditCost: 2,
    },
  });

  await prisma.service.create({
    data: {
      providerId: chiomaProfile.id,
      title: "1:1 HIIT & Nutrition Session",
      description: "60-minute HIIT session plus a short nutrition check-in.",
      durationMins: 60,
      creditCost: 2,
    },
  });

  // --- Demo client state: VN credits, a completed booking, progress, a conversation ---
  await prisma.creditLedgerEntry.create({
    data: { userId: clientUser.id, countryId: vietnam.id, delta: 10, balanceAfter: 10, reason: "PURCHASE" },
  });

  const pastBooking = await prisma.booking.create({
    data: {
      clientId: clientUser.id,
      providerId: ducProfile.id,
      serviceId: ptService.id,
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: "COMPLETED",
      creditsCharged: 2,
      goalText: "Build general strength, 3x/week availability, no injuries.",
    },
  });

  await prisma.creditLedgerEntry.create({
    data: {
      userId: clientUser.id,
      countryId: vietnam.id,
      delta: -2,
      balanceAfter: 8,
      reason: "BOOKING_CHARGE",
      relatedBookingId: pastBooking.id,
    },
  });

  await prisma.progressLog.create({
    data: {
      bookingId: pastBooking.id,
      providerId: ducProfile.id,
      clientId: clientUser.id,
      sessionNotes: "Assessed baseline squat/hinge mechanics. Good range of motion, core bracing needs work.",
      goalProgressSummary: "On track for general strength goal. Foundational movement patterns established.",
      recommendedNextSessions: 8,
      recommendationRationale:
        "8 sessions covers a full foundational strength block (2x/week for 4 weeks) before reassessing — matches the stated 3x/week availability with one rest buffer.",
    },
  });

  const conversation = await prisma.conversation.create({
    data: { clientId: clientUser.id, providerId: ducProfile.id, stage: "POST_BOOKING" },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: clientUser.id,
      recipientId: providerUser2.id,
      body: "Hi Duc, looking forward to our next session. Can we focus more on deadlift form?",
      filteredBody: "Hi Duc, looking forward to our next session. Can we focus more on deadlift form?",
      wasFiltered: false,
    },
  });

  console.log("Seed complete.");
  console.log("Login as client@example.com / mai.tran@example.com / duc.nguyen@example.com / chioma.okafor@example.com / admin@wellnessbyvelosafe.app");
  console.log("Password for all seeded accounts: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
