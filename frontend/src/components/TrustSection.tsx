import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProviderProfile } from "../lib/types";
import { CATEGORY_TILES } from "../lib/categoryTiles";
import { useCountUp } from "../lib/useCountUp";
import FadeIn from "./FadeIn";

/**
 * Task 5 — Trust & Social Proof. Stats are real, derived from the same /providers
 * payload the hero uses (sessionCount + ratingCount are already on ProviderProfile).
 * Testimonials have no backing data source yet (no public cross-provider review feed),
 * so they're clearly labelled as examples rather than presented as real client quotes —
 * per the "real numbers, clearly-marked example quotes" direction. "Before/after" from
 * the brief is likewise adapted to real category photography rather than fabricated
 * transformation photos.
 */

function StatBlock({ value, label, isLoading }: { value: number; label: string; isLoading: boolean }) {
  const { ref, display } = useCountUp(value);
  // The ref'd element is always mounted (never conditionally swapped for a separate
  // skeleton element) so the IntersectionObserver in useCountUp can always attach,
  // even while isLoading is still true and `value` hasn't settled to its real number yet.
  return (
    <div className="trust-stat">
      <strong ref={ref as React.RefObject<HTMLElement>} className={isLoading ? "skeleton" : undefined}>
        {isLoading ? " " : `${display}+`}
      </strong>
      <span>{label}</span>
    </div>
  );
}

const EXAMPLE_TESTIMONIALS = [
  { nameKey: "trust.example1Name", locationKey: "trust.example1Location", quoteKey: "trust.example1Quote" },
  { nameKey: "trust.example2Name", locationKey: "trust.example2Location", quoteKey: "trust.example2Quote" },
  { nameKey: "trust.example3Name", locationKey: "trust.example3Location", quoteKey: "trust.example3Quote" },
] as const;

function TestimonialCarousel() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % EXAMPLE_TESTIMONIALS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const current = EXAMPLE_TESTIMONIALS[index];

  return (
    <div
      className="testimonial-wrap"
      onTouchStart={(e) => ((e.currentTarget as HTMLDivElement).dataset.touchX = String(e.touches[0].clientX))}
      onTouchEnd={(e) => {
        const startX = Number(e.currentTarget.dataset.touchX || 0);
        const deltaX = e.changedTouches[0].clientX - startX;
        if (Math.abs(deltaX) < 40) return;
        setIndex((i) =>
          deltaX < 0
            ? (i + 1) % EXAMPLE_TESTIMONIALS.length
            : (i - 1 + EXAMPLE_TESTIMONIALS.length) % EXAMPLE_TESTIMONIALS.length
        );
      }}
    >
      <div style={{ textAlign: "center" }}>
        <span className="testimonial-example-tag">{t("trust.exampleTag")}</span>
      </div>
      <div className="testimonial-card">
        <span className="testimonial-quote-mark">"</span>
        <div className="testimonial-stars" aria-hidden="true">★★★★★</div>
        <p className="testimonial-text">{t(current.quoteKey)}</p>
        <div className="testimonial-author">
          <strong>{t(current.nameKey)}</strong>
          <span>· {t(current.locationKey)}</span>
        </div>
      </div>
      <div className="testimonial-dots">
        {EXAMPLE_TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`testimonial-dot ${i === index ? "is-active" : ""}`}
            aria-label={`Testimonial ${i + 1}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}

export default function TrustSection({
  providers,
  categoriesCount,
  isLoading,
}: {
  providers: ProviderProfile[];
  categoriesCount: number;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  const totalSessions = providers.reduce((sum, p) => sum + (p.sessionCount || 0), 0);
  const totalPractitioners = providers.length;

  const highlightTiles = CATEGORY_TILES.filter((tile) => !tile.isShop).slice(0, 3);

  return (
    <section className="trust-section section-lg">
      <div className="container">
        <FadeIn>
          <div style={{ textAlign: "center" }}>
            <span className="section-eyebrow">{t("trust.eyebrow")}</span>
            <h2 className="section-title">{t("trust.title")}</h2>
          </div>
        </FadeIn>

        <div className="trust-stat-row">
          <StatBlock value={totalPractitioners} label={t("trust.statPractitioners")} isLoading={isLoading} />
          <StatBlock value={totalSessions} label={t("trust.statSessions")} isLoading={isLoading} />
          <StatBlock value={categoriesCount} label={t("trust.statCategories")} isLoading={isLoading} />
        </div>

        <FadeIn>
          <TestimonialCarousel />
        </FadeIn>

        <FadeIn>
          <div className="cert-badge-row">
            <div className="cert-badge">
              <div className="cert-badge-icon">🪪</div>
              <span>{t("trust.certId")}</span>
            </div>
            <div className="cert-badge">
              <div className="cert-badge-icon">📜</div>
              <span>{t("trust.certQualification")}</span>
            </div>
            <div className="cert-badge">
              <div className="cert-badge-icon">☎</div>
              <span>{t("trust.certReference")}</span>
            </div>
            <div className="cert-badge">
              <div className="cert-badge-icon">✓</div>
              <span>{t("trust.certConduct")}</span>
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="highlight-grid">
            {highlightTiles.map((tile) => (
              <div key={tile.slug} className="highlight-card">
                <img src={tile.photo} alt="" />
                <div className="highlight-card-overlay">
                  <strong>{tile.fallbackName}</strong>
                  <span>{t("trust.highlightCaption")}</span>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
