import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const aiRouter = Router();

// "VeloSafe Wellness AI" — a transparent, rule-based recommender, not an LLM (explicit
// product decision: no new API key dependency, and every recommendation traces back to a
// real keyword match + real marketplace data, never a black box). Matches a customer's
// stated goal text against each category's keyword set, ranks matching categories by hit
// count, then returns real providers in those categories ranked by customer rating, trust
// score, and experience. Falls back to "all active categories" when nothing matches so the
// assistant never returns an empty result for an unrecognized goal.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  pt: ["strength", "muscle", "weight loss", "lose weight", "tone", "gym", "fat loss", "build muscle", "personal train", "cardio fitness", "get fit", "fit"],
  "yoga-mindfulness": ["yoga", "flexibility", "flexible", "stress", "mindfulness", "meditation", "relax", "breath", "stretch", "calm", "anxiety"],
  "wellness-coaching": ["habit", "nutrition", "holistic", "lifestyle", "wellness", "accountability", "diet", "balance", "sleep", "energy"],
  "fitness-classes": ["group", "class", "hiit", "dance", "bootcamp", "cardio", "community", "zumba"],
  "digital-programmes": ["online", "remote", "self-paced", "app", "program", "programme", "digital", "home workout"],
};

const recommendSchema = z.object({
  goals: z.string().min(3).max(500),
  countrySlug: z.string().optional(),
});

aiRouter.post("/recommend", async (req, res) => {
  const parsed = recommendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const text = parsed.data.goals.toLowerCase();

  const scored = Object.entries(CATEGORY_KEYWORDS)
    .map(([slug, keywords]) => ({
      slug,
      hits: keywords.filter((k) => text.includes(k)).length,
    }))
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  const matchedSlugs = scored.slice(0, 2).map((s) => s.slug);

  const categories = await prisma.serviceCategory.findMany({ where: { isActive: true } });
  const matchedCategories = categories.filter((c) => matchedSlugs.includes(c.slug));
  const usedFallback = matchedCategories.length === 0;
  const categoryFilter = usedFallback ? categories.map((c) => c.slug) : matchedSlugs;

  const providers = await prisma.providerProfile.findMany({
    where: {
      category: { slug: { in: categoryFilter } },
      ...(parsed.data.countrySlug ? { country: { slug: parsed.data.countrySlug } } : {}),
    },
    include: {
      user: { select: { name: true } },
      category: true,
      country: true,
      services: { where: { isActive: true } },
      verificationRecord: true,
    },
    orderBy: [{ ratingAvg: "desc" }, { trustScore: "desc" }, { sessionCount: "desc" }],
    take: 5,
  });

  const categoryNames = (usedFallback ? categories : matchedCategories).map((c) => c.name);
  const rationale = usedFallback
    ? `We couldn't match specific keywords in "${parsed.data.goals}" to one of our categories, so here are top-rated professionals across all active categories.`
    : `Based on your goal, we recommend ${categoryNames.join(" and ")}. ${
        providers.length > 0
          ? `Here are real professionals in ${categoryNames.length > 1 ? "those categories" : "that category"}, ranked by customer rating and trust score.`
          : "No providers have joined that category yet — try Discover to see what's available today."
      }`;

  res.json({
    matchedCategories: usedFallback ? [] : matchedCategories.map((c) => ({ slug: c.slug, name: c.name })),
    rationale,
    providers,
    disclaimer:
      "VeloSafe Wellness AI matches you to real professionals on this marketplace based on your stated goals. It is not a medical professional and does not provide medical advice — for health conditions, please consult a qualified doctor.",
  });
});
