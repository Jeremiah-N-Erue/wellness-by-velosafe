import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="container">
      <div className="card" style={{ background: "linear-gradient(135deg, #1f3a5f, #152840)", color: "white", padding: "2.5rem" }}>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>{t("home.heroTitle")}</h1>
        <p style={{ color: "#d9e2ee", maxWidth: 560 }}>{t("home.heroSubtitle")}</p>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
          <Link to="/discover" className="btn btn-gold">{t("home.browseProviders")}</Link>
          <Link to="/register" className="btn btn-ghost" style={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }}>
            {t("home.joinAsProvider")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cards section" style={{ marginTop: "2rem" }}>
        <div className="card">
          <strong>{t("home.feature1Title")}</strong>
          <p className="muted">{t("home.feature1Body")}</p>
        </div>
        <div className="card">
          <strong>{t("home.feature2Title")}</strong>
          <p className="muted">{t("home.feature2Body")}</p>
        </div>
        <div className="card">
          <strong>{t("home.feature3Title")}</strong>
          <p className="muted">{t("home.feature3Body")}</p>
        </div>
      </div>
    </div>
  );
}
