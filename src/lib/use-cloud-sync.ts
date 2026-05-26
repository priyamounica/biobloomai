import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useHealthStore } from "@/lib/store";
import {
  createLabs,
  createMeds,
  getHealthProfile,
  listLabs,
  listMeds,
} from "@/lib/health.functions";

/**
 * Hybrid sync hook:
 * On sign-in:
 *  1. If user has local labs/meds, push them to cloud (one-time per user)
 *  2. Hydrate local store from cloud (authoritative)
 *  3. If user has not completed onboarding, redirect to /onboarding
 */
export function useCloudSync() {
  const { user, loading } = useAuth();
  const labs = useHealthStore((s) => s.labs);
  const meds = useHealthStore((s) => s.meds);
  const setLabs = useHealthStore((s) => s.setLabs);
  const setMeds = useHealthStore((s) => s.setMeds);
  const setSyncedUserId = useHealthStore((s) => s.setSyncedUserId);
  const syncedUserId = useHealthStore((s) => s.syncedUserId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const pushLabs = useServerFn(createLabs);
  const pushMeds = useServerFn(createMeds);
  const fetchLabs = useServerFn(listLabs);
  const fetchMeds = useServerFn(listMeds);
  const fetchProfile = useServerFn(getHealthProfile);

  const ran = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (ran.current === user.id) return;
    if (syncedUserId === user.id) {
      ran.current = user.id;
      return;
    }
    ran.current = user.id;

    (async () => {
      try {
        // 1. Push local guest data, if any
        if (labs.length > 0) {
          await pushLabs({
            data: {
              labs: labs.map((l) => ({
                name: l.name,
                value: l.value,
                unit: l.unit || null,
                ref_range: l.refRange || null,
                date: l.date,
                notes: l.notes || null,
              })),
            },
          });
        }
        if (meds.length > 0) {
          await pushMeds({
            data: {
              meds: meds.map((m) => ({
                name: m.name,
                dosage: m.dosage || null,
                frequency: m.frequency || null,
                times_of_day: m.timesOfDay && m.timesOfDay.length ? m.timesOfDay : null,
                start_date: m.startDate || null,
                end_date: m.endDate || null,
                notes: m.notes || null,
              })),
            },
          });
          if (labs.length || meds.length) {
            toast.success(`Synced ${labs.length} lab(s) & ${meds.length} med(s) to your account.`);
          }
        }

        // 2. Hydrate from cloud
        const [labsRes, medsRes, profileRes] = await Promise.all([
          fetchLabs(),
          fetchMeds(),
          fetchProfile(),
        ]);
        setLabs(
          labsRes.labs.map((l) => ({
            id: l.id,
            name: l.name,
            value: l.value,
            unit: l.unit ?? undefined,
            refRange: l.ref_range ?? undefined,
            date: l.date,
            notes: l.notes ?? undefined,
            createdAt: new Date(l.created_at).getTime(),
          })),
        );
        setMeds(
          medsRes.meds.map((m) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage ?? undefined,
            frequency: m.frequency ?? undefined,
            timesOfDay: m.times_of_day ?? undefined,
            startDate: m.start_date ?? undefined,
            endDate: m.end_date ?? undefined,
            notes: m.notes ?? undefined,
            createdAt: new Date(m.created_at).getTime(),
          })),
        );
        setSyncedUserId(user.id);
        queryClient.invalidateQueries();

        // 3. Onboarding gate
        if (!profileRes.profile || !profileRes.profile.onboarded) {
          if (!window.location.pathname.startsWith("/onboarding")) {
            navigate({ to: "/onboarding" });
          }
        }
      } catch (e) {
        console.error("Cloud sync failed", e);
        toast.error("Couldn't sync data. We'll retry on next sign-in.");
      }
    })();
  }, [
    user,
    loading,
    syncedUserId,
    labs,
    meds,
    pushLabs,
    pushMeds,
    fetchLabs,
    fetchMeds,
    fetchProfile,
    setLabs,
    setMeds,
    setSyncedUserId,
    navigate,
    queryClient,
  ]);
}
