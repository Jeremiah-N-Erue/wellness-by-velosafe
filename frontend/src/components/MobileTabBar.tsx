import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Mobile-only bottom tab bar for the CLIENT experience (hidden above the 760px breakpoint
// via CSS — see .mobile-tabbar in index.css). Desktop keeps the existing top navbar as-is;
// Provider Console and Admin Console are unaffected (this bar is rendered only for CLIENT
// users — see Layout.tsx).
const TABS = [
  { to: "/", icon: "🏠", labelKey: "nav.home", end: true },
  { to: "/discover", icon: "🔎", labelKey: "nav.explore" },
  { to: "/booking", icon: "📅", labelKey: "nav.booking" },
  { to: "/shop", icon: "🛍️", labelKey: "nav.shop" },
  { to: "/profile", icon: "👤", labelKey: "nav.profile" },
];

export default function MobileTabBar() {
  const { t } = useTranslation();

  return (
    <nav className="mobile-tabbar" aria-label="Primary">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end}>
          <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
          <span>{t(tab.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
