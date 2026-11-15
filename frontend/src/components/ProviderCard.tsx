import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ProviderProfile } from "../lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface Props {
  provider: ProviderProfile;
  isFavorite?: boolean;
  onToggleFavorite?: (providerId: string) => void;
}

// Shared across Discover and Home (featured professionals). Avatar is an initials disc
// until a provider sets a real avatarUrl. Rating shown is the real customer review average
// (ratingAvg/ratingCount) — distinct from trustScore, which is the platform/verification score.
export default function ProviderCard({ provider: p, isFavorite, onToggleFavorite }: Props) {
  const { t } = useTranslation();
  return (
    <div className="card provider-card" style={{ position: "relative" }}>
      {onToggleFavorite && (
        <button
          type="button"
          className={`favorite-btn ${isFavorite ? "is-favorite" : ""}`}
          aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(p.id);
          }}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      )}
      <Link to={`/providers/${p.id}`} className="provider-card-link">
        <div className="top-row">
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <div className="avatar-disc" aria-hidden="true">
              {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : initials(p.user.name)}
            </div>
            <div>
              <strong>{p.user.name}</strong>
              <div className="muted">{p.headline}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {p.ratingCount > 0 ? (
            <span className="trust-score">★ {p.ratingAvg.toFixed(1)} <span className="muted" style={{ fontWeight: 400 }}>({p.ratingCount})</span></span>
          ) : (
            <span className="muted" style={{ fontSize: "0.8rem" }}>{t("discover.noReviewsYet")}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <span className="badge badge-category">{p.category.name}</span>
          <span className="badge badge-category">{p.country?.name}</span>
          {p.verificationTier !== "NONE" ? (
            <span className="badge badge-verified">✓ {t("discover.verified")} ({p.verificationTier.replace("TIER_", "T").replace("_", " ")})</span>
          ) : (
            <span className="badge badge-unverified">{t("discover.notVerified")}</span>
          )}
        </div>
        <p className="muted" style={{ margin: 0 }}>{p.bio.slice(0, 120)}{p.bio.length > 120 ? "…" : ""}</p>
        <div className="muted">{p.yearsExperience} {t("discover.yrsExperience")} · {p.sessionCount} {t("discover.sessionsCompleted")} · {p.city}</div>
      </Link>
    </div>
  );
}
