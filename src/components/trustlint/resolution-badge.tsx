import { cn } from "@/lib/utils";
import { RESOLUTION_LABEL, type ResolutionStatus } from "@/lib/team";

const STYLES: Record<ResolutionStatus, string> = {
  open: "border-border bg-background text-muted-foreground",
  in_progress: "border-primary/40 bg-primary/10 text-primary",
  fixed: "border-ok/40 bg-ok/10 text-ok",
};

export function ResolutionBadge({ status }: { status: ResolutionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        STYLES[status],
      )}
    >
      {RESOLUTION_LABEL[status]}
    </span>
  );
}
