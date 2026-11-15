import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Booking, ProviderProfile, Review, Service } from "../lib/types";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProviderProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewableBooking, setReviewableBooking] = useState<Booking | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [goalText, setGoalText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<ProviderProfile>(`/providers/${id}`).then(setProvider);
    api<Review[]>(`/reviews/provider/${id}`).then(setReviews);
  }, [id]);

  useEffect(() => {
    if (!id || user?.role !== "CLIENT") return;
    api<ProviderProfile[]>("/favorites/me").then((favs) => setIsFavorite(favs.some((f) => f.id === id))).catch(() => {});
    Promise.all([api<Booking[]>("/bookings/me"), api<Review[]>("/reviews/me")]).then(([bookings, myReviews]) => {
      const reviewedBookingIds = new Set(myReviews.map((r) => r.bookingId));
      const candidate = bookings.find(
        (b) => b.status === "COMPLETED" && b.providerId === id && !reviewedBookingIds.has(b.id)
      );
      setReviewableBooking(candidate ?? null);
    }).catch(() => {});
  }, [id, user?.role]);

  async function toggleFavorite() {
    if (!id) return;
    try {
      if (isFavorite) {
        await api(`/favorites/${id}`, { method: "DELETE" });
      } else {
        await api(`/favorites/${id}`, { method: "POST" });
      }
      setIsFavorite(!isFavorite);
    } catch {
      /* non-critical */
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewableBooking) return;
    setReviewMsg(null);
    try {
      await api("/reviews", {
        method: "POST",
        body: { bookingId: reviewableBooking.id, rating: reviewRating, comment: reviewComment || undefined },
      });
      setReviewMsg(t("discover.reviewSubmitted"));
      setReviewableBooking(null);
      if (id) api<Review[]>(`/reviews/provider/${id}`).then(setReviews);
      if (id) api<ProviderProfile>(`/providers/${id}`).then(setProvider);
    } catch (err) {
      setReviewMsg(err instanceof ApiError ? err.message : "Could not submit review");
    }
  }

  async function bookSession(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedService || !scheduledAt) return;
    setError(null);
    setSuccess(null);
    setBooking(true);
    try {
      await api("/bookings", {
        method: "POST",
        body: { serviceId: selectedService.id, scheduledAt: new Date(scheduledAt).toISOString(), goalText },
      });
      setSuccess("Booked! Check My Dashboard for details — your provider's messages are now unlocked too.");
      setSelectedService(null);
      setGoalText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete booking");
    } finally {
      setBooking(false);
    }
  }

  async function startConversation() {
    if (!provider) return;
    const convo = await api<{ id: string }>("/messages/conversations", {
      method: "POST",
      body: { providerId: provider.id },
    });
    navigate(`/messages?open=${convo.id}`);
  }

  if (!provider) return <div className="container"><p className="muted">Loading…</p></div>;

  return (
    <div className="container">
      <div className="two-col">
        <div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div className="avatar-disc" style={{ width: 56, height: 56, fontSize: "1.1rem" }} aria-hidden="true">
              {provider.avatarUrl ? <img src={provider.avatarUrl} alt="" /> : initials(provider.user.name)}
            </div>
            <div style={{ flex: 1 }}>
              <h1 className="page-title" style={{ marginBottom: "0.15rem" }}>{provider.user.name}</h1>
              <p className="page-subtitle" style={{ marginBottom: "0.4rem" }}>{provider.headline} · {provider.city}</p>
            </div>
            {user?.role === "CLIENT" && (
              <button type="button" className="btn btn-ghost" onClick={toggleFavorite}>
                {isFavorite ? `♥ ${t("discover.removeFavorite")}` : `♡ ${t("discover.addFavorite")}`}
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
            <span className="badge badge-category">{provider.category.name}</span>
            <span className="badge badge-category">{provider.country.name}</span>
            {provider.verificationTier !== "NONE" ? (
              <span className="badge badge-verified">✓ Tier 1 verified</span>
            ) : (
              <span className="badge badge-unverified">Not yet verified</span>
            )}
            {provider.ratingCount > 0 ? (
              <span className="trust-score">★ {provider.ratingAvg.toFixed(1)} ({provider.ratingCount})</span>
            ) : (
              <span className="muted">{t("discover.noReviewsYet")}</span>
            )}
            <span className="muted">{provider.sessionCount} sessions</span>
          </div>

          <div className="card section">
            <p>{provider.bio}</p>
            {provider.verificationRecord && (
              <div className="muted" style={{ marginTop: "0.75rem", fontSize: "0.82rem" }}>
                ID verified: {provider.verificationRecord.idDocumentVerified ? "yes" : "pending"} · Certification
                verified: {provider.verificationRecord.certificationVerified ? "yes" : "pending"} · Reference check:{" "}
                {provider.verificationRecord.referenceContactStatus.toLowerCase()}
              </div>
            )}
          </div>

          <div className="section">
            <h2>Services</h2>
            <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
              {provider.services.map((s) => (
                <div key={s.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{s.title}</strong>
                    <div className="muted">{s.description}</div>
                    <div className="muted">{s.durationMins} mins · {s.creditCost} credit{s.creditCost > 1 ? "s" : ""}</div>
                  </div>
                  {user?.role === "CLIENT" && (
                    <button className="btn btn-gold" onClick={() => setSelectedService(s)}>Book</button>
                  )}
                </div>
              ))}
              {provider.services.length === 0 && <p className="empty-state">No services listed yet.</p>}
            </div>
          </div>

          <div className="section">
            <h2>{t("discover.reviews")} ({reviews.length})</h2>
            <div className="card">
              {reviews.length === 0 && <p className="empty-state">{t("discover.noReviewsYet")}</p>}
              {reviews.map((r) => (
                <div key={r.id} className="booking-row">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{r.client.name}</strong>
                    <span className="trust-score">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  </div>
                  {r.comment && <p className="muted" style={{ margin: "0.3rem 0 0" }}>{r.comment}</p>}
                  <div className="muted" style={{ fontSize: "0.76rem" }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>

            {reviewableBooking && (
              <form className="form card" style={{ marginTop: "0.75rem" }} onSubmit={submitReview}>
                <strong>{t("discover.writeReview")}</strong>
                {reviewMsg && <div className="success-banner">{reviewMsg}</div>}
                <div>
                  <label>{t("discover.yourRating")}</label>
                  <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>{t("discover.yourComment")}</label>
                  <textarea rows={2} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                </div>
                <button className="btn btn-primary" type="submit">{t("discover.submitReview")}</button>
              </form>
            )}
          </div>
        </div>

        <div className="card">
          {!user && <p className="muted">Log in as a client to book a session or message this provider.</p>}
          {user?.role === "CLIENT" && (
            <>
              <button className="btn btn-primary" style={{ width: "100%", marginBottom: "0.75rem" }} onClick={startConversation}>
                Message {provider.user.name.split(" ")[0]}
              </button>
              <p className="muted" style={{ fontSize: "0.78rem" }}>
                Messages are text-only and contact details are hidden until you have a confirmed booking.
              </p>
            </>
          )}

          {selectedService && (
            <form className="form" onSubmit={bookSession} style={{ marginTop: "1rem" }}>
              <strong>Book: {selectedService.title}</strong>
              {error && <div className="error-banner">{error}</div>}
              {success && <div className="success-banner">{success}</div>}
              <div>
                <label>Date & time</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
              </div>
              <div>
                <label>What's your goal for this session? (optional)</label>
                <textarea rows={3} value={goalText} onChange={(e) => setGoalText(e.target.value)} />
              </div>
              <button className="btn btn-gold" type="submit" disabled={booking}>
                {booking ? "Booking…" : `Confirm — ${selectedService.creditCost} credit${selectedService.creditCost > 1 ? "s" : ""}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
