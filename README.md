# TrustLint

**A linter for organisational knowledge.** Proof of concept for the SD Worx challenge
_"Unlock the Knowledge Within – Find it. Understand it. Trust it."_

> All documents, people and values in this demo are fictional.

## The problem

Internal knowledge rots silently. A legal parameter changes, a colleague leaves, a Teams message
overrules a procedure — and nobody knows which documents became wrong. People keep reading them.

## The solution

TrustLint scans internal documents the way a code linter scans code and flags what can no longer be
trusted: outdated values, contradictions between sources, missing or departed owners, stale
documents, near-duplicates and missing scope.

**Never a black box.** Every flag shows three things: the rule that fired, the exact sentence from
the document as evidence, and the person who should fix it.

## How it works

1. **Claims.** Each document is reduced to typed claims: `topic_param`, `scope`, `value`, `quote`.
   Only parameters in a fixed vocabulary are allowed (indexation rate, Dimona deadline, meal voucher
   maximum, payroll input deadline, response SLA, payslip retention, holiday allowance).
2. **Rules** (`src/lib/checks.ts`) — pure, deterministic TypeScript, no AI:

   | Rule | Weight | Fires when |
   | --- | --- | --- |
   | Reference mismatch | 5 | A claim differs from the source of truth |
   | Contradiction | 4 | A more trusted internal document says something else |
   | No owner / Owner left | 3 | Nobody accountable, or the owner left the company |
   | Stale / Needs confirmation / Duplicate | 2 | Past its review cycle / newer source disagrees / near-duplicate |
   | Missing scope / Conflicting source | 1 | No country stated / a less trusted document disagrees |

3. **Trust score** of a source = `authority + owner active + fresh`
   (policy & procedure 3, checklist/faq/wiki 2, chat 1; +1 active owner; +1 fresh — a chat message
   stays fresh for 60 days). Where a reference exists, the reference is the arbiter; otherwise the
   highest trust score wins.
4. **Status & priority.** Red if any issue weighs ≥ 4, amber if any issue, green otherwise.
   `priority = (sum of weights) × log10(10 + views per month)` — noisy documents nobody reads rank
   below quiet documents everyone reads.
5. **AI, exactly once.** The backend function `extract-claims` asks a model to extract claims from a
   document. Every quote must appear verbatim in the text or the claim is discarded and counted, so
   the AI cannot invent evidence. Document content is treated as untrusted input (prompt-injection
   guard + output validation with zod). The API key never reaches the browser.

## Run it locally

```bash
npm install
npm run dev
```

The AI secret is a server-side environment variable (`LOVABLE_API_KEY`, or `GEMINI_API_KEY` when
calling Google Gemini directly). Copy `.env.example` to `.env` and fill it in — `.env` is git-ignored
and no key is ever read in frontend code. Without a key the app still works: the seed claims ship
with it, only "Re-run AI extraction" and "Check a new document" need the model.

## Demo script

1. **Dashboard** — 12 documents scanned, 8 flagged, ranked by priority. The top row, the client-facing
   Indexation FAQ, is red.
2. **Open D2 "Indexation FAQ for clients"** — reference mismatch (says 1.6%, reference says 2.0%),
   the owner left in March 2025, and it is stale. The evidence sentence is highlighted in the text.
   Who to ask: Anna Peeters. "Draft message" writes the mail for you.
3. **Reference & Legal Watch → "Simulate Legal Watch alert"** — CP 200 indexation moves from 2.0% to
   2.2%. D1 instantly turns red with a NEW badge and the impact panel lists D1, D2 and D12 with their
   quotes and contacts.
4. **Check a new document → "Load example" → "Run TrustLint"** — the draft is checked before
   publication: the Dimona claim is a reference mismatch, the meal voucher and payroll input claims
   are consistent. Publish or discard.

See **How trust is computed** for every rule, weight and formula.

## Limitations and unfinished parts

- In-memory only: edited reference values, published documents and re-extracted claims are lost on
  reload. There is no database.
- All data is fictional and hand-written; a real deployment would ingest SharePoint, Confluence and
  Teams.
- Duplicate detection is a simple Jaccard word-set similarity, not semantic.
- No authentication: this is a single-user proof of concept. Production would need SSO and
  role-based access.
- The reference file simulates Legal Watch; there is no live legal feed.
