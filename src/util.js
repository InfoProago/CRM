// util.js • Proago CRM (v2025-08-29g final)
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
  rateBands: [
    { startISO: "2025-05-01", rate: 15.6285 },
    { startISO: "1900-01-01", rate: 15.2473 }
  ],
  conversionType: {
    D2D:  { noDiscount: { box2: 50, box4: 90 }, discount: { box2: 35, box4: 70 } },
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
export const fmtUK = (iso) => (iso ? `${iso.slice(8,10)}-${iso.slice(5,7)}-${iso.slice(0,4)}` : "");
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
  const clean = String(raw || "").replace(/\s+/g, "").replace(/-/g, "");
  if (!clean.startsWith("+")) return { ok: false, display: "" };
  if (clean.startsWith("+352")) {
    const rest = clean.slice(4).replace(/\D+/g, "");
    if (!/^\d{9}$/.test(rest)) return { ok: false, display: "" };
    const spaced = rest.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
    return { ok: true, display: "+352 " + spaced };
  }
  const prefixes = [ { cc: "+33", min:6, max:12 }, { cc: "+32", min:6, max:12 }, { cc: "+49", min:6, max:13 } ];
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

export const toDDMMYYYY = (d) => fmtUK(typeof d==="string"?d:fmtISO(d));

export const multToPercent = (m) => {
  if (m == null || m === "") return "";
  const n = Number(m);
  if (!Number.isFinite(n)) return String(m);
  return (n*100).toFixed(0) + "%";
};
export const ensurePercent = (val) => {
  if (val == null || val === "") return "";
  const s = String(val);
  if (s.endsWith("%")) return s;
  const n = Number(s);
  return Number.isFinite(n) ? n.toFixed(0)+"%" : s;
};

export const debounce = (fn, delay=200) => {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(()=>fn(...args), delay);
  };
};

export const templateKey = "proago_templates_v1";
export const defaultTemplates = () => ({
  call: {
    email: `Moien {name},

Entschëllegt, dass ech Iech stéieren. Ech erlaaben mir just Iech kuerz unzeruffen, well Dir Iech iwwer Indeed bei eis beworben hutt.

Ech wollt einfach nofroen, ob Dir nach interesséiert sidd un der Aarbecht bei eis. Zéckt wgl. net, ierch sou séier wéi méiglech bei mir ze mellen.

Ech wenschen Iech nach en agreabelen Daag.

Mat beschte Gréiss,
Garcia Oscar
CEO – Proago, Face to Face Marketing`,
    sms: `Moien {name}, Dir hat Iech iwwer Indeed beworben. Sidd Dir nach interesséiert?`,
  },
  interview: {
    email: `Moien {name},

No eisem leschten Telefongespréich gouf en Entretien festgeluecht fir den {date} um {time}.

Den Entretien fënnt am Coffee Fellows statt, op dëser Adress:
4 Place de Paris, 2314 Lëtzebuerg (Quartier Gare, bei der Arrêt Zitha/Paris).

Dir kënnt am Parking Fort Neipperg parken, ongeféier 5–6 Minutte Fousswee ewech:
43, rue du Fort Neipperg, 2230 Lëtzebuerg (Quartier Gare).

Wann Dir nach Froen hutt, kënnt Dir Iech gären bei mir mellen.
Mat frëndleche Gréiss,
Oscar Garcia Saint-Medar
CEO vun Proago`,
    sms: `Moien {name}, Entretien: {date} um {time}, Coffee Fellows, 4 Place de Paris, 2314 Lëtzebuerg.`,
  },
  formation: {
    email: `Moien {name},

No eisem Entetien gouf eng Formatioun festgeluecht fir den {date} um {time}.

D'Formatioun fënnt bei Eis statt, op dëser Adress:
9a Rue de Chiny, 1334 Lëtzebuerg (Quartier Gare).

Dir kënnt am Parking Fort Neipperg parken, ongeféier 15–16 Minutte Fousswee ewech:
43, rue du Fort Neipperg, 2230 Lëtzebuerg (Quartier Gare).

Wann Dir nach Froen hutt, kënnt Dir Iech gären bei mir mellen.
Mat frëndleche Gréiss,
Oscar Garcia Saint-Medar
CEO vun Proago`,
    sms: `Moien {name}, Formatioun: {date} um {time}, 9a Rue de Chiny, 1334 Lëtzebuerg.`,
  }
});
export const loadTemplates = () => load(templateKey, null) || defaultTemplates();
export const saveTemplates = (tpl) => save(templateKey, tpl);
export const renderTemplate = (tpl, vars) => (tpl||"").replace(/\{(\w+)\}/g, (_,k)=> vars?.[k] ?? "");

export const bwKey = "proago_bw_link_v1";
export const upsertBwConfig = (cfg) => save(bwKey, { ...(load(bwKey, {})||{}), ...cfg });
export const getBwConfig = () => load(bwKey, { baseUrl:"", apiKey:"", enabled:false });

export const detectConflicts = (crm, bw) => {
  const result = { nameConflicts: [], scoreConflicts: [] };
  const byCode = new Map(crm.map(r=>[r.crewCode, r]));
  for (const b of bw) {
    const c = byCode.get(b.crewCode);
    if (!c) continue;
    if (c.name && b.name && c.name.trim() !== b.name.trim()) {
      result.nameConflicts.push({ crewCode: b.crewCode, crmName: c.name, bwName: b.name });
    }
    if (c.score != null && b.score != null && Number(c.score) !== Number(b.score)) {
      result.scoreConflicts.push({ crewCode: b.crewCode, crmScore: c.score, bwScore: b.score });
    }
  }
  return result;
};
