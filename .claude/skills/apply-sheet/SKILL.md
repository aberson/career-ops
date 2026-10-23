---
name: apply-sheet
description: Generate the mass-apply summary sheet — a self-contained HTML page for a collection of evaluated roles, with per-role evaluation summary (score, verdict, comp, legitimacy, strengths/gaps, next action), a live posting link, and copy-path buttons for the report and tailored CV. Use when the user wants "the summary sheet", an apply cockpit for several roles, or to batch through applications efficiently. Invoke as "/apply-sheet 067 068 070" or "/apply-sheet --min-score 4.0".
---

# apply-sheet — mass-apply summary sheet

One deterministic, zero-LLM script renders the whole sheet. Do not hand-author the HTML.

## Run

```bash
node .claude/skills/apply-sheet/gen-apply-sheet.mjs 067 068 070 071
```

- Positional args: report numbers (2- or 3-digit, zero-padding optional).
- `--min-score 4.0` — instead of explicit numbers, select every tracker row scoring ≥ threshold.
- `--out output/apply-sheet-<label>.html` — override the default `output/apply-sheet-<date>.html`.
- `--title "..."` — page title.
- `--note "..."` — explain the snapshot's scope and dates.
- `--discoveries data/apply-discoveries.json` — add a searchable, unscored scan-discovery view.

When refreshing after a scan, include unevaluated discoveries as well as evaluated roles:

```bash
node .claude/skills/apply-sheet/collect-discoveries.mjs --since YYYY-MM-DD --out data/apply-discoveries.json
node .claude/skills/apply-sheet/gen-apply-sheet.mjs <report numbers> --discoveries data/apply-discoveries.json
```

The collector reads scan history plus dated warm sweeps in the pending pipeline, excludes
already evaluated/tracked roles and frozen companies, and applies configured title/location filters.
An optional `--refresh data/scan-refresh-YYYY-MM-DD.json` supplies browser checks and coverage notes.
It writes only the discovery JSON. Never imply that discovery-only roles are scored or ready to apply.

Data sources (read-only): `data/applications.md` (row status/notes), `reports/NNN-*.md`
(header + Machine Summary YAML), `data/pdf-index.tsv` (tailored CV per report). A role with no
CV yet shows a "no CV yet" marker — generate one via `/career-ops pdf {slug}` and re-run.

## Agent workflow

1. Resolve which roles the user means (explicit numbers, "today's batch", "everything ≥4.0").
2. Run the script; relay its stdout list (roles, scores, missing CVs).
3. Tell the user the output path — the file is double-clickable locally.
4. If the user wants it hosted, publish the generated file as an artifact (strip the outer
   `<!DOCTYPE>/<html>/<head>/<body>` shell first; keep `<title>`, `<style>`, body content, and the
   copy-button `<script>`). Local paths are already copy-buttons, never `file://` links, so the
   page degrades safely when hosted.
5. Re-run any time state changes (new CV, status change) — regeneration is idempotent; same
   `--out` path overwrites.

## Contract

- Zero LLM cost; safe to run repeatedly.
- Never writes anything except the output HTML.
- Sheet ordering is score-descending; verdict stripe colors: Apply green, Consider amber,
  Research-first blue, Skip red.
