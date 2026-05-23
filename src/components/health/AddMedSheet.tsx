import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useServerFn } from "@tanstack/react-start";
import { suggestMeds } from "@/lib/ai.functions";
import { useHealthStore, type Medication } from "@/lib/store";
import { toast } from "sonner";

type Draft = Omit<Medication, "id" | "createdAt">;

const empty = (): Draft => ({
  name: "",
  dosage: "",
  frequency: "",
  timesOfDay: [],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  notes: "",
});

const TIMES = ["Morning", "Noon", "Evening", "Bedtime"];

export function AddMedSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [draft, setDraft] = useState<Draft>(empty());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const lastPickedRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggest = useServerFn(suggestMeds);
  const addMed = useHealthStore((s) => s.addMed);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const name = draft.name.trim();
    if (
      suggestionsDismissed ||
      name.length < 2 ||
      name.toLowerCase() === lastPickedRef.current.toLowerCase()
    ) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingSugg(true);
      try {
        const r = await suggest({ data: { query: name } });
        setSuggestions(r.suggestions.filter((s) => s.toLowerCase() !== name.toLowerCase()));
      } catch {
        /* silent */
      } finally {
        setLoadingSugg(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft.name, suggest, suggestionsDismissed]);

  const toggleTime = (t: string) =>
    setDraft((d) => ({
      ...d,
      timesOfDay: d.timesOfDay?.includes(t)
        ? d.timesOfDay.filter((x) => x !== t)
        : [...(d.timesOfDay ?? []), t],
    }));

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Please enter a medication name.");
      return;
    }
    addMed(draft);
    toast.success(`${draft.name} added.`);
    setDraft(empty());
    setSuggestions([]);
    setSuggestionsDismissed(false);
    lastPickedRef.current = "";
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setDraft(empty());
          setSuggestions([]);
          setSuggestionsDismissed(false);
          lastPickedRef.current = "";
        }
        onOpenChange(v);
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="px-0">
          <SheetTitle className="font-serif text-2xl">Add medication</SheetTitle>
          <SheetDescription>
            AI suggests common names as you type. Past medications (with an end date) show as inactive.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="relative">
            <Label className="text-xs">Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Start typing… e.g. metformin"
              autoFocus
            />
            {!suggestionsDismissed && (suggestions.length > 0 || loadingSugg) && (
              <div className="absolute z-20 mt-1 left-0 right-0 rounded-xl border border-border bg-popover shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-sage/30">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    AI suggestions
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestions([]);
                      setSuggestionsDismissed(true);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    aria-label="Dismiss suggestions"
                  >
                    <X className="h-3 w-3" /> Dismiss
                  </button>
                </div>
                {loadingSugg && (
                  <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> AI suggesting…
                  </div>
                )}
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      lastPickedRef.current = s;
                      setDraft((d) => ({ ...d, name: s }));
                      setSuggestions([]);
                      setSuggestionsDismissed(true);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-sage/60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Dosage</Label>
              <Input
                value={draft.dosage ?? ""}
                onChange={(e) => setDraft({ ...draft, dosage: e.target.value })}
                placeholder="500 mg"
              />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Input
                value={draft.frequency ?? ""}
                onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}
                placeholder="Twice daily"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Time of day</Label>
            <div className="flex flex-wrap gap-2">
              {TIMES.map((t) => {
                const active = draft.timesOfDay?.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTime(t)}
                    className={
                      "px-3 py-1.5 rounded-full text-sm border transition " +
                      (active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-sage/50")
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start date</Label>
              <Input
                type="date"
                value={draft.startDate ?? ""}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">End date (optional)</Label>
              <Input
                type="date"
                value={draft.endDate ?? ""}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="With food, side effects, etc."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={save}>Save medication</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
