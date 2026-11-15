import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../lib/api";
import type { Booking, Country, CreditPack, ProgressLog, ProviderProfile } from "../lib/types";
import MyWellnessPanel from "../components/MyWellnessPanel";
import ProviderCard from "../components/ProviderCard";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

// "Profile" tab: goals, payment (credits), progress, and (eventually) settings. Bookings
// themselves live on the Booking tab — see BookingPage.tsx.
export default function ProfilePage() {
  const { t } = useTranslation();
  const [countries, setCountries] = useState<Country[]>([]);
  const [countrySlug, setCountrySlug] = useState("vietnam");
  const [balance, setBalance] = useState<{ balance: number; currency: string } | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [progress, setProgress] = useState<ProgressLog[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<ProviderProfile[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function loadFavorites() {
    api<ProviderProfile[]>("/favorites/me").then(setFavorites).catch(() => {});
  }

  useEffect(() => {
    api<Country[]>("/countries").then((cs) => {
      setCountries(cs);
      if (cs.length && !cs.some((c) => c.slug === countrySlug)) setCountrySlug(cs[0].slug);
    });
    api<ProgressLog[]>("/progress/me").then(setProgress);
    api<Booking[]>("/bookings/me").then(setBookings);
    loadFavorites();
  }, []);

  async function toggleFavorite(providerId: string) {
    const isFav = favorites.some((f) => f.id === providerId);
    try {
      if (isFav) await api(`/favorites/${providerId}`, { method: "DELETE" });
      else await api(`/favorites/${providerId}`, { method: "POST" });
      loadFavorites();
    } catch {
      /* non-critical */
    }
  }

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

  return (
    <div className="container">
      <h1 className="page-title">{t("profile.title")}</h1>
      <p className="page-subtitle">{t("profile.subtitle")}</p>

      <div className="section">
        <label className="muted" style={{ display: "block", marginBottom: "0.3rem" }}>{t("profile.market")}</label>
        <select value={countrySlug} onChange={(e) => setCountrySlug(e.target.value)} style={{ width: "100%" }}>
          {countries.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="balance-chip section">
        <span className="num">{balance?.balance ?? "…"}</span>
        <span>{t("profile.creditsAvailable")}{balance ? ` (${balance.currency})` : ""}</span>
      </div>

      <div className="section">
        <h2>{t("profile.buyCredits")}</h2>
        {message && <div className={message.includes("failed") || message.includes("error") ? "error-banner" : "success-banner"} style={{ marginBottom: "0.75rem" }}>{message}</div>}
        <div className="card">
          {packs.length === 0 && <p className="empty-state">{t("profile.noPacks")}</p>}
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
      </div>

      <MyWellnessPanel bookings={bookings} progress={progress} />

      <div className="section">
        <h2>Favourite professionals</h2>
        {favorites.length === 0 && <p className="empty-state">No favourites yet — tap the heart on a provider card in Explore to save them here.</p>}
        {favorites.length > 0 && (
          <div className="grid grid-cards">
            {favorites.map((p) => (
              <ProviderCard key={p.id} provider={p} isFavorite onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h2>{t("profile.progressTitle")}</h2>
        <div className="card">
          {progress.length === 0 && <p className="empty-state">{t("profile.noProgress")}</p>}
          {progress.map((p) => (
            <div key={p.id} className="progress-row">
              <strong>{p.booking?.service.title}</strong> — {p.provider?.user.name}
              <div className="muted">{new Date(p.createdAt).toLocaleDateString()}</div>
              <p style={{ margin: "0.4rem 0" }}>{p.goalProgressSummary}</p>
              <p className="muted" style={{ margin: 0 }}>{p.sessionNotes}</p>
              {p.recommendedNextSessions != null && (
                <p className="muted" style={{ marginTop: "0.4rem" }}>
                  {t("profile.recommended")}: {p.recommendedNextSessions} more sessions — {p.recommendationRationale}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
