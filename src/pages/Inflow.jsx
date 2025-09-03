// Inflow.jsx — Proago CRM (v2025-09-03 • Step 2.2 refinements)
//
// What’s new in this patch:
// • Time input narrower; Date+Time preserved when moving
// • Notify bell in Interview/Formation only when date & time set; in Leads when Calls=3
// • Date displays DD-MM-YYYY, accepts DD-MM-YYYY typing, stores as ISO
// • New Lead placeholders; removed prefix invalid alert; Calls input smaller
// • Columns aligned across all three sections (identical colgroup widths)
// • Typing bug fixed (fully controlled inputs, no synthetic event cloning)
// • Importer: JSON / NDJSON / CSV; detects PDF and explains clearly

import React, { useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Upload, Trash2, Plus, ChevronUp, ChevronDown, Bell } from "lucide-react";

import * as U from "../util.js";
const {
  titleCase, clone, fmtISO, fmtUK,
  addAuditLog, load, K, DEFAULT_SETTINGS,
} = U;

const PREFIXES = ["+352", "+33", "+32", "+49"];

// ---------- Date helpers (DD-MM-YYYY <-> ISO) ----------
function parseDDMMtoISO(s) {
  // accepts "dd-mm-yyyy" or "dd/mm/yyyy"
  const m = String(s || "").match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return "";
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}
function toDDMM(isoOrEmpty) {
  if (!isoOrEmpty) return "";
  return fmtUK(isoOrEmpty);
}

// ---------- Country phone display (non-strict; you can edit later) ----------
function formatPhoneByCountry(prefix, localDigits) {
  const d = String(localDigits || "").replace(/\D+/g, "");
  switch (prefix) {
    case "+352": {
      // +352 691 999 999 (best-effort spacing)
      let out = "+352";
      if (d.length) out += " " + d.slice(0, 3);
      if (d.length > 3) out += " " + d.slice(3, 6);
      if (d.length > 6) out += " " + d.slice(6, 9);
      return out;
    }
    case "+33": {
      // +33 6 12 34 56 78 (approx)
      const body = d.replace(/^0/, "");
      let out = "+33";
      if (body.length) out += " " + body.slice(0, 1);
      if (body.length > 1) out += " " + body.slice(1, 3);
      if (body.length > 3) out += " " + body.slice(3, 5);
      if (body.length > 5) out += " " + body.slice(5, 7);
      if (body.length > 7) out += " " + body.slice(7, 9);
      return out;
    }
    case "+32": {
      // +32 470 12 34 56 (approx)
      const body = d.replace(/^0/, "");
      let out = "+32";
      if (body.length) out += " " + body.slice(0, 3);
      if (body.length > 3) out += " " + body.slice(3, 5);
      if (body.length > 5) out += " " + body.slice(5, 7);
      if (body.length > 7) out += " " + body.slice(7, 9);
      return out;
    }
    case "+49": {
      // +49 1512 345 6789 (approx)
      const body = d.replace(/^0/, "");
      let out = "+49";
      if (body.length) out += " " + body.slice(0, 4);
      if (body.length > 4) out += " " + body.slice(4, 7);
      if (body.length > 7) out += " " + body.slice(7, 11);
      return out;
    }
    default:
      return `${prefix} ${d}`.trim();
  }
}

function getSettings() {
  const s = load(K.settings, DEFAULT_SETTINGS) || {};
  const notifyFrom = {
    email: s.notifyFrom?.email || "noreply@proago.com",
    phone: s.notifyFrom?.phone || "+352 691 337 633",
  };
  return { ...s, notifyFrom };
}

// ---------- Templates (LUX / FR / DE) ----------
const TPL = {
  call: {
    lb: `Moien {name},

Entschëllegt, dass ech Iech stéieren. Ech erlaaben mir just Iech kuerz unzeruffen, well Dir Iech iwwer Indeed bei eis beworben hutt.

Ech wollt einfach nofroen, ob Dir nach interesséiert sidd un der Aarbecht bei eis. Zéckt wgl. net, ierch sou séier wéi méiglech bei mir ze mellen.

Ech wenschen Iech nach en agreabelen Daag.

Mat beschte Gréiss,
Garcia Oscar
CEO – Proago, Face to Face Marketing`,
    fr: `Bonjour {name},

Désolé(e) de vous déranger. Je me permets de vous appeler brièvement car vous avez postulé chez nous via Indeed.

Je voulais simplement savoir si vous êtes toujours intéressé(e) par le poste. N’hésitez pas à me recontacter dès que possible.

Je vous souhaite une agréable journée.

Cordialement,
Garcia Oscar
CEO – Proago, Face to Face Marketing`,
    de: `Guten Tag {name},

Entschuldigen Sie die Störung. Ich erlaube mir, Sie kurz anzurufen, da Sie sich über Indeed bei uns beworben haben.

Ich wollte nur nachfragen, ob Sie noch an der Stelle interessiert sind. Bitte zögern Sie nicht, sich so bald wie möglich bei mir zu melden.

Ich wünsche Ihnen einen angenehmen Tag.

Mit freundlichen Grüßen,
Garcia Oscar
CEO – Proago, Face to Face Marketing`,
  },
  interview: {
    lb: `Moien {name},

No eisem leschten Telefongespréich gouf en Entretien festgeluecht fir den {date} um {time}.

Den Entretien fënnt am Coffee Fellows statt, op dëser Adress:
4 Place de Paris, 2314 Lëtzebuerg (Quartier Gare, bei der Arrêt Zitha/Paris).

Dir kënnt am Parking Fort Neipperg parken, ongeféier 5–6 Minutte Fousswee ewech:
43, rue du Fort Neipperg, 2230 Lëtzebuerg (Quartier Gare).

Wann Dir nach Froen hutt, kënnt Dir Iech gären bei mir mellen.
Mat frëndleche Gréiss,
Oscar Garcia Saint-Medar
CEO vun Proago`,
    fr: `Bonjour {name},

Suite à notre dernier appel, un entretien est prévu le {date} à {time}.

L’entretien aura lieu chez Coffee Fellows, à l’adresse suivante :
4 Place de Paris, 2314 Luxembourg (quartier Gare, arrêt Zitha/Paris).

Vous pouvez vous garer au Parking Fort Neipperg, à environ 5–6 minutes à pied :
43, rue du Fort Neipperg, 2230 Luxembourg (quartier Gare).

Si vous avez des questions, n’hésitez pas à me contacter.
Cordialement,
Oscar Garcia Saint-Medar
CEO de Proago`,
    de: `Guten Tag {name},

Nach unserem letzten Telefonat wurde ein Vorstellungsgespräch für den {date} um {time} vereinbart.

Das Gespräch findet bei Coffee Fellows statt, unter folgender Adresse:
4 Place de Paris, 2314 Luxemburg (Stadtteil Gare, Haltestelle Zitha/Paris).

Sie können im Parking Fort Neipperg parken, etwa 5–6 Minuten zu Fuß:
43, rue du Fort Neipperg, 2230 Luxemburg (Stadtteil Gare).

Bei Fragen können Sie sich gerne bei mir melden.
Mit freundlichen Grüßen,
Oscar Garcia Saint-Medar
CEO von Proago`,
  },
  formation: {
    lb: `Moien {name},

No eisem Entetien gouf eng Formatioun festgeluecht fir den {date} um {time}.

D’Formatioun fënnt bei Eis statt, op dëser Adress:
9a Rue de Chiny, 1334 Lëtzebuerg (Quartier Gare).

Dir kënnt am Parking Fort Neipperg parken, ongeféier 15–16 Minutte Fousswee ewech:
43, rue du Fort Neipperg, 2230 Lëtzebuerg (Quartier Gare).

Wann Dir nach Froen hutt, kënnt Dir Iech gären bei mir mellen.
Mat frëndleche Gréiss,
Oscar Garcia Saint-Medar
CEO vun Proago`,
    fr: `Bonjour {name},

Suite à notre entretien, une formation est prévue le {date} à {time}.

La formation aura lieu chez nous, à l’adresse suivante :
9a Rue de Chiny, 1334 Luxembourg (quartier Gare).

Vous pouvez vous garer au Parking Fort Neipperg, à environ 15–16 minutes à pied :
43, rue du Fort Neipperg, 2230 Luxembourg (quartier Gare).

Si vous avez des questions, n’hésitez pas à me contacter.
Cordialement,
Oscar Garcia Saint-Medar
CEO de Proago`,
    de: `Guten Tag {name},

Nach unserem Gespräch wurde eine Schulung für den {date} um {time} geplant.

Die Schulung findet bei uns statt, unter folgender Adresse:
9a Rue de Chiny, 1334 Luxemburg (Stadtteil Gare).

Sie können im Parking Fort Neipperg parken, etwa 15–16 Minuten zu Fuß:
43, rue du Fort Neipperg, 2230 Luxemburg (Stadtteil Gare).

Bei Fragen können Sie sich gerne bei mir melden.
Mit freundlichen Grüßen,
Oscar Garcia Saint-Medar
CEO von Proago`,
  },
};

function compileTemplate(tpl, lead) {
  const d = lead.date ? toDDMM(lead.date) : "(dd-mm-yyyy)";
  const t = lead.time || "(time)";
  return (tpl || "").replaceAll("{name}", titleCase(lead.name || "")).replaceAll("{date}", d).replaceAll("{time}", t);
}

// Leads bell appears if Calls>=3; Interview/Formation only if date & time set
function shouldShowBell(stage, lead) {
  if (stage === "leads") return (lead.calls ?? 0) >= 3;
  if (stage === "interview" || stage === "formation") return !!(lead.date && lead.time);
  return false;
}

// ---------- New Lead Dialog ----------
const AddLeadDialog = ({ open, onOpenChange, onSave }) => {
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("+352");
  const [localMobile, setLocalMobile] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Indeed");
  const [calls, setCalls] = useState(0);

  const builtPhone = useMemo(() => {
    const digits = (localMobile || "").replace(/\D+/g, "");
    if (!digits) return "";
    return formatPhoneByCountry(prefix, digits);
  }, [prefix, localMobile]);

  const save = () => {
    const nm = titleCase(name);
    if (!nm) return alert("Name required.");

    if (!builtPhone && !email.trim()) {
      return alert("At least Mobile or Email is required.");
    }
    if (email && !email.includes("@")) {
      return alert("Email must contain '@'.");
    }

    const now = new Date();
    const lead = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      name: nm,
      phone: builtPhone || "",
      email: email.trim(),
      source: source.trim(),
      calls: Math.min(Math.max(Number(calls || 0), 0), 3),
      date: fmtISO(now),
      time: now.toTimeString().slice(0, 5),
    };
    onSave(lead);
    addAuditLog({ area: "Inflow", action: "Add Lead", lead: { id: lead.id, name: lead.name, source: lead.source } });
    onOpenChange(false);
    // reset
    setName(""); setPrefix("+352"); setLocalMobile(""); setEmail(""); setSource("Indeed"); setCalls(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-auto">
        <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Full Name</Label>
            <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <Label>Mobile</Label>
            <div className="flex gap-2">
              <select className="h-10 border rounded-md px-2" value={prefix} onChange={(e) => setPrefix(e.target.value)}>
                {PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <Input
                placeholder="mobile number"
                value={localMobile}
                onChange={(e) => setLocalMobile(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Email</Label>
            <Input type="email" placeholder="johndoe@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <Label>Source</Label>
            <select className="h-10 border rounded-md px-2" value={source} onChange={(e) => setSource(e.target.value)}>
              <option>Indeed</option>
              <option>Street</option>
              <option>Referral</option>
              <option>Other</option>
            </select>
          </div>

          <div className="grid gap-1">
            <Label>Calls (0–3)</Label>
            <div className="w-14">
              <Input
                inputMode="numeric"
                value={String(calls)}
                onChange={(e) => {
                  const n = Math.max(0, Math.min(3, Number(String(e.target.value).replace(/\D/g, "")) || 0));
                  setCalls(n);
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button style={{ background: "#d9010b", color: "white" }} onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Main ----------
export default function Inflow({ pipeline, setPipeline, onHire }) {
  const fileRef = useRef(null);
  const [addOpen, setAddOpen] = useState(false);

  // Notify
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyText, setNotifyText] = useState("");
  const [notifyLead, setNotifyLead] = useState(null);
  const [notifyStage, setNotifyStage] = useState(null);
  const [notifyLang, setNotifyLang] = useState("lb"); // lb | fr | de

  const stableUpdate = (updater) => {
    setPipeline((prev) => { const next = clone(prev); updater(next); return next; });
  };

  const move = (item, from, to) => {
    // Keep date/time when moving; do not reset
    stableUpdate((next) => {
      next[from] = next[from].filter((x) => x.id !== item.id);
      next[to].push({ ...item });
    });
    addAuditLog({ area: "Inflow", action: "Move", from, to, lead: { id: item.id, name: item.name } });
  };

  const del = (item, from) => {
    if (!confirm("Delete?")) return;
    stableUpdate((next) => { next[from] = next[from].filter((x) => x.id !== item.id); });
    addAuditLog({ area: "Inflow", action: "Delete Lead", from, lead: { id: item.id, name: item.name } });
  };

  const hire = (item) => {
    let code = prompt("Crewcode (5 digits):");
    if (!code) return;
    code = String(code).trim();
    if (!/^\d{5}$/.test(code)) { alert("Crewcode must be exactly 5 digits."); return; }
    onHire({ ...item, crewCode: code, role: "Rookie" });
    stableUpdate((next) => { next.formation = next.formation.filter((x) => x.id !== item.id); });
    addAuditLog({ area: "Inflow", action: "Hire", lead: { id: item.id, name: item.name }, crewCode: code });
  };

  // ---------- Import: JSON / NDJSON / CSV; detect PDF ----------
  const parseMaybeCSV = (txt) => {
    // very small CSV parser for common fields
    const lines = txt.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (k) => headers.findIndex((h) => h.includes(k));
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      out.push({
        name: cols[idx("name")] || "",
        email: cols[idx("mail")] || cols[idx("email")] || "",
        phone: cols[idx("phone")] || cols[idx("mobile")] || "",
        calls: cols[idx("calls")] || 0,
        date: cols[idx("date")] || "",
        time: cols[idx("time")] || "",
        source: cols[idx("source")] || "Indeed",
      });
    }
    return out;
  };

  const normalizeLead = (j) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name: titleCase(j.name || ""),
    phone: j.phone || "",
    email: (j.email || "").trim(),
    source: j.source || "Indeed",
    calls: Math.min(Math.max(Number(j.calls || 0), 0), 3),
    date: j.date ? (j.date.includes("-") ? parseDDMMtoISO(toDDMM(j.date)) : parseDDMMtoISO(j.date)) || fmtISO(new Date()) : fmtISO(new Date()),
    time: j.time || new Date().toTimeString().slice(0, 5),
  });

  const onImport = async (file) => {
    if (!file) return;
    try {
      const txt = await file.text();

      // 1) Quick PDF detection (your "indeed test 1/2.json" are PDFs, not JSON)
      if (txt.startsWith("%PDF")) {
        alert("This file is a PDF, not a JSON/CSV export. Please export candidates as JSON or CSV from Indeed.");
        return;
      }

      let rows = [];

      // 2) Try pure JSON array
      try {
        const asJson = JSON.parse(txt);
        if (Array.isArray(asJson)) rows = asJson;
        else if (asJson?.results && Array.isArray(asJson.results)) rows = asJson.results;
        else if (asJson?.candidates && Array.isArray(asJson.candidates)) rows = asJson.candidates;
      } catch {
        // 3) Try NDJSON (one JSON per line)
        const mayND = txt.trim().split(/\n+/).filter(Boolean);
        if (mayND.length > 1) {
          const nd = [];
          for (const line of mayND) {
            try { nd.push(JSON.parse(line)); } catch {}
          }
          if (nd.length) rows = nd;
        }
      }

      // 4) Try CSV if still empty
      if (!rows.length && txt.includes(",") && txt.includes("\n")) {
        rows = parseMaybeCSV(txt);
      }

      if (!rows.length) {
        alert("Could not parse the file. Please upload an Indeed JSON/CSV export.");
        return;
      }

      // map common fields
      const leads = rows
        .map((row) => {
          const name = row.name || row.full_name || row.candidate || `${row.first_name || ""} ${row.last_name || ""}`.trim();
          const phone = row.phone || row.phone_number || row.mobile || row.contact?.phone || "";
          const email = row.email || row.mail || row.contact?.email || "";
          const source = row.source || row.platform || row.channel || "Indeed";
          const calls = row.calls ?? 0;
          const date = row.date || row.applied_at || row.created_at || row.timestamp || "";
          const time = row.time || "";
          return { name, phone, email, source, calls, date, time };
        })
        .filter((j) => j.name && (j.phone || j.email))
        .map(normalizeLead);

      if (!leads.length) {
        alert("No valid leads found in file.");
        return;
      }

      setPipeline((p) => ({ ...p, leads: [...leads, ...p.leads] }));
      addAuditLog({ area: "Inflow", action: "Import", source: "Indeed", count: leads.length });
      alert(`Imported ${leads.length} lead(s).`);
    } catch (e) {
      console.error(e);
      alert("Import failed. Please use an Indeed JSON/CSV export.");
    }
  };

  // ---------- Notify ----------
  const openNotify = (lead, stage) => {
    const base = TPL[stage === "interview" ? "interview" : stage === "formation" ? "formation" : "call"];
    const text = compileTemplate(base[notifyLang], lead);
    setNotifyText(text);
    setNotifyLead(lead);
    setNotifyStage(stage);
    setNotifyOpen(true);
  };

  const sendNotify = () => {
    if (!notifyLead) return;
    const from = getSettings().notifyFrom;
    addAuditLog({
      area: "Notify",
      action: "Send",
      lang: notifyLang,
      stage: notifyStage,
      to: { email: notifyLead.email || null, phone: notifyLead.phone || null },
      from,
      preview: notifyText,
    });
    setNotifyOpen(false);
    setNotifyLead(null);
    setNotifyText("");
    setNotifyStage(null);
  };

  // ---------- Table section (identical widths across all) ----------
  const COLS = [
    { w: "18%" }, // Name
    { w: "20%" }, // Mobile
    { w: "18%" }, // Email
    { w: "12%" }, // Source
    { w: "14%" }, // Date
    { w: "12%" }, // Time
    { w: "6%"  }, // Calls (only in Leads; empty col elsewhere keeps symmetry)
    { w: "10%" }, // Actions
  ];

  const Section = ({ title, keyName, prev, nextKey, extra, showCalls }) => (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          <Badge>{pipeline[keyName].length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm table-fixed">
            <colgroup>
              {COLS.map((c, i) => <col key={i} style={{ width: c.w }} />)}
            </colgroup>
            <thead className="bg-zinc-50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Mobile</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-center">Source</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-center">Calls</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pipeline[keyName].map((x) => {
                const stage = keyName;
                const showBell = shouldShowBell(stage, x);

                return (
                  <tr key={x.id} className="border-t">
                    <td className="p-3 font-medium">{titleCase(x.name)}</td>

                    {/* Mobile */}
                    <td className="p-3">
                      <Input
                        value={x.phone || ""}
                        placeholder="mobile number"
                        onChange={(e) =>
                          stableUpdate((p) => {
                            p[keyName] = p[keyName].map((it) =>
                              it.id === x.id ? { ...it, phone: e.target.value } : it
                            );
                          })
                        }
                      />
                    </td>

                    {/* Email */}
                    <td className="p-3">
                      <Input
                        type="email"
                        placeholder="johndoe@gmail.com"
                        value={x.email || ""}
                        onChange={(e) =>
                          stableUpdate((p) => {
                            p[keyName] = p[keyName].map((it) =>
                              it.id === x.id ? { ...it, email: e.target.value } : it
                            );
                          })
                        }
                      />
                    </td>

                    {/* Source */}
                    <td className="p-3 text-center">{x.source}</td>

                    {/* Date (DD-MM-YYYY) */}
                    <td className="p-3">
                      <Input
                        type="text"
                        placeholder="dd-mm-yyyy"
                        value={toDDMM(x.date) || ""}
                        onChange={(e) =>
                          stableUpdate((p) => {
                            const iso = parseDDMMtoISO(e.target.value) || "";
                            p[keyName] = p[keyName].map((it) =>
                              it.id === x.id ? { ...it, date: iso } : it
                            );
                          })
                        }
                      />
                    </td>

                    {/* Time (narrow) */}
                    <td className="p-3">
                      <Input
                        type="time"
                        className="w-24 pr-2"
                        value={x.time || ""}
                        onChange={(e) =>
                          stableUpdate((p) => {
                            p[keyName] = p[keyName].map((it) =>
                              it.id === x.id ? { ...it, time: e.target.value } : it
                            );
                          })
                        }
                      />
                    </td>

                    {/* Calls (only meaningful in Leads; keep empty box for symmetry otherwise) */}
                    <td className="p-3 text-center">
                      {showCalls ? (
                        <div className="w-12 mx-auto">
                          <Input
                            inputMode="numeric"
                            value={String(x.calls ?? 0)}
                            onChange={(e) =>
                              stableUpdate((p) => {
                                const n = Math.max(0, Math.min(3, Number(String(e.target.value).replace(/\D/g, "")) || 0));
                                p[keyName] = p[keyName].map((it) =>
                                  it.id === x.id ? { ...it, calls: n } : it
                                );
                              })
                            }
                          />
                        </div>
                      ) : (
                        <div /> // empty cell but same width
                      )}
                    </td>

                    <td className="p-3 flex gap-1 justify-end">
                      {prev && (
                        <Button size="sm" variant="outline" title="Back" onClick={() => move(x, keyName, prev)}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                      )}
                      {nextKey && (
                        <Button size="sm" variant="outline" title="Move" onClick={() => move(x, keyName, nextKey)}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      )}
                      {extra && extra(x)}
                      {showBell && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Notify"
                          onClick={() => openNotify(x, stage)}
                          style={{ background: "black", color: "white" }}
                        >
                          <Bell className="h-4 w-4" color="white" />
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => del(x, keyName)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <div />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAddOpen(true)}
            style={{ background: "black", color: "white" }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
          <Button
            onClick={() => fileRef.current?.click()}
            style={{ background: "black", color: "white" }}
          >
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".json,.csv,application/json,text/csv"
            onChange={(e) => onImport(e.target.files?.[0])}
          />
        </div>
      </div>

      <Section title="Leads" keyName="leads" nextKey="interview" showCalls />
      <Section title="Interview" keyName="interview" prev="leads" nextKey="formation" showCalls={false} />
      <Section
        title="Formation"
        keyName="formation"
        prev="interview"
        showCalls={false}
        extra={(x) => (
          <Button size="sm" variant="outline" title="Hire" onClick={() => hire(x)}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      />

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={(lead) => setPipeline((p) => ({ ...p, leads: [lead, ...p.leads] }))}
      />

      {/* Notify dialog (with language) */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-xl h-auto">
          <DialogHeader><DialogTitle>Notify</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {notifyLead && (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <div>Lang:</div>
                  <select
                    className="h-9 border rounded-md px-2"
                    value={notifyLang}
                    onChange={(e) => {
                      const lang = e.target.value;
                      setNotifyLang(lang);
                      const base = TPL[notifyStage === "interview" ? "interview" : notifyStage === "formation" ? "formation" : "call"];
                      setNotifyText(compileTemplate(base[lang], notifyLead));
                    }}
                  >
                    <option value="lb">Lëtzebuergesch</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <div className="text-sm">
                  To: {notifyLead.email || "—"} {notifyLead.phone ? ` / ${notifyLead.phone}` : ""}
                </div>
                <div className="text-sm">From: {getSettings().notifyFrom?.email} / {getSettings().notifyFrom?.phone}</div>
                <textarea
                  className="border rounded-md p-2 w-full h-48"
                  value={notifyText}
                  onChange={(e) => setNotifyText(e.target.value)}
                />
              </>
            )}
          </div>
          <DialogFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => setNotifyOpen(false)}>Cancel</Button>
            <Button style={{ background: "black", color: "white" }} onClick={sendNotify}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
