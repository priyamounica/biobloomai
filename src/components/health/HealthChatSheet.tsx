import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Markdown } from "./Markdown";
import { healthChat } from "@/lib/ai-health.functions";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  topic: "labs" | "meds";
  scope: "summary" | "advice";
  priorContent: string;
  context: string;
  triggerLabel?: string;
};

export function HealthChatSheet({
  topic,
  scope,
  priorContent,
  context,
  triggerLabel = "Ask follow-up",
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chat = useServerFn(healthChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await chat({
        data: {
          topic,
          scope,
          priorContent: priorContent.slice(0, 8000),
          context: context.slice(0, 8000),
          history: messages.slice(-10),
          question,
        },
      });
      setMessages([...next, { role: "assistant", content: res.text }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle className="flex items-center gap-2 font-serif">
            <Sparkles className="h-4 w-4 text-terracotta" /> Ask about your {topic} {scope}
          </SheetTitle>
          <SheetDescription>
            Information only — not medical advice. Always consult a qualified clinician.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Ask follow-up questions about your {scope}. For example:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>What does this result mean for me?</li>
                <li>Should I change anything in my diet?</li>
                <li>Which questions should I ask my doctor?</li>
              </ul>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm"
                  : "mr-auto max-w-[90%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm"
              }
            >
              {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : m.content}
            </div>
          ))}
          {loading && (
            <div className="mr-auto rounded-2xl bg-muted px-4 py-3 text-sm flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          )}
        </div>

        <div className="border-t p-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type your question…"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
