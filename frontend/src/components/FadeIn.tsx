import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fade-in-on-scroll wrapper (Task 1). Uses IntersectionObserver to add the
 * `.is-visible` class defined in index.css once the element enters the viewport.
 * Content is visible by default (no JS = no broken page), and
 * prefers-reduced-motion is handled purely in CSS.
 */
export default function FadeIn({
  children,
  className = "",
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => window.setTimeout(() => setVisible(true), delayMs);

    // threshold: 0 + a bottom rootMargin means this fires as soon as any part of the
    // element is within 80px of the viewport, rather than needing 15% of it on-screen
    // at once — a fast scroll/fling can otherwise cross a tall section in a single
    // frame and never register as "intersecting" under a stricter threshold.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);

    // Safety net: never leave content permanently invisible if the observer is ever
    // flaky (fast programmatic scrolling, an odd layout timing) — show it regardless
    // after a short delay so a bug in the animation can never hide real content.
    const fallback = window.setTimeout(() => setVisible(true), 2500);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [delayMs]);

  return (
    <div ref={ref} className={`fade-in-up ${visible ? "is-visible" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}
