import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const categoriesRouter = Router();

// Public: list active service categories. Lets the frontend stay category-agnostic —
// Wellness ships fully built out; other categories can appear here later as data only.
categoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});
