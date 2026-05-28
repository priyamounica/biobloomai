import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Pill, Clock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthStore, type Medication } from "@/lib/store";
import { AddMedSheet } from "@/components/health/AddMedSheet";
import { AISection } from "@/components/health/AISection";
import { SignupNudge } from "@/components/health/SignupNudge";
import { UnsavedDataGuard } from "@/components/health/UnsavedDataGuard";
import { useServerFn } from "@tanstack/react-start";
import { summarizeMeds, adviseMeds } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/meds")({
  component: MedsPage,
  head: () => ({
    meta: [
      { title: "Medications — Verdant" },
      {
        name: "description",
        content:
          "Track your current and past medications. Get AI-powered notes on interactions and adherence.",
      },
    ],
  }),
});

const isActive = (m: Medication) => !m.endDate || m.endDate >= new Date().toISOString().slice(0, 10);

function MedsPage() {
  const meds = useHealthStore((s) => s.meds);
  const removeMed = useHealthStore((s) => s.removeMed);
  const profile = useHealthStore((s) => s.profile);
  const medsSummary = useHealthStore((s) => s.medsSummary);
  const medsAdvice = useHealthStore((s) => s.medsAdvice);
  const setMedsSummary = useHealthStore((s) => s.setMedsSummary);
  const setMedsAdvice = useHealthStore((s) => s.setMedsAdvice);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [sumLoading, setSumLoading] = useState(false);
  const [sumError, setSumError] = useState<string | null>(null);
  const [advLoading, setAdvLoading] = useState(false);
  const [advError, setAdvError] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(false);

  const summarize = useServerFn(summarizeMeds);
  const advise = useServerFn(adviseMeds);

  const { active, inactive } = useMemo(() => {
    return {
      active: meds.filter(isActive),
      inactive: meds.filter((m) => !isActive(m)),
    };
  }, [meds]);

  const handleSummarize = async () => {
    setSumLoading(true);
    setSumError(null);
    try {
      const r = await summarize({ data: { meds, profile } });
      setMedsSummary(r.text);
      setShowNudge(true);
    } catch (e) {
      setSumError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSumLoading(false);
    }
  };
  const handleAdvise = async () => {
    setAdvLoading(true);
    setAdvError(null);
    try {
      const r = await advise({ data: { meds, profile } });
      setMedsAdvice(r.text);
      setShowNudge(true);
    } catch (e) {
      setAdvError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdvLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-8 py-10 sm:py-14">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-sm text-terracotta font-medium uppercase tracking-wider">Medications</p>
          <h1 className="font-serif text-4xl sm:text-5xl mt-1">Your medication list</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Log current and past medications. AI helps spot potential interactions and
            adherence tips.
          </p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)} className="rounded-full">
          <Plus className="h-4 w-4 mr-1" /> Add medication
        </Button>
      </div>

      {meds.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
          <Pill className="h-10 w-10 text-primary mx-auto mb-3" />
          <h2 className="font-serif text-2xl">No medications added</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Add medications or supplements to get an AI summary with adherence tips.
          </p>
          <Button onClick={() => setOpen(true)} className="mt-5 rounded-full">
            <Plus className="h-4 w-4 mr-1" /> Add medication
          </Button>
        </div>
      ) : (
        <>
          <Section
            title="Active"
            items={active}
            onRemove={removeMed}
            onEdit={(m) => {
              setEditing(m);
              setOpen(true);
            }}
            active
          />
          {inactive.length > 0 && (
            <Section
              title="Inactive (past)"
              items={inactive}
              onRemove={removeMed}
              onEdit={(m) => {
                setEditing(m);
                setOpen(true);
              }}
            />
          )}

          <div className="space-y-6 mt-12">
            <AISection
              title="AI summary"
              description="Quick overview, interactions to ask about, adherence tips."
              content={medsSummary}
              loading={sumLoading}
              error={sumError}
              onGenerate={handleSummarize}
              ctaLabel="Generate summary"
              pdfFilename="biobloomai-meds-summary.pdf"
              contextHint={`Based on ${meds.length} medication${meds.length === 1 ? "" : "s"} (${active.length} active).`}
            />
            <AISection
              title="Get AI advice"
              description="Lifestyle and supplement suggestions relevant to your meds."
              content={medsAdvice}
              loading={advLoading}
              error={advError}
              onGenerate={handleAdvise}
              ctaLabel="Suggest considerations"
              variant="accent"
              pdfFilename="biobloomai-meds-advice.pdf"
              contextHint="Suggestions are tailored to the medications you've listed."
            />
            <SignupNudge visible={showNudge && (!!medsSummary || !!medsAdvice)} />
          </div>
        </>
      )}

      <AddMedSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
      />
      <UnsavedDataGuard />
    </div>
  );
}

function Section({
  title,
  items,
  onRemove,
  active,
}: {
  title: string;
  items: Medication[];
  onRemove: (id: string) => void;
  active?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl mb-3 flex items-center gap-2">
        {title}
        <span className="text-xs font-sans text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((m) => (
          <div
            key={m.id}
            className={cn(
              "rounded-xl border border-border/60 p-4 group transition",
              active ? "bg-card" : "bg-card/50 opacity-80",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate flex items-center gap-2">
                  {m.name}
                  {!active && (
                    <span className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      ended
                    </span>
                  )}
                </p>
                {(m.dosage || m.frequency) && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {[m.dosage, m.frequency].filter(Boolean).join(" · ")}
                  </p>
                )}
                {m.timesOfDay && m.timesOfDay.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.timesOfDay.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-[11px] bg-sage text-sage-foreground px-2 py-0.5 rounded-full"
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {m.notes && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.notes}</p>
                )}
              </div>
              <button
                onClick={() => onRemove(m.id)}
                className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
