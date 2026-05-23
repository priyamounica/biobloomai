import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TEXT_MODEL = "google/gemini-3-flash-preview";
const VISION_MODEL = "google/gemini-2.5-flash";

const DISCLAIMER =
  "\n\n---\n*For informational purposes only. Please consult a healthcare professional. Your data is not used to train AI models.*";

async function callAI(body: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI service not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI is busy — please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in Settings → Workspace → Usage.");
  if (!res.ok) {
    const txt = await res.text();
    console.error("AI error:", res.status, txt);
    throw new Error("AI service error. Please try again.");
  }
  return res.json();
}

const labSchema = z.object({
  name: z.string(),
  value: z.string(),
  unit: z.string().optional(),
  refRange: z.string().optional(),
  date: z.string(),
});

const labsArraySchema = z.array(labSchema);

const medSchema = z.object({
  id: z.string(),
  name: z.string(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  timesOfDay: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

const profileSchema = z.object({
  age: z.number().optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
  conditions: z.string().optional(),
});

function profileLine(p?: z.infer<typeof profileSchema>) {
  if (!p) return "No profile provided.";
  const parts: string[] = [];
  if (p.age) parts.push(`age ${p.age}`);
  if (p.sex) parts.push(p.sex);
  if (p.weightKg) parts.push(`${p.weightKg}kg`);
  if (p.heightCm) parts.push(`${p.heightCm}cm`);
  if (p.conditions) parts.push(`conditions: ${p.conditions}`);
  return parts.length ? parts.join(", ") : "No profile provided.";
}

/* ----------------------- summarize labs ----------------------- */
export const summarizeLabs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      labs: z.array(labSchema.extend({ id: z.string() })),
      profile: profileSchema.optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.labs.length === 0) {
      return { text: "Add at least one lab result to generate a summary." + DISCLAIMER };
    }
    const labList = data.labs
      .map((l) => `- ${l.date} — ${l.name}: ${l.value} ${l.unit ?? ""} ${l.refRange ? `(ref ${l.refRange})` : ""}`)
      .join("\n");

    const json = await callAI({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a careful, plain-language health information assistant. Summarize lab results for a layperson. Use markdown with short sections: **Overview**, **What looks good**, **What to watch**, **Possible next steps**. Be cautious, never diagnose. Keep under 220 words.",
        },
        {
          role: "user",
          content: `Profile: ${profileLine(data.profile)}\n\nLab results:\n${labList}`,
        },
      ],
    });
    const text = json.choices?.[0]?.message?.content ?? "No summary generated.";
    return { text: text + DISCLAIMER };
  });

/* ----------------------- advise labs ----------------------- */
export const adviseLabs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      labs: z.array(labSchema.extend({ id: z.string() })),
      profile: profileSchema.optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const labList = data.labs
      .map((l) => `- ${l.date} — ${l.name}: ${l.value} ${l.unit ?? ""}`)
      .join("\n") || "(none)";
    const json = await callAI({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You recommend relevant follow-up lab tests based on existing results and profile. Use markdown: a short intro, then a bullet list of `**Test name** — one-line reason`. Max 6 tests. Be cautious, suggest discussing with a clinician.",
        },
        {
          role: "user",
          content: `Profile: ${profileLine(data.profile)}\n\nExisting labs:\n${labList}`,
        },
      ],
    });
    const text = json.choices?.[0]?.message?.content ?? "No advice generated.";
    return { text: text + DISCLAIMER };
  });

/* ----------------------- summarize meds ----------------------- */
export const summarizeMeds = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      meds: z.array(medSchema),
      profile: profileSchema.optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.meds.length === 0) {
      return { text: "Add at least one medication to generate a summary." + DISCLAIMER };
    }
    const medList = data.meds
      .map(
        (m) =>
          `- ${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? `, ${m.frequency}` : ""}${m.startDate ? ` (from ${m.startDate}${m.endDate ? ` to ${m.endDate}` : ""})` : ""}`,
      )
      .join("\n");

    const json = await callAI({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Summarize a medication list for a layperson. Use markdown sections: **Active medications**, **Possible interactions to ask about**, **Adherence tips**. Mention any common supplement/food interactions. Be cautious, never prescribe. Keep under 220 words.",
        },
        {
          role: "user",
          content: `Profile: ${profileLine(data.profile)}\n\nMedications:\n${medList}`,
        },
      ],
    });
    const text = json.choices?.[0]?.message?.content ?? "No summary generated.";
    return { text: text + DISCLAIMER };
  });

/* ----------------------- advise meds ----------------------- */
export const adviseMeds = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      meds: z.array(medSchema),
      profile: profileSchema.optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const medList = data.meds.map((m) => `- ${m.name}${m.dosage ? ` ${m.dosage}` : ""}`).join("\n") || "(none)";
    const json = await callAI({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Suggest lifestyle and supplement considerations relevant to the user's medications and profile. Use markdown: brief intro, then a bullet list of `**Suggestion** — one-line rationale`. Max 6 items. Always say to discuss with a pharmacist or clinician.",
        },
        {
          role: "user",
          content: `Profile: ${profileLine(data.profile)}\n\nMedications:\n${medList}`,
        },
      ],
    });
    const text = json.choices?.[0]?.message?.content ?? "No advice generated.";
    return { text: text + DISCLAIMER };
  });

/* ----------------------- suggest medication names ----------------------- */
export const suggestMeds = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const json = await callAI({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content:
            'Return a JSON array of up to 6 common medication or supplement names that match the user query (generic name preferred). Output ONLY JSON like ["Metformin","Atorvastatin"]. No prose.',
        },
        { role: "user", content: data.query },
      ],
    });
    const raw: string = json.choices?.[0]?.message?.content ?? "[]";
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const arr = JSON.parse(cleaned);
      if (Array.isArray(arr)) {
        return { suggestions: arr.filter((x) => typeof x === "string").slice(0, 6) };
      }
    } catch {
      /* fall through */
    }
    return { suggestions: [] };
  });

/* ----------------------- parse lab file (image/pdf) ----------------------- */
export const parseLabFile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      dataUrl: z.string().min(20).max(15_000_000), // base64 data URL
      mimeType: z.string(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const isPdf = data.mimeType === "application/pdf";
    // Gemini multimodal via OpenAI-compatible: use image_url with a data URL.
    // PDFs are accepted by Gemini as inline data.
    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          'Extract every lab test result from this document. Return ONLY a valid JSON array, no prose, no code fences. Each element: {"name": string, "value": string, "unit"?: string, "refRange"?: string, "date": "YYYY-MM-DD"}. Use today\'s date if none is found. If no results, return [].',
      },
      {
        type: "image_url",
        image_url: { url: data.dataUrl },
      },
    ];
    void isPdf;
    let json;
    try {
      json = await callAI({
        model: VISION_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a precise medical document parser. Output strictly valid JSON, no commentary.",
          },
          { role: "user", content: userContent },
        ],
      });
    } catch (e) {
      return { results: [], error: e instanceof Error ? e.message : "Parse failed" };
    }

    const raw: string = json.choices?.[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      const validated = labsArraySchema.parse(parsed);
      return { results: validated, error: null };
    } catch (e) {
      console.error("Parse failure:", e, raw.slice(0, 200));
      return {
        results: [],
        error:
          "We couldn't read the results from this file. Try a clearer photo or PDF, or enter values manually.",
      };
    }
  });
