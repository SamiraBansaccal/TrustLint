export type PersonStatus = "active" | "left";

export interface Person {
  id: string;
  name: string;
  role: string;
  status: PersonStatus;
  left_date?: string;
  /** topic ids = the part of topic_param before the dot */
  expertise: string[];
}

export type DocType = "procedure" | "policy" | "checklist" | "faq" | "wiki" | "chat";
export type Country = "BE" | "NL" | "";

export interface Doc {
  id: string;
  title: string;
  type: DocType;
  owner_id: string;
  /** ISO date; for chat = message date */
  last_reviewed: string;
  country: Country;
  views_per_month: number;
  content: string;
}

export interface Claim {
  doc_id: string;
  topic_param: string;
  scope: string;
  value: string;
  quote: string;
}

export interface ReferenceEntry {
  topic_param: string;
  scope: string;
  value: string;
  source: string;
  effective_date: string;
}

export type IssueKind =
  | "stale"
  | "no_owner"
  | "owner_left"
  | "scope_missing"
  | "reference_mismatch"
  | "contradiction"
  | "needs_confirmation"
  | "conflicting_source"
  | "duplicate";

export interface Issue {
  doc_id: string;
  kind: IssueKind;
  weight: number;
  reason: string;
  evidence_quote?: string;
  related_doc_id?: string;
}

export type Status = "red" | "amber" | "green";
