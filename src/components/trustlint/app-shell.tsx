import { Link } from "@tanstack/react-router";
import { LogIn, RotateCcw, ScanSearch, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTrustLint } from "@/lib/trustlint-context";
import { useTeam } from "@/lib/team";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/reference", label: "Reference & Legal Watch" },
  { to: "/check", label: "Check a document" },
  { to: "/how", label: "How trust works" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { resetSeed } = useTrustLint();
  const { session } = useTeam();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-center gap-2 border-b border-warn/30 bg-warn/10 px-4 py-1.5 text-center">
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-warn" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-warn-foreground">
          Proof of concept – all documents, people and values are fictional.
        </span>
      </div>

      <header className="sticky top-0 z-30 bg-brand text-brand-foreground shadow-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 sm:py-4">
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-foreground/15">
                <ScanSearch className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-tight tracking-tight">TrustLint</span>
                <span className="block truncate text-xs text-brand-muted">Knowledge you can trust</span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  resetSeed();
                  toast.success("Demo reset: seed documents, claims and reference values restored.");
                }}
                title="Reset demo"
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-foreground/25 px-3 py-1.5 text-xs font-medium hover:bg-brand-foreground/10"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Reset demo</span>
              </button>
              <Link
                to={session ? "/portal" : "/auth"}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-foreground/15 px-3 py-1.5 text-xs font-medium hover:bg-brand-foreground/25"
              >
                {session ? <ShieldCheck className="size-3.5" /> : <LogIn className="size-3.5" />}
                <span className="hidden sm:inline">{session ? "Legal portal" : "Legal team sign in"}</span>
              </Link>
            </div>
          </div>
          <nav className="no-scrollbar -mb-px flex gap-6 overflow-x-auto border-t border-brand-foreground/10 text-sm font-medium">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="shrink-0 whitespace-nowrap border-b-2 border-transparent py-3 text-brand-muted transition-colors hover:text-brand-foreground [&.active]:border-brand-foreground [&.active]:text-brand-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      <footer className="border-t border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
        TrustLint · Find it. Understand it. Trust it. · Every flag shows its rule, its evidence and a contact.
      </footer>
    </div>
  );
}
