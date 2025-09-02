// Inflow.jsx • Proago CRM (v2025-08-29k final)
// Tweaks requested + hardened util import.

import React, { useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Upload, Trash2, Plus, ChevronUp, ChevronDown } from "lucide-react";

// HARDENED util import (prevents Rollup “not exported” error)
import * as U from "../util.js";
const { titleCase, clone, fmtISO } = U;
const formatPhoneByCountry = U.formatPhoneByCountry || function (raw) {
  const clean = String(raw || "").replace(/\s+/g, "");
  if (!clean.startsWith("+")) return { ok: false, display: "" };
  return { ok: /^\+\d{6,15}$/.test(clean), display: clean };
};

const PREFIXES = ["+352", "+33", "+32", "+49"];

const AddLeadDialog = ({ open, onOpenChange, onSave }) => {
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("+352");
  const [localMobile, setLocalMobile] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Indeed");
  const [calls, setCalls] = useState(0);

  const buildDisplay = () => {
    const digits = localMobile.replace(/\D+/g, "");
    if (!digits && !email.trim()) return { ok: false, display: "" };
    if (!digits) return { ok: true, display: "" }; // email-only
    const raw = `${prefix}${digits}`;
    const norm = formatPhoneByCountry(raw);
    if (!norm.ok) return { ok: false, display: "" };
    return { ok: true, display: norm.display };
  };

  const save = () => {
    const nm = titleCase(name);
    if (!nm) return alert("Name required.");
    const m = buildDisplay();
    if (!m.ok) return alert("Provide a valid Mobile or leave Mobile empty and provide Email.");
    if (!m.display && !email.trim()) return alert("At least Mobile or Email is required.");

    const now = new Date();
    const lead = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      name: nm,
      phone: m.display,
      email: email.trim(),
      source: source.trim(),
      calls,
      date: fmtISO(now),
      time: now.toTimeString().slice(0, 5),
    };
    onSave(lead);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
              <Input placeholder="Number" value={localMobile} inputMode="numeric"
                     onChange={(e) => setLocalMobile(e.target.value)} />
            </div>
            <div className="text-xs text-zinc-500">At least Mobile or Email is required.</div>
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
            <Input type="number" min="0" max="3" value={calls} onChange={(e) => setCalls(Number(e.target.value || 0))} />
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

  const stableUpdate = (updater) => {
    setPipeline((prev) => { const next = clone(prev); updater(next); return next; });
  };

  const move = (item, from, to) => {
    stableUpdate((next) => {
      next[from] = next[from].filter((x) => x.id !== item.id);
      const moved = { ...item };
      if (to === "interview" || to === "formation") { moved.date = ""; moved.time = ""; }
      next[to].push(moved);
    });
  };

  const del = (item, from) => {
    if (!confirm("Delete?")) return;
    stableUpdate((next) => { next[from] = next[from].filter((x) => x.id !== item.id); });
  };

  const hire = (item) => {
    let code = prompt("Crewcode (5 digits):");
    if (!code) return;
    code = String(code).trim();
    if (!/^\d{5}$/.test(code)) { alert("Crewcode must be exactly 5 digits."); return; }
    onHire({ ...item, crewCode: code, role: "Rookie" });
    stableUpdate((next) => { next.formation = next.formation.filter((x) => x.id !== item.id); });
  };

  // JSON import (expects array of { name, phone, email, source, calls?, date?, time? })
  const onImport = async (file) => {
    if (!file) return;
    try {
      const txt = await file.text();
      const json = JSON.parse(txt);
      if (!Array.isArray(json)) throw new Error("Expected an array");
      const nowISO = fmtISO(new Date());
      const nowTime = new Date().toTimeString().slice(0, 5);
      const leads = json.map((j) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
        name: titleCase(j.name || ""),
        phone: j.phone ? (formatPhoneByCountry(j.phone).display) : "",
        email: (j.email || "").trim(),
        source: (j.source || "Indeed").trim(),
        calls: Number(j.calls || 0),
        date: j.date || nowISO,
        time: j.time || nowTime,
      })).filter((l) => l.name && (l.phone || l.email));
      if (!leads.length) return alert("No valid leads found in file.");
      stableUpdate((next) => { next.leads = [...leads, ...next.leads]; });
      alert(`Imported ${leads.length} lead(s).`);
    } catch {
      alert("Invalid JSON file.");
    }
  };

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
              <col style={{ width: "12%" }} /> {/* Date */}
              <col style={{ width: "10%" }} /> {/* Time */}
              {keyName === "leads" ? <col style={{ width: "6%" }} /> : null} {/* Calls */}
              <col style={{ width: keyName === "leads" ? "4%" : "14%" }} /> {/* Actions */}
            </colgroup>
            <thead className="bg-zinc-50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Mobile</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-center">Source</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Time</th>
                {keyName === "leads" && <th className="p-3 text-center">Calls</th>}
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pipeline[keyName].map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="p-3 font-medium">{titleCase(x.name)}</td>

                  {/* Editable Mobile */}
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

                  <td className="p-3">
                    <Input
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

                  {/* Time: trimmed right padding */}
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

                  {/* Center Calls (only in Leads) */}
                  {keyName === "leads" && <td className="p-3 text-center">{x.calls ?? 0}</td>}

                  <td className="p-3 flex gap-1 justify-end">
                    {prev && (
                      <Button
                        size="sm"
                        variant="outline"
                        title="Back"
                        onClick={() => move(x, keyName, prev)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    )}
                    {nextKey && (
                      <Button
                        size="sm"
                        variant="outline"
                        title="Move"
                        onClick={() => move(x, keyName, nextKey)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    )}
                    {extra && extra(x)}
                    <Button size="sm" variant="outline" onClick={() => alert("Edit / Info feature coming soon")}>
                      Info
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => del(x, keyName)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
