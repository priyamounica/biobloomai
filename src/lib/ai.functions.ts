import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { logAi } from "./ai-log.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TEXT_MODEL = "google/gemini-3-flash-preview";
const VISION_MODEL = "google/gemini-2.5-flash";

const DISCLAIMER =
  "\n\n---\n*For informational purposes only. Please consult a healthcare professional. Your data is not used to train AI models.*";

async function callAI(
  body: Record<string, unknown>,
  log: { kind: string; input: string },
) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI service not configured");
  const model = String(body.model ?? "");
  const started = Date.now();
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) throw new Error("AI is busy — please try again in a moment.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Please add credits in Settings → Workspace → Usage.");
    if (!res.ok) {
      const txt = await res.text();
      console.error("AI error:", res.status, txt);
      throw new Error("AI service error. Please try again.");
    }
    const json = await res.json();
    const output: string = json.choices?.[0]?.message?.content ?? "";
    await logAi({
      kind: log.kind,
      model,
      input: log.input,
      output,
      status: "ok",
      tokensIn: json.usage?.prompt_tokens,
      tokensOut: json.usage?.completion_tokens,
      durationMs: Date.now() - started,
    });
    return json;
  } catch (e) {
    await logAi({
      kind: log.kind,
      model,
      input: log.input,
      status: "error",
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - started,
    });
    throw e;
  }
}

const labSchema = z.object({
  name: z.string().min(1).max(200),
  value: z.string().min(1).max(100),
  unit: z.string().max(60).optional(),
  refRange: z.string().max(120).optional(),
  date: z.string().max(20),
});

const labsArraySchema = z.array(labSchema);

const medSchema = z.object({
  id: z.string().max(80),
  name: z.string().min(1).max(200),
  dosage: z.string().max(60).optional(),
  frequency: z.string().max(120).optional(),
  timesOfDay: z.array(z.string().max(40)).max(8).optional(),
  startDate: z.string().max(20).optional(),
  endDate: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
});

const profileSchema = z.object({
  age: z.number().min(0).max(140).optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  weightKg: z.number().min(0).max(700).optional(),
  heightCm: z.number().min(0).max(280).optional(),
  conditions: z.string().max(2000).optional(),
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
      labs: z.array(labSchema.extend({ id: z.string().max(80) })).max(200),
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

    const json = await callAI(
      {
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
      },
      { kind: "summarize_labs", input: labList },
    );
    const text = json.choices?.[0]?.message?.content ?? "No summary generated.";
    return { text: text + DISCLAIMER };
  });

/* ----------------------- advise labs ----------------------- */
export const adviseLabs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      labs: z.array(labSchema.extend({ id: z.string().max(80) })).max(200),
      profile: profileSchema.optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const labList = data.labs
      .map((l) => `- ${l.date} — ${l.name}: ${l.value} ${l.unit ?? ""}`)
      .join("\n") || "(none)";
    const json = await callAI(
      {
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
      },
      { kind: "advise_labs", input: labList },
    );
    const text = json.choices?.[0]?.message?.content ?? "No advice generated.";
    return { text: text + DISCLAIMER };
  });

/* ----------------------- summarize meds ----------------------- */
export const summarizeMeds = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      meds: z.array(medSchema).max(200),
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

    const json = await callAI(
      {
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: "Summarize a medication list for a layperson. Use markdown sections: **Active medications**, **Possible interactions to ask about**, **Adherence tips**. Mention any common supplement/food interactions. Be cautious, never prescribe. Keep under 220 words." },
          { role: "user", content: `Profile: ${profileLine(data.profile)}\n\nMedications:\n${medList}` },
        ],
      },
      { kind: "summarize_meds", input: medList },
    );
    const text = json.choices?.[0]?.message?.content ?? "No summary generated.";
    return { text: text + DISCLAIMER };
  });

/* ----------------------- advise meds ----------------------- */
export const adviseMeds = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      meds: z.array(medSchema).max(200),
      profile: profileSchema.optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const medList = data.meds.map((m) => `- ${m.name}${m.dosage ? ` ${m.dosage}` : ""}`).join("\n") || "(none)";
    const json = await callAI(
      {
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: "Suggest lifestyle and supplement considerations relevant to the user's medications and profile. Use markdown: brief intro, then a bullet list of `**Suggestion** — one-line rationale`. Max 6 items. Always say to discuss with a pharmacist or clinician." },
          { role: "user", content: `Profile: ${profileLine(data.profile)}\n\nMedications:\n${medList}` },
        ],
      },
      { kind: "advise_meds", input: medList },
    );
    const text = json.choices?.[0]?.message?.content ?? "No advice generated.";
    return { text: text + DISCLAIMER };
  });

/* ----------------------- suggest medication names ----------------------- */
export const suggestMeds = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const json = await callAI(
      {
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: 'Return a JSON array of up to 6 common medication or supplement names that match the user query (generic name preferred). Output ONLY JSON like ["Metformin","Atorvastatin"]. No prose.' },
          { role: "user", content: data.query },
        ],
      },
      { kind: "suggest_meds", input: data.query },
    );
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
      dataUrl: z.string().min(20).max(15_000_000),
      mimeType: z.string().max(100),
    }).parse(input),
  )
  .handler(async ({ data }) => {
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
    let json;
    try {
      json = await callAI(
        {
          model: VISION_MODEL,
          messages: [
            { role: "system", content: "You are a precise medical document parser. Output strictly valid JSON, no commentary." },
            { role: "user", content: userContent },
          ],
        },
        { kind: "parse_lab_file", input: `mime:${data.mimeType}` },
      );
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
