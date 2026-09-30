import { Link } from "@tanstack/react-router";
import { LogIn, RotateCcw, ScanSearch, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTrustLint } from "@/lib/trustlint-context";
import { useTeam } from "@/lib/team";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/reference", label: "Reference & Legal Watch" },
  { to: "/check", label: "Check a new document" },
  { to: "/how", label: "How trust is computed" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { dataset, setDataset, resetSeed } = useTrustLint();
  const { session } = useTeam();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ScanSearch className="size-4" />
            </span>
            <span className="font-mono text-base font-semibold tracking-tight">TrustLint</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:font-medium [&.active]:text-foreground"
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex rounded-md border border-border p-0.5 text-xs" role="group" aria-label="Data set">
              {(["demo", "real"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDataset(d)}
                  className={cn(
                    "rounded px-2.5 py-1 font-medium transition-colors",
                    dataset === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d === "demo" ? "Demo figures" : "Real 2026 figures"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                resetSeed();
                toast.success("Demo reset: seed documents, claims and reference values restored.");
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <RotateCcw className="size-3.5" />
              Reset demo
            </button>
            <Link
              to={session ? "/portal" : "/auth"}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              {session ? <ShieldCheck className="size-3.5" /> : <LogIn className="size-3.5" />}
              {session ? "Legal portal" : "Legal team sign in"}
            </Link>
          </div>
        </div>
        <div className="border-t border-border bg-warn/15 px-6 py-1.5 text-center text-[11px] font-medium text-warn-foreground">
          {dataset === "demo"
            ? "Proof of concept – all documents, people and values are fictional."
            : "Reference values are real official 2026 figures with sources. Internal documents and people are still fictional examples."}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        TrustLint · Find it. Understand it. Trust it. · Every flag shows its rule, its evidence and
        a contact.
      </footer>
    </div>
  );
}
