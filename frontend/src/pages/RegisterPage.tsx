import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CLIENT" as "CLIENT" | "PROVIDER" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register(form);
      navigate(user.role === "PROVIDER" ? "/provider" : "/discover");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1 className="page-title">{t("register.title")}</h1>
      <p className="page-subtitle">{t("register.subtitle")}</p>
      {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}
      <form className="form" onSubmit={onSubmit}>
        <div>
          <label>{t("register.roleLabel")}</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "CLIENT" | "PROVIDER" })}>
            <option value="CLIENT">{t("register.roleClient")}</option>
            <option value="PROVIDER">{t("register.roleProvider")}</option>
          </select>
        </div>
        <div>
          <label>{t("register.name")}</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label>{t("register.email")}</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label>{t("register.password")}</label>
          <input
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <button className="btn btn-primary" disabled={submitting} type="submit">
          {submitting ? t("register.submitting") : t("register.submit")}
        </button>
      </form>
      <p className="muted" style={{ marginTop: "1rem" }}>
        {t("register.haveAccount")} <Link to="/login">{t("register.login")}</Link>
      </p>
    </div>
  );
}
