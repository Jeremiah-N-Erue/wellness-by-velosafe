import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import type { Country, ProviderProfile, ServiceCategory } from "../lib/types";
import { CATEGORY_TILES } from "../lib/categoryTiles";
import ProviderCard from "../components/ProviderCard";
import WellnessAIWidget from "../components/WellnessAIWidget";

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    api<ProviderProfile[]>("/providers").then(setProviders).catch(() => {});
    api<ServiceCategory[]>("/categories").then(setCategories).catch(() => {});
    api<Country[]>("/countries").then(setCountries).catch(() => {});
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
  }

  const featured = [...providers].sort((a, b) => b.trustScore - a.trustScore).slice(0, 3);

  return (
    <div>
      <section className="hero">
        <div className="container hero-inner">
          <span className="eyebrow eyebrow-light">{t("home.eyebrow")}</span>
          <h1 className="hero-title">{t("home.heroTitle")}</h1>
          <p className="hero-subtitle">{t("home.heroSubtitle")}</p>

          <form className="hero-search" onSubmit={handleSearch}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("home.searchPlaceholder")}
              aria-label={t("home.searchPlaceholder")}
            />
            <button className="btn btn-gold" type="submit">{t("home.searchCta")}</button>
          </form>

          <div className="hero-ctas">
            <Link to="/discover" className="btn btn-gold">{t("home.findCoach")}</Link>
            <Link to="/register" className="btn btn-ghost-light">{t("home.joinAsProvider")}</Link>
          </div>

          <div className="hero-stats">
            <div className="stat-chip">
              <strong>{providers.length || "—"}</strong>
              <span>{t("home.statProviders")}</span>
            </div>
            <div className="stat-chip">
              <strong>{categories.filter((c) => c.isActive !== false).length || 5}</strong>
              <span>{t("home.statCategories")}</span>
            </div>
            <div className="stat-chip">
              <strong>{countries.length || "—"}</strong>
              <span>{t("home.statMarkets")}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="section">
          <span className="section-eyebrow">Ask VeloSafe Wellness AI</span>
          <h2 className="section-title">Not sure where to start?</h2>
          <div style={{ marginTop: "1rem" }}>
            <WellnessAIWidget />
          </div>
        </div>

        <div className="section">
          <span className="section-eyebrow">{t("home.categoriesEyebrow")}</span>
          <h2 className="section-title">{t("home.categoriesTitle")}</h2>
          <div className="category-grid" style={{ marginTop: "1rem" }}>
            {CATEGORY_TILES.map((tile) =>
              tile.isShop ? (
                <Link key={tile.slug} to="/shop" className="category-tile">
                  <img src={tile.photo} alt="" />
                  <span className="category-tile-label">{t("nav.shop")}</span>
                </Link>
              ) : (
                <Link key={tile.slug} to={`/discover?category=${tile.slug}`} className="category-tile">
                  <img src={tile.photo} alt="" />
                  <span className="category-tile-label">
                    {categories.find((c) => c.slug === tile.slug)?.name ?? tile.fallbackName}
                  </span>
                </Link>
              )
            )}
          </div>
        </div>

        {featured.length > 0 && (
          <div className="section">
            <span className="section-eyebrow">{t("home.featuredEyebrow")}</span>
            <h2 className="section-title">{t("home.featuredTitle")}</h2>
            <div className="grid grid-cards" style={{ marginTop: "1rem" }}>
              {featured.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          </div>
        )}

        <div className="section">
          <span className="section-eyebrow">{t("home.whyEyebrow")}</span>
          <h2 className="section-title">{t("home.whyTitle")}</h2>
          <div className="grid grid-cards" style={{ marginTop: "1rem" }}>
            <div className="card feature-card">
              <div className="feature-icon">✓</div>
              <strong>{t("home.feature1Title")}</strong>
              <p className="muted">{t("home.feature1Body")}</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">◇</div>
              <strong>{t("home.feature2Title")}</strong>
              <p className="muted">{t("home.feature2Body")}</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">↗</div>
              <strong>{t("home.feature3Title")}</strong>
              <p className="muted">{t("home.feature3Body")}</p>
            </div>
          </div>
        </div>

        <div className="card cta-band section">
          <div>
            <h2 style={{ margin: "0 0 0.3rem", color: "white" }}>{t("home.providerCtaTitle")}</h2>
            <p style={{ margin: 0, color: "var(--sage-light)" }}>{t("home.providerCtaBody")}</p>
          </div>
          <Link to="/register" className="btn btn-gold">{t("home.providerCtaButton")}</Link>
        </div>
      </div>
    </div>
  );
}
