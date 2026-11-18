import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up from 0 to `value` once the element referenced
 * by the returned ref scrolls into view. Used for the Trust section's real,
 * database-derived stats (Task 5).
 *
 * Deliberately split into two effects with plain React state (no shared mutable
 * "started" ref) — an earlier version used a ref flag to guard against re-running
 * the animation, which meant: if the element became visible *before* the real
 * value arrived from the API (so the animation first "ran" against a placeholder
 * 0), that ref flag permanently blocked the real run once the real value showed
 * up, leaving the stat stuck at 0. Revealing is now just a boolean piece of state,
 * and the animation effect re-runs cleanly whenever `revealed` or `value` changes.
 */
export function useCountUp(value: number, durationMs = 1400) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [display, setDisplay] = useState(0);

  // Reveal once the element scrolls into view (or after a short fallback delay,
  // in case the observer is ever flaky — see FadeIn.tsx for the same pattern).
  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    const fallback = window.setTimeout(() => setRevealed(true), 2500);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [revealed]);

  // Animate towards `value` whenever revealed (and re-run if `value` arrives or
  // changes after reveal — e.g. the API resolves after the user already scrolled
  // past). setInterval, not requestAnimationFrame: rAF is fully paused by the
  // browser whenever the tab/pane isn't visible or focused, which could leave this
  // stuck at 0 forever; setInterval is only throttled in that case, never paused.
  useEffect(() => {
    if (!revealed) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || value <= 0) {
      setDisplay(value);
      return;
    }
    const steps = 30;
    const stepMs = Math.max(16, Math.floor(durationMs / steps));
    let step = 0;
    const interval = window.setInterval(() => {
      step += 1;
      const progress = Math.min(1, step / steps);
      // Ease-out cubic — fast start, gentle settle.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress >= 1) window.clearInterval(interval);
    }, stepMs);
    return () => window.clearInterval(interval);
  }, [revealed, value, durationMs]);

  return { ref, display };
}
