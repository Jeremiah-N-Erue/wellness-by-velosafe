# Architecture

This distills the strategy work behind Wellness by VeloSafe into what the code actually
implements, and is honest about where it doesn't yet.

## Why wellness, and why category-agnostic data model

The venture's original framing was a broad Vietnam tourist/expat "ecosystem" covering
every service a visitor or expat might need. A pre-seed team building "everything" at once
is a well-known way to prove nothing before running out of runway, so the first working
vertical is wellness — personal trainers, yoga instructors, wellness coaches — in Ho Chi
Minh City.

At the same time, the founder's direction was to keep the platform's architecture broader
than "wellness, hardcoded," so that other verticals (tours, visa/relocation help, real
estate, etc.) are a data problem, not a rewrite, when the team is ready for them. The
schema reflects that: `ServiceCategory` is a first-class, data-driven model with feature
flags (`requiresVerification`, `hasProgressTracking`). Only the `wellness` category has
those flags turned on and its full operating model built — verification, credit-pack
bookings, the Progress & Goals engine. Two more categories exist in the seed data
(`tours-experiences`, `relocation-visa`) specifically to prove this isn't a label on top of
wellness-only code; they're marked inactive because no one has designed their operating
rules yet.

## Why two countries, and why country-agnostic too

The founder's direction was also to make the market itself — not just the service
category — a "data problem, not a rewrite" from day one: Vietnam and Nigeria are both live
in this MVP, with real seeded providers, services, and their own credit packs (VND and
NGN respectively), and a couple more countries (Thailand, UAE) are seeded inactive to prove
a third market is genuinely an option, not a hardcoded pair with a label.

This has real consequences in the schema, not just a filter dropdown: `CreditLedgerEntry`
and `CreditPack` are both scoped by `countryId`, because a client's VND balance can't pay
for a Lagos provider's NGN-priced session. Booking a session charges the balance in that
specific booking's country. A client who's active in both markets simply holds two
separate balances — the dashboard's market switcher reflects that directly rather than
pretending there's one global wallet.

## Payments: why there's a mock provider instead of MoMo/ZaloPay/VNPay — or Paystack/Flutterwave

Velosafe Technologies Ltd is a Nigerian CAC-registered company. MoMo, ZaloPay, and VNPay
all require a Vietnamese merchant entity to onboard — at minimum a Vietnamese banking
relationship, typically a locally registered legal entity for the merchant agreement. That
entity doesn't exist yet; forming one is a legal/corporate step that depends on the
Vietnamese co-founder and Vietnamese legal counsel (not yet engaged), not on engineering.

Nigeria is the interesting counter-case: because Velosafe itself is the Nigerian entity,
a real Paystack or Flutterwave merchant account doesn't require forming a new company
first — just API keys and the provider's standard business verification. It's realistically
the nearer-term integration of the two, even though neither is live in this MVP yet.

So `backend/src/services/payment/adapter.ts` defines one interface
(`PaymentProviderAdapter`) and a `MockPaymentProvider` that implements it and actually runs
today, for both markets — the entire purchase → credit-ledger → booking flow works
end-to-end against it. `MomoPaymentProvider`, `ZaloPayPaymentProvider`, `VnPayPaymentProvider`,
`PaystackPaymentProvider`, and `FlutterwavePaymentProvider` all exist as classes that throw
a clear, honest error naming the real blocker, rather than silently returning fake success.
Standing up a real integration later means writing one more class and flipping
`PAYMENT_PROVIDER` in the environment — the booking, ledger, and credit-expiry logic never
has to change.

Credit packs (not subscriptions) are deliberate for the same underlying reason: these
payment rails don't reliably support recurring billing for a merchant in this position.
`CreditPack.validityDays` defaults to 180 (6 months), matching the documented 6–12 month
validity window; the win-back mechanics around it (reminders, pause/freeze, grace
extension, transferability) are specified but not yet built into this MVP — the ledger
model (`CreditLedgerEntry`) is shaped to support them without a schema change.

## Provider Verification Model

Three tiers are specified; only Tier 1 is operational in this MVP.

- **Tier 1 — Baseline (live):** ID document + certification + one reference contacted
  directly by the platform + signed code of conduct/waiver. `VerificationRecord` tracks
  each piece; `PATCH /api/providers/:id/verification` (admin-only) updates them, and the
  provider's `verificationTier` flips to `TIER_1_BASELINE` automatically once every field
  is confirmed. This is intentionally not self-service — a provider can't verify themself.
- **Tier 2 — Verified badge** and **Tier 3 — Ongoing trust score** are specified in the
  strategy docs (mock-session assessment, venue affiliation, decaying trust score from
  session count / goal completion / no-show rate / disputes) but not built here. The schema
  has the fields to support Tier 3 signals (`sessionCount`, `noShowCount`, `trustScore`)
  so they can be wired up without a migration.

## Progress & Goals engine

A booking carries the client's stated goal (`Booking.goalText`). After a session, the
provider submits a `ProgressLog`: session notes, a client-visible goal-progress summary,
and an optional recommended number of further sessions *with a required rationale string*
— the recommendation is explainable by construction, never a hidden model score. This is
provider-entered and client-visible, never self-reported by the client — that's the
"Verified Progress" differentiator the social/community layer (not yet built) would lean
on.

## In-app messaging

`Conversation.stage` starts at `PRE_BOOKING`: messages are filtered through
`utils/contactFilter.ts`, which soft-blocks phone numbers, emails, social-app handles, and
URLs (replaces them with a visible redaction note — never silently delivers them, never
auto-bans the sender). Once a booking between the two parties is confirmed, the stage
flips to `POST_BOOKING` and the filter stops applying. The documented plan calls for
migrating to a hosted chat SDK (Stream/Sendbird) and adding proxy-number masked calling in
Phase 2 — this MVP's filter is the lightweight v1 version of the same policy, not the final
infrastructure.

## Language support: what's translated and what isn't

The frontend is wired up with `react-i18next` and ships four languages — English,
Vietnamese, Chinese, and French — switchable from the navbar at any time. Coverage is
deliberately partial and that's stated here rather than quietly: navigation, the home
page, login, register, and the discovery page's labels are fully translated
(`frontend/src/i18n/locales/*.json`). The client dashboard, provider console, booking
forms, and messaging are English-only for now — translating a form is cheap, but
translating it *correctly* (especially the Progress & Goals language, which needs to read
naturally and not clinically) deserved more care than a first pass warranted.

The non-English strings were machine-translated by Claude, not reviewed by a native
speaker of any of the four languages. Vietnamese is the one that matters most before any
real launch, since it's a primary market — that review should happen before this ships to
real users, not after.

## What's deliberately not in this MVP

Each of these is specified in the project's strategy docs and staged for later, not
forgotten:

- **Remote Body Doubling** (async accountability pairing) — the docs stage this as a light
  "Tier 2" opt-in matching feature for v1 eventually, but it's additive to the core loop
  and was cut from this pass to keep the first working version small.
- **Masked calling** via a proxy-number service — Phase 2 per the messaging model.
- **Tier 2/3 verification workflows** and the trust-score decay calculation.
- **Hosted chat SDK migration.**
- **Spa/massage and clinical-rehab verticals** — both carry meaningfully heavier
  regulatory load (JV + minimum investment thresholds, Ministry of Health certification)
  than fitness/PT/yoga and are explicitly out of scope until the wellness core is proven.

## Known gap: Vietnamese legal counsel

Credit-expiry consumer-protection rules, personal-data handling for session/progress data
(Decree 13/2023), and the Vietnamese operating-entity question all have a point where a
Vietnamese lawyer's sign-off matters. That engagement hasn't happened yet. No amount of
code closes this gap — it's tracked here so it isn't lost.
