import { useState } from "react";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Doc, Issue, Person } from "@/data/types";

export function buildDraft(doc: Doc, issues: Issue[], person: Person): string {
  const bullets = issues.map((i) => `\n- ${i.reason}`).join("");
  const evidence = issues.find((i) => i.evidence_quote)?.evidence_quote ?? "—";
  return `Hi ${person.name}, TrustLint flagged '${doc.title}' (viewed ${doc.views_per_month} times per month):${bullets}\n\nEvidence: '${evidence}'. Could you review and update it? Thanks!`;
}

export function DraftMessageButton({
  doc,
  issues,
  person,
  variant = "default",
  size = "default",
}: {
  doc: Doc;
  issues: Issue[];
  person: Person;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const onOpenChange = (next: boolean) => {
    if (next) setText(buildDraft(doc, issues, person));
    setOpen(next);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied to clipboard");
    } catch {
      toast.error("Could not copy — select the text and copy manually");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Mail className="size-4" />
          Draft message to {person.name.split(" ")[0]}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Draft message to {person.name}</DialogTitle>
          <DialogDescription>
            {person.role} · Nothing is ever sent — copy it into your own channel.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className="font-mono text-xs"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={copy}>
            <Copy className="size-4" />
            Copy to clipboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
