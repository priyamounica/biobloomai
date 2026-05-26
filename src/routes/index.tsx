import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, Pill, Sparkles, ShieldCheck, Eye, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "BioBloomai — AI health companion for every living system" },
      {
        name: "description",
        content:
          "Track labs, medications, and health insights with AI you can trust. Built for people and pets — clear, private, always-on guidance for life's well-being.",
      },
    ],
  }),
});

function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-16 sm:pt-24 pb-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sage text-sage-foreground px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3 w-3" /> AI-powered · privacy-first · for every living system
          </span>
          <h1 className="font-serif text-5xl sm:text-7xl mt-6 leading-[1.02] tracking-tight">
            Help life{" "}
            <span className="text-terracotta italic">bloom</span>{" "}
            — with AI that understands your health.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            BioBloomai turns lab reports, medication lists, and your health profile into clear,
            plain-language insights and gentle, personalised guidance.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link to="/labs">
                Decode my labs <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6">
              <Link to="/meds">
                Manage my meds <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-card border border-border/60 p-6 shadow-soft hover:shadow-card transition-shadow">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sage text-primary mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-xl mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-20">
        <div className="rounded-2xl bg-sage/60 border border-sage p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start">
          <BrandMark size={40} />
          <div className="text-sm text-foreground/80 leading-relaxed">
            <p className="font-medium text-foreground">For informational purposes only.</p>
            <p className="mt-1">
              BioBloomai doesn't diagnose or treat. Always consult a qualified healthcare
              professional. Your data stays private and is never used to train AI models.
            </p>
          </div>
          <ShieldCheck className="hidden sm:block h-6 w-6 text-primary shrink-0 mt-1 ml-auto" />
        </div>
      </section>
    </div>
  );
}

const features = [
  { icon: FlaskConical, title: "Labs that explain themselves", body: "Upload a PDF or photo. AI extracts every value and writes a layperson summary you can act on." },
  { icon: Pill, title: "Medications, demystified", body: "Log meds with one tap. AI auto-fills dosage and flags interactions to discuss with your clinician." },
  { icon: Sparkles, title: "Personalised AI insights", body: "Tailored advice that learns from your profile, conditions, family history, and diet." },
  { icon: Eye, title: "See how AI reasoned", body: "Every summary shows the inputs we used. No black boxes, no surprises." },
  { icon: ShieldCheck, title: "Private by design", body: "Your data stays yours. Never sold, never used to train AI models." },
  { icon: PawPrint, title: "For every living system", body: "Built for people today, scaling to pets, livestock, and wellness for all life tomorrow." },
];
