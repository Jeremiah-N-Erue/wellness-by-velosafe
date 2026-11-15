import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import type { Booking } from "../lib/types";

// "Booking" tab: appointments only. Credits/payment/progress live on Profile — see
// ProfilePage.tsx (this used to all be one ClientDashboardPage; split for the mobile
// 5-tab nav so each tab has one clear job).
export default function BookingPage() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    api<Booking[]>("/bookings/me")
      .then(setBookings)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function cancelBooking(id: string) {
    await api(`/bookings/${id}/cancel`, { method: "PATCH" });
    refresh();
  }

  return (
    <div className="container">
      <h1 className="page-title">{t("booking.title")}</h1>
      <p className="page-subtitle">{t("booking.subtitle")}</p>

      <div className="card">
        {loading && <p className="muted">{t("discover.loading")}</p>}
        {!loading && bookings.length === 0 && <p className="empty-state">{t("booking.noBookings")}</p>}
        {bookings.map((b) => (
          <div key={b.id} className="booking-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <strong>{b.service.title}</strong> with {b.provider?.user.name}
              <div className="muted">{new Date(b.scheduledAt).toLocaleString()} · {b.creditsCharged} credit(s)</div>
              {b.goalText && <div className="muted">{t("booking.goal")}: {b.goalText}</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
              <span className={`status-pill status-${b.status}`}>{b.status}</span>
              {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                <button className="btn btn-ghost" style={{ padding: "0.2rem 0.6rem", fontSize: "0.78rem" }} onClick={() => cancelBooking(b.id)}>
                  {t("booking.cancel")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
