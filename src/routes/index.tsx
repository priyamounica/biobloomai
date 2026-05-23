import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, Pill, Sparkles, ShieldCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Verdant — AI health companion for labs & meds" },
      {
        name: "description",
        content:
          "Track lab results and medications, get plain-language AI summaries. Private. No signup required.",
      },
    ],
  }),
});

function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-16 sm:pt-24 pb-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sage text-sage-foreground px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3 w-3" /> AI-powered, privacy-first
          </span>
          <h1 className="font-serif text-5xl sm:text-7xl mt-6 leading-[1.02] tracking-tight">
            Make sense of your{" "}
            <span className="text-terracotta italic">labs and meds</span>{" "}
            in plain language.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Verdant turns lab PDFs and medication lists into clear summaries and
            personalised guidance — no account needed to start.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link to="/labs">
                Open Labs <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6">
              <Link to="/meds">Open Meds</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-card border border-border/60 p-6 shadow-soft hover:shadow-card transition-shadow"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sage text-primary mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-xl mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer band */}
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-20">
        <div className="rounded-2xl bg-sage/60 border border-sage p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0 mt-1" />
          <div className="text-sm text-foreground/80 leading-relaxed">
            <p className="font-medium text-foreground">
              For informational purposes only.
            </p>
            <p className="mt-1">
              Verdant doesn't diagnose or treat. Always consult a qualified
              healthcare professional. Your data stays in your browser and is never
              used to train AI models.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    icon: FlaskConical,
    title: "Labs that explain themselves",
    body: "Upload a PDF or photo of your blood work. We extract every value and write a layperson summary.",
  },
  {
    icon: Pill,
    title: "Medications, demystified",
    body: "Log medications and supplements. Get notes on interactions and adherence tips.",
  },
  {
    icon: Eye,
    title: "See how AI reasoned",
    body: "Every summary shows the inputs we used. No black boxes, no surprises.",
  },
];
