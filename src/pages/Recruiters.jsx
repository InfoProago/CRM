// src/pages/Recruiters.jsx — Proago CRM
// v2025-09-04r • Strict to-spec: no extra buttons, proper styling, live Planning linkage
// - Header toggle: Active / Inactive — both styled like Inflow Add/Import (black/white)
// - Row Status: "Active" / "Inactive" (black/white button style; outline NOT used per your ask)
// - Info button: black border
// - Form: latest 5 scores from Planning (newest→oldest), shown as colored integers "1-2-3-4-5" (no decimals)
//   colors like Planning: >=3 green, >=2 yellow, else red
// - Average: 2 decimals
// - Box 2, Box 4: show totals of last shift (Box2+Box2*, Box4+Box4*) as %, colored with 70/40 rules
// - History modal: 90% width/height; columns: Date • Zone • Score • Box 2 • Box 2* • Box 4 • Box 4* • Sales Game
// - Dates in dd/mm/yyyy; History newest-first
// - Crewcode NOT a table column (as requested), but shown in History identity block

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Info } from "lucide-react";
import * as U from "../util.js";

const { load, K, titleCase } = U;

// ---------- helpers ----------

// dd/mm/yyyy with safe YYYY-MM-DD support (no TZ drift)
function fmtDDMMYYYY(v) {
  const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try { return new Date(v).toLocaleDateString("en-GB"); } catch { return v || ""; }
}

const ROLES = ["RK", "PR", "PC", "TC", "SM", "BM"];

// Planning reader (checks common keys; simple & safe)
function readPlanningDays() {
  const cands = [load(K.planning), load(K.planningDays), load("planning"), load("Planning")].filter(Array.isArray);
  const days = cands.reduce((a, b) => (a?.length || 0) >= (b?.length || 0) ? a : b) || [];
  return Array.isArray(days) ? days : [];
}

function normalizeDay(day) {
  const date = day?.date || day?.day || day?.id || "";
  const teams = day?.teams || day?.zones || [];
  const rows = [];
  for (const t of teams) {
    const zone = (t?.zone && (t.zone.name || t.zone.label || t.zone)) || t?.label || t?.name || t?.zone || "";
    const recs = t?.recruiters || t?.members || t?.staff || [];
    for (const r of recs) {
      rows.push({
        date,
        zone: String(zone || ""),
        name: r?.name || r?.fullName || "",
        crewCode: r?.crewCode || r?.crewcode || r?.code || "",
        score: Number(r?.score ?? r?.total ?? 0),
        box2: Number(r?.box2 ?? 0),
        box2s: Number(r?.box2s ?? r?.box2Star ?? 0),
        box4: Number(r?.box4 ?? 0),
        box4s: Number(r?.box4s ?? r?.box4Star ?? 0),
        game: Number(r?.game ?? r?.salesGame ?? r?.sales ?? 0),
      });
    }
  }
  return rows;
}

function readAllShifts() {
  const rows = [];
  for (const d of readPlanningDays()) rows.push(...normalizeDay(d));
  // newest first by ISO-like date
  rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return rows;
}

// Name matcher tolerant to small differences; crewCode wins when present on both
function matchRecruiterShift(rec, s) {
  const ccRec = String(rec?.crewCode || rec?.crewcode || "").trim();
  const ccSh = String(s?.crewCode || "").trim();
  if (ccRec && ccSh) return ccRec === ccSh;
  const a = String(rec?.name || "").toLowerCase().trim().replace(/\s+/g, " ");
  const b = String(s?.name || "").toLowerCase().trim().replace(/\s+/g, " ");
  if (!a || !b) return false;
  if (a === b) return true;
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  let hits = 0; for (const t of ta) if (tb.has(t)) hits++;
  return hits >= Math.min(ta.size, 2);
}

function shiftsForRecruiter(all, rec) {
  return all.filter((s) => matchRecruiterShift(rec, s));
}

function formLast5(all, rec) {
  return shiftsForRecruiter(all, rec).slice(0, 5).map((s) => Math.round(Number(s.score || 0)));
}

function formColor(n) {
  const v = Number(n) || 0;
  if (v >= 3) return "text-green-700";
  if (v >= 2) return "text-yellow-700";
  return "text-red-700";
}

function pct(n) { return `${Number(n || 0)}%`; }

// ---------- component ----------

export default function Recruiters({ recruiters = [], setRecruiters }) {
  const [showInactive, setShowInactive] = useState(false);

  // keep in sync with Planning; light polling (safe, no UI) and storage/focus triggers
  const [planRows, setPlanRows] = useState(() => readAllShifts());
  useEffect(() => {
    const refresh = () => setPlanRows(readAllShifts());
    const id = setInterval(refresh, 1200);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const rows = useMemo(
    () => (showInactive ? recruiters.filter((r) => r.active === false) : recruiters.filter((r) => r.active !== false)),
    [recruiters, showInactive]
  );

  const updateRec = (id, patch) => setRecruiters((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const openHistory = (r) => { setSel(r); setOpen(true); };

  return (
    <div className="grid gap-4">
      {/* Header toggle — both black/white like Inflow buttons */}
      <div className="flex justify-end gap-2">
        <Button type="button" onClick={() => setShowInactive(false)} style={{ background: "black", color: "white" }}>
          Active
        </Button>
        <Button type="button" onClick={() => setShowInactive(true)} style={{ background: "black", color: "white" }}>
          Inactive
        </Button>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recruiters</span>
            <Badge>{rows.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "30%" }} /> {/* Name */}
                <col style={{ width: "12%" }} /> {/* Role */}
                <col style={{ width: "22%" }} /> {/* Form (centered between Role & Average) */}
                <col style={{ width: "12%" }} /> {/* Average */}
                <col style={{ width: "12%" }} /> {/* Box 2 */}
                <col style={{ width: "12%" }} /> {/* Box 4 */}
                <col style={{ width: "5%" }} />  {/* Info */}
                <col style={{ width: "5%" }} />  {/* Status */}
              </colgroup>
              <thead className="bg-zinc-50">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-center">Form</th>
                  <th className="p-3 text-center">Average</th>
                  <th className="p-3 text-center">Box 2</th>
                  <th className="p-3 text-center">Box 4</th>
                  <th className="p-3 text-center">Info</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const shifts = shiftsForRecruiter(planRows, r);
                  const form = formLast5(planRows, r);
                  const avg = (() => {
                    const vals = shifts.map((s) => Number(s.score || 0));
                    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "0.00";
                  })();

                  // last shift totals for Box % display
                  const last = shifts[0] || {};
                  const b2T = Number(last.box2 || 0) + Number(last.box2s || 0);
                  const b4T = Number(last.box4 || 0) + Number(last.box4s || 0);
                  const b2Class = b2T >= 70 ? "text-green-700" : "text-red-700";
                  const b4Class = b4T >= 40 ? "text-green-700" : "text-red-700";

                  return (
                    <tr key={r.id} className="border-t">
                      {/* Name */}
                      <td className="p-3">
                        <Input value={r.name || ""} onChange={(e) => updateRec(r.id, { name: titleCase(e.target.value) })} />
                      </td>

                      {/* Role */}
                      <td className="p-3">
                        <select
                          className="h-10 border rounded-md px-2 w-full"
                          value={r.role || "RK"}
                          onChange={(e) => updateRec(r.id, { role: e.target.value })}
                        >
                          {ROLES.map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Form (centered, hyphen-separated, colored ints) */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {form.length ? (
                          form.map((n, i) => (
                            <span key={i} className={formColor(n)}>
                              {n}
                              {i < form.length - 1 ? <span className="text-zinc-400">-</span> : null}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-400"> </span>
                        )}
                      </td>

                      {/* Average */}
                      <td className="p-3 text-center">
                        <span className="inline-block rounded-full bg-zinc-100 px-2 py-1">{avg}</span>
                      </td>

                      {/* Box 2 total % */}
                      <td className="p-3 text-center">
                        <span className={b2Class}>{pct(b2T)}</span>
                      </td>

                      {/* Box 4 total % */}
                      <td className="p-3 text-center">
                        <span className={b4Class}>{pct(b4T)}</span>
                      </td>

                      {/* Info (black border) */}
                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-black"
                          onClick={() => openHistory(r)}
                          title="History"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </td>

                      {/* Status (black/white style) */}
                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          onClick={() => updateRec(r.id, { active: r.active === false ? true : false })}
                          style={{ background: "black", color: "white" }}
                        >
                          {r.active === false ? "Inactive" : "Active"}
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

      {/* History modal 90% */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="fill" className="p-4">
          <DialogHeader>
            <DialogTitle className="text-center">History</DialogTitle>
          </DialogHeader>

          {sel && (
            <div className="grid gap-4">
              {/* identity */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-zinc-500">Name</div>
                  <Input value={sel.name || ""} readOnly />
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Role</div>
                  <Input value={sel.role || ""} readOnly />
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Crewcode</div>
                  <Input value={sel.crewCode || sel.crewcode || ""} readOnly />
                </div>
              </div>

              {/* table */}
              <div className="border rounded-lg overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Zone</th>
                      <th className="p-2 text-center">Score</th>
                      <th className="p-2 text-center">Box 2</th>
                      <th className="p-2 text-center">Box 2*</th>
                      <th className="p-2 text-center">Box 4</th>
                      <th className="p-2 text-center">Box 4*</th>
                      <th className="p-2 text-right">Sales Game</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftsForRecruiter(planRows, sel).map((s, i) => (
                      <tr key={`${s.date}-${s.zone}-${i}`} className="border-t">
                        <td className="p-2">{fmtDDMMYYYY(s.date)}</td>
                        <td className="p-2">{s.zone}</td>
                        <td className="p-2 text-center">
                          <span
                            className={
                              Number(s.score) >= 3
                                ? "inline-block rounded-full bg-green-100 px-2 py-1"
                                : Number(s.score) >= 2
                                ? "inline-block rounded-full bg-yellow-100 px-2 py-1"
                                : "inline-block rounded-full bg-red-100 px-2 py-1"
                            }
                          >
                            {Number(s.score || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-2 text-center">{pct(s.box2)}</td>
                        <td className="p-2 text-center">{pct(s.box2s)}</td>
                        <td className="p-2 text-center">{pct(s.box4)}</td>
                        <td className="p-2 text-center">{pct(s.box4s)}</td>
                        <td className="p-2 text-right">{Number(s.game || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
