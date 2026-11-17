# Lanes

Standing lanes for this project (Passing Notes id `career-ops`). Shared rules:
[passing-notes lane rules](https://github.com/aberson/passing-notes/blob/HEAD/docs/lane-rules.md).
This file adds only local rules and never weakens them.

```text
Lanes:           central - coordinate, relay the operator, tracker merges, ship (also coordinates shake-spear and alpha4gate)
                 pipeline - warm connections, inside-out: centred on a person (warm-referral sweeps, packets, the referral ledger)
                 job-sweep - outside-in job search: scans, liveness, ranking, evaluations, shortlists, cold-application CVs and apply prep
Coordinator:     central   (records lanes and confirms ownership transfers)
Shipper:         central   (commits and pushes)
Operator relay:  central
Lane rules:      passing-notes docs/lane-rules.md, plus the project rules below
```

## Ownership

| Lane | Owns |
|---|---|
| central | `data/applications.md` (tracker merges via `merge-tracker.mjs`), `modes/_custom.md`, `AGENTS.md`, `docs/lanes/`, all commits and pushes |
| pipeline | warm-referral packet directories under `output/` (`*-referrals-*`), the warm-network data (`data/warm-network.sqlite3`, `data/warm-network/`) and the referral ledger |
| job-sweep | sweep and triage directories under `output/` (`*-sweep-*`, `pipeline-triage-*`), `data/pipeline.md` processing, its tailored CVs and tracker-addition TSVs (merged by central) |

## Project rules

- `central` took over from `main` on 2026-11-16 at the operator's request (handover
  from the closed `main` lane). `main` is closed; send coordinator, relay and tracker
  notes to `central`.
- Lanes route every operator decision through `central`, and hand the operator HTML,
  never raw Markdown.
- Split of 2026-11-17 (operator): `pipeline` is inside-out (start from a person),
  `job-sweep` is outside-in (start from the job market). When `job-sweep` finds a good
  role at a company where the warm network has a contact, it tells `pipeline` with a
  note so the find can become a warm-connection activity.
- The earlier `sweep` lane (tailored CVs and apply packets for #166, #168, #172) is
  retired: its work was handed to `central`, and its window was stopped before it
  closed, so its card still reads `waiting`. Its scope now belongs to `job-sweep`.
