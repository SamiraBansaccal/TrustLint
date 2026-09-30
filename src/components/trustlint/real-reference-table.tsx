import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/checks";
import { useTeam, type RealReferenceEntry } from "@/lib/team";

const valueSchema = z.string().trim().min(1, "Value cannot be empty").max(60);

export function RealReferenceTable() {
  const { realReference, realLoaded, role } = useTeam();
  const canEdit = role !== "none";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Real reference figures (official sources, 2026)</CardTitle>
        <p className="text-sm text-muted-foreground">
          {canEdit ? (
            "You can update these values. Every change is saved and updates the dashboard for everyone."
          ) : (
            <>
              Read-only.{" "}
              <Link to="/auth" className="underline">
                Legal team members sign in
              </Link>{" "}
              to update a value.
            </>
          )}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-sm">
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
            {!realLoaded ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : null}
            {realReference.map((entry) => (
              <Row key={`${entry.topic_param}-${entry.scope}`} entry={entry} canEdit={canEdit} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Row({ entry, canEdit }: { entry: RealReferenceEntry; canEdit: boolean }) {
  const { saveRealReference } = useTeam();
  const [value, setValue] = useState(entry.value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(entry.value), [entry.value]);

  const save = async () => {
    const parsed = valueSchema.safeParse(value);
    if (!parsed.success) { toast.error(parsed.error.issues[0]!.message); return; }
    setSaving(true);
    try {
      await saveRealReference(entry.topic_param, entry.scope, parsed.data);
      toast.success("Saved. Checks recomputed.");
    } catch (e) {
      toast.error((e as Error).message);
    }
    setSaving(false);
  };

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-2 font-mono text-xs">{entry.topic_param}</td>
      <td className="px-3 py-2 font-mono text-xs">{entry.scope}</td>
      <td className="px-3 py-2">
        {canEdit ? (
          <div className="flex items-center gap-2">
            <Input
              value={value}
              maxLength={60}
              className="h-8 w-32 font-mono text-xs"
              onChange={(e) => setValue(e.target.value)}
            />
            {value !== entry.value ? (
              <Button size="sm" onClick={save} disabled={saving}>
                Save
              </Button>
            ) : null}
          </div>
        ) : (
          <span className="font-mono text-xs font-semibold">{entry.value}</span>
        )}
        {entry.updated_by_email ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">edited by {entry.updated_by_email}</p>
        ) : null}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {entry.source_url ? (
          <a
            href={entry.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            {entry.source}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          entry.source
        )}
      </td>
      <td className="px-5 py-2 text-xs text-muted-foreground">{formatDate(entry.effective_date)}</td>
    </tr>
  );
}
