<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Resolutions, notes, invites and real reference values live in Lovable Cloud tables; demo data stays in src/data and the in-memory context. Why: keep the offline demo working while real data is shared and persistent.
- Portal access: admin is granted manually (never automatically); others need an invite row AND a confirmed e-mail; actor e-mails are stamped by the stamp_actor trigger, never by the client; anon cannot read e-mail columns. Why: security review (Aikido) found first-signup-admin, unverified-email and spoofed-actor flaws.
