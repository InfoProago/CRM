// util.js — Proago CRM (v2025-09-03 • Step 1 update: Settings & Util)
// • Added Lux phone validation & formatting (+352 691 999 999, 9 digits only)
// • Numbers: accept digits + commas only
// • Averages always with 2 decimals
// • Audit Log system
// • Helpers for DD-MM-YYYY dates, % mult display

// -------------------- Storage --------------------
export const K = {
  settings: "proago_settings_v4",
  pipeline: "proago_pipeline_v4",
  recruiters: "proago_recruiters_v4",
  planning: "proago_planning_v4",
  history: "proago_history_v4",
  audit: "proago_audit_v1",
};

export const DEFAULT_SETTINGS = {
  projects: ["Hello Fresh"],
  rateBands: [
    { startISO: "2025-01-01", rate: "15,2473" }, // before 01-05-2025
    { startISO: "2025-05-01", rate: "15,6285" }, // from 01-05-2025
  ],
  conversionType: {
    D2D: {
      noDiscount: { box2: 95, box4: 125 },
      discount: { box2: 80, box4: 110 },
    },
    EVENT: {
      noDiscount: { box2: 60, box4: 70 },
      discount: { box2: 45, box4: 55 },
    },
  },
  notifyTemplates: {
    call: "Hi {name}, thank you for your interest. We’ll be in touch!",
    interview: "Hi {name}, your interview is set for {date} at {time}.",
    formation: "Hi {name}, your formation starts on {date} at {time}.",
  },
  notifyFrom: { email: "noreply@proago.com", phone: "+352600000000" },
};

// -------------------- LocalStorage helpers --------------------
export const load = (k, def) => {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return def;
    return JSON.parse(raw);
  } catch {
    return def;
  }
};

export const save = (k, val) => {
  try {
    localStorage.setItem(k, JSON.stringify(val));
  } catch {}
};

// -------------------- Clone helper --------------------
export const clone = (x) => structuredClone ? structuredClone(x) : JSON.parse(JSON.stringify(x));

// -------------------- Phone helpers --------------------
export function formatLuxPhone(input) {
  // Keep only digits
  const digits = input.replace(/\D/g, "");
  // Must start with +352
  if (!digits.startsWith("352")) return "+352 ";
  // Ensure +352 + 9 digits
  const body = digits.slice(3, 12);
  let formatted = "+352 ";
  if (body.length > 0) formatted += body.slice(0, 3);
  if (body.length > 3) formatted += " " + body.slice(3, 6);
  if (body.length > 6) formatted += " " + body.slice(6, 9);
  return formatted.trim();
}

export function isValidLuxPhone(input) {
  const digits = input.replace(/\D/g, "");
  // +352 + 9 digits = total length 12
  return digits.startsWith("352") && digits.length === 12;
}

// -------------------- Numeric helpers --------------------
export function parseNumber(str) {
  if (!str) return 0;
  return Number(str.replace(",", "."));
}

export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return "0,00";
  return num.toFixed(decimals).replace(".", ",");
}

// Only allow digits and commas in inputs
export function sanitizeNumericInput(str) {
  return str.replace(/[^0-9,]/g, "");
}

// -------------------- Average helper --------------------
export function avg(arr) {
  if (!arr || arr.length === 0) return "0,00";
  const n = arr.reduce((a, b) => a + (Number(b) || 0), 0) / arr.length;
  return formatNumber(n, 2);
}

// -------------------- Date helpers --------------------
export function toDDMMYYYY(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// -------------------- Mult % helper --------------------
export function formatMult(value) {
  if (!value) return "100%";
  return `${value}%`;
}

// -------------------- TitleCase --------------------
export function titleCase(str) {
  return (str || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// -------------------- Week helpers --------------------
export function startOfWeekMon(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

export function weekNumberISO(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

// -------------------- Audit Log --------------------
export function addAuditLog(entry) {
  try {
    const logs = load(K.audit, []);
    logs.push({
      ...entry,
      at: new Date().toISOString(),
    });
    save(K.audit, logs);
  } catch (e) {
    console.error("Audit log failed", e);
  }
}

export function getAuditLog() {
  return load(K.audit, []);
}
