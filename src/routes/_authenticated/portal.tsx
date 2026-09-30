import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, MessageSquare, Trash2, UserPlus } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusDot } from "@/components/trustlint/status";
import { IssueBadge } from "@/components/trustlint/issue-badge";
import { supabase } from "@/integrations/supabase/client";
import { useTrustLint } from "@/lib/trustlint-context";
import { RESOLUTION_LABEL, resolutionOf, useTeam, type ResolutionStatus } from "@/lib/team";
import { formatDate } from "@/lib/checks";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Legal portal – TrustLint" },
      { name: "description", content: "Resolve flagged documents: mark them in progress or fixed and leave notes." },
      { property: "og:title", content: "Legal portal – TrustLint" },
      { property: "og:description", content: "Where the legal team resolves flagged documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Portal,
});

interface Note {
  id: string;
  doc_id: string;
  body: string;
  author_email: string | null;
  created_at: string;
}

const noteSchema = z.string().trim().min(1, "Write a note first").max(1000);
const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email").max(255);

function Portal() {
  const { session, role, resolutions, setResolution } = useTeam();
  const { analysis } = useTrustLint();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from("resolution_notes")
      .select("id, doc_id, body, author_email, created_at")
      .order("created_at", { ascending: false });
    setNotes(data ?? []);
  }, []);

  useEffect(() => {
    if (role !== "none") void loadNotes();
  }, [role, loadNotes]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  if (role === "none") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>No access yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            You are signed in as {session?.user.email}, but this email has not been invited. Ask the
            portal admin to add it, then reload this page.
          </p>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

  const changeStatus = async (docId: string, status: ResolutionStatus) => {
    try {
      await setResolution(docId, status);
      toast.success(`Marked ${RESOLUTION_LABEL[status].toLowerCase()}.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const addNote = async (docId: string) => {
    const parsed = noteSchema.safeParse(drafts[docId] ?? "");
    if (!parsed.success) return toast.error(parsed.error.issues[0]!.message);
    const { error } = await supabase.from("resolution_notes").insert({
      doc_id: docId,
      body: parsed.data,
      author_id: session!.user.id,
      author_email: session!.user.email ?? null,
    });
    if (error) return toast.error("Could not save the note.");
    setDrafts((d) => ({ ...d, [docId]: "" }));
    void loadNotes();
  };

  const counts = { open: 0, in_progress: 0, fixed: 0 };
  for (const d of analysis.flagged) counts[resolutionOf(resolutions, d.id)]++;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Legal portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {session?.user.email} ({role}). Changes appear on the dashboard for everyone
            instantly.
          </p>
        </div>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(Object.keys(counts) as ResolutionStatus[]).map((k) => (
          <Card key={k}>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {RESOLUTION_LABEL[k]}
              </p>
              <p className="mt-2 font-mono text-3xl font-semibold">{counts[k]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {analysis.flagged.map((doc) => {
          const status = resolutionOf(resolutions, doc.id);
          const res = resolutions[doc.id];
          const docNotes = notes.filter((n) => n.doc_id === doc.id);
          return (
            <Card key={doc.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <StatusDot status={analysis.statusByDoc[doc.id]!} className="mt-1.5" />
                    <div>
                      <Link to="/doc/$id" params={{ id: doc.id }} className="font-medium hover:underline">
                        {doc.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {analysis.issuesByDoc[doc.id]!.map((issue, i) => (
                          <IssueBadge key={`${issue.kind}-${i}`} issue={issue} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Select value={status} onValueChange={(v) => changeStatus(doc.id, v as ResolutionStatus)}>
                      <SelectTrigger className="w-40">
                        <SelectValue>{RESOLUTION_LABEL[status]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                    {res?.updated_by_email ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        by {res.updated_by_email} · {formatDate(res.updated_at)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {docNotes.length ? (
                  <ul className="space-y-1.5 border-l-2 border-border pl-3">
                    {docNotes.map((n) => (
                      <li key={n.id} className="text-sm">
                        <span className="whitespace-pre-wrap">{n.body}</span>
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {n.author_email} · {formatDate(n.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex gap-2">
                  <Textarea
                    rows={1}
                    maxLength={1000}
                    placeholder="Add a note about the fix…"
                    value={drafts[doc.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [doc.id]: e.target.value }))}
                    className="min-h-9"
                  />
                  <Button variant="outline" onClick={() => addNote(doc.id)}>
                    <MessageSquare className="size-4" /> Add note
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {role === "admin" ? <InviteManager /> : null}
    </div>
  );
}

function InviteManager() {
  const [invites, setInvites] = useState<{ email: string }[]>([]);
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("invites").select("email").order("created_at");
    setInvites(data ?? []);
  }, []);
  useEffect(() => void load(), [load]);

  const add = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return toast.error(parsed.error.issues[0]!.message);
    const { error } = await supabase.from("invites").insert({ email: parsed.data });
    if (error) return toast.error("Could not add this email (already invited?).");
    setEmail("");
    toast.success(`${parsed.data} can now sign up and get access.`);
    void load();
  };

  const remove = async (e: string) => {
    await supabase.from("invites").delete().eq("email", e);
    void load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite legal team members</CardTitle>
        <p className="text-sm text-muted-foreground">
          Invited people create an account with this email and get access automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={add}>
            <UserPlus className="size-4" /> Invite
          </Button>
        </div>
        <ul className="divide-y divide-border text-sm">
          {invites.map((i) => (
            <li key={i.email} className="flex items-center justify-between py-2">
              {i.email}
              <Button variant="ghost" size="sm" onClick={() => remove(i.email)} aria-label={`Remove ${i.email}`}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
          {invites.length === 0 ? <li className="py-2 text-muted-foreground">No invites yet.</li> : null}
        </ul>
      </CardContent>
    </Card>
  );
}
