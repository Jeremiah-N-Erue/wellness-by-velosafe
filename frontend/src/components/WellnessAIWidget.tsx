import { useState } from "react";
import { api, ApiError } from "../lib/api";
import type { ProviderProfile } from "../lib/types";
import ProviderCard from "./ProviderCard";

interface RecommendResponse {
  matchedCategories: { slug: string; name: string }[];
  rationale: string;
  providers: ProviderProfile[];
  disclaimer: string;
}

const EXAMPLES = [
  "I want to lose weight and improve my flexibility",
  "Help me build a consistent home workout habit",
  "I need help with stress and better sleep",
];

// "VeloSafe Wellness AI" — a transparent, rule-based recommender (no LLM, by design — see
// backend/src/routes/ai.ts). Every result is a real provider matched by real keyword logic,
// never a generated/fabricated recommendation.
export default function WellnessAIWidget() {
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(text: string) {
    if (!text.trim()) return;
    setGoals(text);
    setLoading(true);
    setError(null);
    try {
      const res = await api<RecommendResponse>("/ai/recommend", { method: "POST", body: { goals: text } });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not get a recommendation right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-widget card">
      <div className="ai-widget-header">
        <span className="ai-badge">AI</span>
        <div>
          <strong>VeloSafe Wellness AI</strong>
          <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
            Tell us your wellness goal — we'll match you to real professionals on this marketplace.
          </p>
        </div>
      </div>

      <form
        className="ai-widget-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(goals);
        }}
      >
        <textarea
          rows={2}
          placeholder='e.g. "I want to lose weight and improve my flexibility"'
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Thinking…" : "Get recommendations"}
        </button>
      </form>

      {!result && !loading && (
        <div className="ai-examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="ai-example-chip" onClick={() => ask(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && <div className="error-banner" style={{ marginTop: "0.75rem" }}>{error}</div>}

      {result && (
        <div className="ai-result">
          <div className="chat-bubble mine" style={{ maxWidth: "90%" }}>{goals}</div>
          <div className="chat-bubble theirs" style={{ maxWidth: "90%" }}>
            {result.rationale}
            <span className="filtered-note">{result.disclaimer}</span>
          </div>

          {result.providers.length > 0 && (
            <div className="grid grid-cards" style={{ marginTop: "1rem" }}>
              {result.providers.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
