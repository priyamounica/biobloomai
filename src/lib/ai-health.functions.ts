import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { logAi } from "./ai-log.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TEXT_MODEL = "google/gemini-3-flash-preview";
const VISION_MODEL = "google/gemini-2.5-pro";

async function callAI(body: Record<string, unknown>, log: { kind: string; input: string }) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI service not configured");
  const started = Date.now();
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) throw new Error("AI is busy — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) {
      const txt = await res.text();
      console.error("AI error", res.status, txt);
      throw new Error("AI service error.");
    }
    const json = await res.json();
    await logAi({
      kind: log.kind,
      model: String(body.model ?? ""),
      input: log.input,
      output: json.choices?.[0]?.message?.content ?? "",
      status: "ok",
      durationMs: Date.now() - started,
    });
    return json;
  } catch (e) {
    await logAi({
      kind: log.kind,
      model: String(body.model ?? ""),
      input: log.input,
      status: "error",
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - started,
    });
    throw e;
  }
}

function tryParseJson<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    // grab first {...} or [...]
    const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    return JSON.parse(m ? m[0] : cleaned) as T;
  } catch {
    return null;
  }
}

/* --------- Suggest test names (AI) --------- */
export const suggestLabTests = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ query: z.string().min(1).max(64) }).parse(i))
  .handler(async ({ data }) => {
    const json = await callAI(
      {
        model: TEXT_MODEL,
        messages: [
          {
            role: "system",
            content:
              'Return a JSON array of up to 6 common lab/blood test names matching the user query. Use canonical names (e.g. "HbA1c", "LDL Cholesterol", "TSH", "Vitamin D, 25-Hydroxy"). Output ONLY JSON like ["HbA1c","Fasting Glucose"]. No prose.',
          },
          { role: "user", content: data.query },
        ],
      },
      { kind: "suggest_lab_tests", input: data.query },
    );
    const raw: string = json.choices?.[0]?.message?.content ?? "[]";
    const arr = tryParseJson<string[]>(raw);
    return {
      suggestions: Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, 6) : [],
    };
  });

/* --------- Autofill lab metadata (unit + ref range) --------- */
export const labMetadata = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ name: z.string().min(2).max(120) }).parse(i))
  .handler(async ({ data }) => {
    const json = await callAI(
      {
        model: TEXT_MODEL,
        messages: [
          {
            role: "system",
            content:
              'For a lab test, return strict JSON: {"units":["unit1","unit2"],"refRange":"X – Y","commonUnit":"unit1"}. Provide the 1-4 most common units (e.g. for glucose: ["mg/dL","mmol/L"]) and the standard adult reference range using commonUnit. No prose.',
          },
          { role: "user", content: data.name },
        ],
      },
      { kind: "lab_metadata", input: data.name },
    );
    const raw: string = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = tryParseJson<{ units?: string[]; refRange?: string; commonUnit?: string }>(raw);
    return {
      units: parsed?.units?.filter((u) => typeof u === "string").slice(0, 4) ?? [],
      refRange: parsed?.refRange ?? "",
      commonUnit: parsed?.commonUnit ?? parsed?.units?.[0] ?? "",
    };
  });

/* --------- Autofill medication details from name --------- */
export const medMetadata = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ name: z.string().min(2).max(120) }).parse(i))
  .handler(async ({ data }) => {
    const json = await callAI(
      {
        model: TEXT_MODEL,
        messages: [
          {
            role: "system",
            content:
              'For a medication name (brand or generic), return strict JSON: {"dosage":"500 mg","frequency":"Twice daily","timesOfDay":["Morning","Evening"],"notes":"Take with food"}. Use the most commonly prescribed adult dosage. timesOfDay must use only: Morning, Noon, Evening, Bedtime. If the name includes a strength (e.g. "Dolo 650"), set dosage to that strength. Return empty strings if unsure. No prose.',
          },
          { role: "user", content: data.name },
        ],
      },
      { kind: "med_metadata", input: data.name },
    );
    const raw: string = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = tryParseJson<{
      dosage?: string;
      frequency?: string;
      timesOfDay?: string[];
      notes?: string;
    }>(raw);
    const VALID = ["Morning", "Noon", "Evening", "Bedtime"];
    return {
      dosage: parsed?.dosage ?? "",
      frequency: parsed?.frequency ?? "",
      timesOfDay: (parsed?.timesOfDay ?? []).filter((t) => VALID.includes(t)).slice(0, 4),
      notes: parsed?.notes ?? "",
    };
  });

/* --------- Parse medication from image (cover/prescription) --------- */
const medParseSchema = z.object({
  name: z.string(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  timesOfDay: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const parseMedFile = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        dataUrl: z.string().min(20).max(15_000_000),
        mimeType: z.string(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const userContent = [
      {
        type: "text",
        text:
          'Identify medication(s) from this image (drug box, blister pack, label, or prescription). Return ONLY valid JSON array (no prose, no code fences). Each item: {"name": string, "dosage"?: string (e.g. "500 mg"), "frequency"?: string, "timesOfDay"?: string[] (Morning/Noon/Evening/Bedtime only), "notes"?: string}. If multiple meds visible, return all. If unreadable, return [].',
      },
      { type: "image_url", image_url: { url: data.dataUrl } },
    ];
    let json;
    try {
      json = await callAI(
        {
          model: VISION_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a precise pharmaceutical label parser. Output strictly valid JSON, no commentary.",
            },
            { role: "user", content: userContent },
          ],
        },
        { kind: "parse_med_file", input: `mime:${data.mimeType}` },
      );
    } catch (e) {
      return { results: [], error: e instanceof Error ? e.message : "Parse failed" };
    }
    const raw: string = json.choices?.[0]?.message?.content ?? "[]";
    const parsed = tryParseJson<unknown>(raw);
    try {
      const arr = z.array(medParseSchema).parse(parsed);
      return { results: arr, error: null };
    } catch {
      return {
        results: [],
        error:
          "Couldn't identify a medication from this image. Try a clearer photo of the label or enter manually.",
      };
    }
  });

/* --------- Family-history options (AI generated) --------- */
export const familyHistorySuggestions = createServerFn({ method: "GET" })
  .handler(async () => {
    const json = await callAI(
      {
        model: TEXT_MODEL,
        messages: [
          {
            role: "system",
            content:
              'Return ONLY a JSON array of 14 of the most common hereditary/family-history health conditions, in plain user-friendly language. Example: ["Type 2 Diabetes","High Blood Pressure"]. No prose.',
          },
          { role: "user", content: "Common family history conditions" },
        ],
      },
      { kind: "family_history_options", input: "default" },
    );
    const raw: string = json.choices?.[0]?.message?.content ?? "[]";
    const arr = tryParseJson<string[]>(raw);
    return {
      options: Array.isArray(arr) ? arr.filter((s) => typeof s === "string").slice(0, 20) : [],
    };
  });

/* --------- Chat about labs/meds (user follow-up Q&A) --------- */
export const healthChat = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        topic: z.enum(["labs", "meds"]),
        scope: z.enum(["summary", "advice"]),
        priorContent: z.string().max(8000),
        context: z.string().max(8000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().max(4000),
            }),
          )
          .max(20),
        question: z.string().min(1).max(2000),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const system = `You are a careful health information assistant continuing a conversation about a user's ${data.topic} (${data.scope}). Be concise, plain-language, never diagnose or prescribe. Always end with a brief reminder that this is informational only and to consult a qualified clinician. Use markdown.

The user previously received this AI ${data.scope}:
---
${data.priorContent}
---

User context: ${data.context}`;
    const messages = [
      { role: "system", content: system },
      ...data.history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: data.question },
    ];
    const json = await callAI(
      { model: TEXT_MODEL, messages },
      { kind: `chat_${data.topic}_${data.scope}`, input: data.question },
    );
    const text: string = json.choices?.[0]?.message?.content ?? "I'm not sure.";
    return { text };
  });
