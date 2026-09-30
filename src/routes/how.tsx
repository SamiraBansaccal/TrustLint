import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AUTHORITY_SCORE,
  DUPLICATE_THRESHOLD,
  REVIEW_CYCLE_MONTHS,
  RULES,
} from "@/lib/checks";
import type { IssueKind } from "@/data/types";

export const Route = createFileRoute("/how")({
  head: () => ({
    meta: [
      { title: "How trust is computed – TrustLint" },
      {
        name: "description",
        content:
          "Every TrustLint rule, its weight and its reason text, plus the trust-score and priority formulas. Never a black box.",
      },
      { property: "og:title", content: "How trust is computed – TrustLint" },
      {
        property: "og:description",
        content: "Rules, weights, trust score, priority and the single place AI is used.",
      },
    ],
  }),
  component: HowPage,
});

const ORDER: IssueKind[] = [
  "reference_mismatch",
  "contradiction",
  "no_owner",
  "owner_left",
  "stale",
  "needs_confirmation",
  "duplicate",
  "scope_missing",
  "conflicting_source",
];

const REASON_TEMPLATES: Record<IssueKind, string> = {
  reference_mismatch: "Says {value}, reference says {ref value} ({source}, effective {date}).",
  contradiction: "Contradicts '{trusted title}': says {value}, trusted source says {trusted value}.",
  no_owner: "No owner: nobody is accountable for this document.",
  owner_left: "Owner {name} left on {date}.",
  stale: "Last reviewed {date}; {type} documents must be reviewed every {n} months.",
  needs_confirmation:
    "A more recent source ('{title}', {date}) says {value}. Ask {who to ask} to confirm whether this changed.",
  duplicate: "Near-duplicate of '{other title}' (similarity {x.xx}).",
  scope_missing: "No country or scope stated: readers cannot tell where this applies.",
  conflicting_source:
    "'{title}' says {value}; this document is considered more reliable (trust score {a} vs {b}).",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">{children}</CardContent>
    </Card>
  );
}

function HowPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">How trust is computed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Never a black box: every flag is a deterministic rule plus a verbatim quote plus a contact.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">The rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2 font-medium">Rule</th>
                <th className="px-3 py-2 font-medium">Weight</th>
                <th className="px-5 py-2 font-medium">Reason shown</th>
              </tr>
            </thead>
            <tbody>
              {ORDER.map((kind) => (
                <tr key={kind} className="border-b border-border align-top last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium">{RULES[kind].name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{kind}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{RULES[kind].what}</p>
                  </td>
                  <td className="px-3 py-3 font-mono">{RULES[kind].weight}</td>
                  <td className="px-5 py-3 font-mono text-xs">{REASON_TEMPLATES[kind]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Trust score of a source">
          <p>
            <span className="font-mono">trust = authority + owner active + fresh</span>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              authority:{" "}
              {Object.entries(AUTHORITY_SCORE)
                .map(([type, score]) => `${type} ${score}`)
                .join(", ")}
            </li>
            <li>owner active: +1 when the owner still works here</li>
            <li>
              fresh: +1 when the document is not stale; a chat message counts as fresh for 60 days
            </li>
          </ul>
          <p>
            Review cycles in months:{" "}
            {Object.entries(REVIEW_CYCLE_MONTHS)
              .filter(([type]) => type !== "chat")
              .map(([type, n]) => `${type} ${n}`)
              .join(", ")}
            . Chat messages are never flagged stale.
          </p>
        </Section>

        <Section title="Status and priority">
          <p>
            <span className="font-mono">red</span> if any issue has weight ≥ 4,{" "}
            <span className="font-mono">amber</span> if there is any issue,{" "}
            <span className="font-mono">green</span> if there is none.
          </p>
          <p>
            <span className="font-mono">priority = (sum of issue weights) × log10(10 + views per month)</span>,
            rounded to one decimal. Documents nobody reads rank below documents everyone reads.
          </p>
        </Section>

        <Section title="Contradiction policy">
          <p>
            Where a reference entry exists, the reference is the arbiter: documents are compared to
            it and never flagged twice for the same parameter.
          </p>
          <p>
            Where no reference exists, the document with the highest trust score wins (ties go to the
            most recent review date). Other documents get a contradiction. The trusted source itself
            gets “needs confirmation” when a conflicting document is more recent, otherwise
            “conflicting source”.
          </p>
          <p>
            Duplicates use Jaccard similarity on word sets (stop words and words under 3 characters
            removed) with a threshold of {DUPLICATE_THRESHOLD}. Only the less trusted document of a
            pair is flagged.
          </p>
        </Section>

        <Section title="Where AI is used">
          <p>
            An AI model reads each document and extracts its key facts (parameter, value, exact
            sentence). Facts whose sentence is not found word for word are discarded. The trust rules
            then run on these facts.
          </p>
          <ol className="grid gap-2 sm:grid-cols-3">
            {[
              "Document",
              "AI extracts facts with exact quotes",
              "Deterministic rules flag issues",
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p>
            AI does exactly one thing: extracting claims from a document, server-side. It never
            decides whether something is wrong — all checks are pure deterministic functions.
          </p>
          <p>
            Every extracted claim must quote the document verbatim. Quotes that cannot be found in
            the text are discarded and counted, so the AI cannot invent evidence. Document content is
            treated as untrusted input and never as instructions.
          </p>
          <p className="rounded-md bg-muted px-3 py-2 text-xs">
            All documents, people and values in this proof of concept are fictional.
          </p>
        </Section>
      </div>
    </div>
  );
}
