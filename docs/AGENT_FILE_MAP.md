# Agent File Map

Long-form counterpart to `AGENTS.md` > **Main Files**. Extracted 2026-09-05 so `AGENTS.md`
stays under Codex's 32 KiB `project_doc_max_bytes` cap (over it, the tail is dropped silently
with no warning). `AGENTS.md` keeps the routing rules; this file keeps the inventory.

Script usage detail lives in [`SCRIPTS.md`](SCRIPTS.md); data-layer semantics in
[`../DATA_CONTRACT.md`](../DATA_CONTRACT.md); architecture in [`ARCHITECTURE.md`](ARCHITECTURE.md).

| File | Function |
|------|----------|
| `data/applications.md` | Application tracker |
| `data/pipeline.md` | Inbox of pending URLs |
| `data/scan-history.tsv` | Scanner dedup history |
| `portals.yml` | Query and company config |
| `templates/cv-template.html` | HTML template for CVs |
| `templates/cv-template.tex` | LaTeX/Overleaf template for CVs |
| `generate-pdf.mjs` | Playwright: HTML to PDF |
| `generate-latex.mjs` | LaTeX CV validator + pdflatex compiler |
| `article-digest.md` | Compact proof points from portfolio (optional) |
| `interview-prep/story-bank.md` | Accumulated STAR+R stories across evaluations |
| `interview-prep/{company}-{role}.md` | Company-specific interview intel reports |
| `analyze-patterns.mjs` | Pattern analysis script (JSON output). Includes ATS channel analysis (per-vendor advance rate; motivated by Bommasani et al., Algorithmic Monocultures in Hiring, FAccT 2026). |
| `upskill.mjs` | Aggregate skill-gap analyzer — weighted gap map from tracked reports, known skills from `cv.md`/`config/profile.yml` excluded (JSON output) |
| `stats.mjs` | Lifetime pipeline stats aggregator (JSON or `--summary`) — tracker roll-up, canonical `ever*` funnel, lifetime scan totals, portal coverage, follow-up compliance, scan-run trends |
| `data/scan-runs.tsv` | Per-run scan counters (appended by `scan.mjs`, read by `stats.mjs`) |
| `followup-cadence.mjs` | Follow-up cadence calculator (JSON output) |
| `followup-seed.mjs` | Seeds `data/follow-ups.md` with a pinned first follow-up date when a row turns Applied (JSON output) |
| `set-status.mjs` | Canonical CLI to update a tracker row: `node set-status.mjs <report#\|company> <State> [--note] [--force]` — strict states.yml validation, report-link mismatch guard, shared tracker lock, atomic write |
| `invite-match.mjs` | Fuzzy-matches a pasted interview-invite email (company name, date, req ID) against `data/applications.md`, ranking candidates when a company has multiple tracker entries (JSON or `--summary` table output) |
| `paste-reply.mjs` | Manual/no-Gmail input path into `reply-watch.mjs`'s classification pipeline — normalizes a pasted or file-provided email's subject/from/body into a candidate object and appends it to `data/reply-candidates.json` (never overwrites existing entries; never classifies or touches the tracker itself) |
| `detect-reposts.mjs` | Repost detector — flags roles re-listed 2+ times in 90 days from scan-history.tsv (JSON or `--summary` table output) |
| `process-quality.mjs` | Recruiting-process friction aggregator — parses `[process-friction]` tags candidates add to `data/active-interviews.md` Notes and reports per-company friction rate (JSON or `--summary` table output) |
| `salary-gap.mjs` | Desired/advertised/actual compensation gap analyzer — folds report `advertised_comp` + `data/salary-observations.tsv` (JSON or `--summary`) |
| `data/salary-observations.tsv` | Append-only salary observation log (user layer) |
| `assessment-log.mjs` | Skills-assessment event logger — `add` appends platform/subject/threshold/score + candidate-observed staleness note to `data/assessments.tsv` (JSON or `--summary`) |
| `data/assessments.tsv` | Append-only skills-assessment log (user layer, created on first `add`) |
| `jd-skill-gap.mjs` | Zero-LLM JD skill-gap checker — classifies a JD's required skills against `cv.md` into existing / supportedByResume / gap so a CV can be tailored honestly (JSON or `--summary` output); never auto-adds a claim to `cv.md` |
| `data/follow-ups.md` | Follow-up history tracker |
| `data/blacklist.md` | Your do-not-apply company list (user layer, opt-in — never auto-populated; respected by `scan.mjs` and the `auto-pipeline`/`oferta`/`apply` gates) |
| `scan.mjs` | Zero-token portal scanner — hits Greenhouse/Ashby/Lever APIs directly, zero LLM cost |
| `scan-ats-full.mjs` | Reverse-ATS keyword-first scanner — walks the full public job-board-aggregator dataset per ATS provider (Greenhouse/Lever/Ashby/Workday), filtered by portals.yml's title_filter/location_filter. No company-list curation needed; complements scan.mjs's company-first model. |
| `check-liveness.mjs` | Job posting liveness checker |
| `liveness-core.mjs` | Shared liveness logic (expired signals win over generic Apply text) |
| `reports/` | Evaluation reports (format: `{###}-{company-slug}-{YYYY-MM-DD}.md`). Blocks A-F + G (Posting Legitimacy). Header includes `**Legitimacy:** {tier}`. |

