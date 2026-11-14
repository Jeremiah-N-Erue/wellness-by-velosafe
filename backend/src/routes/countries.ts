import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const countriesRouter = Router();

// Public: list active markets. Vietnam and Nigeria are live; others may appear here later
// as "coming soon" becomes "active" — see the seed data for inactive examples.
countriesRouter.get("/", async (_req, res) => {
  const countries = await prisma.country.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json(countries);
});

// Separate endpoint for "coming soon" markets, so the frontend can show them as a
// disabled/greyed option rather than hiding the broader ambition entirely.
countriesRouter.get("/upcoming", async (_req, res) => {
  const countries = await prisma.country.findMany({
    where: { isActive: false },
    orderBy: { name: "asc" },
  });
  res.json(countries);
});
