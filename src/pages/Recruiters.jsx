// src/pages/Recruiters.jsx — Proago CRM
// v2025-09-04 • Form oldest→newest (left→right, max 5), History newest→oldest, Average 2dp
// Active/Inactive header (black/white), Info button black border, Status toggle black/white,
// Box 2/4 thresholds from latest shift (B2>=70 green, B4>=40 green), dd/mm/yyyy dates in modal.
// No Crewcode column in main table; Crewcode appears in History identity row.

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Info } from "lucide-react";
import * as U from "../util.js";

const { load, K, titleCase } = U;

// ---------- small utils ----------
function fmtDDMMYYYY(v) {
  const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`; // dd/mm/yyyy
  try { return new Date(v).toLocaleDateString("en-GB"); } catch { return v || ""; }
}
const pct = (n) => `${Number(n || 0)}%`;

function formColor(n) {
  const v = Number(n) || 0;
  if (v >= 3) return "text-green-700";
  if (v >= 2) return "text-yellow-700";
  return "text-red-700";
}

// Read Planning via expected util keys; safe if empty
function readPlanningDays() {
  const a = load?.(K?.planning);
  const b = load?.(K?.planningDays);
  if (Array.isArray(a) && a.length) return a;
  if (Array.isArray(b) && b.length) return b;
  return [];
}

function normalizeDay(day) {
  const date = day?.date || day?.day || day?.id || "";
  const teams = day?.teams || day?.zones || [];
  const out = [];
  for (const t of teams) {
    const zone =
      (t?.zone && (t.zone.name || t.zone.label || t.zone)) ||
      t?.label || t?.name || t?.zone || "";
    const recs = t?.recruiters || t?.members || t?.staff || [];
    for (const r of recs) {
      out.push({
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
  return out;
}

function readAllShifts() {
  const rows = [];
  for (const d of readPlanningDays()) rows.push(...normalizeDay(d));
  // sort once newest→oldest for reuse
  rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return rows;
}

// name match tolerant; crewCode wins when present on both
function matchRecruiter(rec, s) {
  const ccR = String(rec?.crewCode || rec?.crewcode || "").trim();
  const ccS = String(s?.crewCode || "").trim();
  if (ccR && ccS) return ccR === ccS;
  const a = String(rec?.name || "").toLowerCase().trim().replace(/\s+/g, " ");
  const b = String(s?.name || "").toLowerCase().trim().replace(/\s+/g, " ");
  if (!a || !b) return false;
  if (a === b) return true;
  const SA = new Set(a.split(" ").filter(Boolean));
  const SB = new Set(b.split(" ").filter(Boolean));
  let hits = 0; for (const t of SA) if (SB.has(t)) hits++;
  return hits >= Math.min(SA.size, 2);
}

function shiftsForRecruiter(all, rec) {
  return all.filter((s) => matchRecruiter(rec, s));
}

// ---- FORM ORDER: oldest→newest (left→right), max 5 ----
// Take all shifts (already newest→oldest), slice latest 5, then reverse for display.
function formOldestToNewest5(all, rec) {
  const latest5 = shiftsForRecruiter(all, rec).slice(0, 5);
  return latest5.reverse().map((s) => Math.round(Number(s.score || 0)));
}

function avg2(nums) {
  if (!nums?.length) return "0.00";
  const n = nums.reduce((a, b) => a + Number(b || 0), 0) / nums.length;
  return n.toFixed(2);
}

// ---------- component ----------
export default function Recruiters({ recruiters = [], setRecruiters }) {
  const [showInactive, setShowInactive] = useState(false);

  // keep modestly in sync with Planning
  const [planRows, setPlanRows] = useState(() => readAllShifts());
  useEffect(() => {
    const refresh = () => setPlanRows(readAllShifts());
    const id = setInterval(refresh, 1500);
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

  const list = useMemo(
    () =>
      showInactive
        ? recruiters.filter((r) => r.active === false)
        : recruiters.filter((r) => r.active !== false),
    [recruiters, showInactive]
  );

  const updateRec = (id, patch) =>
    setRecruiters?.((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoRec, setInfoRec] = useState(null);
  const openHistory = (r) => { setInfoRec(r); setInfoOpen(true); };

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
            <Badge>{list.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "30%" }} /> {/* Name */}
                <col style={{ width: "12%" }} /> {/* Role */}
                <col style={{ width: "22%" }} /> {/* Form */}
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
                {list.map((r) => {
                  const shifts = shiftsForRecruiter(planRows, r);
                  const form = formOldestToNewest5(planRows, r);
                  const avg = avg2(shifts.map((s) => Number(s.score || 0)));

                  // latest shift totals for Box % display
                  const last = shifts[0] || {};
                  const box2Tot = Number(last.box2 || 0) + Number(last.box2s || 0);
                  const box4Tot = Number(last.box4 || 0) + Number(last.box4s || 0);
                  const b2Class = box2Tot >= 70 ? "text-green-700" : "text-red-700";
                  const b4Class = box4Tot >= 40 ? "text-green-700" : "text-red-700";

                  return (
                    <tr key={r.id} className="border-t">
                      {/* Name */}
                      <td className="p-3">
                        <Input
                          value={r.name || ""}
                          onChange={(e) => updateRec(r.id, { name: titleCase(e.target.value) })}
                        />
                      </td>

                      {/* Role */}
                      <td className="p-3">
                        <select
                          className="h-10 border rounded-md px-2 w-full"
                          value={r.role || "RK"}
                          onChange={(e) => updateRec(r.id, { role: e.target.value })}
                        >
                          <option>RK</option>
                          <option>PR</option>
                          <option>PC</option>
                          <option>TC</option>
                          <option>SM</option>
                          <option>BM</option>
                        </select>
                      </td>

                      {/* Form (oldest→newest, no decimals, colored ints) */}
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

                      {/* Box 2 total % from latest shift */}
                      <td className="p-3 text-center">
                        <span className={b2Class}>{pct(box2Tot)}</span>
                      </td>

                      {/* Box 4 total % from latest shift */}
                      <td className="p-3 text-center">
                        <span className={b4Class}>{pct(box4Tot)}</span>
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

                      {/* Status (single black/white toggle) */}
                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          style={{ background: "black", color: "white" }}
                          onClick={() => updateRec(r.id, { active: r.active === false ? true : false })}
                        >
                          {r.active === false ? "Inactive" : "Active"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {list.length === 0 && (
                  <tr className="border-t">
                    <td className="p-6 text-zinc-400 text-center" colSpan={8}>
                      {showInactive ? "No inactive recruiters." : "No active recruiters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* History modal — newest first */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
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
                    {/* planRows already newest→oldest; show in that order (newest on top) */}
                    {shiftsForRecruiter(planRows, infoRec).map((s, i) => {
                      const score = Number(s.score || 0);
                      return (
                        <tr key={`${s.date}-${s.zone}-${i}`} className="border-t">
                          <td className="p-2">{fmtDDMMYYYY(s.date)}</td>
                          <td className="p-2">{s.zone}</td>
                          <td className="p-2 text-center">
                            <span
                              className={
                                score >= 3
                                  ? "inline-block rounded-full bg-green-100 px-2 py-1"
                                  : score >= 2
                                  ? "inline-block rounded-full bg-yellow-100 px-2 py-1"
                                  : "inline-block rounded-full bg-red-100 px-2 py-1"
                              }
                            >
                              {score.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-2 text-center">{pct(s.box2)}</td>
                          <td className="p-2 text-center">{pct(s.box2s)}</td>
                          <td className="p-2 text-center">{pct(s.box4)}</td>
                          <td className="p-2 text-center">{pct(s.box4s)}</td>
                          <td className="p-2 text-right">{Number(s.game || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInfoOpen(false)}>
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
