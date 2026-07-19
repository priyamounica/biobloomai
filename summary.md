# BioBloomai: AI Health Intelligence Platform

BioBloomai is a **privacy-first AI health companion** that demystifies medical complexity for humans and pets. It intelligently processes lab reports, medications, and health profiles to generate clear, actionable insights while maintaining strict data privacy. The app transforms unstructured health data into structured, personalized guidance.

## Tech Stack

- **Languages:** TypeScript (primary), JavaScript
- **Frontend Framework:** React 19 with TanStack React Router & React Query
- **Backend & Serverless:** TanStack React Start (fullstack), Cloudflare Workers, Bun runtime
- **Database:** Supabase (PostgreSQL)
- **UI Framework:** Radix UI components with Tailwind CSS
- **State Management:** Zustand (client-side), Supabase (persistence)
- **Notable Libraries:** 
  - `@tanstack/react-query` (data sync & caching)
  - `react-hook-form` + `zod` (form validation)
  - `jspdf` (PDF export)
  - `recharts` (health data visualization)

## How It's Organized

```
src/
  routes/                  Page components (Labs, Meds, Admin, Onboarding)
  lib/
    ai.functions.ts       AI processing pipelines (lab summarization, med advice)
    health.functions.ts   CRUD operations for labs, meds, health profiles
    admin.functions.ts    User & role management, AI audit logs
    store.ts              Zustand store for offline-first data
    use-cloud-sync.ts     Supabase sync & auth layer
  components/
    health/               Domain-specific UI (Lab forms, Med sheets, AI sections)
  integrations/
    supabase/             Auth middleware, RLS policies
    lovable/              Lovable AI cloud auth
```

### Data Flow

1. User uploads lab PDF/photo or enters manually → AI vision model extracts structured data
2. Data stored locally in Zustand store (persistent) → user can work offline
3. On demand: AI summarization & advice via server functions → Google Gemini models
4. Admin portal monitors all AI calls, flags anomalies, logs token usage
5. Optional: sync to Supabase for multi-device access

## Key AI/ML Concepts Applied

### 1. Document Understanding (Vision + NLP)
- **Multimodal Vision Model:** Google Gemini 2.5-flash extracts lab values, units, reference ranges from PDFs/photos with high accuracy
- **Structured Extraction:** JSON schema parsing ensures valid, normalized data
- **Fallback Handling:** Graceful error recovery with user-friendly messages

### 2. Natural Language Generation (NLG)
- **Plain-Language Summarization:** Summarizes complex lab values for laypeople using Gemini-3-flash
- **Contextual Prompting:** System prompts guide tone & structure (markdown sections, bullet points)
- **Profile-Aware Personalization:** Age, sex, BMI, conditions, family history inform output

### 3. Medication Interaction Detection
- **Semantic Search:** AI identifies potential drug-drug interactions from unstructured med list
- **Adherence Insights:** LLM-powered suggestions on timing, lifestyle factors, supplements

### 4. Predictive Lab Recommendations
- **Clinical Reasoning:** AI suggests follow-up tests based on existing results + patient profile
- **Evidence-Based Guidance:** Simulates clinician reasoning without diagnosis claims

### 5. Responsible AI & Governance
- **Audit Logging:** Every AI call logged with model, tokens, latency, errors
- **Flagging System:** Admin-driven anomaly detection & human review workflow
- **Data Privacy:** Explicit disclaimers; no training data retention

## Features Built & Supported

| Feature | Description |
|---------|-------------|
| **Lab Timeline** | Upload PDFs/photos or manually enter results. Chronologically organized. |
| **AI Lab Summary** | Plain-English overview: what looks good, what needs attention, risk flags. |
| **Suggested Tests** | AI-powered follow-up recommendations based on gaps & profile. |
| **Medication Tracker** | Log active/past meds with dosage, frequency, timing, notes. |
| **Interaction Checker** | AI flags potential drug-drug interactions to discuss with clinician. |
| **Adherence Tips** | LLM suggestions for lifestyle, supplement, timing optimization. |
| **Health Profile** | Age, sex, weight, height, BMI, conditions, family history, allergies, diet. |
| **PDF Export** | Download AI summaries as PDFs for clinic visits. |
| **Admin Dashboard** | User management, AI activity logs, error/anomaly tracking, token budgets. |
| **Offline-First UX** | LocalStorage-backed Zustand store; works without connectivity. |
| **Multi-Device Sync** | Optional Supabase sync for cross-device access. |
| **Multi-Species Ready** | Architected for pets (vet labs), livestock, wellness expansion. |

## Benefits to End Users

| Benefit | Impact |
|---------|--------|
| **Health Literacy** | Demystifies medical jargon; empowers informed discussions with clinicians. |
| **Time Savings** | Automated extraction from PDFs; eliminates manual data entry. |
| **Drug Safety** | Identifies interaction risks before pharmacy fill. |
| **Personalization** | Contextual advice based on profile (age, conditions, family history). |
| **Privacy Assurance** | "Never sold, never used to train AI" messaging + audit transparency. |
| **Accessibility** | Radix UI components + plain language = screen-reader friendly, low literacy safe. |
| **Offline Resilience** | Works without internet; syncs when ready. |
| **Portability** | Export summaries for clinic handoffs. |

## AI/ML Concepts Worth Highlighting for Admissions

1. **Multimodal AI:** Combining vision (image/PDF parsing) + NLG (text generation)
2. **Prompt Engineering:** Structured system prompts for consistent, task-specific output
3. **Schema Validation:** Zod + LLM output parsing for reliable, auditable AI pipelines
4. **Responsible AI:** Governance framework (logging, flagging, disclaimers, no model training)
5. **Personalization at Scale:** Context injection (profile data) into prompts for tailored recommendations
6. **Full-Stack ML:** LLM integration in production app with error handling, monitoring, cost tracking
7. **Human-in-the-Loop:** Admin review workflow for anomalies before user exposure

---

This project demonstrates **end-to-end AI application development**: from document understanding → contextual processing → user-friendly output, with enterprise-grade governance and privacy. Perfect for showcasing real-world ML maturity! 🚀
