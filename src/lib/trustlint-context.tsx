import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DOCUMENTS } from "@/data/documents";
import { SEED_CLAIMS } from "@/data/claims";
import { REFERENCE } from "@/data/reference";
import { PEOPLE } from "@/data/people";
import type { Claim, Doc, ReferenceEntry, Status } from "@/data/types";
import { analyze, STATUS_RANK, type AnalysisResult } from "@/lib/checks";
import { useTeam } from "@/lib/team";

export type Dataset = "demo" | "real";

interface TrustLintState {
  dataset: Dataset;
  setDataset: (d: Dataset) => void;
  docs: Doc[];
  claims: Claim[];
  reference: ReferenceEntry[];
  people: typeof PEOPLE;
  analysis: AnalysisResult;
  newBadges: string[];
  setReferenceValue: (topic_param: string, scope: string, value: string, effective_date?: string) => void;
  simulateLegalWatch: () => { affected: string[]; from: string; to: string };
  resetSeed: () => void;
  addDocument: (doc: Doc, claims: Claim[]) => void;
  replaceClaimsForDoc: (docId: string, claims: Claim[]) => void;
  clearNewBadges: () => void;
}

const TrustLintContext = createContext<TrustLintState | null>(null);

export function TrustLintProvider({ children }: { children: ReactNode }) {
  const [docs, setDocs] = useState<Doc[]>(DOCUMENTS);
  const [claims, setClaims] = useState<Claim[]>(SEED_CLAIMS);
  const [reference, setReference] = useState<ReferenceEntry[]>(REFERENCE);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [dataset, setDataset] = useState<Dataset>("demo");
  const { realReference } = useTeam();
  const activeReference: ReferenceEntry[] = dataset === "real" ? realReference : reference;

  const analysis = useMemo(
    () => analyze({ docs, claims, reference: activeReference, people: PEOPLE }),
    [docs, claims, activeReference],
  );

  const statusesNow = useCallback(
    (ref: ReferenceEntry[]): Record<string, Status> =>
      analyze({ docs, claims, reference: ref, people: PEOPLE }).statusByDoc,
    [docs, claims],
  );

  const applyReference = useCallback(
    (next: ReferenceEntry[]) => {
      const before = statusesNow(reference);
      const after = statusesNow(next);
      const worse = Object.keys(after).filter(
        (id) => STATUS_RANK[after[id]!] > STATUS_RANK[before[id]!],
      );
      setReference(next);
      setNewBadges((prev) => Array.from(new Set([...prev, ...worse])));
      return worse;
    },
    [reference, statusesNow],
  );

  const setReferenceValue = useCallback(
    (topic_param: string, scope: string, value: string, effective_date?: string) => {
      applyReference(
        reference.map((r) =>
          r.topic_param === topic_param && r.scope === scope
            ? { ...r, value, ...(effective_date ? { effective_date } : {}) }
            : r,
        ),
      );
    },
    [applyReference, reference],
  );

  const simulateLegalWatch = useCallback(() => {
    const current = reference.find(
      (r) => r.topic_param === "indexation.rate" && r.scope === "BE-CP200",
    );
    const from = current?.value ?? "2.0%";
    const to = "2.2%";
    const next = reference.map((r) =>
      r.topic_param === "indexation.rate" && r.scope === "BE-CP200"
        ? { ...r, value: to, effective_date: "2027-01-01", source: "Legal Watch (simulated)" }
        : r,
    );
    applyReference(next);
    const affected = claims
      .filter((c) => c.topic_param === "indexation.rate" && c.scope === "BE-CP200")
      .map((c) => c.doc_id);
    return { affected: Array.from(new Set(affected)), from, to };
  }, [applyReference, claims, reference]);

  const resetSeed = useCallback(() => {
    setDocs(DOCUMENTS);
    setClaims(SEED_CLAIMS);
    setReference(REFERENCE);
    setNewBadges([]);
  }, []);

  const addDocument = useCallback((doc: Doc, docClaims: Claim[]) => {
    setDocs((prev) => [...prev, doc]);
    setClaims((prev) => [...prev, ...docClaims]);
  }, []);

  const replaceClaimsForDoc = useCallback((docId: string, docClaims: Claim[]) => {
    setClaims((prev) => [...prev.filter((c) => c.doc_id !== docId), ...docClaims]);
  }, []);

  const clearNewBadges = useCallback(() => setNewBadges([]), []);

  const value: TrustLintState = {
    dataset,
    setDataset,
    docs,
    claims,
    reference: activeReference,
    people: PEOPLE,
    analysis,
    newBadges,
    setReferenceValue,
    simulateLegalWatch,
    resetSeed,
    addDocument,
    replaceClaimsForDoc,
    clearNewBadges,
  };

  return <TrustLintContext.Provider value={value}>{children}</TrustLintContext.Provider>;
}

export function useTrustLint(): TrustLintState {
  const ctx = useContext(TrustLintContext);
  if (!ctx) throw new Error("useTrustLint must be used inside TrustLintProvider");
  return ctx;
}
