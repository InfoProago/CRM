// src/pages/Recruiters.jsx — Proago CRM
// v2025-09-04 • Restores live linkage to Planning for Form & History (newest→oldest)
// - Form = last 5 scores from Planning (ints, no decimals)
// - History modal shows Date, Zone, Score, Box 2, Box 2*, Box 4, Box 4*, Sales Game
// - dd/mm/yyyy dates; removal in Planning auto-removes from History/Form
// - Crewcode column next to Name; Role select (RK, PR, PC, TC, SM, BM)
// - “Active / Inactive” header buttons styled like Inflow (+Add/Import)
// - Row Status button: black/white “Active” or “Inactive”
// - Info button with black border; modal size uses size="fill"

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Info } from "lucide-react";
import * as U from "../util.js";

const { load, save, K, titleCase, addAuditLog } = U;

// ---- helpers ---------------------------------------------------------------

const ROLES = ["RK", "PR", "PC", "TC", "SM", "BM"];

// date -> dd/mm/yyyy
function dmy(d) {
  try { return new Date(d).toLocaleDateString("en-GB"); } catch { return d || ""; }
}

function avg2(nums) {
  if (!nums?.length) return "0.00";
  const n = nums.reduce((a, b) => a + Number(b || 0), 0) / nums.length;
  return n.toFixed(2);
}

// Traverse Planning store; be tolerant to slight shape variations.
// Expected day shape (minimal):
// { date: "YYYY-MM-DD", teams: [{ zone: "Zone 1", recruiters: [{ name, crewCode, score, box2, box2s, box4, box4s, game }] }] }
function readAllShiftsFromPlanning() {
  // try the most likely keys without breaking older data
  const planning =
    load(K.planning) ??
    load(K.planningDays) ??
    load("planning") ??
    [];

  const out = [];
  for (const day of planning || []) {
    const date = day?.date || day?.day || day?.id || "";
    const teams = day?.teams || day?.zones || [];
    for (const t of teams) {
      const zone = (t?.zone?.name || t?.zone || t?.label || t?.name || "").toString();
      const recs = t?.recruiters || t?.members || t?.staff || [];
      for (const r of recs) {
        if (!r) continue;
        out.push({
          date, // keep ISO-ish; we render dd/mm/yyyy in UI
          zone,
          name: r.name || r.fullName || "",
          crewCode: r.crewCode || r.crewcode || r.code || "",
          score: Number(r.score ?? r.total ?? 0),
          box2: Number(r.box2 ?? 0),
          box2s: Number(r.box2s ?? r.box2Star ?? 0),
          box4: Number(r.box4 ?? 0),
          box4s: Number(r.box4s ?? r.box4Star ?? 0),
          game: Number(r.game ?? r.salesGame ?? r.sales ?? 0),
        });
      }
    }
  }
  // newest first
  out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return out;
}

function shiftsForRecruiter(allShifts, rec) {
  const nm = (rec?.name || "").trim().toLowerCase();
  const cc = String(rec?.crewCode || rec?.crewcode || "").trim();
  return allShifts.filter((s) => {
    const nameMatch = (s.name || "").trim().toLowerCase() === nm;
    const codeMatch = !cc || !s.crewCode ? nameMatch : (String(s.crewCode).trim() === cc);
    // prefer both when available; fall back to name only if crewcode missing in data
    return cc ? (nameMatch && codeMatch) : nameMatch;
  });
}

function last5FormInts(allShifts, rec) {
  const list = shiftsForRecruiter(allShifts, rec).slice(0, 5);
  return list.map((s) => Math.round(Number(s.score || 0)));
}

// Box color thresholds (Planning rules): Box2 ≥70 green else red; Box4 ≥40 green else red.
function colorForPct(p, greenMin) {
  return Number(p) >= greenMin ? "text-green-600" : "text-red-500";
}

// percent helper
function pct(n) {
  const x = Number(n || 0);
  if (!isFinite(x)) return "0%";
  return `${x}%`;
}

// ---- main ------------------------------------------------------------------

export default function Recruiters({ recruiters = [], setRecruiters }) {
  const [showInactive, setShowInactive] = useState(false);

  const allShifts = useMemo(() => readAllShiftsFromPlanning(), []);
  const activeList = recruiters.filter((r) => r.active !== false);
  const inactiveList = recruiters.filter((r) => r.active === false);
  const view = showInactive ? inactiveList : activeList;

  const [openInfo, setOpenInfo] = useState(false);
  const [infoRec, setInfoRec] = useState(null);

  const openHistory = (rec) => {
    setInfoRec(rec);
    setOpenInfo(true);
  };

  const updateRecruiter = (id, patch) => {
    setRecruiters((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  return (
    <div className="grid gap-4">
      {/* Header toggle like Inflow buttons */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          onClick={() => setShowInactive(false)}
          style={{ background: "black", color: "white" }}
        >
          Active
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowInactive(true)}
          style={{ background: showInactive ? "black" : "white", color: showInactive ? "white" : "black" }}
        >
          Inactive
        </Button>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recruiters</span>
            <Badge>{view.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full table-fixed text-sm">
              <colgroup>
                {/* Name, Crewcode, Role, Form, Average, Box2, Box4, Info, Status */}
                <col style={{ width: "20%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "5%" }} />
              </colgroup>
              <thead className="bg-zinc-50">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Crewcode</th>
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
                {view.map((r) => {
                  const shifts = shiftsForRecruiter(allShifts, r);
                  const form = last5FormInts(allShifts, r);
                  const avg = avg2(shifts.map((s) => Number(s.score || 0)));
                  // last known box% (or compute)
                  const last = shifts[0] || {};
                  const b2 = Number(last.box2 || 0);
                  const b4 = Number(last.box4 || 0);

                  return (
                    <tr key={r.id} className="border-t">
                      {/* Name */}
                      <td className="p-3">
                        <Input
                          value={r.name || ""}
                          onChange={(e) => updateRecruiter(r.id, { name: titleCase(e.target.value) })}
                        />
                      </td>

                      {/* Crewcode */}
                      <td className="p-3">
                        <Input
                          inputMode="numeric"
                          value={r.crewCode || r.crewcode || ""}
                          onChange={(e) =>
                            updateRecruiter(r.id, { crewCode: e.target.value.replace(/\D/g, "") })
                          }
                        />
                      </td>

                      {/* Role */}
                      <td className="p-3">
                        <select
                          className="h-10 border rounded-md px-2 w-full"
                          value={r.role || "RK"}
                          onChange={(e) => updateRecruiter(r.id, { role: e.target.value })}
                        >
                          {ROLES.map((x) => (
                            <option key={x} value={x}>{x}</option>
                          ))}
                        </select>
                      </td>

                      {/* Form (centered, no decimals) */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {form.length ? form.join("-") : ""}
                      </td>

                      {/* Average 2 decimals */}
                      <td className="p-3 text-center">
                        <span className="inline-block rounded-full bg-green-100 px-2 py-1">{avg}</span>
                      </td>

                      {/* Box 2 % color rule */}
                      <td className="p-3 text-center">
                        <span className={colorForPct(b2, 70)}>{pct(b2)}</span>
                      </td>

                      {/* Box 4 % color rule */}
                      <td className="p-3 text-center">
                        <span className={colorForPct(b4, 40)}>{pct(b4)}</span>
                      </td>

                      {/* Info button (black border) */}
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

                      {/* Status button (black with white text) */}
                      <td className="p-3 text-center">
                        {r.active !== false ? (
                          <Button
                            type="button"
                            style={{ background: "black", color: "white" }}
                            onClick={() => updateRecruiter(r.id, { active: false })}
                          >
                            Active
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => updateRecruiter(r.id, { active: true })}
                          >
                            Inactive
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* History Modal */}
      <Dialog open={openInfo} onOpenChange={setOpenInfo}>
        <DialogContent size="fill" className="p-4">
          <DialogHeader>
            <DialogTitle className="text-center">History</DialogTitle>
          </DialogHeader>

          {infoRec && (
            <div className="grid gap-4">
              {/* identity row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-zinc-500">Name</div>
                  <Input value={infoRec.name || ""} readOnly />
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Role</div>
                  <Input value={infoRec.role || ""} readOnly />
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Crewcode</div>
                  <Input value={infoRec.crewCode || infoRec.crewcode || ""} readOnly />
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
                    {shiftsForRecruiter(allShifts, infoRec).map((s, i) => (
                      <tr key={`${s.date}-${i}`} className="border-t">
                        <td className="p-2">{dmy(s.date)}</td>
                        <td className="p-2">{s.zone}</td>
                        <td className="p-2 text-center">
                          <span
                            className={
                              Number(s.score) >= 4
                                ? "inline-block rounded-full bg-green-100 px-2 py-1"
                                : Number(s.score) >= 3
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
                <Button type="button" variant="outline" onClick={() => setOpenInfo(false)}>
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
