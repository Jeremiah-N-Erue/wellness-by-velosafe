import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { ProviderProfile, Service } from "../lib/types";

export default function ProviderProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [goalText, setGoalText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (id) api<ProviderProfile>(`/providers/${id}`).then(setProvider);
  }, [id]);

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
          <h1 className="page-title">{provider.user.name}</h1>
          <p className="page-subtitle">{provider.headline} · {provider.city}</p>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span className="badge badge-category">{provider.category.name}</span>
            <span className="badge badge-category">{provider.country.name}</span>
            {provider.verificationTier !== "NONE" ? (
              <span className="badge badge-verified">✓ Tier 1 verified</span>
            ) : (
              <span className="badge badge-unverified">Not yet verified</span>
            )}
            <span className="trust-score">★ {provider.trustScore.toFixed(1)} · {provider.sessionCount} sessions</span>
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
