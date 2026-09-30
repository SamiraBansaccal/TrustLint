import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, PlayCircle, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/trustlint/status";
import { issueTone } from "@/components/trustlint/issue-badge";
import { useTrustLint } from "@/lib/trustlint-context";
import { extractClaims } from "@/lib/extract-client";
import { analyze, RULES } from "@/lib/checks";
import { quoteIsVerbatim } from "@/lib/claim-schema";
import { PEOPLE } from "@/data/people";
import type { Claim, Country, Doc, DocType, Issue, Status } from "@/data/types";

export const Route = createFileRoute("/check")({
  head: () => ({
    meta: [
      { title: "Check a new document – TrustLint" },
      {
        name: "description",
        content:
          "Run TrustLint on a draft before it is published: extracted claims, quote verification and the issues it would get.",
      },
      { property: "og:title", content: "Check a new document – TrustLint" },
      {
        property: "og:description",
        content: "Check a document before it is published — like CI for code.",
      },
    ],
  }),
  component: CheckPage,
});

const formSchema = z.object({
  title: z.string().trim().min(3).max(200),
  type: z.enum(["procedure", "policy", "checklist", "faq", "wiki", "chat"]),
  owner_id: z.string(),
  country: z.enum(["BE", "NL", ""]),
  content: z.string().trim().min(20).max(5000),
});

const EXAMPLE = {
  title: "Tips for new payroll consultants",
  type: "wiki" as DocType,
  owner_id: "p2",
  country: "BE" as Country,
  content:
    "Welcome to the team! Remember that the Dimona can be sent up to 24 hours after the employee's first day. Meal vouchers: the employer pays at most €7.00 per voucher. Client payroll inputs are due by the 5th working day of the month.",
};

interface Result {
  doc: Doc;
  claims: Claim[];
  issues: Issue[];
  status: Status;
  dropped: number;
}

function CheckPage() {
  const { docs, claims, reference, addDocument } = useTrustLint();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocType>("wiki");
  const [ownerId, setOwnerId] = useState("p2");
  const [country, setCountry] = useState<Country>("BE");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const loadExample = () => {
    setTitle(EXAMPLE.title);
    setType(EXAMPLE.type);
    setOwnerId(EXAMPLE.owner_id);
    setCountry(EXAMPLE.country);
    setContent(EXAMPLE.content);
    setResult(null);
  };

  const run = async () => {
    const parsed = formSchema.safeParse({ title, type, owner_id: ownerId, country, content });
    if (!parsed.success) {
      toast.error("Please fill in a title (3–200 characters) and content (20–5000 characters).");
      return;
    }
    setBusy(true);
    try {
      const extraction = await extractClaims({ title: parsed.data.title, content: parsed.data.content });
      const candidateId = `D${docs.length + 1}`;
      const candidate: Doc = {
        id: candidateId,
        title: parsed.data.title,
        type: parsed.data.type,
        owner_id: parsed.data.owner_id,
        last_reviewed: new Date().toISOString().slice(0, 10),
        country: parsed.data.country,
        views_per_month: 0,
        content: parsed.data.content,
      };
      const candidateClaims: Claim[] = extraction.claims.map((c) => ({ ...c, doc_id: candidateId }));
      const analysis = analyze({
        docs: [...docs, candidate],
        claims: [...claims, ...candidateClaims],
        reference,
        people: PEOPLE,
      });
      setResult({
        doc: candidate,
        claims: candidateClaims,
        issues: analysis.issuesByDoc[candidateId]!,
        status: analysis.statusByDoc[candidateId]!,
        dropped: extraction.dropped,
      });
    } catch {
      toast.error("Extraction failed. The document was not checked.");
    } finally {
      setBusy(false);
    }
  };

  const publish = () => {
    if (!result) return;
    addDocument(result.doc, result.claims);
    toast.success("Published to the knowledge base (in memory only).");
    void navigate({ to: "/doc/$id", params: { id: result.doc.id } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Check a new document</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check a document before it is published — like CI for code.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Draft</CardTitle>
            <Button variant="outline" size="sm" onClick={loadExample}>
              <Wand2 className="size-4" />
              Load example
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tips for new payroll consultants"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as DocType)}>
                  <SelectTrigger>
                    <SelectValue>{type}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {["procedure", "policy", "checklist", "faq", "wiki", "chat"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger>
                    <SelectValue>{PEOPLE.find((p) => p.id === ownerId)?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PEOPLE.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select value={country || "unknown"} onValueChange={(v) => setCountry(v === "unknown" ? "" : (v as Country))}>
                  <SelectTrigger>
                    <SelectValue>{country || "unknown"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BE">BE</SelectItem>
                    <SelectItem value="NL">NL</SelectItem>
                    <SelectItem value="unknown">unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Content</Label>
                <span className="font-mono text-xs text-muted-foreground">
                  {content.length}/5000
                </span>
              </div>
              <Textarea
                id="content"
                rows={10}
                value={content}
                maxLength={5000}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the document text…"
              />
            </div>
            <Button onClick={run} disabled={busy} className="w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              Run TrustLint
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!result ? (
              <p className="text-sm text-muted-foreground">
                Nothing checked yet. AI extracts the claims, then the deterministic rules run against
                the whole knowledge base.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusPill status={result.status} />
                  <span className="text-xs text-muted-foreground">
                    {result.claims.length} claim{result.claims.length === 1 ? "" : "s"} extracted ·{" "}
                    {result.dropped} discarded (quote not found)
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Extracted claims</h3>
                  <ul className="mt-2 space-y-2">
                    {result.claims.map((claim, i) => (
                      <li key={i} className="rounded-md border border-border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs">
                            {claim.topic_param} · {claim.scope}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-ok">
                            <Check className="size-3.5" />
                            {quoteIsVerbatim(claim.quote, result.doc.content) ? "verbatim" : "—"}
                          </span>
                        </div>
                        <p className="mt-1 font-medium">{claim.value}</p>
                        <p className="mt-1 text-xs italic text-muted-foreground">“{claim.quote}”</p>
                      </li>
                    ))}
                    {result.claims.length === 0 ? (
                      <li className="text-sm text-muted-foreground">
                        No claims about known parameters.
                      </li>
                    ) : null}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">
                    Issues if published ({result.issues.length})
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {result.issues.map((issue, i) => (
                      <li key={i} className="rounded-md border border-border p-3">
                        <span
                          className={`rounded-md border px-2 py-0.5 font-mono text-[11px] ${issueTone(issue.weight)}`}
                        >
                          {RULES[issue.kind].name} · weight {issue.weight}
                        </span>
                        <p className="mt-2 text-sm">{issue.reason}</p>
                        {issue.evidence_quote ? (
                          <blockquote className="mt-2 border-l-2 border-warn/60 bg-muted/60 px-3 py-1.5 text-xs italic">
                            “{issue.evidence_quote}”
                          </blockquote>
                        ) : null}
                      </li>
                    ))}
                    {result.issues.length === 0 ? (
                      <li className="text-sm text-ok">Clean — this document passes every rule.</li>
                    ) : null}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button onClick={publish}>Publish to knowledge base</Button>
                  <Button variant="outline" onClick={() => setResult(null)}>
                    <X className="size-4" />
                    Discard
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
