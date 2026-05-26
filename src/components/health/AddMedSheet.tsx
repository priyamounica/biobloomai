import { useState, useEffect, useRef } from "react";
import { Loader2, X, Sparkles, Upload, Pill } from "lucide-react";
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
import { medMetadata, parseMedFile } from "@/lib/ai-health.functions";
import { createMed, updateMed as updateMedFn } from "@/lib/health.functions";
import { useHealthStore, type Medication } from "@/lib/store";
import { useAuth } from "@/lib/auth";
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

export function AddMedSheet({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Medication | null;
}) {
  const [draft, setDraft] = useState<Draft>(empty());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [parsing, setParsing] = useState(false);
  const lastPickedRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const suggest = useServerFn(suggestMeds);
  const meta = useServerFn(medMetadata);
  const parse = useServerFn(parseMedFile);
  const cloudCreate = useServerFn(createMed);
  const cloudUpdate = useServerFn(updateMedFn);
  const { user } = useAuth();

  const addMed = useHealthStore((s) => s.addMed);
  const updateMedLocal = useHealthStore((s) => s.updateMed);

  // load editing values
  useEffect(() => {
    if (editing) {
      setDraft({
        name: editing.name,
        dosage: editing.dosage ?? "",
        frequency: editing.frequency ?? "",
        timesOfDay: editing.timesOfDay ?? [],
        startDate: editing.startDate ?? new Date().toISOString().slice(0, 10),
        endDate: editing.endDate ?? "",
        notes: editing.notes ?? "",
      });
      lastPickedRef.current = editing.name;
      setSuggestionsDismissed(true);
    } else if (open) {
      setDraft(empty());
      lastPickedRef.current = "";
      setSuggestionsDismissed(false);
    }
  }, [editing, open]);

  // name suggestions
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
      } catch { /* noop */ }
      finally { setLoadingSugg(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [draft.name, suggest, suggestionsDismissed]);

  const autofillFromName = async (name: string) => {
    if (!name.trim() || editing) return;
    setAutofilling(true);
    try {
      const m = await meta({ data: { name } });
      setDraft((d) => ({
        ...d,
        dosage: d.dosage || m.dosage,
        frequency: d.frequency || m.frequency,
        timesOfDay: d.timesOfDay && d.timesOfDay.length ? d.timesOfDay : m.timesOfDay,
        notes: d.notes || m.notes,
      }));
    } catch { /* silent */ }
    finally { setAutofilling(false); }
  };

  const pickName = (name: string) => {
    lastPickedRef.current = name;
    setDraft((d) => ({ ...d, name }));
    setSuggestions([]);
    setSuggestionsDismissed(true);
    autofillFromName(name);
  };

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)."); return; }
    setParsing(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      const result = await parse({ data: { dataUrl, mimeType: file.type } });
      if (result.error || result.results.length === 0) {
        toast.error(result.error || "Couldn't identify a medication.");
      } else {
        const first = result.results[0];
        setDraft((d) => ({
          ...d,
          name: first.name,
          dosage: first.dosage ?? d.dosage,
          frequency: first.frequency ?? d.frequency,
          timesOfDay: first.timesOfDay ?? d.timesOfDay,
          notes: first.notes ?? d.notes,
        }));
        lastPickedRef.current = first.name;
        setSuggestionsDismissed(true);
        if (result.results.length > 1) {
          toast.success(`Found ${result.results.length} meds — first auto-filled. Save & add the rest separately.`);
        } else {
          toast.success(`Filled from image: ${first.name}`);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read this file.");
    } finally {
      setParsing(false);
    }
  };

  const toggleTime = (t: string) =>
    setDraft((d) => ({
      ...d,
      timesOfDay: d.timesOfDay?.includes(t)
        ? d.timesOfDay.filter((x) => x !== t)
        : [...(d.timesOfDay ?? []), t],
    }));

  const save = async () => {
    if (!draft.name.trim()) { toast.error("Please enter a medication name."); return; }
    if (user) {
      try {
        if (editing) {
          await cloudUpdate({
            data: {
              id: editing.id,
              patch: {
                name: draft.name,
                dosage: draft.dosage || null,
                frequency: draft.frequency || null,
                times_of_day: draft.timesOfDay?.length ? draft.timesOfDay : null,
                start_date: draft.startDate || null,
                end_date: draft.endDate || null,
                notes: draft.notes || null,
              },
            },
          });
          updateMedLocal(editing.id, draft);
        } else {
          const { med } = await cloudCreate({
            data: {
              name: draft.name,
              dosage: draft.dosage || null,
              frequency: draft.frequency || null,
              times_of_day: draft.timesOfDay?.length ? draft.timesOfDay : null,
              start_date: draft.startDate || null,
              end_date: draft.endDate || null,
              notes: draft.notes || null,
            },
          });
          useHealthStore.setState((s) => ({
            meds: [
              {
                id: med.id,
                name: med.name,
                dosage: med.dosage ?? undefined,
                frequency: med.frequency ?? undefined,
                timesOfDay: med.times_of_day ?? undefined,
                startDate: med.start_date ?? undefined,
                endDate: med.end_date ?? undefined,
                notes: med.notes ?? undefined,
                createdAt: new Date(med.created_at).getTime(),
              },
              ...s.meds,
            ],
          }));
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
        return;
      }
    } else {
      if (editing) updateMedLocal(editing.id, draft);
      else addMed(draft);
    }
    toast.success(`${draft.name} ${editing ? "updated" : "added"}.`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="px-0">
          <SheetTitle className="font-serif text-2xl">{editing ? "Edit medication" : "Add medication"}</SheetTitle>
          <SheetDescription>
            AI suggests names + auto-fills dosage. Upload a strip or prescription photo to auto-fill.
          </SheetDescription>
        </SheetHeader>

        {!editing && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
              className="mt-5 w-full rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-sage/30 transition py-5 flex flex-col items-center text-center px-4"
            >
              {parsing ? (
                <><Loader2 className="h-5 w-5 text-primary animate-spin mb-2" /><p className="text-sm font-medium">Reading image…</p></>
              ) : (
                <><Upload className="h-5 w-5 text-primary mb-2" /><p className="text-sm font-medium">Upload med photo or prescription</p><p className="text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG · max 10MB</p></>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/jpg,image/webp,image/heic"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </>
        )}

        <div className="mt-5 space-y-4">
          <div className="relative">
            <Label className="text-xs">Name</Label>
            <div className="relative">
              <Input
                value={draft.name}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.trim().toLowerCase() !== lastPickedRef.current.toLowerCase()) {
                    if (suggestionsDismissed) setSuggestionsDismissed(false);
                    lastPickedRef.current = "";
                  }
                  setDraft({ ...draft, name: v });
                }}
                onBlur={() => {
                  if (draft.name.trim() && !editing && !draft.dosage) autofillFromName(draft.name);
                }}
                placeholder="e.g. Metformin or Dolo 650"
                autoFocus
              />
              {autofilling && (
                <Loader2 className="h-3.5 w-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            {!suggestionsDismissed && (suggestions.length > 0 || loadingSugg) && (
              <div className="absolute z-20 mt-1 left-0 right-0 rounded-xl border border-border bg-popover shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-sage/30">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3 w-3 inline mr-1" />AI suggestions</span>
                  <button type="button" onClick={() => { setSuggestions([]); setSuggestionsDismissed(true); }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <X className="h-3 w-3" /> Dismiss
                  </button>
                </div>
                {loadingSugg && <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> AI suggesting…</div>}
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => pickName(s)} className="block w-full text-left px-3 py-2 text-sm hover:bg-sage/60 flex items-center gap-2">
                    <Pill className="h-3 w-3 text-primary" />{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Dosage</Label>
              <Input value={draft.dosage ?? ""} onChange={(e) => setDraft({ ...draft, dosage: e.target.value })} placeholder="500 mg" />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Input value={draft.frequency ?? ""} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} placeholder="Twice daily" />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Time of day</Label>
            <div className="flex flex-wrap gap-2">
              {TIMES.map((t) => {
                const active = draft.timesOfDay?.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleTime(t)} className={"px-3 py-1.5 rounded-full text-sm border transition " + (active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-sage/50")}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start date</Label>
              <Input type="date" value={draft.startDate ?? ""} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">End date (optional)</Label>
              <Input type="date" value={draft.endDate ?? ""} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="With food, side effects, etc." rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button onClick={save}>{editing ? "Save changes" : "Save medication"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
