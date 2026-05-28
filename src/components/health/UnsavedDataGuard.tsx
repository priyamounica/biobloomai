import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useHealthStore } from "@/lib/store";

/**
 * Warns guest users with unsaved labs/meds before they leave the page.
 * - Browser refresh / tab close: native beforeunload warning.
 * - In-app link clicks: custom dialog asking them to sign in/up.
 * After sign-in, useCloudSync pushes the local entries to their account.
 */
export function UnsavedDataGuard() {
  const { user, loading } = useAuth();
  const labs = useHealthStore((s) => s.labs);
  const meds = useHealthStore((s) => s.meds);
  const hasUnsaved = !user && !loading && (labs.length > 0 || meds.length > 0);

  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!hasUnsaved) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:"))
        return;
      // allow auth pages (that's how they save)
      if (href.startsWith("/login") || href.startsWith("/signup")) return;
      // only intercept links that leave the current page
      if (href === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
      setOpen(true);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [hasUnsaved]);

  if (!hasUnsaved) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <Shield className="h-5 w-5" />
          </div>
          <DialogTitle className="font-serif text-2xl">Save your entries?</DialogTitle>
          <DialogDescription>
            You have {labs.length} lab result{labs.length === 1 ? "" : "s"} and {meds.length}{" "}
            medication{meds.length === 1 ? "" : "s"} entered as a guest. They will be lost when you
            leave. Sign in or create a free account — we'll automatically save them to your
            profile.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <Button asChild className="w-full sm:w-auto">
            <Link to="/signup">Create free account</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => {
              setOpen(false);
              if (pendingHref) window.location.href = pendingHref;
            }}
          >
            Leave without saving
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
