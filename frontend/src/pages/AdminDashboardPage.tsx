import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { ProviderProfile } from "../lib/types";

type Draft = {
  idDocumentVerified: boolean;
  certificationVerified: boolean;
  referenceContactName: string;
  referenceContactPhone: string;
  referenceContactStatus: "PENDING" | "CONTACTED" | "CONFIRMED" | "FAILED";
  notes: string;
};

function draftFrom(p: ProviderProfile): Draft {
  const r = p.verificationRecord;
  return {
    idDocumentVerified: r?.idDocumentVerified ?? false,
    certificationVerified: r?.certificationVerified ?? false,
    referenceContactName: r?.referenceContactName ?? "",
    referenceContactPhone: r?.referenceContactPhone ?? "",
    referenceContactStatus: r?.referenceContactStatus ?? "PENDING",
    notes: r?.notes ?? "",
  };
}

interface StatsOverview {
  totalClients: number;
  totalProviders: number;
  totalBookings: number;
  completedBookings: number;
  pendingVerifications: number;
  verifiedProviders: number;
  activeCategories: number;
  activeCountries: number;
}

export default function AdminDashboardPage() {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsOverview | null>(null);

  useEffect(() => {
    load();
    api<StatsOverview>("/providers/stats/overview").then(setStats).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    api<ProviderProfile[]>("/providers")
      .then((list) => {
        setProviders(list);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const p of list) {
            if (!next[p.id]) next[p.id] = draftFrom(p);
          }
          return next;
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load providers"))
      .finally(() => setLoading(false));
  }

  function updateDraft(id: string, field: keyof Draft, value: string | boolean) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function saveChecklist(p: ProviderProfile) {
    const draft = drafts[p.id];
    setError(null);
    setNotice(null);
    setSavingId(p.id);
    try {
      await api(`/providers/${p.id}/verification`, {
        method: "PATCH",
        body: {
          idDocumentVerified: draft.idDocumentVerified,
          certificationVerified: draft.certificationVerified,
          referenceContactName: draft.referenceContactName || undefined,
          referenceContactPhone: draft.referenceContactPhone || undefined,
          referenceContactStatus: draft.referenceContactStatus,
          notes: draft.notes || undefined,
        },
      });
      setNotice(`Checklist saved for ${p.user.name}.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save checklist");
    } finally {
      setSavingId(null);
    }
  }

  async function markSigned(p: ProviderProfile, field: "codeOfConductSignedAt" | "waiverSignedAt") {
    setError(null);
    setNotice(null);
    setSavingId(p.id);
    try {
      await api(`/providers/${p.id}/verification`, {
        method: "PATCH",
        body: { [field]: new Date().toISOString() },
      });
      setNotice(`Marked ${field === "codeOfConductSignedAt" ? "code of conduct" : "waiver"} as signed for ${p.user.name}.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update");
    } finally {
      setSavingId(null);
    }
  }

  const pending = providers.filter((p) => p.verificationTier === "NONE");
  const verified = providers.filter((p) => p.verificationTier !== "NONE");

  return (
    <div className="container">
      <h1 className="page-title">Admin Console</h1>
      <p className="page-subtitle">
        Confirm Tier 1 baseline verification (ID + certification + reference + signed waiver/code of
        conduct) before a provider shows as verified on Discover. Tiers 2 and 3 aren't built yet.
      </p>

      {error && <div className="error-banner section">{error}</div>}
      {notice && <div className="success-banner section">{notice}</div>}

      {stats && (
        <div className="section">
          <h2>Marketplace overview</h2>
          <div className="stat-tile-row">
            <div className="stat-tile"><strong>{stats.totalClients}</strong><span>Clients</span></div>
            <div className="stat-tile"><strong>{stats.totalProviders}</strong><span>Providers</span></div>
            <div className="stat-tile"><strong>{stats.verifiedProviders}</strong><span>Verified providers</span></div>
            <div className="stat-tile"><strong>{stats.totalBookings}</strong><span>Total bookings</span></div>
            <div className="stat-tile"><strong>{stats.completedBookings}</strong><span>Completed sessions</span></div>
            <div className="stat-tile"><strong>{stats.activeCategories}</strong><span>Active categories</span></div>
            <div className="stat-tile"><strong>{stats.activeCountries}</strong><span>Active markets</span></div>
          </div>
        </div>
      )}

      {loading && <p className="muted">Loading providers…</p>}

      {!loading && (
        <div className="section">
          <h2>Pending Tier 1 verification ({pending.length})</h2>
          {pending.length === 0 && <p className="empty-state">Nothing waiting on review.</p>}
          {pending.map((p) => {
            const draft = drafts[p.id];
            const r = p.verificationRecord;
            if (!draft) return null;
            return (
              <div key={p.id} className="card section">
                <div className="top-row">
                  <div>
                    <strong>{p.user.name}</strong>
                    <div className="muted">{p.headline} · {p.category.name} · {p.country?.name} · {p.city}</div>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>{p.user.email}</div>
                  </div>
                  <span className="badge badge-unverified">Not yet verified</span>
                </div>

                <div className="form" style={{ marginTop: "0.75rem" }}>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={draft.idDocumentVerified}
                        onChange={(e) => updateDraft(p.id, "idDocumentVerified", e.target.checked)}
                      />
                      ID document verified
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="checkbox"
                        checked={draft.certificationVerified}
                        onChange={(e) => updateDraft(p.id, "certificationVerified", e.target.checked)}
                      />
                      Certification verified
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <label>Reference contact name</label>
                      <input
                        value={draft.referenceContactName}
                        onChange={(e) => updateDraft(p.id, "referenceContactName", e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <label>Reference contact phone</label>
                      <input
                        value={draft.referenceContactPhone}
                        onChange={(e) => updateDraft(p.id, "referenceContactPhone", e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <label>Reference status</label>
                      <select
                        value={draft.referenceContactStatus}
                        onChange={(e) => updateDraft(p.id, "referenceContactStatus", e.target.value)}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="FAILED">Failed</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                    {r?.codeOfConductSignedAt ? (
                      <span className="muted">✓ Code of conduct signed {new Date(r.codeOfConductSignedAt).toLocaleDateString()}</span>
                    ) : (
                      <button type="button" className="btn btn-ghost" onClick={() => markSigned(p, "codeOfConductSignedAt")} disabled={savingId === p.id}>
                        Mark code of conduct signed
                      </button>
                    )}
                    {r?.waiverSignedAt ? (
                      <span className="muted">✓ Waiver signed {new Date(r.waiverSignedAt).toLocaleDateString()}</span>
                    ) : (
                      <button type="button" className="btn btn-ghost" onClick={() => markSigned(p, "waiverSignedAt")} disabled={savingId === p.id}>
                        Mark waiver signed
                      </button>
                    )}
                  </div>

                  <div>
                    <label>Internal notes</label>
                    <textarea rows={2} value={draft.notes} onChange={(e) => updateDraft(p.id, "notes", e.target.value)} />
                  </div>

                  <button className="btn btn-primary" onClick={() => saveChecklist(p)} disabled={savingId === p.id}>
                    {savingId === p.id ? "Saving…" : "Save checklist"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && (
        <div className="section">
          <h2>Verified providers ({verified.length})</h2>
          {verified.length === 0 && <p className="empty-state">None yet.</p>}
          <div className="grid grid-cards">
            {verified.map((p) => (
              <div key={p.id} className="card">
                <div className="top-row">
                  <div>
                    <strong>{p.user.name}</strong>
                    <div className="muted">{p.headline}</div>
                  </div>
                  <span className="trust-score">★ {p.trustScore.toFixed(1)}</span>
                </div>
                <span className="badge badge-verified">
                  ✓ Verified ({p.verificationTier.replace("TIER_", "T").replace("_", " ")})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
