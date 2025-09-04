// src/pages/Recruiters.jsx — Proago CRM
// v2025-09-04 (stabilized)
// - Safe fallbacks for util helpers (prevents tab from failing to load)
// - Roles fixed to: RK, PR, PC, TC, SM, BM
// - Crewcode column (table only; NOT in History table)
// - Form shows last 5 worked-day scores as "1-2-3-4-5" (no decimals), newest first, max 5
// - Average 2 decimals; Box 2/4 thresholds (≥70 / ≥40) color coding
// - Top filter buttons (Active / Inactive) large, black/white like Add/Import
// - Per-row Status button black bg + white text
// - Info button with black border
// - History modal very wide; newest first; Zones stacked; shows Crewcode in quick facts

import React, { useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Info, UserPlus, UserX } from "lucide-react";
import * as U from "../util.js";

// --- Safe util access (fallbacks so the tab never crashes) ---
const addAuditLog = U.addAuditLog || (() => {});
const titleCase = U.titleCase || ((s) => String(s || "").replace(/\s+/g, " ").trim());
const rankOrderVal =
  U.rankOrderVal ||
  ((role) => {
    const order = { RK: 1, PR: 2, PC: 3, TC: 4, SM: 5, BM: 6 };
    return order[String(role || "").toUpperCase()] ?? 999;
  });
const rankAcr = U.rankAcr || ((r) => (r ? String(r).toUpperCase() : "—"));

// If these don't exist, return safe defaults:
const last5ScoresFor =
  U.last5ScoresFor ||
  ((_history, _recId) => []); // we won't crash if util doesn't provide it
const boxPercentsLast8w =
  U.boxPercentsLast8w ||
  ((_history, _recId) => ({ b2: 0, b4: 0 }));

// Column widths (sum = 100)
const COLS = [
  { w: "22%" }, // Name
  { w: "10%" }, // Crewcode
  { w: "12%" }, // Role
  { w: "16%" }, // Form (last 5 inline)
  { w: "10%" }, // Average
  { w: "10%" }, // Box 2
  { w: "10%" }, // Box 4
  { w: "5%"  }, // Info
  { w: "5%"  }, // Status toggle
];

// Exact role list
const ROLES = ["RK", "PR", "PC", "TC", "SM", "BM"];

// Coloring like Planning
const scoreColor = (n) => {
  const s = Number(n) || 0;
  if (s >= 3) return "bg-green-100 text-green-800 border-green-300";
  if (s >= 2) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-red-100 text-red-800 border-red-300";
};
const pctClass = (p, threshold) => (Number(p) >= threshold ? "text-green-700" : "text-red-700");

const Pill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center border rounded-full px-2 py-[2px] text-xs font-medium ${className}`}>{children}</span>
);
const ScoreBadge = ({ v }) => <Pill className={scoreColor(v)}>{Number(v || 0).toFixed(2)}</Pill>;

export default function Recruiters({ recruiters, setRecruiters, history, setHistory }) {
  // Filters: default Active
  const [filter, setFilter] = useState("active"); // "active" | "inactive"

  const avatarFileRef = useRef(null);

  // Derived rows with filter + stable sort
  const rows = useMemo(() => {
    const base = Array.isArray(recruiters) ? recruiters.slice() : [];
    const filtered =
      filter === "active" ? base.filter((r) => !r.isInactive) :
      filter === "inactive" ? base.filter((r) => r.isInactive) : base;
    return filtered.sort((a, b) => {
      const ra = rankOrderVal(a.role), rb = rankOrderVal(b.role);
      if (ra !== rb) return ra - rb;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [recruiters, filter]);

  // ---------- Mutators ----------
  const toggleStatus = (rec) => {
    setRecruiters((rs) =>
      rs.map((r) => (r.id === rec.id ? { ...r, isInactive: !r.isInactive } : r))
    );
    addAuditLog({
      area: "Recruiters",
      action: "Toggle Status",
      recruiter: { id: rec.id, name: rec.name },
      to: (!rec.isInactive ? "Inactive" : "Active"),
    });
  };

  const rename = (id, newName) => {
    const nm = titleCase(newName || "");
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, name: nm } : r)));
    addAuditLog({ area: "Recruiters", action: "Rename", recruiter: { id, name: nm } });
  };

  const setCrewcode = (id, code) => {
    const val = String(code || "").replace(/\D/g, "").slice(0, 5); // 5 digits
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, crewCode: val } : r)));
    addAuditLog({ area: "Recruiters", action: "Edit Crewcode", recruiter: { id }, crewCode: val });
  };

  const setRole = (id, role) => {
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, role } : r)));
    addAuditLog({ area: "Recruiters", action: "Change Role", recruiter: { id }, role });
  };

  const setAvatar = async (id, file, setSel) => {
    if (!file) return;
    const dataUrl = await toDataURL(file);
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, avatar: dataUrl } : r)));
    if (setSel) setSel((s) => (s && s.id === id ? { ...s, avatar: dataUrl } : s)); // live reflect
    addAuditLog({ area: "Recruiters", action: "Set Avatar", recruiter: { id } });
  };

  const removeAvatar = (id, setSel) => {
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, avatar: "" } : r)));
    if (setSel) setSel((s) => (s && s.id === id ? { ...s, avatar: "" } : s)); // live reflect
    addAuditLog({ area: "Recruiters", action: "Remove Avatar", recruiter: { id } });
  };

  // utilities
  function formInlineLast5(recId) {
    // newest → older; limit 5; NO decimals; "1-2-3-4-5"
    const arr = last5ScoresFor(history, recId) || [];
    return arr.slice(0, 5).map((v) => String(Math.round(Number(v || 0))));
  }
  function avg2(recId) {
    const arr = last5ScoresFor(history, recId) || [];
    if (!arr.length) return "0.00";
    const use = arr.slice(0, 5);
    const n = use.reduce((a, b) => a + (Number(b) || 0), 0) / use.length;
    return n.toFixed(2);
  }
  function boxesOverall(recId) {
    return boxPercentsLast8w(history, recId) || { b2: 0, b4: 0 };
  }

  return (
    <div className="grid gap-4">
      {/* Header filter: Active / Inactive (large, black/white like Add/Import) */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setFilter("active")}
            className="h-10 px-5"
            style={{ background: "black", color: "white", opacity: filter === "active" ? 1 : 0.6 }}
          >
            Active
          </Button>
          <Button
            onClick={() => setFilter("inactive")}
            className="h-10 px-5"
            style={{ background: "black", color: "white", opacity: filter === "inactive" ? 1 : 0.6 }}
          >
            Inactive
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
                  <th className="p-3 text-center">Crewcode</th>
                  <th className="p-3 text-center">Role</th>
                  <th className="p-3 text-left">Form</th>
                  <th className="p-3 text-center">Average</th>
                  <th className="p-3 text-center">Box 2</th>
                  <th className="p-3 text-center">Box 4</th>
                  <th className="p-3 text-center">Info</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const formStr = formInlineLast5(r.id);       // ["3","4","2","5","3"]
                  const A = avg2(r.id);
                  const { b2, b4 } = boxesOverall(r.id);

                  return (
                    <tr key={r.id} className="border-t">
                      {/* Name editable */}
                      <td className="p-3">
                        <Input value={r.name || ""} onChange={(e) => rename(r.id, e.target.value)} />
                      </td>

                      {/* Crewcode editable (center, 5 digits) */}
                      <td className="p-3 text-center">
                        <div className="mx-auto" style={{ maxWidth: 96 }}>
                          <Input
                            className="text-center"
                            value={r.crewCode || ""}
                            onChange={(e) => setCrewcode(r.id, e.target.value)}
                          />
                        </div>
                      </td>

                      {/* Role dropdown (exact list) */}
                      <td className="p-3 text-center">
                        <div className="mx-auto" style={{ maxWidth: 160 }}>
                          <select
                            className="h-10 w-full border rounded-md text-center"
                            value={r.role || ROLES[0]}
                            onChange={(e) => setRole(r.id, e.target.value)}
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Form last 5 inline (no decimals) */}
                      <td className="p-3">
                        {formStr.length ? (
                          <span className="whitespace-nowrap">{formStr.join("-")}</span>
                        ) : (
                          <span className="text-zinc-400">No data</span>
                        )}
                      </td>

                      {/* Average 2 dec */}
                      <td className="p-3 text-center">
                        <Pill className={scoreColor(A)}>{A}</Pill>
                      </td>

                      {/* Box 2 (≥70 green) */}
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${pctClass(b2, 70)}`}>{b2}%</span>
                      </td>

                      {/* Box 4 (≥40 green) */}
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${pctClass(b4, 40)}`}>{b4}%</span>
                      </td>

                      {/* Info (black border) */}
                      <td className="p-3 text-center">
                        <Button
                          onClick={() => openModal(r)}
                          className="h-9 px-3"
                          style={{ background: "white", color: "black", border: "1px solid #000" }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </td>

                      {/* Status toggle: black bg + white text */}
                      <td className="p-3 text-center">
                        <Button
                          onClick={() => toggleStatus(r)}
                          className="h-9 px-3"
                          style={{ background: "black", color: "white" }}
                        >
                          {r.isInactive ? "Inactive" : "Active"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {/* Ghost row to keep header widths when list is empty */}
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

      {/* ---------- History Modal (very wide) ---------- */}
      <HistoryModal
        open={openInfo}
        setOpen={setOpenInfo}
        selIdRef={avatarFileRef}
        sel={sel}
        setSel={setSel}
        rename={rename}
        setAvatar={setAvatar}
        removeAvatar={removeAvatar}
        history={history}
      />
    </div>
  );

  // Local modal handlers
  function openModal(rec) { setSel(rec); setOpenInfo(true); }
}

// ---------- History Modal (separate component; safer diff) ----------
function HistoryModal({ open, setOpen, sel, setSel, selIdRef, rename, setAvatar, removeAvatar, history }) {
  if (!sel) return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] max-w-[1600px]" />
    </Dialog>
  );

  const { b2, b4 } = boxPercentsLast8w(history, sel.id) || { b2: 0, b4: 0 };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] max-w-[1600px]">
        <DialogHeader>
          <DialogTitle className="text-center">History</DialogTitle>
        </DialogHeader>

        {/* Avatar + Rename + Quick facts (shows Crewcode) */}
        <div className="grid md:grid-cols-[220px_1fr] gap-6 items-start">
          {/* Avatar */}
          <div className="grid gap-3 place-items-center">
            <div className="h-36 w-36 rounded-full bg-zinc-200 overflow-hidden grid place-items-center">
              {sel.avatar ? (
                <img src={sel.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-zinc-500 text-sm">No photo</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={selIdRef}
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setAvatar(sel.id, f, setSel);
                  e.target.value = "";
                }}
              />
              <Button size="sm" variant="outline" onClick={() => selIdRef.current?.click()}>
                <UserPlus className="h-4 w-4 mr-1" /> Add
              </Button>
              <Button size="sm" style={{ background: "black", color: "white" }} onClick={() => removeAvatar(sel.id, setSel)}>
                <UserX className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          </div>

          {/* Rename + quick facts */}
          <div className="grid gap-4">
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

            <div className="flex flex-wrap gap-6 items-center">
              <div>
                <div className="text-xs text-zinc-500">Role</div>
                <Pill className="bg-zinc-100 border-zinc-300 text-zinc-800">{rankAcr(sel.role)}</Pill>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Average</div>
                <Pill className={scoreColor(avgFromHistory(history, sel.id))}>{avgFromHistory(history, sel.id)}</Pill>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Crewcode</div>
                <Pill className="bg-zinc-100 border-zinc-300 text-zinc-800">{sel.crewCode || "—"}</Pill>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Box 2</div>
                <div className={`font-semibold ${pctClass(b2, 70)}`}>{b2}%</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Box 4</div>
                <div className={`font-semibold ${pctClass(b4, 40)}`}>{b4}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* History table */}
        <div className="mt-4 border rounded-lg overflow-hidden">
          <div className="px-3 py-2 font-medium bg-zinc-50">History</div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr className="border-b">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Zone</th>
                  <th className="p-2 text-center">Score</th>
                  <th className="p-2 text-center">Box 2</th>
                  <th className="p-2 text-center">Box 2*</th>
                  <th className="p-2 text-center">Box 4</th>
                  <th className="p-2 text-center">Box 4*</th>
                  <th className="p-2 text-center">Sales Game</th>
                </tr>
              </thead>
              <tbody>
                {renderHistoryRows(history, sel.id)}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="justify-center">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- local helpers ----------
function toDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function fmtDate(d) {
  const dt = new Date(d || Date.now());
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function readNum(o, keys, def = 0) {
  for (const k of keys) {
    if (o?.[k] !== undefined && o?.[k] !== null && o?.[k] !== "") return Number(o[k]) || 0;
  }
  return def;
}
function readZone(o) {
  return o.zone ?? o.zone1 ?? o.z1 ?? o.Zone ?? o.Zone1 ?? o.Z1 ?? "";
}

function normalizeHistoryForRecruiter(history, recId) {
  const out = [];
  if (!Array.isArray(history)) return out;
  for (const entry of history) {
    // grouped by team
    if (entry?.team && Array.isArray(entry.team)) {
      for (const t of entry.team) {
        const rid = t.recruiterId ?? t.rid ?? t.id;
        if (rid !== recId) continue;
        out.push({
          at: entry.date || t.at || Date.now(),
          zone: readZone(t),
          zone2: t.zone2 || t.z2,
          zone3: t.zone3 || t.z3,
          score: readNum(t, ["score", "total", "SCORE"]),
          b2: readNum(t, ["box2", "b2", "B2"]),
          b2s: readNum(t, ["box2s", "b2s", "B2S", "box2_star", "b2_star"]),
          b4: readNum(t, ["box4", "b4", "B4"]),
          b4s: readNum(t, ["box4s", "b4s", "B4S", "box4_star", "b4_star"]),
          game: readNum(t, ["game", "GAME", "sales", "SalesGame"]),
        });
      }
    } else {
      const rid = entry?.recruiterId ?? entry?.rid ?? entry?.id;
      if (rid !== recId) continue;
      out.push({
        at: entry.date || entry.at || Date.now(),
        zone: readZone(entry),
        zone2: entry.zone2 || entry.z2,
        zone3: entry.zone3 || entry.z3,
        score: readNum(entry, ["score", "total", "SCORE"]),
        b2: readNum(entry, ["box2", "b2", "B2"]),
        b2s: readNum(entry, ["box2s", "b2s", "B2S", "box2_star", "b2_star"]),
        b4: readNum(entry, ["box4", "b4", "B4"]),
        b4s: readNum(entry, ["box4s", "b4s", "B4S", "box4_star", "b4_star"]),
        game: readNum(entry, ["game", "GAME", "sales", "SalesGame"]),
      });
    }
  }
  // newest first
  out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return out;
}

function renderHistoryRows(history, recId) {
  const rows = normalizeHistoryForRecruiter(history, recId);
  if (!rows.length) {
    return (
      <tr className="border-t">
        <td className="p-2 text-zinc-400" colSpan={8}>No history</td>
      </tr>
    );
  }
  return rows.map((e, i) => (
    <tr key={i} className="border-t">
      <td className="p-2">{fmtDate(e.at)}</td>
      <td className="p-2">
        {/* Zones stacked vertically */}
        <div className="flex flex-col text-xs">
          {e.zone && <span>Zone {e.zone}</span>}
          {e.zone2 && <span>Zone {e.zone2}</span>}
          {e.zone3 && <span>Zone {e.zone3}</span>}
        </div>
      </td>
      <td className="p-2 text-center"><ScoreBadge v={e.score} /></td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b2, 70)}`}>{Number(e.b2 || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b2s, 70)}`}>{Number(e.b2s || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b4, 40)}`}>{Number(e.b4 || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b4s, 40)}`}>{Number(e.b4s || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center">{Number(e.game || 0).toFixed(2)}</td>
    </tr>
  ));
}

function avgFromHistory(history, recId) {
  const arr = last5ScoresFor(history, recId) || [];
  if (!arr.length) return "0.00";
  const use = arr.slice(0, 5);
  const n = use.reduce((a, b) => a + (Number(b) || 0), 0) / use.length;
  return n.toFixed(2);
}
