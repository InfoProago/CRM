// src/pages/Planning.jsx — Proago CRM
// v2025-09-04 • Zones(3), Team size(3), Game(EUR), Mult %, Validation, stacked cards, exports, audit
// Titles use • ; Dates display dd/mm/yyyy; Averages 2 decimals; Mult always as %.

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import * as U from "../util.js";

const { load, save, K, clone, addAuditLog, titleCase, fmtISO } = U;

const MAX_ZONES = 3;
const MAX_REC_PER_TEAM = 3;
const MULT_OPTIONS = [100, 125, 150, 200];

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ddmmyyyy(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return ""; }
}

function clampNum(n) {
  if (n === "" || n == null) return 0;
  const v = Number(String(n).replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

function asPercentLabel(n) { return `${n}%`; }

function calcAverage(day) {
  let total = 0, count = 0;
  for (const t of day.teams) {
    for (const r of (t.recruiters || [])) {
      const s = clampNum(r.score);
      if (s > 0) { total += s; count++; }
    }
  }
  return count ? (total / count).toFixed(2) : "0.00";
}

function ensureDayShape(day) {
  return {
    date: day?.date || isoToday(),
    teams: (day?.teams || []).map((t, idx) => ({
      id: t?.id || `z-${idx + 1}`,
      zone: t?.zone || `Zone ${idx + 1}`,
      recruiters: (t?.recruiters || []).slice(0, MAX_REC_PER_TEAM).map((r) => ({
        name: r?.name || "",
        crewCode: r?.crewCode || r?.crewcode || "",
        score: clampNum(r?.score),
        box2: clampNum(r?.box2),
        box2s: clampNum(r?.box2s),
        box4: clampNum(r?.box4),
        box4s: clampNum(r?.box4s),
        mult: MULT_OPTIONS.includes(Number(r?.mult)) ? Number(r?.mult) : 100,
        game: clampNum(r?.game),
      })),
    })).slice(0, MAX_ZONES),
  };
}

function loadDays() {
  const raw = load(K.planningDays) || load(K.planning) || [];
  const days = Array.isArray(raw) ? raw.map(ensureDayShape) : [];
  // sort newest first by ISO
  days.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return days;
}

function saveDays(days) {
  save(K.planningDays, days);
}

// Validation: returns {ok, msg, fixedRecruiter}
function validateRecruiter(r) {
  const score = clampNum(r.score);
  let b2 = clampNum(r.box2), b2s = clampNum(r.box2s);
  let b4 = clampNum(r.box4), b4s = clampNum(r.box4s);

  // Rule 1: (Box2 + Box2*) <= Score
  const b2Tot = b2 + b2s;
  if (b2Tot > score) {
    const scale = score / (b2Tot || 1);
    b2 = Math.floor(b2 * scale);
    b2s = Math.floor(b2s * scale);
  }

  // Rule 2: (Box4 + Box4*) <= (Box2 + Box2*)
  const b4Tot = b4 + b4s;
  const cap = b2 + b2s;
  if (b4Tot > cap) {
    const scale = cap / (b4Tot || 1);
    b4 = Math.floor(b4 * scale);
    b4s = Math.floor(b4s * scale);
  }

  return {
    ok: true,
    fixedRecruiter: { ...r, score, box2: b2, box2s: b2s, box4: b4, box4s: b4s },
  };
}

// Printable simple export
function printExport(kind, day) {
  const title = `${kind} — ${ddmmyyyy(day.date)}`;
  const win = window.open("", "_blank");
  if (!win) return alert("Popup blocked. Please allow popups to export.");
  const rows = [];
  for (const t of day.teams) {
    rows.push(`<h3>${t.zone}</h3>`);
    rows.push("<ul>");
    for (const r of t.recruiters) {
      rows.push(
        `<li>${r.name || ""} — Score: ${r.score || 0}, B2:${r.box2}+${r.box2s}, B4:${r.box4}+${r.box4s}, Mult: ${r.mult}%, Game: €${(r.game||0).toFixed ? r.game.toFixed(2) : r.game}</li>`
      );
    }
    rows.push("</ul><hr/>");
  }
  win.document.write(`
    <html>
      <head><title>${title}</title>
      <style>
        body { font-family: Nunito, system-ui, -apple-system, sans-serif; padding: 24px; }
        h1 { font-family: Lora, serif; }
        h3 { margin: 12px 0 4px; }
        ul { margin: 0 0 12px 18px; }
        hr { margin: 12px 0; }
        .meta { margin-bottom: 12px; color: #555; }
      </style></head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Average: ${calcAverage(day)}</div>
        ${rows.join("\n")}
        <script>window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}

export default function Planning() {
  const [days, setDays] = useState(() => loadDays());
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(null); // a single day being edited

  const openNewDay = () => {
    const d = ensureDayShape({
      date: isoToday(),
      teams: [
        { id: "z-1", zone: "Zone 1", recruiters: [] },
      ],
    });
    setDraft(d);
    setEditOpen(true);
  };

  const openEdit = (day) => {
    setDraft(clone(day));
    setEditOpen(true);
  };

  const commitDay = () => {
    // validate whole day
    const fixed = clone(draft);
    for (const t of fixed.teams) {
      t.recruiters = t.recruiters.map((r) => validateRecruiter(r).fixedRecruiter);
    }

    setDays((prev) => {
      const exists = prev.findIndex((x) => x.date === fixed.date);
      let next;
      if (exists >= 0) {
        next = prev.map((x, i) => (i === exists ? fixed : x));
        addAuditLog({ area: "Planning", action: "Update Day", date: fixed.date });
      } else {
        next = [fixed, ...prev];
        addAuditLog({ area: "Planning", action: "Add Day", date: fixed.date });
      }
      saveDays(next);
      return next;
    });
    setEditOpen(false);
    setDraft(null);
  };

  const deleteDay = (iso) => {
    if (!confirm("Delete this day?")) return;
    setDays((prev) => {
      const next = prev.filter((x) => x.date !== iso);
      addAuditLog({ area: "Planning", action: "Delete Day", date: iso });
      saveDays(next);
      return next;
    });
  };

  const addZone = () => {
    setDraft((d) => {
      if (d.teams.length >= MAX_ZONES) return d;
      const id = `z-${d.teams.length + 1}`;
      return {
        ...d,
        teams: [...d.teams, { id, zone: `Zone ${d.teams.length + 1}`, recruiters: [] }],
      };
    });
  };

  const removeZone = (id) => {
    setDraft((d) => {
      const t = d.teams.filter((z) => z.id !== id);
      return { ...d, teams: t };
    });
  };

  const updateZoneLabel = (id, val) => {
    setDraft((d) => ({
      ...d,
      teams: d.teams.map((z) => (z.id === id ? { ...z, zone: val } : z)),
    }));
  };

  const addRecruiter = (zoneId) => {
    setDraft((d) => {
      const t = d.teams.find((z) => z.id === zoneId);
      if (!t) return d;
      if ((t.recruiters || []).length >= MAX_REC_PER_TEAM) return d;
      const r = {
        name: "",
        crewCode: "",
        score: 0,
        box2: 0,
        box2s: 0,
        box4: 0,
        box4s: 0,
        mult: 100,
        game: 0,
      };
      return {
        ...d,
        teams: d.teams.map((z) => (z.id === zoneId ? { ...z, recruiters: [...(z.recruiters || []), r] } : z)),
      };
    });
  };

  const removeRecruiter = (zoneId, idx) => {
    setDraft((d) => {
      const z = d.teams.find((t) => t.id === zoneId);
      if (!z) return d;
      const list = (z.recruiters || []).filter((_, i) => i !== idx);
      return {
        ...d,
        teams: d.teams.map((t) => (t.id === zoneId ? { ...t, recruiters: list } : t)),
      };
    });
  };

  const patchRecruiter = (zoneId, idx, patch) => {
    setDraft((d) => {
      const t = d.teams.find((z) => z.id === zoneId);
      if (!t) return d;
      const list = (t.recruiters || []).map((r, i) => (i === idx ? validateRecruiter({ ...r, ...patch }).fixedRecruiter : r));
      return {
        ...d,
        teams: d.teams.map((z) => (z.id === zoneId ? { ...z, recruiters: list } : z)),
      };
    });
  };

  const exportKind = (kind, day) => {
    printExport(kind, day);
    addAuditLog({ area: "Planning", action: "Export", kind, date: day.date });
  };

  // ---------- UI ----------
  return (
    <div className="grid gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="button" onClick={openNewDay} style={{ background: "black", color: "white" }}>
            + Add Day
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Top
          </Button>
        </div>
      </div>

      {/* Days list (newest first) */}
      {days.map((day) => {
        const avg = calcAverage(day);
        return (
          <Card key={day.date} className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Day • {ddmmyyyy(day.date)}</span>
                <div className="flex items-center gap-2">
                  <Badge>Avg {avg}</Badge>
                  <Button type="button" variant="outline" onClick={() => exportKind("Sales Mail", day)}>Sales Mail</Button>
                  <Button type="button" variant="outline" onClick={() => exportKind("Quality Mail", day)}>Quality Mail</Button>
                  <Button type="button" variant="outline" onClick={() => exportKind("Team Prep Mail", day)}>Team Prep Mail</Button>
                  <Button type="button" variant="outline" onClick={() => openEdit(day)}>Edit</Button>
                  <Button type="button" variant="destructive" onClick={() => deleteDay(day.date)}>Delete</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Zones stacked vertically */}
              <div className="grid gap-4">
                {day.teams.map((t) => (
                  <div key={t.id} className="border rounded-lg p-3">
                    <div className="font-semibold mb-2">{t.zone}</div>
                    <hr className="my-2" />
                    {/* Recruiters stacked */}
                    <div className="grid gap-2">
                      {(t.recruiters || []).map((r, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-4">
                          <div className="min-w-[180px] font-medium">{r.name || <span className="text-zinc-400">—</span>}</div>
                          <div className="text-sm text-zinc-600">Score: {r.score}</div>
                          <div className="text-sm text-zinc-600">B2: {r.box2}+{r.box2s}</div>
                          <div className="text-sm text-zinc-600">B4: {r.box4}+{r.box4s}</div>
                          <div className="text-sm text-zinc-600">Mult: {r.mult}%</div>
                          <div className="text-sm text-zinc-600">Game: €{Number(r.game || 0).toFixed(2)}</div>
                        </div>
                      ))}
                      {(t.recruiters || []).length === 0 && (
                        <div className="text-zinc-400">No recruiters yet.</div>
                      )}
                    </div>
                  </div>
                ))}
                {day.teams.length === 0 && (
                  <div className="text-zinc-400 italic">No zones.</div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Edit Day dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="fill" className="max-w-[980px]">
          <DialogHeader>
            <DialogTitle className="text-center">Edit Day • {ddmmyyyy(draft?.date)}</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="grid gap-4">
              {/* Date (ISO under the hood) */}
              <div className="grid gap-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={draft.date || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value || isoToday() }))}
                  className="text-center"
                />
              </div>

              {/* Zones */}
              <div className="flex items-center justify-between">
                <div className="font-semibold">Zones</div>
                <div className="flex gap-2">
                  <Button type="button" onClick={addZone} style={{ background: "black", color: "white" }} disabled={draft.teams.length >= MAX_ZONES}>
                    + Add Team
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {draft.teams.map((z) => (
                  <div key={z.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        value={z.zone}
                        onChange={(e) => updateZoneLabel(z.id, e.target.value)}
                        className="font-medium"
                      />
                      <Button type="button" variant="destructive" onClick={() => removeZone(z.id)}>
                        Remove
                      </Button>
                    </div>

                    {/* Recruiters editor (max 3) */}
                    <div className="grid gap-3">
                      {(z.recruiters || []).map((r, idx) => {
                        const b2Tot = clampNum(r.box2) + clampNum(r.box2s);
                        const b4Tot = clampNum(r.box4) + clampNum(r.box4s);
                        const rule1Bad = b2Tot > clampNum(r.score);
                        const rule2Bad = b4Tot > b2Tot;

                        return (
                          <div key={idx} className="border rounded-md p-3">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              {/* Name */}
                              <div className="col-span-3">
                                <Label>Name</Label>
                                <Input
                                  value={r.name}
                                  onChange={(e) => patchRecruiter(z.id, idx, { name: titleCase(e.target.value) })}
                                  placeholder="Full name"
                                />
                              </div>

                              {/* Score */}
                              <div className="col-span-2">
                                <Label>Score</Label>
                                <Input
                                  inputMode="numeric"
                                  value={String(r.score ?? 0)}
                                  onChange={(e) => patchRecruiter(z.id, idx, { score: clampNum(e.target.value) })}
                                />
                              </div>

                              {/* Mult */}
                              <div className="col-span-2">
                                <Label>Mult</Label>
                                <select
                                  className="h-10 border rounded-md px-2 w-full"
                                  value={r.mult}
                                  onChange={(e) => patchRecruiter(z.id, idx, { mult: Number(e.target.value) })}
                                >
                                  {MULT_OPTIONS.map((m) => (
                                    <option key={m} value={m}>{asPercentLabel(m)}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Game (EUR) */}
                              <div className="col-span-2">
                                <Label>Sales Game (EUR)</Label>
                                <Input
                                  inputMode="numeric"
                                  value={String(r.game ?? 0)}
                                  onChange={(e) => patchRecruiter(z.id, idx, { game: clampNum(e.target.value) })}
                                />
                              </div>

                              {/* Remove */}
                              <div className="col-span-3 text-right">
                                <Button type="button" variant="outline" onClick={() => removeRecruiter(z.id, idx)}>
                                  Remove
                                </Button>
                              </div>
                            </div>

                            {/* Box inputs (equal widths, required order: B2, B2*, B4, B4*) */}
                            <div className="grid grid-cols-4 gap-2 mt-3">
                              <div>
                                <Label>Box 2</Label>
                                <Input
                                  inputMode="numeric"
                                  value={String(r.box2 ?? 0)}
                                  onChange={(e) => patchRecruiter(z.id, idx, { box2: clampNum(e.target.value) })}
                                />
                              </div>
                              <div>
                                <Label>Box 2*</Label>
                                <Input
                                  inputMode="numeric"
                                  value={String(r.box2s ?? 0)}
                                  onChange={(e) => patchRecruiter(z.id, idx, { box2s: clampNum(e.target.value) })}
                                />
                              </div>
                              <div>
                                <Label>Box 4</Label>
                                <Input
                                  inputMode="numeric"
                                  value={String(r.box4 ?? 0)}
                                  onChange={(e) => patchRecruiter(z.id, idx, { box4: clampNum(e.target.value) })}
                                />
                              </div>
                              <div>
                                <Label>Box 4*</Label>
                                <Input
                                  inputMode="numeric"
                                  value={String(r.box4s ?? 0)}
                                  onChange={(e) => patchRecruiter(z.id, idx, { box4s: clampNum(e.target.value) })}
                                />
                              </div>
                            </div>

                            {/* Validation notice inline */}
                            <div className="mt-2 text-sm">
                              {rule1Bad && <span className="text-red-600 mr-3">(Box 2 + Box 2*) must be ≤ Score)</span>}
                              {rule2Bad && <span className="text-red-600">(Box 4 + Box 4*) must be ≤ (Box 2 + Box 2*)</span>}
                            </div>
                          </div>
                        );
                      })}

                      <div>
                        <Button
                          type="button"
                          onClick={() => addRecruiter(z.id)}
                          style={{ background: "black", color: "white" }}
                          disabled={(z.recruiters || []).length >= MAX_REC_PER_TEAM}
                        >
                          + Add Recruiter
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="justify-between mt-2">
            <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setDraft(null); }}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => exportKind("Team Prep Mail", draft)} disabled={!draft}>
                Preview Team Prep
              </Button>
              <Button type="button" onClick={commitDay} style={{ background: "black", color: "white" }}>
                Save Day
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
