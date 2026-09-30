import { cn } from "@/lib/utils";
import type { Status } from "@/data/types";

const DOT: Record<Status, string> = {
  red: "bg-bad",
  amber: "bg-warn",
  green: "bg-ok",
};

const LABEL: Record<Status, string> = {
  red: "Do not trust",
  amber: "Check before use",
  green: "Trusted",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      aria-label={LABEL[status]}
      title={LABEL[status]}
      className={cn("inline-block size-2.5 shrink-0 rounded-full", DOT[status], className)}
    />
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
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        styles[status],
      )}
    >
      <StatusDot status={status} />
      {LABEL[status]}
    </span>
  );
}

export { LABEL as STATUS_LABEL };
