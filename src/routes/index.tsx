import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusDot } from "@/components/trustlint/status";
import { IssueBadge } from "@/components/trustlint/issue-badge";
import { useTrustLint } from "@/lib/trustlint-context";
import { RESOLUTION_LABEL, resolutionOf, useTeam, type ResolutionStatus } from "@/lib/team";
import { ResolutionBadge } from "@/components/trustlint/resolution-badge";
import { extractClaims } from "@/lib/extract-client";
import { RULES, formatDate } from "@/lib/checks";
import type { Claim, IssueKind } from "@/data/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrustLint dashboard – flagged knowledge documents" },
      {
        name: "description",
        content:
          "Ranked list of internal documents that can no longer be trusted, with the rule, the evidence quote and the person who should fix it.",
      },
      { property: "og:title", content: "TrustLint dashboard – flagged knowledge documents" },
      {
        property: "og:description",
        content: "Outdated values, contradictions, missing owners and stale pages, ranked by impact.",
      },
    ],
  }),
  component: Dashboard,
});

const ISSUE_KINDS = Object.keys(RULES) as IssueKind[];

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-mono text-3xl font-semibold">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { docs, analysis, newBadges, people, replaceClaimsForDoc } = useTrustLint();
  const [status, setStatus] = useState("all");
  const [country, setCountry] = useState("all");
  const [kind, setKind] = useState("all");
  const [resolution, setResolutionFilter] = useState("all");
  const { resolutions } = useTeam();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const filtered = useMemo(
    () =>
      analysis.flagged.filter((doc) => {
        if (status !== "all" && analysis.statusByDoc[doc.id] !== status) return false;
        if (country !== "all" && (doc.country || "unknown") !== country) return false;
        if (kind !== "all" && !analysis.issuesByDoc[doc.id]!.some((i) => i.kind === kind))
          return false;
        if (resolution !== "all" && resolutionOf(resolutions, doc.id) !== resolution) return false;
        return true;
      }),
    [analysis, status, country, kind, resolution, resolutions],
  );

  const critical = analysis.flagged.filter((d) => analysis.statusByDoc[d.id] === "red").length;
  const fixedCount = analysis.flagged.filter((d) => resolutionOf(resolutions, d.id) === "fixed").length;
  const contacts = new Set(analysis.flagged.map((d) => analysis.whoToAskByDoc[d.id]!.person.id));

  const rerun = async () => {
    setRunning(true);
    setProgress(0);
    let failures = 0;
    let discarded = 0;
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]!;
      try {
        const result = await extractClaims({ title: doc.title, content: doc.content });
        discarded += result.dropped;
        const mapped: Claim[] = result.claims.map((c) => ({ ...c, doc_id: doc.id }));
        replaceClaimsForDoc(doc.id, mapped);
      } catch {
        failures += 1; // keep the seed claims of this document
      }
      setProgress(Math.round(((i + 1) / docs.length) * 100));
    }
    setRunning(false);
    toast.success(
      `${docs.length} documents processed, ${failures} failure${failures === 1 ? "" : "s"}, ${discarded} claim${discarded === 1 ? "" : "s"} discarded because the quote was not found`,
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge lint report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every flag below shows its rule, the exact sentence as evidence and who should fix it.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={rerun} disabled={running} variant="outline">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Re-run AI extraction on all documents
          </Button>
          {running ? <Progress value={progress} className="h-1.5 w-64" /> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Documents scanned" value={docs.length} />
        <Kpi label="Flagged" value={analysis.flagged.length} hint="at least one issue" />
        <Kpi label="Critical" value={critical} hint="red – do not trust" />
        <Kpi label="People to notify" value={contacts.size} hint="distinct contacts" />
        <Kpi label="Resolved" value={`${fixedCount}/${analysis.flagged.length}`} hint="marked fixed by the legal team" />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Flagged documents, by priority</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status">
                  {status === "all" ? "All statuses" : status === "red" ? "Red" : "Amber"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="amber">Amber</SelectItem>
              </SelectContent>
            </Select>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Country">
                  {country === "all" ? "All countries" : country === "unknown" ? "Unknown" : country}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                <SelectItem value="BE">BE</SelectItem>
                <SelectItem value="NL">NL</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resolution} onValueChange={setResolutionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Resolution">
                  {resolution === "all" ? "Any resolution" : RESOLUTION_LABEL[resolution as ResolutionStatus]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any resolution</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Issue">
                  {kind === "all" ? "All issue kinds" : RULES[kind as IssueKind].name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All issue kinds</SelectItem>
                {ISSUE_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {RULES[k].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Document</th>
                  <th className="px-3 py-2.5 font-medium">Owner</th>
                  <th className="px-3 py-2.5 font-medium">Issues</th>
                  <th className="px-3 py-2.5 font-medium">Resolution</th>
                  <th className="px-3 py-2.5 text-right font-medium">Views/mo</th>
                  <th className="px-5 py-2.5 text-right font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const owner = people.find((p) => p.id === doc.owner_id);
                  return (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <div className="flex items-start gap-3">
                          <StatusDot status={analysis.statusByDoc[doc.id]!} className="mt-1.5" />
                          <div>
                            <Link
                              to="/doc/$id"
                              params={{ id: doc.id }}
                              className="font-medium hover:underline"
                            >
                              {doc.title}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="font-mono text-[10px]">
                                {doc.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {doc.country || "no scope"} · reviewed {formatDate(doc.last_reviewed)}
                              </span>
                              {newBadges.includes(doc.id) ? (
                                <Badge className="bg-bad text-bad-foreground text-[10px]">NEW</Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="text-xs">
                          {owner ? owner.name : <span className="text-bad">none</span>}
                        </span>
                        {owner?.status === "left" ? (
                          <Badge variant="outline" className="ml-1 border-bad/40 text-[10px] text-bad">
                            left
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-wrap gap-1">
                          {analysis.issuesByDoc[doc.id]!.map((issue, idx) => (
                            <IssueBadge key={`${issue.kind}-${idx}`} issue={issue} />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <ResolutionBadge status={resolutionOf(resolutions, doc.id)} />
                      </td>
                      <td className="px-3 py-3 text-right align-top font-mono text-xs">
                        {doc.views_per_month}
                      </td>
                      <td className="px-5 py-3 text-right align-top font-mono font-semibold">
                        {analysis.priorityByDoc[doc.id]!.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No documents match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="gap-2">
            <ShieldCheck className="size-4 text-ok" />
            Trusted documents ({analysis.trusted.length})
            <ChevronDown className="size-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {analysis.trusted.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <StatusDot status="green" />
                    <Link to="/doc/$id" params={{ id: doc.id }} className="text-sm hover:underline">
                      {doc.title}
                    </Link>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {doc.type}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    reviewed {formatDate(doc.last_reviewed)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
