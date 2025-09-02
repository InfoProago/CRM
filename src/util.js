// util.js — Proago CRM (v2025-08-29g final)
// Shared helpers, storage, formatting, defaults.
// IMPORTANT: explicitly named-exports formatPhoneByCountry.

export const K = {
  settings: "proago_settings_v1",
  pipeline: "proago_pipeline_v1",
  recruiters: "proago_recruiters_v1",
  planning: "proago_planning_v1",
  history: "proago_history_v1",
};

export const DEFAULT_SETTINGS = {
  projects: ["Hello Fresh"],
  rateBands: [{ startISO: "2025-01-01", rate: "15,2473" }, { startISO: "2025-05-01", rate: "15,6285" }],
  conversionType: {
    D2D: { box2: 95, box4: 125 },
    D2DSTAR: { box2: 80, box4: 110 },
    EVENT: { box2: 60, box4: 70 },
    EVENTSTAR: { box2: 45, box4: 55 }
  }, discount: { box2: 35, box4: 70 } },
    EVENT:{ noDiscount: { box2: 40, box4: 80 }, discount: { box2: 30, box4: 60 } },
  },
};

// ---------- Storage ----------
export const load = (k, fallback) => {
  try { const v = localStorage.getItem(typeof k === "string" ? k : K[k]); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
export const save = (k, v) => { try { localStorage.setItem(typeof k === "string" ? k : K[k], JSON.stringify(v)); } catch {} };

export const clone = (x) => JSON.parse(JSON.stringify(x ?? null));

// ---------- Formatting ----------
export const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b([a-zà-ÿ])/g, (m) => m.toUpperCase());

export const toMoney = (n) => Number(n || 0).toFixed(2);

// ---------- Dates ----------
export const fmtISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const fmtUK = (iso) => (iso ? `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(2,4)}` : "");
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfWeekMon = (d) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0..Sun=6
  x.setDate(x.getDate() - day);
  x.setHours(0,0,0,0);
  return x;
};
export const weekNumberISO = (d) => {
  const date = new Date(d); date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
};
export const monthKey = (iso) => (iso || "").slice(0, 7);
export const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return d.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

// ---------- Rates ----------
export const rateForDate = (settings, iso) => {
  const bands = (settings?.rateBands || DEFAULT_SETTINGS.rateBands).slice().sort((a,b)=> a.startISO.localeCompare(b.startISO));
  const target = iso || fmtISO(new Date());
  let rate = bands[0]?.rate ?? 15;
  for (const b of bands) if (b.startISO <= target) rate = b.rate;
  return rate;
};

// ---------- Phones (Lux/FR/BE/DE) ----------
// Named export to satisfy Rollup.
export function formatPhoneByCountry(raw) {
  const clean = String(raw || "").replace(/\s+/g, "");
  if (!clean.startsWith("+")) return { ok: false, display: "" };

  const prefixes = [
    { cc: "+352", min: 6, max: 12 }, // Luxembourg
    { cc: "+33",  min: 6, max: 12 }, // France
    { cc: "+32",  min: 6, max: 12 }, // Belgium
    { cc: "+49",  min: 6, max: 13 }, // Germany
  ];
  const p = prefixes.find((p) => clean.startsWith(p.cc));
  if (!p) return { ok: false, display: "" };

  const rest = clean.slice(p.cc.length).replace(/\D+/g, "");
  if (rest.length < p.min || rest.length > p.max) return { ok: false, display: "" };

  return { ok: true, display: `${p.cc} ${rest}` };
}

// ---------- Ranks ----------
export const rankAcr = (role) => {
  const m = { Rookie: "RK", Promoter: "PR", "Pool Captain": "PC", "Team Captain": "TC", "Sales Manager": "SM", "Branch Manager": "BM" };
  return m[role] || "RK";
};
export const rankOrderVal = (acr) => {
  const order = { BM: 6, SM: 5, TC: 4, PC: 3, PR: 2, RK: 1 };
  return order[acr] ?? 0;
};

// ---------- Score & Box stats ----------
export const last5ScoresFor = (history, recruiterId) =>
  history
    .filter(h => h.recruiterId === recruiterId && h.score != null)
    .sort((a,b) => (a.dateISO < b.dateISO ? 1 : -1))
    .slice(0,5)
    .map(h => Number(h.score) || 0);

export const boxPercentsLast8w = (history, recruiterId) => {
  const now = new Date();
  const eightWeeksAgo = addDays(now, -56);
  const rows = history.filter(h => h.recruiterId === recruiterId && new Date(h.dateISO || h.date) >= eightWeeksAgo);
  let b2 = 0, b4 = 0, s = 0;
  rows.forEach(r => {
    const score = Number(r.score) || 0;
    const b2x = (Number(r.box2_noDisc)||0) + (Number(r.box2_disc)||0);
    const b4x = (Number(r.box4_noDisc)||0) + (Number(r.box4_disc)||0);
    b2 += b2x; b4 += b4x; s += score;
  });
  const pct = (num, den) => den > 0 ? (num / den) * 100 : 0;
  return { b2: pct(b2, s), b4: pct(b4, s) };
};


export function cascadeDeleteRecruiter(crewCode){
  try {
    const recs = load(K.recruiters, []).filter(r => r.crewCode !== crewCode);
    save(K.recruiters, recs);
    const planning = load(K.planning, {});
    Object.keys(planning||{}).forEach(date => {
      (planning[date]?.teams||[]).forEach(t => {
        t.rows = (t.rows||[]).filter(r => r.crewCode !== crewCode);
      });
    });
    save(K.planning, planning);
    const hist = load(K.history, []).filter(h => h.crewCode !== crewCode);
    save(K.history, hist);
    alert('Recruiter deleted from Recruiters, Planning and History.');
  } catch(e){ console.error(e); }
}
