import { useEffect, useState } from "react";
import { FlaskConical, Pill, Sparkles, FileText, MessageCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: FlaskConical,
    title: "1. Add your labs",
    body: "Type values manually or upload a lab PDF — AI extracts every result.",
    visual: (
      <div className="space-y-2">
        {["HbA1c — 5.6 %", "LDL — 110 mg/dL", "TSH — 2.1 mIU/L"].map((l, i) => (
          <div
            key={l}
            className="rounded-lg bg-background border border-border/60 px-3 py-2 text-sm animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${i * 120}ms`, animationFillMode: "backwards" }}
          >
            {l}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Pill,
    title: "2. Log medications",
    body: "Snap a photo of the box — AI auto-fills name, dosage and schedule.",
    visual: (
      <div className="rounded-xl bg-background border border-border/60 p-4 space-y-2 animate-in fade-in zoom-in-95">
        <div className="font-medium">Dolo 650</div>
        <div className="text-xs text-muted-foreground">650 mg · Twice daily · Morning, Evening</div>
        <div className="flex gap-1 pt-1">
          {["Morning", "Evening"].map((t) => (
            <span key={t} className="text-xs bg-sage px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Sparkles,
    title: "3. Generate AI insights",
    body: "Get a plain-language summary tailored to your profile and history.",
    visual: (
      <div className="rounded-xl bg-sage/50 border border-sage p-4 text-sm space-y-1.5 animate-in fade-in">
        <div className="h-2.5 bg-foreground/10 rounded w-3/4 animate-pulse" />
        <div className="h-2.5 bg-foreground/10 rounded w-full animate-pulse" style={{ animationDelay: "150ms" }} />
        <div className="h-2.5 bg-foreground/10 rounded w-5/6 animate-pulse" style={{ animationDelay: "300ms" }} />
        <div className="h-2.5 bg-foreground/10 rounded w-2/3 animate-pulse" style={{ animationDelay: "450ms" }} />
      </div>
    ),
  },
  {
    icon: MessageCircle,
    title: "4. Ask follow-ups",
    body: "Chat with AI for clarifications — context-aware on your full profile.",
    visual: (
      <div className="space-y-2">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3 py-2 text-sm animate-in fade-in slide-in-from-right-2">
          Should I worry about my LDL?
        </div>
        <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm animate-in fade-in slide-in-from-left-2" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
          Your LDL is slightly elevated. Consider discussing diet…
        </div>
      </div>
    ),
  },
  {
    icon: FileText,
    title: "5. Export & share",
    body: "Download a PDF to bring to your next clinician visit.",
    visual: (
      <div className="rounded-xl bg-background border border-border/60 p-4 flex items-center gap-3 animate-in fade-in zoom-in-95">
        <FileText className="h-8 w-8 text-terracotta" />
        <div className="flex-1">
          <div className="text-sm font-medium">biobloomai-labs-summary.pdf</div>
          <div className="text-xs text-muted-foreground">Ready to download</div>
        </div>
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    title: "6. Private by design",
    body: "Your data stays yours — never sold, never used to train AI.",
    visual: (
      <div className="rounded-xl bg-sage/40 border border-sage p-4 flex items-center gap-3 animate-in fade-in">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div className="text-sm">End-to-end private. You own your timeline.</div>
      </div>
    ),
  },
];

export function OnboardingWalkthrough() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % steps.length), 4200);
    return () => clearInterval(t);
  }, [paused]);

  const Step = steps[idx];

  return (
    <section
      className="mx-auto max-w-6xl px-5 sm:px-8 pb-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-3xl sm:text-4xl">How BioBloomai works</h2>
          <p className="text-muted-foreground mt-1">A guided tour of the experience.</p>
        </div>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to step ${i + 1}`}
              onClick={() => setIdx(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === idx ? "w-8 bg-terracotta" : "w-1.5 bg-border hover:bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-stretch rounded-3xl bg-card border border-border/60 p-6 sm:p-10 shadow-soft min-h-[360px]">
        <div key={`text-${idx}`} className="flex flex-col justify-center animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-primary mb-4">
            <Step.icon className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl mb-3">{Step.title}</h3>
          <p className="text-muted-foreground leading-relaxed max-w-md">{Step.body}</p>
        </div>
        <div key={`visual-${idx}`} className="flex items-center justify-center bg-sage/30 rounded-2xl p-6 sm:p-8 animate-in fade-in duration-500">
          <div className="w-full max-w-sm">{Step.visual}</div>
        </div>
      </div>
    </section>
  );
}
