import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { SUPPORTED_LANGUAGES } from "../i18n";

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  return (
    <div className="app-shell">
      <header className="navbar">
        <NavLink to="/" className="brand">
          <span className="dot" />
          Wellness by VeloSafe
        </NavLink>
        <nav>
          <NavLink to="/discover">{t("nav.discover")}</NavLink>
          {user?.role === "CLIENT" && <NavLink to="/dashboard">{t("nav.myDashboard")}</NavLink>}
          {user?.role === "PROVIDER" && <NavLink to="/provider">{t("nav.providerConsole")}</NavLink>}
          {user && <NavLink to="/messages">{t("nav.messages")}</NavLink>}

          <select
            aria-label="Language"
            value={i18n.language?.split("-")[0] || "en"}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "none", borderRadius: 6, padding: "0.25rem 0.4rem", fontSize: "0.82rem" }}
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} style={{ color: "#1c1c1c" }}>{l.label}</option>
            ))}
          </select>

          {user ? (
            <>
              <span className="pill">{user.name} · {user.role}</span>
              <button className="btn btn-ghost" style={{ padding: "0.35rem 0.8rem", borderColor: "rgba(255,255,255,0.3)", color: "white" }} onClick={logout}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">{t("nav.login")}</NavLink>
              <NavLink to="/register" className="pill">{t("nav.signup")}</NavLink>
            </>
          )}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
