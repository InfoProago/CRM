
// util/helpers.js — central helpers for Proago CRM (no data resets)
// Brand palette
export const BRAND = { primary:'#d9010b', secondary:'#eb2a2a', accent:'#fca11c' };

// Storage keys (keep existing if you already use similar ones)
export const K = {
  leads:'proago.leads',
  recruiters:'proago.recruiters',
  planning:'proago.planning',
  settings:'proago.settings',
  audit:'proago.audit',
  ledger:'proago.ledger',
  templates:'proago.notify.templates',
  notifyFrom:'proago.notify.from'
};

// Load/Save JSON safely without wiping
export const load = (key, fallback=null) => {
  try{ const v = localStorage.getItem(key); return v? JSON.parse(v): (fallback??null) } catch(e){ return fallback??null }
};
export const save = (key, val) => { try{ localStorage.setItem(key, JSON.stringify(val)) }catch(e){} };

// Date helpers — DD-MM-YYYY
export const pad2 = (n)=> String(n).padStart(2,'0');
export const toDDMMYYYY = (d) => {
  const dt = (d instanceof Date)? d : new Date(d);
  return `${pad2(dt.getDate())}-${pad2(dt.getMonth()+1)}-${dt.getFullYear()}`;
};
export const fromDDMMYYYY = (s) => {
  const [dd,mm,yyyy] = (s||'').split('-').map(x=>parseInt(x,10));
  return new Date(yyyy, (mm||1)-1, dd||1);
};

// Week helpers
export const isoWeek = (d) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date - yearStart)/86400000) + 1)/7);
};
export const weekClosed = (date) => {
  // close after 8 weeks
  const now = new Date();
  const days = Math.floor((now - date) / 86400000);
  return days >= 56;
};

// Numbers (comma decimals allowed)
export const parseCommaNumber = (val) => {
  if (val===null || val===undefined) return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim().replace(/\s+/g,'').replace(',','.');
  const n = parseFloat(s);
  return Number.isFinite(n)? n : 0;
};
export const toMoney = (n) => (Number(n)||0).toFixed(2).replace('.',',');

// Percent/Mult helpers
export const asPercent = (n) => `${n}%`;
export const factorFromPercent = (pct) => {
  const v = parseFloat(String(pct).replace('%','').replace(',','.'));
  return Number.isFinite(v)? v/100 : 1;
};

// Colors
export const scoreClass = (s)=> s>=5? 'pill-green' : (s>=3? 'pill' : 'pill-red');
export const box2ClassByPct = (p)=> p>=70? 'pill-green' : 'pill-red';
export const box4ClassByPct = (p)=> p>=40? 'pill-green' : 'pill-red';

// Phone format/validation (Lux strict)
export const formatPhone = (raw) => {
  if (!raw) return '';
  const s = String(raw).replace(/\s+/g,'').replace(/-/g,'');
  if (s.startsWith('+352')){
    const rest = s.slice(4);
    return '+352 ' + rest.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim();
  }
  return String(raw).trim();
};
export const isValidLux = (val) => {
  const s = String(val||'').replace(/\s+/g,'').replace(/-/g,'');
  return /^\+352\d{9}$/.test(s);
};

// Indeed JSON normalizer (only name/email/phone)
export const normalizeIndeed = (json) => {
  try{
    const name = json?.applicant?.fullName || '';
    const email = json?.applicant?.email || '';
    const phone = json?.applicant?.phoneNumber || '';
    return { name, email, phone };
  }catch(e){ return null; }
};

// Audit log (everything recorded)
export const audit = (type, payload) => {
  const arr = load(K.audit, []) || [];
  arr.push({ type, payload, at: new Date().toISOString() });
  save(K.audit, arr);
};

// Payment ledger snapshot (paid vs operational)
export const ledgerAdd = (entry) => {
  const arr = load(K.ledger, []) || [];
  arr.push({ ...entry, recordedAt: new Date().toISOString(), paid:true });
  save(K.ledger, arr);
};
export const ledgerAll = ()=> load(K.ledger, []) || [];

// Templates (defaults editable in Settings)
export const defaultTemplates = () => ({
  call: {
    email: `Moien {name},

Entschëllegt, dass ech Iech stéieren. Ech erlaaben mir just Iech kuerz unzeruffen, well Dir Iech iwwer Indeed bei eis beworben hutt.

Ech wollt einfach nofroen, ob Dir nach interesséiert sidd un der Aarbecht bei eis. Zéckt wgl. net, ierch sou séier wéi méiglech bei mir ze mellen.

Ech wenschen Iech nach en agreabelen Daag.

Mat beschte Gréiss,
Garcia Oscar
CEO – Proago, Face to Face Marketing`,
    sms: `Moien {name}, Dir hat Iech iwwer Indeed beworben. Sidd Dir nach interesséiert?`
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
    sms: `Moien {name}, Entretien: {date} um {time}, Coffee Fellows, 4 Place de Paris, 2314 Lëtzebuerg.`
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
    sms: `Moien {name}, Formatioun: {date} um {time}, 9a Rue de Chiny, 1334 Lëtzebuerg.`
  }
});
export const renderTemplate = (tpl, vars) => (tpl||'').replace(/\{(\w+)\}/g, (_,k)=> (vars?.[k] ?? ''));

// Notify config (labels only; secrets stored server-side)
export const getNotifyCfg = ()=> load(K.notifyFrom, { emailFroms:[], smsFroms:[], defaults:{email:null, sms:null} });
export const setNotifyCfg = (cfg)=> save(K.notifyFrom, cfg);

// ExternalId for future B&W
export const attachExternalId = (obj, externalId) => {
  if (!obj) return obj;
  if (!obj.externalId && externalId) obj.externalId = externalId;
  return obj;
};

// Numeric input guard (digits and commas only)
export const sanitizeNumeric = (v) => {
  return String(v||'').replace(/[^0-9,.-]/g,'');
};

// Utility to split name onto two lines in UI
export const splitNameTwoLines = (name) => {
  const parts = String(name||'').trim().split(/\s+/);
  if (parts.length<=1) return [parts[0]||'', ''];
  const first = parts.shift();
  return [first, parts.join(' ')];
};
