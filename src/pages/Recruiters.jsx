// src/pages/Recruiters.jsx — Proago CRM (standalone-safe)
// v2025-09-04
// - No util.js dependency; safe fallbacks so tab always mounts
// - Roles fixed: RK, PR, PC, TC, SM, BM (editable per row)
// - Crewcode column (table only; NOT as a column in History)
// - Form shows last 5 worked-day scores inline "1-2-3-4-5" (no decimals), newest first
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

// ------- constants -------
const ROLES = ["RK", "PR", "PC", "TC", "SM", "BM"];
const COLS = [
  { w: "22%" }, // Name
  { w: "10%" }, // Crewcode
  { w: "12%" }, // Role
  { w: "16%" }, // Form (last 5 inline)
  { w: "10%" }, // Average
  { w: "10%" }, // Box 2
  { w: "10%" }, // Box 4
  { w: "5%"  }, // Info
  { w: "5%"  }, // Status
];

// ------- tiny safe helpers (local, to avoid util.js hard deps) -------
const addAuditLog = (payload) => {
  try {
    const k = "proago_audit_log";
    const cur = JSON.parse(localStorage.getItem(k) || "[]");
    cur.unshift({ at: new Date().toISOString(), ...payload });
    localStorage.setItem(k, JSON.stringify(cur).slice(0, 2000000));
  } catch {}
};

const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();

// score color like Planning (uses 2-dec avg thresholds)
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

// Normalize/guard history entries that might come in different shapes
function toDateVal(v) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}
function readNum(o, keys, def = 0) {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && v !== "") return Number(v) || 0;
  }
  return def;
}
function pickZone(o) {
  return o.zone ?? o.zone1 ?? o.z1 ?? o.Zone ?? o.Zone1 ?? o.Z1 ?? "";
}
function normalizeHistory(history, recId) {
  const out = [];
  if (!Array.isArray(history)) return out;

  for (const entry of history) {
    // team-based (array of members)
    if (entry?.team && Array.isArray(entry.team)) {
      for (const t of entry.team) {
        const rid = t.recruiterId ?? t.rid ?? t.id;
        if (String(rid) !== String(recId)) continue;
        out.push({
          at: toDateVal(entry.date || t.at || entry.at),
          zone: pickZone(t),
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
      if (String(rid) !== String(recId)) continue;
      out.push({
        at: toDateVal(entry.date || entry.at),
        zone: pickZone(entry),
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
  out.sort((a, b) => b.at - a.at);
  return out;
}

function last5FormInline(history, recId) {
  const rows = normalizeHistory(history, recId);
  // Newest first; take first 5 scores, integer only
  return rows.slice(0, 5).map((e) => String(Math.round(Number(e.score || 0))));
}

function avg2(history, recId) {
  const rows = normalizeHistory(history, recId).slice(0, 5);
  if (!rows.length) return "0.00";
  const n = rows.reduce((a, e) => a + (Number(e.score) || 0), 0) / rows.length;
  return n.toFixed(2);
}

function boxPercentsOverall(history, recId) {
  // Average of available b2/b4 over normalized set (last 8 weeks scope not enforced without date math)
  const rows = normalizeHistory(history, recId);
  if (!rows.length) return { b2: 0, b4: 0 };
  const b2Vals = rows.map((r) => Number(r.b2) || 0);
  const b4Vals = rows.map((r) => Number(r.b4) || 0);
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, v) => a + v, 0) / arr.length) : 0);
  return { b2: avg(b2Vals), b4: avg(b4Vals) };
}

function fmtDateDDMMYYYY(ms) {
  const d = new Date(ms || Date.now());
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// ------- main component -------
export default function Recruiters({ recruiters = [], setRecruiters = () => {}, history = [], setHistory = () => {} }) {
  const [filter, setFilter] = useState("active"); // "active" | "inactive"
  const [openInfo, setOpenInfo] = useState(false);
  const [sel, setSel] = useState(null);
  const avatarFileRef = useRef(null);

  const rows = useMemo(() => {
    const list = Array.isArray(recruiters) ? recruiters : [];
    const filtered = filter === "active" ? list.filter((r) => !r.isInactive) : list.filter((r) => r.isInactive);
    // Sort by role (fixed order), then name
    const roleOrder = { RK: 1, PR: 2, PC: 3, TC: 4, SM: 5, BM: 6 };
    return filtered
      .slice()
      .sort((a, b) => {
        const ra = roleOrder[String(a.role || "").toUpperCase()] ?? 999;
        const rb = roleOrder[String(b.role || "").toUpperCase()] ?? 999;
        if (ra !== rb) return ra - rb;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [recruiters, filter]);

  // mutators
  const toggleStatus = (rec) => {
    setRecruiters((rs) => rs.map((r) => (r.id === rec.id ? { ...r, isInactive: !r.isInactive } : r)));
    addAuditLog({ area: "Recruiters", action: "Toggle Status", recruiter: { id: rec.id, name: rec.name }, to: rec.isInactive ? "Active" : "Inactive" });
  };
  const rename = (id, newName) => {
    const nm = titleCase(newName);
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, name: nm } : r)));
    addAuditLog({ area: "Recruiters", action: "Rename", recruiter: { id, name: nm } });
  };
  const setCrewcode = (id, code) => {
    const val = String(code || "").replace(/\D/g, "").slice(0, 5);
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, crewCode: val } : r)));
    addAuditLog({ area: "Recruiters", action: "Edit Crewcode", recruiter: { id }, crewCode: val });
  };
  const setRole = (id, role) => {
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, role } : r)));
    addAuditLog({ area: "Recruiters", action: "Change Role", recruiter: { id }, role });
  };

  // avatar
  const setAvatar = async (id, file, setSel) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, avatar: dataUrl } : r)));
    if (setSel) setSel((s) => (s && s.id === id ? { ...s, avatar: dataUrl } : s));
    addAuditLog({ area: "Recruiters", action: "Set Avatar", recruiter: { id } });
  };
  const removeAvatar = (id, setSel) => {
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, avatar: "" } : r)));
    if (setSel) setSel((s) => (s && s.id === id ? { ...s, avatar: "" } : s));
    addAuditLog({ area: "Recruiters", action: "Remove Avatar", recruiter: { id } });
  };

  // open/close modal
  const openModal = (rec) => { setSel(rec); setOpenInfo(true); };

  return (
    <div className="grid gap-4">
      {/* Header filter */}
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
                  const formInline = last5FormInline(history, r.id); // newest first, max 5, integers as strings
                  const A = avg2(history, r.id);
                  const { b2, b4 } = boxPercentsOverall(history, r.id);

                  return (
                    <tr key={r.id} className="border-t">
                      {/* Name */}
                      <td className="p-3">
                        <Input value={r.name || ""} onChange={(e) => rename(r.id, e.target.value)} />
                      </td>

                      {/* Crewcode */}
                      <td className="p-3 text-center">
                        <div className="mx-auto" style={{ maxWidth: 96 }}>
                          <Input
                            className="text-center"
                            value={r.crewCode || ""}
                            onChange={(e) => setCrewcode(r.id, e.target.value)}
                          />
                        </div>
                      </td>

                      {/* Role */}
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

                      {/* Form (1-2-3-4-5) */}
                      <td className="p-3">
                        {formInline.length ? (
                          <span className="whitespace-nowrap">{formInline.join("-")}</span>
                        ) : (
                          <span className="text-zinc-400">No data</span>
                        )}
                      </td>

                      {/* Average */}
                      <td className="p-3 text-center">
                        <Pill className={scoreColor(A)}>{A}</Pill>
                      </td>

                      {/* Box 2 */}
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${pctClass(b2, 70)}`}>{b2}%</span>
                      </td>

                      {/* Box 4 */}
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${pctClass(b4, 40)}`}>{b4}%</span>
                      </td>

                      {/* Info */}
                      <td className="p-3 text-center">
                        <Button
                          onClick={() => openModal(r)}
                          className="h-9 px-3"
                          style={{ background: "white", color: "black", border: "1px solid #000" }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </td>

                      {/* Status */}
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

                {/* Ghost row to keep header widths when empty */}
                {rows.length === 0 && (
                  <tr className="border-t opacity-0 select-none pointer-events-none">
                    {COLS.map((_, i) => (
                      <td key={i} className="p-3"><div className="h-10" /></td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* History Modal */}
      <Dialog open={openInfo} onOpenChange={setOpenInfo}>
        <DialogContent className="w-[98vw] max-w-[1600px]">
          {sel && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">History</DialogTitle>
              </DialogHeader>

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

                {/* Quick facts */}
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
                      <Pill className="bg-zinc-100 border-zinc-300 text-zinc-800">{String(sel.role || "")}</Pill>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Average</div>
                      <Pill className={scoreColor(avg2(history, sel.id))}>{avg2(history, sel.id)}</Pill>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Crewcode</div>
                      <Pill className="bg-zinc-100 border-zinc-300 text-zinc-800">{sel.crewCode || "—"}</Pill>
                    </div>
                    {(() => {
                      const { b2, b4 } = boxPercentsOverall(history, sel.id);
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
                <Button variant="outline" onClick={() => setOpenInfo(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------- tiny local fns used by component -------
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function renderHistoryRows(history, recId) {
  const rows = normalizeHistory(history, recId);
  if (!rows.length) {
    return (
      <tr className="border-t">
        <td className="p-2 text-zinc-400" colSpan={8}>No history</td>
      </tr>
    );
  }
  return rows.map((e, i) => (
    <tr key={i} className="border-t">
      <td className="p-2">{fmtDateDDMMYYYY(e.at)}</td>
      <td className="p-2">
        <div className="flex flex-col text-xs">
          {e.zone && <span>Zone {e.zone}</span>}
          {e.zone2 && <span>Zone {e.zone2}</span>}
          {e.zone3 && <span>Zone {e.zone3}</span>}
        </div>
      </td>
      <td className="p-2 text-center">
        <Pill className={scoreColor(e.score)}>{Number(e.score || 0).toFixed(2)}</Pill>
      </td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b2, 70)}`}>{Number(e.b2 || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b2s, 70)}`}>{Number(e.b2s || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b4, 40)}`}>{Number(e.b4 || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b4s, 40)}`}>{Number(e.b4s || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center">{Number(e.game || 0).toFixed(2)}</td>
    </tr>
  ));
}
