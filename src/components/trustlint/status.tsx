import { cn } from "@/lib/utils";
import type { Status } from "@/data/types";

const DOT: Record<Status, string> = {
  red: "bg-bad",
  amber: "bg-warn",
  green: "bg-ok",
};

const TEXT: Record<Status, string> = {
  red: "text-bad",
  amber: "text-warn-foreground",
  green: "text-ok",
};

const LABEL: Record<Status, string> = {
  red: "Do not use",
  amber: "Check before use",
  green: "Trusted",
};

export const STATUS_DESCRIPTION: Record<Status, string> = {
  red: "This document states something wrong: it contradicts the reference or a more reliable source.",
  amber:
    "Nothing proven wrong, but a trust signal is missing: owner left, not reviewed in time, duplicate, or a conflict to confirm.",
  green: "No issue found.",
};

function Dot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full", DOT[status], className)}
    />
  );
}

/** Status dot that always carries its text label (never colour alone). */
export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      title={STATUS_DESCRIPTION[status]}
      className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold", TEXT[status], className)}
    >
      <Dot status={status} />
      {LABEL[status]}
    </span>
  );
}

export function StatusPill({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    red: "bg-bad/10 text-bad border-bad/30",
    amber: "bg-warn/15 text-warn-foreground border-warn/40",
    green: "bg-ok/10 text-ok border-ok/30",
  };
  return (
    <span
      title={STATUS_DESCRIPTION[status]}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        styles[status],
      )}
    >
      <Dot status={status} />
      {LABEL[status]}
    </span>
  );
}

export function StatusLegend() {
  return (
    <ul className="grid gap-2 rounded-xl border border-border bg-card p-4 text-xs shadow-sm sm:grid-cols-3">
      {(["red", "amber", "green"] as const).map((s) => (
        <li key={s} className="flex items-start gap-2">
          <Dot status={s} className="mt-1" />
          <span>
            <span className={cn("font-semibold", TEXT[s])}>{LABEL[s]}</span>
            <span className="text-muted-foreground"> — {STATUS_DESCRIPTION[s]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export { LABEL as STATUS_LABEL };
