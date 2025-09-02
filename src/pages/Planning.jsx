// Planning.jsx • Proago CRM (v2025-08-29h)
// Changes in this drop:
// • Edit Day • preview button: black bg / white text
// • Zone auto-names: base defaults to "Zone 1"; added zones default to "Zone 2", "Zone 3", ...
// • Hours/Mult/Score inputs same size as Box inputs
// • Zone/Project/Shift Type inputs uniform sizing
// • Extra footer padding so buttons aren't tight to borders
// • Keeps history upsert & structure intact

import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

import {
  clone,
  fmtISO,
  fmtUK,
  addDays,
  startOfWeekMon,
  weekNumberISO,
} from "../util";

const scoreColor = (v) => (v >= 3 ? "#10b981" : v >= 2 ? "#fbbf24" : "#ef4444");

// upsert history by (recruiterId, dateISO, _rowKey)
const upsertHistory = (list, row) => {
  const key = (r) => `${r.recruiterId}|${r.dateISO}|${r._rowKey ?? -1}`;
  const map = new Map(list.map((r) => [key(r), r]));
  map.set(key(row), { ...(map.get(key(row)) || {}), ...row });
  return Array.from(map.values());
};

// numeric sanitizer (keeps "", or digits only)
const onlyNum = (s) => {
  const t = String(s ?? "");
  if (t === "") return "";
  const m = t.match(/^\d+$/);
  return m ? t : t.replace(/\D+/g, "");
};

export default function Planning({ recruiters, planning, setPlanning, history, setHistory }) {
  const [weekStart, setWeekStart] = useState(() => fmtISO(startOfWeekMon(new Date())));
  const weekNum = weekNumberISO(new Date(weekStart));

  // ensure structure
  useEffect(() => {
    setPlanning((prev) => {
      const next = clone(prev || {});
      if (!next[weekStart]) next[weekStart] = { days: {} };
      for (let i = 0; i < 7; i++) {
        const d = fmtISO(addDays(new Date(weekStart), i));
        if (!next[weekStart].days[d]) next[weekStart].days[d] = { teams: [] };
      }
      return next;
    });
  }, [weekStart, setPlanning]);

  const dayData = (iso) => planning?.[weekStart]?.days?.[iso] ?? { teams: [] };

  // Edit Day •
  const [editDateISO, setEditDateISO] = useState(null);
  const [draft, setDraft] = useState(null);

  const openEdit = (iso) => {
    const d = clone(dayData(iso));
    d.teams = (d.teams || []).map((t, ti) => ({
      zone: (t.zone && t.zone.trim()) ? t.zone : "Zone 1", // default base
      extraZones: (t.extraZones || []).map((z, idx) => z || `Zone ${idx + 2}`), // ensure names
      project: (t.project === "HF" ? "Hello Fresh" : t.project) || "Hello Fresh",
      shiftType: t.shiftType || "D2D",
      rows: (t.rows || []).map((r, i) => ({
        _rowKey: r?._rowKey ?? i,
        recruiterId: r.recruiterId || "",
        hours: r.hours ?? "",
        commissionMult: r.commissionMult ?? "",
        score: r.score ?? "",
        // keep field names; labels elsewhere say "Box 2/Box 2*/Box 4/Box 4*"
        box2_noDisc: r.box2_noDisc ?? "",
        box2_disc: r.box2_disc ?? "",
        box4_noDisc: r.box4_noDisc ?? "",
        box4_disc: r.box4_disc ?? "",
      })),
    }));
    setEditDateISO(iso);
    setDraft(d);
  };
  const closeEdit = () => { setEditDateISO(null); setDraft(null); };

  const usedIds = (d) => {
    const s = new Set();
    (d?.teams || []).forEach((t) =>
      (t.rows || []).forEach((r) => r.recruiterId && s.add(r.recruiterId))
    );
    return s;
  };

  const addTeam = () =>
    setDraft((d) => {
      const teams = d?.teams || [];
      return {
        ...d,
        teams: [
          ...teams,
          { zone: "Zone 1", extraZones: [$1].slice(0, 2), project: "Hello Fresh", shiftType: "D2D", rows: [] },
        ],
      };
    });

  const delTeam = (ti) =>
    setDraft((d) => ({
      ...d,
      teams: (d?.teams || []).filter((_, i) => i !== ti),
    }));

  const setTeam = (ti, patch) =>
    setDraft((d) => {
      const teams = clone(d.teams || []);
      teams[ti] = { ...teams[ti], ...patch };
      return { ...d, teams };
    });

  const addZone = (ti) =>
    setDraft((d) => {
      const teams = clone(d.teams || []);
      const count = (teams[ti].extraZones?.length || 0) + 2; // base is Zone 1
      (teams[ti].extraZones ||= []).push(`Zone ${count}`);
      return { ...d, teams };
    });

  const setZoneAt = (ti, zi, val) =>
    setDraft((d) => {
      const teams = clone(d.teams || []);
      const arr = [...(teams[ti].extraZones || [])];
      arr[zi] = val;
      teams[ti].extraZones = arr;
      return { ...d, teams };
    });

  const delZoneAt = (ti, zi) =>
    setDraft((d) => {
      const teams = clone(d.teams || []);
      const arr = [...(teams[ti].extraZones || [])];
      arr.splice(zi, 1);
      // re-normalize labels if they were the auto ones
      teams[ti].extraZones = arr.map((z, idx) => z?.startsWith("Zone ") ? `Zone ${idx + 2}` : z);
      return { ...d, teams };
    });

  const addRow = (ti) =>
    setDraft((d) => {
      const teams = clone(d.teams || []);
      const nextKey = teams[ti].rows?.length || 0;
      (teams[ti].rows ||= []).push({
        _rowKey: nextKey,
        recruiterId: "",
        hours: "",
        commissionMult: "",
        score: "",
        box2_noDisc: "",
        box2_disc: "",
        box4_noDisc: "",
        box4_disc: "",
      });
      return { ...d, teams };
    });

  const delRow = (ti, ri) =>
    setDraft((d) => {
      const teams = clone(d.teams || []);
      teams[ti].rows = (teams[ti].rows || []).filter((_, i) => i !== ri);
      return { ...d, teams };
    });

  const setRow = (ti, ri, patch) =>
    setDraft((d) => {
      const teams = clone(d.teams || []);
      const prevRow = teams[ti].rows[ri];
      const nextRow = { ...prevRow, ...patch };
      if (patch.recruiterId) {
        const ids = usedIds({ teams });
        const already =
          ids.has(patch.recruiterId) && prevRow.recruiterId !== patch.recruiterId;
        if (already) {
          alert("This recruiter is already assigned today.");
          return d;
        }
      }
      teams[ti].rows[ri] = nextRow;
      return { ...d, teams };
    });

  const saveDay = () => {
    if (!draft) return;
    const iso = editDateISO;
    for (const t of draft.teams || []) {
      for (const r of t.rows || []) {
        const sc = Number(r.score || 0);
        const sum =
          Number(r.box2_noDisc || 0) +
          Number(r.box2_disc || 0) +
          Number(r.box4_noDisc || 0) +
          Number(r.box4_disc || 0);
        if (sum > sc) {
          alert("Box 2/Box 4 totals cannot exceed Score.");
          return;
        }
      }
    }
    // write planning
    setPlanning((prev) => {
      const next = clone(prev || {});
      if (!next[weekStart]) next[weekStart] = { days: {} };
      next[weekStart].days[iso] = clone(draft);
      return next;
    });
    // write history (upsert)
    setHistory((prev) => {
      let out = [...prev];
      (draft.teams || []).forEach((t) => {
        (t.rows || []).forEach((r, i) => {
          if (!r.recruiterId) return;
          out = upsertHistory(out, {
            _rowKey: r._rowKey ?? i,
            dateISO: iso,
            recruiterId: r.recruiterId,
            recruiterName:
              recruiters.find((x) => x.id === r.recruiterId)?.name || "",
            // primary + extras for context
            location: [t.zone, ...(t.extraZones || []).filter(Boolean)].filter(Boolean).join(" • "),
            project: t.project || "Hello Fresh",
            shiftType: t.shiftType || "D2D",
            hours: r.hours === "" ? undefined : Number(r.hours),
            commissionMult:
              r.commissionMult === "" ? undefined : Number(r.commissionMult),
            score: r.score === "" ? undefined : Number(r.score),
            box2_noDisc:
              r.box2_noDisc === "" ? undefined : Number(r.box2_noDisc),
            box2_disc: r.box2_disc === "" ? undefined : Number(r.box2_disc),
            box4_noDisc:
              r.box4_noDisc === "" ? undefined : Number(r.box4_noDisc),
            box4_disc: r.box4_disc === "" ? undefined : Number(r.box4_disc),
          });
        });
      });
      return out;
    });
    closeEdit();
  };

  /* ---------- Day Card (preview) ---------- */
  const DayCard = ({ i }) => {
    const dISO = fmtISO(addDays(new Date(weekStart), i));
    const day = dayData(dISO);
    const weekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i];

    return (
      <Card className="flex-1">
        <CardHeader className="pb-2">
          {/* Grey header fills to border; bold day; add spacing below */}
          <div className="rounded-md bg-zinc-100 px-3 py-2 text-center border border-zinc-200">
            <div className="text-sm font-semibold text-zinc-800">{weekday}</div>
            <div className="text-sm text-zinc-600">{fmtUK(dISO)}</div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1">
          {(day.teams || []).map((t, ti) => (
            <div key={ti} className="border rounded-lg p-2 mt-1">
              <div className="font-medium text-center mt-1">
                {t.zone || " • "}
                {t.extraZones && t.extraZones.filter(Boolean).length
                  ? <div className="text-xs text-zinc-500">+ {t.extraZones.filter(Boolean).join(" • ")}</div>
                  : null}
              </div>
              {(t.rows || []).length ? (
                <ul className="text-sm space-y-1 mt-2">
                  {t.rows.map((r, ri) => {
                    const rec = recruiters.find((x) => x.id === r.recruiterId);
                    const sc = r.score !== "" && r.score != null ? Number(r.score) : "";
                    return (
                      <li key={ri} className="flex items-center justify-between">
                        <span>{rec?.name || ""}</span>
                        <span
                          className="text-base font-medium"
                          style={{ color: sc !== "" ? scoreColor(sc) : undefined }}
                        >
                          {sc !== "" ? sc : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ))}

          <div className="flex justify-center pt-1">
            <Button
              size="sm"
              onClick={() => openEdit(dISO)}
              style={{ background: "black", color: "white" }}
            >
              Edit Day •
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  /* ---------- Render ---------- */
  return (
    <div className="grid gap-4">
      {/* Week header with nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setWeekStart(fmtISO(addDays(new Date(weekStart), -7)))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Badge style={{ background: "#fca11c" }} className="whitespace-nowrap">
            Week {weekNum}
          </Badge>
          <Button
            variant="outline"
            onClick={() => setWeekStart(fmtISO(addDays(new Date(weekStart), 7)))}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Days grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <DayCard key={i} i={i} />
        ))}
      </div>

      {/* Edit Day • */}
      <Dialog open={!!editDateISO} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent
          className="!w-[95vw] !max-w-[95vw] sm:!max-w-[1600px] h-[90vh] p-4"
          style={{ width: "95vw", maxWidth: "1600px" }}
        >
          <DialogHeader>
            <DialogTitle>Edit Day • • {fmtUK(editDateISO || "")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 h-[calc(90vh-7.5rem)] overflow-y-auto pr-1 pb-2">
            {(draft?.teams || []).map((t, ti) => {
              const used = usedIds(draft);
              const hasRows = (t.rows || []).length > 0;
              return (
                <div key={ti} className="border rounded-xl p-3">
                  {/* Team header */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                    <div className="grid gap-1">
                      <Label>Zone</Label>
                      <Input
                        className="h-9"
                        value={t.zone}
                        onChange={(e) => setTeam(ti, { zone: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-1 md:col-span-2">
                      <Label>Extra Zones</Label>
                      <div className="flex flex-wrap gap-2">
                        {(t.extraZones || []).map((z, zi) => (
                          <div key={zi} className="flex items-center gap-2">
                            <Input
                              className="h-9"
                              value={z}
                              onChange={(e) => setZoneAt(ti, zi, e.target.value)}
                            />
                            <Button variant="outline" size="sm" onClick={() => delZoneAt(ti, zi)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addZone(ti)}>
                          <Plus className="h-4 w-4 mr-1" /> Add Zone
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <Label>Project</Label>
                      <select
                        className="h-9 border rounded-md px-2"
                        value={t.project || "Hello Fresh"}
                        onChange={(e) => setTeam(ti, { project: e.target.value })}
                      >
                        <option>Hello Fresh</option>
                      </select>
                    </div>
                    <div className="grid gap-1">
                      <Label>Shift Type</Label>
                      <select
                        className="h-9 border rounded-md px-2"
                        value={t.shiftType || "D2D"}
                        onChange={(e) => setTeam(ti, { shiftType: e.target.value })}
                      >
                        <option value="D2D">Door-to-Door</option>
                        <option value="EVENT">Events</option>
                      </select>
                    </div>
                  </div>

                  {/* Rows table */}
                  {hasRows ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm table-fixed">
                        {/* Equal widths from Hours through Box 4* */}
                        <colgroup>
                          <col style={{ width: "28%" }} /> {/* Recruiter */}
                          <col style={{ width: "9%" }} />  {/* Hours */}
                          <col style={{ width: "10%" }} /> {/* Mult */}
                          <col style={{ width: "9%" }} />  {/* Score */}
                          <col style={{ width: "11%" }} /> {/* Box 2 */}
                          <col style={{ width: "11%" }} /> {/* Box 2* */}
                          <col style={{ width: "11%" }} /> {/* Box 4 */}
                          <col style={{ width: "11%" }} /> {/* Box 4* */}
                          <col style={{ width: "10%" }} /> {/* Actions */}
                        </colgroup>
                        <thead className="bg-zinc-50">
                          <tr>
                            <th className="p-2 text-left">Recruiter</th>
                            <th className="p-2 text-right">Hours</th>
                            <th className="p-2 text-right">Mult</th>
                            <th className="p-2 text-right">Score</th>
                            <th className="p-2 text-right">Box 2</th>
                            <th className="p-2 text-right">Box 2*</th>
                            <th className="p-2 text-right">Box 4</th>
                            <th className="p-2 text-right">Box 4*</th>
                    <th className="th">Game</th>
                            <th className="p-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(t.rows || []).map((r, ri) => (
                            <tr key={ri} className="border-t">
                              <td className="p-2">
                                <select
                                  className="h-9 border rounded-md px-2 w-full min-w-[16rem]"
                                  value={r.recruiterId}
                                  onChange={(e) =>
                                    setRow(ti, ri, { recruiterId: e.target.value })
                                  }
                                >
                                  <option value="">Select…</option>
                                  {recruiters.map((rec) => {
                                    const disabled =
                                      used.has(rec.id) && rec.id !== r.recruiterId;
                                    return (
                                      <option
                                        key={rec.id}
                                        value={rec.id}
                                        disabled={disabled}
                                      >
                                        {rec.name}
                                        {disabled ? " (already assigned)" : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                              </td>

                              <td className="p-2 text-right">
                                <Input
                                  className="w-full h-9 text-right"
                                  inputMode="numeric"
                                  value={r.hours ?? ""}
                                  onChange={(e) =>
                                    setRow(ti, ri, { hours: onlyNum(e.target.value) })
                                  }
                                />
                              </td>

                              <td className="p-2 text-right">
                                <select
                                  className="h-9 border rounded-md px-2 w-full"
                                  value={r.commissionMult ?? ""}
                                  onChange={(e) =>
                                    setRow(ti, ri, {
                                      commissionMult: onlyNum(e.target.value),
                                    })
                                  }
                                >
                                  <option value=""> • </option>
                                  <option value="1">100%</option>
                                  <option value="1.25">125%</option>
                                  <option value="1.5">150%</option>
                                  <option value="2">200%</option>
                                </select>
                              </td>

                              <td className="p-2 text-right">
                                <Input
                                  className="w-full h-9 text-right"
                                  inputMode="numeric"
                                  value={r.score ?? ""}
                                  onChange={(e) =>
                                    setRow(ti, ri, { score: onlyNum(e.target.value) })
                                  }
                                />
                              </td>

                              <td className="p-2 text-right">
                                <Input
                                  className="w-full h-9 text-right"
                                  inputMode="numeric"
                                  value={r.box2_noDisc ?? ""}
                                  onChange={(e) =>
                                    setRow(ti, ri, {
                                      box2_noDisc: onlyNum(e.target.value),
                                    })
                                  }
                                />
                              </td>

                              <td className="p-2 text-right">
                                <Input
                                  className="w-full h-9 text-right"
                                  inputMode="numeric"
                                  value={r.box2_disc ?? ""}
                                  onChange={(e) =>
                                    setRow(ti, ri, {
                                      box2_disc: onlyNum(e.target.value),
                                    })
                                  }
                                />
                              </td>

                              <td className="p-2 text-right">
                                <Input
                                  className="w-full h-9 text-right"
                                  inputMode="numeric"
                                  value={r.box4_noDisc ?? ""}
                                  onChange={(e) =>
                                    setRow(ti, ri, {
                                      box4_noDisc: onlyNum(e.target.value),
                                    })
                                  }
                                />
                              </td>

                              <td className="p-2 text-right">
                                <Input
                                  className="w-full h-9 text-right"
                                  inputMode="numeric"
                                  value={r.box4_disc ?? ""}
                                  onChange={(e) =>
                                    setRow(ti, ri, {
                                      box4_disc: onlyNum(e.target.value),
                                    })
                                  }
                                />
                              </td>

                              <td className="p-2 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => delRow(ti, ri)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <div className="pt-2">
                    <Button variant="outline" size="sm" onClick={() => addRow(ti)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Recruiter
                    </Button>
                    <Button variant="destructive" size="sm" className="ml-2" onClick={() => delTeam(ti)}>
                      <X className="h-4 w-4 mr-1" /> Remove Team
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer with extra spacing */}
          <div className="flex items-center justify-between mt-4 pt-2">
            <Button variant="outline" size="sm" onClick={addTeam}>
              <Plus className="h-4 w-4 mr-1" /> Add Team
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeEdit}>Cancel</Button>
              <Button style={{ background: "#d9010b", color: "white" }} onClick={saveDay}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
