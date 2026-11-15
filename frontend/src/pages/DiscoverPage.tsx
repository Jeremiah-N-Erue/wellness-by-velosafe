import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Country, ProviderProfile, ServiceCategory } from "../lib/types";
import { CATEGORY_TILES } from "../lib/categoryTiles";
import ProviderCard from "../components/ProviderCard";

export default function DiscoverPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [upcomingCountries, setUpcomingCountries] = useState<Country[]>([]);
  const [categorySlug, setCategorySlug] = useState(searchParams.get("category") ?? "");
  const [countrySlug, setCountrySlug] = useState("");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ServiceCategory[]>("/categories").then(setCategories).catch(() => {});
    api<Country[]>("/countries").then(setCountries).catch(() => {});
    api<Country[]>("/countries/upcoming").then(setUpcomingCountries).catch(() => {});
    if (user?.role === "CLIENT") {
      api<ProviderProfile[]>("/favorites/me").then((favs) => setFavoriteIds(new Set(favs.map((f) => f.id)))).catch(() => {});
    }
  }, [user?.role]);

  async function toggleFavorite(providerId: string) {
    const isFav = favoriteIds.has(providerId);
    try {
      if (isFav) {
        await api(`/favorites/${providerId}`, { method: "DELETE" });
        setFavoriteIds((prev) => { const next = new Set(prev); next.delete(providerId); return next; });
      } else {
        await api(`/favorites/${providerId}`, { method: "POST" });
        setFavoriteIds((prev) => new Set(prev).add(providerId));
      }
    } catch (err) {
      // non-critical UI affordance — swallow network errors rather than interrupting browsing
      if (!(err instanceof ApiError)) throw err;
    }
  }

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
          <ProviderCard
            key={p.id}
            provider={p}
            isFavorite={favoriteIds.has(p.id)}
            onToggleFavorite={user?.role === "CLIENT" ? toggleFavorite : undefined}
          />
        ))}
      </div>
    </div>
  );
}
