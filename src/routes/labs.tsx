import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, FlaskConical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthStore, type LabResult } from "@/lib/store";
import { AddLabSheet } from "@/components/health/AddLabSheet";
import { AISection } from "@/components/health/AISection";
import { SignupNudge } from "@/components/health/SignupNudge";
import { UnsavedDataGuard } from "@/components/health/UnsavedDataGuard";
import { useServerFn } from "@tanstack/react-start";
import { summarizeLabs, adviseLabs } from "@/lib/ai.functions";

export const Route = createFileRoute("/labs")({
  component: LabsPage,
  head: () => ({
    meta: [
      { title: "Labs — Verdant" },
      {
        name: "description",
        content:
          "Add lab results manually or upload a PDF/photo. Get an AI summary and suggested follow-up tests.",
      },
    ],
  }),
});

function LabsPage() {
  const labs = useHealthStore((s) => s.labs);
  const removeLab = useHealthStore((s) => s.removeLab);
  const profile = useHealthStore((s) => s.profile);
  const labsSummary = useHealthStore((s) => s.labsSummary);
  const labsAdvice = useHealthStore((s) => s.labsAdvice);
  const setLabsSummary = useHealthStore((s) => s.setLabsSummary);
  const setLabsAdvice = useHealthStore((s) => s.setLabsAdvice);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LabResult | null>(null);
  const [sumLoading, setSumLoading] = useState(false);
  const [sumError, setSumError] = useState<string | null>(null);
  const [advLoading, setAdvLoading] = useState(false);
  const [advError, setAdvError] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(false);

  const summarize = useServerFn(summarizeLabs);
  const advise = useServerFn(adviseLabs);

  const grouped = useMemo(() => {
    const map = new Map<string, LabResult[]>();
    [...labs]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .forEach((l) => {
        const arr = map.get(l.date) ?? [];
        arr.push(l);
        map.set(l.date, arr);
      });
    return Array.from(map.entries());
  }, [labs]);

  const handleSummarize = async () => {
    setSumLoading(true);
    setSumError(null);
    try {
      const r = await summarize({ data: { labs, profile } });
      setLabsSummary(r.text);
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
      const r = await advise({ data: { labs, profile } });
      setLabsAdvice(r.text);
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
          <p className="text-sm text-terracotta font-medium uppercase tracking-wider">Lab Results</p>
          <h1 className="font-serif text-4xl sm:text-5xl mt-1">Your lab timeline</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Upload a PDF or photo, or enter values manually. AI will summarise what they
            mean and suggest relevant next tests.
          </p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)} className="rounded-full">
          <Plus className="h-4 w-4 mr-1" /> Add test
        </Button>
      </div>

      {/* Empty state */}
      {labs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
          <FlaskConical className="h-10 w-10 text-primary mx-auto mb-3" />
          <h2 className="font-serif text-2xl">No lab results yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Add your first test to get an AI summary. Try uploading a recent lab report PDF.
          </p>
          <Button onClick={() => setOpen(true)} className="mt-5 rounded-full">
            <Plus className="h-4 w-4 mr-1" /> Add your first test
          </Button>
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div className="space-y-8 mb-12">
            {grouped.map(([date, items]) => (
              <div key={date} className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-serif text-xl">
                    {new Date(date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {items.length} result{items.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {items.map((l) => (
                    <div
                      key={l.id}
                      className="rounded-xl bg-card border border-border/60 p-4 flex items-start justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{l.name}</p>
                        <p className="text-2xl font-serif text-primary mt-0.5">
                          {l.value}{" "}
                          <span className="text-base text-muted-foreground font-sans">
                            {l.unit}
                          </span>
                        </p>
                        {l.refRange && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ref: {l.refRange}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => {
                            setEditing(l);
                            setOpen(true);
                          }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeLab(l.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                        onClick={() => removeLab(l.id)}
                        className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* AI sections */}
          <div className="space-y-6">
            <AISection
              title="AI summary"
              description="Plain-language overview of your results."
              content={labsSummary}
              loading={sumLoading}
              error={sumError}
              onGenerate={handleSummarize}
              ctaLabel="Generate summary"
              contextHint={`Based on ${labs.length} lab result${labs.length === 1 ? "" : "s"} you've entered${profile.age ? ` and your profile (age ${profile.age}${profile.sex ? `, ${profile.sex}` : ""})` : ""}. Generated by an AI model — your data is not used for training.`}
            />
            <AISection
              title="Get AI advice"
              description="Relevant follow-up tests to consider."
              content={labsAdvice}
              loading={advLoading}
              error={advError}
              onGenerate={handleAdvise}
              ctaLabel="Suggest next tests"
              variant="accent"
              contextHint="Suggestions are based on the labs and profile info you've entered."
            />
            <SignupNudge visible={showNudge && (!!labsSummary || !!labsAdvice)} />
          </div>
        </>
      )}

      <AddLabSheet open={open} onOpenChange={setOpen} />
    </div>
  );
}
