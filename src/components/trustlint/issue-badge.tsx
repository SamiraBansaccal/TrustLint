import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RULES } from "@/lib/checks";
import { cn } from "@/lib/utils";
import type { Issue, IssueKind } from "@/data/types";

export const ISSUE_LABEL: Record<IssueKind, string> = {
  reference_mismatch: "Outdated value",
  contradiction: "Contradicts a more reliable source",
  needs_confirmation: "Newer source disagrees – confirm",
  conflicting_source: "Another source disagrees",
  owner_left: "Owner left",
  no_owner: "No owner",
  stale: "Not reviewed in time",
  duplicate: "Duplicate",
  scope_missing: "Country not stated",
};

export function issueTone(weight: number): string {
  if (weight >= 4) return "bg-bad/10 text-bad border-bad/30";
  if (weight >= 2) return "bg-warn/15 text-warn-foreground border-warn/40";
  return "bg-muted text-muted-foreground border-border";
}

export function IssueBadge({ issue }: { issue: Issue }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex cursor-help items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
            issueTone(issue.weight),
          )}
        >
          {ISSUE_LABEL[issue.kind]}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-semibold">
          {RULES[issue.kind].name} · weight {issue.weight}
        </p>
        <p className="mt-1 text-xs">{issue.reason}</p>
      </TooltipContent>
    </Tooltip>
  );
}
