# Lanes

Standing lanes for this project (Passing Notes id `career-ops`). Shared rules:
[passing-notes lane rules](https://github.com/aberson/passing-notes/blob/HEAD/docs/lane-rules.md).
This file adds only local rules and never weakens them.

```text
Lanes:           main - coordinate, relay the operator, tracker merges, ship (also coordinates shake-spear and alpha4gate)
                 pipeline - PARKED 2026-11-17 for the night (resume doc docs/lanes/parked/pipeline.md) - warm connections, inside-out: centred on a person (warm-referral sweeps, packets, the referral ledger)
                 job-sweep - PARKED 2026-11-17 (memory; resume doc docs/lanes/parked/job-sweep.md) - outside-in job search: scans, liveness, ranking, evaluations, shortlists, cold-application CVs and apply prep
Coordinator:     main   (records lanes and confirms ownership transfers)
Shipper:         main   (commits and pushes)
Operator relay:  main
Lane rules:      passing-notes docs/lane-rules.md, plus the project rules below
```

## Ownership

| Lane | Owns |
|---|---|
| main | `data/applications.md` (tracker merges via `merge-tracker.mjs`), `modes/_custom.md`, `AGENTS.md`, `docs/lanes/`, all commits and pushes |
| pipeline | warm-referral packet directories under `output/` (`*-referrals-*`), the warm-network data (`data/warm-network.sqlite3`, `data/warm-network/`) and the referral ledger |
| job-sweep | sweep and triage directories under `output/` (`*-sweep-*`, `pipeline-triage-*`), `data/pipeline.md` processing, its tailored CVs and tracker-addition TSVs (merged by main) |

## Project rules

- `central` took over from `main` on 2026-11-16 at the operator's request (handover
  from the closed `main` lane). `main` is closed; send coordinator, relay and tracker
  notes to `central`.
- Lanes route every operator decision through `main`, and hand the operator HTML,
  never raw Markdown.
- Split of 2026-11-17 (operator): `pipeline` is inside-out (start from a person),
  `job-sweep` is outside-in (start from the job market). When `job-sweep` finds a good
  role at a company where the warm network has a contact, it tells `pipeline` with a
  note so the find can become a warm-connection activity.
- Parked lanes keep their entry: their cards are `done`, their resume docs live in
  `docs/lanes/parked/`, and `main` reopens them with `lane-open` under the same id.
  `job-sweep` was parked on 2026-11-17 right after the split, to free memory; when it
  reopens it runs pipeline's `network.py match` on every shortlist and evaluation batch:
  `python -X utf8 data/warm-network/network.py match <pipeline.md | shortlist.tsv>` or
  `... match --company <name> --report <n>` (read-only JSON per company: routes, contacts,
  flags, skip, contact_route). `unknown` means never looked, not no contact. Built 2026-11-17.
- The earlier `sweep` lane (tailored CVs and apply packets for #166, #168, #172) is
  retired: its work was handed to `central`, and its window was stopped before it
  closed, so its card still reads `waiting`. Its scope now belongs to `job-sweep`.

`central` was renamed `main` in the same window on 2026-11-17 (plan P39); notes still addressed to `central` are read during the handover.
