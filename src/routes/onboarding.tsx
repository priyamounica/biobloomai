import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  familyHistorySuggestions,
} from "@/lib/ai-health.functions";
import { upsertHealthProfile, getHealthProfile } from "@/lib/health.functions";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({
    meta: [
      { title: "Welcome — BioBloomai" },
      { name: "description", content: "Set up your BioBloomai health profile in under a minute." },
    ],
  }),
});

type Step = 0 | 1 | 2 | 3 | 4;

const CONDITION_OPTIONS = [
  "Type 2 Diabetes",
  "High Blood Pressure",
  "High Cholesterol",
  "Asthma",
  "Thyroid disorder",
  "Anxiety / Depression",
  "Migraine",
  "PCOS / PCOD",
  "Acid reflux (GERD)",
];

const ALLERGY_OPTIONS = ["Penicillin", "Sulfa drugs", "NSAIDs", "Peanuts", "Shellfish", "Dust", "Pollen", "Lactose"];
const DIET_OPTIONS = ["Vegetarian", "Vegan", "Non-vegetarian", "Eggetarian", "Pescatarian", "Low-carb", "Keto", "Low-sodium", "Gluten-free", "Diabetic"];

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fetchProfile = useServerFn(getHealthProfile);
  const saveProfile = useServerFn(upsertHealthProfile);
  const fetchFH = useServerFn(familyHistorySuggestions);

  const [step, setStep] = useState<Step>(0);
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState("");
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);
  const [fhOptions, setFhOptions] = useState<string[]>([
    "Type 2 Diabetes",
    "High Blood Pressure",
    "Heart Disease",
    "Stroke",
    "Cancer (any)",
    "Asthma",
  ]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [diet, setDiet] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchProfile()
      .then(({ profile }) => {
        if (profile?.onboarded) navigate({ to: "/labs" });
        else if (profile) {
          setAge(profile.age?.toString() ?? "");
          setSex(profile.sex ?? "");
          setWeight(profile.weight_kg?.toString() ?? "");
          setHeight(profile.height_cm?.toString() ?? "");
          setConditions(profile.conditions ?? []);
          setFamilyHistory(profile.family_history ?? []);
          setAllergies(profile.allergies ?? []);
          setDiet(profile.diet ?? []);
          setLifestyle(profile.lifestyle ?? "");
        }
      })
      .catch(() => {});
    fetchFH()
      .then((r) => {
        if (r.options.length) setFhOptions(r.options);
      })
      .catch(() => {});
  }, [user, fetchProfile, fetchFH, navigate]);

  const bmi =
    weight && height
      ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)
      : "";

  const toggleIn = (arr: string[], v: string, set: (n: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const finish = async () => {
    setSaving(true);
    try {
      await saveProfile({
        data: {
          age: age ? parseInt(age) : null,
          sex: sex || null,
          weight_kg: weight ? parseFloat(weight) : null,
          height_cm: height ? parseFloat(height) : null,
          bmi: bmi ? parseFloat(bmi) : null,
          conditions,
          family_history: familyHistory,
          allergies,
          diet,
          lifestyle: lifestyle || null,
          onboarded: true,
        },
      });
      toast.success("Profile saved. Welcome to BioBloomai!");
      navigate({ to: "/labs" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    setSaving(true);
    try {
      await saveProfile({ data: { onboarded: true } });
      navigate({ to: "/labs" });
    } catch {
      navigate({ to: "/labs" });
    }
  };

  const steps = ["Basics", "Conditions", "Family history", "Allergies & diet", "Review"];
  const next = () => setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  const back = () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s));

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 py-10 sm:py-16">
      <div className="flex items-center justify-between mb-6">
        <BrandMark size={36} showWordmark />
        <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">
          Skip for now
        </button>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>

      <div className="mb-1 text-xs uppercase tracking-wider text-terracotta font-medium">
        Step {step + 1} of {steps.length}
      </div>
      <h1 className="font-serif text-4xl mb-2">{steps[step]}</h1>

      {step === 0 && (
        <>
          <p className="text-muted-foreground mb-6">A few basics so AI can personalize insights.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Age</Label>
              <Input value={age} onChange={(e) => setAge(e.target.value)} type="number" placeholder="32" />
            </div>
            <div>
              <Label className="text-xs">Sex</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other / Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Weight (kg)</Label>
              <Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" placeholder="68" />
            </div>
            <div>
              <Label className="text-xs">Height (cm)</Label>
              <Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" placeholder="172" />
            </div>
            {bmi && (
              <div className="col-span-2 rounded-xl bg-sage/50 p-3 text-sm">
                <span className="font-medium">BMI:</span> {bmi}{" "}
                <span className="text-muted-foreground text-xs ml-1">
                  ({bmiCategory(parseFloat(bmi))})
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <p className="text-muted-foreground mb-6">Any current health conditions? Tap all that apply.</p>
          <Chips options={CONDITION_OPTIONS} selected={conditions} onToggle={(v) => toggleIn(conditions, v, setConditions)} />
          <CustomAdd
            value={customCondition}
            onChange={setCustomCondition}
            onAdd={() => {
              const v = customCondition.trim();
              if (v) { setConditions([...conditions, v]); setCustomCondition(""); }
            }}
            placeholder="Add another condition…"
          />
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-terracotta" /> AI-curated common hereditary conditions.
          </p>
          <p className="text-xs text-muted-foreground mb-5">Tap any that run in your family.</p>
          <Chips options={fhOptions} selected={familyHistory} onToggle={(v) => toggleIn(familyHistory, v, setFamilyHistory)} />
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-muted-foreground mb-4">Allergies (tap all that apply)</p>
          <Chips options={ALLERGY_OPTIONS} selected={allergies} onToggle={(v) => toggleIn(allergies, v, setAllergies)} />
          <CustomAdd
            value={customAllergy}
            onChange={setCustomAllergy}
            onAdd={() => {
              const v = customAllergy.trim();
              if (v) { setAllergies([...allergies, v]); setCustomAllergy(""); }
            }}
            placeholder="Add another allergy…"
          />

          <p className="text-muted-foreground mb-3 mt-6">Diet (multi-select allowed)</p>
          <Chips options={DIET_OPTIONS} selected={diet} onToggle={(v) => toggleIn(diet, v, setDiet)} />

          <Label className="text-xs mt-6 block">Lifestyle notes (optional)</Label>
          <Textarea
            value={lifestyle}
            onChange={(e) => setLifestyle(e.target.value)}
            placeholder="Exercise, sleep, smoking, alcohol…"
            rows={3}
            className="mt-1"
          />
        </>
      )}

      {step === 4 && (
        <>
          <p className="text-muted-foreground mb-6">Quick review — anything to change, tap Back.</p>
          <ReviewRow label="Age / Sex" value={[age, sex].filter(Boolean).join(" · ") || "—"} />
          <ReviewRow label="Weight / Height / BMI" value={[weight && `${weight}kg`, height && `${height}cm`, bmi && `BMI ${bmi}`].filter(Boolean).join(" · ") || "—"} />
          <ReviewRow label="Conditions" value={conditions.join(", ") || "None listed"} />
          <ReviewRow label="Family history" value={familyHistory.join(", ") || "None listed"} />
          <ReviewRow label="Allergies" value={allergies.join(", ") || "None listed"} />
          <ReviewRow label="Diet" value={diet.join(", ") || "—"} />
          {lifestyle && <ReviewRow label="Lifestyle" value={lifestyle} />}
        </>
      )}

      <div className="flex justify-between gap-2 mt-10">
        <Button variant="ghost" onClick={back} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={next} className="rounded-full px-6">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving} className="rounded-full px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Finish setup
          </Button>
        )}
      </div>
    </div>
  );
}

function bmiCategory(b: number) {
  if (b < 18.5) return "Underweight";
  if (b < 25) return "Healthy range";
  if (b < 30) return "Overweight";
  return "Obese";
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-sm border transition",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-sage/60",
            )}
          >
            {active && <Check className="h-3 w-3 inline mr-1" />}
            {o}
          </button>
        );
      })}
      {selected.filter((s) => !options.includes(s)).map((custom) => (
        <button
          key={custom}
          type="button"
          onClick={() => onToggle(custom)}
          className="px-3.5 py-1.5 rounded-full text-sm border border-primary bg-primary text-primary-foreground"
        >
          <Check className="h-3 w-3 inline mr-1" />
          {custom}
        </button>
      ))}
    </div>
  );
}

function CustomAdd({ value, onChange, onAdd, placeholder }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string }) {
  return (
    <div className="flex gap-2 mt-4">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} />
      <Button type="button" variant="outline" onClick={onAdd}>Add</Button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-0 grid grid-cols-3 gap-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="col-span-2 text-sm">{value}</div>
    </div>
  );
}
