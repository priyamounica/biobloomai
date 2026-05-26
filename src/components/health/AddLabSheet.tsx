import { useState, useRef, useEffect } from "react";
import { Loader2, Upload, Pencil, FileText, Image as ImageIcon, AlertCircle, X, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useServerFn } from "@tanstack/react-start";
import { parseLabFile } from "@/lib/ai.functions";
import { suggestLabTests, labMetadata } from "@/lib/ai-health.functions";
import { createLab, createLabs, updateLab as updateLabFn } from "@/lib/health.functions";
import { useHealthStore, type LabResult } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Draft = Omit<LabResult, "id" | "createdAt">;

const today = () => new Date().toISOString().slice(0, 10);
const emptyRow = (): Draft => ({ name: "", value: "", unit: "", refRange: "", date: today() });

export function AddLabSheet({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: LabResult | null;
}) {
  const [tab, setTab] = useState<"upload" | "manual">("upload");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([emptyRow()]);
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<Record<number, string[]>>({});
  const [unitOptions, setUnitOptions] = useState<Record<number, string[]>>({});
  const [metaLoading, setMetaLoading] = useState<Record<number, boolean>>({});
  const debounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const parse = useServerFn(parseLabFile);
  const suggest = useServerFn(suggestLabTests);
  const meta = useServerFn(labMetadata);
  const cloudCreate = useServerFn(createLab);
  const cloudCreateMany = useServerFn(createLabs);
  const cloudUpdate = useServerFn(updateLabFn);
  const { user } = useAuth();

  const addLabs = useHealthStore((s) => s.addLabs);
  const updateLabLocal = useHealthStore((s) => s.updateLab);

  useEffect(() => {
    if (editing) {
      setDrafts([{ name: editing.name, value: editing.value, unit: editing.unit ?? "", refRange: editing.refRange ?? "", date: editing.date, notes: editing.notes ?? "" }]);
      setTab("manual");
      // load units for edit
      if (editing.name) loadMeta(0, editing.name);
    } else if (open) {
      setDrafts([emptyRow()]);
      setTab("upload");
      setFileInfo(null);
      setParseError(null);
      setLastFile(null);
      setRetryCount(0);
    }
  }, [editing, open]);

  const reset = () => {
    setDrafts([emptyRow()]);
    setParseError(null);
    setFileInfo(null);
    setTab("upload");
    setLastFile(null);
    setRetryCount(0);
    setNameSuggestions({});
    setUnitOptions({});
  };

  const handleFile = async (file: File, isRetry = false) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)."); return; }
    setParsing(true);
    setParseError(null);
    setFileInfo({ name: file.name, type: file.type });
    setLastFile(file);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      const result = await parse({ data: { dataUrl, mimeType: file.type } });
      if (result.error || result.results.length === 0) {
        setParseError(result.error || "No results detected — try a clearer photo, or enter manually.");
        setTab("manual");
        if (isRetry) setRetryCount((c) => c + 1);
      } else {
        setDrafts(result.results);
        setTab("manual");
        toast.success(`Extracted ${result.results.length} result${result.results.length > 1 ? "s" : ""} — please confirm.`);
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Couldn't read this file.");
      setTab("manual");
    } finally {
      setParsing(false);
    }
  };

  const retryParse = () => {
    if (lastFile) {
      setRetryCount((c) => c + 1);
      handleFile(lastFile, true);
    }
  };

  // Debounced name suggestions per row
  const loadNameSuggestions = (i: number, query: string) => {
    if (debounceRef.current[i]) clearTimeout(debounceRef.current[i]);
    if (query.trim().length < 2) {
      setNameSuggestions((m) => ({ ...m, [i]: [] }));
      return;
    }
    debounceRef.current[i] = setTimeout(async () => {
      try {
        const r = await suggest({ data: { query } });
        setNameSuggestions((m) => ({ ...m, [i]: r.suggestions }));
      } catch { /* noop */ }
    }, 350);
  };

  const loadMeta = async (i: number, name: string) => {
    if (!name.trim()) return;
    setMetaLoading((m) => ({ ...m, [i]: true }));
    try {
      const r = await meta({ data: { name } });
      setUnitOptions((m) => ({ ...m, [i]: r.units }));
      setDrafts((ds) =>
        ds.map((d, idx) =>
          idx === i
            ? {
                ...d,
                unit: d.unit || r.commonUnit,
                refRange: d.refRange || r.refRange,
              }
            : d,
        ),
      );
    } catch { /* silent */ }
    finally { setMetaLoading((m) => ({ ...m, [i]: false })); }
  };

  const updateDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const removeDraft = (i: number) => setDrafts((ds) => ds.filter((_, idx) => idx !== i));
  const addDraft = () => setDrafts((ds) => [...ds, emptyRow()]);

  const save = async () => {
    const valid = drafts.filter((d) => d.name.trim() && d.value.trim());
    if (valid.length === 0) { toast.error("Add at least one test with a name and value."); return; }

    if (user) {
      try {
        if (editing) {
          const d = valid[0];
          await cloudUpdate({
            data: {
              id: editing.id,
              patch: {
                name: d.name, value: d.value, unit: d.unit || null,
                ref_range: d.refRange || null, date: d.date, notes: d.notes || null,
              },
            },
          });
          updateLabLocal(editing.id, d);
        } else {
          const { labs } = await cloudCreateMany({
            data: {
              labs: valid.map((d) => ({
                name: d.name, value: d.value, unit: d.unit || null,
                ref_range: d.refRange || null, date: d.date, notes: d.notes || null,
              })),
            },
          });
          useHealthStore.setState((s) => ({
            labs: [
              ...labs.map((l) => ({
                id: l.id, name: l.name, value: l.value,
                unit: l.unit ?? undefined, refRange: l.ref_range ?? undefined,
                date: l.date, notes: l.notes ?? undefined,
                createdAt: new Date(l.created_at).getTime(),
              })),
              ...s.labs,
            ],
          }));
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
        return;
      }
    } else {
      if (editing) updateLabLocal(editing.id, valid[0]);
      else addLabs(valid);
    }
    toast.success(editing ? "Updated." : `Saved ${valid.length} test${valid.length > 1 ? "s" : ""}.`);
    reset();
    onOpenChange(false);
    void cloudCreate;
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v && !editing) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
        <SheetHeader className="px-0">
          <SheetTitle className="font-serif text-2xl">{editing ? "Edit lab result" : "Add lab results"}</SheetTitle>
          <SheetDescription>
            Upload a PDF or photo and AI extracts the values, or enter manually.
          </SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
          {!editing && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1.5" /> Upload</TabsTrigger>
              <TabsTrigger value="manual"><Pencil className="h-4 w-4 mr-1.5" /> Manual</TabsTrigger>
            </TabsList>
          )}

          {!editing && (
            <TabsContent value="upload" className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={parsing}
                className="w-full rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-sage/30 transition py-12 flex flex-col items-center text-center px-6"
              >
                {parsing ? (
                  <><Loader2 className="h-8 w-8 text-primary animate-spin mb-3" /><p className="font-medium">Reading your document…</p><p className="text-sm text-muted-foreground mt-1">This usually takes 5–15 seconds.</p></>
                ) : fileInfo ? (
                  <>{fileInfo.type === "application/pdf" ? <FileText className="h-8 w-8 text-primary mb-3" /> : <ImageIcon className="h-8 w-8 text-primary mb-3" />}<p className="font-medium">{fileInfo.name}</p><p className="text-sm text-muted-foreground mt-1">Click to choose another file</p></>
                ) : (
                  <><Upload className="h-8 w-8 text-primary mb-3" /><p className="font-medium">Upload PDF, JPG, or PNG</p><p className="text-sm text-muted-foreground mt-1">For best results, crop tightly to the results table.</p></>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/jpg,image/webp,image/heic"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {parseError && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 rounded-xl bg-destructive/10 text-destructive p-3 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                  {lastFile && (
                    <Button variant="outline" size="sm" onClick={retryParse} disabled={parsing}>
                      <RefreshCw className="h-3 w-3 mr-1.5" /> Try parsing again {retryCount > 0 && `(${retryCount + 1})`}
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                💡 Tip: a clear, well-lit photo or a native PDF gives the best results. Your file is sent to AI for parsing and discarded — never stored or used for training.
              </p>
            </TabsContent>
          )}

          <TabsContent value="manual" className="mt-4 space-y-4">
            {drafts.map((d, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/50 p-4 grid grid-cols-12 gap-3 relative">
                <div className="col-span-12 sm:col-span-7 relative">
                  <Label className="text-xs flex items-center gap-1">
                    Test name {metaLoading[i] && <Loader2 className="h-3 w-3 animate-spin" />}
                  </Label>
                  <Input
                    value={d.name}
                    onChange={(e) => {
                      updateDraft(i, { name: e.target.value });
                      loadNameSuggestions(i, e.target.value);
                    }}
                    onBlur={() => { if (d.name && !d.refRange) loadMeta(i, d.name); }}
                    placeholder="e.g. HbA1c"
                  />
                  {nameSuggestions[i]?.length > 0 && (
                    <div className="absolute z-20 mt-1 left-0 right-0 rounded-xl border border-border bg-popover shadow-card overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-sage/30">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3 w-3 inline mr-1" />AI suggestions</span>
                        <button type="button" onClick={() => setNameSuggestions((m) => ({ ...m, [i]: [] }))} className="text-xs text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                      </div>
                      {nameSuggestions[i].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            updateDraft(i, { name: s });
                            setNameSuggestions((m) => ({ ...m, [i]: [] }));
                            loadMeta(i, s);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-sage/60"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <Label className="text-xs">Value</Label>
                  <Input value={d.value} onChange={(e) => updateDraft(i, { value: e.target.value })} placeholder="5.6" />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <Label className="text-xs">Unit</Label>
                  {unitOptions[i]?.length ? (
                    <Select value={d.unit ?? ""} onValueChange={(v) => updateDraft(i, { unit: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {unitOptions[i].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={d.unit ?? ""} onChange={(e) => updateDraft(i, { unit: e.target.value })} placeholder="%" />
                  )}
                </div>
                <div className="col-span-12 sm:col-span-8">
                  <Label className="text-xs">Reference range</Label>
                  <Input value={d.refRange ?? ""} onChange={(e) => updateDraft(i, { refRange: e.target.value })} placeholder="4.0–5.6" />
                </div>
                <div className="col-span-12 sm:col-span-4">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={d.date} onChange={(e) => updateDraft(i, { date: e.target.value })} />
                </div>
                {drafts.length > 1 && (
                  <button type="button" onClick={() => removeDraft(i)} className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label="Remove row"><X className="h-4 w-4" /></button>
                )}
              </div>
            ))}
            {!editing && (
              <Button variant="outline" onClick={addDraft} className="w-full rounded-full">+ Add another test</Button>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={save}>{editing ? "Save changes" : `Save ${drafts.filter((d) => d.name && d.value).length || ""}`}</Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
