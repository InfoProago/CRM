// Settings.jsx — Proago CRM (v2025-09-03 • Step 1 safe)
// Updates:
// • Section titles use • (bullet)
// • Door-to-Door → D2D
// • Rates show no €; accept commas; supports adding future bands
// • Default rate bands: before 01-05-2025 = 15,2473; from 01-05-2025 = 15,6285
// • Conversion matrix restored (D2D, D2D*, Events, Events*)
// • Delete Recruiter (cascade: Recruiters, Planning assignments, History)
// • Audit Log button (viewer)

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../components/ui/dialog";

import {
  load, save, K, DEFAULT_SETTINGS, clone,
  sanitizeNumericInput, parseNumber,
  getAuditLog, addAuditLog,
} from "../util";

export default function Settings({ settings, setSettings }) {
  // ---------------- Rate Bands (commas accepted) ----------------
  const onChangeRate = (i, field, value) => {
    setSettings((s) => {
      const next = clone(s);
      if (field === "rate") {
        // keep commas in storage; parseNumber when computing elsewhere
        next.rateBands[i].rate = sanitizeNumericInput(value);
      } else {
        next.rateBands[i][field] = value;
      }
      return next;
    });
  };

  const addRateBand = () => {
    setSettings((s) => {
      const next = clone(s);
      next.rateBands.push({ startISO: "2026-01-01", rate: "16,00" });
      addAuditLog({ area: "Settings", action: "Add Rate Band", band: next.rateBands[next.rateBands.length - 1] });
      return next;
    });
  };

  // ---------------- Conversion Matrix ----------------
  const changeConv = (path, val) => {
    const num = Number(val || 0);
    setSettings((s) => {
      const next = clone(s);
      let ref = next.conversionType;
      // path like: ["D2D","noDiscount","box2"]
      ref[path[0]][path[1]][path[2]] = num;
      addAuditLog({ area: "Settings", action: "Update Conversion", path: path.join("."), value: num });
      return next;
    });
  };

  // ---------------- Delete Recruiter (cascade) ----------------
  const [delOpen, setDelOpen] = useState(false);
  const recruitersLS = useMemo(() => load(K.recruiters, []), [delOpen]); // refresh when dialog opens
  const [toDelete, setToDelete] = useState("");

  const doCascadeDelete = () => {
    if (!toDelete) return;
    const recs = load(K.recruiters, []);
    const victim = recs.find((r) => r.id === toDelete);
    if (!victim) { alert("Recruiter not found."); return; }

    // 1) Recruiters
    const nextRecs = recs.filter((r) => r.id !== toDelete);
    save(K.recruiters, nextRecs);

    // 2) Planning: try best-effort removal in data shape { [date]: { teams:[{ members:[], ... }], ... } }
    const plan = load(K.planning, {});
    const planNext = clone(plan);
    Object.keys(planNext || {}).forEach((key) => {
      const day = planNext[key];
      if (!day) return;
      // common shapes: day.teams (array) or day.team (array)
      const teams = Array.isArray(day.teams) ? day.teams : (Array.isArray(day.team) ? day.team : null);
      if (teams) {
        teams.forEach((t) => {
          // members could be array of recruiter objects or ids
          if (Array.isArray(t.members)) {
            t.members = t.members.filter((m) => (m?.id || m) !== toDelete);
          }
          // per-recruiter lines
          if (Array.isArray(t.recruiters)) {
            t.recruiters = t.recruiters.filter((m) => (m?.id || m) !== toDelete);
          }
        });
      }
    });
    save(K.planning, planNext);

    // 3) History: remove entries for recruiterId
    const hist = load(K.history, []);
    const histNext = (hist || []).filter((h) => {
      const rid = h?.recruiterId || h?.id || h?.rid;
      return rid !== toDelete;
    });
    save(K.history, histNext);

    addAuditLog({
      area: "Settings",
      action: "Delete Recruiter (cascade)",
      recruiter: { id: toDelete, name: victim?.name, role: victim?.role },
    });

    setDelOpen(false);
    setToDelete("");
    alert(`Recruiter "${victim?.name || toDelete}" deleted from Recruiters, Planning assignments, and History.`);
  };

  // ---------------- Audit Log viewer ----------------
  const [logOpen, setLogOpen] = useState(false);
  const logs = useMemo(() => getAuditLog().slice().reverse(), [logOpen]);

  // ---------------- Render ----------------
  return (
    <div className="grid gap-4">
      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Projects • Names</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {(settings.projects || DEFAULT_SETTINGS.projects).map((p, i) => (
            <div key={i} className="grid gap-1">
              <Label>Project {i + 1}</Label>
              <Input
                value={p}
                onChange={(e) =>
                  setSettings((s) => {
                    const next = clone(s);
                    next.projects = (next.projects || []).slice();
                    next.projects[i] = e.target.value;
                    addAuditLog({ area: "Settings", action: "Update Project Name", index: i, value: e.target.value });
                    return next;
                  })
                }
              />
            </div>
          ))}
          {(!settings.projects || settings.projects.length === 0) && (
            <div className="text-sm text-muted-foreground">Default project: Hello Fresh</div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Matrix • Targets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">D2D • No Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2</Label>
                  <Input
                    inputMode="numeric"
                    value={settings.conversionType.D2D.noDiscount.box2}
                    onChange={(e) => changeConv(["D2D", "noDiscount", "box2"], e.target.value)}
                  />
                </div>
                <div>
                  <Label>Box 4</Label>
                  <Input
                    inputMode="numeric"
                    value={settings.conversionType.D2D.noDiscount.box4}
                    onChange={(e) => changeConv(["D2D", "noDiscount", "box4"], e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">D2D* • Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2*</Label>
                  <Input
                    inputMode="numeric"
                    value={settings.conversionType.D2D.discount.box2}
                    onChange={(e) => changeConv(["D2D", "discount", "box2"], e.target.value)}
                  />
                </div>
                <div>
                  <Label>Box 4*</Label>
                  <Input
                    inputMode="numeric"
                    value={settings.conversionType.D2D.discount.box4}
                    onChange={(e) => changeConv(["D2D", "discount", "box4"], e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">Events • No Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2</Label>
                  <Input
                    inputMode="numeric"
                    value={settings.conversionType.EVENT.noDiscount.box2}
                    onChange={(e) => changeConv(["EVENT", "noDiscount", "box2"], e.target.value)}
                  />
                </div>
                <div>
                  <Label>Box 4</Label>
                  <Input
                    inputMode="numeric"
                    value={settings.conversionType.EVENT.noDiscount.box4}
                    onChange={(e) => changeConv(["EVENT", "noDiscount", "box4"], e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">Events* • Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2*</Label>
                  <Input
                    inputMode="numeric"
                    value={settings.conversionType.EVENT.discount.box2}
                    onChange={(e) => changeConv(["EVENT", "discount", "box2"], e.target.value)}
                  />
                </div>
                <div>
                  <Label>Box 4*</Label>
                  <Input
                    inputMode="numeric"
                    value={settings.conversionType.EVENT.discount.box4}
                    onChange={(e) => changeConv(["EVENT", "discount", "box4"], e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Rate Bands (no € symbol, commas allowed) */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Rate Bands • Active</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {settings.rateBands.map((b, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="grid gap-1">
                <Label>Start Date</Label>
                <Input type="date" value={b.startISO} onChange={(e) => onChangeRate(i, "startISO", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Rate</Label>
                <Input
                  inputMode="decimal"
                  value={b.rate}
                  onChange={(e) => onChangeRate(i, "rate", e.target.value)}
                />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addRateBand}>Add Rate Band</Button>
        </CardContent>
      </Card>

      {/* Delete Recruiter (cascade) */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance • Delete Recruiter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
            <div className="grid gap-1">
              <Label>Select recruiter to delete</Label>
              <select
                className="h-10 border rounded-md px-3"
                value={toDelete}
                onChange={(e) => setToDelete(e.target.value)}
              >
                <option value="">— Select —</option>
                {recruitersLS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.role})
                  </option>
                ))}
              </select>
            </div>
            <Button variant="destructive" onClick={() => setDelOpen(true)} disabled={!toDelete}>
              Delete Recruiter
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            This action removes the recruiter from <b>Recruiters</b>, all <b>Planning</b> assignments, and <b>History</b>.
          </div>
        </CardContent>
      </Card>

      {/* Audit Log viewer */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setLogOpen(true)}>Audit Log</Button>
        {/* keep space for future Settings actions */}
        <div />
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm • Delete Recruiter</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Are you sure you want to delete this recruiter? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDelOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={doCascadeDelete}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Log dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit Log • Recent</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto text-sm">
            {logs.length === 0 && <div className="text-muted-foreground">No entries yet.</div>}
            {logs.map((e, i) => (
              <div key={i} className="py-2 border-b">
                <div className="font-medium">{e.area} • {e.action}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString()}</div>
                {e.path && <div>Path: {e.path}</div>}
                {e.value !== undefined && <div>Value: {String(e.value)}</div>}
                {e.recruiter && <div>Recruiter: {e.recruiter.name} ({e.recruiter.id})</div>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
