#!/usr/bin/env node
// Read scan history + pending URLs without changing the pipeline or tracker.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { resolveColumns, parseTrackerRow } from '../../../tracker-parse.mjs';
import { normalizeCompany } from '../../../tracker-utils.mjs';
import { buildLocationFilter, buildTitleFilter, companyRoleDedupKey, loadBlacklist } from '../../../scan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const opt = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const since = opt('--since', '');
if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error('Use --since YYYY-MM-DD');
const out = path.resolve(ROOT, opt('--out', 'data/apply-discoveries.json'));
const read = p => fs.readFileSync(path.resolve(ROOT, p), 'utf8');
const refreshPath = opt('--refresh', '');
const refresh = refreshPath ? JSON.parse(read(refreshPath)) : {};
const cfg = yaml.load(read('portals.yml'));
const titlePass = buildTitleFilter(cfg.title_filter);
const locationPass = buildLocationFilter(cfg.location_filter);
const blacklist = loadBlacklist(path.join(ROOT, 'data/blacklist.md'));
const lines = read('data/applications.md').split('\n');
const rows = lines.map(l => parseTrackerRow(l, resolveColumns(lines))).filter(Boolean);

// Job IDs unify Greenhouse corporate/mirror URLs and ignore tracking parameters.
function urlKey(value) {
  try {
    const u = new URL(value);
    const gh = u.searchParams.get('gh_jid') || (/greenhouse\.io$/.test(u.hostname) && u.pathname.match(/\/jobs\/(\d+)/)?.[1]);
    if (gh) return 'greenhouse:' + gh;
    const ashby = u.hostname === 'jobs.ashbyhq.com' && u.pathname.match(/([a-f0-9-]{36})/i)?.[1];
    if (ashby) return 'ashby:' + ashby.toLowerCase();
    const workday = /myworkdayjobs\.com$/.test(u.hostname) && u.pathname.match(/_([A-Z]{1,3}\d+)/i)?.[1];
    if (workday) return u.hostname.toLowerCase() + ':' + workday.toLowerCase();
    for (const name of [...u.searchParams.keys()]) {
      if (/^utm_|^(source|ref|referral|gh_src)$/i.test(name)) u.searchParams.delete(name);
    }
    u.searchParams.sort();
    return (u.hostname + u.pathname.replace(/\/$/, '') + u.search).toLowerCase();
  } catch { return value; }
}
const roleKey = (co, role) => companyRoleDedupKey(co, role.replace(/\bsoftware engineer\b/ig, 'swe').replace(/\bsenior\b/ig, 'sr').replace(/\bforward[- ]deployed engineer\b/ig, 'fde'), normalizeCompany);
const trackedRoles = new Set(rows.map(r => roleKey(r.company, r.role)));
const evaluatedUrls = new Set();
for (const file of fs.readdirSync(path.join(ROOT, 'reports')).filter(f => /^\d+-.*\.md$/.test(f))) {
  const text = read('reports/' + file);
  const url = text.match(/^\*\*URL:\*\*\s*(https?:\/\/\S+)/m)?.[1];
  if (url) evaluatedUrls.add(urlKey(url));
}
for (const row of rows) for (const m of row.notes.matchAll(/https?:\/\/[^\s;|)]+/g)) evaluatedUrls.add(urlKey(m[0]));
const checks = new Map([
  ...(refresh.newOffers || []).filter(c => c.verification === 'active').map(c => ({ ...c, status: 'active' })),
  ...(refresh.checks || []),
].map(c => [urlKey(c.url), c]));
const freshUrls = new Set((refresh.newOffers || []).map(c => urlKey(c.url)));
const observedUrls = new Set((refresh.boardObservations || []).map(c => urlKey(c.url)));
const withheldUrls = new Set((refresh.withheldOffers || []).map(c => urlKey(c.url)));
const candidates = [];
for (const line of read('data/scan-history.tsv').split('\n')) {
  const [url, firstSeen, source, title, company, status, location = '', fingerprint, postedAt = ''] = line.trimEnd().split('\t');
  if (status === 'added' && firstSeen >= since) candidates.push({ url, firstSeen, source, title, company, location, postedAt });
}
// Manual warm sweeps are logged in pipeline.md rather than scan-history.tsv.
for (const line of read('data/pipeline.md').split('\n')) {
  const match = line.match(/^- \[ \] (https?:\/\/\S+)\s*\|\s*([^|]+)\|\s*(.+?)\s*\[warm-sweep-(\d{4}-\d{2}-\d{2})\]/);
  if (!match || match[4] < since) continue;
  let [, url, company, title, firstSeen] = match;
  if (company.trim() === 'NEW DISCOVERY') {
    const parts = title.split(/\s+[—–]\s+/);
    if (parts.length < 2) continue;
    company = parts.pop(); title = parts.join(' — ');
  }
  candidates.push({ url, company: company.trim(), title: title.trim(), firstSeen, source: 'warm sweep', location: '' });
}
for (const item of refresh.newOffers || []) candidates.push({ ...item, firstSeen: item.firstSeen || refresh.date || new Date().toISOString().slice(0, 10), source: item.source || 'fresh scan' });
const custom = read('modes/_custom.md');
const warmTable = custom.split('**Current referral-warm list:**')[1]?.split('When drafting warm-intro')[0] || '';
const warm = new Set([...warmTable.matchAll(/^\| ([^|]+)\|/gm)].map(m => normalizeCompany(m[1].trim())));
const seen = new Set(); const seenRoles = new Set(); const items = [];
const excluded = { evaluatedOrTracked: 0, duplicate: 0, frozen: 0, filters: 0, closed: 0, withheld: 0 };
// Prefer today's checked replacement URL when the same role was found before.
candidates.sort((a, b) => Number(freshUrls.has(urlKey(b.url))) - Number(freshUrls.has(urlKey(a.url))) || b.firstSeen.localeCompare(a.firstSeen));
for (const item of candidates) {
  const key = urlKey(item.url); const rk = roleKey(item.company, item.title);
  if (seen.has(key) || seenRoles.has(rk)) { excluded.duplicate++; continue; }
  if (evaluatedUrls.has(key) || trackedRoles.has(rk)) { excluded.evaluatedOrTracked++; continue; }
  if (blacklist.has(normalizeCompany(item.company))) { excluded.frozen++; continue; }
  if (!titlePass(item.title) || !locationPass(item.location) || /\[leave-bay-area\]/i.test(item.title)) { excluded.filters++; continue; }
  const check = checks.get(key);
  if (check?.status === 'closed') { excluded.closed++; continue; }
  if (withheldUrls.has(key) && check?.status !== 'active') { excluded.withheld++; continue; }
  seen.add(key); seenRoles.add(rk);
  const warmContact = warm.has(normalizeCompany(item.company));
  const laneMatch = /applied ai|ai enablement|(?:forward[- ])?deployed engineer|agentic|ai engineer|agent engineer|agent reliability|ai deployment|evaluation|transformation lead/i.test(item.title);
  const loc = item.location || '';
  const bay = /san francisco|san jos[eé]|santa clara|sunnyvale|bay area|menlo park|palo alto|foster city|redwood city|mountain view|san mateo|berkeley|oakland/i.test(loc);
  const usRemote = /remote/i.test(loc) && /united states|\bus\b|\busa\b|california|north america|anywhere|global|worldwide/i.test(loc);
  const unknown = !loc || /^(united states|usa|us|remote)$/i.test(loc.trim());
  const locationScope = bay || usRemote ? 'bay' : unknown ? 'unknown' : 'relocation';
  items.push({ ...item, warmContact, laneMatch, locationScope, newThisScan: freshUrls.has(key),
    verification: check?.status === 'active' ? 'Browser checked ' + new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(check.checkedAt)) : observedUrls.has(key) ? 'Returned by ATS today; browser not checked' : 'Not browser verified today',
    checkedAt: check?.checkedAt || null,
    evidenceFile: check?.evidenceFile || null,
  });
}
items.sort((a, b) => Number(b.warmContact) - Number(a.warmContact) || Number(b.laneMatch) - Number(a.laneMatch) || b.firstSeen.localeCompare(a.firstSeen) || a.company.localeCompare(b.company) || a.title.localeCompare(b.title));
const payload = { since, generatedAt: new Date().toISOString(), refresh: { summary: refresh.summary || {}, coverageNotes: refresh.coverageNotes || [] }, count: items.length, excluded, items };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({ out, count: items.length, excluded, warm: items.filter(x => x.warmContact).length }));
