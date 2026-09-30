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
import { StatusDot, StatusLegend } from "@/components/trustlint/status";
import { ISSUE_LABEL } from "@/components/trustlint/issue-badge";
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

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "bad" | "ok";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          "mt-1 text-2xl font-bold sm:text-3xl " +
          (tone === "bad" ? "text-bad" : tone === "ok" ? "text-ok" : "text-primary")
        }
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Dashboard() {
  const { docs, analysis, newBadges, people, replaceClaimsForDoc, aiRun, recordAiRun } = useTrustLint();
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
  const checkCount = analysis.flagged.filter((d) => analysis.statusByDoc[d.id] === "amber").length;
  const fixedCount = analysis.flagged.filter((d) => resolutionOf(resolutions, d.id) === "fixed").length;
  const contacts = new Set(analysis.flagged.map((d) => analysis.whoToAskByDoc[d.id]!.person.id));

  const rerun = async () => {
    setRunning(true);
    setProgress(0);
    let failures = 0;
    let discarded = 0;
    let facts = 0;
    const live: string[] = [];
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]!;
      try {
        const result = await extractClaims({ title: doc.title, content: doc.content });
        discarded += result.dropped;
        facts += result.claims.length;
        live.push(doc.id);
        const mapped: Claim[] = result.claims.map((c) => ({ ...c, doc_id: doc.id }));
        replaceClaimsForDoc(doc.id, mapped);
      } catch {
        failures += 1; // keep the seed claims of this document
      }
      setProgress(Math.round(((i + 1) / docs.length) * 100));
    }
    setRunning(false);
    recordAiRun({ at: new Date(), docs: live.length, facts, discarded }, live);
    toast.success(
      `${docs.length} documents processed, ${failures} failure${failures === 1 ? "" : "s"}, ${discarded} claim${discarded === 1 ? "" : "s"} discarded because the quote was not found`,
    );
  };

  const selects = (
    <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full lg:w-36">
          <SelectValue placeholder="Status">
            {status === "all" ? "All statuses" : status === "red" ? "Do not use" : "Check before use"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="red">Do not use</SelectItem>
          <SelectItem value="amber">Check before use</SelectItem>
        </SelectContent>
      </Select>
      <Select value={country} onValueChange={setCountry}>
        <SelectTrigger className="w-full lg:w-36">
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
        <SelectTrigger className="w-full lg:w-40">
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
        <SelectTrigger className="w-full lg:w-48">
          <SelectValue placeholder="Issue">
            {kind === "all" ? "All issue kinds" : ISSUE_LABEL[kind as IssueKind]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All issue kinds</SelectItem>
          {ISSUE_KINDS.map((k) => (
            <SelectItem key={k} value={k}>
              {ISSUE_LABEL[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Knowledge lint report</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every flag shows its rule, the exact sentence as evidence and who should fix it.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:max-w-sm sm:items-end sm:text-right">
          <Button onClick={rerun} disabled={running} variant="outline" className="w-full sm:w-auto">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Re-read all documents with AI
          </Button>
          {running ? <Progress value={progress} className="h-1.5 w-full sm:w-64" /> : null}
          <p className="text-[11px] leading-snug text-muted-foreground">
            An AI model reads each document and extracts its key facts (parameter, value, exact
            sentence). Facts whose sentence is not found word for word are discarded. The trust rules
            then run on these facts.
          </p>
          <p className="text-[11px] font-medium text-foreground">
            {aiRun
              ? `Last AI read: ${aiRun.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${aiRun.docs} documents, ${aiRun.facts} facts found, ${aiRun.discarded} discarded.`
              : "Using pre-verified facts (no AI read yet in this session)."}
          </p>
        </div>
      </div>

      <StatusLegend />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        <Kpi label="Documents scanned" value={docs.length} />
        <Kpi label="Flagged" value={analysis.flagged.length} hint="at least one issue" />
        <Kpi label="Do not use" value={critical} hint="states something wrong" tone="bad" />
        <Kpi label="Check before use" value={checkCount} hint="trust signal missing" />
        <Kpi label="People to notify" value={contacts.size} hint="distinct contacts" />
        <Kpi label="Resolved" value={`${fixedCount}/${analysis.flagged.length}`} hint="marked fixed" tone="ok" />
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
            Flagged documents · by priority
          </h2>
          {selects}
        </div>

        {/* Mobile / tablet: cards */}
        <div className="space-y-3 md:hidden">
          {filtered.map((doc) => {
            const owner = people.find((p) => p.id === doc.owner_id);
            const st = analysis.statusByDoc[doc.id]!;
            return (
              <Link
                key={doc.id}
                to="/doc/$id"
                params={{ id: doc.id }}
                className={
                  "block overflow-hidden rounded-xl border border-border border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md " +
                  (st === "red" ? "border-l-bad" : "border-l-warn")
                }
              >
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={
                          "rounded px-2 py-0.5 text-[10px] font-bold uppercase " +
                          (st === "red" ? "bg-bad/10 text-bad" : "bg-warn/15 text-warn-foreground")
                        }
                      >
                        {st === "red" ? "Do not use" : "Check before use"}
                      </span>
                      {newBadges.includes(doc.id) ? (
                        <Badge className="bg-bad text-bad-foreground text-[10px]">NEW</Badge>
                      ) : null}
                    </div>
                    <span className="font-mono text-xs font-semibold text-primary">
                      {analysis.priorityByDoc[doc.id]!.toFixed(1)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-primary">{doc.title}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Type</p>
                      <p className="text-xs font-medium capitalize">{doc.type}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase text-muted-foreground">Owner</p>
                      <p className="truncate text-xs font-medium">
                        {owner ? owner.name : <span className="text-bad">none</span>}
                        {owner?.status === "left" ? <span className="ml-1 text-bad">(left)</span> : null}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {analysis.issuesByDoc[doc.id]!.map((issue, idx) => (
                      <IssueBadge key={`${issue.kind}-${idx}`} issue={issue} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border bg-muted/60 px-4 py-2">
                  <span className="text-[11px] text-muted-foreground">
                    {doc.views_per_month} views/mo · {doc.country || "no scope"}
                  </span>
                  <ResolutionBadge status={resolutionOf(resolutions, doc.id)} />
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No documents match these filters.
            </p>
          ) : null}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Document</th>
                  <th className="px-3 py-3 font-semibold">Owner</th>
                  <th className="px-3 py-3 font-semibold">Issues</th>
                  <th className="px-3 py-3 font-semibold">Resolution</th>
                  <th className="px-3 py-3 text-right font-semibold">Views/mo</th>
                  <th className="px-5 py-3 text-right font-semibold">Priority</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const owner = people.find((p) => p.id === doc.owner_id);
                  return (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-3">
                          <div>
                            <StatusDot status={analysis.statusByDoc[doc.id]!} className="mb-1 flex w-fit" />
                            <Link
                              to="/doc/$id"
                              params={{ id: doc.id }}
                              className="font-semibold text-primary hover:underline"
                            >
                              {doc.title}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] capitalize">
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
                      <td className="px-3 py-3.5 align-top">
                        <span className="text-xs">
                          {owner ? owner.name : <span className="text-bad">none</span>}
                        </span>
                        {owner?.status === "left" ? (
                          <Badge variant="outline" className="ml-1 border-bad/40 text-[10px] text-bad">
                            left
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <div className="flex flex-wrap gap-1">
                          {analysis.issuesByDoc[doc.id]!.map((issue, idx) => (
                            <IssueBadge key={`${issue.kind}-${idx}`} issue={issue} />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <ResolutionBadge status={resolutionOf(resolutions, doc.id)} />
                      </td>
                      <td className="px-3 py-3.5 text-right align-top font-mono text-xs">
                        {doc.views_per_month}
                      </td>
                      <td className="px-5 py-3.5 text-right align-top font-mono font-bold text-primary">
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
        </div>
      </section>


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
