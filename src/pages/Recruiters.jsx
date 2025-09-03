// Recruiters.jsx — Proago CRM (v2025-08-29f)
// Changes:
// • Scores oldest → left, newest → right
// • Box 2/Box 4 labels cleaned (no % signs)
// • Info dialog top row: Picture, Name, Crewcode, Rank, Mobile, Email, Source
// • Monthly pay added
// • Upload photo on left
// • Include inactive toggle styled
// • All-time Shifts table from history, newest first
// • Adaptive column widths

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { rankAcr, rankOrderVal, last5ScoresFor, boxPercentsLast8w, titleCase, toMoney } from "../util";

export default function Recruiters({ recruiters, setRecruiters, history }) {
  const [selected, setSelected] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(true);

  const openInfo = (rec) => { setSelected(rec); setInfoOpen(true); };

  const scoresMap = useMemo(() => {
    const m = new Map();
    recruiters.forEach(r => m.set(r.id, last5ScoresFor(history, r.id)));
    return m;
  }, [recruiters, history]);

  const avg = (arr) => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : 0;

  const sorted = useMemo(() => {
    const arr = recruiters
      .filter(r => includeInactive ? true : !r.isInactive)
      .map(r => {
        const form = scoresMap.get(r.id) || [];
        const acr = rankAcr(r.role);
        const box = boxPercentsLast8w(history, r.id);
        return {
          ...r,
          _rankAcr: acr,
          _rankOrder: rankOrderVal(acr),
          _avg: avg(form),
          _b2pct: box.b2 || 0,
          _b4pct: box.b4 || 0,
          _form: form.slice().reverse(), // oldest left, newest right
        };
      })
      .sort((a,b) => {
        if (b._rankOrder !== a._rankOrder) return b._rankOrder - a._rankOrder;
        if (b._avg !== a._avg) return b._avg - a._avg;
        if (b._b2pct !== a._b2pct) return b._b2pct - a._b2pct;
        return b._b4pct - a._b4pct;
      });
    return arr;
  }, [recruiters, includeInactive, scoresMap, history]);

  const InfoDialog = ({ rec }) => {
    if (!rec) return null;
    const rows = history
      .filter(h => h.recruiterId === rec.id)
      .sort((a,b)=> (a.dateISO < b.dateISO ? 1 : -1));

    const monthlyPay = rows.reduce((s,r)=> s + (Number(r.hours||0) * 15),0); // approx, uses flat 15/h unless you want rates

    return (
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="w-[95vw] max-w-[1200px] h-[85vh] p-4">
          <DialogHeader><DialogTitle>Info — {titleCase(rec.name)}</DialogTitle></DialogHeader>

          {/* Top info row */}
          <div className="flex flex-wrap items-center gap-4 border rounded-lg p-3 mb-3">
            <div className="flex items-center gap-3">
              {rec.photo && <img src={rec.photo} alt="profile" className="h-12 w-12 rounded object-cover" />}
              <label className="text-sm border px-2 py-1 rounded-md bg-zinc-50 cursor-pointer">
                Upload Photo
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setRecruiters(rs => rs.map(r => r.id === rec.id ? ({ ...r, photo: reader.result }) : r));
                    };
                    reader.readAsDataURL(file);
                  }} />
              </label>
            </div>
            <div><b>Name:</b> {titleCase(rec.name)}</div>
            <div><b>Crewcode:</b> {rec.crewCode || "—"}</div>
            <div><b>Rank:</b> {rankAcr(rec.role)}</div>
            <div><b>Mobile:</b> {rec.phone || "—"}</div>
            <div><b>Email:</b> {rec.email || "—"}</div>
            <div><b>Source:</b> {rec.source || "—"}</div>
            <div><b>Monthly Pay:</b> €{toMoney(monthlyPay)}</div>
          </div>

          {/* All-time shifts */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-zinc-50 font-medium">All-time Shifts</div>
            <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
              <table className="min-w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: "16%" }} /> {/* Date */}
                  <col style={{ width: "18%" }} /> {/* Zone */}
                  <col style={{ width: "14%" }} /> {/* Project */}
                  <col style={{ width: "10%" }} /> {/* Hours */}
                  <col style={{ width: "10%" }} /> {/* Mult */}
                  <col style={{ width: "8%" }} />  {/* Score */}
                  <col style={{ width: "8%" }} />  {/* Box 2 */}
                  <col style={{ width: "8%" }} />  {/* Box 2* */}
                  <col style={{ width: "8%" }} />  {/* Box 4 */}
                  <col style={{ width: "8%" }} />  {/* Box 4* */}
                </colgroup>
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Zone</th>
                    <th className="p-2 text-left">Project</th>
                    <th className="p-2 text-right">Hours</th>
                    <th className="p-2 text-right">Mult</th>
                    <th className="p-2 text-right">Score</th>
                    <th className="p-2 text-right">Box 2</th>
                    <th className="p-2 text-right">Box 2*</th>
                    <th className="p-2 text-right">Box 4</th>
                    <th className="p-2 text-right">Box 4*</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.dateISO}_${i}`} className="border-t">
                      <td className="p-2">{r.dateISO}</td>
                      <td className="p-2">{r.location || "—"}</td>
                      <td className="p-2">{r.project || "Hello Fresh"}</td>
                      <td className="p-2 text-right">{r.hours ?? ""}</td>
                      <td className="p-2 text-right">{r.commissionMult ?? ""}</td>
                      <td className="p-2 text-right">{r.score ?? ""}</td>
                      <td className="p-2 text-right">{r.box2_noDisc ?? ""}</td>
                      <td className="p-2 text-right">{r.box2_disc ?? ""}</td>
                      <td className="p-2 text-right">{r.box4_noDisc ?? ""}</td>
                      <td className="p-2 text-right">{r.box4_disc ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recruiters</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm">Include Inactive</span>
            <Button
              size="sm"
              style={{
                background: includeInactive ? "#d9010b" : "white",
                color: includeInactive ? "white" : "black",
                border: "1px solid #d1d5db"
              }}
              onClick={() => setIncludeInactive(!includeInactive)}
            >
              {includeInactive ? "On" : "Off"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm table-fixed">
              <colgroup>
                <col style={{ width: "26%" }} /> {/* Name */}
                <col style={{ width: "12%" }} /> {/* Rank */}
                <col style={{ width: "16%" }} /> {/* Form */}
                <col style={{ width: "12%" }} /> {/* Average */}
                <col style={{ width: "16%" }} /> {/* Box 2 */}
                <col style={{ width: "16%" }} /> {/* Box 4 */}
                <col style={{ width: "12%" }} /> {/* Actions */}
              </colgroup>
              <thead className="bg-zinc-50">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-center">Rank</th>
                  <th className="p-3 text-center">Form</th>
                  <th className="p-3 text-center">Average</th>
                  <th className="p-3 text-center">Box 2</th>
                  <th className="p-3 text-center">Box 4</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium text-left">{titleCase(r.name)}</td>
                    <td className="p-3 text-center">{r._rankAcr}</td>
                    <td className="p-3 text-center">{(r._form || []).join(" - ")}</td>
                    <td className="p-3 text-center">{r._avg.toFixed(1)}</td>
                    <td className="p-3 text-center">{r._b2pct.toFixed(1)}%</td>
                    <td className="p-3 text-center">{r._b4pct.toFixed(1)}%</td>
                    <td className="p-3 flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => openInfo(r)}>Info</Button>
                      <Button
                        size="sm"
                        style={{ background: r.isInactive ? "#10b981" : "black", color: "white" }}
                        onClick={() => setRecruiters(rs => rs.map(x => x.id===r.id ? ({...x, isInactive: !x.isInactive}) : x))}
                      >
                        {r.isInactive ? "Activate" : "Deactivate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <InfoDialog rec={selected} />
    </div>
  );
}
