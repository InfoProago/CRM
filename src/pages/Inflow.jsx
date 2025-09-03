// Inflow.jsx — Proago CRM (v2025-09-03 • Step 2 safe)
// Implements your Step 2 feedback:
// • Columns aligned; Calls column present in all 3 tables
// • Add / Import buttons styled consistently (black / white text)
// • Phone auto-formats + validates Lux (+352 691 999 999; exactly +352 + 9 digits)
// • Fixes typing by using controlled <Input> (via component update)
// • Calls increment 0→1→2→3 (max 3)
// • Removed Info button
// • New Lead modal width reduced (max-w-lg)
// • JSON Import accepts/normalizes Indeed JSON
// • Notify system (Email/SMS preview) when: Calls=3, Interview/Formation has date+time
// • Audit Log entries for add/move/delete/hire/notify/calls

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
  titleCase, clone, fmtISO, isValidLuxPhone, formatLuxPhone,
  addAuditLog, load, K, DEFAULT_SETTINGS
} = U;

// Country prefixes allowed in the dropdown (can expand later)
const PREFIXES = ["+352", "+33", "+32", "+49"];

// ---- Notify helpers ----
function compileTemplate(tpl, lead) {
  const date = lead.date || "";
  const time = lead.time || "";
  return (tpl || "")
    .replaceAll("{name}", titleCase(lead.name || ""))
    .replaceAll("{date}", date)
    .replaceAll("{time}", time);
}
function getSettings() {
  return load(K.settings, DEFAULT_SETTINGS);
}
function notifyEligible(stage, lead) {
  // Triggers:
  // - Calls = 3 (any stage)
  // - Interview has date+time (when in Interview)
  // - Formation has date+time (when in Formation)
  if ((lead.calls ?? 0) >= 3) return "call";
  if (stage === "interview" && lead.date && lead.time) return "interview";
  if (stage === "formation" && lead.date && lead.time) return "formation";
  return null;
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
    return formatLuxPhone(`${prefix}${digits}`);
  }, [prefix, localMobile]);

  const save = () => {
    const nm = titleCase(name);
    if (!nm) return alert("Name required.");

    if (!builtPhone && !email.trim()) {
      return alert("At least Mobile or Email is required.");
    }
    if (builtPhone && !isValidLuxPhone(builtPhone)) {
      return alert("Mobile must be Luxembourg format: +352 691 999 999 (9 digits after +352).");
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
      {/* Reduced width from giant to comfortable */}
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
                placeholder="691 999 999"
                value={localMobile}
                onChange={(e) => setLocalMobile(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="text-xs text-zinc-500">
              Format will be saved as <b>+352 691 999 999</b>. You can also leave Mobile empty if you provide Email.
            </div>
            {builtPhone && !isValidLuxPhone(builtPhone) && (
              <div className="text-xs text-red-600">Invalid Luxembourg mobile format.</div>
            )}
          </div>

          <div className="grid gap-1">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCalls((c) => Math.max(0, (c || 0) - 1))}
              >−</Button>
              <div className="w-9 text-center font-medium">{calls}</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCalls((c) => Math.min(3, (c || 0) + 1))}
              >+</Button>
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

  const stableUpdate = (updater) => {
    setPipeline((prev) => { const next = clone(prev); updater(next); return next; });
  };

  const move = (item, from, to) => {
    stableUpdate((next) => {
      next[from] = next[from].filter((x) => x.id !== item.id);
      const moved = { ...item };
      if (to === "interview" || to === "formation") {
        // reset appointment so user sets date/time
        moved.date = "";
        moved.time = "";
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
    // Try multiple field names we often see
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
    // format phone to +352 … when possible
    let phone = "";
    if (phoneRaw) {
      const cleaned = String(phoneRaw).replace(/\s+/g, "");
      if (cleaned.startsWith("+")) {
        phone = formatLuxPhone(cleaned);
      } else if (/^\d+$/.test(cleaned)) {
        // assume Luxembourg if 9-digit mobile + supplied separately by country code not present
        phone = formatLuxPhone(`+352${cleaned}`);
      }
    }
    return { name, phone, email, source, calls, date, time };
  };

  const onImport = async (file) => {
    if (!file) return;
    try {
      const txt = await file.text();
      let json = JSON.parse(txt);
      // Indeed sometimes nests results in { results:[...] } or { candidates:[...] }
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

  // Action helpers
  const incCalls = (id, keyName) => {
    stableUpdate((p) => {
      p[keyName] = p[keyName].map((it) =>
        it.id === id ? { ...it, calls: Math.min(3, (it.calls || 0) + 1) } : it
      );
    });
    addAuditLog({ area: "Inflow", action: "Calls +1", leadId: id, list: keyName });
  };

  // Notify flow
  const openNotify = (lead, stage) => {
    const type = notifyEligible(stage, lead);
    if (!type) return;
    const s = getSettings();
    const tpl =
      type === "call" ? s.notifyTemplates?.call :
      type === "interview" ? s.notifyTemplates?.interview :
      s.notifyTemplates?.formation;
    const text = compileTemplate(tpl, lead);
    setNotifyText(text);
    setNotifyLead({ lead, stage, channelFrom: s.notifyFrom });
    setNotifyOpen(true);
  };
  const sendNotify = () => {
    if (!notifyLead) return;
    const { lead, stage, channelFrom } = notifyLead;
    addAuditLog({
      area: "Notify",
      action: "Send",
      stage,
      to: { email: lead.email || null, phone: lead.phone || null },
      from: channelFrom,
      preview: notifyText,
    });
    setNotifyOpen(false);
    setNotifyLead(null);
    setNotifyText("");
    alert("Notification recorded in Audit Log.");
  };

  // Render common table (Calls column always present to align)
  const Section = ({ title, keyName, prev, nextKey, extra }) => (
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
              <col style={{ width: "18%" }} /> {/* Name */}
              <col style={{ width: "18%" }} /> {/* Mobile */}
              <col style={{ width: "18%" }} /> {/* Email */}
              <col style={{ width: "14%" }} /> {/* Source */}
              <col style={{ width: "10%" }} /> {/* Date */}
              <col style={{ width: "8%" }} />  {/* Time */}
              <col style={{ width: "6%" }} />  {/* Calls */}
              <col style={{ width: "8%" }} />  {/* Actions */}
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
                const invalidPhone = x.phone && !isValidLuxPhone(x.phone);
                const stage = keyName; // leads | interview | formation
                const canNotify = !!notifyEligible(stage, x);

                return (
                  <tr key={x.id} className="border-t">
                    <td className="p-3 font-medium">{titleCase(x.name)}</td>

                    {/* Editable Mobile with Lux formatting */}
                    <td className="p-3">
                      <Input
                        luxPhone
                        value={x.phone || ""}
                        onChange={(e) =>
                          stableUpdate((p) => {
                            p[keyName] = p[keyName].map((it) =>
                              it.id === x.id ? { ...it, phone: e.target.value } : it
                            );
                          })
                        }
                        className={invalidPhone ? "border-red-500" : ""}
                      />
                    </td>

                    {/* Editable Email */}
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

                    {/* Center Source */}
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

                    {/* Calls — always visible (aligned); increment in Leads only */}
                    <td className="p-3 text-center">
                      {keyName === "leads" ? (
                        <div className="inline-flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => incCalls(x.id, keyName)}>+1</Button>
                          <span className="font-medium">{x.calls ?? 0}</span>
                        </div>
                      ) : (
                        <span className="font-medium">{x.calls ?? 0}</span>
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
                      {canNotify && (
                        <Button size="sm" variant="outline" title="Notify" onClick={() => openNotify(x, stage)}>
                          <Bell className="h-4 w-4" />
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
      {/* Toolbar (no page title) */}
      <div className="flex justify-between items-center">
        <div />
        <div className="flex gap-2">
          {/* Black with white text to match header buttons vibe */}
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

      <Section title="Leads" keyName="leads" nextKey="interview" />
      <Section title="Interview" keyName="interview" prev="leads" nextKey="formation" />
      <Section
        title="Formation"
        keyName="formation"
        prev="interview"
        extra={(x) => (
          // Down arrow here triggers Hire
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

      {/* Notify preview dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-xl h-auto">
          <DialogHeader><DialogTitle>Notify • Preview</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            {notifyLead && (
              <>
                <div className="text-sm">
                  To: {notifyLead.lead.email || "—"} {notifyLead.lead.phone ? ` / ${notifyLead.lead.phone}` : ""}
                </div>
                <div className="text-sm">From: {getSettings().notifyFrom?.email} / {getSettings().notifyFrom?.phone}</div>
                <textarea
                  className="border rounded-md p-2 w-full h-40"
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
