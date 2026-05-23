import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type LabResult = {
  id: string;
  name: string;
  value: string;
  unit?: string;
  refRange?: string;
  date: string; // ISO yyyy-mm-dd
  notes?: string;
  createdAt: number;
};

export type Medication = {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  timesOfDay?: string[];
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: number;
};

export type MiniProfile = {
  age?: number;
  sex?: "male" | "female" | "other";
  weightKg?: number;
  heightCm?: number;
  conditions?: string;
};

type State = {
  labs: LabResult[];
  meds: Medication[];
  profile: MiniProfile;
  labsSummary?: string;
  labsAdvice?: string;
  medsSummary?: string;
  medsAdvice?: string;
  signupNudgeDismissed: boolean;
  addLab: (l: Omit<LabResult, "id" | "createdAt">) => void;
  addLabs: (ls: Omit<LabResult, "id" | "createdAt">[]) => void;
  updateLab: (id: string, patch: Partial<LabResult>) => void;
  removeLab: (id: string) => void;
  addMed: (m: Omit<Medication, "id" | "createdAt">) => void;
  updateMed: (id: string, patch: Partial<Medication>) => void;
  removeMed: (id: string) => void;
  setProfile: (p: MiniProfile) => void;
  setLabsSummary: (s: string) => void;
  setLabsAdvice: (s: string) => void;
  setMedsSummary: (s: string) => void;
  setMedsAdvice: (s: string) => void;
  dismissSignupNudge: () => void;
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const useHealthStore = create<State>()(
  persist(
    (set) => ({
      labs: [],
      meds: [],
      profile: {},
      signupNudgeDismissed: false,
      addLab: (l) =>
        set((s) => ({ labs: [{ ...l, id: uid(), createdAt: Date.now() }, ...s.labs] })),
      addLabs: (ls) =>
        set((s) => ({
          labs: [
            ...ls.map((l) => ({ ...l, id: uid(), createdAt: Date.now() })),
            ...s.labs,
          ],
        })),
      updateLab: (id, patch) =>
        set((s) => ({ labs: s.labs.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      removeLab: (id) => set((s) => ({ labs: s.labs.filter((l) => l.id !== id) })),
      addMed: (m) =>
        set((s) => ({ meds: [{ ...m, id: uid(), createdAt: Date.now() }, ...s.meds] })),
      updateMed: (id, patch) =>
        set((s) => ({ meds: s.meds.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMed: (id) => set((s) => ({ meds: s.meds.filter((m) => m.id !== id) })),
      setProfile: (p) => set({ profile: p }),
      setLabsSummary: (s) => set({ labsSummary: s }),
      setLabsAdvice: (s) => set({ labsAdvice: s }),
      setMedsSummary: (s) => set({ medsSummary: s }),
      setMedsAdvice: (s) => set({ medsAdvice: s }),
      dismissSignupNudge: () => set({ signupNudgeDismissed: true }),
    }),
    {
      name: "health-store-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage),
      ),
      partialize: (s) => ({
        labs: s.labs,
        meds: s.meds,
        profile: s.profile,
        labsSummary: s.labsSummary,
        labsAdvice: s.labsAdvice,
        medsSummary: s.medsSummary,
        medsAdvice: s.medsAdvice,
        signupNudgeDismissed: s.signupNudgeDismissed,
      }),
    },
  ),
);
