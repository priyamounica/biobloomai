# AI Health App — Phase 1: Labs & Meds (no signup)

## Goal
Ship a working, beautiful Labs + Meds experience that anyone can use without signing up. Data is kept in the browser; an AI summary and advice are generated on demand. A soft "Sign up to save" nudge appears after AI generation and on page exit. Auth, onboarding, dashboard, admin, notifications, and multilingual support land in later phases.

## Tech stack
- TanStack Start (already scaffolded) + React 19 + Tailwind v4
- Lovable Cloud (Supabase) — enabled now for AI gateway + storage; auth tables stay unused until Phase 2
- Lovable AI Gateway (`google/gemini-3-flash-preview` for text, `gemini-2.5-flash` multimodal for lab file parsing)
- Local persistence: `localStorage` (Zustand store) — survives reloads, ready to sync to DB in Phase 2

## Design — Wellness Sage
- Palette: cream `#f5f0e8` bg, sage `#dce5d4` surface, deep forest `#4a6741` primary, terracotta `#c4654a` accent
- Typography: Instrument Serif headings + Work Sans body (editorial, warm, trustworthy)
- Generous whitespace, soft 12px radii, subtle card shadows, no harsh borders
- All tokens in `src/styles.css` (oklch); shadcn components themed via tokens — no ad-hoc colors in JSX

## Pages & routes
```
/                 Landing — hero, what it does, disclaimer, CTAs to Labs/Meds
/labs             Labs entry + history + AI summary + AI advice
/meds             Meds entry + active/inactive + AI summary + AI advice
```
Minimal shell: top nav (logo, Labs, Meds), footer with disclaimer. Mobile-responsive.

## Labs page
- "Add test" opens a sheet with two tabs: **Upload** (PDF/JPG/PNG, ≤10MB) and **Manual**
- Upload → calls `parse-lab` server fn → Gemini multimodal extracts `[{name, value, unit, refRange, date}]` → prefilled form for user to confirm/edit → save
- Parse failure → friendly message: "Couldn't read this file. Try a clearer photo/PDF or enter values manually." with a button to switch to Manual
- History list grouped by date with edit/delete; timeline view toggle
- "Generate AI Summary" button → considers all saved labs + (if filled) lightweight inline profile (age/sex/weight optional) → markdown summary with disclaimer
- "Get AI Advice" → recommends relevant future tests with rationale
- After first AI generation: inline card "Save your results — create a free account" (dismissable)

## Meds page
- "Add medication" sheet: name (AI-assisted autocomplete via `suggest-med` server fn), dosage, frequency, time(s) of day, start/end dates, notes
- Active vs Inactive split (inactive = end date in past)
- "Generate AI Summary" → interactions/adherence notes + supplement advice, with disclaimer
- "Get AI Advice" → personalized supplement/lifestyle tips
- Same signup nudge pattern as Labs

## Signup nudge
- Appears (a) after AI summary/advice generated, (b) on `beforeunload` if user has unsaved entries and hasn't dismissed
- Phase 1: links to a placeholder `/signup` "Coming soon" — wiring real auth happens in Phase 2

## Server functions (TanStack `createServerFn`)
- `parse-lab` — multipart upload → Gemini 2.5 flash → JSON tool-call extraction
- `summarize-labs` — labs[] + optional mini-profile → markdown summary
- `advise-labs` — same input → recommended future tests
- `summarize-meds` / `advise-meds` — meds[] + optional profile → markdown
- `suggest-med` — query string → top medication name suggestions
All gated by validation, return `{ data, error }` shape, surface 402/429 from gateway as friendly toasts. Disclaimer appended server-side to every AI text response.

## Client state
- Zustand store persisted to `localStorage` under `health.labs` and `health.meds`
- Auto-save on every form change; unsaved-changes warning on route change inside sheets

## Loading & error UX
- Skeleton cards while parsing/summarizing
- Inline error banners with retry; toasts for transient failures
- AI sections show "How was this generated?" expandable with the prompt context summary (transparency)

## Out of scope for Phase 1 (queued for Phase 2+)
Auth (email + phone OTP), onboarding wizard, profile editing, dashboard, admin panel, notifications, data export, i18n (en/fr/te/hi), natural-language Q&A, goal-tuned recommendations, FAQ assistant, server-side persistence, RLS policies.

## Phase 2 preview (for context, not built now)
Enable Lovable Cloud auth → wire signup nudge to real flow → migrate localStorage data to `lab_results` / `medications` tables on first login → onboarding wizard with AI-suggested conditions/family history → dashboard with health summary → notifications → i18n → admin → export.

---

### Technical notes
- Lovable Cloud will be enabled at build start to unlock the AI gateway (`LOVABLE_API_KEY`) and Storage (for transient lab file uploads to feed Gemini).
- Lab files uploaded to a private `lab-uploads` bucket with a short-lived signed URL passed to Gemini; deleted after parse in Phase 1.
- Every AI response includes: *"For informational purposes only. Please consult a healthcare professional."* and a "Your data is not used to train AI models." footnote.
