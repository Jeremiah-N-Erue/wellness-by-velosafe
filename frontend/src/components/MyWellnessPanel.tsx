import type { Booking, ProgressLog } from "../lib/types";

// "My Wellness": a visual layer on top of real Booking/ProgressLog data — no new backend
// dependency, no fabricated numbers. Hand-rolled progress bar + milestone badges rather
// than a charting library, since the only data point that matters here (completed session
// count over time) doesn't need one.
const MILESTONES = [
  { threshold: 1, label: "First session", icon: "🌱" },
  { threshold: 5, label: "5 sessions", icon: "🔥" },
  { threshold: 10, label: "10 sessions", icon: "💪" },
  { threshold: 25, label: "25 sessions", icon: "⭐" },
  { threshold: 50, label: "50 sessions", icon: "🏆" },
];

interface Props {
  bookings: Booking[];
  progress: ProgressLog[];
}

export default function MyWellnessPanel({ bookings, progress }: Props) {
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const completedCount = completed.length;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const thisMonthCount = completed.filter((b) => new Date(b.scheduledAt).getTime() >= thirtyDaysAgo).length;

  const nextMilestone = MILESTONES.find((m) => m.threshold > completedCount);
  const prevThreshold = [...MILESTONES].reverse().find((m) => m.threshold <= completedCount)?.threshold ?? 0;
  const pct = nextMilestone
    ? Math.min(100, Math.round(((completedCount - prevThreshold) / (nextMilestone.threshold - prevThreshold)) * 100))
    : 100;

  const acknowledgedGoals = progress.filter((p) => p.goalProgressSummary).length;

  return (
    <div className="section">
      <h2>My Wellness</h2>
      <div className="card wellness-card">
        <div className="wellness-stat-row">
          <div className="wellness-stat">
            <strong>{completedCount}</strong>
            <span>Sessions completed</span>
          </div>
          <div className="wellness-stat">
            <strong>{thisMonthCount}</strong>
            <span>Last 30 days</span>
          </div>
          <div className="wellness-stat">
            <strong>{acknowledgedGoals}</strong>
            <span>Progress reports</span>
          </div>
        </div>

        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${completedCount === 0 ? 0 : pct}%` }} />
        </div>
        <p className="muted" style={{ fontSize: "0.8rem", margin: "0.4rem 0 0" }}>
          {nextMilestone
            ? `${nextMilestone.threshold - completedCount} more session${nextMilestone.threshold - completedCount === 1 ? "" : "s"} to "${nextMilestone.label}"`
            : "All milestones unlocked — you're a Wellness by VeloSafe veteran."}
        </p>

        <div className="milestone-row">
          {MILESTONES.map((m) => (
            <span key={m.threshold} className={`milestone-badge ${completedCount >= m.threshold ? "is-achieved" : ""}`}>
              {m.icon} {m.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
