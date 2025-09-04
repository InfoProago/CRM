// src/pages/Recruiters.jsx — Proago CRM
// v2025-09-04 • Robust Planning linkage (auto-discovery), live refresh, correct Form & History

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Info } from "lucide-react";
import * as U from "../util.js";

const { load, save, K, titleCase } = U;

// ----------------- helpers -----------------

const ROLES = ["RK", "PR", "PC", "TC", "SM", "BM"];

const dmy = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-GB"); }
  catch { return iso || ""; }
};
const avg2 = (arr) => (arr?.length ? (arr.reduce((a,b)=>a+Number(b||0),0)/arr.length).toFixed(2) : "0.00");
const pct = (n) => `${Number(n||0)}%`;
const colorPct = (p, min) => (Number(p)>=min ? "text-green-600" : "text-red-500");

// unify one day object into common shape
function normalizeDay(dayRaw) {
  const date = dayRaw?.date || dayRaw?.day || dayRaw?.id || "";
  const teams = dayRaw?.teams || dayRaw?.zones || [];
  const out = [];
  for (const t of teams) {
    const zone =
      (t?.zone && (t.zone.name || t.zone.label || t.zone)) ||
      t?.label || t?.name || t?.zone || "";
    const list = t?.recruiters || t?.members || t?.staff || [];
    for (const r of list) {
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

// try to read planning from many places
function readPlanningDaysFlexible() {
  // 1) Official keys we expect
  const candidates = [];
  const a = load(K.planning);         if (Array.isArray(a)) candidates.push(a);
  const b = load(K.planningDays);     if (Array.isArray(b)) candidates.push(b);
  const c = load("planning");         if (Array.isArray(c)) candidates.push(c);
  const d = load("Planning");         if (Array.isArray(d)) candidates.push(d);

  // 2) Globals optionally exposed by Planning.jsx
  if (Array.isArray(window?.__ProagoPlanning))      candidates.push(window.__ProagoPlanning);
  if (Array.isArray(window?.__ProagoPlanningDays))  candidates.push(window.__ProagoPlanningDays);

  // 3) Heuristic scan of localStorage (last resort, tolerant)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // skip obvious non-json
      if (/theme|token|auth|font/i.test(k)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length && (parsed[0]?.date || parsed[0]?.teams || parsed[0]?.zones)) {
          candidates.push(parsed);
        }
      } catch { /* ignore */ }
    }
  } catch { /* SSR / sandbox */ }

  // choose the most recent-looking array (by date field)
  let best = [];
  for (const list of candidates) {
    const score =
      Array.isArray(list) && list.length
        ? (list[0]?.date || list[0]?.day || list[0]?.id || "")
        : "";
    if ((list?.length || 0) > (best?.length || 0)) best = list;
    if (String(score).length >= 8 && (list?.length || 0) >= (best?.length || 0)) best = list;
  }
  return Array.isArray(best) ? best : [];
}

function readAllShifts() {
  const days = readPlanningDaysFlexible();
  const rows = [];
  for (const day of days) rows.push(...normalizeDay(day));
  // newest first by ISO date
  rows.sort((a,b) => String(b.date||"").localeCompare(String(a.date||"")));
  return rows;
}

function shiftsForRecruiter(rows, rec) {
  const nm = (rec?.name || "").trim().toLowerCase();
  const cc = String(rec?.crewCode || rec?.crewcode || "").trim();
  return rows.filter((s) => {
    const nameMatch = (s.name || "").trim().toLowerCase() === nm;
    if (!cc) return nameMatch;
    // when both have crewcode, require both match; else fallback to name
    return s.crewCode ? (nameMatch && String(s.crewCode).trim() === cc) : nameMatch;
  });
}

function last5Ints(rows, rec) {
  return shiftsForRecruiter(rows, rec).slice(0,5).map((s)=>Math.round(Number(s.score||0)));
}

// ----------------- main -----------------

export default function Recruiters({ recruiters = [], setRecruiters }) {
  const [showInactive, setShowInactive] = useState(false);

  // live planning cache + refresh when planning changes in another tab
  const [planRows, setPlanRows] = useState(() => readAllShifts());
  useEffect(() => {
    const refresh = () => setPlanRows(readAllShifts());
    window.addEventListener("storage", refresh);
    // lightweight polling to catch same-tab edits if Planning saves without storage event
    const id = setInterval(refresh, 1500);
    return () => { window.removeEventListener("storage", refresh); clearInterval(id); };
  }, []);

  const viewed = (showInactive ? recruiters.filter(r=>r.active===false) : recruiters.filter(r=>r.active!==false));

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoRec, setInfoRec] = useState(null);

  const openHistory = (r) => { setInfoRec(r); setInfoOpen(true); };

  const updateRec = (id, patch) => {
    setRecruiters((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  return (
    <div className="grid gap-4">
      {/* Header filter buttons like Inflow */}
      <div className="flex justify-end gap-2">
        <Button type="button" onClick={()=>setShowInactive(false)} style={{background:"black",color:"white"}}>Active</Button>
        <Button type="button" variant="outline" onClick={()=>setShowInactive(true)} style={{background:showInactive?"black":"white",color:showInactive?"white":"black"}}>Inactive</Button>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recruiters</span>
            <Badge>{viewed.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full table-fixed text-sm">
              <colgroup>
                <col style={{width:"22%"}} /> {/* Name */}
                <col style={{width:"12%"}} /> {/* Crewcode */}
                <col style={{width:"10%"}} /> {/* Role */}
                <col style={{width:"18%"}} /> {/* Form (centered between Role & Average) */}
                <col style={{width:"10%"}} /> {/* Average */}
                <col style={{width:"10%"}} /> {/* Box 2 */}
                <col style={{width:"10%"}} /> {/* Box 4 */}
                <col style={{width:"4%"}} />  {/* Info */}
                <col style={{width:"4%"}} />  {/* Status */}
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
                {viewed.map((r) => {
                  const shifts = shiftsForRecruiter(planRows, r);
                  const form = last5Ints(planRows, r);
                  const avg = avg2(shifts.map(s=>Number(s.score||0)));
                  const last = shifts[0] || {};
                  const b2 = Number(last.box2||0);
                  const b4 = Number(last.box4||0);

                  return (
                    <tr key={r.id} className="border-t">
                      {/* Name */}
                      <td className="p-3">
                        <Input value={r.name||""} onChange={(e)=>updateRec(r.id,{name:titleCase(e.target.value)})}/>
                      </td>
                      {/* Crewcode */}
                      <td className="p-3">
                        <Input inputMode="numeric" value={r.crewCode||r.crewcode||""} onChange={(e)=>updateRec(r.id,{crewCode:e.target.value.replace(/\D/g,"")})}/>
                      </td>
                      {/* Role */}
                      <td className="p-3">
                        <select className="h-10 border rounded-md px-2 w-full" value={r.role||"RK"} onChange={(e)=>updateRec(r.id,{role:e.target.value})}>
                          {ROLES.map((x)=><option key={x} value={x}>{x}</option>)}
                        </select>
                      </td>
                      {/* Form centered */}
                      <td className="p-3 text-center whitespace-nowrap">{form.length?form.join("-"):""}</td>
                      {/* Average */}
                      <td className="p-3 text-center">
                        <span className="inline-block rounded-full bg-green-100 px-2 py-1">{avg}</span>
                      </td>
                      {/* Box 2 */}
                      <td className="p-3 text-center"><span className={colorPct(b2,70)}>{pct(b2)}</span></td>
                      {/* Box 4 */}
                      <td className="p-3 text-center"><span className={colorPct(b4,40)}>{pct(b4)}</span></td>
                      {/* Info */}
                      <td className="p-3 text-center">
                        <Button type="button" variant="outline" className="border-black" onClick={()=>openHistory(r)} title="History">
                          <Info className="h-4 w-4"/>
                        </Button>
                      </td>
                      {/* Status */}
                      <td className="p-3 text-center">
                        {r.active!==false ? (
                          <Button type="button" style={{background:"black",color:"white"}} onClick={()=>updateRec(r.id,{active:false})}>Active</Button>
                        ) : (
                          <Button type="button" variant="outline" onClick={()=>updateRec(r.id,{active:true})}>Inactive</Button>
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

      {/* History modal */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent size="fill" className="p-4">
          <DialogHeader><DialogTitle className="text-center">History</DialogTitle></DialogHeader>

          {infoRec && (
            <div className="grid gap-4">
              {/* identity row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-zinc-500">Name</div>
                  <Input value={infoRec.name||""} readOnly />
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Role</div>
                  <Input value={infoRec.role||""} readOnly />
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Crewcode</div>
                  <Input value={infoRec.crewCode||infoRec.crewcode||""} readOnly />
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
                    {shiftsForRecruiter(planRows, infoRec).map((s,i)=>(
                      <tr key={`${s.date}-${s.zone}-${i}`} className="border-t">
                        <td className="p-2">{dmy(s.date)}</td>
                        <td className="p-2">{s.zone}</td>
                        <td className="p-2 text-center">
                          <span className={
                            Number(s.score)>=4 ? "inline-block rounded-full bg-green-100 px-2 py-1" :
                            Number(s.score)>=3 ? "inline-block rounded-full bg-yellow-100 px-2 py-1" :
                            "inline-block rounded-full bg-red-100 px-2 py-1"
                          }>
                            {Number(s.score||0).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-2 text-center">{pct(s.box2)}</td>
                        <td className="p-2 text-center">{pct(s.box2s)}</td>
                        <td className="p-2 text-center">{pct(s.box4)}</td>
                        <td className="p-2 text-center">{pct(s.box4s)}</td>
                        <td className="p-2 text-right">{Number(s.game||0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={()=>setInfoOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
