import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// One-off data migration: splits the single "Wellness & Fitness" umbrella category into
// five specific verticals (PT, Yoga & Mindfulness, Wellness Coaching, Fitness Classes,
// Digital Programmes) and reassigns existing providers to the one that actually matches
// their headline. Safe to re-run (upserts + updateMany are idempotent).
//
// Run with: npx tsx src/scripts/restructure-categories.ts
// Needs DATABASE_URL pointed at the target database (Render's Shell tab already has this
// set for the live backend service — run it there so the production credential never has
// to be copied anywhere).

const prisma = new PrismaClient();

async function main() {
  console.log("Restructuring Wellness & Fitness into 5 specific categories...");

  const categories = [
    {
      slug: "pt",
      name: "Personal Training",
      description: "Certified personal trainers for one-on-one strength, conditioning, and movement coaching.",
    },
    {
      slug: "yoga-mindfulness",
      name: "Yoga & Mindfulness",
      description: "Yoga instructors and mindfulness guides for flexibility, breathwork, and stress recovery.",
    },
    {
      slug: "wellness-coaching",
      name: "Wellness Coaching",
      description: "Holistic wellness coaches blending fitness, nutrition, and sustainable habit-building.",
    },
    {
      slug: "fitness-classes",
      name: "Fitness Classes",
      description: "Group fitness classes — HIIT, dance, bootcamp, and more. No providers have joined this category yet.",
    },
    {
      slug: "digital-programmes",
      name: "Digital Programmes",
      description:
        "Self-paced digital training and nutrition programmes you follow on your own schedule. No providers have joined this category yet.",
    },
  ];

  const idBySlug: Record<string, string> = {};
  for (const c of categories) {
    const row = await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, isActive: true, requiresVerification: true, hasProgressTracking: true },
      create: { ...c, isActive: true, requiresVerification: true, hasProgressTracking: true },
    });
    idBySlug[c.slug] = row.id;
    console.log(`  ${c.slug} -> ${row.id}`);
  }

  const reassignments: Array<{ headlineContains: string; slug: string }> = [
    { headlineContains: "Yoga Instructor", slug: "yoga-mindfulness" },
    { headlineContains: "Personal Trainer", slug: "pt" },
    { headlineContains: "Wellness Coach", slug: "wellness-coaching" },
  ];

  for (const r of reassignments) {
    const result = await prisma.providerProfile.updateMany({
      where: { headline: { contains: r.headlineContains } },
      data: { categoryId: idBySlug[r.slug] },
    });
    console.log(`  Reassigned ${result.count} provider(s) matching "${r.headlineContains}" -> ${r.slug}`);
  }

  const retired = await prisma.serviceCategory.updateMany({
    where: { slug: "wellness" },
    data: {
      isActive: false,
      description:
        "Retired — split into Personal Training, Yoga & Mindfulness, Wellness Coaching, Fitness Classes, and Digital Programmes.",
    },
  });
  console.log(`  Retired ${retired.count} old "wellness" category row(s).`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
