// src/pages/Recruiters.jsx — Proago CRM
// v2025-09-04b
// - History modal 90vw x 90vh
// - Safe date parsing (YYYY-MM-DD) to avoid TZ shift; newest-first sort
// - Form = latest 5 scores from Planning (colored), centered between Role & Average
// - Keeps: roles RK/PR/PC/TC/SM/BM, crewcode column, black-bordered Info, black Active buttons

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
  { w: "16%" }, // Form (latest 5)
  { w: "10%" }, // Average
  { w: "10%" }, // Box 2
  { w: "10%" }, // Box 4
  { w: "5%"  }, // Info
  { w: "5%"  }, // Status
];

// ------- tiny safe helpers (no util deps) -------
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

const scoreChipClass = (n) => {
  const v = Number(n) || 0;
  if (v >= 3) return "bg-green-100 text-green-800 border-green-300";
  if (v >= 2) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-red-100 text-red-800 border-red-300";
};
const pctClass = (p, threshold) => (Number(p) >= threshold ? "text-green-700" : "text-red-700");

const Pill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center border rounded-full px-2 py-[2px] text-xs font-medium ${className}`}>{children}</span>
);

// --- date utils: parse YYYY-MM-DD without timezone drift ---
function parseYMD(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}
function toEpochSafe(v) {
  if (!v && v !== 0) return 0;
  if (typeof v === "number") {
    // seconds vs ms
    return v > 1e12 ? v : v * 1000;
  }
  const ymd = parseYMD(v);
  if (ymd) {
    // use UTC midnight to keep day stable
    return Date.UTC(ymd.y, ymd.m - 1, ymd.d);
  }
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}
function fmtDDMMYYYYFromAny(v) {
  const ymd = parseYMD(v);
  if (ymd) {
    const dd = String(ymd.d).padStart(2, "0");
    const mm = String(ymd.m).padStart(2, "0");
    return `${dd}-${mm}-${ymd.y}`;
  }
  const t = toEpochSafe(v);
  const d = new Date(t);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Normalize/guard history entries; newest-first
function normalizeHistory(history, recId) {
  const out = [];
  const list = Array.isArray(history) ? history : [];

  for (const entry of list) {
    // If a team array exists, pick lines for this recruiter
    if (entry?.team && Array.isArray(entry.team)) {
      for (const t of entry.team) {
        const rid = t.recruiterId ?? t.rid ?? t.id;
        if (String(rid) !== String(recId)) continue;
        out.push({
          rawDate: entry.date ?? t.at ?? entry.at,
          sortKey: toEpochSafe(entry.date ?? t.at ?? entry.at),
          zone1: t.zone ?? t.zone1 ?? t.z1 ?? "",
          zone2: t.zone2 ?? t.z2 ?? "",
          zone3: t.zone3 ?? t.z3 ?? "",
          score: Number(t.score ?? t.total ?? 0) || 0,
          b2: Number(t.box2 ?? t.b2 ?? 0) || 0,
          b2s: Number(t.box2s ?? t.b2s ?? 0) || 0,
          b4: Number(t.box4 ?? t.b4 ?? 0) || 0,
          b4s: Number(t.box4s ?? t.b4s ?? 0) || 0,
          game: Number(t.game ?? t.sales ?? 0) || 0,
        });
      }
    } else {
      const rid = entry?.recruiterId ?? entry?.rid ?? entry?.id;
      if (String(rid) !== String(recId)) continue;
      out.push({
        rawDate: entry.date ?? entry.at,
        sortKey: toEpochSafe(entry.date ?? entry.at),
        zone1: entry.zone ?? entry.zone1 ?? entry.z1 ?? "",
        zone2: entry.zone2 ?? entry.z2 ?? "",
        zone3: entry.zone3 ?? entry.z3 ?? "",
        score: Number(entry.score ?? entry.total ?? 0) || 0,
        b2: Number(entry.box2 ?? entry.b2 ?? 0) || 0,
        b2s: Number(entry.box2s ?? entry.b2s ?? 0) || 0,
        b4: Number(entry.box4 ?? entry.b4 ?? 0) || 0,
        b4s: Number(entry.box4s ?? entry.b4s ?? 0) || 0,
        game: Number(entry.game ?? entry.sales ?? 0) || 0,
      });
    }
  }

  out.sort((a, b) => b.sortKey - a.sortKey); // newest first
  return out;
}

function last5Scores(history, recId) {
  // newest first, just scores (integers), max 5
  const rows = normalizeHistory(history, recId);
  return rows.slice(0, 5).map((e) => Math.round(e.score));
}

function avg2(history, recId) {
  const rows = normalizeHistory(history, recId).slice(0, 5);
  if (!rows.length) return "0.00";
  const n = rows.reduce((a, e) => a + (Number(e.score) || 0), 0) / rows.length;
  return n.toFixed(2);
}

function boxPercentsOverall(history, recId) {
  const rows = normalizeHistory(history, recId);
  if (!rows.length) return { b2: 0, b4: 0 };
  const mean = (arr) => (arr.length ? Math.round(arr.reduce((a, v) => a + (Number(v) || 0), 0) / arr.length) : 0);
  return { b2: mean(rows.map((r) => r.b2)), b4: mean(rows.map((r) => r.b4)) };
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
  const setAvatar = async (id, file, setSelState) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, avatar: dataUrl } : r)));
    if (setSelState) setSelState((s) => (s && s.id === id ? { ...s, avatar: dataUrl } : s));
    addAuditLog({ area: "Recruiters", action: "Set Avatar", recruiter: { id } });
  };
  const removeAvatar = (id, setSelState) => {
    setRecruiters((rs) => rs.map((r) => (r.id === id ? { ...r, avatar: "" } : r)));
    if (setSelState) setSelState((s) => (s && s.id === id ? { ...s, avatar: "" } : s));
    addAuditLog({ area: "Recruiters", action: "Remove Avatar", recruiter: { id } });
  };

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
                  const form5 = last5Scores(history, r.id); // newest first, max 5
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

                      {/* Form (centered between Role and Average) */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {form5.length ? (
                            form5.map((n, i) => (
                              <React.Fragment key={i}>
                                <Pill className={scoreChipClass(n)}>{n}</Pill>
                                {i < form5.length - 1 && <span className="text-zinc-400">-</span>}
                              </React.Fragment>
                            ))
                          ) : (
                            <span className="text-zinc-400">No data</span>
                          )}
                        </div>
                      </td>

                      {/* Average */}
                      <td className="p-3 text-center">
                        <Pill className={scoreChipClass(A)}>{A}</Pill>
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

      {/* History Modal (90% width & height) */}
      <Dialog open={openInfo} onOpenChange={setOpenInfo}>
        <DialogContent className="p-4" style={{ width: "90vw", maxWidth: "90vw", height: "90vh" }}>
          {sel && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">History</DialogTitle>
              </DialogHeader>

              <div className="grid md:grid-cols-[260px_1fr] gap-6 items-start h-[calc(90vh-8rem)]">
                {/* Left: Avatar & quick actions */}
                <div className="grid gap-3 place-items-center">
                  <div className="h-40 w-40 rounded-full bg-zinc-200 overflow-hidden grid place-items-center">
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

                {/* Right: details & history */}
                <div className="grid gap-4 min-w-0 overflow-hidden">
                  {/* Editable name */}
                  <div className="grid gap-1">
                    <div className="text-sm font-medium">Name</div>
                    <Input
                      value={sel.name || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        rename(sel.id, v);
                        setSel((s) => ({ ...s, name: titleCase(v) }));
                      }}
                    />
                  </div>

                  {/* Quick facts */}
                  <div className="flex flex-wrap gap-6 items-center">
                    <Fact label="Role"><Pill className="bg-zinc-100 border-zinc-300 text-zinc-800">{String(sel.role || "")}</Pill></Fact>
                    <Fact label="Average"><Pill className={scoreChipClass(avg2(history, sel.id))}>{avg2(history, sel.id)}</Pill></Fact>
                    <Fact label="Crewcode"><Pill className="bg-zinc-100 border-zinc-300 text-zinc-800">{sel.crewCode || "—"}</Pill></Fact>
                    {(() => {
                      const { b2, b4 } = boxPercentsOverall(history, sel.id);
                      return (
                        <>
                          <Fact label="Box 2"><span className={`font-semibold ${pctClass(b2, 70)}`}>{b2}%</span></Fact>
                          <Fact label="Box 4"><span className={`font-semibold ${pctClass(b4, 40)}`}>{b4}%</span></Fact>
                        </>
                      );
                    })()}
                  </div>

                  {/* History table */}
                  <div className="border rounded-lg overflow-hidden min-h-0 flex flex-col">
                    <div className="px-3 py-2 font-medium bg-zinc-50">History</div>
                    <div className="flex-1 overflow-auto">
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
                </div>
              </div>

              <DialogFooter className="justify-center pt-3">
                <Button variant="outline" onClick={() => setOpenInfo(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------- small pieces -------
const Fact = ({ label, children }) => (
  <div className="min-w-[100px]">
    <div className="text-xs text-zinc-500">{label}</div>
    {children}
  </div>
);

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
      <td className="p-2">{fmtDDMMYYYYFromAny(e.rawDate)}</td>
      <td className="p-2">
        <div className="flex flex-col text-xs">
          {e.zone1 && <span>Zone {e.zone1}</span>}
          {e.zone2 && <span>Zone {e.zone2}</span>}
          {e.zone3 && <span>Zone {e.zone3}</span>}
        </div>
      </td>
      <td className="p-2 text-center">
        <Pill className={scoreChipClass(e.score)}>{Number(e.score || 0).toFixed(2)}</Pill>
      </td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b2, 70)}`}>{Number(e.b2 || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b2s, 70)}`}>{Number(e.b2s || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b4, 40)}`}>{Number(e.b4 || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center"><span className={`font-semibold ${pctClass(e.b4s, 40)}`}>{Number(e.b4s || 0).toFixed(0)}%</span></td>
      <td className="p-2 text-center">{Number(e.game || 0).toFixed(2)}</td>
    </tr>
  ));
}
