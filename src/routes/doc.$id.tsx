import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/trustlint/status";
import { HighlightedText } from "@/components/trustlint/highlighted-text";
import { DraftMessageButton } from "@/components/trustlint/draft-message";
import { issueTone } from "@/components/trustlint/issue-badge";
import { useTrustLint } from "@/lib/trustlint-context";
import { RULES, formatDate } from "@/lib/checks";
import { quoteIsVerbatim } from "@/lib/claim-schema";
import type { Doc } from "@/data/types";

export const Route = createFileRoute("/doc/$id")({
  head: () => ({
    meta: [
      { title: "Document detail – TrustLint" },
      {
        name: "description",
        content:
          "Why this internal document is flagged: the rule, the verbatim evidence, the trust-score comparison and who to ask.",
      },
      { property: "og:title", content: "Document detail – TrustLint" },
      {
        property: "og:description",
        content: "Rule, evidence quote and contact for every flag on this document.",
      },
    ],
  }),
  component: DocumentDetail,
});

function TrustCard({ doc, label }: { doc: Doc; label: string }) {
  const { analysis } = useTrustLint();
  const t = analysis.trustByDoc[doc.id]!;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <Link to="/doc/$id" params={{ id: doc.id }} className="mt-1 block font-medium hover:underline">
        {doc.title}
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">
        {doc.type} · reviewed {formatDate(doc.last_reviewed)}
      </p>
      <dl className="mt-3 space-y-1 font-mono text-xs">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">authority ({doc.type})</dt>
          <dd>{t.authority}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">owner active</dt>
          <dd>{t.ownerActive}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">fresh</dt>
          <dd>{t.fresh}</dd>
        </div>
        <Separator className="my-1" />
        <div className="flex justify-between font-semibold">
          <dt>trust score</dt>
          <dd>{t.total}</dd>
        </div>
      </dl>
    </div>
  );
}

function DocumentDetail() {
  const { id } = useParams({ from: "/doc/$id" });
  const { analysis, people, docs } = useTrustLint();
  const doc = docs.find((d) => d.id === id);

  if (!doc) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">This document does not exist.</p>
        <Link to="/" className="mt-3 inline-block text-sm underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const issues = analysis.issuesByDoc[doc.id]!;
  const claims = analysis.claimsByDoc[doc.id]!;
  const contact = analysis.whoToAskByDoc[doc.id]!;
  const owner = people.find((p) => p.id === doc.owner_id);
  const evidence = issues.map((i) => i.evidence_quote).filter((q): q is string => Boolean(q));

  const reasonText =
    contact.reason === "owner"
      ? "Owner of this document and still active."
      : contact.reason === "expertise"
        ? `Active expert for "${contact.topic}", a topic this document makes claims about.`
        : "Fallback contact: Knowledge Manager, because no active expert matches this document.";

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{doc.title}</h1>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {doc.id} · {doc.type}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {doc.country || "no country stated"} · last reviewed {formatDate(doc.last_reviewed)} ·{" "}
            {doc.views_per_month} views/month · owner{" "}
            {owner ? `${owner.name}${owner.status === "left" ? " (left)" : ""}` : "none"}
          </p>
        </div>
        <StatusPill status={analysis.statusByDoc[doc.id]!} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {issues.length} issue{issues.length === 1 ? "" : "s"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {issues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No rule fired on this document. It is considered trusted.
                </p>
              ) : null}
              {issues.map((issue, idx) => {
                const related = issue.related_doc_id
                  ? docs.find((d) => d.id === issue.related_doc_id)
                  : undefined;
                return (
                  <div key={idx} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium ${issueTone(issue.weight)}`}
                      >
                        {RULES[issue.kind].name}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        rule: {issue.kind} · weight {issue.weight}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{issue.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{RULES[issue.kind].what}</p>
                    {issue.evidence_quote ? (
                      <blockquote className="mt-3 border-l-2 border-warn/60 bg-muted/60 px-3 py-2 text-sm italic">
                        “{issue.evidence_quote}”
                      </blockquote>
                    ) : null}
                    {related &&
                    (issue.kind === "contradiction" ||
                      issue.kind === "needs_confirmation" ||
                      issue.kind === "conflicting_source") ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <TrustCard doc={doc} label="This document" />
                        <TrustCard doc={related} label="Other source" />
                        <p className="sm:col-span-2 flex items-start gap-2 text-xs text-muted-foreground">
                          <Info className="mt-0.5 size-3.5 shrink-0" />
                          {analysis.trustByDoc[related.id]!.total >
                          analysis.trustByDoc[doc.id]!.total
                            ? `Trust "${related.title}" — higher trust score.`
                            : `This document is the more reliable source; the other one should be corrected or confirmed.`}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document text</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <HighlightedText text={doc.content} quotes={evidence} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Extracted claims</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-y border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2 font-medium">Parameter</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                    <th className="px-5 py-2 font-medium">Quote verified</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-5 py-2 font-mono text-xs">{claim.topic_param}</td>
                      <td className="px-3 py-2 font-mono text-xs">{claim.scope}</td>
                      <td className="px-3 py-2 font-medium">{claim.value}</td>
                      <td className="px-5 py-2">
                        {quoteIsVerbatim(claim.quote, doc.content) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-ok">
                            <Check className="size-3.5" /> verbatim
                          </span>
                        ) : (
                          <span className="text-xs text-bad">not found</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {claims.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-sm text-muted-foreground">
                        No claims about known parameters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Who to ask</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{contact.person.name}</p>
                <p className="text-sm text-muted-foreground">{contact.person.role}</p>
              </div>
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                {reasonText}
              </p>
              <DraftMessageButton
                doc={doc}
                issues={issues.length ? issues : []}
                person={contact.person}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
