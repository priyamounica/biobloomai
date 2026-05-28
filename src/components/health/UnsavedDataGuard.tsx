import { useEffect, useState } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
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
 * Warns guest users with unsaved labs/meds before they leave the page,
 * and prompts them to sign in / sign up so their entries are persisted.
 *
 * - Browser refresh / tab close: native beforeunload warning.
 * - In-app navigation: TanStack Router blocker shows a custom dialog.
 * After sign-in, useCloudSync pushes the local entries to their account.
 */
export function UnsavedDataGuard() {
  const { user, loading } = useAuth();
  const labs = useHealthStore((s) => s.labs);
  const meds = useHealthStore((s) => s.meds);
  const hasUnsaved = !user && !loading && (labs.length > 0 || meds.length > 0);

  // Native beforeunload (refresh / close tab)
  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  // In-app navigation blocker
  const [pendingProceed, setPendingProceed] = useState<(() => void) | null>(null);

  useBlocker({
    shouldBlockFn: ({ next }) => {
      if (!hasUnsaved) return false;
      // allow navigating into the auth pages — those are how they save
      const path = next.pathname;
      if (path.startsWith("/login") || path.startsWith("/signup")) return false;
      return true;
    },
    withResolver: false,
    enableBeforeUnload: false,
  });

  // Fallback: open dialog whenever blocker fires. Since withResolver:false in the
  // current router API, we instead show the dialog by intercepting clicks via a
  // listener. Simpler: keep an open state controlled by a global event.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasUnsaved) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      if (href.startsWith("/login") || href.startsWith("/signup")) return;
      // only intercept same-origin internal links
      e.preventDefault();
      setPendingProceed(() => () => {
        window.location.href = href;
      });
      setOpen(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
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
            You have {labs.length} lab result{labs.length === 1 ? "" : "s"} and {meds.length} medication
            {meds.length === 1 ? "" : "s"} entered as a guest. They will be lost when you leave.
            Sign in or create a free account to save them to your profile — we'll automatically add
            them to your records.
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
              pendingProceed?.();
            }}
          >
            Leave without saving
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
