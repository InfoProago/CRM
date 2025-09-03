// util.js — Proago CRM (v2025-09-03c • Step 1 safe update)
// Restored legacy helpers expected by pages: fmtISO, fmtUK, addDays
// Kept new: audit log, Lux phone, numbers+commas, averages (2 decimals),
// DD-MM-YYYY, mult %, defaults (rate bands & conversion), legacy analytics.

export const K = {
  settings: "proago_settings_v4",
  pipeline: "proago_pipeline_v4",
  recruiters: "proago_recruiters_v4",
  planning: "proago_planning_v4",
  history: "proago_history_v4",
  audit: "proago_audit_v1",
};

// -------- Defaults (respect commas) --------
export const DEFAULT_SETTINGS = {
  projects: ["Hello Fresh"],
  rateBands: [
    { startISO: "2025-01-01", rate: "15,2473" }, // before 01-05-2025
    { startISO: "2025-05-01", rate: "15,6285" }, // from 01-05-2025
  ],
  conversionType: {
    D2D:   { noDiscount: { box2: 95, box4: 125 }, discount: { box2: 80, box4: 110 } },
    EVENT: { noDiscount: { box2: 60, box4: 70  }, discount: { box2: 45, box4: 55  } },
  },
  notifyTemplates: {
    call: "Hi {name}, thank you for your interest. We’ll be in touch!",
    interview: "Hi {name}, your interview is set for {date} at {time}.",
    formation: "Hi {name}, your formation starts on {date} at {time}.",
  },
  notifyFrom: { email: "noreply@proago.com", phone: "+352600000000" },
};

// -------- LocalStorage helpers --------
export const load = (k, def) => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : def; }
  catch { return def; }
};
export const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// -------- Clone / TitleCase --------
export const clone = (x) =>
  typeof structuredClone === "function" ? structuredClone(x) : JSON.parse(JSON.stringify(x));

export function titleCase(str) {
  return (str || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// -------- Date helpers (global rule: DD-MM-YYYY) --------
export function toDDMMYYYY(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Legacy formatters used by Planning.jsx
export function fmtISO(date) {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
export function fmtUK(date) { // UK style here == DD-MM-YYYY (your project rule)
  return toDDMMYYYY(date);
}
export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(n || 0));
  return d;
}

// Week helpers (ISO, Monday start)
export function startOfWeekMon(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(dt.setDate(diff));
}
export function weekNumberISO(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

// -------- Numbers & money (digits + commas) --------
export function sanitizeNumericInput(str) { return (str || "").replace(/[^0-9,]/g, ""); }
export function parseNumber(str) { if (!str) return 0; return Number(String(str).replace(",", ".")); }
export function formatNumber(num, decimals = 2) {
  const n = Number(num);
  if (!isFinite(n)) return (0).toFixed(decimals).replace(".", ",");
  return n.toFixed(decimals).replace(".", ",");
}
export function toMoney(num) { return formatNumber(num, 2); } // legacy

// Average with 2 decimals (string with comma)
export function avg(arr) {
  if (!arr || arr.length === 0) return "0,00";
  const total = arr.reduce((a, b) => a + (Number(b) || 0), 0);
  return formatNumber(total / arr.length, 2);
}

// -------- Mult as % --------
export function formatMult(value) { return `${value ? value : 100}%`; }

// -------- Phone (Luxembourg) --------
export function formatLuxPhone(input) {
  const digitsOnly = String(input || "").replace(/\D/g, "");
  let formatted = "+352";
  if (!digitsOnly.startsWith("352")) return "+352 ";
  const body = digitsOnly.slice(3, 12); // 9 digits max
  if (body.length) formatted += " " + body.slice(0, 3);
  if (body.length > 3) formatted += " " + body.slice(3, 6);
  if (body.length > 6) formatted += " " + body.slice(6, 9);
  return formatted.trim();
}
export function isValidLuxPhone(input) {
  const d = String(input || "").replace(/\D/g, "");
  return d.startsWith("352") && d.length === 12; // +352 + 9 digits
}

// -------- Audit Log --------
export function addAuditLog(entry) {
  try {
    const logs = load(K.audit, []);
    logs.push({ ...entry, at: new Date().toISOString() });
    save(K.audit, logs);
  } catch (e) { console.error("Audit log failed", e); }
}
export function getAuditLog() { return load(K.audit, []); }

// -------- Legacy rank helpers (used by Recruiters.jsx) --------
const RANK_ORDER = ["BM", "SM", "TC", "PC", "PR", "RK"];
export function rankAcr(role) {
  const map = { "Branch Manager":"BM", "Sales Manager":"SM", "Team Captain":"TC",
                "Pool Captain":"PC", "Promotor":"PR", "Rookie":"RK" };
  return (role && map[role]) ? map[role] : (RANK_ORDER.includes(role) ? role : "RK");
}
export function rankOrderVal(roleOrAcr) {
  const acr = rankAcr(roleOrAcr);
  const idx = RANK_ORDER.indexOf(acr);
  return idx >= 0 ? idx : RANK_ORDER.length - 1;
}

// -------- History analytics (safe fallbacks) --------
function* walkHistory(history) {
  if (!Array.isArray(history)) return;
  for (const item of history) {
    if (!item) continue;
    if (Array.isArray(item)) { for (const x of item) yield x; continue; }
    if (item.team && Array.isArray(item.team)) { for (const x of item.team) yield { ...x, at: item.date || x.at }; continue; }
    yield item;
  }
}
// Last 5 scores for recruiter (newest first)
export function last5ScoresFor(a, b) {
  const history = Array.isArray(a) ? a : b;
  const recruiterId = Array.isArray(a) ? b : a;
  if (!recruiterId || !Array.isArray(history)) return [];
  const scores = [];
  for (const e of walkHistory(history)) {
    const rid = e?.recruiterId || e?.id || e?.rid;
    if (rid !== recruiterId) continue;
    const s = Number(e.score ?? e.total ?? e.SCORE);
    if (isFinite(s)) scores.push({ s, t: new Date(e.at || e.date || Date.now()).getTime() });
  }
  return scores.sort((A, B) => B.t - A.t).map(x => x.s).slice(0, 5);
}
// Box2/Box4 % across last ~8 weeks
export function boxPercentsLast8w(a, b) {
  const history = Array.isArray(a) ? a : b;
  const recruiterId = Array.isArray(a) ? b : a;
  if (!recruiterId || !Array.isArray(history)) return { b2: 0, b4: 0 };
  const eightWeeksAgo = Date.now() - 56 * 24 * 3600 * 1000;

  let box2 = 0, box2d = 0, box4 = 0, box4d = 0, score = 0;
  for (const e of walkHistory(history)) {
    const rid = e?.recruiterId || e?.id || e?.rid;
    const t = new Date(e?.at || e?.date || Date.now()).getTime();
    if (rid !== recruiterId || !(t >= eightWeeksAgo)) continue;
    const b2 = Number(e.box2 ?? e.B2 ?? 0);
    const b2dsc = Number(e.box2d ?? e["B2*"] ?? 0);
    const b4 = Number(e.box4 ?? e.B4 ?? 0);
    const b4dsc = Number(e.box4d ?? e["B4*"] ?? 0);
    const sc = Number(e.score ?? e.total ?? e.SCORE ?? 0);
    box2 += b2; box2d += b2dsc; box4 += b4; box4d += b4dsc; score += sc;
  }
  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
  return { b2: pct(box2 + box2d, score), b4: pct(box4 + box4d, score) };
}
