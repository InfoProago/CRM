// src/pages/Recruiters.jsx — Proago CRM
// v2025-09-04
// - History modal maxed (wider)
// - Role editable per row (dropdown) + audit log
// - Info button border black
// - Row status "Active" button black with white letters (Inactive too)
// - Top filter buttons (Active/Inactive) enlarged (like Settings/Logout / Add/Import sizing)

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
} from "../util";

// Column widths (sum = 100)
const COLS = [
  { w: "22%" }, // Name
  { w: "10%" }, // Crewcode
  { w: "12%" }, // Role
  { w: "16%" }, // Form (last 5)
  { w: "10%" }, // Average
  { w: "10%" }, // Box 2
  { w: "10%" }, // Box 4
  { w: "5%"  }, // Info
  { w: "5%"  }, // Status toggle
];

// Common roles; any existing custom role will be added dynamically at runtime
const ROLES_BASE = ["Rookie", "Agent", "Senior", "Leader", "Captain", "Manager"];

// Coloring (Planning-like)
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
  // Filters: default "Active"
  const [filter, setFilter] = useState("active"); // "active" | "inactive"

  const avatarFileRef = useRef(null);

  // Ensure dropdown contains any custom roles present
  const allRoles = useMemo(() => {
    const present = new Set(ROLES_BASE);
    (Array.isArray(recruiters) ? recruiters : []).forEach((r) => {
      if (r?.role) present.add(String(r.role));
    });
    return Array.from(present);
  }, [recruiters]);

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
    // allow 5 digits (as discussed in Inflow hire)
    const val = String(code || "").replace(/\D/g, "").slice(0, 5);
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
    // reflect immediately in open modal
    if (setSel) setSel((s) => (s && s.id === id ? { ...s, avatar: dataUrl } : s));
    addAuditLog({ area: "Recruiters", action: "Set Avatar", recruiter: { id } });
  };

  const removeAvatar = (id, setSel) => {
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, avatar: "" } : r)));
    if (setSel) setSel((s) => (s && s.id === id ? { ...s, avatar: "" } : s));
    addAuditLog({ area: "Recruiters", action: "Remove Avatar", recruiter: { id } });
  };

  // ---------- Info/History Modal ----------
  const [openInfo, setOpenInfo] = useState(false);
  const [sel, setSel] = useState(null);

  const openModal = (rec) => { setSel(rec); setOpenInfo(true); };
  const closeModal = () => setOpenInfo(false);

  // utilities
  function last5(recId) {
    return last5ScoresFor(history, recId); // newest→oldest
  }
  function avg2(recId) {
    const arr = last5(recId);
    if (!arr.length) return "0.00";
    const n = arr.reduce((a, b) => a + (Number(b) || 0), 0) / arr.length;
    return n.toFixed(2);
  }
  function boxesOverall(recId) {
    return boxPercentsLast8w(history, recId); // { b2, b4 } in %
  }

  return (
    <div className="grid gap-4">
      {/* Header filter: Active / Inactive (enlarged, black/white like Add/Import) */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setFilter("active")}
            className="h-10 px-5"
            style={{
              background: "black",
              color: "white",
              opacity: filter === "active" ? 1 : 0.6,
            }}
          >
            Active
          </Button>
          <Button
            onClick={() => setFilter("inactive")}
            className="h-10 px-5"
            style={{
              background: "black",
              color: "white",
              opacity: filter === "inactive" ? 1 : 0.6,
            }}
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
                  const last = last5(r.id);
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

                      {/* Role editable (dropdown) */}
                      <td className="p-3 text-center">
                        <div className="mx-auto" style={{ maxWidth: 160 }}>
                          <select
                            className="h-10 w-full border rounded-md text-center"
                            value={r.role || ""}
                            onChange={(e) => setRole(r.id, e.target.value)}
                          >
                            {allRoles.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Form last 5 */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {last.length ? (
                            last.slice(0, 5).map((v, i) => <ScoreBadge key={i} v={v} />)
                          ) : (
                            <span className="text-zinc-400">No data</span>
                          )}
                        </div>
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

                      {/* Status toggle: BOTH states are black bg + white text per your ask */}
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

      {/* ---------- History Modal (maxed) ---------- */}
      <Dialog open={openInfo} onOpenChange={setOpenInfo}>
        <DialogContent className="w-[96vw] max-w-[1400px]">
          {sel && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">History</DialogTitle>
              </DialogHeader>

              {/* Avatar + Rename + Quick stats */}
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
                      ref={avatarFileRef}
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setAvatar(sel.id, f, setSel);
                        e.target.value = "";
                      }}
                    />
                    <Button size="sm" variant="outline" onClick={() => avatarFileRef.current?.click()}>
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

                  <div className="flex flex-wrap gap-4 items-center">
                    <div>
                      <div className="text-xs text-zinc-500">Role</div>
                      <Pill className="bg-zinc-100 border-zinc-300 text-zinc-800">{rankAcr(sel.role)}</Pill>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Average</div>
                      <Pill className={scoreColor(avg2(sel.id))}>{avg2(sel.id)}</Pill>
                    </div>
                    {(() => {
                      const { b2, b4 } = boxesOverall(sel.id);
                      return (
                        <>
                          <div>
                            <div className="text-xs text-zinc-500">Box 2</div>
                            <div className={`font-semibold ${pctClass(b2, 70)}`}>{b2}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500">Box 4</div>
                            <div className={`font-semibold ${pctClass(b4, 40)}`}>{b4}%</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* History table — expanded columns */}
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

function fmtDate(d) {
  const dt = new Date(d || Date.now());
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Try to read per-entry fields flexibly
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
        score: readNum(entry, ["score", "total", "SCORE"]),
        b2: readNum(entry, ["box2", "b2", "B2"]),
        b2s: readNum(entry, ["box2s", "b2s", "B2S", "box2_star", "b2_star"]),
        b4: readNum(entry, ["box4", "b4", "B4"]),
        b4s: readNum(entry, ["box4s", "b4s", "B4S", "box4_star", "b4_star"]),
        game: readNum(entry, ["game", "GAME", "sales", "SalesGame"]),
      });
    }
  }
  out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()); // newest first
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
