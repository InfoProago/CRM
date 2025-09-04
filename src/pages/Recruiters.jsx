// src/pages/Recruiters.jsx — Proago CRM
// v2025-09-04 • Recruiters: Active/All toggle, per-row status, color-coded Form/Box%, 2-dec Avg,
//                Info modal (avatar add/remove, rename, History table w/ Game), pinned Info column, audit logging

import React, { useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Info, UserPlus, UserX } from "lucide-react";
import {
  addAuditLog,
  last5ScoresFor,
  boxPercentsLast8w,
  rankAcr,
  rankOrderVal,
  titleCase,
  clone,
} from "../util"; // uses helpers present in util.js  [oai_citation:0‡util.js](file-service://file-6hbZoqmAMud2t5oUirXjj6)

const COLS = [
  { w: "24%" }, // Name
  { w: "10%" }, // Role
  { w: "20%" }, // Form (last 5)
  { w: "10%" }, // Avg (2 dec)
  { w: "10%" }, // Box 2%
  { w: "10%" }, // Box 4%
  { w: "8%"  }, // Info (pinned)
  { w: "8%"  }, // Status toggle
];

// color helpers (Planning-like)
const scoreColor = (n) => {
  const s = Number(n) || 0;
  if (s >= 3) return "bg-green-100 text-green-800 border-green-300";
  if (s >= 2) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-red-100 text-red-800 border-red-300";
};
const pctClassB2 = (p) => (p >= 70 ? "text-green-700" : "text-red-700");
const pctClassB4 = (p) => (p >= 40 ? "text-green-700" : "text-red-700");

// pill badge
const Pill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center border rounded-full px-2 py-[2px] text-xs font-medium ${className}`}>{children}</span>
);

// History row score badge
const ScoreBadge = ({ v }) => <Pill className={scoreColor(v)}>{Number(v || 0).toFixed(2)}</Pill>;

export default function Recruiters({ recruiters, setRecruiters, history, setHistory }) {
  // Show Active by default (you asked for this)
  const [showAll, setShowAll] = useState(false); // false = Active (default)

  const fileRef = useRef(null);

  // derived rows with filters/sort (keep stable ordering: rank then name)
  const rows = useMemo(() => {
    const base = Array.isArray(recruiters) ? recruiters.slice() : [];
    const filtered = showAll ? base : base.filter((r) => !r.isInactive);
    return filtered.sort((a, b) => {
      const ra = rankOrderVal(a.role), rb = rankOrderVal(b.role);
      if (ra !== rb) return ra - rb;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [recruiters, showAll]);

  // ---------- Mutators ----------
  const toggleStatus = (rec) => {
    setRecruiters((rs) =>
      rs.map((r) => (r.id === rec.id ? { ...r, isInactive: !r.isInactive } : r))
    );
    addAuditLog({ area: "Recruiters", action: "Toggle Status", recruiter: { id: rec.id, name: rec.name }, to: (!rec.isInactive ? "Inactive" : "Active") }); //  [oai_citation:1‡util.js](file-service://file-6hbZoqmAMud2t5oUirXjj6)
  };

  const rename = (id, newName) => {
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, name: titleCase(newName || "") } : r)));
    addAuditLog({ area: "Recruiters", action: "Rename", recruiter: { id, name: titleCase(newName || "") } }); //  [oai_citation:2‡util.js](file-service://file-6hbZoqmAMud2t5oUirXjj6)
  };

  const setAvatar = async (id, file) => {
    if (!file) return;
    const dataUrl = await toDataURL(file);
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, avatar: dataUrl } : r)));
    addAuditLog({ area: "Recruiters", action: "Set Avatar", recruiter: { id } }); //  [oai_citation:3‡util.js](file-service://file-6hbZoqmAMud2t5oUirXjj6)
  };

  const removeAvatar = (id) => {
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, avatar: "" } : r)));
    addAuditLog({ area: "Recruiters", action: "Remove Avatar", recruiter: { id } }); //  [oai_citation:4‡util.js](file-service://file-6hbZoqmAMud2t5oUirXjj6)
  };

  // ---------- Info Modal ----------
  const [openInfo, setOpenInfo] = useState(false);
  const [sel, setSel] = useState(null);

  const openModal = (rec) => { setSel(rec); setOpenInfo(true); };
  const closeModal = () => setOpenInfo(false);

  // utilities
  function last5(recId) {
    return last5ScoresFor(history, recId); // array of numbers newest→oldest  [oai_citation:5‡util.js](file-service://file-6hbZoqmAMud2t5oUirXjj6)
  }
  function avg2(recId) {
    const arr = last5(recId);
    if (!arr.length) return "0.00";
    const n = arr.reduce((a, b) => a + (Number(b) || 0), 0) / arr.length;
    return n.toFixed(2);
  }
  function boxes(recId) {
    return boxPercentsLast8w(history, recId); // { b2, b4 } in %  [oai_citation:6‡util.js](file-service://file-6hbZoqmAMud2t5oUirXjj6)
  }

  return (
    <div className="grid gap-4">
      {/* Header with Active/All toggle (right) */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          {/* Active = white with black text */}
          <Button
            size="sm"
            onClick={() => setShowAll(false)}
            style={showAll ? { background: "white", color: "black", border: "1px solid #e5e7eb" } : { background: "white", color: "black", border: "2px solid black" }}
          >
            Active
          </Button>
          {/* All = black with white text */}
          <Button
            size="sm"
            onClick={() => setShowAll(true)}
            style={showAll ? { background: "black", color: "white" } : { background: "#111", color: "#fff", opacity: 0.75 }}
          >
            All
          </Button>
        </div>
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
            <table className="min-w-full text-sm table-fixed">
              <colgroup>{COLS.map((c, i) => <col key={i} style={{ width: c.w }} />)}</colgroup>
              <thead className="bg-zinc-50">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-center">Role</th>
                  <th className="p-3 text-left">Form</th>
                  <th className="p-3 text-center">Avg</th>
                  <th className="p-3 text-center">Box 2%</th>
                  <th className="p-3 text-center">Box 4%</th>
                  <th className="p-3 text-center">Info</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const last = last5(r.id);
                  const A = avg2(r.id);
                  const { b2, b4 } = boxes(r.id);

                  return (
                    <tr key={r.id} className="border-t">
                      {/* Name (editable inline) */}
                      <td className="p-3">
                        <Input
                          value={r.name || ""}
                          onChange={(e) => rename(r.id, e.target.value)}
                        />
                      </td>

                      {/* Role (readable acronym) */}
                      <td className="p-3 text-center">
                        <Pill className="bg-zinc-100 border-zinc-300 text-zinc-800">{rankAcr(r.role)}</Pill>
                      </td>

                      {/* Form = last 5 scores (colored) */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {last.length ? (
                            last.slice(0, 5).map((v, i) => <ScoreBadge key={i} v={v} />)
                          ) : (
                            <span className="text-zinc-400">No data</span>
                          )}
                        </div>
                      </td>

                      {/* Average 2 decimals with Planning-like color */}
                      <td className="p-3 text-center">
                        <Pill className={scoreColor(A)}>{A}</Pill>
                      </td>

                      {/* Box 2% */}
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${pctClassB2(b2)}`}>{b2}%</span>
                      </td>

                      {/* Box 4% */}
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${pctClassB4(b4)}`}>{b4}%</span>
                      </td>

                      {/* Info button (pinned column) */}
                      <td className="p-3 text-center">
                        <Button size="sm" variant="outline" onClick={() => openModal(r)}>
                          <Info className="h-4 w-4" />
                        </Button>
                      </td>

                      {/* Status Active/Inactive with required styling */}
                      <td className="p-3 text-center">
                        {r.isInactive ? (
                          <Button size="sm" onClick={() => toggleStatus(r)} style={{ background: "black", color: "white" }}>
                            Inactive
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => toggleStatus(r)} style={{ background: "white", color: "black", border: "1px solid #111" }}>
                            Active
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Ghost row keeps header widths even if no recruiters match filter */}
                {rows.length === 0 && (
                  <tr className="border-t opacity-0 select-none pointer-events-none">
                    {COLS.map((_, i) => (
                      <td key={i} className="p-3">
                        <div className="h-10" />
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Info Modal ---------- */}
      <Dialog open={openInfo} onOpenChange={setOpenInfo}>
        <DialogContent className="max-w-[800px] h-auto">
          {sel && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">Info • {sel.name || "Recruiter"}</DialogTitle>
              </DialogHeader>

              {/* Avatar + Rename */}
              <div className="grid md:grid-cols-[160px_1fr] gap-4 items-start">
                {/* Avatar */}
                <div className="grid gap-2 place-items-center">
                  <div className="h-28 w-28 rounded-full bg-zinc-200 overflow-hidden grid place-items-center">
                    {sel.avatar ? (
                      <img src={sel.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-zinc-500 text-sm">No photo</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setAvatar(sel.id, f);
                        e.target.value = "";
                      }}
                    />
                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                      <UserPlus className="h-4 w-4 mr-1" /> Add
                    </Button>
                    <Button size="sm" style={{ background: "black", color: "white" }} onClick={() => removeAvatar(sel.id)}>
                      <UserX className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </div>
                </div>

                {/* Rename + quick facts */}
                <div className="grid gap-3">
                  <div>
                    <div className="text-sm font-medium mb-1">Name</div>
                    <Input
                      value={sel.name || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        rename(sel.id, v);
                        setSel((s) => ({ ...s, name: titleCase(v) }));
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 items-center">
                    <div>
                      <div className="text-xs text-zinc-500">Role</div>
                      <Pill className="bg-zinc-100 border-zinc-300 text-zinc-800">{rankAcr(sel.role)}</Pill>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Avg</div>
                      <Pill className={scoreColor(avg2(sel.id))}>{avg2(sel.id)}</Pill>
                    </div>
                    {(() => {
                      const { b2, b4 } = boxes(sel.id);
                      return (
                        <>
                          <div>
                            <div className="text-xs text-zinc-500">Box 2%</div>
                            <div className={`font-semibold ${pctClassB2(b2)}`}>{b2}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500">Box 4%</div>
                            <div className={`font-semibold ${pctClassB4(b4)}`}>{b4}%</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* History table */}
              <div className="mt-4 border rounded-lg overflow-hidden">
                <div className="px-3 py-2 font-medium bg-zinc-50">History</div>
                <div className="max-h-[320px] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white sticky top-0 z-10">
                      <tr className="border-b">
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Zone</th>
                        <th className="p-2 text-center">Game (EUR)</th>
                        <th className="p-2 text-center">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderHistoryRows(history, sel.id)}
                    </tbody>
                  </table>
                </div>
              </div>

              <DialogFooter className="justify-center">
                <Button variant="outline" onClick={closeModal}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- helpers ----------
function toDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Render History rows: stacked Zone, Game column, color-coded score
function renderHistoryRows(history, recId) {
  const rows = normalizeHistoryForRecruiter(history, recId);
  if (!rows.length) {
    return (
      <tr className="border-t">
        <td className="p-2 text-zinc-400" colSpan={4}>No history</td>
      </tr>
    );
  }
  return rows.map((e, i) => (
    <tr key={i} className="border-t">
      <td className="p-2">{fmtDate(e.at)}</td>
      <td className="p-2">
        {/* stacked vertically */}
        <div className="flex flex-col text-xs">
          {e.zone && <span>Zone {e.zone}</span>}
          {e.zone2 && <span>Zone {e.zone2}</span>}
          {e.zone3 && <span>Zone {e.zone3}</span>}
        </div>
      </td>
      <td className="p-2 text-center">{Number(e.game || 0).toFixed(2)}</td>
      <td className="p-2 text-center"><ScoreBadge v={e.score} /></td>
    </tr>
  ));
}

function fmtDate(d) {
  const dt = new Date(d || Date.now());
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function normalizeHistoryForRecruiter(history, recId) {
  const out = [];
  if (!Array.isArray(history)) return out;
  for (const entry of history) {
    // support both flat and team-grouped entries
    if (entry?.team && Array.isArray(entry.team)) {
      for (const t of entry.team) {
        if ((t.recruiterId || t.rid || t.id) !== recId) continue;
        out.push({
          at: entry.date || t.at || Date.now(),
          zone: t.zone || t.zone1 || t.z1,
          zone2: t.zone2 || t.z2,
          zone3: t.zone3 || t.z3,
          game: t.game || t.GAME || 0,
          score: t.score ?? t.total ?? t.SCORE ?? 0,
        });
      }
    } else if ((entry?.recruiterId || entry?.rid || entry?.id) === recId) {
      out.push({
        at: entry.date || entry.at || Date.now(),
        zone: entry.zone || entry.zone1 || entry.z1,
        zone2: entry.zone2 || entry.z2,
        zone3: entry.zone3 || entry.z3,
        game: entry.game || entry.GAME || 0,
        score: entry.score ?? entry.total ?? entry.SCORE ?? 0,
      });
    }
  }
  // newest first
  out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return out;
}
