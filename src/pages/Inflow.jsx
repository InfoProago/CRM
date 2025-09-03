// Inflow.jsx — Proago CRM (v2025-09-03 • Step 2 + tweaks)
// Changes per your latest feedback:
// • Remove Calls column from Interview/Formation
// • Notify bell: always shown in Interview/Formation (black bg, white bell); in Leads only when Calls=3
// • New Lead: country-aware phone formatting (Lux/FR/BE/DE) + email must contain '@'
// • Notify dialog title = "Notify"; From phone defaults to +352 691 337 633 if not set in Settings
// • Templates prefilled with your Luxembourgish texts (still editable)
// • Columns symmetric within each table
// • Calls in Leads = small input (0–3)

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
  titleCase, clone, fmtISO, fmtUK, isValidLuxPhone, formatLuxPhone,
  addAuditLog, load, K, DEFAULT_SETTINGS
} = U;

const PREFIXES = ["+352", "+33", "+32", "+49"];

// ------------- Phone formatting per country -------------
function formatPhoneByCountry(prefix, localDigits) {
  const d = String(localDigits || "").replace(/\D+/g, "");
  switch (prefix) {
    case "+352": {
      // +352 691 999 999 (9 digits after 352)
      return formatLuxPhone(`+352${d}`);
    }
    case "+33": {
      // France mobile (approx): +33 6 12 34 56 78
      const body = d.replace(/^0/, ""); // drop leading 0 if provided
      let out = "+33";
      if (body.length) out += " " + body.slice(0, 1);
      if (body.length > 1) out += " " + body.slice(1, 3);
      if (body.length > 3) out += " " + body.slice(3, 5);
      if (body.length > 5) out += " " + body.slice(5, 7);
      if (body.length > 7) out += " " + body.slice(7, 9);
      return out;
    }
    case "+32": {
      // Belgium mobile (approx): +32 470 12 34 56
      const body = d.replace(/^0/, "");
      let out = "+32";
      if (body.length) out += " " + body.slice(0, 3);
      if (body.length > 3) out += " " + body.slice(3, 5);
      if (body.length > 5) out += " " + body.slice(5, 7);
      if (body.length > 7) out += " " + body.slice(7, 9);
      return out;
    }
    case "+49": {
      // Germany mobile (approx): +49 1512 345 6789
      const body = d.replace(/^0/, "");
      let out = "+49";
      if (body.length) out += " " + body.slice(0, 4);
      if (body.length > 4) out += " " + body.slice(4, 7);
      if (body.length > 7) out += " " + body.slice(7, 11);
      return out;
    }
    default: {
      // Fallback: just prefix + digits
      return `${prefix} ${d}`.trim();
    }
  }
}

function isValidByCountry(prefix, display) {
  const digits = String(display || "").replace(/\D+/g, "");
  if (prefix === "+352") return digits.startsWith("352") && digits.length === 12; // strict Lux check
  // For other countries, accept reasonable mobile lengths (9–12 digits total after country code)
  return digits.length >= 10 && digits.length <= 14;
}

// ------------- Notify helpers -------------
function compileTemplate(tpl, lead, defaults) {
  const d = lead.date ? fmtUK(lead.date) : defaults?.date || "(dd-mm-yyyy)";
  const t = lead.time || defaults?.time || "(time)";
  return (tpl || "")
    .replaceAll("{name}", titleCase(lead.name || ""))
    .replaceAll("{date}", d)
    .replaceAll("{time}", t);
}

function getSettings() {
  const s = load(K.settings, DEFAULT_SETTINGS) || {};
  // Fallback phone if not configured
  const phone = s.notifyFrom?.phone || "+352 691 337 633";
  const email = s.notifyFrom?.email || "noreply@proago.com";
  const notifyFrom = { email, phone };
  return { ...s, notifyFrom };
}

// Your exact templates (editable in the Notify dialog)
const TPL_CALL = `Moien {name},

Entschëllegt, dass ech Iech stéieren. Ech erlaaben mir just Iech kuerz unzeruffen, well Dir Iech iwwer Indeed bei eis beworben hutt.

Ech wollt einfach nofroen, ob Dir nach interesséiert sidd un der Aarbecht bei eis. Zéckt wgl. net, ierch sou séier wéi méiglech bei mir ze mellen.

Ech wenschen Iech nach en agreabelen Daag.

Mat beschte Gréiss,
Garcia Oscar
CEO – Proago, Face to Face Marketing`;

const TPL_INTERVIEW = `Moien {name},

No eisem leschten Telefongespréich gouf en Entretien festgeluecht fir den {date} um {time}.

Den Entretien fënnt am Coffee Fellows statt, op dëser Adress:
4 Place de Paris, 2314 Lëtzebuerg (Quartier Gare, bei der Arrêt Zitha/Paris).

Dir kënnt am Parking Fort Neipperg parken, ongeféier 5–6 Minutte Fousswee ewech:
43, rue du Fort Neipperg, 2230 Lëtzebuerg (Quartier Gare).

Wann Dir nach Froen hutt, kënnt Dir Iech gären bei mir mellen.
Mat frëndleche Gréiss,
Oscar Garcia Saint-Medar
CEO vun Proago`;

const TPL_FORMATION = `Moien {name},

No eisem Entetien gouf eng Formatioun festgeluecht fir den {date} um {time}.

D’Formatioun fënnt bei Eis statt, op dëser Adress:
9a Rue de Chiny, 1334 Lëtzebuerg (Quartier Gare).

Dir kënnt am Parking Fort Neipperg parken, ongeféier 15–16 Minutte Fousswee ewech:
43, rue du Fort Neipperg, 2230 Lëtzebuerg (Quartier Gare).

Wann Dir nach Froen hutt, kënnt Dir Iech gären bei mir mellen.
Mat frëndleche Gréiss,
Oscar Garcia Saint-Medar
CEO vun Proago`;

// Leads bell shows only when Calls=3; Interview/Formation -> always show
function shouldShowBell(stage, lead) {
  if (stage === "leads") return (lead.calls ?? 0) >= 3;
  if (stage === "interview" || stage === "formation") return true;
  return false;
}

function templateFor(stage) {
  if (stage === "interview") return TPL_INTERVIEW;
  if (stage === "formation") return TPL_FORMATION;
  return TPL_CALL; // leads
}

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
    if (builtPhone && !isValidByCountry(prefix, builtPhone)) {
      return alert("Mobile format is invalid for the selected country.");
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
      {/* Smaller dialog */}
      <DialogContent className="max-w-lg h-auto">
        <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <Label>Mobile</Label>
            <div className="flex gap-2">
              <select className="h-10 border rounded-md px-2" value={prefix} onChange={(e) => setPrefix(e.target.value)}>
                {PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <Input
                placeholder={prefix === "+352" ? "691 999 999" : "mobile number"}
                value={localMobile}
                onChange={(e) => setLocalMobile(e.target.value)}
                inputMode="numeric"
              />
            </div>
            {builtPhone && !isValidByCountry(prefix, builtPhone) && (
              <div className="text-xs text-red-600">Invalid format for {prefix}.</div>
            )}
          </div>

          <div className="grid gap-1">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {email && !email.includes("@") && (
              <div className="text-xs text-red-600">Email must contain '@'.</div>
            )}
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
            <div className="w-20">
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

export default function Inflow({ pipeline, setPipeline, onHire }) {
  const fileRef = useRef(null);
  const [addOpen, setAddOpen] = useState(false);

  // Notify preview state
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyText, setNotifyText] = useState("");
  const [notifyLead, setNotifyLead] = useState(null);
  const [notifyStage, setNotifyStage] = useState(null);

  const stableUpdate = (updater) => {
    setPipeline((prev) => { const next = clone(prev); updater(next); return next; });
  };

  const move = (item, from, to) => {
    stableUpdate((next) => {
      next[from] = next[from].filter((x) => x.id !== item.id);
      const moved = { ...item };
      if (to === "interview" || to === "formation") {
        // leave date/time unchanged; user may set them any time
      }
      next[to].push(moved);
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

  // JSON import — normalize Indeed variations to expected shape
  const normalizeIndeed = (row) => {
    const name = row.name || row.full_name || row.candidate || `${row.first_name || ""} ${row.last_name || ""}`.trim();
    const phoneRaw = row.phone || row.phone_number || row.mobile || row.contact?.phone || "";
    const email = (row.email || row.mail || row.contact?.email || "").trim();
    const source = (row.source || row.platform || row.channel || "Indeed").trim();
    const calls = Number(row.calls ?? 0);
    let date = row.date || row.applied_at || row.created_at || row.timestamp || "";
    let time = row.time || "";
    if (!date) {
      const now = new Date();
      date = fmtISO(now);
      time = now.toTimeString().slice(0, 5);
    }
    // try to infer country; if looks like raw digits assume Lux
    let phone = "";
    if (phoneRaw) {
      const cleaned = String(phoneRaw).replace(/\s+/g, "");
      if (cleaned.startsWith("+")) {
        // keep prefix, best-effort format by country code
        const prefix = cleaned.slice(0, 3) === "+33" ? "+33"
          : cleaned.slice(0, 3) === "+32" ? "+32"
          : cleaned.slice(0, 3) === "+49" ? "+49"
          : "+352";
        const rest = cleaned.replace(/^\+\d+/, "");
        phone = formatPhoneByCountry(prefix, rest);
      } else if (/^\d+$/.test(cleaned)) {
        phone = formatPhoneByCountry("+352", cleaned);
      }
    }
    return { name, phone, email, source, calls, date, time };
  };

  const onImport = async (file) => {
    if (!file) return;
    try {
      const txt = await file.text();
      let json = JSON.parse(txt);
      if (!Array.isArray(json)) {
        json = json.results || json.candidates || json.items || [];
      }
      if (!Array.isArray(json)) throw new Error("Expected an array.");
      const leads = json
        .map(normalizeIndeed)
        .map((j) => ({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          name: titleCase(j.name || ""),
          phone: j.phone || "",
          email: (j.email || "").trim(),
          source: j.source || "Indeed",
          calls: Math.min(Math.max(Number(j.calls || 0), 0), 3),
          date: j.date || fmtISO(new Date()),
          time: j.time || new Date().toTimeString().slice(0, 5),
        }))
        .filter((l) => l.name && (l.phone || l.email));
      if (!leads.length) return alert("No valid leads found in file.");
      stableUpdate((next) => { next.leads = [...leads, ...next.leads]; });
      addAuditLog({ area: "Inflow", action: "Import JSON", count: leads.length, source: "Indeed" });
      alert(`Imported ${leads.length} lead(s).`);
    } catch (e) {
      console.error(e);
      alert("Invalid JSON file.");
    }
  };

  // Notify flow
  const openNotify = (lead, stage) => {
    const s = getSettings();
    const tpl = templateFor(stage);
    const text = compileTemplate(tpl, lead, { date: "(dd-mm-yyyy)", time: "(time)" });
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
      stage: notifyStage,
      to: { email: notifyLead.email || null, phone: notifyLead.phone || null },
      from,
      preview: notifyText,
    });
    setNotifyOpen(false);
    setNotifyLead(null);
    setNotifyText("");
    setNotifyStage(null);
    alert("Notification recorded in Audit Log.");
  };

  // ---------- Tables ----------
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
              <col style={{ width: "20%" }} /> {/* Name */}
              <col style={{ width: "20%" }} /> {/* Mobile */}
              <col style={{ width: "18%" }} /> {/* Email */}
              <col style={{ width: "14%" }} /> {/* Source */}
              <col style={{ width: "14%" }} /> {/* Date */}
              <col style={{ width: "14%" }} /> {/* Time */}
              {!showCalls && <col style={{ width: "0%" }} />} {/* placeholder removed */}
              <col style={{ width: "12%" }} /> {/* Actions */}
            </colgroup>
            <thead className="bg-zinc-50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Mobile</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-center">Source</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Time</th>
                {showCalls && <th className="p-3 text-center">Calls</th>}
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

                    {/* Mobile (free edit; we don't enforce reformat here to not fight the user) */}
                    <td className="p-3">
                      <Input
                        value={x.phone || ""}
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

                    {/* Date */}
                    <td className="p-3">
                      <Input
                        type="date"
                        value={x.date || ""}
                        onChange={(e) =>
                          stableUpdate((p) => {
                            p[keyName] = p[keyName].map((it) =>
                              it.id === x.id ? { ...it, date: e.target.value } : it
                            );
                          })
                        }
                      />
                    </td>

                    {/* Time */}
                    <td className="p-3">
                      <Input
                        type="time"
                        className="pr-2"
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

                    {/* Calls only for Leads */}
                    {showCalls && (
                      <td className="p-3 text-center">
                        <div className="w-16 mx-auto">
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
                      </td>
                    )}

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
            accept="application/json"
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

      {/* Notify dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-xl h-auto">
          <DialogHeader><DialogTitle>Notify</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            {notifyLead && (
              <>
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
