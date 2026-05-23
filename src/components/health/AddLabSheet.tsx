import { useState, useRef } from "react";
import { Loader2, Upload, Pencil, FileText, Image as ImageIcon, AlertCircle, X } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useServerFn } from "@tanstack/react-start";
import { parseLabFile } from "@/lib/ai.functions";
import { useHealthStore, type LabResult } from "@/lib/store";
import { toast } from "sonner";

type Draft = Omit<LabResult, "id" | "createdAt">;

const today = () => new Date().toISOString().slice(0, 10);
const emptyRow = (): Draft => ({ name: "", value: "", unit: "", refRange: "", date: today() });

export function AddLabSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tab, setTab] = useState<"upload" | "manual">("upload");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([emptyRow()]);
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const parse = useServerFn(parseLabFile);
  const addLabs = useHealthStore((s) => s.addLabs);

  const reset = () => {
    setDrafts([emptyRow()]);
    setParseError(null);
    setFileInfo(null);
    setTab("upload");
  };

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB).");
      return;
    }
    setParsing(true);
    setParseError(null);
    setFileInfo({ name: file.name, type: file.type });
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      const result = await parse({ data: { dataUrl, mimeType: file.type } });
      if (result.error || result.results.length === 0) {
        setParseError(result.error || "No results detected — try clearer image or enter manually.");
        setTab("manual");
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

  const updateDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const removeDraft = (i: number) => setDrafts((ds) => ds.filter((_, idx) => idx !== i));
  const addDraft = () => setDrafts((ds) => [...ds, emptyRow()]);

  const save = () => {
    const valid = drafts.filter((d) => d.name.trim() && d.value.trim());
    if (valid.length === 0) {
      toast.error("Add at least one test with a name and value.");
      return;
    }
    addLabs(valid);
    toast.success(`Saved ${valid.length} test${valid.length > 1 ? "s" : ""}.`);
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
        <SheetHeader className="px-0">
          <SheetTitle className="font-serif text-2xl">Add lab results</SheetTitle>
          <SheetDescription>
            Upload a PDF or photo and AI extracts the values, or enter manually.
          </SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-1.5" /> Upload
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Pencil className="h-4 w-4 mr-1.5" /> Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
              className="w-full rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-sage/30 transition py-12 flex flex-col items-center text-center px-6"
            >
              {parsing ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                  <p className="font-medium">Reading your document…</p>
                  <p className="text-sm text-muted-foreground mt-1">This usually takes 5–15 seconds.</p>
                </>
              ) : fileInfo ? (
                <>
                  {fileInfo.type === "application/pdf" ? (
                    <FileText className="h-8 w-8 text-primary mb-3" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-primary mb-3" />
                  )}
                  <p className="font-medium">{fileInfo.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">Click to choose another file</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-primary mb-3" />
                  <p className="font-medium">Upload PDF, JPG, or PNG</p>
                  <p className="text-sm text-muted-foreground mt-1">Max 10MB</p>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {parseError && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 text-destructive p-3 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Your file is sent to the AI for parsing and then discarded. It's not stored or used to train AI models.
            </p>
          </TabsContent>

          <TabsContent value="manual" className="mt-4 space-y-4">
            {drafts.map((d, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card/50 p-4 grid grid-cols-12 gap-3 relative"
              >
                <div className="col-span-12 sm:col-span-5">
                  <Label className="text-xs">Test name</Label>
                  <Input
                    value={d.name}
                    onChange={(e) => updateDraft(i, { name: e.target.value })}
                    placeholder="e.g. HbA1c"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <Label className="text-xs">Value</Label>
                  <Input
                    value={d.value}
                    onChange={(e) => updateDraft(i, { value: e.target.value })}
                    placeholder="5.6"
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <Label className="text-xs">Unit</Label>
                  <Input
                    value={d.unit ?? ""}
                    onChange={(e) => updateDraft(i, { unit: e.target.value })}
                    placeholder="%"
                  />
                </div>
                <div className="col-span-6 sm:col-span-6">
                  <Label className="text-xs">Reference range</Label>
                  <Input
                    value={d.refRange ?? ""}
                    onChange={(e) => updateDraft(i, { refRange: e.target.value })}
                    placeholder="4.0–5.6"
                  />
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={d.date}
                    onChange={(e) => updateDraft(i, { date: e.target.value })}
                  />
                </div>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDraft(i)}
                    className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remove row"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={addDraft} className="w-full rounded-full">
              + Add another test
            </Button>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={save}>Save {drafts.filter((d) => d.name && d.value).length || ""}</Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
