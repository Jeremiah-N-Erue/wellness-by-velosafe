import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import type { Country, ProviderProfile, ServiceCategory } from "../lib/types";

// The 5 real wellness categories, each with its own photo — plus Wellness Shop, which
// isn't a bookable ServiceCategory (it's a product marketplace, not a session you book),
// so it's a fixed tile here that routes to /shop instead of filtering providers.
const CATEGORY_TILES: Array<{ slug: string; fallbackName: string; photo: string; isShop?: boolean }> = [
  { slug: "pt", fallbackName: "Personal Training", photo: "/categories/pt.jpg" },
  { slug: "yoga-mindfulness", fallbackName: "Yoga & Mindfulness", photo: "/categories/yoga-mindfulness.jpg" },
  { slug: "wellness-coaching", fallbackName: "Wellness Coaching", photo: "/categories/wellness-coaching.jpg" },
  { slug: "fitness-classes", fallbackName: "Fitness Classes", photo: "/categories/fitness-classes.jpg" },
  { slug: "digital-programmes", fallbackName: "Digital Programmes", photo: "/categories/digital-programmes.jpg" },
  { slug: "shop", fallbackName: "Wellness Shop", photo: "/categories/wellness-shop.jpg", isShop: true },
];

export default function DiscoverPage() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [upcomingCountries, setUpcomingCountries] = useState<Country[]>([]);
  const [categorySlug, setCategorySlug] = useState("");
  const [countrySlug, setCountrySlug] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ServiceCategory[]>("/categories").then(setCategories).catch(() => {});
    api<Country[]>("/countries").then(setCountries).catch(() => {});
    api<Country[]>("/countries/upcoming").then(setUpcomingCountries).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categorySlug) params.set("categorySlug", categorySlug);
    if (countrySlug) params.set("countrySlug", countrySlug);
    if (q) params.set("q", q);
    api<ProviderProfile[]>(`/providers?${params.toString()}`)
      .then(setProviders)
      .finally(() => setLoading(false));
  }, [categorySlug, countrySlug, q]);

  function categoryName(slug: string, fallback: string) {
    return categories.find((c) => c.slug === slug)?.name ?? fallback;
  }

  return (
    <div className="container">
      <h1 className="page-title">{t("discover.title")}</h1>
      <p className="page-subtitle">{t("discover.subtitle")}</p>

      <div className="section">
        <h2 style={{ fontSize: "1.1rem", color: "var(--navy-dark)", marginBottom: "0.75rem" }}>{t("discover.browseByCategory")}</h2>
        <div className="category-grid">
          {CATEGORY_TILES.map((tile) =>
            tile.isShop ? (
              <Link key={tile.slug} to="/shop" className="category-tile">
                <img src={tile.photo} alt="" />
                <span className="category-tile-label">{t("nav.shop")}</span>
              </Link>
            ) : (
              <button
                key={tile.slug}
                type="button"
                className={`category-tile ${categorySlug === tile.slug ? "is-active" : ""}`}
                onClick={() => setCategorySlug(categorySlug === tile.slug ? "" : tile.slug)}
              >
                <img src={tile.photo} alt="" />
                <span className="category-tile-label">{categoryName(tile.slug, tile.fallbackName)}</span>
              </button>
            )
          )}
        </div>
      </div>

      <div className="card section" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label className="muted" style={{ display: "block", marginBottom: "0.3rem" }}>{t("discover.market")}</label>
          <select value={countrySlug} onChange={(e) => setCountrySlug(e.target.value)}>
            <option value="">{t("discover.allMarkets")}</option>
            {countries.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
            {upcomingCountries.map((c) => (
              <option key={c.id} value={c.slug} disabled>{c.name} ({t("discover.comingSoon")})</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label className="muted" style={{ display: "block", marginBottom: "0.3rem" }}>{t("discover.category")}</label>
          <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
            <option value="">{t("discover.allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: 220 }}>
          <label className="muted" style={{ display: "block", marginBottom: "0.3rem" }}>{t("discover.search")}</label>
          <input placeholder={t("discover.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading && <p className="muted" style={{ marginTop: "1.5rem" }}>{t("discover.loading")}</p>}
      {!loading && providers.length === 0 && <p className="empty-state">{t("discover.empty")}</p>}

      <div className="grid grid-cards" style={{ marginTop: "1.5rem" }}>
        {providers.map((p) => (
          <Link key={p.id} to={`/providers/${p.id}`} className="card provider-card">
            <div className="top-row">
              <div>
                <strong>{p.user.name}</strong>
                <div className="muted">{p.headline}</div>
              </div>
              <span className="trust-score">★ {p.trustScore.toFixed(1)}</span>
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
        ))}
      </div>
    </div>
  );
}
