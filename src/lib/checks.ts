import { FALLBACK_CONTACT_ID } from "@/data/people";
import type {
  Claim,
  Doc,
  DocType,
  Issue,
  IssueKind,
  Person,
  ReferenceEntry,
  Status,
} from "@/data/types";

/* ------------------------------------------------------------------ */
/* Value normalisation                                                 */
/* ------------------------------------------------------------------ */

/** lowercase, trim, collapse whitespace, decimal commas -> dots */
export function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, " ")
    .trim();
}

function numberAndUnit(normalized: string): { num: number; unit: string } | null {
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const unit = (normalized.slice(0, match.index) + normalized.slice(match.index! + match[0].length))
    .replace(/\s+/g, " ")
    .trim();
  return { num: Number(match[0]), unit };
}

/** Compare two values: numerically when both share the same unit text. */
export function valuesEqual(a: string, b: string): boolean {
  const na = normalizeValue(a);
  const nb = normalizeValue(b);
  if (na === nb) return true;
  const pa = numberAndUnit(na);
  const pb = numberAndUnit(nb);
  if (pa && pb && pa.unit === pb.unit) return pa.num === pb.num;
  return false;
}

/* ------------------------------------------------------------------ */
/* Rule catalogue                                                      */
/* ------------------------------------------------------------------ */

export const RULES: Record<IssueKind, { name: string; weight: number; short: string; what: string }> =
  {
    reference_mismatch: {
      name: "Reference mismatch",
      weight: 5,
      short: "Outdated value",
      what: "A claim in the document contradicts the source of truth (Legal Watch / policy board).",
    },
    contradiction: {
      name: "Contradiction",
      weight: 4,
      short: "Contradiction",
      what: "Another, more trusted internal document states a different value for the same parameter.",
    },
    no_owner: {
      name: "No owner",
      weight: 3,
      short: "No owner",
      what: "Nobody is accountable for keeping the document correct.",
    },
    owner_left: {
      name: "Owner left",
      weight: 3,
      short: "Owner left",
      what: "The accountable person no longer works here.",
    },
    stale: {
      name: "Stale",
      weight: 2,
      short: "Stale",
      what: "The document is past its review cycle.",
    },
    needs_confirmation: {
      name: "Needs confirmation",
      weight: 2,
      short: "Needs confirmation",
      what: "This is the most trusted source, but a more recent source says something different.",
    },
    duplicate: {
      name: "Near-duplicate",
      weight: 2,
      short: "Duplicate",
      what: "Another document says almost the same thing; readers can land on the wrong one.",
    },
    scope_missing: {
      name: "Missing scope",
      weight: 1,
      short: "No scope",
      what: "No country or scope is stated, so readers cannot tell where it applies.",
    },
    conflicting_source: {
      name: "Conflicting source",
      weight: 1,
      short: "Conflicting source",
      what: "A less trusted document disagrees with this one.",
    },
  };

export const REVIEW_CYCLE_MONTHS: Record<DocType, number> = {
  procedure: 12,
  policy: 12,
  checklist: 12,
  wiki: 12,
  faq: 6,
  chat: 0,
};

export const AUTHORITY_SCORE: Record<DocType, number> = {
  policy: 3,
  procedure: 3,
  checklist: 2,
  faq: 2,
  wiki: 2,
  chat: 1,
};

export const DUPLICATE_THRESHOLD = 0.5;
export const CHAT_FRESH_DAYS = 60;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function formatDate(iso: string): string {
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 86_400_000;
}

export function isStale(doc: Doc, today: Date): boolean {
  if (doc.type === "chat") return false;
  const cycle = REVIEW_CYCLE_MONTHS[doc.type];
  return today.getTime() > addMonths(parseDate(doc.last_reviewed), cycle).getTime();
}

export interface TrustBreakdown {
  authority: number;
  ownerActive: number;
  fresh: number;
  total: number;
}

export function trustScore(doc: Doc, people: Person[], today: Date): TrustBreakdown {
  const authority = AUTHORITY_SCORE[doc.type];
  const owner = people.find((p) => p.id === doc.owner_id);
  const ownerActive = owner && owner.status === "active" ? 1 : 0;
  const fresh =
    doc.type === "chat"
      ? daysBetween(today, parseDate(doc.last_reviewed)) < CHAT_FRESH_DAYS
        ? 1
        : 0
      : isStale(doc, today)
        ? 0
        : 1;
  return { authority, ownerActive, fresh, total: authority + ownerActive + fresh };
}

/* Duplicate detection ------------------------------------------------ */

const STOP_WORDS = new Set([
  "the","and","for","are","but","not","you","all","any","can","her","was","one","our","out","day",
  "get","has","him","his","how","its","new","now","old","see","two","who","did","yes","his","they",
  "this","that","with","from","have","will","must","must","their","them","then","than","been","were",
  "what","when","which","your","into","also","such","each","more","most","some","only","other","after",
  "before","these","those","there","here","about","would","could","should","because","while","within",
]);

export function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9€\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w)),
  );
}

export function jaccard(a: string, b: string): number {
  const sa = wordSet(a);
  const sb = wordSet(b);
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  sa.forEach((w) => {
    if (sb.has(w)) inter += 1;
  });
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/* Who to ask --------------------------------------------------------- */

export type ContactReason = "owner" | "expertise" | "fallback";

export interface WhoToAsk {
  person: Person;
  reason: ContactReason;
  topic?: string;
}

export function suggestedContact(docClaims: Claim[], people: Person[]): WhoToAsk {
  for (const claim of docClaims) {
    const topic = claim.topic_param.split(".")[0]!;
    const match = people.find((p) => p.status === "active" && p.expertise.includes(topic));
    if (match) return { person: match, reason: "expertise", topic };
  }
  const fallback = people.find((p) => p.id === FALLBACK_CONTACT_ID)!;
  return { person: fallback, reason: "fallback" };
}

export function whoToAsk(doc: Doc, docClaims: Claim[], people: Person[]): WhoToAsk {
  const owner = people.find((p) => p.id === doc.owner_id);
  if (owner && owner.status === "active") return { person: owner, reason: "owner" };
  return suggestedContact(docClaims, people);
}

/* ------------------------------------------------------------------ */
/* Status & priority                                                   */
/* ------------------------------------------------------------------ */

export function statusOf(issues: Issue[]): Status {
  if (issues.some((i) => i.weight >= 4)) return "red";
  if (issues.length > 0) return "amber";
  return "green";
}

export function priorityOf(issues: Issue[], views: number): number {
  const weight = issues.reduce((sum, i) => sum + i.weight, 0);
  return Math.round(weight * Math.log10(10 + views) * 10) / 10;
}

export const STATUS_RANK: Record<Status, number> = { green: 0, amber: 1, red: 2 };

/* ------------------------------------------------------------------ */
/* The analysis                                                        */
/* ------------------------------------------------------------------ */

export interface AnalysisResult {
  docs: Doc[];
  issuesByDoc: Record<string, Issue[]>;
  statusByDoc: Record<string, Status>;
  priorityByDoc: Record<string, number>;
  trustByDoc: Record<string, TrustBreakdown>;
  claimsByDoc: Record<string, Claim[]>;
  whoToAskByDoc: Record<string, WhoToAsk>;
  flagged: Doc[];
  trusted: Doc[];
}

export function analyze(input: {
  docs: Doc[];
  claims: Claim[];
  reference: ReferenceEntry[];
  people: Person[];
  today?: Date;
}): AnalysisResult {
  const { docs, claims, reference, people } = input;
  const today = input.today ?? new Date();

  const byId = new Map(docs.map((d) => [d.id, d]));
  const claimsByDoc: Record<string, Claim[]> = {};
  for (const doc of docs) claimsByDoc[doc.id] = [];
  for (const claim of claims) {
    if (claimsByDoc[claim.doc_id]) claimsByDoc[claim.doc_id]!.push(claim);
  }

  const issues: Issue[] = [];
  const trustByDoc: Record<string, TrustBreakdown> = {};
  for (const doc of docs) trustByDoc[doc.id] = trustScore(doc, people, today);

  /* 4.1 Freshness */
  for (const doc of docs) {
    if (isStale(doc, today)) {
      issues.push({
        doc_id: doc.id,
        kind: "stale",
        weight: RULES.stale.weight,
        reason: `Last reviewed ${formatDate(doc.last_reviewed)}; ${doc.type} documents must be reviewed every ${REVIEW_CYCLE_MONTHS[doc.type]} months.`,
      });
    }
  }

  /* 4.2 Ownership */
  for (const doc of docs) {
    if (!doc.owner_id) {
      issues.push({
        doc_id: doc.id,
        kind: "no_owner",
        weight: RULES.no_owner.weight,
        reason: "No owner: nobody is accountable for this document.",
      });
      continue;
    }
    const owner = people.find((p) => p.id === doc.owner_id);
    if (owner && owner.status === "left") {
      issues.push({
        doc_id: doc.id,
        kind: "owner_left",
        weight: RULES.owner_left.weight,
        reason: `Owner ${owner.name} left on ${formatDate(owner.left_date ?? "")}.`,
      });
    }
  }

  /* 4.3 Scope */
  for (const doc of docs) {
    if (!doc.country) {
      issues.push({
        doc_id: doc.id,
        kind: "scope_missing",
        weight: RULES.scope_missing.weight,
        reason: "No country or scope stated: readers cannot tell where this applies.",
      });
    }
  }

  /* 4.4 Reference mismatch */
  const refKey = (t: string, s: string) => `${t}|${s}`;
  const refMap = new Map(reference.map((r) => [refKey(r.topic_param, r.scope), r]));
  for (const claim of claims) {
    const ref = refMap.get(refKey(claim.topic_param, claim.scope));
    if (!ref) continue;
    if (!valuesEqual(claim.value, ref.value)) {
      issues.push({
        doc_id: claim.doc_id,
        kind: "reference_mismatch",
        weight: RULES.reference_mismatch.weight,
        reason: `Says ${claim.value}, reference says ${ref.value} (${ref.source}, effective ${formatDate(ref.effective_date)}).`,
        evidence_quote: claim.quote,
      });
    }
  }

  /* 4.5 Contradiction — only where no reference exists */
  const groups = new Map<string, Claim[]>();
  for (const claim of claims) {
    const key = refKey(claim.topic_param, claim.scope);
    if (refMap.has(key)) continue;
    if (!byId.has(claim.doc_id)) continue;
    const list = groups.get(key) ?? [];
    list.push(claim);
    groups.set(key, list);
  }

  for (const group of groups.values()) {
    const distinct = new Set(group.map((c) => normalizeValue(c.value)));
    if (distinct.size < 2) continue;

    let trusted = group[0]!;
    for (const claim of group.slice(1)) {
      const a = trustByDoc[claim.doc_id]!.total;
      const b = trustByDoc[trusted.doc_id]!.total;
      if (
        a > b ||
        (a === b &&
          parseDate(byId.get(claim.doc_id)!.last_reviewed) >
            parseDate(byId.get(trusted.doc_id)!.last_reviewed))
      ) {
        trusted = claim;
      }
    }
    const trustedDoc = byId.get(trusted.doc_id)!;

    for (const claim of group) {
      if (claim.doc_id === trusted.doc_id) continue;
      if (valuesEqual(claim.value, trusted.value)) continue;
      const doc = byId.get(claim.doc_id)!;
      issues.push({
        doc_id: doc.id,
        kind: "contradiction",
        weight: RULES.contradiction.weight,
        reason: `Contradicts '${trustedDoc.title}': says ${claim.value}, trusted source says ${trusted.value}.`,
        evidence_quote: claim.quote,
        related_doc_id: trustedDoc.id,
      });
    }

    const conflicting = group.filter(
      (c) => c.doc_id !== trusted.doc_id && !valuesEqual(c.value, trusted.value),
    );
    if (conflicting.length === 0) continue;

    const moreRecent = conflicting
      .map((c) => ({ claim: c, doc: byId.get(c.doc_id)! }))
      .filter(
        (x) => parseDate(x.doc.last_reviewed) > parseDate(trustedDoc.last_reviewed),
      )
      .sort((a, b) => parseDate(b.doc.last_reviewed).getTime() - parseDate(a.doc.last_reviewed).getTime())[0];

    if (moreRecent) {
      const contact = whoToAsk(trustedDoc, claimsByDoc[trustedDoc.id] ?? [], people);
      issues.push({
        doc_id: trustedDoc.id,
        kind: "needs_confirmation",
        weight: RULES.needs_confirmation.weight,
        reason: `A more recent source ('${moreRecent.doc.title}', ${formatDate(moreRecent.doc.last_reviewed)}) says ${moreRecent.claim.value}. Ask ${contact.person.name} to confirm whether this changed.`,
        evidence_quote: moreRecent.claim.quote,
        related_doc_id: moreRecent.doc.id,
      });
    } else {
      const other = conflicting[0]!;
      const otherDoc = byId.get(other.doc_id)!;
      issues.push({
        doc_id: trustedDoc.id,
        kind: "conflicting_source",
        weight: RULES.conflicting_source.weight,
        reason: `'${otherDoc.title}' says ${other.value}; this document is considered more reliable (trust score ${trustByDoc[trustedDoc.id]!.total} vs ${trustByDoc[otherDoc.id]!.total}).`,
        evidence_quote: other.quote,
        related_doc_id: otherDoc.id,
      });
    }
  }

  /* 4.6 Duplicates */
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const a = docs[i]!;
      const b = docs[j]!;
      const sim = jaccard(a.content, b.content);
      if (sim <= DUPLICATE_THRESHOLD) continue;
      const scoreA = trustByDoc[a.id]!.total;
      const scoreB = trustByDoc[b.id]!.total;
      const loser = scoreA < scoreB ? a : scoreB < scoreA ? b : parseDate(a.last_reviewed) < parseDate(b.last_reviewed) ? a : b;
      const other = loser.id === a.id ? b : a;
      issues.push({
        doc_id: loser.id,
        kind: "duplicate",
        weight: RULES.duplicate.weight,
        reason: `Near-duplicate of '${other.title}' (similarity ${sim.toFixed(2)}).`,
        related_doc_id: other.id,
      });
    }
  }

  /* Assemble */
  const issuesByDoc: Record<string, Issue[]> = {};
  const statusByDoc: Record<string, Status> = {};
  const priorityByDoc: Record<string, number> = {};
  const whoToAskByDoc: Record<string, WhoToAsk> = {};

  for (const doc of docs) {
    const docIssues = issues
      .filter((i) => i.doc_id === doc.id)
      .sort((x, y) => y.weight - x.weight);
    issuesByDoc[doc.id] = docIssues;
    statusByDoc[doc.id] = statusOf(docIssues);
    priorityByDoc[doc.id] = priorityOf(docIssues, doc.views_per_month);
    whoToAskByDoc[doc.id] = whoToAsk(doc, claimsByDoc[doc.id] ?? [], people);
  }

  const flagged = docs
    .filter((d) => statusByDoc[d.id] !== "green")
    .sort((a, b) => priorityByDoc[b.id]! - priorityByDoc[a.id]!);
  const trusted = docs.filter((d) => statusByDoc[d.id] === "green");

  return {
    docs,
    issuesByDoc,
    statusByDoc,
    priorityByDoc,
    trustByDoc,
    claimsByDoc,
    whoToAskByDoc,
    flagged,
    trusted,
  };
}
