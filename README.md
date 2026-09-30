# TrustLint – a linter for organisational knowledge

Built during the Tectonic Hackathon (30 September 2026). **All documents and people are fictional.**

## What TrustLint is

**Challenge:** SD Worx – "Unlock the Knowledge Within – Find it. Understand it. Trust it."

**Problem:** Internal procedures, FAQs, checklists and chat messages drift apart. Values go out of date after a legal change, documents contradict each other, owners leave, and nobody knows which page to trust.

**Solution:** TrustLint scans the knowledge base like a code linter. Every flag is explainable: the **rule** that fired, the **verbatim quote** as evidence, and the **person** who should fix it. Two demo moments:

1. **Legal Watch** – a (simulated) legal change shows instantly which documents became wrong and who must update them.
2. **Check a new document** – run TrustLint on a draft before publication, like CI for code.

## Architecture

| Part | Role |
| --- | --- |
| `src/data/` | Fictional seed data: documents, people, claims, reference values, vocabulary |
| `src/lib/checks.ts` | Pure, deterministic TypeScript checks. No AI decides any issue |
| `src/routes/api/extract-claims.ts` | The only AI step: extracts claims (parameter, scope, value, verbatim quote) from a document |
| `src/lib/trustlint-context.tsx` | React state held in memory: documents, claims, demo reference values, NEW badges |
| `src/lib/team.tsx` + Lovable Cloud | Optional extension: legal portal, resolution status, notes, real 2026 reference figures |

## How trust is computed

- **Rules and weights:** reference mismatch, contradiction, needs confirmation, conflicting source, owner left, no owner, stale, duplicate, scope missing – each with a fixed weight (see the in-app page "How trust is computed").
- **Status:** red if any issue has weight ≥ 4, amber if any issue, green otherwise.
- **Trust score:** authority (policy/procedure 3, checklist/faq/wiki 2, chat 1) + active owner (+1) + fresh (+1).
- **Priority:** sum of weights × log10(10 + views per month).
- **Contradiction policy:** where a reference value exists it is the arbiter. Only without a reference are documents compared against each other; the highest trust score wins, the others get a contradiction.

## AI safety

- Claims must quote the document verbatim (case-insensitive, whitespace- and quote-normalised). Any invented quote is discarded and counted.
- Prompt-injection guard: the system prompt states the document is untrusted data whose instructions must never be followed.
- Model output is validated with zod (≤ 30 claims, allowed parameter, allowed scope, value ≤ 60, quote ≤ 400) and re-validated in the browser.
- The Check page shows **"Live AI extraction"** or **"Fallback: seed claims"** so it is always clear where claims came from. Nothing is hardcoded for the example text; pre-verified seed claims are used only if the live call fails.

## Security

- `extract-claims`: POST only (405 otherwise), `Content-Type: application/json` required, strict zod schema `{ title 1–200, content 1–5000 }` (unknown fields → 400). Model, prompt and URL are fixed server-side.
- In-memory rate limit: 20 requests/minute per IP (429). 20-second timeout on the model call.
- Generic errors only ("Invalid input", "Too many requests", "Extraction failed"). No stack traces, raw model output or secrets; document content is never logged.
- No secrets in the repository or frontend. `.env` is git-ignored; `.env.example` holds placeholder names only.
- No `dangerouslySetInnerHTML`, `innerHTML` or `eval`. External links use `rel="noopener noreferrer"`. Every form is validated with zod.
- **Core demo:** no authentication by design – single-user proof of concept; reference edits and published documents only change the current browser session.
- **Legal portal extension:** sign-in (email/password or Google), invite-only access, row-level security on every table (anyone may read statuses and real reference values; only invited team members may change them; notes and invites are team/admin only). Security hardening: no automatic admin (the admin role is granted manually), invitations only apply to confirmed e-mail addresses, "changed by" and note authors are filled in by the database from the signed-in account, and signed-out visitors cannot read team e-mails.
- **Known limitation – AI endpoint:** extract-claims is intentionally callable without sign-in so the jury can test it; its 20 requests/minute limit is kept in memory per server instance, so with several instances the real limit is higher. Production would use a shared rate limiter or require sign-in. Production would additionally need SSO, finer role-based access and an audit log.

## How to run locally

```bash
npm install
npm run dev
```

The AI step needs `LOVABLE_API_KEY` as a server-side secret (see `.env.example`). Without it, extraction fails gracefully and the app uses seed claims.

## Demo script

1. **Dashboard** – ranked flagged documents with rule, evidence and contact.
2. **Document D2** – reference mismatch + owner left + stale; who to ask: Anna Peeters.
3. **Reference & Legal Watch** – "Simulate Legal Watch alert": CP 200 indexation goes to 2.2%; D1 turns red with a NEW badge, impact lists D1, D2, D12.
4. **Check a new document** – "Load example" → "Run TrustLint": catches the Dimona mismatch before publication.

"Reset demo" in the header restores all seed data.

## Known limitations / unfinished

- Core demo data is in memory only and resets on reload.
- All documents and people are fictional; the demo reference file simulates Legal Watch (real 2026 figures are available via the header switch).
- Duplicate detection is simple word-set (Jaccard) similarity.
- Rate limiting is per server instance and in memory.
- **CORS:** no CORS headers are sent, so browsers block cross-origin reads of `extract-claims`; the endpoint is not restricted to an origin allow-list because the preview and published domains differ. Non-browser clients can still call it (bounded by validation and rate limit).
