import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Wellness Shop — intentionally an honest "coming soon" page, not a real catalog/cart yet.
// Same pattern as the other not-yet-built verticals in this MVP (tours-experiences,
// relocation-visa): the tile and the intent are real, the storefront isn't built yet.
export default function ShopPage() {
  const { t } = useTranslation();

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <img src="/categories/wellness-shop.jpg" alt="" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
        <div style={{ padding: "1.5rem" }}>
          <h1 className="page-title" style={{ marginBottom: "0.2rem" }}>{t("shop.title")}</h1>
          <p className="page-subtitle" style={{ marginBottom: "1rem" }}>{t("shop.subtitle")}</p>
          <p style={{ color: "var(--grey)", lineHeight: 1.6 }}>{t("shop.body")}</p>
          <Link to="/discover" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
            {t("shop.cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
