# Language Modes -- market vocabulary catalogue

Long-form counterpart to `AGENTS.md` > **Language Modes** and the per-language halves of
**Output Language vs Market Modes**. Extracted 2026-09-05 so `AGENTS.md` stays under Codex's
32 KiB `project_doc_max_bytes` cap. The two-axis contract, the composition rule and the
agent directive stay in `AGENTS.md` -- only the per-market vocabulary detail lives here.

Default modes are in `modes/` (English). Additional language-specific modes:

Default modes are in `modes/` (English). Additional language-specific modes are available:

- **German (DACH market):** `modes/de/` — native German translations with DACH-specific vocabulary (13. Monatsgehalt, Probezeit, Kündigungsfrist, AGG, Tarifvertrag, etc.). Includes `_shared.md`, `angebot.md` (evaluation), `bewerben.md` (apply), `pipeline.md`.
- **French (Francophone market):** `modes/fr/` — native French translations with France/Belgium/Switzerland/Luxembourg-specific vocabulary (CDI/CDD, convention collective SYNTEC, RTT, mutuelle, prévoyance, 13e mois, intéressement/participation, titres-restaurant, CSE, portage salarial, etc.). Includes `_shared.md`, `offre.md` (evaluation), `postuler.md` (apply), `pipeline.md`.
- **Arabic (Middle East / Arab market):** `modes/ar/` — native Arabic translations with Arab region-specific vocabulary (مكافأة نهاية الخدمة, التأمينات الاجتماعية, راتب إجمالي/صافي, فترة التجربة, فترة الإخطار, البدلات, etc.). Includes `_shared.md`, `fursah.md` (evaluation), `takdeem.md` (apply), `pipeline.md`.
- **Japanese (Japan market):** `modes/ja/` — native Japanese translations with Japan-specific vocabulary (正社員, 業務委託, 賞与, 退職金, みなし残業, 年俸制, 36協定, 通勤手当, 住宅手当, etc.). Includes `_shared.md`, `kyujin.md` (evaluation), `oubo.md` (apply), `pipeline.md`.
- **Turkish (Turkey market):** `modes/tr/` — native Turkish translations with Turkey-specific vocabulary (SGK, kıdem tazminatı, ihbar süresi, brüt/net maaş, AGİ, BES, yemek kartı, yol yardımı, TÜFE zammı, etc.). Includes `_shared.md`, `is-ilani.md` (evaluation), `basvuru.md` (apply), `pipeline.md`.
- **Hindi (India market):** `modes/hi/` — native Hindi (Devanagari) translations with India-specific vocabulary (CTC vs. in-hand salary, PF/EPF, Gratuity, Notice period/buyout, Bond clause, ESOPs, HRA/LTA, moonlighting policy, Labour Codes 2020, etc.). Includes `_shared.md`, `naukri.md` (evaluation), `aavedan.md` (apply), `pipeline.md`.


## When to switch market modes

Three triggers, identical for every market below: the user says "use <Market> modes"; the
user sets `language.modes_dir` in `config/profile.yml` (always wins); or you detect a JD in
that language and *suggest* switching.

| Market | Modes dir | Typical signal |
|--------|-----------|----------------|
| German (DACH) | `modes/de/` | targeting German-language postings, or lives in DACH |
| French (Francophone) | `modes/fr/` | France / Belgium / Switzerland / Luxembourg / Quebec |
| Arabic | `modes/ar/` | Middle East / Arab region |
| Japanese | `modes/ja/` | Japan |
| Turkish | `modes/tr/` | Turkey |
| Hindi | `modes/hi/` | India |

Market mode selection never changes prose language -- that is `language.output`, always.
