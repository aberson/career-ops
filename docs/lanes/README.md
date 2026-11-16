# Lanes

Standing lanes for this project (Passing Notes id `career-ops`). Shared rules:
[passing-notes lane rules](https://github.com/aberson/passing-notes/blob/HEAD/docs/lane-rules.md).
This file adds only local rules and never weakens them.

```text
Lanes:           central - coordinate, relay the operator, tracker merges, ship (also coordinates shake-spear and alpha4gate)
                 pipeline - warm-referral packets and pipeline sweeps
                 sweep - tailored CVs and apply prep for shortlisted roles
Coordinator:     central   (records lanes and confirms ownership transfers)
Shipper:         central   (commits and pushes)
Operator relay:  central
Lane rules:      passing-notes docs/lane-rules.md, plus the project rules below
```

## Ownership

| Lane | Owns |
|---|---|
| central | `data/applications.md` (tracker merges via `merge-tracker.mjs`), `modes/_custom.md`, `AGENTS.md`, `docs/lanes/`, all commits and pushes |
| pipeline | its packet output directories under `output/` |
| sweep | its tailored CVs and tracker-addition TSVs (merged by central) |

## Project rules

- `central` took over from `main` on 2026-11-16 at the operator's request (handover
  from the closed `main` lane). `main` is closed; send coordinator, relay and tracker
  notes to `central`.
- Lanes route every operator decision through `central`, and hand the operator HTML,
  never raw Markdown.
