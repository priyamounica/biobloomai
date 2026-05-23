import { Link } from "@tanstack/react-router";
import { X, Shield } from "lucide-react";
import { useHealthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function SignupNudge({ visible }: { visible: boolean }) {
  const dismissed = useHealthStore((s) => s.signupNudgeDismissed);
  const dismiss = useHealthStore((s) => s.dismissSignupNudge);
  if (!visible || dismissed) return null;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/85 text-primary-foreground p-6 shadow-card relative overflow-hidden">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/15 transition"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex h-10 w-10 rounded-xl bg-white/15 items-center justify-center shrink-0">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-serif text-2xl">Save your health timeline</h3>
          <p className="text-primary-foreground/85 mt-1 text-sm max-w-md">
            Create a free account to keep your labs, meds, and AI summaries across
            devices — and get smarter recommendations over time.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <Link to="/signup">Create free account</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={dismiss}
              className="text-primary-foreground hover:bg-white/15"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
