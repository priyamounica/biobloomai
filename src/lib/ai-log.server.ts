// Server-only helper to insert AI usage logs. Best-effort: never throws.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SENSITIVE = /\b(\d{3}-\d{2}-\d{4}|\d{16})\b/g;

function clip(s: string | undefined | null, n = 800) {
  if (!s) return null;
  const cleaned = s.replace(SENSITIVE, "[redacted]");
  return cleaned.length > n ? cleaned.slice(0, n) + "…" : cleaned;
}

export type LogAiInput = {
  userId?: string | null;
  kind: string;
  model: string;
  input?: string;
  output?: string;
  status?: "ok" | "error";
  error?: string;
  tokensIn?: number;
  tokensOut?: number;
  durationMs?: number;
};

const FLAG_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\b(suicide|kill myself|self-harm)\b/i, reason: "self-harm language" },
  { re: /\bemergency\b|\b911\b/i, reason: "emergency mention" },
  { re: /diagnos(e|is)\b/i, reason: "diagnostic language" },
  { re: /\bprescrib(e|ing)\b/i, reason: "prescription language" },
];

export async function logAi(entry: LogAiInput) {
  try {
    const combined = `${entry.input ?? ""}\n${entry.output ?? ""}`;
    const match = FLAG_PATTERNS.find((p) => p.re.test(combined));
    await supabaseAdmin.from("ai_logs").insert({
      user_id: entry.userId ?? null,
      kind: entry.kind,
      model: entry.model,
      input_preview: clip(entry.input),
      output_preview: clip(entry.output),
      status: entry.status ?? "ok",
      error: entry.error ?? null,
      tokens_in: entry.tokensIn ?? null,
      tokens_out: entry.tokensOut ?? null,
      duration_ms: entry.durationMs ?? null,
      flagged: !!match,
      flag_reason: match?.reason ?? null,
    });
  } catch (e) {
    console.error("ai_logs insert failed", e);
  }
}
