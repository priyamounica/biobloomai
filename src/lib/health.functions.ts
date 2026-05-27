import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const labInput = z.object({
  name: z.string().min(1).max(200),
  value: z.string().min(1).max(100),
  unit: z.string().max(60).optional().nullable(),
  ref_range: z.string().max(120).optional().nullable(),
  date: z.string().min(8).max(10),
  notes: z.string().max(2000).optional().nullable(),
});

const medInput = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().max(60).optional().nullable(),
  frequency: z.string().max(120).optional().nullable(),
  times_of_day: z.array(z.string().max(40)).max(8).optional().nullable(),
  start_date: z.string().min(8).max(10).optional().nullable(),
  end_date: z.string().min(8).max(10).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const profileInput = z.object({
  age: z.number().int().min(0).max(140).optional().nullable(),
  sex: z.string().max(20).optional().nullable(),
  weight_kg: z.number().min(0).max(700).optional().nullable(),
  height_cm: z.number().min(0).max(280).optional().nullable(),
  bmi: z.number().min(0).max(120).optional().nullable(),
  conditions: z.array(z.string().max(120)).max(40).optional().nullable(),
  family_history: z.array(z.string().max(120)).max(40).optional().nullable(),
  allergies: z.array(z.string().max(120)).max(40).optional().nullable(),
  diet: z.array(z.string().max(60)).max(20).optional().nullable(),
  lifestyle: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  onboarded: z.boolean().optional(),
});

/* ---------------- Labs ---------------- */

export const listLabs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("labs")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { labs: data ?? [] };
  });

export const createLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => labInput.parse(i))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("labs")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { lab: row };
  });

export const createLabs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ labs: z.array(labInput).min(1).max(100) }).parse(i))
  .handler(async ({ context, data }) => {
    const rows = data.labs.map((l) => ({ ...l, user_id: context.userId }));
    const { data: inserted, error } = await context.supabase.from("labs").insert(rows).select();
    if (error) throw new Error(error.message);
    return { labs: inserted ?? [] };
  });

export const updateLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), patch: labInput.partial() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("labs").update(data.patch).eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("labs").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Medications ---------------- */

export const listMeds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("medications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { meds: data ?? [] };
  });

export const createMed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => medInput.parse(i))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("medications")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { med: row };
  });

export const createMeds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ meds: z.array(medInput).min(1).max(100) }).parse(i))
  .handler(async ({ context, data }) => {
    const rows = data.meds.map((m) => ({ ...m, user_id: context.userId }));
    const { data: inserted, error } = await context.supabase.from("medications").insert(rows).select();
    if (error) throw new Error(error.message);
    return { meds: inserted ?? [] };
  });

export const updateMed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), patch: medInput.partial() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("medications").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("medications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Health profile ---------------- */

export const getHealthProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("health_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: data };
  });

export const upsertHealthProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => profileInput.parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("health_profiles")
      .upsert({ ...data, user_id: context.userId }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
