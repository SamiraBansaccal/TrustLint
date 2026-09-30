import { useEffect, useState } from "react";
import { z } from "zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, RotateCcw, Siren } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DraftMessageButton } from "@/components/trustlint/draft-message";
import { useTrustLint } from "@/lib/trustlint-context";
import { formatDate } from "@/lib/checks";
import { RealReferenceTable } from "@/components/trustlint/real-reference-table";

export const Route = createFileRoute("/reference")({
  head: () => ({
    meta: [
      { title: "Reference & Legal Watch – TrustLint" },
      {
        name: "description",
        content:
          "The simulated source of truth for payroll parameters. Change a value and see instantly which internal documents became wrong.",
      },
      { property: "og:title", content: "Reference & Legal Watch – TrustLint" },
      {
        property: "og:description",
        content: "Simulate a legal change and see the impact on internal documents immediately.",
      },
    ],
  }),
  component: ReferencePage,
});

interface Impact {
  from: string;
  to: string;
  docIds: string[];
}

function ReferencePage() {
  const { reference, setReferenceValue, simulateLegalWatch, resetSeed, analysis, docs, claims } =
    useTrustLint();
  const { dataset } = useTrustLint();
  const [impact, setImpact] = useState<Impact | null>(null);

  const runLegalWatch = () => {
    const { from, to } = simulateLegalWatch();
    const affected = Array.from(
      new Set(
        claims
          .filter(
            (c) =>
              c.topic_param === "indexation.rate" &&
              c.scope === "BE-CP200" &&
              c.value.trim() !== to,
          )
          .map((c) => c.doc_id),
      ),
    );
    setImpact({ from, to, docIds: affected });
    toast.warning(
      `Legal Watch: CP 200 indexation changes from ${from} to ${to}. ${affected.length} internal documents now state an outdated value.`,
    );
  };

  const reset = () => {
    setImpact(null);
    resetSeed();
    toast.success("Reset to seed data.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reference & Legal Watch</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The source of truth. Where a reference exists, it is the arbiter — documents are compared
            against it, not against each other.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runLegalWatch} disabled={dataset === "real"} title={dataset === "real" ? "Switch to demo figures to simulate an alert" : undefined}>
            <Siren className="size-4" />
            Simulate Legal Watch alert
          </Button>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="size-4" />
            Reset to seed data
          </Button>
        </div>
      </div>

      {impact ? (
        <Card className="border-bad/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-bad">
              <AlertTriangle className="size-4" />
              Legal Watch: CP 200 indexation changes from {impact.from} to {impact.to}.{" "}
              {impact.docIds.length} internal documents now state an outdated value.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {impact.docIds.map((id) => {
              const doc = docs.find((d) => d.id === id)!;
              const contact = analysis.whoToAskByDoc[id]!;
              const quote = claims.find(
                (c) => c.doc_id === id && c.topic_param === "indexation.rate",
              )?.quote;
              return (
                <div
                  key={id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4"
                >
                  <div className="max-w-2xl">
                    <Link
                      to="/doc/$id"
                      params={{ id }}
                      className="font-medium hover:underline"
                    >
                      {doc.title}
                    </Link>
                    {quote ? (
                      <blockquote className="mt-2 border-l-2 border-warn/60 bg-muted/60 px-3 py-2 text-sm italic">
                        “{quote}”
                      </blockquote>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Who to ask: {contact.person.name} · {contact.person.role}
                    </p>
                  </div>
                  <DraftMessageButton
                    doc={doc}
                    issues={analysis.issuesByDoc[id]!}
                    person={contact.person}
                    variant="outline"
                    size="sm"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {dataset === "real" ? <RealReferenceTable /> : (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reference entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2 font-medium">Parameter</th>
                <th className="px-3 py-2 font-medium">Scope</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-5 py-2 font-medium">Effective</th>
              </tr>
            </thead>
            <tbody>
              {reference.map((entry) => (
                <tr
                  key={`${entry.topic_param}-${entry.scope}`}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-5 py-2 font-mono text-xs">{entry.topic_param}</td>
                  <td className="px-3 py-2 font-mono text-xs">{entry.scope}</td>
                  <td className="px-3 py-2">
                    <DemoValueInput
                      value={entry.value}
                      onCommit={(v) => setReferenceValue(entry.topic_param, entry.scope, v)}
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{entry.source}</td>
                  <td className="px-5 py-2 text-xs text-muted-foreground">
                    {formatDate(entry.effective_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      )}
      <p className="text-xs text-muted-foreground">
        Every change recomputes all checks immediately. Documents whose status got worse keep a NEW
        badge on the dashboard until you reset.
      </p>
    </div>
  );
}

const refValueSchema = z.string().trim().min(1, "Value cannot be empty").max(60, "Max 60 characters");

/** Demo editor: validates with zod, applies on Enter or when leaving the field. */
function DemoValueInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft === value) return;
    const parsed = refValueSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      setDraft(value);
      return;
    }
    onCommit(parsed.data);
  };
  return (
    <Input
      value={draft}
      maxLength={60}
      className="h-8 w-36 font-mono text-xs"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
}
