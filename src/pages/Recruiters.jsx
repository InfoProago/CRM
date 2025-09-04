// src/pages/Recruiters.jsx — Proago CRM
// 2025-09-04 • Robust Planning link + proper Box rules + UI tweaks

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Info } from "lucide-react";
import * as U from "../util.js";

const { load, K, titleCase } = U;

// ---------- utilities ----------
const ROLES = ["RK", "PR", "PC", "TC", "SM", "BM"];
const dmy = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso || ""; }
};
const avg2 = (arr) => (arr?.length ? (arr.reduce((a,b)=>a+Number(b||0),0)/arr.length).toFixed(2) : "0.00");
const pct = (n) => `${Number(n||0)}%`;

const norm = (s) => String(s||"").toLowerCase().trim().replace(/\s+/g," ");
const tokens = (s) => norm(s).split(" ").filter(Boolean);
const nameSimilar = (a,b) => {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  if (ta.join(" ") === tb.join(" ")) return true;
  // allow containment of token sets (handles "Ronaldo" vs "Ronaldo Aveiro")
  const setA = new Set(ta);
  const setB = new Set(tb);
  const hitA = ta.filter(t=>setB.has(t)).length;
  const hitB = tb.filter(t=>setA.has(t)).length;
  return hitA >= Math.min(ta.length, 2) || hitB >= Math.min(tb.length, 2);
};

// unify one day object into rows
function normalizeDay(dayRaw) {
  const date = dayRaw?.date || dayRaw?.day || dayRaw?.id || "";
  const teams = dayRaw?.teams || dayRaw?.zones || [];
  const out = [];
  for (const t of teams) {
    const zone = (t?.zone && (t.zone.name || t.zone.label || t.zone)) || t?.label || t?.name || t?.zone || "";
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

function readPlanningCandidates() {
  const arrs = [];
  const pushIfArr = (x) => { if (Array.isArray(x) && x.length) arrs.push(x); };

  pushIfArr(load(K.planning));
  pushIfArr(load(K.planningDays));
  pushIfArr(load("planning"));
  pushIfArr(load("Planning"));

  // optional globals if Planning exposes them
  pushIfArr(window?.__ProagoPlanning);
  pushIfArr(window?.__ProagoPlanningDays);

  // scan localStorage heuristically
  try {
    for (let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i);
      if (!key) continue;
      if (/theme|token|auth|font/i.test(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const js = JSON.parse(raw);
        if (Array.isArray(js) && js.length && (js[0]?.date || js[0]?.teams || js[0]?.zones)) pushIfArr(js);
      } catch {}
    }
  } catch {}
  return arrs;
}

function readAllShifts() {
  const cands = readPlanningCandidates();
  let best = [];
  for (const c of cands) if ((c?.length||0) > (best?.length||0)) best = c;
  const rows = [];
  for (const day of best) rows.push(...normalizeDay(day));
  rows.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))); // newest first
  return rows;
}

function shiftsForRecruiter(rows, rec) {
  const nm = rec?.name || "";
  const cc = String(rec?.crewCode || rec?.crewcode || "").trim();
  return rows.filter((s)=>{
    if (cc && s.crewCode) return String(s.crewCode).trim() === cc;
    return nameSimilar(s.name, nm);
  });
}

function last5Form(rows, rec) {
  return shiftsForRecruiter(rows, rec).slice(0,5).map(s=>Math.round(Number(s.score||0)));
}

// ---------- component ----------
export default function Recruiters({ recruiters = [], setRecruiters }) {
  const [showInactive, setShowInactive] = useState(false);
  const [planRows, setPlanRows] = useState(() => readAllShifts());

  // strong auto-refresh
  useEffect(() => {
    const refresh = () => setPlanRows(readAllShifts());
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const id = setInterval(refresh, 1000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(id);
    };
  }, []);

  const list = useMemo(() => (showInactive ? recruiters.filter(r=>r.active===false) : recruiters.filter(r=>r.active!==false)), [recruiters, showInactive]);

  const updateRec = (id, patch) => setRecruiters((prev)=>prev.map(r=>r.id===id ? {...r, ...patch} : r));

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoRec, setInfoRec] = useState(null);
  const openHistory = (r) => { setInfoRec(r); setInfoOpen(true); };

  return (
    <div className="grid gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="button" onClick={()=>setPlanRows(readAllShifts())} style={{background:"black",color:"white"}}>Refresh</Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={()=>setShowInactive(false)} style={{background:"black",color:"white"}}>Active</Button>
          <Button type="button" variant="outline" onClick={()=>setShowInactive(true)} style={{background:showInactive?"black":"white",color:showInactive?"white":"black"}}>Inactive</Button>
        </div>
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
                <col style={{width:"22%"}} /> {/* Name */}
                <col style={{width:"12%"}} /> {/* Crewcode */}
                <col style={{width:"10%"}} /> {/* Role */}
                <col style={{width:"18%"}} /> {/* Form */}
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
                {list.map((r) => {
                  const shifts = shiftsForRecruiter(planRows, r);
                  const form = last5Form(planRows, r);
                  const avg = avg2(shifts.map(s=>Number(s.score||0)));
                  const last = shifts[0] || {};
                  const score = Number(last.score||0);
                  const b2T = Number(last.box2||0) + Number(last.box2s||0);
                  const b4T = Number(last.box4||0) + Number(last.box4s||0);

                  const badB2 = b2T > score;
                  const badB4 = b4T > b2T; // <-- correct rule

                  const b2Class = badB2 ? "text-red-500" : (b2T>=70 ? "text-green-600" : "text-red-500");
                  const b4Class = badB4 ? "text-red-500" : (b4T>=40 ? "text-green-600" : "text-red-500");

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
                      {/* Box 2 (total) */}
                      <td className="p-3 text-center"><span className={b2Class}>{pct(b2T)}</span></td>
                      {/* Box 4 (total) */}
                      <td className="p-3 text-center"><span className={b4Class}>{pct(b4T)}</span></td>
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
              {/* ID row */}
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
                    {shiftsForRecruiter(planRows, infoRec).map((s,i)=>{
                      const score = Number(s.score||0);
                      const b2T = Number(s.box2||0)+Number(s.box2s||0);
                      const b4T = Number(s.box4||0)+Number(s.box4s||0);
                      const badB2 = b2T>score;
                      const badB4 = b4T>b2T;

                      const b2Class = badB2 ? "text-red-500" : (b2T>=70 ? "text-green-600" : "text-red-500");
                      const b4Class = badB4 ? "text-red-500" : (b4T>=40 ? "text-green-600" : "text-red-500");

                      return (
                        <tr key={`${s.date}-${s.zone}-${i}`} className="border-t">
                          <td className="p-2">{dmy(s.date)}</td>
                          <td className="p-2">{s.zone}</td>
                          <td className="p-2 text-center">
                            <span className={
                              score>=4 ? "inline-block rounded-full bg-green-100 px-2 py-1" :
                              score>=3 ? "inline-block rounded-full bg-yellow-100 px-2 py-1" :
                              "inline-block rounded-full bg-red-100 px-2 py-1"
                            }>
                              {score.toFixed(2)}
                            </span>
                          </td>
                          <td className={`p-2 text-center ${b2Class}`}>{pct(s.box2)}</td>
                          <td className={`p-2 text-center ${b2Class}`}>{pct(s.box2s)}</td>
                          <td className={`p-2 text-center ${b4Class}`}>{pct(s.box4)}</td>
                          <td className={`p-2 text-center ${b4Class}`}>{pct(s.box4s)}</td>
                          <td className="p-2 text-right">{Number(s.game||0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
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
