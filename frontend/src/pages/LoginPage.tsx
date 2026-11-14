import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("client@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "PROVIDER" ? "/provider" : "/discover");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1 className="page-title">{t("login.title")}</h1>
      <p className="page-subtitle">
        Seed accounts: <code>client@example.com</code>, <code>mai.tran@example.com</code> (VN provider),{" "}
        <code>chioma.okafor@example.com</code> (NG provider), <code>admin@wellnessbyvelosafe.app</code> — password{" "}
        <code>password123</code>
      </p>
      {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}
      <form className="form" onSubmit={onSubmit}>
        <div>
          <label>{t("login.email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>{t("login.password")}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary" disabled={submitting} type="submit">
          {submitting ? t("login.submitting") : t("login.submit")}
        </button>
      </form>
      <p className="muted" style={{ marginTop: "1rem" }}>
        {t("login.noAccount")} <Link to="/register">{t("login.signUp")}</Link>
      </p>
    </div>
  );
}
