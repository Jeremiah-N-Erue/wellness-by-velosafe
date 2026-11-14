import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Booking, Country, CreditPack, ProgressLog } from "../lib/types";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export default function ClientDashboardPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [countrySlug, setCountrySlug] = useState("vietnam");
  const [balance, setBalance] = useState<{ balance: number; currency: string } | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [progress, setProgress] = useState<ProgressLog[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api<Country[]>("/countries").then((cs) => {
      setCountries(cs);
      if (cs.length && !cs.some((c) => c.slug === countrySlug)) setCountrySlug(cs[0].slug);
    });
    api<Booking[]>("/bookings/me").then(setBookings);
    api<ProgressLog[]>("/progress/me").then(setProgress);
  }, []);

  async function refreshMarketData() {
    const [b, p] = await Promise.all([
      api<{ balance: number; currency: string }>(`/payments/me/balance?countrySlug=${countrySlug}`),
      api<CreditPack[]>(`/payments/credit-packs?countrySlug=${countrySlug}`),
    ]);
    setBalance(b);
    setPacks(p);
  }

  useEffect(() => {
    refreshMarketData();
  }, [countrySlug]);

  async function buyPack(packId: string) {
    setPurchasing(packId);
    setMessage(null);
    try {
      await api("/payments/purchase", { method: "POST", body: { creditPackId: packId } });
      setMessage("Payment succeeded (mock provider) — credits added to your balance.");
      await refreshMarketData();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  }

  async function cancelBooking(id: string) {
    await api(`/bookings/${id}/cancel`, { method: "PATCH" });
    api<Booking[]>("/bookings/me").then(setBookings);
    refreshMarketData();
  }

  return (
    <div className="container">
      <h1 className="page-title">My Dashboard</h1>
      <p className="page-subtitle">Your credit balance, bookings, and verified progress history.</p>

      <div className="two-col">
        <div>
          <div className="section">
            <h2>Upcoming & past bookings</h2>
            <div className="card">
              {bookings.length === 0 && <p className="empty-state">No bookings yet — head to Discover to book your first session.</p>}
              {bookings.map((b) => (
                <div key={b.id} className="booking-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong>{b.service.title}</strong> with {b.provider?.user.name}
                    <div className="muted">{new Date(b.scheduledAt).toLocaleString()} · {b.creditsCharged} credit(s)</div>
                    {b.goalText && <div className="muted">Goal: {b.goalText}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                    <span className={`status-pill status-${b.status}`}>{b.status}</span>
                    {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                      <button className="btn btn-ghost" style={{ padding: "0.2rem 0.6rem", fontSize: "0.78rem" }} onClick={() => cancelBooking(b.id)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h2>Your progress (provider-verified, not self-reported)</h2>
            <div className="card">
              {progress.length === 0 && <p className="empty-state">No progress logs yet. Your provider adds one after each completed session.</p>}
              {progress.map((p) => (
                <div key={p.id} className="progress-row">
                  <strong>{p.booking?.service.title}</strong> — {p.provider?.user.name}
                  <div className="muted">{new Date(p.createdAt).toLocaleDateString()}</div>
                  <p style={{ margin: "0.4rem 0" }}>{p.goalProgressSummary}</p>
                  <p className="muted" style={{ margin: 0 }}>{p.sessionNotes}</p>
                  {p.recommendedNextSessions != null && (
                    <p className="muted" style={{ marginTop: "0.4rem" }}>
                      Recommended: {p.recommendedNextSessions} more sessions — {p.recommendationRationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="section">
            <label className="muted" style={{ display: "block", marginBottom: "0.3rem" }}>Market</label>
            <select value={countrySlug} onChange={(e) => setCountrySlug(e.target.value)} style={{ width: "100%" }}>
              {countries.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="balance-chip section">
            <span className="num">{balance?.balance ?? "…"}</span>
            <span>credits available{balance ? ` (${balance.currency})` : ""}</span>
          </div>

          <div className="section">
            <h2>Buy credits</h2>
            {message && <div className={message.includes("failed") || message.includes("error") ? "error-banner" : "success-banner"} style={{ marginBottom: "0.75rem" }}>{message}</div>}
            <div className="card">
              {packs.length === 0 && <p className="empty-state">No credit packs in this market yet.</p>}
              {packs.map((pack) => (
                <div key={pack.id} className="credit-pack-row">
                  <div>
                    <strong>{pack.name}</strong>
                    <div className="muted">{formatMoney(pack.price, pack.country.currency)} · valid {pack.validityDays} days</div>
                  </div>
                  <button className="btn btn-gold" disabled={purchasing === pack.id} onClick={() => buyPack(pack.id)}>
                    {purchasing === pack.id ? "Processing…" : "Buy"}
                  </button>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.5rem" }}>
              Payments run through a mock provider in this MVP — see docs/architecture.md for why, and how real
              MoMo/ZaloPay (Vietnam) or Paystack/Flutterwave (Nigeria) integrations would slot in later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
