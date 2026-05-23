// Pathless layout wrapping all pages with AppShell
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("")({
  component: AppShell,
});
