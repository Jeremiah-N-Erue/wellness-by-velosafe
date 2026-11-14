import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { countriesRouter } from "./routes/countries.js";
import { providersRouter } from "./routes/providers.js";
import { bookingsRouter } from "./routes/bookings.js";
import { paymentsRouter } from "./routes/payments.js";
import { progressRouter } from "./routes/progress.js";
import { messagesRouter } from "./routes/messages.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "wellness-by-velosafe-api" }));

app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/countries", countriesRouter);
app.use("/api/providers", providersRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/progress", progressRouter);
app.use("/api/messages", messagesRouter);

// Centralized error handler so an unexpected throw returns JSON, not an HTML stack trace.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Wellness by VeloSafe API listening on :${PORT}`);
});
