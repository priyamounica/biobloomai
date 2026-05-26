import { useState } from "react";
import { Loader2, Sparkles, AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "./Markdown";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  content?: string;
  loading: boolean;
  error?: string | null;
  onGenerate: () => void;
  ctaLabel: string;
  contextHint?: string;
  variant?: "primary" | "accent";
};

export function AISection({
  title,
  description,
  content,
  loading,
  error,
  onGenerate,
  ctaLabel,
  contextHint,
  variant = "primary",
}: Props) {
  const [showCtx, setShowCtx] = useState(false);
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/70 shadow-soft overflow-hidden",
        variant === "primary" ? "bg-card" : "bg-sage/40",
      )}
    >
      <div className="px-6 py-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-terracotta" />
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <Button
          onClick={onGenerate}
          disabled={loading}
          variant={variant === "accent" ? "outline" : "default"}
          className="shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Thinking…
            </>
          ) : content ? (
            "Regenerate"
          ) : (
            ctaLabel
          )}
        </Button>
      </div>

      <div className="px-6 pb-6">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 text-destructive p-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {!content && !error && !loading && (
          <p className="text-sm text-muted-foreground italic">
            Click {ctaLabel.toLowerCase()} to get a personalized AI response.
          </p>
        )}
        {loading && !content && (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-sage rounded w-3/4" />
            <div className="h-3 bg-sage rounded w-full" />
            <div className="h-3 bg-sage rounded w-5/6" />
            <div className="h-3 bg-sage rounded w-2/3" />
          </div>
        )}
        {content && (
          <div className="max-h-80 overflow-y-auto rounded-xl bg-background/40 border border-border/40 p-4 pr-3">
            <Markdown>{content}</Markdown>
          </div>
        )}
        {content && contextHint && (
          <button
            type="button"
            onClick={() => setShowCtx((v) => !v)}
            className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", showCtx && "rotate-180")} />
            How was this generated?
          </button>
        )}
        {showCtx && contextHint && (
          <p className="mt-2 text-xs text-muted-foreground bg-muted/60 rounded-lg p-3">
            {contextHint}
          </p>
        )}
      </div>
    </section>
  );
}
