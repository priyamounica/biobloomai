import { Link, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { Leaf, LogOut, User as UserIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth, signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/", label: "Home" },
  { to: "/labs", label: "Labs" },
  { to: "/meds", label: "Meds" },
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Invalidate caches on auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  const initials =
    (user?.user_metadata?.full_name as string | undefined)
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="font-serif text-xl tracking-tight">Verdant</span>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((n) => {
              const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm transition-colors",
                    active
                      ? "bg-sage text-sage-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-sage/50",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-8 w-20" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sage text-sage-foreground text-sm font-medium hover:bg-sage/80 transition">
                    {initials}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-xs text-muted-foreground">Signed in as</div>
                    <div className="truncate text-sm">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => signOut()}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="rounded-full hidden sm:inline-flex">
                  <Link to="/login">
                    <UserIcon className="h-4 w-4" /> Sign in
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-full">
                  <Link to="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-24 border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Verdant Health</p>
          <p>
            For informational purposes only. Please consult a qualified healthcare
            professional for medical advice.
          </p>
          <p>Your data is not used to train AI models. Stored privately in your browser.</p>
        </div>
      </footer>
    </div>
  );
}
