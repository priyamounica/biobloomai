import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home" },
  { to: "/labs", label: "Labs" },
  { to: "/meds", label: "Meds" },
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
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
