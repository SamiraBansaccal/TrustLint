import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ReferenceEntry } from "@/data/types";

export type ResolutionStatus = "open" | "in_progress" | "fixed";
export type TeamRole = "admin" | "legal" | "none";

export interface Resolution {
  doc_id: string;
  status: ResolutionStatus;
  updated_by_email: string | null;
  updated_at: string;
}

export interface RealReferenceEntry extends ReferenceEntry {
  source_url: string | null;
  updated_by_email: string | null;
}

export const RESOLUTION_LABEL: Record<ResolutionStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  fixed: "Fixed",
};

interface TeamState {
  session: Session | null;
  authReady: boolean;
  role: TeamRole;
  resolutions: Record<string, Resolution>;
  realReference: RealReferenceEntry[];
  realLoaded: boolean;
  setResolution: (docId: string, status: ResolutionStatus) => Promise<void>;
  saveRealReference: (topic_param: string, scope: string, value: string) => Promise<void>;
  refreshRole: () => Promise<void>;
}

const TeamContext = createContext<TeamState | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<TeamRole>("none");
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [realReference, setRealReference] = useState<RealReferenceEntry[]>([]);
  const [realLoaded, setRealLoaded] = useState(false);

  const refreshRole = useCallback(async () => {
    const { data } = await supabase.rpc("claim_access");
    setRole((data as TeamRole) ?? "none");
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) void refreshRole();
    else setRole("none");
  }, [session?.user.id, refreshRole]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadResolutions = useCallback(async () => {
    const { data } = await supabase.from("resolutions").select("*");
    const map: Record<string, Resolution> = {};
    for (const r of data ?? []) map[r.doc_id] = r as Resolution;
    setResolutions(map);
  }, []);

  const loadReference = useCallback(async () => {
    const { data } = await supabase.from("reference_values").select("*").order("topic_param");
    setRealReference(
      (data ?? []).map((r) => ({
        topic_param: r.topic_param,
        scope: r.scope,
        value: r.value,
        source: r.source,
        source_url: r.source_url,
        effective_date: r.effective_date,
        updated_by_email: r.updated_by_email,
      })),
    );
    setRealLoaded(true);
  }, []);

  useEffect(() => {
    void loadResolutions();
    void loadReference();
    const channel = supabase
      .channel("trustlint-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "resolutions" }, () => {
        void loadResolutions();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reference_values" }, () => {
        void loadReference();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadResolutions, loadReference]);

  const setResolution = useCallback(
    async (docId: string, status: ResolutionStatus) => {
      const { error } = await supabase.from("resolutions").upsert({
        doc_id: docId,
        status,
        updated_by_email: session?.user.email ?? null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error("Could not save the status.");
      await loadResolutions();
    },
    [session, loadResolutions],
  );

  const saveRealReference = useCallback(
    async (topic_param: string, scope: string, value: string) => {
      const { error } = await supabase
        .from("reference_values")
        .update({
          value,
          updated_by_email: session?.user.email ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("topic_param", topic_param)
        .eq("scope", scope);
      if (error) throw new Error("Could not save the value.");
      await loadReference();
    },
    [session, loadReference],
  );

  return (
    <TeamContext.Provider
      value={{
        session,
        authReady,
        role,
        resolutions,
        realReference,
        realLoaded,
        setResolution,
        saveRealReference,
        refreshRole,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam(): TeamState {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used inside TeamProvider");
  return ctx;
}

export function resolutionOf(map: Record<string, Resolution>, docId: string): ResolutionStatus {
  return map[docId]?.status ?? "open";
}
