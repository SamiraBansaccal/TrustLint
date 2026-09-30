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
- Portal access = first signed-in user becomes admin via claim_access(); others need an invite row. Why: invite-only without a separate admin setup step.
