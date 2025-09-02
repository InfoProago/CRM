// Settings.jsx • Proago CRM (v2025-08-29g)
// Changes:
// • Project = “Hello Fresh”
// • Conversion matrix headings without parentheses
// • “Delete Recruiter” also deletes Recruiters + History (hard reset), then suggests reload

import React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { load, K, DEFAULT_SETTINGS, clone } from "../util";

export default function Settings({ settings, setSettings }) {

  const onChangeRate = (i, field, value) => {
    setSettings((s) => {
      const next = clone(s);
      next.rateBands[i][field] = field === "rate" ? Number(value || 0) : value;
      return next;
    });
  };

  const addRateBand = () => {
    setSettings((s) => {
      const next = clone(s);
      next.rateBands.push({ startISO: "2026-01-01", rate: 16 });
      return next;
    });
  };

  const deletePlanningHistory = () => {
    if (!confirm("Delete ALL recruiters and ALL planning history? This cannot be undone.")) return;
    try {
      localStorage.removeItem(K.history);
      localStorage.removeItem(K.recruiters);
      alert("Recruiters and planning history deleted. The page will now reload.");
      setTimeout(() => window.location.reload(), 300);
    } catch {
      alert("Failed to delete data.");
    }
  };

  const changeProjectName = (idx, val) => {
    setSettings((s) => {
      const next = clone(s);
      next.projects[idx] = val;
      return next;
    });
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {(settings.projects || []).map((p, i) => (
            <div key={i} className="grid gap-1">
              <Label>Project {i + 1}</Label>
              <Input value={p} onChange={(e) => changeProjectName(i, e.target.value)} />
            </div>
          ))}
          {(!settings.projects || settings.projects.length === 0) && (
            <div className="text-sm text-muted-foreground">Default project: Hello Fresh</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversion Matrix</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">D2D • No Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2</Label>
                  <Input inputMode="numeric" value={settings.conversionType.D2D.noDiscount.box2}
                    onChange={(e)=> setSettings(s=>({ ...s, conversionType:{ ...s.conversionType, D2D:{ ...s.conversionType.D2D, noDiscount:{ ...s.conversionType.D2D.noDiscount, box2:Number(e.target.value||0) }}}}))} />
                </div>
                <div>
                  <Label>Box 4</Label>
                  <Input inputMode="numeric" value={settings.conversionType.D2D.noDiscount.box4}
                    onChange={(e)=> setSettings(s=>({ ...s, conversionType:{ ...s.conversionType, D2D:{ ...s.conversionType.D2D, noDiscount:{ ...s.conversionType.D2D.noDiscount, box4:Number(e.target.value||0) }}}}))} />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">D2D • Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2*</Label>
                  <Input inputMode="numeric" value={settings.conversionType.D2D.discount.box2}
                    onChange={(e)=> setSettings(s=>({ ...s, conversionType:{ ...s.conversionType, D2D:{ ...s.conversionType.D2D, discount:{ ...s.conversionType.D2D.discount, box2:Number(e.target.value||0) }}}}))} />
                </div>
                <div>
                  <Label>Box 4*</Label>
                  <Input inputMode="numeric" value={settings.conversionType.D2D.discount.box4}
                    onChange={(e)=> setSettings(s=>({ ...s, conversionType:{ ...s.conversionType, D2D:{ ...s.conversionType.D2D, discount:{ ...s.conversionType.D2D.discount, box4:Number(e.target.value||0) }}}}))} />
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
                  <Input inputMode="numeric" value={settings.conversionType.EVENT.noDiscount.box2}
                    onChange={(e)=> setSettings(s=>({ ...s, conversionType:{ ...s.conversionType, EVENT:{ ...s.conversionType.EVENT, noDiscount:{ ...s.conversionType.EVENT.noDiscount, box2:Number(e.target.value||0) }}}}))} />
                </div>
                <div>
                  <Label>Box 4</Label>
                  <Input inputMode="numeric" value={settings.conversionType.EVENT.noDiscount.box4}
                    onChange={(e)=> setSettings(s=>({ ...s, conversionType:{ ...s.conversionType, EVENT:{ ...s.conversionType.EVENT, noDiscount:{ ...s.conversionType.EVENT.noDiscount, box4:Number(e.target.value||0) }}}}))} />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">Events • Discount</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Box 2*</Label>
                  <Input inputMode="numeric" value={settings.conversionType.EVENT.discount.box2}
                    onChange={(e)=> setSettings(s=>({ ...s, conversionType:{ ...s.conversionType, EVENT:{ ...s.conversionType.EVENT, discount:{ ...s.conversionType.EVENT.discount, box2:Number(e.target.value||0) }}}}))} />
                </div>
                <div>
                  <Label>Box 4*</Label>
                  <Input inputMode="numeric" value={settings.conversionType.EVENT.discount.box4}
                    onChange={(e)=> setSettings(s=>({ ...s, conversionType:{ ...s.conversionType, EVENT:{ ...s.conversionType.EVENT, discount:{ ...s.conversionType.EVENT.discount, box4:Number(e.target.value||0) }}}}))} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hourly Rate Bands</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {settings.rateBands.map((b, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="grid gap-1">
                <Label>Start Date</Label>
                <Input type="date" value={b.startISO} onChange={(e)=>onChangeRate(i,"startISO",e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Rate (€)</Label>
                <Input inputMode="numeric" value={b.rate} onChange={(e)=>onChangeRate(i,"rate",e.target.value)} />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addRateBand}>Add Rate Band</Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="destructive" onClick={deletePlanningHistory}>
          Delete Recruiter
        </Button>
      </div>
    </div>
  );
}
