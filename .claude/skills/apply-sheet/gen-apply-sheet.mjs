#!/usr/bin/env node
// gen-apply-sheet.mjs — zero-LLM apply-sheet generator (career-ops user skill).
// Renders a self-contained HTML "mass-apply cockpit" for a collection of evaluated roles:
// evaluation summary + posting link + copy-path buttons for the report and tailored CV.
//
// Usage:
//   node .claude/skills/apply-sheet/gen-apply-sheet.mjs 067 068 070 071
//   node .claude/skills/apply-sheet/gen-apply-sheet.mjs --min-score 4.0
//   Options: --out <path.html>  --title "..."  (default out: output/apply-sheet-<date>.html)
//
// Data sources (read-only): data/applications.md, reports/NNN-*.md, data/pdf-index.tsv.
// Local-file links are rendered as copy-to-clipboard buttons (absolute paths), never file:// links,
// so the page works identically opened locally or published as a hosted artifact.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const args = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);

function argVal(flag, dflt) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
}
const outPath = path.resolve(ROOT, argVal('--out', `output/apply-sheet-${today}.html`));
const title = argVal('--title', `Apply Sheet — ${today}`);
const minScore = parseFloat(argVal('--min-score', 'NaN'));
const nums = args.filter(a => /^\d{1,3}$/.test(a)).map(n => n.padStart(3, '0'));

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── tracker ──────────────────────────────────────────────────────────
const trackerRows = {};
const trackerText = fs.readFileSync(path.join(ROOT, 'data', 'applications.md'), 'utf8');
// Column positions come from the tracker's own header row. The optional Via
// (agency) column shifts every field after Company, so fixed indices drift.
const LEGACY_COLS = { '#': 0, date: 1, company: 2, role: 3, score: 4, status: 5, pdf: 6, report: 7, notes: 8 };
let cols = null;
for (const line of trackerText.split('\n')) {
  if (/^\|\s*#\s*\|/.test(line)) {
    cols = {};
    line.split('|').slice(1, -1).forEach((c, i) => {
      const name = c.trim().toLowerCase();
      if (name && !(name in cols)) cols[name] = i;
    });
    continue;
  }
  if (!/^\|\s*\d+\s*\|/.test(line)) continue;
  const ix = cols ?? LEGACY_COLS;
  const cells = line.split('|').slice(1, -1).map(c => c.trim());
  if (cells.length <= ix.report) continue;
  const notes = cells.slice(ix.notes).join(' | ');
  const m = (cells[ix.report] || '').match(/\[(\d+)\]/);
  const rnum = m ? m[1].padStart(3, '0') : null;
  const row = {
    num: cells[ix['#']], date: cells[ix.date], company: cells[ix.company],
    via: ix.via != null ? cells[ix.via] : '', role: cells[ix.role],
    score: cells[ix.score], status: cells[ix.status], pdf: cells[ix.pdf],
    reportNum: rnum, notes,
  };
  if (rnum) trackerRows[rnum] = row;
}

// ── pdf index (last entry per report wins) ───────────────────────────
const pdfByReport = {};
const pdfIdx = path.join(ROOT, 'data', 'pdf-index.tsv');
if (fs.existsSync(pdfIdx)) {
  for (const line of fs.readFileSync(pdfIdx, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [rep, pdf] = line.split('\t');
    if (rep && pdf) pdfByReport[rep.trim().padStart(3, '0')] = pdf.trim();
  }
}

// ── selection ────────────────────────────────────────────────────────
let selected = nums;
if (!selected.length && !Number.isNaN(minScore)) {
  selected = Object.values(trackerRows)
    .filter(r => parseFloat(r.score) >= minScore)
    .map(r => r.reportNum);
}
if (!selected.length) {
  console.error('No roles selected. Pass report numbers (e.g. 067 068) or --min-score 4.0');
  process.exit(1);
}

// ── report parsing ───────────────────────────────────────────────────
const reportsDir = path.join(ROOT, 'reports');
const reportFiles = fs.readdirSync(reportsDir);

function parseReport(num) {
  const file = reportFiles.find(f => f.startsWith(num + '-') && f.endsWith('.md'));
  if (!file) return null;
  const text = fs.readFileSync(path.join(reportsDir, file), 'utf8');
  const head = k => (text.match(new RegExp(`^\\*\\*${k}:\\*\\*\\s*(.+)$`, 'm')) || [])[1]?.trim() ?? '';
  const yamlMatch = text.match(/## Machine Summary\s*\n+```yaml\n([\s\S]*?)```/);
  const ms = { lists: {} };
  if (yamlMatch) {
    let currentList = null;
    for (const line of yamlMatch[1].split('\n')) {
      const kv = line.match(/^([a-z_]+):\s*(.*)$/);
      const li = line.match(/^\s+-\s+"?(.*?)"?\s*$/);
      if (kv) {
        currentList = null;
        const v = kv[2].replace(/^"|"$/g, '').trim();
        if (v === '' || v === '[]') { if (v === '') currentList = kv[1]; ms.lists[kv[1]] = []; }
        else ms[kv[1]] = v;
      } else if (li && currentList) {
        ms.lists[currentList].push(li[1]);
      }
    }
  }
  return {
    num, file,
    url: head('URL'), archetype: head('Archetype'), legitimacy: head('Legitimacy'),
    verification: head('Verification'), via: head('Via'), date: head('Date'),
    score: parseFloat(ms.score || head('Score')) || 0,
    decision: ms.final_decision || '',
    nextAction: ms.next_action || '',
    comp: (ms.advertised_comp && ms.advertised_comp !== 'null') ? ms.advertised_comp : 'not stated',
    risk: ms.risk_level || '',
    strengths: ms.lists.top_strengths || [],
    gaps: ms.lists.soft_gaps || [],
  };
}

const cards = [];
for (const n of selected) {
  const rep = parseReport(n);
  if (!rep) { console.error(`skip ${n}: no report file`); continue; }
  const trk = trackerRows[n] || {};
  // CV resolution: pdf-index first; else a CV path recorded in the tracker notes
  // (shared-PDF case — the manifest keeps one row per PDF, notes may point several rows at it).
  let pdfRel = pdfByReport[n] || null;
  if (!pdfRel && trk.notes) {
    const m = trk.notes.match(/output\/[^\s;|]+\.pdf/);
    if (m) pdfRel = m[0];
  }
  cards.push({
    ...rep,
    // '?' is the tracker's structural marker for an undisclosed end employer
    // (recruiter-scrubbed JD), not a missing value — keep it legible.
    company: !trk.company || trk.company === '?' ? 'Undisclosed employer' : trk.company,
    via: trk.via || '',
    role: trk.role || '',
    status: trk.status || '',
    notes: trk.notes || '',
    reportAbs: path.join(ROOT, 'reports', rep.file),
    cvAbs: pdfRel ? path.resolve(ROOT, pdfRel) : null,
    cvName: pdfRel ? path.basename(pdfRel) : null,
  });
}
cards.sort((a, b) => b.score - a.score);

const applyCount = cards.filter(c => /^apply$/i.test(c.decision)).length;
const cvCount = cards.filter(c => c.cvAbs).length;
const avg = cards.length ? (cards.reduce((s, c) => s + c.score, 0) / cards.length).toFixed(1) : '0';

const decisionClass = d =>
  /^apply$/i.test(d) ? 'apply' : /consider/i.test(d) ? 'consider' : /research/i.test(d) ? 'research' : 'skip';

const copyBtn = (label, abs, fname) => abs ? `
  <div class="pathrow">
    <button class="copy" type="button" data-path="${esc(abs)}">Copy ${label} path</button>
    <code>${esc(fname)}</code>
  </div>` : `
  <div class="pathrow none"><span class="nocv">no ${label} yet</span></div>`;

const cardHtml = c => `
<article class="card ${decisionClass(c.decision)}">
  <header>
    <div class="who">
      <h2>${esc(c.company)} <span class="role">— ${esc(c.role)}</span></h2>
      <div class="meta">
        <span class="chip score">${c.score.toFixed(1)}<small>/5</small></span>
        <span class="pill">${esc(c.decision || c.status)}</span>
        <span class="tag">${esc(c.legitimacy)}</span>
        ${c.status ? `<span class="tag">${esc(c.status)}</span>` : ''}
        ${c.via ? `<span class="tag via">via ${esc(c.via)}</span>` : ''}
      </div>
    </div>
  </header>
  <dl class="facts">
    <div><dt>Comp (advertised)</dt><dd>${esc(c.comp)}</dd></div>
    <div><dt>Archetype</dt><dd>${esc(c.archetype)}</dd></div>
    <div><dt>Evaluated</dt><dd>${esc(c.date)} · report ${esc(c.num)}</dd></div>
  </dl>
  <div class="links">
    ${c.url ? `<a class="posting" href="${esc(c.url)}" target="_blank" rel="noopener">Open posting ↗</a>` : ''}
    ${copyBtn('report', c.reportAbs, c.file)}
    ${copyBtn('CV', c.cvAbs, c.cvName)}
  </div>
  <div class="cols">
    <div><h3>Strengths</h3><ul>${c.strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
    <div><h3>Gaps</h3><ul>${c.gaps.length ? c.gaps.map(s => `<li>${esc(s)}</li>`).join('') : '<li>none flagged</li>'}</ul></div>
  </div>
  ${c.nextAction ? `<p class="next"><strong>Next:</strong> ${esc(c.nextAction)}</p>` : ''}
  ${c.notes ? `<p class="notes">${esc(c.notes)}</p>` : ''}
</article>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{
  --bg:#F6F7F5; --surface:#FFFFFF; --ink:#1A2330; --muted:#5A6676; --line:#DDE2DF;
  --accent:#0E7C86; --accent-ink:#0A5A62;
  --apply:#2E7D46; --consider:#9A6A00; --research:#3D5FA3; --skip:#A33D3D;
  --chipbg:#EDF1EF;
}
@media (prefers-color-scheme: dark){:root{
  --bg:#10151C; --surface:#1A222D; --ink:#E8ECF1; --muted:#93A0B1; --line:#2A3441;
  --accent:#4FB3BD; --accent-ink:#7BCBD3;
  --apply:#5BBF7E; --consider:#D9A741; --research:#7FA1E0; --skip:#D98080;
  --chipbg:#232E3B;
}}
:root[data-theme="dark"]{
  --bg:#10151C; --surface:#1A222D; --ink:#E8ECF1; --muted:#93A0B1; --line:#2A3441;
  --accent:#4FB3BD; --accent-ink:#7BCBD3;
  --apply:#5BBF7E; --consider:#D9A741; --research:#7FA1E0; --skip:#D98080;
  --chipbg:#232E3B;
}
:root[data-theme="light"]{
  --bg:#F6F7F5; --surface:#FFFFFF; --ink:#1A2330; --muted:#5A6676; --line:#DDE2DF;
  --accent:#0E7C86; --accent-ink:#0A5A62;
  --apply:#2E7D46; --consider:#9A6A00; --research:#3D5FA3; --skip:#A33D3D;
  --chipbg:#EDF1EF;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.55 "Avenir Next","Seravek","Segoe UI",system-ui,sans-serif;}
.wrap{max-width:880px;margin:0 auto;padding:32px 20px 64px}
.masthead{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px 20px;border-bottom:2px solid var(--accent);padding-bottom:14px;margin-bottom:10px}
.masthead h1{font-size:26px;margin:0;letter-spacing:-0.01em;text-wrap:balance}
.masthead .gen{color:var(--muted);font-size:13px}
.stats{display:flex;gap:24px;flex-wrap:wrap;margin:14px 0 26px;color:var(--muted);font-size:13px}
.stats b{color:var(--ink);font-size:17px;font-variant-numeric:tabular-nums}
.stats span{display:flex;flex-direction:column}
.card{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--muted);
  border-radius:6px;padding:18px 20px;margin-bottom:18px}
.card.apply{border-left-color:var(--apply)}
.card.consider{border-left-color:var(--consider)}
.card.research{border-left-color:var(--research)}
.card.skip{border-left-color:var(--skip)}
.card h2{margin:0;font-size:18px}
.card .role{font-weight:500;color:var(--muted)}
.meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
.chip.score{font-variant-numeric:tabular-nums;font-weight:700;font-size:15px;
  background:var(--chipbg);border-radius:4px;padding:2px 8px}
.chip.score small{color:var(--muted);font-weight:500}
.pill{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
  padding:3px 9px;border-radius:99px;color:var(--bg)}
.card.apply .pill{background:var(--apply)}
.card.consider .pill{background:var(--consider)}
.card.research .pill{background:var(--research)}
.card.skip .pill{background:var(--skip)}
.tag{font-size:12px;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:2px 7px}
.tag.via{border-style:dashed}
.facts{display:flex;gap:10px 28px;flex-wrap:wrap;margin:14px 0 4px;padding:0}
.facts div{margin:0}
.facts dt{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.facts dd{margin:2px 0 0;font-size:14px}
.links{display:flex;flex-direction:column;gap:6px;margin:12px 0;border:1px dashed var(--line);border-radius:6px;padding:10px 12px}
a.posting{color:var(--accent-ink);font-weight:600;text-decoration:none;font-size:14px}
a.posting:hover,a.posting:focus-visible{text-decoration:underline}
.pathrow{display:flex;align-items:center;gap:10px;min-width:0}
.pathrow code{font:12px/1.4 ui-monospace,"Cascadia Mono",Consolas,monospace;color:var(--muted);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nocv{font-size:12px;color:var(--muted);font-style:italic}
button.copy{font:600 12px/1 inherit;color:var(--accent-ink);background:var(--chipbg);
  border:1px solid var(--line);border-radius:5px;padding:6px 10px;cursor:pointer;white-space:nowrap}
button.copy:hover{border-color:var(--accent)}
button.copy:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
button.copy.done{color:var(--apply)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-top:6px}
@media (max-width:640px){.cols{grid-template-columns:1fr}}
.cols h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:10px 0 4px}
.cols ul{margin:0;padding-left:18px;font-size:13.5px}
.cols li{margin-bottom:3px}
.next{font-size:14px;background:var(--chipbg);border-radius:5px;padding:8px 12px;margin:12px 0 0}
.notes{font-size:12.5px;color:var(--muted);margin:10px 0 0}
footer{color:var(--muted);font-size:12px;margin-top:30px;border-top:1px solid var(--line);padding-top:12px}
@media (prefers-reduced-motion:no-preference){button.copy{transition:border-color .15s}}
</style>
</head>
<body>
<div class="wrap">
  <div class="masthead"><h1>${esc(title)}</h1><span class="gen">generated ${today} · career-ops apply-sheet</span></div>
  <div class="stats">
    <span><b>${cards.length}</b>roles</span>
    <span><b>${applyCount}</b>apply verdicts</span>
    <span><b>${cvCount}</b>CVs ready</span>
    <span><b>${avg}</b>avg score</span>
  </div>
  ${cards.map(cardHtml).join('\n')}
  <footer>Copy buttons put the absolute local path on your clipboard (works locally and when hosted). Regenerate:
  <code>node .claude/skills/apply-sheet/gen-apply-sheet.mjs ${selected.join(' ')}</code></footer>
</div>
<script>
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button.copy'); if (!btn) return;
  const p = btn.dataset.path;
  try { await navigator.clipboard.writeText(p); }
  catch {
    const ta = document.createElement('textarea'); ta.value = p; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
  }
  const old = btn.textContent; btn.textContent = 'Copied ✓'; btn.classList.add('done');
  setTimeout(() => { btn.textContent = old; btn.classList.remove('done'); }, 1300);
});
</script>
</body>
</html>`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);
console.log(`apply-sheet: ${cards.length} roles → ${outPath}`);
for (const c of cards) console.log(`  ${c.num}  ${c.score.toFixed(1)}  ${c.decision.padEnd(14)} ${c.company} — ${c.role}${c.cvAbs ? '' : '  [no CV]'}`);
