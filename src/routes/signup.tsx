import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup")({
  component: Signup,
  head: () => ({
    meta: [
      { title: "Sign up — Verdant" },
      { name: "description", content: "Create a free Verdant account (coming soon)." },
    ],
  }),
});

function Signup() {
  return (
    <div className="mx-auto max-w-xl px-5 sm:px-8 py-20 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Leaf className="h-5 w-5" />
      </span>
      <h1 className="font-serif text-4xl sm:text-5xl mt-6">Accounts are coming soon</h1>
      <p className="mt-4 text-muted-foreground">
        Sign-in and cross-device sync are next on the roadmap. For now, your data
        is saved privately in this browser — no account needed to use Verdant.
      </p>
      <div className="mt-8">
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back home
          </Link>
        </Button>
      </div>
    </div>
  );
}
