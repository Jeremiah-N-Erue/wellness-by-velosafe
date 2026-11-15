import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Booking, Country, ServiceCategory } from "../lib/types";

export default function ProviderDashboardPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [profileForm, setProfileForm] = useState({
    categorySlug: "pt",
    countrySlug: "vietnam",
    city: "Ho Chi Minh City",
    headline: "",
    bio: "",
    yearsExperience: 0,
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [serviceForm, setServiceForm] = useState({ title: "", description: "", durationMins: 60, creditCost: 1 });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [logDrafts, setLogDrafts] = useState<Record<string, { sessionNotes: string; goalProgressSummary: string; recommendedNextSessions: string; recommendationRationale: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalBookings: number; completedSessions: number; creditsEarned: number; completionRate: number; cancelledOrNoShow: number } | null>(null);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [trustScore, setTrustScore] = useState(0);

  useEffect(() => {
    api<ServiceCategory[]>("/categories").then(setCategories).catch(() => {});
    api<Country[]>("/countries").then(setCountries).catch(() => {});
    loadBookings();
    api<{ profile: any; stats: typeof stats }>("/providers/me")
      .then(({ profile, stats: s }) => {
        setProfileForm({
          categorySlug: profile.category.slug,
          countrySlug: profile.country.slug,
          city: profile.city,
          headline: profile.headline,
          bio: profile.bio,
          yearsExperience: profile.yearsExperience,
        });
        setProfileSaved(true);
        setRatingAvg(profile.ratingAvg);
        setRatingCount(profile.ratingCount);
        setTrustScore(profile.trustScore);
        setStats(s);
      })
      .catch(() => {
        // No profile yet — leave the create form at its defaults.
      });
  }, []);

  function loadBookings() {
    api<Booking[]>("/bookings/me").then(setBookings);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/providers/me", { method: "POST", body: profileForm });
      setProfileSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
    }
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/providers/me/services", { method: "POST", body: serviceForm });
      setNotice(`Added "${serviceForm.title}" to your services.`);
      setServiceForm({ title: "", description: "", durationMins: 60, creditCost: 1 });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add service — save your profile first");
    }
  }

  function updateDraft(
    bookingId: string,
    field: "sessionNotes" | "goalProgressSummary" | "recommendedNextSessions" | "recommendationRationale",
    value: string
  ) {
    setLogDrafts((prev) => {
      const existing = prev[bookingId] ?? {
        sessionNotes: "",
        goalProgressSummary: "",
        recommendedNextSessions: "",
        recommendationRationale: "",
      };
      return { ...prev, [bookingId]: { ...existing, [field]: value } };
    });
  }

  async function submitProgress(bookingId: string) {
    const draft = logDrafts[bookingId];
    if (!draft?.sessionNotes || !draft?.goalProgressSummary) {
      setError("Session notes and a goal-progress summary are required.");
      return;
    }
    setError(null);
    try {
      await api("/progress", {
        method: "POST",
        body: {
          bookingId,
          sessionNotes: draft.sessionNotes,
          goalProgressSummary: draft.goalProgressSummary,
          recommendedNextSessions: draft.recommendedNextSessions ? Number(draft.recommendedNextSessions) : undefined,
          recommendationRationale: draft.recommendationRationale || undefined,
        },
      });
      setNotice("Progress logged — the client can now see it, and this booking is marked completed.");
      loadBookings();
      api<{ profile: any; stats: typeof stats }>("/providers/me").then(({ stats: s, profile }) => {
        setStats(s);
        setTrustScore(profile.trustScore);
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log progress");
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">Provider Console</h1>
      <p className="page-subtitle">Set up your profile, list services, and log verified progress after each session.</p>

      {error && <div className="error-banner section">{error}</div>}
      {notice && <div className="success-banner section">{notice}</div>}

      {stats && (
        <div className="section">
          <h2>Performance overview</h2>
          <div className="stat-tile-row">
            <div className="stat-tile"><strong>{stats.completedSessions}</strong><span>Completed sessions</span></div>
            <div className="stat-tile"><strong>{stats.creditsEarned}</strong><span>Credits earned</span></div>
            <div className="stat-tile"><strong>{stats.completionRate}%</strong><span>Completion rate</span></div>
            <div className="stat-tile"><strong>★ {trustScore.toFixed(1)}</strong><span>Trust score</span></div>
            <div className="stat-tile">
              <strong>{ratingCount > 0 ? `★ ${ratingAvg.toFixed(1)}` : "—"}</strong>
              <span>{ratingCount > 0 ? `${ratingCount} customer review${ratingCount > 1 ? "s" : ""}` : "No reviews yet"}</span>
            </div>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.5rem" }}>
            "Credits earned" is credits charged across your completed sessions — there's no real payout
            integration yet (see docs/architecture.md on Paystack/Flutterwave as the likely next step).
          </p>
        </div>
      )}

      <div className="two-col">
        <div>
          <div className="section">
            <h2>Your upcoming & recent sessions</h2>
            <div className="card">
              {bookings.length === 0 && <p className="empty-state">No bookings yet.</p>}
              {bookings.map((b) => (
                <div key={b.id} className="booking-row">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <strong>{b.service.title}</strong> with {b.client?.name}
                      <div className="muted">{new Date(b.scheduledAt).toLocaleString()}</div>
                      {b.goalText && <div className="muted">Stated goal: {b.goalText}</div>}
                    </div>
                    <span className={`status-pill status-${b.status}`}>{b.status}</span>
                  </div>

                  {b.status === "CONFIRMED" && !b.progressLog && (
                    <div className="form" style={{ marginTop: "0.75rem", maxWidth: "100%" }}>
                      <div>
                        <label>Session notes</label>
                        <textarea
                          rows={2}
                          value={logDrafts[b.id]?.sessionNotes || ""}
                          onChange={(e) => updateDraft(b.id, "sessionNotes", e.target.value)}
                        />
                      </div>
                      <div>
                        <label>Goal progress summary (client-visible)</label>
                        <textarea
                          rows={2}
                          value={logDrafts[b.id]?.goalProgressSummary || ""}
                          onChange={(e) => updateDraft(b.id, "goalProgressSummary", e.target.value)}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <div style={{ flex: 1 }}>
                          <label>Recommended next sessions</label>
                          <input
                            type="number"
                            min={0}
                            value={logDrafts[b.id]?.recommendedNextSessions || ""}
                            onChange={(e) => updateDraft(b.id, "recommendedNextSessions", e.target.value)}
                          />
                        </div>
                        <div style={{ flex: 2 }}>
                          <label>Rationale (shown to client — never a black box)</label>
                          <input
                            value={logDrafts[b.id]?.recommendationRationale || ""}
                            onChange={(e) => updateDraft(b.id, "recommendationRationale", e.target.value)}
                          />
                        </div>
                      </div>
                      <button className="btn btn-primary" onClick={() => submitProgress(b.id)}>Log progress & complete session</button>
                    </div>
                  )}
                  {b.progressLog && <p className="muted" style={{ marginTop: "0.5rem" }}>Progress already logged for this session.</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="section">
            <h2>Profile</h2>
            <form className="form card" onSubmit={saveProfile}>
              <div>
                <label>Market</label>
                <select
                  value={profileForm.countrySlug}
                  onChange={(e) => setProfileForm({ ...profileForm, countrySlug: e.target.value })}
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Category</label>
                <select
                  value={profileForm.categorySlug}
                  onChange={(e) => setProfileForm({ ...profileForm, categorySlug: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>City</label>
                <input value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} required />
              </div>
              <div>
                <label>Headline</label>
                <input value={profileForm.headline} onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })} required />
              </div>
              <div>
                <label>Bio</label>
                <textarea rows={3} value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} required />
              </div>
              <div>
                <label>Years of experience</label>
                <input
                  type="number"
                  min={0}
                  value={profileForm.yearsExperience}
                  onChange={(e) => setProfileForm({ ...profileForm, yearsExperience: Number(e.target.value) })}
                />
              </div>
              <button className="btn btn-primary" type="submit">{profileSaved ? "Update profile" : "Create profile"}</button>
            </form>
            <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.4rem" }}>
              Tier 1 verification (ID + certification + reference check) is confirmed by an admin — it's not
              self-service, by design.
            </p>
          </div>

          <div className="section">
            <h2>Add a service</h2>
            <form className="form card" onSubmit={addService}>
              <div>
                <label>Title</label>
                <input value={serviceForm.title} onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })} required />
              </div>
              <div>
                <label>Description</label>
                <textarea rows={2} value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} required />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <label>Duration (mins)</label>
                  <input type="number" min={15} value={serviceForm.durationMins} onChange={(e) => setServiceForm({ ...serviceForm, durationMins: Number(e.target.value) })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Credit cost</label>
                  <input type="number" min={1} value={serviceForm.creditCost} onChange={(e) => setServiceForm({ ...serviceForm, creditCost: Number(e.target.value) })} />
                </div>
              </div>
              <button className="btn btn-gold" type="submit">Add service</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
