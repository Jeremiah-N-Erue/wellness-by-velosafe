# Wellness by VeloSafe — Build Plan & Current-State Analysis
*Prepared 2026-11-14. Supersedes the TECHFEST 2026 application track, which Jeremiah has abandoned in favor of building a real MVP and pushing it to GitHub/LinkedIn.*

## 1. What already exists

Three strategy documents are on file in the project:

- **`competitive-risk-assessment.md`** — the controlling document. It corrects the original broad "ecosystem for every tourist/expat need" pitch down to a single vertical: a wellness marketplace (personal trainers, yoga instructors, wellness coaches) launching in Ho Chi Minh City. It specifies the regulatory tiering (fitness/PT/yoga = light touch; spa/massage/clinical = medium-to-heavy touch and explicitly out of scope for v1), the monetization architecture (prepaid credit packs, not subscriptions, because the Vietnamese payment rails — MoMo, ZaloPay, VNPay — don't reliably support recurring billing as merchants), the three-tier Provider Verification Model, the Progress & Goals Engine, both the client and provider lock-in stacks, the in-app messaging model with contact-detail filtering, credit expiry/win-back policy, the social/community layer, and a "Remote Body Doubling" accountability feature staged for v1 at a deliberately light tier.
- **`business-overview-status.md`** — the 5-page investor-facing overview: problem, solution, technology moat (explicitly a trust/data/network-effects moat, not deep-tech), ESG framing, and an illustrative unit-economics table.
- **`techfest-2026-application-plan.md`** — now historical. Records the team structure (Jeremiah as Founder & CEO, a Vietnamese co-founder, a Nigerian lead), the pre-seed framing, and the Ho Chi Minh City pilot plan. Useful as a record of decisions already made; the TECHFEST-specific content in it is dead weight now.

So the strategic thinking is genuinely solid and specific — this isn't a blank slate. What's never existed is working software: the earlier prototype was a UI-only clickthrough with no accounts, no backend, no payments, and it no longer exists on disk in this fresh session anyway. You asked me to rebuild fresh rather than recover it, which is the right call — better to build the real thing once than resurrect a mockup.

## 2. Three things worth deciding explicitly before I write code

**Scope: wellness-only, or does the original "ecosystem" framing still apply?**
The project's own description still talks about a broad ecosystem for every tourist/expat need in Vietnam, but the risk-assessment doc correctly narrowed that to wellness because trying to be "everything" with a single pre-seed team is how this kind of venture dies before it proves anything. I'm going to build strictly to the wellness-only, Ho Chi Minh City-first scope from the risk assessment, and treat the broader ecosystem as a long-term vision, not a v1 feature list. Flagging this so it's a decision you've confirmed, not one I made silently.

**Payments: Velosafe Technologies Ltd is Nigerian, not Vietnamese.**
This is the one honest structural problem I haven't seen explicitly resolved in the docs. MoMo, ZaloPay, VNPay and Payoo all onboard merchants as locally registered Vietnamese business entities (or at minimum require a Vietnamese banking relationship and often a local legal entity for the merchant agreement). A Nigerian CAC-registered company cannot directly open a merchant account with any of them. The risk-assessment doc already anticipated something adjacent to this — it recommends a majority-Vietnamese operating entity paired with a services/IP agreement back to the foreign holding company, for regulatory reasons (e-commerce trading-floor registration, data protection). That same local entity is almost certainly also the thing that would need to exist before a real Vietnamese payment-merchant account is possible.
Practically, that means the real MoMo/ZaloPay/VNPay integration can't be stood up this week regardless of how good the code is — it depends on a Vietnamese legal entity being formed, which depends on your Vietnamese co-founder and (per the existing docs) actual Vietnamese legal counsel, who hasn't been engaged yet.
What I can do now: build the payment layer as a clean adapter interface with a fully working mock/sandbox provider behind it, so the entire credit-pack purchase flow, booking flow, and payout flow work end-to-end in the demo, and swapping in a real MoMo/ZaloPay sandbox key later is a config change, not a rewrite. I think this is the honest and correct MVP choice rather than quietly pretending a real payment integration exists.

**Legal counsel is still unengaged.** Same note as before — the credit expiry policy, the data-protection handling for the sensitive health/progress data, and the merchant-entity question all have a point where a Vietnamese lawyer's sign-off matters. Not blocking the build, but it's a real gap between "working MVP" and "launchable in Vietnam" that no amount of code closes.

## 3. Proposed MVP architecture

Given your machine already has Prisma and GitKraken set up, I'm building to that stack rather than inventing a new one:

- **Backend:** Node.js + TypeScript, Express, Prisma ORM, PostgreSQL (via docker-compose, so anyone — including judges/recruiters on LinkedIn — can `docker compose up` and have a real database, not a toy in-memory store).
- **Frontend:** React + Vite + TypeScript, carrying over the navy/gold visual language already established in your docx house style.
- **Data model:** User (client/provider/admin), ProviderProfile, VerificationRecord (Tier 1 of the 3-tier model — ID + certification + reference contact + signed waiver), Booking, CreditPack + CreditLedger, Payment (adapter pattern, mock provider live, MoMo/ZaloPay stubs defined), ProgressLog (provider-entered, client-visible), Message (with a contact-detail regex filter per the documented soft-block policy).
- **Explicitly out of scope for this MVP**, per the project's own sequencing discipline, not an oversight: Remote Body Doubling, masked calling, hosted chat SDK migration, Tier 2/3 verification workflows, spa/clinical verticals. These are all real features in the docs — just correctly staged for after the wellness core works.
- **In scope and real, not mocked:** auth, provider discovery/search, booking against credit balance, provider-side progress logging, client-side progress viewing, basic in-app messaging with the filter, and the full credit-pack purchase flow (mock payment provider, real ledger).

## 4. GitHub push

The cloud workspace's GitHub token is invalid, so I can't create/push a repo directly from here. Your Windows machine is linked to this session and has GitKraken available, so the cleanest path is: I build the full codebase here, then write it to a folder on your computer (once you grant access) and push from there using your own already-authenticated git/GitHub identity via GitKraken — no token ever has to pass through this chat. Alternative: you hand me a GitHub personal access token to use here. I'd recommend the GitKraken route since it's already set up and keeps your credentials off this container entirely.
