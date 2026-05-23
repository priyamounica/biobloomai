import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Leaf, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [
      { title: "Sign in — Verdant" },
      { name: "description", content: "Sign in to Verdant to save your labs and medications." },
    ],
  }),
});

function Login() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/labs" });
  }, [user, loading, navigate]);

  const signInGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/labs" });
  };

  const signInEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back.");
    navigate({ to: "/labs" });
  };

  return (
    <div className="mx-auto max-w-md px-5 sm:px-8 py-16">
      <div className="text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Leaf className="h-5 w-5" />
        </span>
        <h1 className="font-serif text-4xl mt-5">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to sync your labs and medications.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 rounded-xl"
          onClick={signInGoogle}
          disabled={busy}
        >
          <GoogleIcon /> Continue with Google
        </Button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or with email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={signInEmail} className="space-y-3">
          <div>
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <Label className="text-xs">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground pt-2">
          New to Verdant?{" "}
          <Link to="/signup" className="text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.73-6-6.1S8.69 6 12 6c1.88 0 3.14.8 3.86 1.49l2.64-2.55C16.95 3.43 14.69 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12s4.26 9.5 9.5 9.5c5.49 0 9.12-3.86 9.12-9.28 0-.62-.07-1.1-.16-1.52H12z" />
    </svg>
  );
}
